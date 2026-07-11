// 顧客条件との照合ロジック
// /api/proposals/candidates と /api/portal-search/run-all で共用。
// 挙動は candidates ルートに実装されていたものと同一。

export type MatchStatus = 'MATCH' | 'NO_MATCH' | 'NEED_MANUAL_CHECK'

export interface MatchResult {
  status: MatchStatus
  reasons: string[]        // NO_MATCH の除外理由
  missingFields: string[]  // NEED_MANUAL_CHECK の未取得項目
  managementFeeUnknown: boolean
  buildingAge: number | null
}

export function calcBuildingAge(builtYear: number | null, builtMonth: number | null): number | null {
  if (!builtYear) return null
  const now = new Date()
  const age = now.getFullYear() - builtYear
  return (builtMonth && builtMonth > now.getMonth() + 1) ? age - 1 : age
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function matchProperty(prop: any, cond: any): MatchResult {
  const txType = cond?.transaction_type ?? 'sale'
  const reasons: string[] = []
  const missing: string[] = []

  // 必須項目チェック
  if (txType === 'sale') {
    if (!prop.price)        missing.push('price')
    if (!prop.area_sqm)     missing.push('area_sqm')
    if (!prop.walk_minutes) missing.push('walk_minutes')
    if (!prop.built_year)   missing.push('built_year')
  } else {
    if (!prop.monthly_rent) missing.push('monthly_rent')
    if (!prop.area_sqm)     missing.push('area_sqm')
    if (!prop.walk_minutes) missing.push('walk_minutes')
    if (!prop.built_year)   missing.push('built_year')
  }
  if (missing.length > 0) {
    return { status: 'NEED_MANUAL_CHECK', reasons: [], missingFields: missing, managementFeeUnknown: !prop.management_fee, buildingAge: null }
  }

  let allMatch = true
  const buildingAge = calcBuildingAge(prop.built_year, prop.built_month)

  // 築年数
  if (cond?.building_age_max && buildingAge !== null && buildingAge > cond.building_age_max) {
    reasons.push(`築年数超過（築${buildingAge}年）`); allMatch = false
  }
  // 面積
  if (cond?.area_sqm_min && prop.area_sqm < cond.area_sqm_min) {
    reasons.push(`面積不足（${prop.area_sqm}㎡）`); allMatch = false
  }
  // 徒歩
  if (cond?.walk_minutes_max && prop.walk_minutes > cond.walk_minutes_max) {
    reasons.push(`徒歩超過（${prop.walk_minutes}分）`); allMatch = false
  }
  // 価格
  if (txType === 'sale') {
    if (cond?.budget_min && prop.price < cond.budget_min) {
      reasons.push(`価格下限未満（${prop.price}万円）`); allMatch = false
    }
    if (cond?.budget_max && prop.price > cond.budget_max) {
      reasons.push(`価格超過（${prop.price}万円）`); allMatch = false
    }
  } else {
    const rentMan = prop.monthly_rent / 10000
    if (cond?.rent_min && rentMan < cond.rent_min) {
      reasons.push(`賃料下限未満（${rentMan.toFixed(1)}万円）`); allMatch = false
    }
    if (cond?.rent_max && rentMan > cond.rent_max) {
      reasons.push(`賃料超過（${rentMan.toFixed(1)}万円）`); allMatch = false
    }
  }

  return {
    status: allMatch ? 'MATCH' : 'NO_MATCH',
    reasons,
    missingFields: [],
    managementFeeUnknown: txType === 'rent' && !prop.management_fee,
    buildingAge,
  }
}
