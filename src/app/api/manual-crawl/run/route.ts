import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { buildDedupKey, buildUrlHash } from '@/lib/dedup'
import { SiteName, ScrapedProperty } from '@/types'

// このエンドポイントは GitHub Actions から localhost:3003 経由でのみ呼び出される
// Vercel 本番では IS_VERCEL = true のためブロックされる
const IS_VERCEL = Boolean(process.env.VERCEL)

export async function POST(req: NextRequest) {
  if (IS_VERCEL) {
    return NextResponse.json({ error: 'このエンドポイントはローカル環境専用です' }, { status: 503 })
  }

  // GitHub Actions 上では GITHUB_ACTIONS=true が自動でセットされる
  // localhost のサーバーに対してのみ呼ばれるため CRON_SECRET 認証をスキップ
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true'
  if (!isGitHubActions) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const body = await req.json()
  const { jobId, customerId, crawlUrl, site, maxPages = 3, portalName } = body as {
    jobId: string
    customerId: string
    crawlUrl: string
    site: SiteName
    maxPages: number
    portalName: string
  }

  if (!jobId || !crawlUrl || !site) {
    return NextResponse.json({ error: 'jobId, crawlUrl, site は必須です' }, { status: 400 })
  }

  // supabase と jobId を catch スコープで参照できるよう外に宣言
  let supabase: ReturnType<typeof createServiceClient> | null = null

  try {
    supabase = createServiceClient()

    // ジョブを実行中に更新
    await supabase.from('crawl_jobs').update({
      status: 'running',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', jobId)
    // Playwright クローラーを動的インポート
    const { crawlSuumo }  = await import('@/crawlers/suumo')
    const { crawlAthome } = await import('@/crawlers/athome')
    const { crawlHomes }  = await import('@/crawlers/homes')
    const CRAWLERS: Record<SiteName, typeof crawlSuumo> = {
      suumo: crawlSuumo, athome: crawlAthome, homes: crawlHomes,
    }

    const crawler = CRAWLERS[site]
    if (!crawler) {
      throw new Error(`未対応サイト: ${site}`)
    }

    // 顧客条件を取得
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, customer_conditions(*)')
      .eq('id', customerId)
      .single()

    // 提案済みIDを取得
    const { data: proposed } = await supabase
      .from('proposals')
      .select('property_id')
      .eq('customer_id', customerId)
    const proposedSet = new Set(proposed?.map(p => p.property_id) ?? [])

    // 既知 dedup_key を取得
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

    // クロール実行
    const crawlResult = await crawler(crawlUrl, customerId, {
      mode: 'manual',
      maxPages,
      stopOnDuplicateCount: 999,
    }, knownDedupKeys)

    // 新規物件を保存
    const savedIds = new Map<string, string>()
    if (crawlResult.properties.length > 0) {
      const now = new Date().toISOString()
      for (const prop of crawlResult.properties) {
        const dedupKey = buildDedupKey(prop)
        if (knownDedupKeys.has(dedupKey)) continue
        const { data: inserted } = await supabase
          .from('properties')
          .insert({
            site: prop.site,
            transaction_type: prop.transaction_type ?? 'sale',
            name: prop.name,
            address: prop.address,
            price: prop.price,
            current_price: prop.price,
            monthly_rent: prop.monthly_rent ?? null,
            management_fee: prop.management_fee ?? null,
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

    // 全物件に条件照合を付与してresultを構築
    const cond = (customer?.customer_conditions as Record<string, unknown>[])?.[0] ?? null
    const allScraped: ScrapedProperty[] = [
      ...crawlResult.properties,
      ...crawlResult.seenProperties,
    ]

    const properties = allScraped.map(prop => {
      const dedupKey = buildDedupKey(prop)
      const propertyId = savedIds.get(dedupKey) ?? dedupToId.get(dedupKey)
      const isNew = savedIds.has(dedupKey)
      return {
        ...prop,
        propertyId,
        isNew,
        isDuplicate: !isNew,
        matchScore: calcMatchScore(prop, cond),
        isAlreadyProposed: propertyId ? proposedSet.has(propertyId) : false,
      }
    }).sort((a, b) => b.matchScore - a.matchScore)

    const result = {
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
      error: crawlResult.error ?? null,
    }

    // ジョブを完了に更新
    await supabase.from('crawl_jobs').update({
      status: crawlResult.error ? 'failed' : 'completed',
      properties_found: allScraped.length,
      new_count: savedIds.size,
      result,
      error_message: crawlResult.error ?? null,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', jobId)

    return NextResponse.json({ ok: true, jobId, newCount: savedIds.size, total: allScraped.length })

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[manual-crawl/run] Error:', msg)
    if (supabase && jobId) {
      await supabase.from('crawl_jobs').update({
        status: 'failed',
        error_message: msg,
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', jobId)
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function calcMatchScore(prop: ScrapedProperty, cond: Record<string, unknown> | null): number {
  if (!cond) return 1
  let matched = 0, total = 0

  if (cond.budget_min || cond.budget_max) {
    total++
    const price = prop.price
    const min = cond.budget_min ? (cond.budget_min as number) * 10000 : null
    const max = cond.budget_max ? (cond.budget_max as number) * 10000 : null
    if (price !== null && (!min || price >= min) && (!max || price <= max)) matched++
  }
  if (cond.area_sqm_min || cond.area_sqm_max) {
    total++
    const sqm = prop.area_sqm
    const min = cond.area_sqm_min as number | null ?? null
    const max = cond.area_sqm_max as number | null ?? null
    if (sqm !== null && (!min || sqm >= min) && (!max || sqm <= max)) matched++
  }
  if (cond.walk_minutes_max) {
    total++
    const wm = prop.walk_minutes
    if (wm !== null && wm <= (cond.walk_minutes_max as number)) matched++
  }
  if (cond.building_age_max) {
    total++
    const age = prop.building_age
    if (age !== null && age <= (cond.building_age_max as number)) matched++
  }
  if (cond.area) {
    total++
    if ((prop.address ?? '').includes(cond.area as string)) matched++
  }
  return total > 0 ? matched / total : 1
}
