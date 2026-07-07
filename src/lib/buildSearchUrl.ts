import { CustomerCondition } from '@/types'

// -------------------------------------------------------
// 東京23区 → SUUMO sc コード（JIS 5桁市区町村コード）
// -------------------------------------------------------
const SUUMO_WARD_CODES: Record<string, string> = {
  '千代田区': '13101', '中央区':   '13102', '港区':     '13103',
  '新宿区':   '13104', '文京区':   '13105', '台東区':   '13106',
  '墨田区':   '13107', '江東区':   '13108', '品川区':   '13109',
  '目黒区':   '13110', '大田区':   '13111', '世田谷区': '13112',
  '渋谷区':   '13113', '中野区':   '13114', '杉並区':   '13115',
  '豊島区':   '13116', '北区':     '13117', '荒川区':   '13118',
  '板橋区':   '13119', '練馬区':   '13120', '足立区':   '13121',
  '葛飾区':   '13122', '江戸川区': '13123',
}

// -------------------------------------------------------
// 東京23区 → AtHome / HOME'S の URL スラグ
// -------------------------------------------------------
const CITY_SLUGS: Record<string, string> = {
  '千代田区': 'chiyoda-city',  '中央区':   'chuo-city',      '港区':     'minato-city',
  '新宿区':   'shinjuku-city', '文京区':   'bunkyo-city',    '台東区':   'taito-city',
  '墨田区':   'sumida-city',   '江東区':   'koto-city',      '品川区':   'shinagawa-city',
  '目黒区':   'meguro-city',   '大田区':   'ota-city',       '世田谷区': 'setagaya-city',
  '渋谷区':   'shibuya-city',  '中野区':   'nakano-city',    '杉並区':   'suginami-city',
  '豊島区':   'toshima-city',  '北区':     'kita-city',      '荒川区':   'arakawa-city',
  '板橋区':   'itabashi-city', '練馬区':   'nerima-city',    '足立区':   'adachi-city',
  '葛飾区':   'katsushika-city','江戸川区':'edogawa-city',
}

// -------------------------------------------------------
// helpers
// -------------------------------------------------------

/** area 文字列から23区名を抽出（例: "港区白金" → "港区"） */
function extractWard(area: string | null): string | null {
  if (!area) return null
  for (const ward of Object.keys(SUUMO_WARD_CODES)) {
    if (area.includes(ward)) return ward
  }
  return null
}

/** property_type から "戸建て" かどうかを判定 */
function isKodate(propertyType: string | null): boolean {
  return !!(propertyType && (propertyType.includes('戸建') || propertyType.includes('一戸建')))
}

/** 徒歩分を SUUMO の選択肢に丸める */
function suumoWalk(min: number | null): string | null {
  if (!min) return null
  const steps = [1, 3, 5, 7, 10, 15, 20]
  return String(steps.find(s => s >= min) ?? 20)
}

/** 築年数を SUUMO の選択肢に丸める */
function suumoAge(years: number | null): string | null {
  if (!years) return null
  const steps = [1, 3, 5, 7, 10, 15, 20, 25, 30]
  return String(steps.find(s => s >= years) ?? 30)
}

// -------------------------------------------------------
// SUUMO
// -------------------------------------------------------
export function buildSuumoUrl(cond: CustomerCondition): string {
  const isSale = cond.transaction_type !== 'rent'
  const ward     = extractWard(cond.area)
  const wardCode = ward ? SUUMO_WARD_CODES[ward] : null
  const kodate   = isKodate(cond.property_type)

  const p: Record<string, string> = {
    ar: '030',                      // 関東エリア
    bs: isSale ? '010' : '040',     // 購入 or 賃貸
    ta: '13',                       // 東京都（暫定）
  }

  if (wardCode) p.sc = wardCode

  // 物件種別
  if (isSale) {
    p.tc = kodate ? '0401101' : '0300101'  // 中古一戸建 or 中古マンション
  } else {
    p.tc = kodate ? '0401101' : '0300101'
  }

  // 価格
  if (isSale) {
    if (cond.budget_min) p.kb = String(cond.budget_min)
    if (cond.budget_max) p.kt = String(cond.budget_max)
  } else {
    if (cond.rent_min) p.cb = String(cond.rent_min)
    if (cond.rent_max) p.ct = String(cond.rent_max)
  }

  // 面積
  if (cond.area_sqm_min) p.mb = String(Math.floor(cond.area_sqm_min))
  if (cond.area_sqm_max) p.mt = String(Math.ceil(cond.area_sqm_max))

  // 徒歩
  const wk = suumoWalk(cond.walk_minutes_max)
  if (wk) p[isSale ? 'ekk' : 'et'] = wk

  // 築年数
  const ag = suumoAge(cond.building_age_max)
  if (ag) p.cn = ag

  const base = isSale
    ? 'https://suumo.jp/jj/bukken/ichiran/JJ010FJ001/'
    : 'https://suumo.jp/jj/chintai/ichiran/FR301FC001/'

  return `${base}?${new URLSearchParams(p).toString()}`
}

// -------------------------------------------------------
// アットホーム
// -------------------------------------------------------
export function buildAthomeUrl(cond: CustomerCondition): string {
  const isSale  = cond.transaction_type !== 'rent'
  const ward    = extractWard(cond.area)
  const slug    = ward ? CITY_SLUGS[ward] : null
  const kodate  = isKodate(cond.property_type)

  let path: string
  if (isSale) {
    path = kodate ? '/kodate/chuko/tokyo' : '/mansion/chuko/tokyo'
  } else {
    path = '/chintai/tokyo'
  }

  const areaSegment = slug ? `/${slug}` : ''
  const base = `https://www.athome.co.jp${path}${areaSegment}/list/`

  const p: Record<string, string> = {}

  if (isSale) {
    if (cond.budget_min != null || cond.budget_max != null) {
      // AtHome 売買価格は万円単位
      p.PRICE = `${cond.budget_min ?? ''}-${cond.budget_max ?? ''}`
    }
  } else {
    if (cond.rent_min != null || cond.rent_max != null) {
      // AtHome 賃料は円単位
      const lo = cond.rent_min ? String(cond.rent_min * 10000) : ''
      const hi = cond.rent_max ? String(cond.rent_max * 10000) : ''
      p.PRICE = `${lo}-${hi}`
    }
  }

  if (cond.area_sqm_min) p.MENSEKI = `${Math.floor(cond.area_sqm_min)}-`
  if (cond.walk_minutes_max) p.TIKO = String(cond.walk_minutes_max)
  if (cond.building_age_max) p.CHIKU = String(cond.building_age_max)

  const qs = Object.keys(p).length > 0 ? `?${new URLSearchParams(p).toString()}` : ''
  return `${base}${qs}`
}

// -------------------------------------------------------
// LIFULL HOME'S
// -------------------------------------------------------
export function buildHomesUrl(cond: CustomerCondition): string {
  const isSale = cond.transaction_type !== 'rent'
  const ward   = extractWard(cond.area)
  const slug   = ward ? CITY_SLUGS[ward] : null
  const kodate = isKodate(cond.property_type)

  let path: string
  if (isSale) {
    path = kodate ? '/kodate/chuko/tokyo' : '/mansion/chuko/tokyo'
  } else {
    path = '/chintai/tokyo'
  }

  const areaSegment = slug ? `/${slug}` : ''
  const base = `https://www.homes.co.jp${path}${areaSegment}/list/`

  const p: Record<string, string> = {}

  if (isSale) {
    if (cond.budget_min) p.priceMin = String(cond.budget_min)
    if (cond.budget_max) p.priceMax = String(cond.budget_max)
  } else {
    // HOME'S 賃料は万円単位
    if (cond.rent_min) p.priceMin = String(cond.rent_min)
    if (cond.rent_max) p.priceMax = String(cond.rent_max)
  }

  if (cond.area_sqm_min) p.areaMin = String(Math.floor(cond.area_sqm_min))
  if (cond.walk_minutes_max) p.tsuukin = String(cond.walk_minutes_max)
  if (cond.building_age_max) p.chiku = String(cond.building_age_max)

  const qs = Object.keys(p).length > 0 ? `?${new URLSearchParams(p).toString()}` : ''
  return `${base}${qs}`
}

// -------------------------------------------------------
// 統合エントリポイント
// -------------------------------------------------------
export type SiteKey = 'suumo' | 'athome' | 'homes'

export function buildSearchUrl(site: SiteKey, cond: CustomerCondition): string {
  switch (site) {
    case 'suumo':  return buildSuumoUrl(cond)
    case 'athome': return buildAthomeUrl(cond)
    case 'homes':  return buildHomesUrl(cond)
  }
}
