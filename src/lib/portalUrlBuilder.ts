/**
 * portalUrlBuilder.ts
 *
 * portal_area_mappings テーブルのデータを使い、
 * 顧客条件から SUUMO / アットホーム / HOME'S の検索URLを生成する。
 *
 * portal_url_param の形式:
 *   SUUMO city:    "ta=13&sc=13103"    ← ta (都道府県) + sc (市区町村JISコード)
 *   SUUMO station: "ta=14&ek=XXXXXX"   ← ta + ek (SUUMO独自駅コード)
 *   SUUMO station path: "kanagawa/eki_musashikosugi" ← パスセグメント形式
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
  /** 生成されたURL群 */
  urls: { url: string; label: string }[]
  /** 照合できなかったエリア名 */
  unresolvedAreas: string[]
  /** 照合できたエリア名 */
  resolvedAreas: string[]
  /** 警告メッセージ */
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
// 間取りパラメータ
// -------------------------------------------------------

/**
 * other_conditions テキストから間取りキーワードを抽出する。
 * 「2LDK・3LDK」「3LDK以上」「1K〜2LDK」など様々な表記に対応。
 */
export function extractFloorPlanLabels(other: string | null): string[] {
  if (!other) return []
  const labels: string[] = []
  // 4LDK以上 を先にチェック（4LDK より先にマッチさせる）
  if (/4LDK以上|5[KLDK]+|6[KLDK]+/.test(other)) labels.push('4LDK以上')
  else if (/4LDK/.test(other)) labels.push('4LDK')
  if (/3LDK/.test(other)) labels.push('3LDK')
  if (/3DK/.test(other)) labels.push('3DK')
  if (/3K/.test(other)) labels.push('3K')
  if (/2LDK/.test(other)) labels.push('2LDK')
  if (/2DK/.test(other)) labels.push('2DK')
  if (/2K/.test(other)) labels.push('2K')
  if (/1LDK/.test(other)) labels.push('1LDK')
  if (/1DK/.test(other)) labels.push('1DK')
  // 1K は「1KD」「1LDK」にマッチしないよう後ろに境界を設ける
  if (/1K(?![LD])/.test(other)) labels.push('1K')
  if (/1R/.test(other)) labels.push('1R')
  return labels
}

// SUUMO md= コードマップ
const SUUMO_MD: Record<string, string> = {
  '1R': '09', '1K': '10', '1DK': '11', '1LDK': '12',
  '2K': '13', '2DK': '14', '2LDK': '15',
  '3K': '16', '3DK': '17', '3LDK': '18',
  '4K': '19', '4DK': '20', '4LDK': '21', '4LDK以上': '21',
}

// athome MADORI= コードマップ
const ATHOME_MADORI: Record<string, string> = {
  '1R': '01', '1K': '02', '1DK': '03', '1LDK': '04',
  '2K': '05', '2DK': '06', '2LDK': '07',
  '3K': '08', '3DK': '09', '3LDK': '10',
  '4K': '11', '4DK': '12', '4LDK': '13', '4LDK以上': '13',
}

// HOME'S madori= コードマップ
const HOMES_MADORI: Record<string, string> = {
  '1R': '101', '1K': '102', '1DK': '103', '1LDK': '104',
  '2K': '105', '2DK': '106', '2LDK': '107',
  '3K': '108', '3DK': '109', '3LDK': '110',
  '4K': '111', '4DK': '112', '4LDK': '113', '4LDK以上': '113',
}

// -------------------------------------------------------
// その他条件パラメータ
// -------------------------------------------------------

export interface OtherConditionFlags {
  pet: boolean
  parking: boolean
  corner: boolean
  topFloor: boolean
}

/**
 * other_conditions テキストからキーワードを検出してフラグ化する。
 */
export function extractOtherConditionFlags(other: string | null): OtherConditionFlags {
  if (!other) return { pet: false, parking: false, corner: false, topFloor: false }
  return {
    pet:      /ペット可|ペット/.test(other),
    parking:  /駐車場|駐車スペース|ガレージ/.test(other),
    corner:   /角部屋|コーナー/.test(other),
    topFloor: /最上階/.test(other),
  }
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
    return '0300101'
  } else {
    if (pt.includes('戸建') || pt.includes('一戸建')) return '0401101'
    if (pt.includes('店舗') || pt.includes('事務所')) return '0700101'
    return '0300101'
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
 */
export function resolveAreaNamesV2(
  areaString: string | null,
  newMaster: NewMasterData,
  oldMappings: PortalAreaMapping[],
  portal: SiteKey,
  debugLog?: (msg: string) => void,
): AreaMatch[] {
  const names = splitAreaNames(areaString)
  if (names.length === 0) return []

  const { masters, params, aliases } = newMaster
  const portalParams = params.filter(p => p.portal === portal)
  const oldPortalMaps = oldMappings.filter(m => m.portal === portal)

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
  // 旧形式 "kanagawa/eki_musashikosugi" と新形式 "kanagawa/ek_38720" の両方に対応
  return /^[a-z]+\/eki?_[a-z0-9]+$/.test(param)
}

/**
 * 物件種別 × 売買/賃貸 → SUUMO駅パスURL用のパスセグメント
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

  const resolvedAreas   = resolved.filter(r => r.mapping).map(r => r.inputName)
  const unresolvedAreas = resolved.filter(r => !r.mapping).map(r => r.inputName)
  const warnings: string[] = []
  const urls: { url: string; label: string }[] = []

  const tc  = suumoTypeCode(cond.property_type, isSale)
  const wk  = suumoWalk(cond.walk_minutes_max)
  const ag  = suumoAge(cond.building_age_max)

  // 間取り・その他条件
  const floorLabels = extractFloorPlanLabels(cond.other_conditions)
  const otherFlags  = extractOtherConditionFlags(cond.other_conditions)

  // SUUMO md= クエリ文字列（複数指定: &md=09&md=10）
  const mdParts = floorLabels
    .map(l => SUUMO_MD[l])
    .filter(Boolean)
    .map(v => `md=${v}`)

  // SUUMO その他条件
  const extraParts: string[] = []
  if (otherFlags.pet)      extraParts.push('pc=1')
  if (otherFlags.parking)  extraParts.push('psk=1')
  if (otherFlags.corner)   extraParts.push('kkr=1')
  if (otherFlags.topFloor) extraParts.push('kk=1')

  // ── 1. 駅パス形式エントリ ────────────────────────────────────────────
  const stationPathMatches = resolved.filter(r => r.mapping && isSuumoStationPath(r.mapping.portal_url_param))

  for (const r of stationPathMatches) {
    const path = r.mapping!.portal_url_param
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
    qParts.push(...mdParts)
    qParts.push(...extraParts)
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
    if (isSuumoStationPath(r.mapping.portal_url_param)) continue

    const params = new URLSearchParams(r.mapping.portal_url_param)
    const ta = params.get('ta')
    const sc = params.get('sc')
    const ek = params.get('ek')
    if (!ta) continue

    const ar = SUUMO_AR[ta] ?? '030'
    if (!groups.has(ta)) groups.set(ta, { ta, ar, codes: [] })
    const g = groups.get(ta)!
    const code = sc ? `sc=${sc}` : ek ? `ek=${ek}` : null
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
    for (const p of mdParts)    qs += `&${p}`
    for (const p of extraParts) qs += `&${p}`

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

  // ── 3. エリアが解決できなかった場合 ─────────────────────────────────
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
    for (const p of mdParts)    qs += `&${p}`
    for (const p of extraParts) qs += `&${p}`
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
// エリアごとに個別URLを生成する（複数エリア対応）
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

  const matched = resolved.filter(r => r.mapping)

  if (matched.length === 0 && cond.area) {
    return {
      urls: [], unresolvedAreas, resolvedAreas,
      warnings: ['エリアが解決できませんでした'],
      canGenerate: false,
    }
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
  const portalLabel = portal === 'athome' ? 'アットホーム' : "HOME'S"

  // 間取り・その他条件
  const floorLabels = extractFloorPlanLabels(cond.other_conditions)
  const otherFlags  = extractOtherConditionFlags(cond.other_conditions)

  // ログ: ポータル側が対応していない条件
  if (otherFlags.corner && portal === 'athome') {
    warnings.push('アットホーム: 角部屋絞り込みはポータル側未対応のためURLには反映されません')
  }
  if (otherFlags.topFloor && portal === 'athome') {
    warnings.push('アットホーム: 最上階絞り込みはポータル側未対応のためURLには反映されません')
  }

  // フィルターパラメータ（エリアを除く共通部分）
  const buildQuery = (): Record<string, string> => {
    const q: Record<string, string> = {}

    if (portal === 'athome') {
      // 価格
      if (isSale) {
        if (cond.budget_min != null || cond.budget_max != null) {
          q.PRICE = `${cond.budget_min ?? ''}-${cond.budget_max ?? ''}`
        }
      } else {
        if (cond.rent_min != null || cond.rent_max != null) {
          const lo = cond.rent_min  ? String(cond.rent_min  * 10000) : ''
          const hi = cond.rent_max  ? String(cond.rent_max  * 10000) : ''
          q.PRICE = `${lo}-${hi}`
        }
      }
      // 面積（上限あれば "70-90" 形式、下限のみなら "70-"）
      if (cond.area_sqm_min != null || cond.area_sqm_max != null) {
        const lo = cond.area_sqm_min ? String(Math.floor(cond.area_sqm_min)) : ''
        const hi = cond.area_sqm_max ? String(Math.ceil(cond.area_sqm_max))  : ''
        q.MENSEKI = `${lo}-${hi}`
      }
      if (cond.walk_minutes_max) q.TIKO  = String(cond.walk_minutes_max)
      if (cond.building_age_max) q.CHIKU = String(cond.building_age_max)
      // 間取り（複数: MADORI[]=01&MADORI[]=02 形式）
      // athome は MADORI= を複数つけるか、カンマ区切りで指定
      // ここではクエリを手動構築するためカンマ区切りを使用
      const madoriCodes = floorLabels.map(l => ATHOME_MADORI[l]).filter(Boolean)
      if (madoriCodes.length > 0) q.MADORI = madoriCodes.join(',')
      // その他
      if (otherFlags.pet)     q.PET     = '1'
      if (otherFlags.parking) q.PARKING = '1'
    } else {
      // HOME'S: 検索フォームの実パラメータは cond[...] 形式
      // （売買価格は万円、賃貸は cond[moneyroom] が円/月ではなく万円指定）
      if (isSale) {
        if (cond.budget_min) q['cond[moneyroom]']  = String(cond.budget_min)
        if (cond.budget_max) q['cond[moneyroomh]'] = String(cond.budget_max)
      } else {
        if (cond.rent_min) q['cond[moneyroom]']  = String(cond.rent_min)
        if (cond.rent_max) q['cond[moneyroomh]'] = String(cond.rent_max)
      }
      if (cond.area_sqm_min) q['cond[housearea]']  = String(Math.floor(cond.area_sqm_min))
      if (cond.area_sqm_max) q['cond[houseareah]'] = String(Math.ceil(cond.area_sqm_max))
      if (cond.walk_minutes_max) q['cond[walkminutesh]'] = String(cond.walk_minutes_max)
      if (cond.building_age_max) q['cond[houseageh]']    = String(cond.building_age_max)
      // 間取り（HOME'S は madori= を複数）
      const madoriCodes = floorLabels.map(l => HOMES_MADORI[l]).filter(Boolean)
      if (madoriCodes.length > 0) q.madori = madoriCodes.join(',')
      // その他
      if (otherFlags.pet)      q.pet     = '1'
      if (otherFlags.parking)  q.parking = '1'
      if (otherFlags.corner)   q.corner  = '1'
      if (otherFlags.topFloor) q.top     = '1'
    }

    return q
  }

  const urls: { url: string; label: string }[] = []

  if (matched.length === 0) {
    // エリア未指定: エリアパスなしでURL生成
    const q = buildQuery()
    const qs = Object.keys(q).length > 0 ? `?${new URLSearchParams(q).toString()}` : ''
    urls.push({
      url: `${baseHost}${typeSegment}/list/${qs}`,
      label: `${portalLabel} ${isSale ? '売買' : '賃貸'}（エリア指定なし）`,
    })
  } else {
    // エリアごとに個別URL生成
    for (const r of matched) {
      const areaPath = r.mapping!.portal_url_param
      const q = buildQuery()
      const qs = Object.keys(q).length > 0 ? `?${new URLSearchParams(q).toString()}` : ''
      urls.push({
        url: `${baseHost}${typeSegment}${areaPath}/list/${qs}`,
        label: `${portalLabel} ${r.inputName} ${isSale ? '売買' : '賃貸'}`,
      })
    }
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
  const resolved = resolveAreaNamesV2(cond.area, newMaster, oldMappings, portal, debugLog)

  // display_name を inputName で上書きした仮想マッピング配列を作成して既存ビルダーに渡す
  const syntheticMappings: PortalAreaMapping[] = resolved
    .filter(r => r.mapping != null)
    .map(r => ({
      ...r.mapping!,
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

  const allUnresolved = [...new Set([
    ...result.unresolvedAreas,
    ...resolved.filter(r => !r.mapping).map(r => r.inputName),
  ])]

  debugLog?.(`[build] 生成URL数: ${result.urls.length} - ${result.urls.map(u => u.url).join(' | ')}`)

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
      other_conditions: cond.other_conditions,
    },
  }
}
