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

// ─────────────────────────────────────────────────────────────
// 正規化ユーティリティ
// ─────────────────────────────────────────────────────────────

function normalizePropertyName(name: string): string {
  return name
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 0x30))
    .replace(/[Ａ-Ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF21 + 0x41))
    .replace(/[ａ-ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF41 + 0x61))
    .replace(/Ⅰ/g, 'I').replace(/Ⅱ/g, 'II').replace(/Ⅲ/g, 'III')
    .replace(/Ⅳ/g, 'IV').replace(/Ⅴ/g, 'V').replace(/Ⅵ/g, 'VI')
    .replace(/^(ザ|ｻﾞ)[・･\s]*/i, 'THE ')
    .replace(/[・･]/g, '')
    .replace(/[－ー−—―]/g, '-')
    .replace(/ヶ|ヵ/g, 'ケ')
    .replace(/[\s　]+/g, '')
    .toLowerCase()
}

function normalizeAddress(addr: string): string {
  return addr
    .replace(/^(東京都|北海道|(?:大阪|京都|[^\s]{2})府|[^\s]{2,4}県)/, '')
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 0x30))
    .replace(/丁目/g, '-').replace(/番地?/g, '-').replace(/号/g, '')
    .replace(/[-－−]{2,}/g, '-')
    .replace(/[\s　]+/g, '')
    .trim()
}

function isVagueAddress(addr: string): boolean {
  const withoutPref = addr.replace(/^(東京都|北海道|(?:大阪|京都|[^\s]{2})府|[^\s]{2,4}県)/, '').trim()
  return withoutPref.length < 3
}

function extractTown(addr: string): string {
  return addr.match(/([^\s　]{2,6}[町丁目][\d\-―—〜０-９]+|[^\s　]{2,8}[町丁])/)?.[0] ?? ''
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  if (a.includes(b) || b.includes(a)) return 0.9
  let common = 0
  for (const ch of a) if (b.includes(ch)) common++
  return (common * 2) / (a.length + b.length)
}

// ─────────────────────────────────────────────────────────────
// スコアリングエンジン
//
// 配点: 物件名40 / 所在地25 / 専有面積15 / 間取り10 / 階数5 / 価格5 = 100pt
// 閾値: 85以上→confirmed / 60以上→review / 59以下→not_found
// ─────────────────────────────────────────────────────────────

interface PropertyForScoring {
  property_name?: string | null
  address?: string | null
  price_man?: number | null
  area_sqm?: number | null
  floor_plan?: string | null
  floor_number?: number | null
  built_year?: number | null
  built_month?: number | null
  reins_number?: string | null
}

function scoreProperties(portal: PropertyForScoring, reins: PropertyForScoring): MatchResult {
  // ── レインズ物件番号が一致 → 100点確定 ──────────────────
  if (portal.reins_number && reins.reins_number && portal.reins_number === reins.reins_number) {
    return {
      score: 100,
      status: 'confirmed',
      matched_items: ['レインズ物件番号（確定）'],
      unmatched_items: [],
      score_detail: [{
        item: 'レインズ物件番号',
        earned: 100, max: 100, matched: true,
        reason: `物件番号 ${portal.reins_number} で一致`
      }],
    }
  }

  let score = 0
  const matched: string[] = []
  const unmatched: string[] = []
  const detail: ScoreDetail[] = []

  // ── 物件名 40pt（最重要項目） ──────────────────────────
  const pName = portal.property_name ? normalizePropertyName(portal.property_name) : null
  const rName = reins.property_name  ? normalizePropertyName(reins.property_name)  : null
  if (pName && rName) {
    const sim = similarity(pName, rName)
    if (sim >= 0.8) {
      score += 40; matched.push('物件名')
      detail.push({ item: '物件名', earned: 40, max: 40, matched: true, reason: `類似度 ${Math.round(sim*100)}%` })
    } else if (sim >= 0.5) {
      score += 20; matched.push('物件名（部分一致）')
      detail.push({ item: '物件名', earned: 20, max: 40, matched: true, reason: `部分一致 ${Math.round(sim*100)}%` })
    } else {
      unmatched.push('物件名')
      detail.push({ item: '物件名', earned: 0, max: 40, matched: false, reason: `不一致（類似度 ${Math.round(sim*100)}%）` })
    }
  } else {
    detail.push({ item: '物件名', earned: 0, max: 40, matched: false,
      reason: `未取得（ポータル:${pName ? '取得済' : '未取得'} / レインズ:${rName ? '取得済' : '未取得'}）` })
  }

  // ── 所在地 25pt ──────────────────────────────────────────
  const pAddr = portal.address ?? null
  const rAddr = reins.address ?? null
  if (pAddr && rAddr) {
    if (isVagueAddress(pAddr)) {
      detail.push({ item: '所在地', earned: 0, max: 25, matched: false,
        reason: `ポータル側が「${pAddr}」のみで詳細不明のため0点` })
      unmatched.push('所在地')
    } else {
      const na = normalizeAddress(pAddr)
      const nb = normalizeAddress(rAddr)
      const sim = similarity(na, nb)
      if (sim >= 0.75) {
        score += 25; matched.push('所在地')
        detail.push({ item: '所在地', earned: 25, max: 25, matched: true, reason: `類似度 ${Math.round(sim*100)}%` })
      } else {
        const town = extractTown(pAddr)
        if (town && rAddr.includes(town)) {
          score += 15; matched.push('所在地（町名一致）')
          detail.push({ item: '所在地', earned: 15, max: 25, matched: true, reason: `町名「${town}」一致` })
        } else {
          const ward = pAddr.match(/[^\s]{2,6}[市区町村]/)?.[0]
          if (ward && rAddr.includes(ward)) {
            score += 8; matched.push('所在地（市区一致）')
            detail.push({ item: '所在地', earned: 8, max: 25, matched: true, reason: `「${ward}」一致` })
          } else {
            unmatched.push('所在地')
            detail.push({ item: '所在地', earned: 0, max: 25, matched: false,
              reason: `不一致（${na} vs ${nb}）` })
          }
        }
      }
    }
  } else {
    detail.push({ item: '所在地', earned: 0, max: 25, matched: false, reason: 'データなし' })
  }

  // ── 専有面積 15pt（±2㎡以内） ────────────────────────
  const pArea = portal.area_sqm != null ? Number(portal.area_sqm) : null
  const rArea = reins.area_sqm  != null ? Number(reins.area_sqm)  : null
  if (pArea && rArea) {
    const diff = Math.abs(pArea - rArea)
    if (diff <= 2) {
      score += 15; matched.push('専有面積')
      detail.push({ item: '専有面積', earned: 15, max: 15, matched: true, reason: `${pArea}㎡ ≒ ${rArea}㎡（差 ${diff.toFixed(1)}㎡）` })
    } else if (diff <= 5) {
      score += 7; matched.push('専有面積（近似）')
      detail.push({ item: '専有面積', earned: 7, max: 15, matched: true, reason: `差 ${diff.toFixed(1)}㎡（2㎡超のため部分点）` })
    } else {
      unmatched.push('専有面積')
      detail.push({ item: '専有面積', earned: 0, max: 15, matched: false,
        reason: `${pArea}㎡ vs ${rArea}㎡（差 ${diff.toFixed(1)}㎡）` })
    }
  } else {
    detail.push({ item: '専有面積', earned: 0, max: 15, matched: false,
      reason: `データなし（ポータル:${pArea ?? '未取得'}㎡ / レインズ:${rArea ?? '未取得'}㎡）` })
  }

  // ── 間取り 10pt ──────────────────────────────────────────
  const pPlan = portal.floor_plan?.replace(/\s/g, '').toUpperCase() ?? null
  const rPlan = reins.floor_plan?.replace(/\s/g, '').toUpperCase() ?? null
  if (pPlan && rPlan) {
    if (pPlan === rPlan) {
      score += 10; matched.push('間取り')
      detail.push({ item: '間取り', earned: 10, max: 10, matched: true, reason: `${pPlan} 一致` })
    } else {
      unmatched.push('間取り')
      detail.push({ item: '間取り', earned: 0, max: 10, matched: false, reason: `${pPlan} vs ${rPlan}` })
    }
  } else {
    detail.push({ item: '間取り', earned: 0, max: 10, matched: false, reason: 'データなし' })
  }

  // ── 階数 5pt ─────────────────────────────────────────────
  const pFloor = portal.floor_number ?? null
  const rFloor = reins.floor_number  ?? null
  if (pFloor && rFloor) {
    if (pFloor === rFloor) {
      score += 5; matched.push('階数')
      detail.push({ item: '階数', earned: 5, max: 5, matched: true, reason: `${pFloor}階 一致` })
    } else {
      unmatched.push('階数')
      detail.push({ item: '階数', earned: 0, max: 5, matched: false, reason: `${pFloor}階 vs ${rFloor}階` })
    }
  } else {
    detail.push({ item: '階数', earned: 0, max: 5, matched: false,
      reason: `データなし（ポータル:${pFloor ?? '未取得'}階 / レインズ:${rFloor ?? '未取得'}階）` })
  }

  // ── 価格 5pt（±3%以内） ───────────────────────────────
  if (portal.price_man && reins.price_man) {
    const diff = Math.abs(portal.price_man - reins.price_man)
    const pct  = diff / portal.price_man
    if (pct <= 0.03) {
      score += 5; matched.push('価格')
      detail.push({ item: '価格', earned: 5, max: 5, matched: true,
        reason: `${portal.price_man.toLocaleString()}万円 ≒ ${reins.price_man.toLocaleString()}万円（差 ${diff}万 / ${(pct*100).toFixed(1)}%）` })
    } else if (pct <= 0.10) {
      score += 2; matched.push('価格（近似）')
      detail.push({ item: '価格', earned: 2, max: 5, matched: true,
        reason: `差額 ${diff}万円（${(pct*100).toFixed(1)}%）— 3%超のため部分点` })
    } else {
      unmatched.push('価格')
      detail.push({ item: '価格', earned: 0, max: 5, matched: false,
        reason: `${portal.price_man.toLocaleString()}万 vs ${reins.price_man.toLocaleString()}万（差 ${diff}万 / ${(pct*100).toFixed(1)}%）` })
    }
  } else {
    detail.push({ item: '価格', earned: 0, max: 5, matched: false,
      reason: `データなし（ポータル:${portal.price_man ?? '未取得'} / レインズ:${reins.price_man ?? '未取得'}）` })
  }

  // ── データ不足チェック ────────────────────────────────────
  // 物件名・所在地・専有面積のいずれも取れていない場合は confirmed を禁止
  const nameMatched   = detail.find(d => d.item === '物件名')?.matched ?? false
  const addrMatched   = detail.find(d => d.item === '所在地')?.matched ?? false
  const areaAvailable = (pArea != null && rArea != null)
  const nameAvailable = !!(pName && rName)
  const addrAvailable = !!(pAddr && rAddr && !isVagueAddress(pAddr))

  const hasIdentifier = nameAvailable || addrAvailable || areaAvailable
  // 価格のみ一致で他が全て不一致 → confirmed にしない
  const onlyPriceMatched = matched.length > 0 && matched.every(m => m.startsWith('価格'))
  // 物件名・所在地が両方不一致 → confirmed にしない
  const noNameAndAddr = !nameMatched && !addrMatched

  let status: MatchResult['status']
  if (score >= 85 && hasIdentifier && !onlyPriceMatched && !noNameAndAddr) {
    status = 'confirmed'
  } else if (score >= 60 || (score >= 85 && (!hasIdentifier || onlyPriceMatched || noNameAndAddr))) {
    status = 'review'
  } else {
    status = 'not_found'
  }

  if (!hasIdentifier) {
    detail.push({
      item: 'データ不足',
      earned: 0, max: 0, matched: false,
      reason: '物件名・所在地・専有面積のいずれも取得できていないため要確認止まり',
    })
  }

  return { score, status, matched_items: matched, unmatched_items: unmatched, score_detail: detail }
}

// ─────────────────────────────────────────────────────────────
// 公開 API
// ─────────────────────────────────────────────────────────────

export function matchProperties(
  original: ExtractedProperty,
  candidate: ExtractedProperty
): MatchResult {
  return scoreProperties(original, candidate)
}

export function matchPortalWithReins(
  portal: ExtractedProperty & { reins_number?: string | null },
  reins: ReinsImportedProperty
): MatchResult {
  return scoreProperties(
    {
      property_name: portal.property_name,
      address:       portal.address,
      price_man:     portal.price_man,
      area_sqm:      portal.area_sqm,
      floor_plan:    portal.floor_plan,
      floor_number:  portal.floor_number,
      built_year:    portal.built_year,
      built_month:   portal.built_month,
      reins_number:  portal.reins_number,
    },
    {
      property_name: reins.property_name,
      address:       reins.address,
      price_man:     reins.price_man,
      area_sqm:      reins.area_sqm,
      floor_plan:    reins.floor_plan,
      floor_number:  reins.floor_number,
      built_year:    reins.built_year,
      built_month:   reins.built_month,
      reins_number:  reins.reins_number,
    }
  )
}

export interface BatchMatchResult {
  portal_id: string
  best_reins: ReinsImportedProperty | null
  result: MatchResult
}

export function findBestReinsMatch(
  portal: ExtractedProperty & { reins_number?: string | null },
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

export function matchFromReinsText(
  original: ExtractedProperty,
  reinsText: string
): MatchResult {
  const blocks = reinsText
    .split(/\n{2,}|(?=物件番号|№|\n─+\n)/)
    .filter(b => b.trim().length > 10)

  if (blocks.length === 0) {
    return { score: 0, status: 'not_found', matched_items: [], unmatched_items: ['レインズデータなし'], score_detail: [] }
  }

  let best: MatchResult = { score: 0, status: 'not_found', matched_items: [], unmatched_items: [], score_detail: [] }
  for (const block of blocks) {
    const candidate = extractFromText(block)
    const result = matchProperties(original, candidate)
    if (result.score > best.score) best = result
  }

  if (best.score === 0) {
    best = matchProperties(original, extractFromText(reinsText))
  }

  return best
}
