import { chromium } from 'playwright'
import { ScrapedProperty } from '@/types'
import path from 'path'
import fs from 'fs'

const SNAPSHOT_DIR = path.join(process.cwd(), 'crawl-snapshots')

export async function crawlSuumo(
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
    await page.waitForTimeout(2000)

    // HTML保存
    if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    htmlPath = path.join(SNAPSHOT_DIR, `suumo_${customerId}_${ts}.html`)
    fs.writeFileSync(htmlPath, await page.content(), 'utf-8')

    // 物件一覧を取得
    const items = await page.$$('.property_unit')
    if (items.length === 0) {
      // 別のセレクタを試す
      const items2 = await page.$$('.cassette_unit')
      for (const item of items2) {
        const prop = await extractSuumoItem(item)
        if (prop) properties.push(prop)
      }
    } else {
      for (const item of items) {
        const prop = await extractSuumoItem(item)
        if (prop) properties.push(prop)
      }
    }

    return { properties, htmlPath }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    // エラー時もHTML保存を試みる
    try {
      if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true })
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      htmlPath = path.join(SNAPSHOT_DIR, `suumo_error_${customerId}_${ts}.html`)
      fs.writeFileSync(htmlPath, await page.content(), 'utf-8')
    } catch {}
    return { properties: [], error: message, htmlPath }
  } finally {
    await browser.close()
  }
}

async function extractSuumoItem(item: Awaited<ReturnType<import('playwright').Page['$']>>): Promise<ScrapedProperty | null> {
  if (!item) return null
  try {
    const name = (await item.$eval('.property_unit-title', (el) => el.textContent?.trim())) ?? ''
    const address = (await item.$eval('.property_unit-text dd', (el) => el.textContent?.trim()).catch(() => '')) ?? ''
    const priceText = (await item.$eval('.dottable-value', (el) => el.textContent?.trim()).catch(() => '')) ?? ''
    const url = (await item.$eval('a', (el) => el.href).catch(() => '')) ?? ''
    const thumbnail = (await item.$eval('img', (el) => el.src).catch(() => null))

    // 価格パース (例: "4,500万円" → 45000000)
    const priceMatch = priceText.match(/([\d,]+)万円/)
    const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) * 10000 : null

    // 面積パース
    const areaText = (await item.$$eval('.dottable-value', (els) =>
      els.find((el) => el.textContent?.includes('㎡'))?.textContent?.trim()
    ).catch(() => '')) ?? ''
    const areaMatch = areaText.match(/([\d.]+)㎡/)
    const area_sqm = areaMatch ? parseFloat(areaMatch[1]) : null

    // 間取りパース
    const floor_plan = (await item.$$eval('.dottable-value', (els) =>
      els.find((el) => /[1-9][SLDK]+/i.test(el.textContent ?? ''))?.textContent?.trim()
    ).catch(() => null))

    // 築年数パース
    const ageText = (await item.$$eval('.dottable-value', (els) =>
      els.find((el) => el.textContent?.includes('築'))?.textContent?.trim()
    ).catch(() => '')) ?? ''
    const ageMatch = ageText.match(/築(\d+)年/)
    const building_age = ageMatch ? parseInt(ageMatch[1]) : null

    // 駅徒歩パース
    const walkText = (await item.$$eval('.dottable-value', (els) =>
      els.find((el) => el.textContent?.includes('分'))?.textContent?.trim()
    ).catch(() => '')) ?? ''
    const walkMatch = walkText.match(/徒歩(\d+)分/)
    const walk_minutes = walkMatch ? parseInt(walkMatch[1]) : null

    if (!name || !url) return null

    return {
      site: 'suumo',
      name,
      address,
      price,
      area_sqm,
      floor_plan: floor_plan ?? null,
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
