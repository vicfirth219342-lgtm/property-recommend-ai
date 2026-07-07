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
  if (!url.searchParams.has('sort')) {
    url.searchParams.set('sort', '3') // SUUMO: sort=3 = 新着順
  }
  return url.toString()
}

function buildPageUrl(baseUrl: string, page: number): string {
  const url = new URL(baseUrl)
  url.searchParams.set('page', String(page))
  return url.toString()
}

async function parseTotalCount(page: import('playwright').Page): Promise<{ totalCount: number | null; totalPages: number | null }> {
  try {
    const text = await page.$eval(
      '.pagination_set-hit, .pagecaption, .pagination-parts',
      (el) => el.textContent ?? ''
    ).catch(() => '')

    const match = text.match(/([\d,]+)/)
    if (!match) return { totalCount: null, totalPages: null }
    const totalCount = parseInt(match[1].replace(/,/g, ''))
    if (totalCount > 100000) return { totalCount: null, totalPages: null }
    return { totalCount, totalPages: Math.ceil(totalCount / PAGE_SIZE) }
  } catch {
    return { totalCount: null, totalPages: null }
  }
}

async function scrapeOnePage(page: import('playwright').Page): Promise<ScrapedProperty[]> {
  const properties: ScrapedProperty[] = []

  const selectors = [
    '.property_unit',
    '.cassette_unit',
    '[data-cassette-type]',
    '.l-cassette__item',
  ]

  let items: import('playwright').ElementHandle[] = []
  for (const sel of selectors) {
    items = await page.$$(sel)
    if (items.length > 0) break
  }

  for (const item of items) {
    try {
      const name = await item.$eval(
        '.property_unit-title, .cassette_unit-title, h2, h3',
        (el) => el.textContent?.trim() ?? ''
      ).catch(() => '')

      const url = await item.$eval('a', (el) => (el as HTMLAnchorElement).href).catch(() => '')
      const address = await item.$$eval('dd, [class*="address"], [class*="location"]', (els) =>
        els.find(el => el.textContent?.includes('区') || el.textContent?.includes('市'))?.textContent?.trim() ?? ''
      ).catch(() => '')

      const allText = await item.evaluate(el => el.textContent ?? '')

      const priceMatch = allText.match(/([\d,]+)万円/)
      const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) * 10000 : null
      const areaMatch = allText.match(/([\d.]+)\s*㎡/)
      const area_sqm = areaMatch ? parseFloat(areaMatch[1]) : null
      const floorMatch = allText.match(/([1-9][SLDK]+)/i)
      const floor_plan = floorMatch ? floorMatch[1].toUpperCase() : null
      const walkMatch = allText.match(/徒歩(\d+)分/)
      const walk_minutes = walkMatch ? parseInt(walkMatch[1]) : null
      const thumbnail = await item.$eval('img', (el) => (el as HTMLImageElement).src).catch(() => null)
      const roomMatch = name.match(/(\d+)号室?$/) ?? allText.match(/(\d{3,4})号室/)
      const room_number = roomMatch ? roomMatch[1] : null

      // 築年月: 「2001年3月」「平成18年5月」「築25年」「新築」等を統一パース
      const builtRaw =
        allText.match(/(新築|築後未入居|(?:明治|大正|昭和|平成|令和)\d+年(?:\d+月)?|\d{4}年(?:\d+月)?|築\d+年)/)?.[0] ?? ''
      const { builtYear, builtMonth, buildingAge } = parseBuiltDate(builtRaw)

      if (!name || !url) continue

      properties.push({
        site: 'suumo',
        name,
        address,
        price,
        area_sqm,
        floor_plan,
        building_age: buildingAge,
        built_year: builtYear,
        built_month: builtMonth,
        walk_minutes,
        url,
        thumbnail_url: thumbnail ?? null,
        room_number,
      })
    } catch {
      // 1件のパース失敗はスキップ
    }
  }

  return properties
}

export async function crawlSuumo(
  baseUrl: string,
  customerId: string,
  options: CrawlOptions,
  knownDedupKeys: Set<string>
): Promise<PageCrawlResult> {
  const sortedUrl = addNewestFirstSort(baseUrl)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ja-JP',
  })
  const page = await context.newPage()

  const allProperties: ScrapedProperty[] = []
  const seenProperties: ScrapedProperty[] = []
  // dedup_key → scraped price（同一物件の重複登録を防ぐ）
  const seenKeyMap = new Map<string, ScrapedProperty>()

  let totalCount: number | null = null
  let totalPages: number | null = null
  let checkedPages = 0
  let fetchedCount = 0
  let duplicateCount = 0
  let stoppedReason: StoppedReason = 'reached_last_page'
  let htmlPath: string | undefined
  // 物件レベルの連続重複カウンター（ページレベルではなく）
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
      await page.waitForTimeout(1500 + Math.random() * 1000)

      if (currentPage === 1) {
        const counts = await parseTotalCount(page)
        totalCount = counts.totalCount
        totalPages = counts.totalPages

        if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true })
        const ts = new Date().toISOString().replace(/[:.]/g, '-')
        htmlPath = path.join(SNAPSHOT_DIR, `suumo_${customerId}_${ts}.html`)
        fs.writeFileSync(htmlPath, await page.content(), 'utf-8')
      }

      const pageProps = await scrapeOnePage(page)
      checkedPages++

      if (pageProps.length === 0) {
        stoppedReason = checkedPages === 1 ? 'no_results' : 'reached_last_page'
        break
      }

      for (const prop of pageProps) {
        const key = buildDedupKey(prop)

        if (knownDedupKeys.has(key)) {
          duplicateCount++
          // 価格更新検知用に収集（同一物件は最新価格で上書き）
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
          consecutiveDups = 0  // 新規物件が出たらリセット
          fetchedCount++
          allProperties.push(prop)
          knownDedupKeys.add(key)  // 同一クロール内の重複も防ぐ
        }
      }

      if (earlyStop) break

      const detectedTotal = totalPages ?? 999
      if (currentPage >= detectedTotal) {
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
      htmlPath = path.join(SNAPSHOT_DIR, `suumo_error_${customerId}_${ts}.html`)
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
    case 'diff':
    default:       return 3
  }
}
