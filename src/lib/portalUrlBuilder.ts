/**
 * portalUrlBuilder.ts
 *
 * portal_area_mappings テーブルのデータを使い、
 * 顧客条件から SUUMO / アットホーム / HOME'S の検索URLを生成する。
 *
 * portal_url_param の形式:
 *   SUUMO city:    "ta=13&sc=13103"    ← ta (都道府県) + sc (市区町村JISコード)
 *   SUUMO station: "ta=14&ek=XXXXXX"   ← ta + ek (SUUMO独自駅コード)
 *   athome/homes:  "/tokyo/minato-city" ← パスセグメント
 */

import { CustomerCondition } from '@/types'

// -------------------------------------------------------
// 型
// -------------------------------------------------------
export interface PortalAreaMapping {
  id: string
  portal: 'suumo' | 'athome' | 'homes'
  area_type: 'prefecture' | 'city' | 'station' | 'town'
  display_name: string
  prefecture: string | null
  city: string | null
  station_name: string | null
  portal_code: string | null
  portal_url_param: string
}

export type SiteKey = 'suumo' | 'athome' | 'homes'

export interface AreaMatch {
  inputName: string      // 顧客条件から取り出した元の文字列
  mapping: PortalAreaMapping | null
  reason: string | null  // null = OK, 文字列 = 未解決の理由
}

export interface BuildResult {
  /** 生成されたURL群（SUUMO で複数都道府県にまたがる場合は複数） */
  urls: { url: string; label: string }[]
  /** 照合できなかったエリア名 */
  unresolvedAreas: string[]
  /** 照合できたエリア名 */
  resolvedAreas: string[]
  /** 警告メッセージ（複数都道府県・複数エリア非対応ポータル等） */
  warnings: string[]
  /** URL生成が可能かどうか */
  canGenerate: boolean
}

// -------------------------------------------------------
// SUUMO: ta → ar 変換マップ（都道府県コード → エリアコード）
// -------------------------------------------------------
const SUUMO_AR: Record<string, string> = {
  '01': '010',
  '02': '020', '03': '020', '04': '020', '05': '020', '06': '020', '07': '020',
  '08': '030', '09': '030', '10': '030', '11': '030', '12': '030', '13': '030', '14': '030',
  '15': '050', '16': '050', '17': '050', '18': '050', '19': '050', '20': '050',
  '21': '040', '22': '040', '23': '040', '24': '040',
  '25': '060', '26': '060', '27': '060', '28': '060', '29': '060', '30': '060',
  '31': '070', '32': '070', '33': '070', '34': '070', '35': '070',
  '36': '080', '37': '080', '38': '080', '39': '080',
  '40': '090', '41': '090', '42': '090', '43': '090',
  '44': '090', '45': '090', '46': '090', '47': '090',
}

// -------------------------------------------------------
// SUUMO: 物件種別コード
// -------------------------------------------------------
function suumoTypeCode(propertyType: string | null, isSale: boolean): string | null {
  const pt = propertyType ?? ''
  if (isSale) {
    if (pt.includes('新築') && (pt.includes('マンション') || pt === '新築マンション')) return '0300301'
    if (pt.includes('マンション') || pt === '' || pt === '中古マンション') return '0300101'
    if (pt.includes('新築') && (pt.includes('戸建') || pt.includes('一戸建'))) return '0401301'
    if (pt.includes('戸建') || pt.includes('一戸建')) return '0401101'
    if (pt.includes('土地')) return '0500101'
    if (pt.includes('店舗') || pt.includes('事務所')) return '0600101'
    return '0300101'  // デフォルト: 中古マンション
  } else {
    if (pt.includes('戸建') || pt.includes('一戸建')) return '0401101'
    if (pt.includes('店舗') || pt.includes('事務所')) return '0700101'
    return '0300101'  // デフォルト: マンション・アパート
  }
}

// SUUMO 徒歩分を選択肢に丸める
function suumoWalk(min: number | null): string | null {
  if (!min) return null
  return String([1, 3, 5, 7, 10, 15, 20].find(s => s >= min) ?? 20)
}

// SUUMO 築年数を選択肢に丸める
function suumoAge(years: number | null): string | null {
  if (!years) return null
  return String([1, 3, 5, 7, 10, 15, 20, 25, 30].find(s => s >= years) ?? 30)
}

// -------------------------------------------------------
// エリア名解決
// -------------------------------------------------------

/** area フィールドを区切り文字で分割 */
function splitAreaNames(area: string | null): string[] {
  if (!area) return []
  return area
    .split(/[・、,\s]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/**
 * area 文字列の各部分を portal_area_mappings から照合し、
 * 最適なエントリを返す。
 * 優先度: 駅(station) > 市区町村(city) > 町名(town) > 都道府県(prefecture)
 */
export function resolveAreaNames(
  areaString: string | null,
  allMappings: PortalAreaMapping[],
  portal: SiteKey,
): AreaMatch[] {
  const names = splitAreaNames(areaString)
  if (names.length === 0) return []

  const portalMaps = allMappings.filter(m => m.portal === portal)
  const typePriority: Record<string, number> = { station: 0, town: 1, city: 2, prefecture: 3 }

  return names.map(name => {
    // 1. 完全一致
    const exact = portalMaps.filter(m => m.display_name === name)
    if (exact.length > 0) {
      exact.sort((a, b) => typePriority[a.area_type] - typePriority[b.area_type])
      return { inputName: name, mapping: exact[0], reason: null }
    }

    // 2. 部分一致（name が display_name を含む、または display_name が name を含む）
    const partial = portalMaps.filter(m =>
      name.includes(m.display_name) || m.display_name.includes(name)
    )
    if (partial.length > 0) {
      partial.sort((a, b) => typePriority[a.area_type] - typePriority[b.area_type])
      return { inputName: name, mapping: partial[0], reason: null }
    }

    return { inputName: name, mapping: null, reason: `"${name}" はマスターに未登録` }
  })
}

// -------------------------------------------------------
// SUUMO URL 生成
// -------------------------------------------------------
function buildSuumoUrl(cond: CustomerCondition, mappings: PortalAreaMapping[]): BuildResult {
  const isSale = cond.transaction_type !== 'rent'
  const resolved = resolveAreaNames(cond.area, mappings, 'suumo')

  const resolvedAreas  = resolved.filter(r => r.mapping).map(r => r.inputName)
  const unresolvedAreas = resolved.filter(r => !r.mapping).map(r => r.inputName)
  const warnings: string[] = []

  // マッチしたエントリから ta と sc/ek を抽出し、都道府県グループに集約
  type Group = { ta: string; ar: string; codes: string[] }
  const groups = new Map<string, Group>()

  for (const r of resolved) {
    if (!r.mapping) continue
    const params = new URLSearchParams(r.mapping.portal_url_param)
    const ta = params.get('ta')
    const sc = params.get('sc')
    const ek = params.get('ek')
    if (!ta) continue

    const ar = SUUMO_AR[ta] ?? '030'
    if (!groups.has(ta)) groups.set(ta, { ta, ar, codes: [] })
    const g = groups.get(ta)!
    if (sc) g.codes.push(`sc=${sc}`)
    else if (ek) g.codes.push(`ek=${ek}`)
  }

  if (groups.size === 0) {
    // エリア未指定 → 全国検索（tc + 価格・面積フィルターのみ）
    if (cond.area) {
      return {
        urls: [], unresolvedAreas, resolvedAreas, warnings: ['エリアが解決できませんでした'],
        canGenerate: false,
      }
    }
  }

  if (groups.size > 1) {
    warnings.push(`複数の都道府県にまたがるため、都道府県ごとにURLを生成しました`)
  }

  const tc = suumoTypeCode(cond.property_type, isSale)

  const urls = [...groups.values()].map(g => {
    const base: Record<string, string> = {
      ar: g.ar,
      bs: isSale ? '010' : '040',
      ta: g.ta,
    }
    if (tc) base.tc = tc

    let qs = new URLSearchParams(base).toString()

    // エリアコード（複数 sc/ek を並べる）
    for (const code of g.codes) qs += `&${code}`

    // 価格
    if (isSale) {
      if (cond.budget_min) qs += `&kb=${cond.budget_min}`
      if (cond.budget_max) qs += `&kt=${cond.budget_max}`
    } else {
      if (cond.rent_min) qs += `&cb=${cond.rent_min}`
      if (cond.rent_max) qs += `&ct=${cond.rent_max}`
    }

    // 面積
    if (cond.area_sqm_min) qs += `&mb=${Math.floor(cond.area_sqm_min)}`
    if (cond.area_sqm_max) qs += `&mt=${Math.ceil(cond.area_sqm_max)}`

    // 徒歩
    const wk = suumoWalk(cond.walk_minutes_max)
    if (wk) qs += `&${isSale ? 'ekk' : 'et'}=${wk}`

    // 築年数
    const ag = suumoAge(cond.building_age_max)
    if (ag) qs += `&cn=${ag}`

    const base_url = isSale
      ? 'https://suumo.jp/jj/bukken/ichiran/JJ010FJ001/'
      : 'https://suumo.jp/jj/chintai/ichiran/FR301FC001/'

    const matchedNames = resolved
      .filter(r => r.mapping && new URLSearchParams(r.mapping.portal_url_param).get('ta') === g.ta)
      .map(r => r.inputName)

    return {
      url: `${base_url}?${qs}`,
      label: `SUUMO ${matchedNames.join('・')} ${isSale ? '売買' : '賃貸'}`,
    }
  })

  // エリア未指定（area 自体が null）の場合も基本URLを生成
  if (urls.length === 0 && !cond.area) {
    const base: Record<string, string> = {
      ar: '030', bs: isSale ? '010' : '040',
    }
    if (tc) base.tc = tc
    let qs = new URLSearchParams(base).toString()
    if (isSale) {
      if (cond.budget_min) qs += `&kb=${cond.budget_min}`
      if (cond.budget_max) qs += `&kt=${cond.budget_max}`
    } else {
      if (cond.rent_min) qs += `&cb=${cond.rent_min}`
      if (cond.rent_max) qs += `&ct=${cond.rent_max}`
    }
    if (cond.area_sqm_min) qs += `&mb=${Math.floor(cond.area_sqm_min)}`
    const wk = suumoWalk(cond.walk_minutes_max)
    if (wk) qs += `&${isSale ? 'ekk' : 'et'}=${wk}`
    const ag = suumoAge(cond.building_age_max)
    if (ag) qs += `&cn=${ag}`
    const base_url = isSale
      ? 'https://suumo.jp/jj/bukken/ichiran/JJ010FJ001/'
      : 'https://suumo.jp/jj/chintai/ichiran/FR301FC001/'
    warnings.push('エリア未指定のため関東全体で検索します')
    urls.push({ url: `${base_url}?${qs}`, label: 'SUUMO 全国（エリア指定なし）' })
  }

  return {
    urls,
    unresolvedAreas,
    resolvedAreas,
    warnings,
    canGenerate: urls.length > 0,
  }
}

// -------------------------------------------------------
// AtHome / HOME'S 共通 URL 生成（パスベース）
// -------------------------------------------------------
function buildPathPortalUrl(
  portal: 'athome' | 'homes',
  cond: CustomerCondition,
  mappings: PortalAreaMapping[],
): BuildResult {
  const isSale = cond.transaction_type !== 'rent'
  const resolved = resolveAreaNames(cond.area, mappings, portal)
  const resolvedAreas   = resolved.filter(r => r.mapping).map(r => r.inputName)
  const unresolvedAreas = resolved.filter(r => !r.mapping).map(r => r.inputName)
  const warnings: string[] = []

  // パスベース: 先頭の解決済みエントリを使用（複数エリア非対応）
  const matched = resolved.filter(r => r.mapping)

  if (matched.length === 0 && cond.area) {
    return {
      urls: [], unresolvedAreas, resolvedAreas, warnings: ['エリアが解決できませんでした'],
      canGenerate: false,
    }
  }

  if (matched.length > 1) {
    warnings.push(
      `${portal === 'athome' ? 'アットホーム' : "HOME'S"} はパスベース検索のため、` +
      `最初のエリア「${matched[0].inputName}」のみ反映されます`
    )
  }

  // 物件種別 → パスセグメント
  const pt = cond.property_type ?? ''
  let typeSegment: string
  if (isSale) {
    if (pt.includes('新築') && pt.includes('マンション')) typeSegment = '/mansion/shinchiku'
    else if (pt.includes('マンション') || pt === '') typeSegment = '/mansion/chuko'
    else if (pt.includes('新築') && (pt.includes('戸建') || pt.includes('一戸建'))) typeSegment = '/kodate/shinchiku'
    else if (pt.includes('戸建') || pt.includes('一戸建')) typeSegment = '/kodate/chuko'
    else if (pt.includes('土地')) typeSegment = '/tochi'
    else if (pt.includes('店舗') || pt.includes('事務所')) typeSegment = '/shop-office/chuko'
    else typeSegment = '/mansion/chuko'
  } else {
    if (pt.includes('戸建') || pt.includes('一戸建')) typeSegment = '/kodate/chintai'
    else typeSegment = '/chintai'
  }

  const baseHost = portal === 'athome' ? 'https://www.athome.co.jp' : 'https://www.homes.co.jp'

  // エリアパス（先頭1件のみ）
  const areaPath = matched.length > 0 ? matched[0].mapping!.portal_url_param : ''

  const base = `${baseHost}${typeSegment}${areaPath}/list/`

  // フィルターパラメータ
  const q: Record<string, string> = {}

  if (portal === 'athome') {
    // AtHome
    if (isSale) {
      if (cond.budget_min != null || cond.budget_max != null) {
        q.PRICE = `${cond.budget_min ?? ''}-${cond.budget_max ?? ''}`
      }
    } else {
      if (cond.rent_min != null || cond.rent_max != null) {
        const lo = cond.rent_min ? String(cond.rent_min * 10000) : ''
        const hi = cond.rent_max ? String(cond.rent_max * 10000) : ''
        q.PRICE = `${lo}-${hi}`
      }
    }
    if (cond.area_sqm_min) q.MENSEKI = `${Math.floor(cond.area_sqm_min)}-`
    if (cond.walk_minutes_max) q.TIKO = String(cond.walk_minutes_max)
    if (cond.building_age_max) q.CHIKU = String(cond.building_age_max)
  } else {
    // HOME'S
    if (isSale) {
      if (cond.budget_min) q.priceMin = String(cond.budget_min)
      if (cond.budget_max) q.priceMax = String(cond.budget_max)
    } else {
      if (cond.rent_min) q.priceMin = String(cond.rent_min)
      if (cond.rent_max) q.priceMax = String(cond.rent_max)
    }
    if (cond.area_sqm_min) q.areaMin = String(Math.floor(cond.area_sqm_min))
    if (cond.walk_minutes_max) q.tsuukin = String(cond.walk_minutes_max)
    if (cond.building_age_max) q.chiku = String(cond.building_age_max)
  }

  const qs = Object.keys(q).length > 0 ? `?${new URLSearchParams(q).toString()}` : ''
  const label = matched.length > 0
    ? `${portal === 'athome' ? 'アットホーム' : "HOME'S"} ${matched[0].inputName} ${isSale ? '売買' : '賃貸'}`
    : `${portal === 'athome' ? 'アットホーム' : "HOME'S"} ${isSale ? '売買' : '賃貸'}（エリア未指定）`

  return {
    urls: [{ url: `${base}${qs}`, label }],
    unresolvedAreas,
    resolvedAreas,
    warnings,
    canGenerate: true,
  }
}

// -------------------------------------------------------
// 統合エントリポイント
// -------------------------------------------------------
export function buildPortalUrl(
  portal: SiteKey,
  cond: CustomerCondition,
  mappings: PortalAreaMapping[],
): BuildResult {
  switch (portal) {
    case 'suumo':  return buildSuumoUrl(cond, mappings)
    case 'athome': return buildPathPortalUrl('athome', cond, mappings)
    case 'homes':  return buildPathPortalUrl('homes',  cond, mappings)
  }
}

// -------------------------------------------------------
// 0件ログ用: 生成URL情報をまとめる
// -------------------------------------------------------
export function makeUrlLog(
  portal: SiteKey,
  result: BuildResult,
  cond: CustomerCondition,
): Record<string, unknown> {
  return {
    portal,
    generated_at: new Date().toISOString(),
    urls: result.urls.map(u => u.url),
    resolved_areas: result.resolvedAreas,
    unresolved_areas: result.unresolvedAreas,
    warnings: result.warnings,
    condition_summary: {
      transaction_type: cond.transaction_type,
      area: cond.area,
      property_type: cond.property_type,
      budget_min: cond.budget_min,
      budget_max: cond.budget_max,
      rent_min: cond.rent_min,
      rent_max: cond.rent_max,
      area_sqm_min: cond.area_sqm_min,
      area_sqm_max: cond.area_sqm_max,
      walk_minutes_max: cond.walk_minutes_max,
      building_age_max: cond.building_age_max,
    },
  }
}
