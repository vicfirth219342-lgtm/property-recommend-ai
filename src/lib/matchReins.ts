import { ExtractedProperty, extractFromText } from './extractProperty'

export interface MatchResult {
  score: number
  status: 'confirmed' | 'review' | 'not_found'
  matched_items: string[]
  unmatched_items: string[]
}

// 文字列類似度（簡易版：共通文字の割合）
function similarity(a: string, b: string): number {
  if (!a || !b) return 0
  const na = a.replace(/\s/g, '').toLowerCase()
  const nb = b.replace(/\s/g, '').toLowerCase()
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.85
  let common = 0
  for (const ch of na) if (nb.includes(ch)) common++
  return (common * 2) / (na.length + nb.length)
}

// 住所から町丁名を抽出
function extractTown(addr: string): string {
  return addr.match(/([^\s　]{2,6}[町丁目][\d\-―—〜]+|[^\s　]{2,8}[町丁])/)?.[0] ?? ''
}

// 元物件 vs レインズ候補 の一致スコアを計算
export function matchProperties(
  original: ExtractedProperty,
  candidate: ExtractedProperty
): MatchResult {
  let score = 0
  const matched: string[] = []
  const unmatched: string[] = []

  // 物件名 30pt
  if (original.property_name && candidate.property_name) {
    const sim = similarity(original.property_name, candidate.property_name)
    if (sim >= 0.8)      { score += 30; matched.push('物件名') }
    else if (sim >= 0.5) { score += 15; matched.push('物件名（部分一致）') }
    else                 { unmatched.push('物件名') }
  }

  // 所在地 20pt
  if (original.address && candidate.address) {
    const sim = similarity(original.address, candidate.address)
    if (sim >= 0.8)      { score += 20; matched.push('所在地') }
    else {
      const town = extractTown(original.address)
      if (town && candidate.address.includes(town)) { score += 10; matched.push('所在地（町名一致）') }
      else unmatched.push('所在地')
    }
  }

  // 価格 15pt（±5%）
  if (original.price_man && candidate.price_man) {
    const diff = Math.abs(original.price_man - candidate.price_man) / original.price_man
    if (diff <= 0.05)      { score += 15; matched.push('価格') }
    else if (diff <= 0.10) { score += 7;  matched.push('価格（近似）') }
    else                   { unmatched.push('価格') }
  }

  // 専有面積 15pt（±2㎡）
  if (original.area_sqm && candidate.area_sqm) {
    const diff = Math.abs(Number(original.area_sqm) - Number(candidate.area_sqm))
    if (diff <= 2)      { score += 15; matched.push('専有面積') }
    else if (diff <= 5) { score += 7;  matched.push('専有面積（近似）') }
    else                { unmatched.push('専有面積') }
  }

  // 築年 10pt
  if (original.built_year && candidate.built_year) {
    if (original.built_year === candidate.built_year) { score += 10; matched.push('築年') }
    else unmatched.push('築年')
  }

  // 間取り 5pt
  if (original.floor_plan && candidate.floor_plan) {
    if (original.floor_plan === candidate.floor_plan) { score += 5; matched.push('間取り') }
    else unmatched.push('間取り')
  }

  // 駅徒歩 5pt（±2分）
  if (original.walk_minutes && candidate.walk_minutes) {
    if (Math.abs(original.walk_minutes - candidate.walk_minutes) <= 2) { score += 5; matched.push('駅徒歩') }
    else unmatched.push('駅徒歩')
  }

  const status: MatchResult['status'] =
    score >= 90 ? 'confirmed' : score >= 60 ? 'review' : 'not_found'

  return { score, status, matched_items: matched, unmatched_items: unmatched }
}

// レインズ結果テキストから複数の物件候補を抽出して照合
export function matchFromReinsText(
  original: ExtractedProperty,
  reinsText: string
): MatchResult {
  // レインズ結果テキストを物件ブロックに分割（空行区切り or 「物件」区切り）
  const blocks = reinsText
    .split(/\n{2,}|(?=物件番号|№|\n─+\n)/)
    .filter(b => b.trim().length > 10)

  if (blocks.length === 0) {
    return { score: 0, status: 'not_found', matched_items: [], unmatched_items: ['レインズデータなし'] }
  }

  // 各ブロックを照合して最高スコアを返す
  let best: MatchResult = { score: 0, status: 'not_found', matched_items: [], unmatched_items: [] }
  for (const block of blocks) {
    const candidate = extractFromText(block)
    const result = matchProperties(original, candidate)
    if (result.score > best.score) best = result
  }

  // ブロック分割失敗時はテキスト全体を1件として扱う
  if (best.score === 0) {
    const candidate = extractFromText(reinsText)
    best = matchProperties(original, candidate)
  }

  return best
}
