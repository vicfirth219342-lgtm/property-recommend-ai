// レインズ自動照合スコアラー v1
// ポータル物件（properties）× レインズ物件（reins_imported_properties）のペアを採点する。
// 設計書: 加点=同一物件の証拠 / ガード=別物件の証拠 を分離し、
// ガードが1つでも発動したペアは自動一致させない。

export const SCORING_VERSION = 1

export const THRESHOLDS = {
  AUTO_MATCH: 80,    // これ以上かつガード0件 → 自動一致
  NEEDS_REVIEW: 45,  // これ以上かつガード0件 → 要確認
  MIN_GAP: 5,        // 1位と2位の差がこれ以下なら AUTO_MATCH を降格
} as const

export type Verdict = 'AUTO_MATCH' | 'NEEDS_REVIEW' | 'NO_MATCH' | 'BLOCKED'

export interface PortalProperty {
  id: string
  name: string | null
  address: string | null
  current_price: number | null   // 万円
  area_sqm: number | null
  built_year: number | null
  floor_number: number | null
  room_number: string | null
  nearest_station: string | null
}

export interface ReinsProperty {
  id: string
  reins_number: string | null
  property_name: string | null
  address: string | null
  price_man: number | null
  area_sqm: number | null
  built_year: number | null
  floor_number: number | null
  station: string | null
}

interface ItemScore {
  match: string
  points: number
  portal?: string | number | null
  reins?: string | number | null
}

export interface ScoreDetail {
  version: number
  total: number
  verdict: Verdict
  guards: string[]
  items: Record<string, ItemScore>
  gap?: { best_score: number; second_score: number; score_gap: number; downgraded: boolean }
}

export interface PairResult {
  score: number
  verdict: Verdict
  guards: string[]
  detail: ScoreDetail
}

// ── 住所正規化・分解 ─────────────────────────────────────────
const KANJI_NUM: Record<string, number> = { 一:1, 二:2, 三:3, 四:4, 五:5, 六:6, 七:7, 八:8, 九:9 }

function zenToHan(s: string): string {
  return s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
}

interface AddressParts {
  pref: string | null
  city: string | null    // 市＋区（政令市）または区・市町村
  town: string | null    // 町名（数字の手前まで）
  chome: number | null   // 丁目
  rest: string           // 番地以下
}

export function parseAddress(addr: string | null): AddressParts | null {
  if (!addr) return null
  let s = zenToHan(addr.trim()).replace(/[\s　]+/g, '')
  // 漢数字丁目 → 算用数字
  s = s.replace(/([一二三四五六七八九]|十[一二三四五六七八九]?|[一二三四五六七八九]十[一二三四五六七八九]?)丁目/g, (_, k: string) => {
    let n = 0
    if (k.includes('十')) {
      const [a, b] = k.split('十')
      n = (a ? KANJI_NUM[a] : 1) * 10 + (b ? KANJI_NUM[b] : 0)
    } else n = KANJI_NUM[k]
    return `${n}丁目`
  })

  const prefM = s.match(/^(東京都|北海道|大阪府|京都府|.{2,3}県)/)
  const pref = prefM?.[1] ?? null
  if (prefM) s = s.slice(prefM[1].length)

  // 政令市（川崎市中原区）→ 市＋区 / 23区（渋谷区）→ 区 / その他 → 市町村
  let city: string | null = null
  const cityWardM = s.match(/^(.+?市.+?区)/)
  if (cityWardM) { city = cityWardM[1]; s = s.slice(city.length) }
  else {
    const m = s.match(/^(.+?[区市])/)
    if (m) { city = m[1]; s = s.slice(city.length) }
  }

  // 町名 = 数字の手前まで（「上丸子八幡町」のように町を含む名称も丸ごと拾う）
  const townM = s.match(/^([^0-9]+)/)
  const town = townM?.[1]?.replace(/[−ー―‐]/g, '') ?? null
  if (townM) s = s.slice(townM[1].length)

  // 丁目 = 町名直後の数字（「2丁目」「2-」「2」いずれも）
  const chomeM = s.match(/^(\d+)(?:丁目|-)?/)
  const chome = chomeM ? parseInt(chomeM[1]) : null
  if (chomeM) s = s.slice(chomeM[0].length)

  return { pref, city, town, chome, rest: s.replace(/[−ー―‐]/g, '-') }
}

type AddrLevel = 'exact' | 'chome' | 'town' | 'city' | 'chome_mismatch' | 'town_mismatch' | 'city_mismatch' | 'unknown'

function compareAddress(a: string | null, b: string | null): AddrLevel {
  const pa = parseAddress(a)
  const pb = parseAddress(b)
  if (!pa || !pb || (!pa.city && !pa.town) || (!pb.city && !pb.town)) return 'unknown'

  if (pa.city && pb.city && pa.city !== pb.city) return 'city_mismatch'
  if (pa.town && pb.town && pa.town !== pb.town) return 'town_mismatch'
  // 町名一致（または片側欠損で市区一致のみ）
  if (!pa.town || !pb.town) return 'city'
  if (pa.chome !== null && pb.chome !== null) {
    if (pa.chome !== pb.chome) return 'chome_mismatch'   // 宮内2丁目 ≠ 宮内3丁目 → BLOCK
    if (pa.rest && pb.rest && pa.rest === pb.rest) return 'exact'
    return 'chome'
  }
  return 'town'  // 丁目が片側不明 → 町名レベル一致
}

// ── ペア採点 ─────────────────────────────────────────────────
export function scorePair(portal: PortalProperty, reins: ReinsProperty): PairResult {
  const items: Record<string, ItemScore> = {}
  const guards: string[] = []
  let score = 0

  // ① 住所 (max 30) — 町名不一致・丁目不一致は即ガード
  const level = compareAddress(portal.address, reins.address)
  const addrPoints: Record<AddrLevel, number> = {
    exact: 30, chome: 25, town: 20, city: 8,
    chome_mismatch: 0, town_mismatch: 0, city_mismatch: 0, unknown: 0,
  }
  items.address = { match: level, points: addrPoints[level], portal: portal.address, reins: reins.address }
  score += addrPoints[level]
  if (level === 'chome_mismatch' || level === 'town_mismatch' || level === 'city_mismatch') {
    guards.push(`address_${level}`)
  }

  // ② 専有面積 (max 25)
  if (portal.area_sqm != null && reins.area_sqm != null) {
    const diff = Math.abs(portal.area_sqm - reins.area_sqm)
    const it: ItemScore = diff < 0.005 ? { match: 'exact', points: 25 }
      : diff <= 0.5 ? { match: 'near', points: 15 }
      : diff <= 2   ? { match: 'close', points: 5 }
      : { match: 'mismatch', points: 0 }
    items.area_sqm = { ...it, portal: portal.area_sqm, reins: reins.area_sqm }
    score += it.points
    if (it.match === 'mismatch') guards.push('area_mismatch')
  } else items.area_sqm = { match: 'unknown', points: 0, portal: portal.area_sqm, reins: reins.area_sqm }

  // ③ 築年 (max 15)
  if (portal.built_year != null && reins.built_year != null) {
    const d = Math.abs(portal.built_year - reins.built_year)
    const it: ItemScore = d === 0 ? { match: 'exact', points: 15 }
      : d === 1 ? { match: 'off_by_1', points: 8 }
      : { match: 'mismatch', points: 0 }
    items.built_year = { ...it, portal: portal.built_year, reins: reins.built_year }
    score += it.points
    if (it.match === 'mismatch') guards.push('built_year_mismatch')
  } else items.built_year = { match: 'unknown', points: 0, portal: portal.built_year, reins: reins.built_year }

  // ④ 価格 (max 15) — 改定ラグを許容、ガードなし
  if (portal.current_price != null && reins.price_man != null) {
    const ratio = Math.abs(portal.current_price - reins.price_man) / Math.max(portal.current_price, reins.price_man)
    const it: ItemScore = ratio === 0 ? { match: 'exact', points: 15 }
      : ratio <= 0.03 ? { match: 'within_3pct', points: 12 }
      : ratio <= 0.10 ? { match: 'within_10pct', points: 6 }
      : { match: 'mismatch', points: 0 }
    items.price = { ...it, portal: portal.current_price, reins: reins.price_man }
    score += it.points
  } else items.price = { match: 'unknown', points: 0, portal: portal.current_price, reins: reins.price_man }

  // ⑤ 所在階 (max 10)
  if (portal.floor_number != null && reins.floor_number != null) {
    const eq = portal.floor_number === reins.floor_number
    items.floor_number = { match: eq ? 'exact' : 'mismatch', points: eq ? 10 : 0, portal: portal.floor_number, reins: reins.floor_number }
    score += eq ? 10 : 0
    if (!eq) guards.push('floor_mismatch')
  } else items.floor_number = { match: 'unknown', points: 0, portal: portal.floor_number, reins: reins.floor_number }

  // ⑥ 駅 (+5 ボーナス)
  if (portal.nearest_station && reins.station) {
    const hit = reins.station.includes(portal.nearest_station)
    items.station = { match: hit ? 'exact' : 'none', points: hit ? 5 : 0, portal: portal.nearest_station, reins: reins.station }
    score += hit ? 5 : 0
  } else items.station = { match: 'unknown', points: 0 }

  // ⑦ 物件名 (+5 ボーナス) — 会社名・訴求文の混入が多いため加点のみ
  if (portal.name && reins.property_name) {
    const clean = (s: string) => zenToHan(s).replace(/[（(].*?[)）]/g, '').replace(/[\s　・･]/g, '').toLowerCase()
    const pn = clean(portal.name)
    const rn = clean(reins.property_name)
    const hit = rn.length >= 4 && (pn.includes(rn) || rn.includes(pn))
    items.property_name = { match: hit ? 'partial' : 'none', points: hit ? 5 : 0 }
    score += hit ? 5 : 0
  } else items.property_name = { match: 'unknown', points: 0 }

  // ⑧ 部屋番号 (+5 ボーナス / 不一致はガード)
  items.room_number = { match: 'unknown', points: 0 }

  const verdict: Verdict =
    guards.length > 0 ? 'BLOCKED'
    : score >= THRESHOLDS.AUTO_MATCH ? 'AUTO_MATCH'
    : score >= THRESHOLDS.NEEDS_REVIEW ? 'NEEDS_REVIEW'
    : 'NO_MATCH'

  const detail: ScoreDetail = { version: SCORING_VERSION, total: score, verdict, guards, items }
  return { score, verdict, guards, detail }
}

// ── 1物件 × レインズ全件の照合 ───────────────────────────────
export interface MatchOutcome {
  finalVerdict: Verdict | 'NOT_FOUND'
  candidates: Array<{ reins: ReinsProperty; result: PairResult; rank: number }>
  gap: { best_score: number; second_score: number; score_gap: number; downgraded: boolean } | null
}

export function matchAgainstReins(portal: PortalProperty, reinsAll: ReinsProperty[]): MatchOutcome {
  const scored = reinsAll
    .map(r => ({ reins: r, result: scorePair(portal, r) }))
    .filter(x => x.result.score >= 30)   // 明白な無関係ペアはノイズなので保存しない
    .sort((a, b) => b.result.score - a.result.score)

  // レインズ側の重複行を排除（同一 reins_number / 同一内容の再インポート）
  const seen = new Set<string>()
  const deduped: typeof scored = []
  for (const x of scored) {
    const key = x.reins.reins_number
      ?? `${x.reins.address}|${x.reins.area_sqm}|${x.reins.price_man}|${x.reins.floor_number}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(x)
  }

  const top = deduped.slice(0, 3).map((x, i) => ({ ...x, rank: i + 1 }))
  if (top.length === 0) return { finalVerdict: 'NOT_FOUND', candidates: [], gap: null }

  const best = top[0]
  const second = top[1] ?? null
  const bestScore = best.result.score
  const secondScore = second?.result.score ?? 0
  const scoreGap = bestScore - secondScore

  let finalVerdict: Verdict = best.result.verdict
  let downgraded = false
  // 首位僅差チェック: AUTO_MATCH でも2位との差が MIN_GAP 以下なら降格
  if (finalVerdict === 'AUTO_MATCH' && second && scoreGap <= THRESHOLDS.MIN_GAP) {
    finalVerdict = 'NEEDS_REVIEW'
    downgraded = true
  }

  const gap = { best_score: bestScore, second_score: secondScore, score_gap: scoreGap, downgraded }
  best.result.detail.gap = gap
  best.result.detail.verdict = finalVerdict

  return { finalVerdict, candidates: top, gap }
}
