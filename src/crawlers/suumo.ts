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

export async function scrapeOnePage(page: import('playwright').Page, transactionType: import('@/types').TransactionType = 'sale'): Promise<ScrapedProperty[]> {
  const properties: ScrapedProperty[] = []

  // 賃貸ページ検出: .cassetteitem が存在すれば FR301FC001（賃貸一覧）ページ
  const rentCards = await page.$$('.cassetteitem')
  if (rentCards.length > 0) {
    for (const card of rentCards) {
      try {
        const buildingName = await card.$eval(
          '.cassetteitem_content-title, [class*="cassetteitem_content-title"], h2, h3',
          (el) => el.textContent?.trim() ?? ''
        ).catch(() => '')

        const address = await card.$$eval('dd, [class*="address"], [class*="location"]', (els) =>
          els.find(el => el.textContent?.includes('区') || el.textContent?.includes('市'))?.textContent?.trim() ?? ''
        ).catch(() => '')

        const cardText = await card.evaluate(el => el.textContent ?? '')
        // 徒歩表記: 「徒歩X分」（売買）・「歩X分」（賃貸）両対応
        const walkMatch = cardText.match(/(?:徒歩|歩)(\d+)分/)
        const walk_minutes = walkMatch ? parseInt(walkMatch[1]) : null
        const thumbnail = await card.$eval('img', (el) => (el as HTMLImageElement).src).catch(() => null)

        const builtRaw = cardText.match(/(新築|築後未入居|(?:明治|大正|昭和|平成|令和)\d+年(?:\d+月)?|\d{4}年(?:\d+月)?|築\d+年)/)?.[0] ?? ''
        const { builtYear, builtMonth, buildingAge } = parseBuiltDate(builtRaw)

        // 各 tbody = 1部屋（建物カード内に複数部屋が存在する場合あり）
        const tbodies = await card.$$('tbody')
        for (const tbody of tbodies) {
          try {
            // 部屋詳細URLは /chintai/jnc_XXXXXXXXX/ 形式
            const url = await tbody.$eval(
              'a[href*="/chintai/jnc_"]',
              (el) => (el as HTMLAnchorElement).href
            ).catch(() => '')
            if (!url) continue

            const tds = await tbody.$$('td')
            // SUUMO賃貸一覧のtd配置: [0]=checkbox [1]=? [2]=階数 [3]=賃料+管理費 [4]=敷金礼金 [5]=間取り+面積 [8]=詳細
            const floorText  = tds[2] ? await tds[2].evaluate(el => el.textContent ?? '') : ''
            const rentText   = tds[3] ? await tds[3].evaluate(el => el.textContent ?? '') : ''
            const layoutText = tds[5] ? await tds[5].evaluate(el => el.textContent ?? '') : ''

            const floorMatch = floorText.match(/(\d+)階/)
            const room_number = floorMatch ? `${floorMatch[1]}階` : null

            // 賃料: 最初の "XX.X万円"
            const rentMatch = rentText.match(/([\d,.]+)万円/)
            const monthly_rent = rentMatch
              ? Math.round(parseFloat(rentMatch[1].replace(/,/g, '')) * 10000)
              : null

            // 管理費: "32万円 20000円" の後続数値（円単位）
            const mgmtMatch = rentText.match(/万円\s*([\d,]+)円/)
            const management_fee = mgmtMatch ? parseInt(mgmtMatch[1].replace(/,/g, '')) : null

            const layoutMatch = layoutText.match(/([1-9][SsLlDdKk]+)/i)
            const floor_plan = layoutMatch ? layoutMatch[0].toUpperCase() : null

            // SUUMO賃貸一覧の面積表記は "60.28m2"（㎡ではなく m2）
            const areaMatch = layoutText.match(/([\d.]+)\s*(?:㎡|m2|m²)/)
            const area_sqm = areaMatch ? parseFloat(areaMatch[1]) : null

            if (!buildingName) continue

            properties.push({
              site: 'suumo',
              transaction_type: 'rent',
              name: buildingName,
              address,
              price: null,
              monthly_rent,
              management_fee,
              repair_fund: null,
              yield_rate: null,
              land_area: null,
              building_area: null,
              key_money: null,
              deposit: null,
              guarantee_money: null,
              tsubo_count: null,
              tsubo_price: null,
              available_from: null,
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
            // tbody パース失敗はスキップ
          }
        }
      } catch {
        // building card パース失敗はスキップ
      }
    }
    return properties
  }

  // 売買ページ: 従来の .property_unit ロジック
  let items: import('playwright').ElementHandle[] = []
  for (const sel of ['.property_unit', '.cassette_unit', '[data-cassette-type]', '.l-cassette__item']) {
    items = await page.$$(sel)
    if (items.length > 0) break
  }

  for (const item of items) {
    try {
      const name = await item.$eval(
        '.property_unit-title, .cassette_unit-title, [class*="title"], h2, h3',
        (el) => el.textContent?.trim() ?? ''
      ).catch(() => '')

      const url = await item.$$eval('a', (els) => {
        const valid = (els as HTMLAnchorElement[]).find(a => a.href && !a.href.startsWith('javascript'))
        return valid?.href ?? ''
      }).catch(() => '')

      const address = await item.$$eval('dd, [class*="address"], [class*="location"]', (els) =>
        els.find(el => el.textContent?.includes('区') || el.textContent?.includes('市'))?.textContent?.trim() ?? ''
      ).catch(() => '')

      const allText = await item.evaluate(el => el.textContent ?? '')

      const priceMatch = allText.match(/([\d,.]+)万円/)
      const price = priceMatch ? Math.round(parseFloat(priceMatch[1].replace(/,/g, '')) * 10000) : null
      const areaMatch = allText.match(/([\d.]+)\s*(?:㎡|m²|m2)/)
      const area_sqm = areaMatch ? parseFloat(areaMatch[1]) : null
      const floorMatch = allText.match(/([1-9][SLDK]+)/i)
      const floor_plan = floorMatch ? floorMatch[1].toUpperCase() : null
      const walkMatch = allText.match(/(?:徒歩|歩)(\d+)分/)
      const walk_minutes = walkMatch ? parseInt(walkMatch[1]) : null
      const thumbnail = await item.$eval('img', (el) => (el as HTMLImageElement).src).catch(() => null)
      const roomMatch = name.match(/(\d+)号室?$/) ?? allText.match(/(\d{3,4})号室/)
      const room_number = roomMatch ? roomMatch[1] : null

      const mgmtMatch = allText.match(/管理費[：:\s]*([\d,]+)\s*円/)
      const management_fee = mgmtMatch ? parseInt(mgmtMatch[1].replace(/,/g, '')) : null
      const repairMatch = allText.match(/修繕積立金[：:\s]*([\d,]+)\s*円/)
      const repair_fund = repairMatch ? parseInt(repairMatch[1].replace(/,/g, '')) : null

      const builtRaw = allText.match(/(新築|築後未入居|(?:明治|大正|昭和|平成|令和)\d+年(?:\d+月)?|\d{4}年(?:\d+月)?|築\d+年)/)?.[0] ?? ''
      const { builtYear, builtMonth, buildingAge } = parseBuiltDate(builtRaw)

      if (!name || !url) continue

      properties.push({
        site: 'suumo',
        transaction_type: transactionType,
        name,
        address,
        price: transactionType === 'sale' ? price : null,
        monthly_rent: null,
        management_fee,
        repair_fund,
        yield_rate: null,
        land_area: null,
        building_area: null,
        key_money: null,
        deposit: null,
        guarantee_money: null,
        tsubo_count: null,
        tsubo_price: null,
        available_from: null,
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

      // 404・エラーページを 0件取得と区別してエラーにする（データは捏造しない）
      const pageTitle = await page.title().catch(() => '')
      if (pageTitle.includes('ページが見つかりません')) {
        throw new Error(`検索URLが無効です（SUUMO 404）: ${pageUrl}`)
      }
      // 「必要な情報が不足しているため」エラーページ（URLパラメータ誤り等）
      if (pageTitle.includes('エラー')) {
        const bodyText = await page.textContent('body').catch(() => '')
        throw new Error(`SUUMOエラーページ（URLパラメータ不正）: ${bodyText?.includes('必要な情報が不足') ? '必要な情報が不足しているため検索できません' : pageTitle} - ${pageUrl}`)
      }

      if (currentPage === 1) {
        const counts = await parseTotalCount(page)
        totalCount = counts.totalCount
        totalPages = counts.totalPages

        if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true })
        const ts = new Date().toISOString().replace(/[:.]/g, '-')
        htmlPath = path.join(SNAPSHOT_DIR, `suumo_${customerId}_${ts}.html`)
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
