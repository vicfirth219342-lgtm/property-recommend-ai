import { chromium } from 'playwright'
import { ScrapedProperty, CrawlOptions, PageCrawlResult, StoppedReason } from '@/types'
import { buildDedupKey } from '@/lib/dedup'
import path from 'path'
import fs from 'fs'

const SNAPSHOT_DIR = path.join(process.cwd(), 'crawl-snapshots')
const PAGE_SIZE = 30

// LIFULL HOME'S はURLパラメータで page=N
function buildPageUrl(baseUrl: string, page: number): string {
  const url = new URL(baseUrl)
  if (page > 1) url.searchParams.set('page', String(page))
  else url.searchParams.delete('page')
  return url.toString()
}

async function parseTotalCount(page: import('playwright').Page): Promise<{ totalCount: number | null; totalPages: number | null }> {
  try {
    const text = await page.$eval(
      '[class*="result"] [class*="count"], [class*="searchCount"], .mod-refineBar__result',
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

async function scrapeOnePage(page: import('playwright').Page): Promise<ScrapedProperty[]> {
  const properties: ScrapedProperty[] = []
  const selectors = [
    '.mod-mergeBuilding--sale',
    '[class*="bukken-item"]',
    '.prg-bukkenList li',
    '[class*="PropertyCard"]',
    '[class*="propertyCard"]',
  ]

  let items: import('playwright').ElementHandle[] = []
  for (const sel of selectors) {
    items = await page.$$(sel)
    if (items.length > 0) break
  }

  for (const item of items) {
    try {
      const name = await item.$eval(
        '[class*="name"], [class*="title"], h2, h3',
        (el) => el.textContent?.trim() ?? ''
      ).catch(() => '')
      const url = await item.$eval('a', (el) => (el as HTMLAnchorElement).href).catch(() => '')
      const allText = await item.evaluate(el => el.textContent ?? '')
      const address = await item.$eval(
        '[class*="address"], [class*="location"]',
        (el) => el.textContent?.trim() ?? ''
      ).catch(() => '')

      const priceMatch = allText.match(/([\d,]+)万円/)
      const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) * 10000 : null
      const areaMatch = allText.match(/([\d.]+)\s*㎡/)
      const area_sqm = areaMatch ? parseFloat(areaMatch[1]) : null
      const floorMatch = allText.match(/([1-9][SLDK]+)/i)
      const floor_plan = floorMatch ? floorMatch[1].toUpperCase() : null
      const ageMatch = allText.match(/築(\d+)年/)
      const building_age = ageMatch ? parseInt(ageMatch[1]) : null
      const walkMatch = allText.match(/徒歩(\d+)分/)
      const walk_minutes = walkMatch ? parseInt(walkMatch[1]) : null
      const thumbnail = await item.$eval('img', (el) => (el as HTMLImageElement).src).catch(() => null)
      const roomMatch = name.match(/(\d+)号室?$/) ?? allText.match(/(\d{3,4})号室/)
      const room_number = roomMatch ? roomMatch[1] : null

      if (!name || !url) continue
      properties.push({ site: 'homes', name, address, price, area_sqm, floor_plan, building_age, walk_minutes, url, thumbnail_url: thumbnail ?? null, room_number })
    } catch {}
  }
  return properties
}

export async function crawlHomes(
  baseUrl: string,
  customerId: string,
  options: CrawlOptions,
  knownDedupKeys: Set<string>
): Promise<PageCrawlResult> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ja-JP',
  })
  const page = await context.newPage()

  const allProperties: ScrapedProperty[] = []
  let totalCount: number | null = null
  let totalPages: number | null = null
  let checkedPages = 0
  let fetchedCount = 0
  let duplicateCount = 0
  let stoppedReason: StoppedReason = 'reached_last_page'
  let htmlPath: string | undefined
  let consecutiveDupPages = 0
  const stopOnDupPages = options.stopOnDuplicatePages ?? 2
  const maxPages = resolveMaxPages(options)

  try {
    let currentPage = 1

    while (true) {
      if (maxPages !== null && currentPage > maxPages) {
        stoppedReason = 'reached_page_limit'
        break
      }

      const pageUrl = buildPageUrl(baseUrl, currentPage)
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(2000 + Math.random() * 1000)

      if (currentPage === 1) {
        const counts = await parseTotalCount(page)
        totalCount = counts.totalCount
        totalPages = counts.totalPages

        if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true })
        const ts = new Date().toISOString().replace(/[:.]/g, '-')
        htmlPath = path.join(SNAPSHOT_DIR, `homes_${customerId}_${ts}.html`)
        fs.writeFileSync(htmlPath, await page.content(), 'utf-8')
      }

      const pageProps = await scrapeOnePage(page)
      checkedPages++

      if (pageProps.length === 0) {
        stoppedReason = checkedPages === 1 ? 'no_results' : 'reached_last_page'
        break
      }

      let newInPage = 0
      for (const prop of pageProps) {
        const key = buildDedupKey(prop)
        if (knownDedupKeys.has(key)) {
          duplicateCount++
        } else {
          newInPage++
          fetchedCount++
          allProperties.push(prop)
        }
      }

      if (options.mode === 'diff' && newInPage === 0) {
        consecutiveDupPages++
        if (consecutiveDupPages >= stopOnDupPages) {
          stoppedReason = 'duplicate_sequence_detected'
          break
        }
      } else {
        consecutiveDupPages = 0
      }

      if (currentPage >= (totalPages ?? 999)) {
        stoppedReason = 'reached_last_page'
        break
      }

      await page.waitForTimeout(2000 + Math.random() * 2000)
      currentPage++
    }

    return { properties: allProperties, totalCount, totalPages, checkedPages, fetchedCount, newCount: fetchedCount, duplicateCount, stoppedReason, htmlPath }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      htmlPath = path.join(SNAPSHOT_DIR, `homes_error_${customerId}_${ts}.html`)
      if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true })
      fs.writeFileSync(htmlPath, await page.content(), 'utf-8')
    } catch {}
    return { properties: allProperties, totalCount, totalPages, checkedPages, fetchedCount, newCount: fetchedCount, duplicateCount, stoppedReason: 'fetch_error', error: message, htmlPath }
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
