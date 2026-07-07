import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { buildDedupKey, buildUrlHash } from '@/lib/dedup'
import { ScrapedProperty, SiteName, CrawlMode, CrawlOptions } from '@/types'

// 取得件数急減の閾値
const DROP_THRESHOLD = 0.3

// 公開ポータル（Playwright対応）のみクロール対象
const PUBLIC_SITES: SiteName[] = ['suumo', 'athome', 'homes']

// Vercel Serverless では Playwright が動作しない
// このAPIはローカル or GitHub Actions 上でのみ実行すること
const IS_VERCEL = Boolean(process.env.VERCEL)

export async function POST(req: NextRequest) {
  if (IS_VERCEL) {
    return NextResponse.json({
      error: 'Vercel Serverless環境ではPlaywrightクロールは実行できません。ローカルまたはGitHub Actionsから実行してください。',
      hint: 'Run crawler locally: curl -X POST http://localhost:3003/api/crawl -H "Content-Type: application/json" -d \'{"mode":"diff"}\'',
    }, { status: 503 })
  }

  const supabase = createServiceClient()
  const body = await req.json()
  const {
    customer_id,
    mode = 'manual' as CrawlMode,
    max_pages,
  } = body

  // 公開ポータル（suumo/athome/homes）のみ対象。ログイン型は自動除外
  let urlQuery = supabase
    .from('customer_search_urls')
    .select('*, customers!inner(id, name, status)')
    .eq('is_active', true)
    .eq('customers.status', 'active')
    .in('site', PUBLIC_SITES)

  if (customer_id) urlQuery = urlQuery.eq('customer_id', customer_id)

  const { data: searchUrls, error } = await urlQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!searchUrls || searchUrls.length === 0) {
    return NextResponse.json({ message: '対象URLなし', crawled: 0, results: [] })
  }

  // 既存の dedup_key を一括取得（重複判定用）
  const { data: existingProps } = await supabase
    .from('properties')
    .select('dedup_key')
  const knownDedupKeys = new Set<string>(existingProps?.map(p => p.dedup_key).filter(Boolean) ?? [])

  const results = []
  let totalNewGlobal = 0

  // Playwrightを動的インポート（モジュール初期化時のVercelクラッシュを防ぐ）
  const { crawlSuumo }  = await import('@/crawlers/suumo')
  const { crawlAthome } = await import('@/crawlers/athome')
  const { crawlHomes }  = await import('@/crawlers/homes')
  const CRAWLERS: Record<SiteName, typeof crawlSuumo> = {
    suumo: crawlSuumo, athome: crawlAthome, homes: crawlHomes,
  }

  for (const su of searchUrls) {
    const site = su.site as SiteName
    const crawler = CRAWLERS[site]
    const startedAt = new Date()

    // 初回探索の自動判定: last_crawled_at が null → full モードで全件取得
    const isInitialCrawl = su.last_crawled_at === null
    const effectiveMode: CrawlMode = isInitialCrawl ? 'full' : mode

    // ページ上限: URL設定 → リクエスト引数 → モードデフォルト の優先順
    const options: CrawlOptions = {
      mode: effectiveMode,
      maxPages: max_pages ?? resolveUrlMaxPages(su, effectiveMode),
      stopOnDuplicateCount: 20, // 連続20件重複で停止
    }

    try {
      const txType = (su.transaction_type ?? 'sale') as import('@/types').TransactionType
      const crawlResult = await crawler(su.url, su.customer_id, options, knownDedupKeys, txType)
      const finishedAt = new Date()
      const duration = finishedAt.getTime() - startedAt.getTime()

      // 急減チェック（前回ログと比較）
      const { data: lastLog } = await supabase
        .from('crawl_logs')
        .select('properties_found')
        .eq('customer_id', su.customer_id)
        .eq('site', site)
        .eq('status', 'success')
        .order('started_at', { ascending: false })
        .limit(1)
        .single()

      // properties_found = ページ上で見つかった総件数（新規 + 重複）
      const pageTotal = crawlResult.fetchedCount + crawlResult.duplicateCount
      const prevCount = lastLog?.properties_found ?? 0
      const dropWarning =
        prevCount > 5 && pageTotal < prevCount * DROP_THRESHOLD
          ? `⚠ 取得件数急減: 前回${prevCount}件 → 今回${pageTotal}件`
          : null

      // クロールログ保存
      await supabase.from('crawl_logs').insert({
        customer_id: su.customer_id,
        site,
        url: su.url,
        status: crawlResult.error ? 'failure' : 'success',
        properties_found: pageTotal,
        error_message: crawlResult.error ?? dropWarning,
        html_snapshot: crawlResult.htmlPath,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_ms: duration,
        total_count: crawlResult.totalCount,
        total_pages: crawlResult.totalPages,
        checked_pages: crawlResult.checkedPages,
        fetched_count: crawlResult.fetchedCount,
        new_count: crawlResult.newCount,
        duplicate_count: crawlResult.duplicateCount,
        stopped_reason: crawlResult.stoppedReason,
        crawl_mode: effectiveMode,
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

      // 新規物件をDBに保存
      let savedNew = 0
      if (crawlResult.properties.length > 0) {
        savedNew = await saveProperties(supabase, crawlResult.properties, knownDedupKeys)
        totalNewGlobal += savedNew
      }

      // 既知物件の last_seen_at・価格変動を更新
      if (crawlResult.seenProperties.length > 0) {
        await updateSeenProperties(supabase, crawlResult.seenProperties)
      }

      // last_crawled_at 更新
      await supabase.from('customer_search_urls')
        .update({ last_crawled_at: finishedAt.toISOString() })
        .eq('id', su.id)

      results.push({
        customer_id: su.customer_id,
        site,
        mode: effectiveMode,
        isInitialCrawl,
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
        crawl_mode: effectiveMode ?? mode,
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
    default:       return su.max_pages_normal ?? 3  // diff = 毎朝3ページ
  }
}

// 新規物件を挿入
async function saveProperties(
  supabase: ReturnType<typeof createServiceClient>,
  properties: ScrapedProperty[],
  knownDedupKeys: Set<string>
): Promise<number> {
  let newCount = 0
  const now = new Date().toISOString()

  for (const prop of properties) {
    const dedupKey = buildDedupKey(prop)
    const rawHash = buildUrlHash(prop.url)

    if (knownDedupKeys.has(dedupKey)) continue

    const { data: inserted } = await supabase
      .from('properties')
      .insert({
        site: prop.site,
        transaction_type: prop.transaction_type,
        name: prop.name,
        address: prop.address,
        price: prop.price,
        current_price: prop.transaction_type === 'rent' ? prop.monthly_rent : prop.price,
        monthly_rent: prop.monthly_rent ?? null,
        management_fee: prop.management_fee ?? null,
        repair_fund: prop.repair_fund ?? null,
        yield_rate: prop.yield_rate ?? null,
        land_area: prop.land_area ?? null,
        building_area: prop.building_area ?? null,
        key_money: prop.key_money ?? null,
        deposit: prop.deposit ?? null,
        guarantee_money: prop.guarantee_money ?? null,
        tsubo_count: prop.tsubo_count ?? null,
        tsubo_price: prop.tsubo_price ?? null,
        available_from: prop.available_from ?? null,
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
        raw_hash: rawHash,
        first_seen_at: now,
        last_seen_at: now,
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

// 既知物件の last_seen_at を更新し、価格変動を記録
async function updateSeenProperties(
  supabase: ReturnType<typeof createServiceClient>,
  props: ScrapedProperty[]
): Promise<void> {
  if (props.length === 0) return
  const now = new Date().toISOString()

  const dedupKeys = props.map(p => buildDedupKey(p))

  // 一括で既存レコードを取得
  const { data: existing } = await supabase
    .from('properties')
    .select('id, dedup_key, current_price, built_year')
    .in('dedup_key', dedupKeys)

  if (!existing || existing.length === 0) return

  // dedup_key → DB レコード のマップ
  const existingMap = new Map(existing.map(e => [e.dedup_key, e]))

  // 一括で last_seen_at を更新
  await supabase
    .from('properties')
    .update({ last_seen_at: now })
    .in('dedup_key', dedupKeys)

  // 価格変動・築年月が更新された物件を個別更新
  for (const prop of props) {
    const key = buildDedupKey(prop)
    const ex = existingMap.get(key)
    if (!ex) continue

    const updates: Record<string, unknown> = {}

    if (prop.price !== null && ex.current_price !== prop.price) {
      updates.last_price = ex.current_price
      updates.current_price = prop.price
    }
    // 再クロール時に築年月を更新（より正確なデータで上書き）
    if (prop.built_year !== null && prop.built_year !== undefined) {
      updates.built_year = prop.built_year
      updates.built_month = prop.built_month ?? null
      updates.building_age = prop.building_age ?? null
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('properties').update(updates).eq('id', ex.id)
    }
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
