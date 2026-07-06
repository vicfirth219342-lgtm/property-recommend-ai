import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { crawlSuumo } from '@/crawlers/suumo'
import { crawlAthome } from '@/crawlers/athome'
import { crawlHomes } from '@/crawlers/homes'
import { buildDedupKey, buildUrlHash } from '@/lib/dedup'
import { ScrapedProperty, SiteName } from '@/types'

const CRAWLERS: Record<SiteName, typeof crawlSuumo> = {
  suumo: crawlSuumo,
  athome: crawlAthome,
  homes: crawlHomes,
}

// 取得件数異常検知の閾値（前回比でこの割合以下になったら警告）
const DROP_THRESHOLD = 0.3

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()
  const { customer_id } = body // 未指定の場合は全顧客

  // 対象顧客の検索URLを取得
  let urlQuery = supabase
    .from('customer_search_urls')
    .select('*, customers!inner(id, name, status)')
    .eq('is_active', true)
    .eq('customers.status', 'active')

  if (customer_id) urlQuery = urlQuery.eq('customer_id', customer_id)

  const { data: searchUrls, error } = await urlQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!searchUrls || searchUrls.length === 0) {
    return NextResponse.json({ message: '対象URLなし', crawled: 0 })
  }

  const results = []
  let totalNew = 0

  for (const su of searchUrls) {
    const site = su.site as SiteName
    const crawler = CRAWLERS[site]
    const startedAt = new Date()

    try {
      const { properties, error: crawlErr, htmlPath } = await crawler(su.url, su.customer_id)
      const finishedAt = new Date()
      const duration = finishedAt.getTime() - startedAt.getTime()

      // 前回の取得件数と比較（急減チェック）
      const { data: lastLog } = await supabase
        .from('crawl_logs')
        .select('properties_found')
        .eq('customer_id', su.customer_id)
        .eq('site', site)
        .eq('status', 'success')
        .order('started_at', { ascending: false })
        .limit(1)
        .single()

      const prevCount = lastLog?.properties_found ?? 0
      const dropWarning =
        prevCount > 5 && properties.length < prevCount * DROP_THRESHOLD
          ? `⚠ 取得件数急減: 前回${prevCount}件 → 今回${properties.length}件`
          : null

      // クロールログ保存
      await supabase.from('crawl_logs').insert({
        customer_id: su.customer_id,
        site,
        url: su.url,
        status: crawlErr ? 'failure' : 'success',
        properties_found: properties.length,
        error_message: crawlErr ?? dropWarning,
        html_snapshot: htmlPath,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_ms: duration,
      })

      // 3日連続失敗チェック
      const { data: recentLogs } = await supabase
        .from('crawl_logs')
        .select('status')
        .eq('customer_id', su.customer_id)
        .eq('site', site)
        .order('started_at', { ascending: false })
        .limit(3)

      const consecutiveFails = recentLogs?.every((l) => l.status === 'failure') ?? false
      if (consecutiveFails) {
        await supabase
          .from('customer_search_urls')
          .update({ is_active: false })
          .eq('id', su.id)
      }

      if (!crawlErr && properties.length > 0) {
        const newCount = await saveProperties(supabase, properties, su.customer_id)
        totalNew += newCount
        results.push({ customer_id: su.customer_id, site, found: properties.length, new: newCount })
      } else {
        results.push({ customer_id: su.customer_id, site, found: 0, error: crawlErr })
      }

      // サイトへの負荷軽減：1〜3秒ランダム待機
      await sleep(1000 + Math.random() * 2000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      await supabase.from('crawl_logs').insert({
        customer_id: su.customer_id,
        site,
        url: su.url,
        status: 'failure',
        properties_found: 0,
        error_message: message,
        started_at: startedAt.toISOString(),
        finished_at: new Date().toISOString(),
      })
      results.push({ customer_id: su.customer_id, site, error: message })
    }
  }

  return NextResponse.json({ crawled: searchUrls.length, totalNew, results })
}

async function saveProperties(
  supabase: ReturnType<typeof createServiceClient>,
  properties: ScrapedProperty[],
  customerId: string
): Promise<number> {
  let newCount = 0

  for (const prop of properties) {
    const dedupKey = buildDedupKey(prop)
    const rawHash = buildUrlHash(prop.url)

    // 重複チェック（同一dedupKeyまたは同一URL）
    const { data: existing } = await supabase
      .from('properties')
      .select('id')
      .or(`dedup_key.eq.${dedupKey},raw_hash.eq.${rawHash}`)
      .limit(1)
      .single()

    let propertyId: string

    if (existing) {
      propertyId = existing.id
    } else {
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
          walk_minutes: prop.walk_minutes,
          url: prop.url,
          thumbnail_url: prop.thumbnail_url,
          room_number: prop.room_number,
          dedup_key: dedupKey,
          raw_hash: rawHash,
        })
        .select('id')
        .single()

      if (!inserted) continue
      propertyId = inserted.id
      newCount++
    }

    // 未提案チェック（この顧客にまだ提案していないか）
    // proposalsへの登録はメール送信時に行うため、ここでは保存のみ
    void propertyId
    void customerId
  }

  return newCount
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
