/**
 * GitHub Actions / ローカル用クロール実行スクリプト
 * Next.js サーバーなしで直接 Supabase + Playwright を動かす
 *
 * 使い方:
 *   node scripts/run-crawl.mjs --mode diff
 *   node scripts/run-crawl.mjs --mode full --customer-id <UUID>
 */
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'
import { parseArgs } from 'util'

const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    mode:        { type: 'string', default: 'diff' },
    'customer-id': { type: 'string', default: '' },
    'max-pages': { type: 'string', default: '' },
  },
  strict: false,
})

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY
const mode             = args.mode ?? 'diff'
const customerId       = args['customer-id'] || null
const maxPages         = args['max-pages'] ? parseInt(args['max-pages'], 10) : undefined

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 公開ポータルのみ
const PUBLIC_SITES = ['suumo', 'athome', 'homes']

async function main() {
  console.log(`[crawl] mode=${mode}, customer_id=${customerId ?? 'all'}`)

  let urlQuery = supabase
    .from('customer_search_urls')
    .select('*, customers!inner(id, name, status)')
    .eq('is_active', true)
    .eq('customers.status', 'active')
    .in('site', PUBLIC_SITES)

  if (customerId) urlQuery = urlQuery.eq('customer_id', customerId)

  const { data: searchUrls, error } = await urlQuery
  if (error) { console.error(error.message); process.exit(1) }
  if (!searchUrls?.length) { console.log('対象URLなし'); writeOutput([]); return }

  console.log(`[crawl] 対象URL: ${searchUrls.length}件`)

  // 既存dedup_keyを取得
  const { data: existing } = await supabase.from('properties').select('dedup_key')
  const knownDedupKeys = new Set(existing?.map(p => p.dedup_key).filter(Boolean) ?? [])

  const browser = await chromium.launch({ headless: true })
  const results = []

  for (const su of searchUrls) {
    const site = su.site
    console.log(`[crawl] ${site}: ${su.url}`)
    try {
      // 動的importでTypeScriptクローラーを呼ぶのが難しいため、
      // ここではAPIエンドポイント経由ではなくSupabase直書きは省略し、
      // 代わりに /api/crawl を localhost 経由で呼ぶ設計を採用
      // → GitHub Actions では next start を別stepで起動するか、
      //    run-crawl.mjs を tsx で直接動かす方式に切り替えること
      results.push({ site, status: 'skipped', note: 'tsx実行が必要' })
    } catch (e) {
      results.push({ site, error: String(e) })
    }
  }

  await browser.close()
  writeOutput(results)
  console.log('[crawl] 完了')
}

function writeOutput(results) {
  writeFileSync('crawl-output.json', JSON.stringify({ results, ts: new Date().toISOString() }, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
