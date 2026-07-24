// ============================================================
// matchCustomerReins.ts
// レインズ取込物件 × 顧客希望条件 の単純ルール照合（AI不使用）
//
// 判定は3種のみ:
//   'match'      … 条件一致
//   'partial'    … 一部条件一致
//   'excluded'   … 対象外
//
// 設計方針:
//   - ハードフィルタ（売買/賃貸・物件種別）に反したら即 excluded
//   - ソフト条件（エリア/駅・価格・面積・間取り・徒歩・築年数）の
//     違反数が 0 なら match、1件以上なら partial
//   - 物件側の値が不明な項目は「違反」に数えない（空欄で全体を止めない）
// ============================================================

import { calcBuildingAge } from './conditionMatch'

export type MatchStatus = 'match' | 'partial' | 'excluded'

export const MATCH_LABELS: Record<MatchStatus, string> = {
  match: '条件一致',
  partial: '一部条件一致',
  excluded: '対象外',
}

export interface MatchOutcome {
  status: MatchStatus
  reasons: string[]      // partial/excluded の理由（表示用）
  matched: string[]      // 一致した項目のラベル
}

// 照合に必要な物件フィールド（reins_imported_properties のサブセット）
export interface ReinsPropertyLike {
  property_name?: string | null
  address?: string | null
  station?: string | null
  price_man?: number | null          // 万円
  area_sqm?: number | null
  floor_plan?: string | null
  walk_minutes?: number | null
  built_year?: number | null
  built_month?: number | null
  transaction_type?: string | null   // 'sale' | 'rent' | null
}

// 照合に必要な顧客条件フィールド（customer_conditions のサブセット）
export interface ConditionLike {
  transaction_type?: string | null
  area?: string | null
  preferred_station?: string | null
  property_type?: string | null
  floor_plan?: string | null
  budget_min?: number | null
  budget_max?: number | null
  area_sqm_min?: number | null
  walk_minutes_max?: number | null
  building_age_max?: number | null
}

// 物件種別カテゴリ（マンション/戸建/土地）を粗く判定
function propertyCategory(text: string | null | undefined): string | null {
  if (!text) return null
  const t = text.replace(/\s/g, '')
  if (t.includes('マンション')) return 'マンション'
  if (t.includes('戸建') || t.includes('一戸建')) return '戸建'
  if (t.includes('土地')) return '土地'
  return null
}

// 間取りを正規化（全角→半角・大文字化・空白除去）
function normalizePlan(text: string | null | undefined): string | null {
  if (!text) return null
  return text
    .replace(/[０-９Ａ-Ｚ]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .toUpperCase()
    .replace(/\s/g, '')
}

// 顧客の希望エリア/駅（複数語）が物件の所在地/駅に含まれるか
function areaOrStationMatches(cond: ConditionLike, prop: ReinsPropertyLike): boolean {
  const hay = `${prop.address ?? ''} ${prop.station ?? ''} ${prop.property_name ?? ''}`
  const keywords = [cond.area, cond.preferred_station]
    .filter(Boolean)
    .flatMap(s => String(s).split(/[\s、,・／/]+/))
    .map(s => s.trim())
    .filter(Boolean)
  if (keywords.length === 0) return true // エリア・駅の指定なし → 制約なし
  return keywords.some(k => hay.includes(k))
}

export function matchCustomerReins(prop: ReinsPropertyLike, cond: ConditionLike): MatchOutcome {
  const reasons: string[] = []
  const matched: string[] = []

  // ── ハードフィルタ ────────────────────────────────
  // 売買/賃貸（両方指定がある場合のみ判定）
  const condTx = cond.transaction_type ?? 'sale'
  const propTx = prop.transaction_type ?? null
  if (propTx && propTx !== condTx) {
    return { status: 'excluded', reasons: ['売買/賃貸が不一致'], matched }
  }

  // 物件種別カテゴリ（両方判定できる場合のみ）
  const condCat = propertyCategory(cond.property_type)
  const propCat = propertyCategory(prop.property_name) ?? propertyCategory(prop.floor_plan)
  if (condCat && propCat && condCat !== propCat) {
    return { status: 'excluded', reasons: [`物件種別が不一致（希望:${condCat}）`], matched }
  }

  // ── ソフト条件 ────────────────────────────────────
  let violations = 0

  // エリア/駅
  if (cond.area || cond.preferred_station) {
    if (areaOrStationMatches(cond, prop)) {
      matched.push('エリア/駅')
    } else {
      violations++
      reasons.push('希望エリア/駅に該当しない')
    }
  }

  // 価格（万円・売買想定。賃貸は price_man に賃料が入らないためスキップ）
  if (condTx === 'sale' && prop.price_man != null) {
    if (cond.budget_min != null && prop.price_man < cond.budget_min) {
      violations++; reasons.push(`価格が下限未満（${prop.price_man}万円）`)
    } else if (cond.budget_max != null && prop.price_man > cond.budget_max) {
      violations++; reasons.push(`価格が上限超過（${prop.price_man}万円）`)
    } else if (cond.budget_min != null || cond.budget_max != null) {
      matched.push('価格')
    }
  }

  // 専有面積下限
  if (cond.area_sqm_min != null && prop.area_sqm != null) {
    if (prop.area_sqm < cond.area_sqm_min) {
      violations++; reasons.push(`面積が下限未満（${prop.area_sqm}㎡）`)
    } else {
      matched.push('面積')
    }
  }

  // 間取り
  if (cond.floor_plan && prop.floor_plan) {
    const want = normalizePlan(cond.floor_plan)
    const have = normalizePlan(prop.floor_plan)
    if (want && have && want === have) {
      matched.push('間取り')
    } else {
      violations++; reasons.push(`間取りが不一致（${prop.floor_plan}）`)
    }
  }

  // 駅徒歩上限
  if (cond.walk_minutes_max != null && prop.walk_minutes != null) {
    if (prop.walk_minutes > cond.walk_minutes_max) {
      violations++; reasons.push(`駅徒歩が上限超過（${prop.walk_minutes}分）`)
    } else {
      matched.push('駅徒歩')
    }
  }

  // 築年数上限
  if (cond.building_age_max != null && prop.built_year != null) {
    const age = calcBuildingAge(prop.built_year, prop.built_month ?? null)
    if (age != null && age > cond.building_age_max) {
      violations++; reasons.push(`築年数が上限超過（築${age}年）`)
    } else if (age != null) {
      matched.push('築年数')
    }
  }

  return {
    status: violations === 0 ? 'match' : 'partial',
    reasons,
    matched,
  }
}
