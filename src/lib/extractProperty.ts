import { parseBuiltDate } from './parseBuiltDate'

export interface ExtractedProperty {
  property_name?: string
  address?: string
  price_man?: number
  area_sqm?: number
  floor_number?: number
  built_year?: number
  built_month?: number
  station?: string
  walk_minutes?: number
  floor_plan?: string
  management_fee?: number
  repair_fund?: number
  source_url?: string
}

// 価格文字列 → 万円
function parsePrice(text: string): number | undefined {
  const m = text.match(/(\d+(?:,\d+)*)億(?:\s*(\d{1,4})万)?|(\d{1,4})万/)
  if (!m) return undefined
  if (m[1]) {
    const oku = parseInt(m[1].replace(/,/g, '')) * 10000
    const man = m[2] ? parseInt(m[2]) : 0
    return oku + man
  }
  return parseInt(m[3].replace(/,/g, ''))
}

// テキストから物件情報を抽出
export function extractFromText(text: string): ExtractedProperty {
  const result: ExtractedProperty = {}

  // 物件名: 【】「」または行頭のマンション名
  const namePatterns = [
    /【(.+?)】/,
    /「(.+?)」/,
    /物件名[：:\s]+(.+?)[\n\r]/,
    /^(.{3,30}(?:マンション|タワー|レジデンス|コート|パーク|ヒルズ|ガーデン|プレイス|スクエア|テラス|ビル|ハウス)(?:[^\n\r]{0,15})?)/m,
  ]
  for (const p of namePatterns) {
    const m = text.match(p)
    if (m?.[1]?.trim()) { result.property_name = m[1].trim(); break }
  }

  // 所在地
  const addrPatterns = [
    /(?:所在地|住所|所在)[：:\s]+(.+?)[\n\r]/,
    /(東京都|神奈川県|大阪府|愛知県|千葉県|埼玉県|兵庫県)[^\n\r,，、]{4,40}/,
  ]
  for (const p of addrPatterns) {
    const m = text.match(p)
    if (m) { result.address = (m[1] ?? m[0]).trim(); break }
  }

  // 価格
  const pricePatterns = [
    /(?:販売価格|価格|売価)[：:\s]*([0-9,]+(?:億[0-9,]*万?|万)円?)/,
    /([0-9,]+億[0-9,]*万?円?|[0-9,]{3,}万円?)/,
  ]
  for (const p of pricePatterns) {
    const m = text.match(p)
    if (m) { result.price_man = parsePrice(m[1] ?? m[0]); break }
  }

  // 専有面積
  const areaMatch = text.match(/(?:専有面積|面積)[：:\s]*(\d{2,3}(?:\.\d{1,2})?)\s*㎡/)
    ?? text.match(/(\d{2,3}(?:\.\d{1,2})?)\s*㎡/)
  if (areaMatch) result.area_sqm = parseFloat(areaMatch[1])

  // 築年月
  const builtRaw = text.match(
    /(新築|築後未入居|(?:明治|大正|昭和|平成|令和)\d+年(?:\d+月)?|\d{4}年(?:\d+月)?|築\d+年)/
  )?.[0]
  if (builtRaw) {
    const { builtYear, builtMonth } = parseBuiltDate(builtRaw)
    if (builtYear) result.built_year = builtYear
    if (builtMonth) result.built_month = builtMonth
  }

  // 駅・徒歩
  const stationMatch = text.match(/([^\s　]{2,10}駅)\s*(?:徒歩|歩)\s*(\d+)分/)
  if (stationMatch) {
    result.station = stationMatch[1]
    result.walk_minutes = parseInt(stationMatch[2])
  }

  // 間取り
  const floorMatch = text.match(/([1-9][SLDK]{1,4}(?:\+[SLDK]{1,2})?)/i)
  if (floorMatch) result.floor_plan = floorMatch[1].toUpperCase()

  // 所在階（「16階」「3階部分」等。「地上XX階建」は除外）
  const floorNumMatch = text.match(/(?:所在階|階数)[：:\s]*(\d+)階|(?<![地上]\d{1,2})(?<!\d)(\d+)階(?:部分|住戸|[^建])/)
  if (floorNumMatch) {
    const n = parseInt(floorNumMatch[1] ?? floorNumMatch[2])
    if (n >= 1 && n <= 80) result.floor_number = n
  }

  // 管理費
  const mgmtMatch = text.match(/管理費[：:\s]*([\d,]+)\s*円/)
  if (mgmtMatch) result.management_fee = parseInt(mgmtMatch[1].replace(/,/g, ''))

  // 修繕積立金
  const repairMatch = text.match(/修繕積立金[：:\s]*([\d,]+)\s*円/)
  if (repairMatch) result.repair_fund = parseInt(repairMatch[1].replace(/,/g, ''))

  // URL
  const urlMatch = text.match(/https?:\/\/[^\s\n\r"'<>]+/)
  if (urlMatch) result.source_url = urlMatch[0]

  return result
}

// CSV行から抽出（ヘッダー行のカラム名で判断）
export function extractFromCsvRows(
  headers: string[],
  rows: string[][]
): ExtractedProperty[] {
  const idx = (keywords: string[]) =>
    headers.findIndex(h => keywords.some(k => h.includes(k)))

  const nameIdx    = idx(['物件名', '名称', 'マンション名'])
  const addrIdx    = idx(['住所', '所在地', '所在'])
  const priceIdx   = idx(['価格', '金額', '売価'])
  const areaIdx    = idx(['面積', '㎡'])
  const builtIdx   = idx(['築', '竣工'])
  const stationIdx = idx(['駅', '最寄'])
  const walkIdx    = idx(['徒歩', '歩'])
  const floorIdx   = idx(['間取', 'LDK'])
  const urlIdx     = idx(['URL', 'url', 'リンク'])

  return rows.map(row => {
    const get = (i: number) => (i >= 0 ? row[i]?.trim() : undefined)
    const result: ExtractedProperty = {}

    if (get(nameIdx)) result.property_name = get(nameIdx)
    if (get(addrIdx)) result.address = get(addrIdx)
    if (get(priceIdx)) result.price_man = parsePrice(get(priceIdx) ?? '')
    if (get(areaIdx)) result.area_sqm = parseFloat(get(areaIdx) ?? '') || undefined
    if (get(stationIdx)) result.station = get(stationIdx)
    if (get(walkIdx)) result.walk_minutes = parseInt(get(walkIdx) ?? '') || undefined
    if (get(floorIdx)) result.floor_plan = get(floorIdx)?.toUpperCase()
    if (get(urlIdx)) result.source_url = get(urlIdx)

    const builtRaw = get(builtIdx)
    if (builtRaw) {
      const { builtYear, builtMonth } = parseBuiltDate(builtRaw)
      if (builtYear) result.built_year = builtYear
      if (builtMonth) result.built_month = builtMonth
    }

    return result
  }).filter(r => Object.values(r).some(Boolean))
}

// 検索キーワードを生成
export function buildSearchKeywords(prop: ExtractedProperty): string[] {
  const keywords: string[] = []

  // マンション名 + 町名
  if (prop.property_name) {
    keywords.push(prop.property_name)
    if (prop.address) {
      const townMatch = prop.address.match(/([^\s　]{2,6}[町丁目][\d\-―—〜]+|[^\s　]{2,8}[町丁])/)
      if (townMatch) keywords.push(`${prop.property_name} ${townMatch[0]}`)
    }
  }

  // 住所 + 面積
  if (prop.address && prop.area_sqm) {
    const short = prop.address.replace(/^.+?[都道府県]/, '')
    keywords.push(`${short} ${prop.area_sqm}㎡`)
  }

  // 駅名 + 価格帯
  if (prop.station && prop.price_man) {
    const priceRange = Math.floor(prop.price_man / 1000) * 1000
    keywords.push(`${prop.station} ${priceRange}万〜${priceRange + 1000}万`)
  }

  // 築年月
  if (prop.built_year) {
    const label = prop.built_month
      ? `${prop.built_year}年${prop.built_month}月`
      : `${prop.built_year}年`
    keywords.push(label)
  }

  // 面積単体
  if (prop.area_sqm) keywords.push(`${prop.area_sqm}㎡`)

  return [...new Set(keywords)].filter(Boolean)
}
