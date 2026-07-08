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
// 新マスターテーブル用の型
// -------------------------------------------------------

export interface AreaMasterRow {
  id: string
  area_type: string
  display_name: string
  prefecture: string | null
  city: string | null
  ward: string | null
  station_name: string | null
  line_name: string | null
  station_ward: string | null
}

export interface PortalAreaParamRow {
  area_id: string
  portal: string
  param_type: string
  portal_code: string | null
  portal_url_param: string
}

export interface AreaAliasRow {
  alias: string
  area_id: string
}

export interface NewMasterData {
  masters: AreaMasterRow[]
  params: PortalAreaParamRow[]
  aliases: AreaAliasRow[]
}

// -------------------------------------------------------
// エリア名解決
// -------------------------------------------------------

/** area フィールドを区切り文字で分割（重複排除済み） */
function splitAreaNames(area: string | null): string[] {
  if (!area) return []
  const seen = new Set<string>()
  return area
    .split(/[・、,\s]+/)
    .map(s => s.trim())
    .filter(s => {
      if (s.length === 0 || seen.has(s)) return false
      seen.add(s)
      return true
    })
}

const TYPE_PRIORITY: Record<string, number> = { station: 0, town: 1, ward: 2, city: 2, prefecture: 3 }

/** NewMasterData の1エントリを旧 PortalAreaMapping 形式に変換 */
function toPortalAreaMapping(master: AreaMasterRow, param: PortalAreaParamRow): PortalAreaMapping {
  return {
    id: master.id,
    portal: param.portal as SiteKey,
    area_type: master.area_type as PortalAreaMapping['area_type'],
    display_name: master.display_name,
    prefecture: master.prefecture,
    city: master.city,
    station_name: master.station_name,
    portal_code: param.portal_code,
    portal_url_param: param.portal_url_param,
  }
}

/**
 * area 文字列の各部分を新マスター（area_masters / area_aliases / portal_area_params）から照合。
 * 解決できない場合は旧 portal_area_mappings にフォールバック。
 *
 * 優先度:
 *   ① area_aliases.alias 完全一致
 *   ② area_masters.display_name 完全一致
 *   ③ display_name / alias 部分一致
 *   ④ 旧 portal_area_mappings フォールバック
 */
export function resolveAreaNamesV2(
  areaString: string | null,
  newMaster: NewMasterData,
  oldMappings: PortalAreaMapping[],
  portal: SiteKey,
  debugLog?: (msg: string) => void,
): AreaMatch[] {
  const names = splitAreaNames(areaString)  // 重複排除済み
  if (names.length === 0) return []

  const { masters, params, aliases } = newMaster
  const portalParams = params.filter(p => p.portal === portal)
  const oldPortalMaps = oldMappings.filter(m => m.portal === portal)

  /** master.id → PortalAreaMapping 変換（portal param がない場合 null） */
  const resolveById = (masterId: string): PortalAreaMapping | null => {
    const param = portalParams.find(p => p.area_id === masterId)
    if (!param) return null
    const master = masters.find(m => m.id === masterId)
    if (!master) return null
    return toPortalAreaMapping(master, param)
  }

  return names.map(name => {
    debugLog?.(`[resolve] 入力: "${name}"`)

    // ① alias 完全一致
    const aliasMatch = aliases.find(a => a.alias === name)
    if (aliasMatch) {
      const mapping = resolveById(aliasMatch.area_id)
      if (mapping) {
        debugLog?.(`[resolve] ① alias完全一致: "${name}" → ${mapping.display_name} (${mapping.area_type}) param=${mapping.portal_url_param}`)
        return { inputName: name, mapping, reason: null }
      }
      debugLog?.(`[resolve] ① alias一致だがportal_area_paramsなし: "${name}"`)
    }

    // ② display_name 完全一致
    const exactMasters = masters
      .filter(m => m.display_name === name)
      .sort((a, b) => (TYPE_PRIORITY[a.area_type] ?? 9) - (TYPE_PRIORITY[b.area_type] ?? 9))
    for (const m of exactMasters) {
      const mapping = resolveById(m.id)
      if (mapping) {
        debugLog?.(`[resolve] ② display_name完全一致: "${name}" → ${mapping.display_name} (${mapping.area_type}) param=${mapping.portal_url_param}`)
        return { inputName: name, mapping, reason: null }
      }
    }

    // ③ 部分一致（display_name / alias どちらか）
    const partialMasterIds = new Set<string>()
    masters
      .filter(m => name.includes(m.display_name) || m.display_name.includes(name))
      .forEach(m => partialMasterIds.add(m.id))
    aliases
      .filter(a => name.includes(a.alias) || a.alias.includes(name))
      .forEach(a => partialMasterIds.add(a.area_id))

    const partialCandidates = Array.from(partialMasterIds)
      .map(id => masters.find(m => m.id === id))
      .filter((m): m is AreaMasterRow => m != null)
      .sort((a, b) => (TYPE_PRIORITY[a.area_type] ?? 9) - (TYPE_PRIORITY[b.area_type] ?? 9))

    for (const m of partialCandidates) {
      const mapping = resolveById(m.id)
      if (mapping) {
        debugLog?.(`[resolve] ③ 部分一致: "${name}" → ${mapping.display_name} (${mapping.area_type}) param=${mapping.portal_url_param}`)
        return { inputName: name, mapping, reason: null }
      }
    }

    // ④ 旧マスター フォールバック
    const oldExact = oldPortalMaps
      .filter(m => m.display_name === name)
      .sort((a, b) => (TYPE_PRIORITY[a.area_type] ?? 9) - (TYPE_PRIORITY[b.area_type] ?? 9))
    if (oldExact.length > 0) {
      debugLog?.(`[resolve] ④ 旧マスターfallback(完全一致): "${name}" → ${oldExact[0].display_name}`)
      return { inputName: name, mapping: oldExact[0], reason: null }
    }

    const oldPartial = oldPortalMaps
      .filter(m => name.includes(m.display_name) || m.display_name.includes(name))
      .sort((a, b) => (TYPE_PRIORITY[a.area_type] ?? 9) - (TYPE_PRIORITY[b.area_type] ?? 9))
    if (oldPartial.length > 0) {
      debugLog?.(`[resolve] ④ 旧マスターfallback(部分一致): "${name}" → ${oldPartial[0].display_name}`)
      return { inputName: name, mapping: oldPartial[0], reason: null }
    }

    debugLog?.(`[resolve] 未解決: "${name}"`)
    return { inputName: name, mapping: null, reason: `"${name}" はマスターに未登録` }
  })
}

/**
 * 旧マスターのみで解決する（後方互換用）
 */
export function resolveAreaNames(
  areaString: string | null,
  allMappings: PortalAreaMapping[],
  portal: SiteKey,
): AreaMatch[] {
  const names = splitAreaNames(areaString)
  if (names.length === 0) return []

  const portalMaps = allMappings.filter(m => m.portal === portal)

  return names.map(name => {
    const exact = portalMaps
      .filter(m => m.display_name === name)
      .sort((a, b) => (TYPE_PRIORITY[a.area_type] ?? 9) - (TYPE_PRIORITY[b.area_type] ?? 9))
    if (exact.length > 0) return { inputName: name, mapping: exact[0], reason: null }

    const partial = portalMaps
      .filter(m => name.includes(m.display_name) || m.display_name.includes(name))
      .sort((a, b) => (TYPE_PRIORITY[a.area_type] ?? 9) - (TYPE_PRIORITY[b.area_type] ?? 9))
    if (partial.length > 0) return { inputName: name, mapping: partial[0], reason: null }

    return { inputName: name, mapping: null, reason: `"${name}" はマスターに未登録` }
  })
}

// -------------------------------------------------------
// SUUMO URL 生成
// -------------------------------------------------------

/**
 * portal_url_param が SUUMO駅パス形式かどうか判定
 * 例: "kanagawa/eki_musashikosugi" → true
 *     "ta=14&sc=14133"             → false
 */
function isSuumoStationPath(param: string): boolean {
  return /^[a-z]+\/eki_[a-z0-9]+$/.test(param)
}

/**
 * 物件種別 × 売買/賃貸 → SUUMO駅パスURL用のパスセグメント
 * 例: マンション売買 → "ms/chuko", 戸建賃貸 → "chintai/ikkodate"
 */
function suumoStationTypeSegment(propertyType: string | null, isSale: boolean): string {
  const pt = propertyType ?? ''
  if (isSale) {
    if (pt.includes('新築') && pt.includes('マンション')) return 'ms/shinchiku'
    if (pt.includes('新築') && (pt.includes('戸建') || pt.includes('一戸建'))) return 'ikkodate/shinchiku'
    if (pt.includes('戸建') || pt.includes('一戸建')) return 'ikkodate/chuko'
    if (pt.includes('土地')) return 'tochi'
    return 'ms/chuko'
  } else {
    if (pt.includes('戸建') || pt.includes('一戸建')) return 'chintai/ikkodate'
    return 'chintai/mansion'
  }
}

function buildSuumoUrl(cond: CustomerCondition, mappings: PortalAreaMapping[]): BuildResult {
  const isSale = cond.transaction_type !== 'rent'
  const resolved = resolveAreaNames(cond.area, mappings, 'suumo')

  const resolvedAreas  = resolved.filter(r => r.mapping).map(r => r.inputName)
  const unresolvedAreas = resolved.filter(r => !r.mapping).map(r => r.inputName)
  const warnings: string[] = []
  const urls: { url: string; label: string }[] = []

  const tc  = suumoTypeCode(cond.property_type, isSale)
  const wk  = suumoWalk(cond.walk_minutes_max)
  const ag  = suumoAge(cond.building_age_max)

  // ── 1. 駅パス形式エントリ（kanagawa/eki_musashikosugi 等）──────────
  // 駅ごとに1URL生成。ekk= が正しく機能する。
  const stationPathMatches = resolved.filter(r => r.mapping && isSuumoStationPath(r.mapping.portal_url_param))

  for (const r of stationPathMatches) {
    const path = r.mapping!.portal_url_param  // e.g. "kanagawa/eki_musashikosugi"
    const typeSegment = suumoStationTypeSegment(cond.property_type, isSale)
    const qParts: string[] = []
    if (isSale) {
      if (cond.budget_min) qParts.push(`kb=${cond.budget_min}`)
      if (cond.budget_max) qParts.push(`kt=${cond.budget_max}`)
    } else {
      if (cond.rent_min) qParts.push(`cb=${cond.rent_min}`)
      if (cond.rent_max) qParts.push(`ct=${cond.rent_max}`)
    }
    if (cond.area_sqm_min) qParts.push(`mb=${Math.floor(cond.area_sqm_min)}`)
    if (cond.area_sqm_max) qParts.push(`mt=${Math.ceil(cond.area_sqm_max)}`)
    if (wk) qParts.push(`ekk=${wk}`)
    if (ag) qParts.push(`cn=${ag}`)
    const qs = qParts.length > 0 ? `?${qParts.join('&')}` : ''
    urls.push({
      url: `https://suumo.jp/${typeSegment}/${path}/${qs}`,
      label: `SUUMO ${r.inputName} ${isSale ? '売買' : '賃貸'}`,
    })
  }

  // ── 2. ta+sc/ek 形式エントリ（都道府県グループ集約）─────────────────
  type Group = { ta: string; ar: string; codes: string[] }
  const groups = new Map<string, Group>()

  for (const r of resolved) {
    if (!r.mapping) continue
    if (isSuumoStationPath(r.mapping.portal_url_param)) continue  // 上で処理済み

    const params = new URLSearchParams(r.mapping.portal_url_param)
    const ta = params.get('ta')
    const sc = params.get('sc')
    const ek = params.get('ek')
    if (!ta) continue

    const ar = SUUMO_AR[ta] ?? '030'
    if (!groups.has(ta)) groups.set(ta, { ta, ar, codes: [] })
    const g = groups.get(ta)!
    const code = sc ? `sc=${sc}` : ek ? `ek=${ek}` : null
    // 重複除去（同一都道府県内で同じコードを複数回追加しない）
    if (code && !g.codes.includes(code)) g.codes.push(code)
  }

  if (groups.size > 1) {
    warnings.push('複数の都道府県にまたがるため、都道府県ごとにURLを生成しました')
  }

  for (const g of groups.values()) {
    const base: Record<string, string> = {
      ar: g.ar,
      bs: isSale ? '010' : '040',
      ta: g.ta,
    }
    if (tc) base.tc = tc

    let qs = new URLSearchParams(base).toString()
    for (const code of g.codes) qs += `&${code}`

    if (isSale) {
      if (cond.budget_min) qs += `&kb=${cond.budget_min}`
      if (cond.budget_max) qs += `&kt=${cond.budget_max}`
    } else {
      if (cond.rent_min) qs += `&cb=${cond.rent_min}`
      if (cond.rent_max) qs += `&ct=${cond.rent_max}`
    }
    if (cond.area_sqm_min) qs += `&mb=${Math.floor(cond.area_sqm_min)}`
    if (cond.area_sqm_max) qs += `&mt=${Math.ceil(cond.area_sqm_max)}`
    if (wk) qs += `&${isSale ? 'ekk' : 'et'}=${wk}`
    if (ag) qs += `&cn=${ag}`

    const base_url = isSale
      ? 'https://suumo.jp/jj/bukken/ichiran/JJ010FJ001/'
      : 'https://suumo.jp/jj/chintai/ichiran/FR301FC001/'

    const matchedNames = resolved
      .filter(r => r.mapping && !isSuumoStationPath(r.mapping.portal_url_param)
        && new URLSearchParams(r.mapping.portal_url_param).get('ta') === g.ta)
      .map(r => r.inputName)

    urls.push({
      url: `${base_url}?${qs}`,
      label: `SUUMO ${matchedNames.join('・')} ${isSale ? '売買' : '賃貸'}`,
    })
  }

  // ── 3. エリアが解決できなかった場合 ──────────────────────────────────
  if (urls.length === 0) {
    if (cond.area) {
      return { urls: [], unresolvedAreas, resolvedAreas, warnings: ['エリアが解決できませんでした'], canGenerate: false }
    }
    // エリア未指定 → デフォルトフォールバック（関東）
    const base: Record<string, string> = { ar: '030', bs: isSale ? '010' : '040' }
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
    if (wk) qs += `&${isSale ? 'ekk' : 'et'}=${wk}`
    if (ag) qs += `&cn=${ag}`
    const base_url = isSale
      ? 'https://suumo.jp/jj/bukken/ichiran/JJ010FJ001/'
      : 'https://suumo.jp/jj/chintai/ichiran/FR301FC001/'
    warnings.push('エリア未指定のため関東全体で検索します')
    urls.push({ url: `${base_url}?${qs}`, label: 'SUUMO 全国（エリア指定なし）' })
  }

  return { urls, unresolvedAreas, resolvedAreas, warnings, canGenerate: urls.length > 0 }
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
// 統合エントリポイント（旧マスターのみ・後方互換）
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
// 統合エントリポイント V2（新マスター優先 + 旧マスターfallback）
// -------------------------------------------------------
export function buildPortalUrlV2(
  portal: SiteKey,
  cond: CustomerCondition,
  newMaster: NewMasterData,
  oldMappings: PortalAreaMapping[],
  debugLog?: (msg: string) => void,
): BuildResult {
  // 新マスターで解決した結果を旧 PortalAreaMapping 互換の配列に変換して既存URLビルダーへ渡す
  const resolved = resolveAreaNamesV2(cond.area, newMaster, oldMappings, portal, debugLog)

  // resolved を PortalAreaMapping[] に展開し、既存 buildSuumoUrl / buildPathPortalUrl に食わせる
  // → 新旧混在した仮想マッピング配列を作り、cond.area の各名前を display_name として格納する
  const syntheticMappings: PortalAreaMapping[] = resolved
    .filter(r => r.mapping != null)
    .map(r => ({
      ...r.mapping!,
      // display_name を inputName に上書きすることで既存の完全一致ロジックが通る
      display_name: r.inputName,
    }))

  debugLog?.(`[build] portal=${portal} 解決済み: [${resolved.filter(r=>r.mapping).map(r=>r.inputName).join(', ')}]`)
  debugLog?.(`[build] 未解決: [${resolved.filter(r=>!r.mapping).map(r=>r.inputName).join(', ')}]`)

  let result: BuildResult
  switch (portal) {
    case 'suumo':  result = buildSuumoUrl(cond, syntheticMappings); break
    case 'athome': result = buildPathPortalUrl('athome', cond, syntheticMappings); break
    case 'homes':  result = buildPathPortalUrl('homes',  cond, syntheticMappings); break
  }

  // 未解決エリアをマージ（重複排除）
  const allUnresolved = [...new Set([
    ...result.unresolvedAreas,
    ...resolved.filter(r => !r.mapping).map(r => r.inputName),
  ])]

  debugLog?.(`[build] 生成URL: ${result.urls.map(u => u.url).join(' | ')}`)

  return { ...result, unresolvedAreas: allUnresolved }
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
