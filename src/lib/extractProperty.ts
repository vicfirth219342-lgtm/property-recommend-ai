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

// 価格文字列 → 万円（カンマ入り "6,180万円" に対応）
function parsePrice(text: string): number | undefined {
  const m = text.match(/(\d+(?:,\d+)*)億(?:\s*(\d+(?:,\d+)*)万)?|(\d+(?:,\d+)*)万/)
  if (!m) return undefined
  if (m[1]) {
    const oku = parseInt(m[1].replace(/,/g, '')) * 10000
    const man = m[2] ? parseInt(m[2].replace(/,/g, '')) : 0
    return oku + man
  }
  return parseInt(m[3].replace(/,/g, ''))
}

// 全角文字 → 半角に正規化（レインズは全角数字・全角英字を使うため必須）
function normalizeText(t: string): string {
  return t
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 0x30))  // 全角数字→半角
    .replace(/[Ａ-Ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF21 + 0x41))  // 全角大文字→半角（ＬＤＫ等）
    .replace(/[ａ-ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF41 + 0x61))  // 全角小文字→半角
    .replace(/，/g, ',')   // 全角カンマ→半角
    .replace(/．/g, '.')   // 全角ピリオド→半角
    .replace(/　/g, ' ')   // 全角スペース→半角（ラベル後のスペースに対応）
}

// テキストから物件情報を抽出
export function extractFromText(rawText: string): ExtractedProperty {
  const text = normalizeText(rawText)
  const result: ExtractedProperty = {}

  // 物件名: レインズは「物件名称：」、ポータルは「物件名：」など
  const namePatterns = [
    /物件名称?[：:\s]+(.+?)[\n\r]/,   // レインズ「物件名称：」・ポータル「物件名：」両対応
    /【(.+?)】/,
    /「(.+?)」/,
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

// ─────────────────────────────────────────────────────────────
// レインズ取り込み物件（一括取得方式）
// ─────────────────────────────────────────────────────────────

export interface ReinsImportedProperty {
  id?: string
  reins_number?: string       // 物件番号（12桁）
  property_name?: string      // 建物名
  address?: string            // 所在地
  price_man?: number
  area_sqm?: number
  floor_plan?: string
  floor_number?: number
  built_year?: number
  built_month?: number
  management_fee?: number
  transaction_type?: string   // 売主/専任/一般
  agent_company?: string      // 元付会社
  station?: string
  walk_minutes?: number
  page_url?: string
  imported_at?: string
  raw_block?: string
}

// レインズ検索結果一覧テキストから複数物件を一括抽出
export function extractMultipleFromReinsText(rawText: string): ReinsImportedProperty[] {
  const text = normalizeText(rawText)

  // 12桁のレインズ物件番号（1001XXXXXXXX）でブロックを分割
  const positions: number[] = []
  const numRe = /\b(\d{12})\b/g
  let m: RegExpExecArray | null
  while ((m = numRe.exec(text)) !== null) {
    positions.push(m.index)
  }
  if (positions.length === 0) return []

  const blocks: string[] = []
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i]
    const end = i + 1 < positions.length ? positions[i + 1] : text.length
    blocks.push(text.slice(start, end))
  }

  return blocks
    .map(block => extractSingleReinsProperty(block))
    .filter(p => !!(p.price_man || p.area_sqm))
}

// レインズ一覧の「所在地」欄に含まれる都道府県パターン
const PREF_PATTERN = /^(東京都|神奈川県|大阪府|愛知県|千葉県|埼玉県|兵庫県|福岡県|北海道|宮城県|京都府|広島県|静岡県|茨城県|栃木県|群馬県|新潟県|長野県|岐阜県|三重県|滋賀県|奈良県|和歌山県|岡山県|山口県|熊本県|鹿児島県|沖縄県)/

// レインズ一覧の「所在地」欄は以下のように複数行で構成される:
//   1行目: 住所（都道府県から始まる）
//   2行目: 建物名
//   3行目: 沿線・駅
//   4行目: 商号（会社名）
//   5行目: 電話番号 など
function parseAddressBlock(lines: string[]): {
  address?: string
  property_name?: string
  station?: string
  walk_minutes?: number
  agent_company?: string
} {
  const result: { address?: string; property_name?: string; station?: string; walk_minutes?: number; agent_company?: string } = {}
  let addrIdx = -1

  for (let i = 0; i < lines.length; i++) {
    if (PREF_PATTERN.test(lines[i])) {
      addrIdx = i
      // 住所行は都道府県 + 住所部分のみ（次の行以降は別情報）
      result.address = lines[i].trim()
      break
    }
  }

  if (addrIdx < 0) return result

  // 住所の次の行 → 建物名（空行・電話番号・数字のみ行を除く）
  for (let i = addrIdx + 1; i < lines.length && i <= addrIdx + 3; i++) {
    const line = lines[i].trim()
    if (!line) continue
    // 電話番号行（ハイフン付き数字）・12桁番号行はスキップ
    if (/^\d[\d\-－]+\d$/.test(line)) continue
    // 数字のみ・記号のみはスキップ
    if (/^[\d\s,，.．\-]+$/.test(line)) continue
    result.property_name = line
    break
  }

  // 住所の後ろ3〜6行から沿線・会社を探す
  for (let i = addrIdx + 2; i < lines.length && i <= addrIdx + 6; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // 駅情報（「東横線 新丸子」「東横線 新丸子 徒歩3分」など）
    if (!result.station) {
      const stMatch = line.match(/([^\s]{2,10}駅)/)
      if (stMatch) {
        result.station = stMatch[1]
        const walkMatch = line.match(/(?:徒歩|歩)\s*(\d+)分/)
        if (walkMatch) result.walk_minutes = parseInt(walkMatch[1])
        continue
      }
      // 「XX線 YY」形式（駅名なし）の場合も沿線情報として取得
      if (/線\s+[^\s]{2,}/.test(line) && !result.station) {
        result.station = line
        continue
      }
    }

    // 会社名（（株）/（有）/株式会社/有限会社）
    if (!result.agent_company && /(株式会社|（株）|\(株\)|有限会社|（有）|\(有\))/.test(line)) {
      result.agent_company = line
    }
  }

  return result
}

function extractSingleReinsProperty(block: string): ReinsImportedProperty {
  const result: ReinsImportedProperty = { raw_block: block.slice(0, 600) }
  const lines = block.split(/\n/)

  // 物件番号（12桁）
  const numMatch = block.match(/\b(\d{12})\b/)
  if (numMatch) result.reins_number = numMatch[1]

  // 価格（カンマ区切り対応、最初にヒットした万円）
  const priceMatch = block.match(/(\d+(?:,\d+)*)万円/)
  if (priceMatch) result.price_man = parseInt(priceMatch[1].replace(/,/g, ''))

  // 専有面積（2〜3桁.小数）
  const areaMatch = block.match(/(\d{2,3}(?:\.\d{1,2})?)\s*㎡/)
  if (areaMatch) result.area_sqm = parseFloat(areaMatch[1])

  // 間取り（正規化済み英字）
  const planMatch = block.match(/([1-9][SLDK]{1,4}(?:\+[SLDK]{1,2})?)/i)
  if (planMatch) result.floor_plan = planMatch[1].toUpperCase()

  // 所在階（「XX階建」を除外）
  const floorMatch = block.match(/(?<!\d)(\d{1,2})階(?!建)/)
  if (floorMatch) {
    const n = parseInt(floorMatch[1])
    if (n >= 1 && n <= 80) result.floor_number = n
  }

  // 所在地・建物名・沿線・会社名を「住所行の次行」構造で解析
  const addrBlock = parseAddressBlock(lines)
  if (addrBlock.address) result.address = addrBlock.address
  if (addrBlock.property_name) result.property_name = addrBlock.property_name
  if (addrBlock.station) result.station = addrBlock.station
  if (addrBlock.walk_minutes) result.walk_minutes = addrBlock.walk_minutes
  if (addrBlock.agent_company) result.agent_company = addrBlock.agent_company

  // 建物名が取れなかった場合のフォールバック: マンション系キーワード検索
  if (!result.property_name) {
    const bm = block.match(/([^\n\r\d]{3,40}(?:マンション|タワー|レジデンス|コート|パーク|ヒルズ|ガーデン|プレイス|スクエア|テラス|ビル|ヴィラ|ハウス|アパート|クレッセント|ライオンズ|グランド|ウィング|アーバン|フォレスト|シティ|ハイツ|コーポ)[^\n\r]{0,20})/m)
    if (bm?.[1]?.trim()) result.property_name = bm[1].trim()
  }

  // 駅・徒歩（まだ取れていない場合のフォールバック）
  if (!result.station) {
    const stMatch = block.match(/([^\s]{2,10}駅)\s*(?:徒歩|歩)\s*(\d+)分/)
    if (stMatch) {
      result.station = stMatch[1]
      result.walk_minutes = parseInt(stMatch[2])
    }
  }

  // 会社名のフォールバック（まだ取れていない場合）
  if (!result.agent_company) {
    const coMatch = block.match(/(?:（株）|\(株\))[^\n\r（）]{2,25}/)
      ?? block.match(/[^\n\r]{2,15}(?:株式会社|有限会社)[^\n\r]{0,15}/)
    if (coMatch) result.agent_company = coMatch[0].trim()
  }

  // 築年月
  const { builtYear, builtMonth } = parseBuiltDate(
    block.match(/(新築|築後未入居|(?:明治|大正|昭和|平成|令和)\d+年(?:\d+月)?|\d{4}年(?:\d+月)?|築\d+年)/)?.[0] ?? ''
  )
  if (builtYear) result.built_year = builtYear
  if (builtMonth) result.built_month = builtMonth

  // 管理費（最初の「円」）
  const mgmtMatch = block.match(/(\d+(?:,\d+)*)\s*円/)
  if (mgmtMatch) result.management_fee = parseInt(mgmtMatch[1].replace(/,/g, ''))

  // 取引態様
  const txMatch = block.match(/売主|専任|一般|代理|オーナーチェンジ/)
  if (txMatch) result.transaction_type = txMatch[0]

  return result
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
