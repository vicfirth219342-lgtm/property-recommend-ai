import { ExtractedProperty, extractFromText } from './extractProperty'

export interface ScoreDetail {
  item: string
  earned: number
  max: number
  matched: boolean
  reason?: string
}

export interface MatchResult {
  score: number
  status: 'confirmed' | 'review' | 'not_found'
  matched_items: string[]
  unmatched_items: string[]
  score_detail: ScoreDetail[]
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
  const detail: ScoreDetail[] = []

  // ── 物件名 30pt ──────────────────────────────────────────
  if (original.property_name && candidate.property_name) {
    const sim = similarity(original.property_name, candidate.property_name)
    if (sim >= 0.8) {
      score += 30; matched.push('物件名')
      detail.push({ item: '物件名', earned: 30, max: 30, matched: true })
    } else if (sim >= 0.5) {
      score += 15; matched.push('物件名（部分一致）')
      detail.push({ item: '物件名', earned: 15, max: 30, matched: true, reason: `類似度 ${Math.round(sim * 100)}%` })
    } else {
      unmatched.push('物件名')
      detail.push({ item: '物件名', earned: 0, max: 30, matched: false, reason: `類似度 ${Math.round(sim * 100)}%` })
    }
  } else {
    detail.push({ item: '物件名', earned: 0, max: 30, matched: false, reason: 'データなし' })
  }

  // ── 所在地 25pt ──────────────────────────────────────────
  if (original.address && candidate.address) {
    const sim = similarity(original.address, candidate.address)
    if (sim >= 0.8) {
      score += 25; matched.push('所在地')
      detail.push({ item: '所在地', earned: 25, max: 25, matched: true })
    } else {
      const town = extractTown(original.address)
      if (town && candidate.address.includes(town)) {
        score += 12; matched.push('所在地（町名一致）')
        detail.push({ item: '所在地', earned: 12, max: 25, matched: true, reason: `町名「${town}」一致` })
      } else {
        unmatched.push('所在地')
        detail.push({ item: '所在地', earned: 0, max: 25, matched: false, reason: `類似度 ${Math.round(sim * 100)}%` })
      }
    }
  } else {
    detail.push({ item: '所在地', earned: 0, max: 25, matched: false, reason: 'データなし' })
  }

  // ── 価格 15pt（±50万円以内） ──────────────────────────
  if (original.price_man && candidate.price_man) {
    const diff = Math.abs(original.price_man - candidate.price_man)
    if (diff <= 50) {
      score += 15; matched.push('価格')
      detail.push({ item: '価格', earned: 15, max: 15, matched: true, reason: `差額 ${diff}万円` })
    } else if (diff <= 150) {
      score += 7; matched.push('価格（近似）')
      detail.push({ item: '価格', earned: 7, max: 15, matched: true, reason: `差額 ${diff}万円` })
    } else {
      unmatched.push('価格')
      detail.push({ item: '価格', earned: 0, max: 15, matched: false,
        reason: `差額 ${diff}万円（${original.price_man.toLocaleString()}万 vs ${candidate.price_man.toLocaleString()}万）` })
    }
  } else {
    detail.push({ item: '価格', earned: 0, max: 15, matched: false, reason: 'データなし' })
  }

  // ── 専有面積 15pt（±2㎡以内） ────────────────────────
  if (original.area_sqm && candidate.area_sqm) {
    const diff = Math.abs(Number(original.area_sqm) - Number(candidate.area_sqm))
    if (diff <= 2) {
      score += 15; matched.push('専有面積')
      detail.push({ item: '専有面積', earned: 15, max: 15, matched: true, reason: `差 ${diff.toFixed(1)}㎡` })
    } else if (diff <= 5) {
      score += 7; matched.push('専有面積（近似）')
      detail.push({ item: '専有面積', earned: 7, max: 15, matched: true, reason: `差 ${diff.toFixed(1)}㎡` })
    } else {
      unmatched.push('専有面積')
      detail.push({ item: '専有面積', earned: 0, max: 15, matched: false,
        reason: `差 ${diff.toFixed(1)}㎡（${original.area_sqm}㎡ vs ${candidate.area_sqm}㎡）` })
    }
  } else {
    detail.push({ item: '専有面積', earned: 0, max: 15, matched: false, reason: 'データなし' })
  }

  // ── 間取り 10pt ──────────────────────────────────────────
  if (original.floor_plan && candidate.floor_plan) {
    if (original.floor_plan === candidate.floor_plan) {
      score += 10; matched.push('間取り')
      detail.push({ item: '間取り', earned: 10, max: 10, matched: true })
    } else {
      unmatched.push('間取り')
      detail.push({ item: '間取り', earned: 0, max: 10, matched: false,
        reason: `${original.floor_plan} vs ${candidate.floor_plan}` })
    }
  } else {
    detail.push({ item: '間取り', earned: 0, max: 10, matched: false, reason: 'データなし' })
  }

  // ── 階数 5pt ─────────────────────────────────────────────
  if (original.floor_number && candidate.floor_number) {
    if (original.floor_number === candidate.floor_number) {
      score += 5; matched.push('階数')
      detail.push({ item: '階数', earned: 5, max: 5, matched: true })
    } else {
      unmatched.push('階数')
      detail.push({ item: '階数', earned: 0, max: 5, matched: false,
        reason: `${original.floor_number}階 vs ${candidate.floor_number}階` })
    }
  } else {
    detail.push({ item: '階数', earned: 0, max: 5, matched: false, reason: 'データなし' })
  }

  // ── 判定 ─────────────────────────────────────────────────
  const status: MatchResult['status'] =
    score >= 70 ? 'confirmed' : score >= 40 ? 'review' : 'not_found'

  return { score, status, matched_items: matched, unmatched_items: unmatched, score_detail: detail }
}

// レインズ結果テキストから複数の物件候補を抽出して照合
export function matchFromReinsText(
  original: ExtractedProperty,
  reinsText: string
): MatchResult {
  const blocks = reinsText
    .split(/\n{2,}|(?=物件番号|№|\n─+\n)/)
    .filter(b => b.trim().length > 10)

  if (blocks.length === 0) {
    return {
      score: 0, status: 'not_found',
      matched_items: [], unmatched_items: ['レインズデータなし'],
      score_detail: [],
    }
  }

  let best: MatchResult = {
    score: 0, status: 'not_found',
    matched_items: [], unmatched_items: [],
    score_detail: [],
  }
  for (const block of blocks) {
    const candidate = extractFromText(block)
    const result = matchProperties(original, candidate)
    if (result.score > best.score) best = result
  }

  if (best.score === 0) {
    const candidate = extractFromText(reinsText)
    best = matchProperties(original, candidate)
  }

  return best
}
