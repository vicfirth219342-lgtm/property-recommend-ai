import { ExtractedProperty, ReinsImportedProperty, extractFromText } from './extractProperty'

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

  // ── 価格 15pt（±3%以内） ─────────────────────────────
  if (original.price_man && candidate.price_man) {
    const diff = Math.abs(original.price_man - candidate.price_man)
    const pct = diff / original.price_man
    if (pct <= 0.03) {
      score += 15; matched.push('価格')
      detail.push({ item: '価格', earned: 15, max: 15, matched: true, reason: `差額 ${diff}万円（${(pct*100).toFixed(1)}%）` })
    } else if (pct <= 0.10) {
      score += 7; matched.push('価格（近似）')
      detail.push({ item: '価格', earned: 7, max: 15, matched: true, reason: `差額 ${diff}万円（${(pct*100).toFixed(1)}%）` })
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

  // ── 判定（旧: 70/40 → 新: 80/50） ──────────────────────
  const status: MatchResult['status'] =
    score >= 80 ? 'confirmed' : score >= 50 ? 'review' : 'not_found'

  return { score, status, matched_items: matched, unmatched_items: unmatched, score_detail: detail }
}

// ─────────────────────────────────────────────────────────────
// 一括取り込み方式：ReinsImportedProperty を直接受け取って照合
// ─────────────────────────────────────────────────────────────

// 住所正規化（表記揺れを吸収）
function normalizeAddress(addr: string): string {
  return addr
    .replace(/東京都|神奈川県|大阪府|愛知県|千葉県|埼玉県|兵庫県/, '')
    .replace(/番地?/g, '-').replace(/丁目/g, '-')
    .replace(/[-ー−]{2,}/g, '-')
    .replace(/\s/g, '')
    .trim()
}

export interface BatchMatchResult {
  portal_id: string
  best_reins: ReinsImportedProperty | null
  result: MatchResult
}

// ポータル物件 vs レインズ取り込み物件 を1対1で照合
export function matchPortalWithReins(
  portal: ExtractedProperty,
  reins: ReinsImportedProperty
): MatchResult {
  let score = 0
  const matched: string[] = []
  const unmatched: string[] = []
  const detail: ScoreDetail[] = []

  // ── 物件名 30pt ──────────────────────────────────────
  if (portal.property_name && reins.property_name) {
    const sim = similarity(portal.property_name, reins.property_name)
    if (sim >= 0.8) {
      score += 30; matched.push('物件名')
      detail.push({ item: '物件名', earned: 30, max: 30, matched: true })
    } else if (sim >= 0.5) {
      score += 15; matched.push('物件名（部分一致）')
      detail.push({ item: '物件名', earned: 15, max: 30, matched: true, reason: `類似度 ${Math.round(sim*100)}%` })
    } else {
      unmatched.push('物件名')
      detail.push({ item: '物件名', earned: 0, max: 30, matched: false, reason: `類似度 ${Math.round(sim*100)}%` })
    }
  } else {
    detail.push({ item: '物件名', earned: 0, max: 30, matched: false, reason: 'データなし' })
  }

  // ── 所在地 25pt（正規化して比較）────────────────────
  if (portal.address && reins.address) {
    const na = normalizeAddress(portal.address)
    const nb = normalizeAddress(reins.address)
    const sim = similarity(na, nb)
    if (sim >= 0.8) {
      score += 25; matched.push('所在地')
      detail.push({ item: '所在地', earned: 25, max: 25, matched: true })
    } else {
      const town = extractTown(portal.address)
      if (town && reins.address.includes(town)) {
        score += 12; matched.push('所在地（町名一致）')
        detail.push({ item: '所在地', earned: 12, max: 25, matched: true, reason: `町名「${town}」一致` })
      } else {
        unmatched.push('所在地')
        detail.push({ item: '所在地', earned: 0, max: 25, matched: false, reason: `類似度 ${Math.round(sim*100)}%` })
      }
    }
  } else {
    detail.push({ item: '所在地', earned: 0, max: 25, matched: false, reason: 'データなし' })
  }

  // ── 価格 15pt（±3%以内） ────────────────────────────
  if (portal.price_man && reins.price_man) {
    const diff = Math.abs(portal.price_man - reins.price_man)
    const pct = diff / portal.price_man
    if (pct <= 0.03) {
      score += 15; matched.push('価格')
      detail.push({ item: '価格', earned: 15, max: 15, matched: true, reason: `差額 ${diff}万円（${(pct*100).toFixed(1)}%）` })
    } else if (pct <= 0.10) {
      score += 7; matched.push('価格（近似）')
      detail.push({ item: '価格', earned: 7, max: 15, matched: true, reason: `差額 ${diff}万円（${(pct*100).toFixed(1)}%）` })
    } else {
      unmatched.push('価格')
      detail.push({ item: '価格', earned: 0, max: 15, matched: false,
        reason: `差額 ${diff}万円（${portal.price_man.toLocaleString()}万 vs ${reins.price_man.toLocaleString()}万）` })
    }
  } else {
    detail.push({ item: '価格', earned: 0, max: 15, matched: false, reason: 'データなし' })
  }

  // ── 専有面積 15pt（±2㎡） ───────────────────────────
  if (portal.area_sqm && reins.area_sqm) {
    const diff = Math.abs(Number(portal.area_sqm) - Number(reins.area_sqm))
    if (diff <= 2) {
      score += 15; matched.push('専有面積')
      detail.push({ item: '専有面積', earned: 15, max: 15, matched: true, reason: `差 ${diff.toFixed(1)}㎡` })
    } else if (diff <= 5) {
      score += 7; matched.push('専有面積（近似）')
      detail.push({ item: '専有面積', earned: 7, max: 15, matched: true, reason: `差 ${diff.toFixed(1)}㎡` })
    } else {
      unmatched.push('専有面積')
      detail.push({ item: '専有面積', earned: 0, max: 15, matched: false,
        reason: `差 ${diff.toFixed(1)}㎡（${portal.area_sqm}㎡ vs ${reins.area_sqm}㎡）` })
    }
  } else {
    detail.push({ item: '専有面積', earned: 0, max: 15, matched: false, reason: 'データなし' })
  }

  // ── 間取り 10pt ──────────────────────────────────────
  if (portal.floor_plan && reins.floor_plan) {
    if (portal.floor_plan === reins.floor_plan) {
      score += 10; matched.push('間取り')
      detail.push({ item: '間取り', earned: 10, max: 10, matched: true })
    } else {
      unmatched.push('間取り')
      detail.push({ item: '間取り', earned: 0, max: 10, matched: false,
        reason: `${portal.floor_plan} vs ${reins.floor_plan}` })
    }
  } else {
    detail.push({ item: '間取り', earned: 0, max: 10, matched: false, reason: 'データなし' })
  }

  // ── 階数 5pt ─────────────────────────────────────────
  if (portal.floor_number && reins.floor_number) {
    if (portal.floor_number === reins.floor_number) {
      score += 5; matched.push('階数')
      detail.push({ item: '階数', earned: 5, max: 5, matched: true })
    } else {
      unmatched.push('階数')
      detail.push({ item: '階数', earned: 0, max: 5, matched: false,
        reason: `${portal.floor_number}階 vs ${reins.floor_number}階` })
    }
  } else {
    detail.push({ item: '階数', earned: 0, max: 5, matched: false, reason: 'データなし' })
  }

  const status: MatchResult['status'] =
    score >= 80 ? 'confirmed' : score >= 50 ? 'review' : 'not_found'

  return { score, status, matched_items: matched, unmatched_items: unmatched, score_detail: detail }
}

// ポータル物件1件 vs レインズ取り込み物件N件 → 最高スコアのものを返す
export function findBestReinsMatch(
  portal: ExtractedProperty,
  reinsList: ReinsImportedProperty[]
): { bestReins: ReinsImportedProperty | null; result: MatchResult } {
  if (reinsList.length === 0) {
    return {
      bestReins: null,
      result: { score: 0, status: 'not_found', matched_items: [], unmatched_items: ['レインズ物件なし'], score_detail: [] },
    }
  }

  let bestScore = -1
  let bestReins: ReinsImportedProperty | null = null
  let bestResult: MatchResult = { score: 0, status: 'not_found', matched_items: [], unmatched_items: [], score_detail: [] }

  for (const reins of reinsList) {
    const r = matchPortalWithReins(portal, reins)
    if (r.score > bestScore) {
      bestScore = r.score
      bestReins = reins
      bestResult = r
    }
  }
  return { bestReins, result: bestResult }
}

// ─────────────────────────────────────────────────────────────
// 手動貼り付け方式（後方互換）
// ─────────────────────────────────────────────────────────────

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
