import { CustomerCondition } from '@/types'

interface GeneratedUrls {
  suumo: string
  athome: string
  homes: string
}

// 万円→円変換
function man2en(man: number | null): number | null {
  return man ? man * 10000 : null
}

export function generateSearchUrls(condition: CustomerCondition): GeneratedUrls {
  const {
    area,
    property_type,
    budget_min,
    budget_max,
    area_sqm_min,
    area_sqm_max,
    walk_minutes_max,
    building_age_max,
  } = condition

  // ===== SUUMO =====
  const suumoParams = new URLSearchParams()
  suumoParams.set('ar', '030')     // 首都圏（デフォルト）
  suumoParams.set('bs', '011')     // 売買
  suumoParams.set('ta', '13')      // 東京都

  if (budget_min) suumoParams.set('pf', String(man2en(budget_min)))
  if (budget_max) suumoParams.set('pt', String(man2en(budget_max)))
  if (area_sqm_min) suumoParams.set('mf', String(area_sqm_min))
  if (area_sqm_max) suumoParams.set('mt', String(area_sqm_max))
  if (walk_minutes_max) suumoParams.set('et', String(walk_minutes_max))
  if (building_age_max) suumoParams.set('cnf', String(building_age_max))

  const suumoUrl = `https://suumo.jp/jj/bukken/ichiran/JJ012FC001/?${suumoParams.toString()}`

  // ===== アットホーム =====
  const athomeParams = new URLSearchParams()
  athomeParams.set('tp', '3') // 売買マンション

  if (budget_max) athomeParams.set('sp', String(budget_max))
  if (area_sqm_min) athomeParams.set('ts', String(area_sqm_min))
  if (walk_minutes_max) athomeParams.set('wr', String(walk_minutes_max))

  const athomeUrl = `https://www.athome.co.jp/mansion/chuko/13/list/?${athomeParams.toString()}`

  // ===== LIFULL HOME'S =====
  const homesParams = new URLSearchParams()
  homesParams.set('done', 'bukken')
  homesParams.set('lb', '13') // 東京都

  if (budget_max) homesParams.set('kk', String(budget_max))
  if (area_sqm_min) homesParams.set('ms', String(area_sqm_min))
  if (walk_minutes_max) homesParams.set('wr', String(walk_minutes_max))
  if (building_age_max) homesParams.set('ky', String(building_age_max))

  const homesUrl = `https://www.homes.co.jp/mansion/chuko/13/list/?${homesParams.toString()}`

  return { suumo: suumoUrl, athome: athomeUrl, homes: homesUrl }
}
