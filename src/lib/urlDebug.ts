/**
 * urlDebug.ts
 * URL生成デバッグ用ユーティリティ
 * – area_masters 全件に対して portal_area_params の存在を確認
 * – テスト条件でURLを生成してステータスを返す
 */

export type DebugStatus =
  | 'OK'
  | 'PARAM_MISSING'
  | 'URL_INVALID'
  | 'ZERO_RESULTS'
  | 'CRAWL_FAILED'
  | 'CONDITION_NOT_REFLECTED'
  | 'NEED_MANUAL_CHECK'

export type Portal = 'suumo' | 'athome' | 'homes'

export interface PortalParamRow {
  area_id?: string
  portal: Portal
  param_type: string
  portal_code: string | null
  portal_url_param: string
  verified: boolean
  notes: string | null
}

export interface AreaMasterRow {
  id: string
  area_type: string
  display_name: string
  prefecture: string | null
  line_name: string | null
  station_ward: string | null
}

export interface PortalDebugResult {
  portal: Portal
  status: DebugStatus
  paramType: string | null
  paramValue: string | null
  verified: boolean
  notes: string | null
  generatedUrl: string | null
  validationMessage: string
  suggestedParamValue: string | null
  suggestedUrlPath: string | null
}

export interface AreaDebugResult {
  master: AreaMasterRow
  results: PortalDebugResult[]
  missingCount: number
  unverifiedCount: number
}

// ── テスト条件 ────────────────────────────────────────────────────────────
export const TEST_CONDITION = {
  type: 'sale' as const,
  priceMin: 5000,
  priceMax: 7000,
  areaMin: 60,
  walk: 15,
  age: 25,
}

// ── URL生成ロジック ──────────────────────────────────────────────────────

/** ek_XXXXX (数字コード形式) かどうか */
function isSuumoEkCode(p: string): boolean {
  return /^[a-z]+\/ek_\d+$/.test(p)
}

/** 旧形式 eki_xxx (名前ベース) かどうか — 廃止・404 */
function isSuumoOldEkiName(p: string): boolean {
  return /^[a-z]+\/eki_[a-z0-9_-]+$/.test(p)
}

function suumoWalk(min: number): string {
  return String([1,3,5,7,10,15,20].find(s => s >= min) ?? 20)
}

function suumoAge(years: number): string {
  return String([1,3,5,7,10,15,20,25,30].find(s => s >= years) ?? 30)
}

function buildSuumoUrl(param: PortalParamRow, txType: TransactionType = 'sale'): string {
  const { priceMin, priceMax, areaMin, walk, age } = TEST_CONDITION
  const wk = suumoWalk(walk)
  const ag = suumoAge(age)

  // ek_XXXXX 数字コード形式（現行・200確認済み）
  if (isSuumoEkCode(param.portal_url_param)) {
    if (txType === 'rent') {
      // 賃貸: /chintai/{pref}/ek_{code}/
      const q = [`et=${wk}`, `mb=${areaMin}`].join('&')
      return `https://suumo.jp/chintai/${param.portal_url_param}/?${q}`
    }
    // 売買: /ms/chuko/{pref}/ek_{code}/
    const q = [`kb=${priceMin}`, `kt=${priceMax}`, `mb=${areaMin}`, `ekk=${wk}`, `cn=${ag}`].join('&')
    return `https://suumo.jp/ms/chuko/${param.portal_url_param}/?${q}`
  }

  // 旧形式 eki_xxx → 404 になるため URL_INVALID として扱わせる
  if (isSuumoOldEkiName(param.portal_url_param)) {
    throw new Error('旧形式eki_xxxは404のため使用不可')
  }

  // query 形式 (ta=&sc= 等)
  const sp = new URLSearchParams(param.portal_url_param)
  const ta = sp.get('ta') ?? '13'
  let qs = new URLSearchParams({ ar: '030', bs: '010', ta }).toString()
  const sc = sp.get('sc'); const ek = sp.get('ek')
  if (sc) qs += `&sc=${sc}`
  if (ek) qs += `&ek=${ek}`
  qs += `&tc=0300101&kb=${priceMin}&kt=${priceMax}&mb=${areaMin}&ekk=${wk}&cn=${ag}`
  return `https://suumo.jp/jj/bukken/ichiran/JJ010FJ001/?${qs}`
}

function buildAthomeUrl(param: PortalParamRow, txType: TransactionType = 'sale'): string {
  const { priceMin, priceMax, areaMin, walk, age } = TEST_CONDITION
  if (txType === 'rent') {
    const q = new URLSearchParams({
      PRICE: `10-20`,       // 賃貸は万円単位
      MENSEKI: `${areaMin}-`,
      TIKO: String(walk),
      CHIKU: String(age),
    })
    return `https://www.athome.co.jp/chintai${param.portal_url_param}/list/?${q}`
  }
  const q = new URLSearchParams({
    PRICE: `${priceMin}-${priceMax}`,
    MENSEKI: `${areaMin}-`,
    TIKO: String(walk),
    CHIKU: String(age),
  })
  return `https://www.athome.co.jp/mansion/chuko${param.portal_url_param}/list/?${q}`
}

function buildHomesUrl(param: PortalParamRow, txType: TransactionType = 'sale'): string {
  const { priceMin, priceMax, areaMin, walk, age } = TEST_CONDITION
  if (txType === 'rent') {
    const q = new URLSearchParams({
      priceMax: '200000',   // 賃貸は円単位
      areaMin: String(areaMin),
      tsuukin: String(walk),
      chiku: String(age),
    })
    return `https://www.homes.co.jp/chintai${param.portal_url_param}/list/?${q}`
  }
  const q = new URLSearchParams({
    priceMin: String(priceMin),
    priceMax: String(priceMax),
    areaMin: String(areaMin),
    tsuukin: String(walk),
    chiku: String(age),
  })
  return `https://www.homes.co.jp/mansion/chuko${param.portal_url_param}/list/?${q}`
}

export type TransactionType = 'sale' | 'rent'

export function buildPortalUrl(portal: Portal, param: PortalParamRow, txType: TransactionType = 'sale'): string | null {
  try {
    if (portal === 'suumo')  return buildSuumoUrl(param, txType)
    if (portal === 'athome') return buildAthomeUrl(param, txType)
    if (portal === 'homes')  return buildHomesUrl(param, txType)
  } catch { /* ignore */ }
  return null
}

function buildUrl(portal: Portal, param: PortalParamRow, txType: TransactionType = 'sale'): string | null {
  return buildPortalUrl(portal, param, txType)
}

// ── 推測パラメータ生成 ────────────────────────────────────────────────────

function toRomaji(name: string): string {
  // 簡易ローマ字変換（主要な駅名パターン）
  // 実運用では proper romanization library を使うが、ここではカタカナ→英字の簡易版
  return name
    .replace(/ー/g, '')
    .replace(/[・]/g, '-')
    .replace(/[　 ]/g, '-')
    .toLowerCase()
    // 濁音・半濁音の正規化は省略し、display_name をそのままスラッグ候補にする
}

export function suggestParams(
  master: AreaMasterRow,
  portal: Portal,
): { paramValue: string; urlPath: string } {
  const pref = master.prefecture === '神奈川県' ? 'kanagawa' : 'tokyo'
  const slug = toRomaji(master.display_name)

  if (master.area_type === 'station') {
    if (portal === 'suumo') {
      return {
        paramValue: `${pref}/eki_${slug.replace(/-/g, '')}`,
        urlPath: `/${pref}/eki_${slug.replace(/-/g, '')}/`,
      }
    }
    return {
      paramValue: `/${pref}/${slug}-station`,
      urlPath: `/${pref}/${slug}-station`,
    }
  }
  // ward / city
  const suffix = master.area_type === 'ward' ? '-ku' : '-city'
  if (portal === 'suumo') {
    return { paramValue: `ta=${master.prefecture === '神奈川県' ? '14' : '13'}&sc=XXXXX`, urlPath: '' }
  }
  return {
    paramValue: `/${pref}/${slug}${suffix}`,
    urlPath: `/${pref}/${slug}${suffix}`,
  }
}

// ── 条件反映チェック ─────────────────────────────────────────────────────

function checkConditionReflected(url: string): boolean {
  const { priceMin, priceMax, areaMin, walk, age } = TEST_CONDITION
  return (
    url.includes(String(priceMin)) &&
    url.includes(String(priceMax)) &&
    url.includes(String(areaMin))  &&
    (url.includes(String(walk)) || url.includes(String(suumoWalk(walk)))) &&
    (url.includes(String(age))  || url.includes(String(suumoAge(age))))
  )
}

// ── メイン評価関数 ───────────────────────────────────────────────────────

export function evaluatePortal(
  master: AreaMasterRow,
  portal: Portal,
  param: PortalParamRow | undefined,
  txType: TransactionType = 'sale',
): PortalDebugResult {
  if (!param) {
    const { paramValue, urlPath } = suggestParams(master, portal)
    return {
      portal,
      status: 'PARAM_MISSING',
      paramType: null,
      paramValue: null,
      verified: false,
      notes: null,
      generatedUrl: null,
      validationMessage: 'portal_area_params 未登録',
      suggestedParamValue: paramValue,
      suggestedUrlPath: urlPath,
    }
  }

  const url = buildUrl(portal, param, txType)
  if (!url) {
    return {
      portal,
      status: 'URL_INVALID',
      paramType: param.param_type,
      paramValue: param.portal_url_param,
      verified: param.verified,
      notes: param.notes,
      generatedUrl: null,
      validationMessage: 'URL生成に失敗しました',
      suggestedParamValue: null,
      suggestedUrlPath: null,
    }
  }

  if (!checkConditionReflected(url)) {
    return {
      portal,
      status: 'CONDITION_NOT_REFLECTED',
      paramType: param.param_type,
      paramValue: param.portal_url_param,
      verified: param.verified,
      notes: param.notes,
      generatedUrl: url,
      validationMessage: '価格・面積・徒歩・築年数の一部がURLに反映されていません',
      suggestedParamValue: null,
      suggestedUrlPath: null,
    }
  }

  if (!param.verified) {
    return {
      portal,
      status: 'NEED_MANUAL_CHECK',
      paramType: param.param_type,
      paramValue: param.portal_url_param,
      verified: false,
      notes: param.notes,
      generatedUrl: url,
      validationMessage: 'URL生成成功 (verified=false, 要目視確認)',
      suggestedParamValue: null,
      suggestedUrlPath: null,
    }
  }

  return {
    portal,
    status: 'OK',
    paramType: param.param_type,
    paramValue: param.portal_url_param,
    verified: true,
    notes: param.notes,
    generatedUrl: url,
    validationMessage: 'URL生成成功・条件反映確認済み',
    suggestedParamValue: null,
    suggestedUrlPath: null,
  }
}

// ── INSERT SQL生成 ────────────────────────────────────────────────────────

export function generateInsertSql(
  master: AreaMasterRow,
  portal: Portal,
  result: PortalDebugResult,
): string {
  const { suggestedParamValue } = result
  if (!suggestedParamValue) return ''

  const pref = master.prefecture === '神奈川県' ? 'kanagawa' : 'tokyo'
  const isQuery = portal === 'suumo' && suggestedParamValue.startsWith('ta=')
  const paramType = isQuery ? 'query' : 'station_path'

  return `INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes)
SELECT id, '${portal}', '${paramType}', '${suggestedParamValue}', false, '要確認：推測URL自動生成'
FROM area_masters WHERE id = '${master.id}';  -- ${master.display_name} (${pref})`
}
