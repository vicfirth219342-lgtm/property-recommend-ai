import { chromium } from 'playwright'
import { ScrapedProperty, CrawlOptions, PageCrawlResult, StoppedReason } from '@/types'
import { buildDedupKey } from '@/lib/dedup'
import { parseBuiltDate } from '@/lib/parseBuiltDate'
import path from 'path'
import fs from 'fs'

const SNAPSHOT_DIR = path.join(process.cwd(), 'crawl-snapshots')
const PAGE_SIZE = 30

// 新着順ソートを付与（既に sort パラメータがある場合はスキップ）
function addNewestFirstSort(baseUrl: string): string {
  const url = new URL(baseUrl)
  if (!url.searchParams.has('sort') && !url.searchParams.has('sortby')) {
    url.searchParams.set('sort', 'new') // AtHome: sort=new = 新着順
  }
  return url.toString()
}

// アットホームはURLに /list/p2/ のようなページパスを使う
function buildPageUrl(baseUrl: string, page: number): string {
  if (page === 1) return baseUrl
  if (/\/list\/$/.test(baseUrl) || /\/list$/.test(baseUrl)) {
    return baseUrl.replace(/\/list\/?$/, `/list/p${page}/`)
  }
  const url = new URL(baseUrl)
  url.searchParams.set('page', String(page))
  return url.toString()
}

async function parseTotalCount(page: import('playwright').Page): Promise<{ totalCount: number | null; totalPages: number | null }> {
  try {
    const text = await page.$eval(
      '[class*="result-count"], [class*="resultCount"], [class*="searchResult"] [class*="count"]',
      (el) => el.textContent ?? ''
    ).catch(() => '')
    const match = text.match(/([\d,]+)\s*件/)
    if (!match) return { totalCount: null, totalPages: null }
    const totalCount = parseInt(match[1].replace(/,/g, ''))
    return { totalCount, totalPages: Math.ceil(totalCount / PAGE_SIZE) }
  } catch {
    return { totalCount: null, totalPages: null }
  }
}

export async function scrapeOnePage(page: import('playwright').Page, transactionType: import('@/types').TransactionType = 'sale'): Promise<ScrapedProperty[]> {
  const properties: ScrapedProperty[] = []

  // athome は Angular SPA。現行の物件カードは .p-property（旧 .card-box は廃止済み）
  const selectors = [
    '.p-property',            // 現行: 建物単位カード（2024年〜）
    '.card-box.open',         // 旧形式フォールバック
    '.card-box',
    '[class*="propertyList"] li',
    '.bukken-item',
    '[data-testid="property-card"]',
    '[class*="PropertyCard"]',
    '.cassette',
  ]

  let items: import('playwright').ElementHandle[] = []
  for (const sel of selectors) {
    const candidates = await page.$$(sel)
    if (candidates.length === 0) continue
    // 採用前に検証: 先頭要素から物件名・詳細URLが取得できるセレクタのみ採用する
    // ※ athome の賃料は "12.6 万円"（スペースあり小数点あり）のため価格検証は緩める
    const sample = candidates[0]
    const sampleName = await sample.$eval(
      '[class*="title"], [class*="name"], h2, h3',
      (el) => el.textContent?.trim() ?? ''
    ).catch(() => '')
    const sampleUrl = await sample.$eval('a', (el) => (el as HTMLAnchorElement).href).catch(() => '')
    const sampleText = await sample.evaluate((el) => el.textContent ?? '')
    // 賃料フォーマット: "12.6 万円"（スペース・小数点あり）に対応した判定
    const samplePriceOk = /[\d,.]+\s*万円/.test(sampleText)
    if (sampleName && sampleUrl && samplePriceOk) {
      items = candidates
      break
    }
  }

  for (const item of items) {
    try {
      const nameRaw = await item.$eval(
        '[class*="title"], [class*="name"], h2, h3',
        (el) => el.textContent?.trim() ?? ''
      ).catch(() => '')
      const name = nameRaw.replace(/\s*[\d,.]+\s*万円\s*$/, '').replace(/\s+/g, ' ').trim()

      const url = await item.$eval('a', (el) => (el as HTMLAnchorElement).href).catch(() => '')
      const allText = await item.evaluate(el => el.textContent ?? '')
      const address = await item.$eval(
        '[class*="address"], [class*="location"]',
        (el) => el.textContent?.trim() ?? ''
      ).catch(() => '')

      // athome 賃料: "12.6 万円"（スペースあり・小数点あり）→ \s* で対応
      const priceMatch = allText.match(/([\d,.]+)\s*万円/)
      const price = priceMatch ? Math.round(parseFloat(priceMatch[1].replace(/,/g, '')) * 10000) : null
      const areaMatch = allText.match(/([\d.]+)\s*(?:㎡|m²|m2)/)
      const area_sqm = areaMatch ? parseFloat(areaMatch[1]) : null
      const floorMatch = allText.match(/([1-9][SLDK]+)/i)
      const floor_plan = floorMatch ? floorMatch[1].toUpperCase() : null
      const walkMatch = allText.match(/徒歩(\d+)分/)
      const walk_minutes = walkMatch ? parseInt(walkMatch[1]) : null
      const thumbnail = await item.$eval('img', (el) => (el as HTMLImageElement).src).catch(() => null)
      const roomMatch = name.match(/(\d+)号室?$/) ?? allText.match(/(\d{3,4})号室/)
      const room_number = roomMatch ? roomMatch[1] : null

      const mgmtMatchA = allText.match(/管理費[：:\s]*([\d,]+)\s*円/)
      const management_fee = mgmtMatchA ? parseInt(mgmtMatchA[1].replace(/,/g, '')) : null
      const repairMatchA = allText.match(/修繕積立金[：:\s]*([\d,]+)\s*円/)
      const repair_fund = repairMatchA ? parseInt(repairMatchA[1].replace(/,/g, '')) : null

      const builtRaw =
        allText.match(/(新築|築後未入居|(?:明治|大正|昭和|平成|令和)\d+年(?:\d+月)?|\d{4}年(?:\d+月)?|築\d+年)/)?.[0] ?? ''
      const { builtYear, builtMonth, buildingAge } = parseBuiltDate(builtRaw)

      if (!name || !url) continue
      properties.push({
        site: 'athome',
        transaction_type: transactionType,
        name, address,
        price: transactionType === 'sale' ? price : null,
        monthly_rent: transactionType === 'rent' ? price : null,
        management_fee, repair_fund, yield_rate: null,
        land_area: null, building_area: null,
        key_money: null, deposit: null, guarantee_money: null,
        tsubo_count: null, tsubo_price: null, available_from: null,
        area_sqm, floor_plan,
        building_age: buildingAge, built_year: builtYear, built_month: builtMonth,
        walk_minutes, url, thumbnail_url: thumbnail ?? null, room_number,
      })
    } catch {}
  }
  return properties
}

export async function crawlAthome(
  baseUrl: string,
  customerId: string,
  options: CrawlOptions,
  knownDedupKeys: Set<string>,
  transactionType: import('@/types').TransactionType = 'sale'
): Promise<PageCrawlResult> {
  const sortedUrl = addNewestFirstSort(baseUrl)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ja-JP',
  })
  const page = await context.newPage()

  const allProperties: ScrapedProperty[] = []
  const seenKeyMap = new Map<string, ScrapedProperty>()
  let totalCount: number | null = null
  let totalPages: number | null = null
  let checkedPages = 0
  let fetchedCount = 0
  let duplicateCount = 0
  let stoppedReason: StoppedReason = 'reached_last_page'
  let htmlPath: string | undefined
  let consecutiveDups = 0
  const stopOnDups = options.stopOnDuplicateCount ?? 20
  const maxPages = resolveMaxPages(options)

  try {
    let currentPage = 1
    let earlyStop = false

    while (!earlyStop) {
      if (maxPages !== null && currentPage > maxPages) {
        stoppedReason = 'reached_page_limit'
        break
      }

      const pageUrl = buildPageUrl(sortedUrl, currentPage)
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(2000 + Math.random() * 1000)

      // bot認証・404 を 0件取得と区別してエラーにする（データは捏造しない）
      const pageTitle = await page.title().catch(() => '')
      if (pageTitle.includes('認証にご協力')) {
        throw new Error('bot認証ページが表示されました（アットホーム）。時間をおいて再実行してください')
      }
      if (pageTitle.includes('見つかりません')) {
        throw new Error(`検索URLが無効です（404）: ${pageUrl}`)
      }

      // Angular SPA のため一覧の描画を待つ（最大15秒。現れなければそのまま解析）
      // .p-property は現行セレクター（旧 .card-box は廃止済み）
      await page.waitForSelector('.p-property, [class*="bukken"] a, a[href*="/chintai/"]', { timeout: 15000 }).catch(() => {})

      if (currentPage === 1) {
        const counts = await parseTotalCount(page)
        totalCount = counts.totalCount
        totalPages = counts.totalPages

        if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true })
        const ts = new Date().toISOString().replace(/[:.]/g, '-')
        htmlPath = path.join(SNAPSHOT_DIR, `athome_${customerId}_${ts}.html`)
        fs.writeFileSync(htmlPath, await page.content(), 'utf-8')
      }

      const pageProps = await scrapeOnePage(page, transactionType)
      checkedPages++

      if (pageProps.length === 0) {
        stoppedReason = checkedPages === 1 ? 'no_results' : 'reached_last_page'
        break
      }

      for (const prop of pageProps) {
        const key = buildDedupKey(prop)

        if (knownDedupKeys.has(key)) {
          duplicateCount++
          seenKeyMap.set(key, prop)

          if (options.mode === 'diff' || options.mode === 'manual') {
            consecutiveDups++
            if (consecutiveDups >= stopOnDups) {
              stoppedReason = 'duplicate_sequence_detected'
              earlyStop = true
              break
            }
          }
        } else {
          consecutiveDups = 0
          fetchedCount++
          allProperties.push(prop)
          knownDedupKeys.add(key)
        }
      }

      if (earlyStop) break

      if (currentPage >= (totalPages ?? 999)) {
        stoppedReason = 'reached_last_page'
        break
      }

      await page.waitForTimeout(2000 + Math.random() * 2000)
      currentPage++
    }

    return {
      properties: allProperties,
      seenProperties: Array.from(seenKeyMap.values()),
      totalCount,
      totalPages,
      checkedPages,
      fetchedCount,
      newCount: fetchedCount,
      duplicateCount,
      stoppedReason,
      htmlPath,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      htmlPath = path.join(SNAPSHOT_DIR, `athome_error_${customerId}_${ts}.html`)
      if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true })
      fs.writeFileSync(htmlPath, await page.content(), 'utf-8')
    } catch {}
    return {
      properties: allProperties,
      seenProperties: Array.from(seenKeyMap.values()),
      totalCount,
      totalPages,
      checkedPages,
      fetchedCount,
      newCount: fetchedCount,
      duplicateCount,
      stoppedReason: 'fetch_error',
      error: message,
      htmlPath,
    }
  } finally {
    await browser.close()
  }
}

function resolveMaxPages(options: CrawlOptions): number | null {
  if (options.maxPages !== undefined) return options.maxPages
  switch (options.mode) {
    case 'full':   return null
    case 'manual': return 10
    case 'debug':  return 1
    default:       return 3
  }
}
