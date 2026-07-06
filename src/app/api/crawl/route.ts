import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { crawlSuumo } from '@/crawlers/suumo'
import { crawlAthome } from '@/crawlers/athome'
import { crawlHomes } from '@/crawlers/homes'
import { buildDedupKey, buildUrlHash } from '@/lib/dedup'
import { ScrapedProperty, SiteName, CrawlMode, CrawlOptions } from '@/types'

type CrawlerFn = typeof crawlSuumo

const CRAWLERS: Record<SiteName, CrawlerFn> = {
  suumo: crawlSuumo,
  athome: crawlAthome,
  homes: crawlHomes,
}

// 取得件数急減の閾値
const DROP_THRESHOLD = 0.3

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()
  const {
    customer_id,
    mode = 'manual' as CrawlMode,
    max_pages,
  } = body

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
    return NextResponse.json({ message: '対象URLなし', crawled: 0, results: [] })
  }

  // 既存のdedupKeyを一括取得（重複判定用）
  const { data: existingProps } = await supabase
    .from('properties')
    .select('dedup_key, raw_hash')
  const knownDedupKeys = new Set<string>(existingProps?.map(p => p.dedup_key).filter(Boolean) ?? [])

  const results = []
  let totalNewGlobal = 0

  for (const su of searchUrls) {
    const site = su.site as SiteName
    const crawler = CRAWLERS[site]
    const startedAt = new Date()

    // ページ上限: URL設定 → リクエスト引数 → モードデフォルト の優先順
    const options: CrawlOptions = {
      mode,
      maxPages: max_pages ?? resolveUrlMaxPages(su, mode),
    }

    try {
      const crawlResult = await crawler(su.url, su.customer_id, options, knownDedupKeys)
      const finishedAt = new Date()
      const duration = finishedAt.getTime() - startedAt.getTime()

      // 急減チェック
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
        prevCount > 5 && crawlResult.fetchedCount < prevCount * DROP_THRESHOLD
          ? `⚠ 取得件数急減: 前回${prevCount}件 → 今回${crawlResult.fetchedCount}件`
          : null

      // クロールログ保存（新カラム含む）
      await supabase.from('crawl_logs').insert({
        customer_id: su.customer_id,
        site,
        url: su.url,
        status: crawlResult.error ? 'failure' : 'success',
        properties_found: crawlResult.fetchedCount,
        error_message: crawlResult.error ?? dropWarning,
        html_snapshot: crawlResult.htmlPath,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_ms: duration,
        // 新カラム
        total_count: crawlResult.totalCount,
        total_pages: crawlResult.totalPages,
        checked_pages: crawlResult.checkedPages,
        fetched_count: crawlResult.fetchedCount,
        new_count: crawlResult.newCount,
        duplicate_count: crawlResult.duplicateCount,
        stopped_reason: crawlResult.stoppedReason,
        crawl_mode: mode,
      })

      // 3日連続失敗チェック
      if (crawlResult.error) {
        const { data: recentLogs } = await supabase
          .from('crawl_logs')
          .select('status')
          .eq('customer_id', su.customer_id)
          .eq('site', site)
          .order('started_at', { ascending: false })
          .limit(3)
        const allFailed = recentLogs?.every(l => l.status === 'failure') ?? false
        if (allFailed) {
          await supabase.from('customer_search_urls').update({ is_active: false }).eq('id', su.id)
        }
      }

      // 物件をDBに保存（新規のみ）
      let savedNew = 0
      if (crawlResult.properties.length > 0) {
        savedNew = await saveProperties(supabase, crawlResult.properties, knownDedupKeys)
        totalNewGlobal += savedNew
      }

      // last_crawled_at 更新
      await supabase.from('customer_search_urls')
        .update({ last_crawled_at: finishedAt.toISOString() })
        .eq('id', su.id)

      results.push({
        customer_id: su.customer_id,
        site,
        mode,
        totalCount: crawlResult.totalCount,
        totalPages: crawlResult.totalPages,
        checkedPages: crawlResult.checkedPages,
        fetchedCount: crawlResult.fetchedCount,
        newCount: savedNew,
        duplicateCount: crawlResult.duplicateCount,
        stoppedReason: crawlResult.stoppedReason,
        error: crawlResult.error,
        warning: dropWarning,
      })

      // サイト間の待機
      await sleep(2000 + Math.random() * 2000)
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
        stopped_reason: 'fetch_error',
        crawl_mode: mode,
      })
      results.push({ customer_id: su.customer_id, site, error: message, stoppedReason: 'fetch_error' })
    }
  }

  return NextResponse.json({
    crawled: searchUrls.length,
    totalNew: totalNewGlobal,
    mode,
    results,
  })
}

// URL設定からモードに応じた上限を返す
function resolveUrlMaxPages(
  su: { max_pages_full?: number | null; max_pages_normal?: number | null; max_pages_manual?: number | null },
  mode: CrawlMode
): number | undefined {
  switch (mode) {
    case 'full':   return su.max_pages_full ?? undefined
    case 'manual': return su.max_pages_manual ?? 10
    case 'debug':  return 1
    default:       return su.max_pages_normal ?? 3
  }
}

async function saveProperties(
  supabase: ReturnType<typeof createServiceClient>,
  properties: ScrapedProperty[],
  knownDedupKeys: Set<string>
): Promise<number> {
  let newCount = 0

  for (const prop of properties) {
    const dedupKey = buildDedupKey(prop)
    const rawHash = buildUrlHash(prop.url)

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
        walk_minutes: prop.walk_minutes,
        url: prop.url,
        thumbnail_url: prop.thumbnail_url,
        room_number: prop.room_number,
        dedup_key: dedupKey,
        raw_hash: rawHash,
      })
      .select('id')
      .single()

    if (inserted) {
      knownDedupKeys.add(dedupKey)
      newCount++
    }
  }

  return newCount
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
