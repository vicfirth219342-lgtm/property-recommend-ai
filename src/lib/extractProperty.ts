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
  const m = text.match(/(\d+(?:,\d+)*)億(?:\s*(\d+(?:,\d+)*)万)?|(\d+(?:,\d+)*)万/)
  if (!m) return undefined
  if (m[1]) {
    const oku = parseInt(m[1].replace(/,/g, '')) * 10000
    const man = m[2] ? parseInt(m[2].replace(/,/g, '')) : 0
    return oku + man
  }
  return parseInt(m[3].replace(/,/g, ''))
}

// 全角文字 → 半角に正規化
export function normalizeText(t: string): string {
  return t
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 0x30))
    .replace(/[Ａ-Ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF21 + 0x41))
    .replace(/[ａ-ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF41 + 0x61))
    .replace(/，/g, ',')
    .replace(/．/g, '.')
    .replace(/　/g, ' ')
}

// ─────────────────────────────────────────────────────────────
// ポータルサイト用テキスト抽出
// ─────────────────────────────────────────────────────────────

export function extractFromText(rawText: string): ExtractedProperty {
  const text = normalizeText(rawText)
  const result: ExtractedProperty = {}

  const namePatterns = [
    // 「物件名 クレッセント武蔵中原IV」のようにラベルと値が同一行（コロン区切り）
    /物件名称?[：:\s]+([^\n\r]{2,40})/,
    // 「物件名\nクレッセント武蔵中原IV」のようにラベルと値が別行（テーブルセル）
    /物件名称?\s*\n\s*([^\n\r]{2,40})/,
    /【(.+?)】/,
    /「(.+?)」/,
    /^(.{3,30}(?:マンション|タワー|レジデンス|コート|パーク|ヒルズ|ガーデン|プレイス|スクエア|テラス|ビル|ハウス)(?:[^\n\r]{0,15})?)/m,
  ]
  for (const p of namePatterns) {
    const m = text.match(p)
    if (m?.[1]?.trim()) { result.property_name = m[1].trim(); break }
  }

  const addrPatterns = [
    /(?:所在地|住所|所在)[：:\s]+(.+?)[\n\r]/,
    /(東京都|神奈川県|大阪府|愛知県|千葉県|埼玉県|兵庫県)[^\n\r,，、]{4,40}/,
  ]
  for (const p of addrPatterns) {
    const m = text.match(p)
    if (m) { result.address = (m[1] ?? m[0]).trim(); break }
  }

  const pricePatterns = [
    /(?:販売価格|価格|売価)[：:\s]*([0-9,]+(?:億[0-9,]*万?|万)円?)/,
    /([0-9,]+億[0-9,]*万?円?|[0-9,]{3,}万円?)/,
  ]
  for (const p of pricePatterns) {
    const m = text.match(p)
    if (m) { result.price_man = parsePrice(m[1] ?? m[0]); break }
  }

  const areaMatch = text.match(/(?:専有面積|面積)[：:\s]*(\d{2,3}(?:\.\d{1,2})?)\s*㎡/)
    ?? text.match(/(\d{2,3}(?:\.\d{1,2})?)\s*㎡/)
  if (areaMatch) result.area_sqm = parseFloat(areaMatch[1])

  const builtRaw = text.match(
    /(新築|築後未入居|(?:明治|大正|昭和|平成|令和)\d+年(?:\d+月)?|\d{4}年(?:\d+月)?|築\d+年)/
  )?.[0]
  if (builtRaw) {
    const { builtYear, builtMonth } = parseBuiltDate(builtRaw)
    if (builtYear) result.built_year = builtYear
    if (builtMonth) result.built_month = builtMonth
  }

  const stationMatch = text.match(/([^\s　]{2,10}駅)\s*(?:徒歩|歩)\s*(\d+)分/)
  if (stationMatch) {
    result.station = stationMatch[1]
    result.walk_minutes = parseInt(stationMatch[2])
  }

  const floorMatch = text.match(/([1-9][SLDK]{1,4}(?:\+[SLDK]{1,2})?)/i)
  if (floorMatch) result.floor_plan = floorMatch[1].toUpperCase()

  const floorNumMatch = text.match(/(?:所在階|階数)[：:\s]*(\d+)階|(?<![地上]\d{1,2})(?<!\d)(\d+)階(?:部分|住戸|[^建])/)
  if (floorNumMatch) {
    const n = parseInt(floorNumMatch[1] ?? floorNumMatch[2])
    if (n >= 1 && n <= 80) result.floor_number = n
  }

  const mgmtMatch = text.match(/管理費[：:\s]*([\d,]+)\s*円/)
  if (mgmtMatch) result.management_fee = parseInt(mgmtMatch[1].replace(/,/g, ''))

  const repairMatch = text.match(/修繕積立金[：:\s]*([\d,]+)\s*円/)
  if (repairMatch) result.repair_fund = parseInt(repairMatch[1].replace(/,/g, ''))

  const urlMatch = text.match(/https?:\/\/[^\s\n\r"'<>]+/)
  if (urlMatch) result.source_url = urlMatch[0]

  return result
}

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
// レインズ取り込み物件
// ─────────────────────────────────────────────────────────────

export interface ReinsImportedProperty {
  id?: string
  reins_number?: string
  property_name?: string
  address?: string
  price_man?: number
  area_sqm?: number
  floor_plan?: string
  floor_number?: number
  built_year?: number
  built_month?: number
  management_fee?: number
  transaction_type?: string
  agent_company?: string
  station?: string
  walk_minutes?: number
  page_url?: string
  imported_at?: string
  raw_block?: string
}

// ─────────────────────────────────────────────────────────────
// 都道府県パターン
// ─────────────────────────────────────────────────────────────
const PREF_PATTERN = /^(東京都|神奈川県|大阪府|愛知県|千葉県|埼玉県|兵庫県|福岡県|北海道|宮城県|京都府|広島県|静岡県|茨城県|栃木県|群馬県|新潟県|長野県|岐阜県|三重県|滋賀県|奈良県|和歌山県|岡山県|山口県|熊本県|鹿児島県|沖縄県|青森県|岩手県|秋田県|山形県|福島県|富山県|石川県|福井県|山梨県|鳥取県|島根県|徳島県|香川県|愛媛県|高知県|佐賀県|長崎県|大分県|宮崎県)/

// ─────────────────────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────────────────────

// レインズの取引態様として使われる語（建物名として誤判定しない）
const TRANSACTION_TYPES = new Set(['売主', '専任', '一般', '代理', 'オーナーチェンジ', '共同仲介', '専属専任'])

// 電話番号行かどうか（03-6427-9830 など）
function isPhoneLine(s: string): boolean {
  return /^\d[\d\-－\s]{7,13}\d$/.test(s.trim())
}

// 数字・記号のみの行かどうか
function isDigitsOnlyLine(s: string): boolean {
  return /^[\d\s,，.．\-－＋]+$/.test(s.trim())
}

// 沿線・駅情報の行かどうか（「東横線 新丸子」「東急田園都市線」など）
function isStationLine(s: string): boolean {
  return /[線駅]/.test(s)
}

// 取引態様の行かどうか
function isTransactionTypeLine(s: string): boolean {
  return TRANSACTION_TYPES.has(s.trim())
}

// 建物名として無効な値をフィルタ（undefined を返す → 保存しない）
// 以下のみ null 扱い: 空文字 / "-" / "（物件名なし）" / 取引態様 / 価格 / 面積 / 物件番号
function sanitizePropertyName(name: string): string | undefined {
  const n = name.trim()
  if (!n) return undefined
  if (n === '-' || n === '－' || n === '—') return undefined
  if (n === '（物件名なし）' || n === '(物件名なし)') return undefined
  // 12桁の物件番号はNG
  if (/^\d{12}$/.test(n)) return undefined
  // 取引態様はNG（「一般」「専任」「売主」等）
  if (isTransactionTypeLine(n)) return undefined
  // 価格はNG（「6,980万円」「1億2,000万円」等）
  if (/^\d[\d,，]*(?:億[\d,，]*)?万円?$/.test(n)) return undefined
  // 面積はNG（「71.85㎡」等）
  if (/^\d+(?:\.\d+)?㎡$/.test(n)) return undefined
  // 間取りはNG（「3LDK」「2SLDK」等）
  if (/^[1-9][SLDK]{1,5}$/.test(n)) return undefined
  return n
}

// ─────────────────────────────────────────────────────────────
// テーブル形式抽出（Chrome拡張の新形式: __TABLE_FORMAT__）
//
// レインズ一覧の「所在地」セルは以下の行構成：
//   1行目: 所在地（都道府県〜番地）
//   2行目: 建物名
//   3行目: 沿線・駅
//   4行目: 元付会社
//   5行目: 電話番号
// ─────────────────────────────────────────────────────────────

function extractFromTableStructure(text: string): ReinsImportedProperty[] {
  // __TABLE_FORMAT__ ヘッダを除去
  const content = text.replace(/^[\s\S]*?__TABLE_FORMAT__\n?/, '')
  const rowBlocks = content.split('\n__ROW__\n')
  const results: ReinsImportedProperty[] = []

  for (const rowBlock of rowBlocks) {
    if (!rowBlock.trim()) continue
    const cells = rowBlock.split('\n__CELL__\n').map(c => c.trim())
    const prop = extractFromTableRow(cells)
    // 物件番号・価格・面積・建物名のいずれかがあれば有効
    if (prop.reins_number || prop.price_man || prop.area_sqm || prop.property_name) {
      results.push(prop)
    }
  }

  return results
}

function extractFromTableRow(cells: string[]): ReinsImportedProperty {
  const allText = cells.join('\n')
  const result: ReinsImportedProperty = {
    raw_block: allText.slice(0, 600),
  }

  // ── 物件番号（12桁） ───────────────────────────────────────
  const numMatch = allText.match(/\b(\d{12})\b/)
  if (numMatch) result.reins_number = numMatch[1]

  // ── 所在地セル（都道府県で始まるセルを探す） ──────────────
  let addrCell: string | undefined
  for (const cell of cells) {
    // セルの最初の非空行を取得
    const firstLine = cell.split('\n').find(l => l.trim())?.trim() ?? ''
    if (PREF_PATTERN.test(firstLine)) {
      addrCell = cell
      break
    }
  }

  if (addrCell) {
    const lines = addrCell
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)

    // ── [DEBUG] ③ addrCell の内容を全行ログ ──────────────────
    console.log(`[DEBUG] ③ addrCell発見 (${lines.length}行):`)
    lines.forEach((l, i) => console.log(`  lines[${i}]: "${l}"`))
    // ─────────────────────────────────────────────────────────

    // 1行目 = 所在地（都道府県から）
    if (lines[0]) result.address = lines[0]

    // 2行目〜: 建物名 / 取引態様 / 沿線駅 の判定
    // レインズの所在地セルは「建物名なし」物件では 2行目が取引態様になる。
    // そのため取引態様を見つけたら transaction_type に記録し、
    // 次の行を建物名候補として再試行する。
    let lineIdx = 1 // 現在検索中の行インデックス

    // 建物名候補を lineIdx から探す（最大 lineIdx+1 まで）
    for (let attempt = 0; attempt < 2 && lineIdx < lines.length; attempt++, lineIdx++) {
      const candidate = lines[lineIdx]
      if (!candidate || isPhoneLine(candidate) || isDigitsOnlyLine(candidate)) continue

      // 取引態様の場合: transaction_type に記録して次の行へ
      if (isTransactionTypeLine(candidate)) {
        result.transaction_type = candidate
        continue
      }

      // 沿線・駅行に到達したら建物名はない → ループ終了
      if (isStationLine(candidate)) break

      // 建物名として採用
      const name = sanitizePropertyName(candidate)
      if (name) {
        result.property_name = name
        lineIdx++ // 次の行へ
      }
      break
    }

    // 沿線・駅名行を探す
    if (lineIdx < lines.length) {
      for (let i = lineIdx; i < Math.min(lineIdx + 3, lines.length); i++) {
        const stLine = lines[i]
        if (isStationLine(stLine)) {
          result.station = stLine
          const walkMatch = stLine.match(/徒歩\s*(\d+)分/)
          if (walkMatch) result.walk_minutes = parseInt(walkMatch[1])
          lineIdx = i + 1
          break
        }
      }
    }

    // 元付会社（電話番号・駅行でなければ採用）
    for (let i = lineIdx; i < Math.min(lineIdx + 3, lines.length); i++) {
      const line = lines[i]
      if (!line || isPhoneLine(line) || isStationLine(line)) continue
      result.agent_company = line
      break
    }
  }

  // ── 価格（万円） ───────────────────────────────────────────
  const priceMatch = allText.match(/(\d+(?:,\d+)*)万円/)
  if (priceMatch) result.price_man = parseInt(priceMatch[1].replace(/,/g, ''))

  // ── 専有面積 ───────────────────────────────────────────────
  const areaMatch = allText.match(/(\d{2,3}(?:\.\d{1,2})?)\s*㎡/)
  if (areaMatch) result.area_sqm = parseFloat(areaMatch[1])

  // ── 間取り ─────────────────────────────────────────────────
  const planMatch = allText.match(/([1-9][SLDK]{1,4}(?:\+[SLDK]{1,2})?)/i)
  if (planMatch) result.floor_plan = planMatch[1].toUpperCase()

  // ── 所在階（「XX階建」を除外） ──────────────────────────────
  const floorMatch = allText.match(/(?<!\d)(\d{1,2})階(?!建)/)
  if (floorMatch) {
    const n = parseInt(floorMatch[1])
    if (n >= 1 && n <= 80) result.floor_number = n
  }

  // ── 築年月 ─────────────────────────────────────────────────
  const builtRaw = allText.match(
    /(新築|築後未入居|(?:明治|大正|昭和|平成|令和)\d+年(?:\d+月)?|\d{4}年(?:\d+月)?|築\d+年)/
  )?.[0]
  if (builtRaw) {
    const { builtYear, builtMonth } = parseBuiltDate(builtRaw)
    if (builtYear) result.built_year = builtYear
    if (builtMonth) result.built_month = builtMonth
  }

  // ── 管理費 ─────────────────────────────────────────────────
  const mgmtMatch = allText.match(/(\d+(?:,\d+)*)\s*円/)
  if (mgmtMatch) result.management_fee = parseInt(mgmtMatch[1].replace(/,/g, ''))

  // ── 取引態様 ───────────────────────────────────────────────
  const txMatch = allText.match(/売主|専任|一般|代理|オーナーチェンジ/)
  if (txMatch) result.transaction_type = txMatch[0]

  return result
}

// ─────────────────────────────────────────────────────────────
// フラットテキスト抽出（旧形式フォールバック）
//
// body.innerText では同一行のセルがタブ区切りになるため、
// 12桁番号でブロック分割し、ブロック内で都道府県行を探す
// ─────────────────────────────────────────────────────────────

function extractFromFlatText(text: string): ReinsImportedProperty[] {
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
    .map(block => extractFromFlatBlock(block))
    .filter(p => !!(p.price_man || p.area_sqm || p.property_name))
}

// レインズ一覧の所在地セル行を解析（フラットテキスト版）
// body.innerText では「物件番号\t所在地\n建物名\n沿線\n会社\n電話」の形になる場合がある
function extractFromFlatBlock(block: string): ReinsImportedProperty {
  const result: ReinsImportedProperty = { raw_block: block.slice(0, 600) }

  // 物件番号（12桁）
  const numMatch = block.match(/\b(\d{12})\b/)
  if (numMatch) result.reins_number = numMatch[1]

  // 価格
  const priceMatch = block.match(/(\d+(?:,\d+)*)万円/)
  if (priceMatch) result.price_man = parseInt(priceMatch[1].replace(/,/g, ''))

  // 専有面積
  const areaMatch = block.match(/(\d{2,3}(?:\.\d{1,2})?)\s*㎡/)
  if (areaMatch) result.area_sqm = parseFloat(areaMatch[1])

  // 間取り
  const planMatch = block.match(/([1-9][SLDK]{1,4}(?:\+[SLDK]{1,2})?)/i)
  if (planMatch) result.floor_plan = planMatch[1].toUpperCase()

  // 所在階
  const floorMatch = block.match(/(?<!\d)(\d{1,2})階(?!建)/)
  if (floorMatch) {
    const n = parseInt(floorMatch[1])
    if (n >= 1 && n <= 80) result.floor_number = n
  }

  // 所在地ブロック解析
  // body.innerText では「タブ」でセルが区切られるため、まずタブで分割した後、
  // 都道府県を含む部分を起点に多行解析する
  const lines = block.split('\n').flatMap(line => {
    // タブ区切りのセルを独立した行として扱う
    const parts = line.split('\t')
    return parts.map(p => p.trim()).filter(p => p)
  })

  let addrIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (PREF_PATTERN.test(lines[i])) {
      addrIdx = i
      result.address = lines[i]
      break
    }
  }

  if (addrIdx >= 0) {
    // 住所行の直後を順に確認して建物名・沿線・会社を取得
    let nameFound = false
    for (let i = addrIdx + 1; i < lines.length && i <= addrIdx + 6; i++) {
      const line = lines[i]
      if (!line || isDigitsOnlyLine(line)) continue
      if (isPhoneLine(line)) continue
      // 価格・面積・間取りらしい行で終了
      if (/万円|㎡|[1-9][SLDK]/.test(line)) break

      if (!nameFound) {
        const name = sanitizePropertyName(line)
        if (name) {
          result.property_name = name
          nameFound = true
        }
        continue
      }

      // 沿線駅
      if (!result.station && (/線|駅/.test(line))) {
        result.station = line
        const walkMatch = line.match(/徒歩\s*(\d+)分/)
        if (walkMatch) result.walk_minutes = parseInt(walkMatch[1])
        continue
      }

      // 会社名
      if (!result.agent_company && /(株式会社|（株）|\(株\)|有限会社|（有）|\(有\))/.test(line)) {
        result.agent_company = line
        break
      }
    }
  }

  // 築年月
  const builtRaw = block.match(
    /(新築|築後未入居|(?:明治|大正|昭和|平成|令和)\d+年(?:\d+月)?|\d{4}年(?:\d+月)?|築\d+年)/
  )?.[0]
  if (builtRaw) {
    const { builtYear, builtMonth } = parseBuiltDate(builtRaw)
    if (builtYear) result.built_year = builtYear
    if (builtMonth) result.built_month = builtMonth
  }

  // 管理費
  const mgmtMatch = block.match(/(\d+(?:,\d+)*)\s*円/)
  if (mgmtMatch) result.management_fee = parseInt(mgmtMatch[1].replace(/,/g, ''))

  // 取引態様
  const txMatch = block.match(/売主|専任|一般|代理|オーナーチェンジ/)
  if (txMatch) result.transaction_type = txMatch[0]

  // 元付会社フォールバック
  if (!result.agent_company) {
    const coMatch = block.match(/(?:（株）|\(株\))[^\n\t（）]{2,25}/)
      ?? block.match(/[^\n\t]{2,15}(?:株式会社|有限会社)[^\n\t]{0,15}/)
    if (coMatch) result.agent_company = coMatch[0].trim()
  }

  // 駅フォールバック
  if (!result.station) {
    const stMatch = block.match(/([^\s]{2,10}駅)\s*(?:徒歩|歩)\s*(\d+)分/)
    if (stMatch) {
      result.station = stMatch[1]
      result.walk_minutes = parseInt(stMatch[2])
    }
  }

  return result
}

// ─────────────────────────────────────────────────────────────
// メインエントリポイント
// ─────────────────────────────────────────────────────────────

export function extractMultipleFromReinsText(rawText: string): ReinsImportedProperty[] {
  const text = normalizeText(rawText)

  // テーブル形式（Chrome拡張の新形式）を優先
  if (text.includes('__TABLE_FORMAT__')) {
    const results = extractFromTableStructure(text)
    console.log(`[extract] TABLE形式: ${results.length}件 / 物件名あり: ${results.filter(p => p.property_name).length}件`)
    return results
  }

  // フラットテキスト形式（旧形式フォールバック）
  const results = extractFromFlatText(text)
  console.log(`[extract] FLAT形式: ${results.length}件 / 物件名あり: ${results.filter(p => p.property_name).length}件`)
  return results
}

// ─────────────────────────────────────────────────────────────
// 検索キーワード生成
// ─────────────────────────────────────────────────────────────

export function buildSearchKeywords(prop: ExtractedProperty): string[] {
  const keywords: string[] = []

  if (prop.property_name) {
    keywords.push(prop.property_name)
    if (prop.address) {
      const townMatch = prop.address.match(/([^\s　]{2,6}[町丁目][\d\-―—〜０-９]+|[^\s　]{2,8}[町丁])/)
      if (townMatch) keywords.push(`${prop.property_name} ${townMatch[0]}`)
    }
  }

  if (prop.address && prop.area_sqm) {
    const short = prop.address.replace(/^.+?[都道府県]/, '')
    keywords.push(`${short} ${prop.area_sqm}㎡`)
  }

  if (prop.station && prop.price_man) {
    const priceRange = Math.floor(prop.price_man / 1000) * 1000
    keywords.push(`${prop.station} ${priceRange}万〜${priceRange + 1000}万`)
  }

  if (prop.built_year) {
    const label = prop.built_month
      ? `${prop.built_year}年${prop.built_month}月`
      : `${prop.built_year}年`
    keywords.push(label)
  }

  if (prop.area_sqm) keywords.push(`${prop.area_sqm}㎡`)

  return [...new Set(keywords)].filter(Boolean)
}
