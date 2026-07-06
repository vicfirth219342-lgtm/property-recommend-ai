import { chromium } from 'playwright'
import { ScrapedProperty } from '@/types'
import path from 'path'
import fs from 'fs'

const SNAPSHOT_DIR = path.join(process.cwd(), 'crawl-snapshots')

export async function crawlAthome(
  url: string,
  customerId: string
): Promise<{ properties: ScrapedProperty[]; error?: string; htmlPath?: string }> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ja-JP',
  })
  const page = await context.newPage()
  const properties: ScrapedProperty[] = []
  let htmlPath: string | undefined

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2500)

    if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    htmlPath = path.join(SNAPSHOT_DIR, `athome_${customerId}_${ts}.html`)
    fs.writeFileSync(htmlPath, await page.content(), 'utf-8')

    const items = await page.$$('[class*="propertyList"] li, .bukken-item, [data-testid="property-card"]')

    for (const item of items) {
      const prop = await extractAthomeItem(item)
      if (prop) properties.push(prop)
    }

    return { properties, htmlPath }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    try {
      if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true })
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      htmlPath = path.join(SNAPSHOT_DIR, `athome_error_${customerId}_${ts}.html`)
      fs.writeFileSync(htmlPath, await page.content(), 'utf-8')
    } catch {}
    return { properties: [], error: message, htmlPath }
  } finally {
    await browser.close()
  }
}

async function extractAthomeItem(item: Awaited<ReturnType<import('playwright').Page['$']>>): Promise<ScrapedProperty | null> {
  if (!item) return null
  try {
    const name = (await item.$eval('[class*="title"], h2, h3', (el) => el.textContent?.trim()).catch(() => '')) ?? ''
    const address = (await item.$eval('[class*="address"], [class*="location"]', (el) => el.textContent?.trim()).catch(() => '')) ?? ''
    const priceText = (await item.$eval('[class*="price"]', (el) => el.textContent?.trim()).catch(() => '')) ?? ''
    const url = (await item.$eval('a', (el) => el.href).catch(() => '')) ?? ''
    const thumbnail = (await item.$eval('img', (el) => el.src).catch(() => null))

    const priceMatch = priceText.match(/([\d,]+)万円/)
    const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) * 10000 : null

    const areaText = (await item.$eval('[class*="spec"], [class*="detail"]', (el) => el.textContent?.trim()).catch(() => '')) ?? ''
    const areaMatch = areaText.match(/([\d.]+)\s*㎡/)
    const area_sqm = areaMatch ? parseFloat(areaMatch[1]) : null

    const floor_plan = areaText.match(/([1-9][SLDK]+)/i)?.[1] ?? null
    const ageMatch = areaText.match(/築(\d+)年/)
    const building_age = ageMatch ? parseInt(ageMatch[1]) : null
    const walkMatch = areaText.match(/徒歩(\d+)分/)
    const walk_minutes = walkMatch ? parseInt(walkMatch[1]) : null

    if (!name || !url) return null

    return {
      site: 'athome',
      name,
      address,
      price,
      area_sqm,
      floor_plan,
      building_age,
      walk_minutes,
      url,
      thumbnail_url: thumbnail ?? null,
      room_number: null,
    }
  } catch {
    return null
  }
}
