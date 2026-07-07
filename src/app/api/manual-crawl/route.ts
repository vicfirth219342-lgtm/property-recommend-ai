import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { crawlSuumo } from '@/crawlers/suumo'
import { crawlAthome } from '@/crawlers/athome'
import { crawlHomes } from '@/crawlers/homes'
import { buildDedupKey, buildUrlHash } from '@/lib/dedup'
import {
  SiteName, ScrapedProperty, ConditionMatchItem,
  PropertyWithMatch, ManualCrawlResult, PortalType,
} from '@/types'

// 公開ポータルのみ自動クローラーあり
const PUBLIC_CRAWLERS: Record<SiteName, typeof crawlSuumo> = {
  suumo:  crawlSuumo,
  athome: crawlAthome,
  homes:  crawlHomes,
}

// URLからサイトを判別（公開ポータルのみ）
function detectSite(url: string): SiteName | null {
  if (url.includes('suumo.jp'))    return 'suumo'
  if (url.includes('athome.co.jp')) return 'athome'
  if (url.includes('homes.co.jp')) return 'homes'
  return null
}

function detectPortalType(url: string): PortalType {
  return detectSite(url) ? 'public' : 'login'
}

// 顧客条件との照合
function matchCondition(
  prop: ScrapedProperty,
  cond: Record<string, unknown> | null
): { score: number; items: ConditionMatchItem[] } {
  if (!cond) return { score: 1, items: [] }

  const items: ConditionMatchItem[] = []
  let matched = 0
  let total = 0

  function check(
    label: string,
    required: string,
    actual: string | null,
    ok: boolean | null   // null = データ不足で判定不可
  ) {
    total++
    if (ok === true) matched++
    items.push({
      label,
      required,
      actual,
      match: ok === true ? 'ok' : ok === false ? 'ng' : 'unknown',
    })
  }

  if (cond.budget_min || cond.budget_max) {
    const price = prop.price
    const min = cond.budget_min ? (cond.budget_min as number) * 10000 : null
    const max = cond.budget_max ? (cond.budget_max as number) * 10000 : null
    const minLabel = min ? `${(min / 10000).toLocaleString()}万円` : ''
    const maxLabel = max ? `${(max / 10000).toLocaleString()}万円` : ''
    const req = [min ? `${minLabel}〜` : '', max ? `〜${maxLabel}` : ''].filter(Boolean).join('')
    const actual = price ? `${(price / 10000).toLocaleString()}万円` : null
    const ok = price === null ? null
      : (min !== null && price < min) ? false
      : (max !== null && price > max) ? false
      : true
    check('価格', req, actual, ok)
  }

  if (cond.area_sqm_min || cond.area_sqm_max) {
    const sqm = prop.area_sqm
    const min = cond.area_sqm_min as number | null ?? null
    const max = cond.area_sqm_max as number | null ?? null
    const req = [min ? `${min}㎡〜` : '', max ? `〜${max}㎡` : ''].filter(Boolean).join('')
    const actual = sqm ? `${sqm}㎡` : null
    const ok = sqm === null ? null : (min && sqm < min) ? false : (max && sqm > max) ? false : true
    check('面積', req, actual, ok)
  }

  if (cond.walk_minutes_max) {
    const wm = prop.walk_minutes
    const max = cond.walk_minutes_max as number
    check('徒歩', `〜${max}分`, wm ? `${wm}分` : null, wm === null ? null : wm <= max)
  }

  if (cond.building_age_max) {
    const age = prop.building_age  // parseBuiltDate で計算済み
    const max = cond.building_age_max as number
    const actualLabel = age !== null ? `築${age}年` : null
    check('築年数', `〜${max}年以内`, actualLabel, age === null ? null : age <= max)
  }

  if (cond.area) {
    const addr = prop.address ?? ''
    const area = cond.area as string
    check('エリア', area, addr || null, addr.includes(area))
  }

  return { score: total > 0 ? matched / total : 1, items }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { portalName, url, customerId, maxPages = 3 } = body as {
    portalName: string
    url: string
    customerId: string
    maxPages: number
  }

  if (!url || !customerId) {
    return NextResponse.json({ error: 'url と customerId は必須です' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const site = detectSite(url)
  const portalType = detectPortalType(url)

  // ログイン型ポータルのクローラーは未実装 → URLアクセスを試みるが失敗可能性あり
  if (!site) {
    return NextResponse.json({
      error: `このURLのポータルには自動スクレイピングが対応していません。\n対応ポータル: SUUMO / アットホーム / LIFULL HOME'S\n\nログイン型ポータル（イタンジ・レインズ等）は現在開発中です。`,
      portalType,
      portalName,
    } satisfies Partial<ManualCrawlResult>, { status: 422 })
  }

  // 顧客条件を取得
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, customer_no, customer_conditions(*)')
    .eq('id', customerId)
    .single()

  const cond = (customer?.customer_conditions as Record<string, unknown>[])?.[0] ?? null

  // 提案済みIDを取得（照合に使う）
  const { data: proposed } = await supabase
    .from('proposals')
    .select('property_id')
    .eq('customer_id', customerId)
  const proposedSet = new Set(proposed?.map(p => p.property_id) ?? [])

  // 既知dedup_keyを取得
  const { data: existingProps } = await supabase
    .from('properties')
    .select('id, dedup_key')
  const knownDedupKeys = new Set<string>(
    existingProps?.map(p => p.dedup_key).filter(Boolean) ?? []
  )
  const dedupToId = new Map<string, string>()
  for (const p of existingProps ?? []) {
    if (p.dedup_key) dedupToId.set(p.dedup_key, p.id)
  }

  // クロール実行（manual-crawlは常に最大ページ上限のみ指定、自動停止なし）
  const crawler = PUBLIC_CRAWLERS[site]
  const crawlResult = await crawler(url, customerId, {
    mode: 'manual',
    maxPages,
    stopOnDuplicateCount: 999,  // 手動探索は重複停止しない（全件取得優先）
  }, knownDedupKeys)

  // 新規物件をDBに保存
  const savedIds = new Map<string, string>()  // dedupKey → id
  if (crawlResult.properties.length > 0) {
    const now = new Date().toISOString()
    for (const prop of crawlResult.properties) {
      const dedupKey = buildDedupKey(prop)
      if (knownDedupKeys.has(dedupKey)) continue
      const { data: inserted } = await supabase
        .from('properties')
        .insert({
          site: prop.site,
          name: prop.name,
          address: prop.address,
          price: prop.price,
          area_sqm: prop.area_sqm,
          floor_plan: prop.floor_plan,
          building_age: prop.building_age,
          built_year: prop.built_year ?? null,
          built_month: prop.built_month ?? null,
          walk_minutes: prop.walk_minutes,
          url: prop.url,
          thumbnail_url: prop.thumbnail_url,
          room_number: prop.room_number,
          dedup_key: dedupKey,
          raw_hash: buildUrlHash(prop.url),
          first_seen_at: now,
          last_seen_at: now,
          current_price: prop.price,
        })
        .select('id')
        .single()
      if (inserted) {
        knownDedupKeys.add(dedupKey)
        dedupToId.set(dedupKey, inserted.id)
        savedIds.set(dedupKey, inserted.id)
      }
    }
  }

  // 全取得物件（新規＋既知）に条件照合を付与
  const allScraped: ScrapedProperty[] = [
    ...crawlResult.properties,
    ...crawlResult.seenProperties,
  ]

  const properties: PropertyWithMatch[] = allScraped.map(prop => {
    const dedupKey = buildDedupKey(prop)
    const propertyId = savedIds.get(dedupKey) ?? dedupToId.get(dedupKey)
    const isDuplicate = !savedIds.has(dedupKey)
    const isNew = !isDuplicate  // この探索で初めて取得 = 新規
    const { score, items } = matchCondition(prop, cond)
    return {
      ...prop,
      propertyId,
      isNew,
      isDuplicate,
      matchScore: score,
      matchItems: items,
      isAlreadyProposed: propertyId ? proposedSet.has(propertyId) : false,
    }
  })

  // 条件一致度順 → 新着順にソート
  properties.sort((a, b) => b.matchScore - a.matchScore || (a.isDuplicate ? 1 : -1))

  const result: ManualCrawlResult = {
    site,
    portalName: portalName || site,
    portalType: 'public',
    totalCount: crawlResult.totalCount,
    totalPages: crawlResult.totalPages,
    checkedPages: crawlResult.checkedPages,
    fetchedCount: crawlResult.fetchedCount,
    newCount: savedIds.size,
    duplicateCount: crawlResult.duplicateCount,
    stoppedReason: crawlResult.stoppedReason,
    properties,
    error: crawlResult.error,
  }

  return NextResponse.json(result)
}
