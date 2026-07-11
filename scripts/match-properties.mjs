#!/usr/bin/env node
/**
 * scripts/match-properties.mjs
 * properties テーブル全件を顧客条件と照合し、詳細レポートを出力する
 *
 * 使い方:
 *   node scripts/match-properties.mjs
 *   node scripts/match-properties.mjs --customer 八矢様
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const envText = readFileSync(resolve(__dir, '../.env.local'), 'utf8')
const env = Object.fromEntries(
  envText.split('\n').filter(l => l.includes('=')).map(l => {
    const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]
  })
)
const SB  = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H   = { apikey: KEY, Authorization: `Bearer ${KEY}` }

const CURRENT_YEAR  = new Date().getFullYear()   // 2026
const CURRENT_MONTH = new Date().getMonth() + 1  // 1-12

const args      = process.argv.slice(2)
const getArg    = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }
const CUST_FILTER = getArg('--customer')

// ── Supabase ──────────────────────────────────────────────────
async function sbGet(path) {
  const r = await fetch(`${SB}/rest/v1/${path}`, { headers: H })
  if (!r.ok) throw new Error(`GET ${path}: ${r.status} ${await r.text()}`)
  return r.json()
}

// ── 築年数計算 ────────────────────────────────────────────────
/**
 * built_year（西暦年）から築年数を計算
 * 築年月がある場合はより正確に計算
 * @returns {number|null} 築年数（不明の場合 null）
 */
function calcBuildingAge(builtYear, builtMonth) {
  if (!builtYear) return null
  const age = CURRENT_YEAR - builtYear
  // 月情報がある場合、今月より後なら1年引く（まだその年になっていない）
  if (builtMonth && builtMonth > CURRENT_MONTH) return age - 1
  return age
}

// ── 照合ロジック ──────────────────────────────────────────────
/**
 * 売買の必須項目チェック。不明な項目名のリストを返す。
 */
function missingSaleFields(prop) {
  const missing = []
  if (!prop.price)         missing.push('price')
  if (!prop.area_sqm)      missing.push('area_sqm')
  if (!prop.walk_minutes)  missing.push('walk_minutes')
  if (!prop.built_year)    missing.push('built_year')
  return missing
}

/**
 * 賃貸の必須項目チェック。不明な項目名のリストを返す。
 */
function missingRentFields(prop) {
  const missing = []
  if (!prop.monthly_rent)  missing.push('monthly_rent')
  if (!prop.area_sqm)      missing.push('area_sqm')
  if (!prop.walk_minutes)  missing.push('walk_minutes')
  if (!prop.built_year)    missing.push('built_year')
  return missing
}

/**
 * 物件1件と顧客条件を照合し、結果を返す
 *
 * status:
 *   MATCH             — 全必須項目取得済み・全条件一致
 *   NO_MATCH          — 全必須項目取得済み・条件不一致
 *   NEED_MANUAL_CHECK — 必須項目のいずれかが未取得
 *   UNKNOWN_AGE       — built_year=null（NEED_MANUAL_CHECKのサブケース、互換維持）
 */
function matchProperty(prop, cond) {
  const txType   = cond.transaction_type ?? 'sale'
  const reasons  = []
  const warnings = []

  // ① transaction_type
  if (prop.transaction_type !== txType) {
    return {
      matched: false, status: 'NO_MATCH',
      reasons: [`transaction_type不一致(物件:${prop.transaction_type}≠条件:${txType})`],
      warnings, missingFields: [],
      buildingAge: null, totalMonthlyCost: null, priceBasis: null,
    }
  }

  // ② 必須項目の欠損チェック → NEED_MANUAL_CHECK
  const missingFields = txType === 'sale' ? missingSaleFields(prop) : missingRentFields(prop)
  if (missingFields.length > 0) {
    // built_year のみ欠損の場合は旧互換で UNKNOWN_AGE ラベルも付与
    const status = missingFields.includes('built_year') && missingFields.length === 1
      ? 'UNKNOWN_AGE'
      : 'NEED_MANUAL_CHECK'
    return {
      matched: false, status,
      reasons: missingFields.map(f => `必須項目未取得: ${f}`),
      warnings, missingFields,
      buildingAge: null, totalMonthlyCost: null, priceBasis: null,
    }
  }

  // ── 以下、全必須項目が揃っている場合のみ判定 ──
  let allMatch = true

  // ③ 築年数
  const buildingAge = calcBuildingAge(prop.built_year, prop.built_month)
  const maxAge = cond.building_age_max
  if (maxAge && buildingAge > maxAge) {
    reasons.push(`築年数超過（築${buildingAge}年 > 上限${maxAge}年）`)
    allMatch = false
  }

  // ④ 面積
  const minArea = cond.area_sqm_min
  if (minArea && prop.area_sqm < minArea) {
    reasons.push(`面積不足（${prop.area_sqm}㎡ < 下限${minArea}㎡）`)
    allMatch = false
  }

  // ⑤ 徒歩分数
  const maxWalk = cond.walk_minutes_max
  if (maxWalk && prop.walk_minutes > maxWalk) {
    reasons.push(`徒歩超過（${prop.walk_minutes}分 > 上限${maxWalk}分）`)
    allMatch = false
  }

  // ⑥ 価格
  let totalMonthlyCost = null
  let priceBasis = null

  if (txType === 'sale') {
    const price = prop.price
    priceBasis = `売買価格 ${price}万円`
    if (cond.budget_min && price < cond.budget_min) {
      reasons.push(`価格下限未満（${price}万円 < ${cond.budget_min}万円）`)
      allMatch = false
    }
    if (cond.budget_max && price > cond.budget_max) {
      reasons.push(`価格超過（${price}万円 > ${cond.budget_max}万円）`)
      allMatch = false
    }
  } else {
    const rentYen = prop.monthly_rent
    const mgmtYen = prop.management_fee ?? null
    const rentMan  = rentYen / 10000
    const mgmtMan  = mgmtYen ? mgmtYen / 10000 : null
    totalMonthlyCost = mgmtYen ? rentYen + mgmtYen : rentYen

    priceBasis = `賃料 ${rentMan.toFixed(1)}万円/月`
    if (mgmtMan) {
      priceBasis += ` + 管理費 ${mgmtMan.toFixed(1)}万円 = 合計 ${(totalMonthlyCost / 10000).toFixed(1)}万円/月`
      warnings.push(`management_fee_unknown=false: 管理費込み総額 ${(totalMonthlyCost/10000).toFixed(1)}万円/月（判定は賃料のみ）`)
    } else {
      warnings.push('management_fee_unknown=true: 管理費不明（賃料のみで判定）')
    }

    const maxRentYen = (cond.rent_max ?? 0) * 10000
    const minRentYen = (cond.rent_min ?? 0) * 10000
    if (maxRentYen && rentYen > maxRentYen) {
      reasons.push(`賃料超過（${rentMan.toFixed(1)}万円 > 上限${cond.rent_max}万円）`)
      allMatch = false
    }
    if (minRentYen && rentYen < minRentYen) {
      reasons.push(`賃料下限未満（${rentMan.toFixed(1)}万円 < 下限${cond.rent_min}万円）`)
      allMatch = false
    }
  }

  return {
    matched: allMatch,
    status: allMatch ? 'MATCH' : 'NO_MATCH',
    reasons, warnings, missingFields: [],
    buildingAge, totalMonthlyCost, priceBasis,
  }
}

// ── レポート出力 ───────────────────────────────────────────────
function fmtPrice(prop, txType) {
  if (txType === 'sale') return prop.price ? `${prop.price}万円` : '不明'
  const r = prop.monthly_rent ? (prop.monthly_rent/10000).toFixed(1) : '?'
  return `${r}万円/月`
}

function fmtMgmt(prop) {
  return prop.management_fee ? `${(prop.management_fee/10000).toFixed(1)}万円` : '-'
}

function fmtTotal(totalMonthlyCost) {
  return totalMonthlyCost ? `${(totalMonthlyCost/10000).toFixed(1)}万円/月` : '-'
}

// ── customer_property_sources からソース物件IDセットを取得 ────────
async function getSourcedPropertyIds(customerId) {
  try {
    const rows = await sbGet(
      `customer_property_sources?customer_id=eq.${customerId}&select=property_id,area_id,search_url&limit=2000`
    )
    return rows  // [{ property_id, area_id, search_url }]
  } catch (e) {
    if (e.message.includes('customer_property_sources') || e.message.includes('42P01')) {
      return null  // テーブル未存在 → ソースフィルタ無効
    }
    throw e
  }
}

// ── メイン ─────────────────────────────────────────────────────
;(async () => {
  const custs   = await sbGet('customers?select=id,name')
  const custMap = new Map(custs.map(c => [c.id, c.name]))
  const conds   = await sbGet(
    'customer_conditions?select=customer_id,area,transaction_type,budget_min,budget_max,area_sqm_min,walk_minutes_max,building_age_max,rent_min,rent_max'
  )

  // 全物件を取得
  const all = await sbGet(
    'properties?select=id,site,name,address,price,monthly_rent,management_fee,area_sqm,floor_plan,built_year,built_month,walk_minutes,url,transaction_type,dedup_key&limit=2000&order=transaction_type,price.asc'
  )
  console.log(`\n📦 properties総数: ${all.length}件 (sale=${all.filter(p=>p.transaction_type==='sale').length} rent=${all.filter(p=>p.transaction_type==='rent').length})`)

  for (const cond of conds) {
    const custName = custMap.get(cond.customer_id)
    if (!custName) continue
    if (CUST_FILTER && custName !== CUST_FILTER) continue

    const txType   = cond.transaction_type ?? 'sale'
    const areaText = cond.area ?? ''

    console.log(`\n${'═'.repeat(70)}`)
    console.log(`👤 ${custName} — ${txType === 'rent' ? '賃貸' : '売買'}`)
    console.log(`   エリア: ${areaText}`)
    if (txType === 'rent') {
      console.log(`   賃料: ${cond.rent_min ?? '-'}〜${cond.rent_max ?? '-'}万円/月`)
    } else {
      console.log(`   予算: ${cond.budget_min ?? '-'}〜${cond.budget_max ?? '-'}万円`)
    }
    console.log(`   面積: ${cond.area_sqm_min ?? '-'}㎡以上  徒歩: ${cond.walk_minutes_max ?? '-'}分以内  築: ${cond.building_age_max ?? '-'}年以内`)

    // ── customer_property_sources でエリアフィルタ ──────────────
    const custId = cond.customer_id
    const sources = await getSourcedPropertyIds(custId)
    const hasSourceTable = sources !== null

    let scopedProps      // この顧客向け検索から取得した物件
    let outOfScopeProps  // エリア外物件

    if (hasSourceTable && sources.length > 0) {
      const sourceSet = new Set(sources.map(s => s.property_id))
      const allTx = all.filter(p => p.transaction_type === txType)
      scopedProps     = allTx.filter(p => sourceSet.has(p.id))
      outOfScopeProps = allTx.filter(p => !sourceSet.has(p.id))
      console.log(`   ソーステーブル: ${sources.length}件のソース記録 → 対象: ${scopedProps.length}件 / エリア外: ${outOfScopeProps.length}件`)
    } else {
      // テーブル未存在またはソース未記録 → 全件照合（後方互換）
      scopedProps     = all.filter(p => p.transaction_type === txType)
      outOfScopeProps = []
      if (!hasSourceTable) {
        console.log(`   ⚠️  customer_property_sourcesテーブル未存在: 全件照合モード（エリアフィルタ無効）`)
      } else {
        console.log(`   ⚠️  ソース未記録: 全件照合モード（次回クロール後に自動フィルタ有効化）`)
      }
    }

    // 対象物件（エリア内）を照合
    const results = scopedProps.map(p => ({ prop: p, ...matchProperty(p, cond) }))

    const matchList   = results.filter(r => r.status === 'MATCH')
    const needManual  = results.filter(r => r.status === 'NEED_MANUAL_CHECK' || r.status === 'UNKNOWN_AGE')
    const noMatch     = results.filter(r => r.status === 'NO_MATCH')

    // NO_MATCH除外理由別カウント
    const reasonCount = {}
    for (const r of noMatch) {
      for (const reason of r.reasons) {
        const key = reason.split('（')[0]
        reasonCount[key] = (reasonCount[key] ?? 0) + 1
      }
    }

    // NEED_MANUAL_CHECK: 未取得項目別カウント
    const missingCount = {}
    for (const r of needManual) {
      for (const f of r.missingFields) {
        missingCount[f] = (missingCount[f] ?? 0) + 1
      }
    }

    console.log(`\n   ▶ 照合結果: 対象${scopedProps.length}件${outOfScopeProps.length ? ` (AREA_OUT_OF_SCOPE: ${outOfScopeProps.length}件を除外)` : ''}`)
    console.log(`     ✅ MATCH（条件一致）:            ${matchList.length}件`)
    console.log(`     ❌ NO_MATCH（条件不一致）:       ${noMatch.length}件`)
    console.log(`     🔍 NEED_MANUAL_CHECK（要確認）:  ${needManual.length}件`)

    if (Object.keys(reasonCount).length) {
      console.log(`\n   ▶ NO_MATCH除外理由別:`)
      for (const [reason, cnt] of Object.entries(reasonCount)) {
        console.log(`     - ${reason}: ${cnt}件`)
      }
    }

    if (Object.keys(missingCount).length) {
      console.log(`\n   ▶ NEED_MANUAL_CHECK 未取得項目別:`)
      for (const [field, cnt] of Object.entries(missingCount)) {
        console.log(`     - ${field}不明: ${cnt}件`)
      }
    }

    // ── MATCH 物件一覧 ──────────────────────────────────────────
    console.log(`\n   ▶ ✅ 条件一致物件 MATCH (${matchList.length}件):`)
    if (matchList.length === 0) {
      console.log('     (なし)')
    } else {
      for (const { prop: p, buildingAge, totalMonthlyCost, priceBasis, warnings } of matchList) {
        const priceStr = fmtPrice(p, txType)
        const mgmtStr  = fmtMgmt(p)
        const totalStr = fmtTotal(totalMonthlyCost)
        const builtStr = `${p.built_year}年${p.built_month ? p.built_month + '月' : ''}（築${buildingAge}年）`

        console.log(`\n   ┌─ ${p.name ?? '(名称不明)'}`)
        console.log(`   │  価格:  ${priceStr}`)
        if (txType === 'rent') {
          console.log(`   │  管理費: ${mgmtStr}`)
          console.log(`   │  総月額: ${totalStr}`)
          console.log(`   │  判定基準: ${priceBasis}`)
        }
        console.log(`   │  面積:  ${p.area_sqm}㎡  間取り: ${p.floor_plan ?? '-'}`)
        console.log(`   │  建築年月: ${builtStr}`)
        console.log(`   │  徒歩:  ${p.walk_minutes}分  住所: ${p.address ?? '-'}`)
        console.log(`   │  ポータル: ${p.site}`)
        if (warnings.length) console.log(`   │  ⚠️  ${warnings.join(' / ')}`)
        console.log(`   └─ ${p.url}`)
      }
    }

    // ── NEED_MANUAL_CHECK 物件一覧 ──────────────────────────────
    console.log(`\n   ▶ 🔍 手動確認物件 NEED_MANUAL_CHECK (${needManual.length}件):`)
    if (needManual.length === 0) {
      console.log('     (なし)')
    } else {
      for (const { prop: p, missingFields } of needManual) {
        const priceStr = fmtPrice(p, txType)
        const builtStr = p.built_year
          ? `${p.built_year}年${p.built_month ? p.built_month + '月' : ''}`
          : '不明'
        console.log(`\n   ┌─ ${p.name ?? '(名称不明)'}`)
        console.log(`   │  価格:  ${priceStr}  面積: ${p.area_sqm ?? '不明'}㎡  徒歩: ${p.walk_minutes ?? '不明'}分`)
        console.log(`   │  建築年月: ${builtStr}  住所: ${p.address ?? '-'}`)
        console.log(`   │  未取得項目: ${missingFields.join(', ')}`)
        console.log(`   └─ ${p.url}`)
      }
    }

    // 不一致サンプル（築年数超過のみ抜粋）
    const ageExcluded = noMatch.filter(r => r.reasons.some(s => s.startsWith('築年数超過')))
    if (ageExcluded.length) {
      console.log(`\n   ▶ 築年数超過の例:`)
      ageExcluded.slice(0, 5).forEach(({ prop: p, buildingAge }) => {
        console.log(`     - ${p.name} | 築${p.built_year}年 → 築${buildingAge}年（${cond.building_age_max}年超過）`)
      })
    }
  }

  console.log(`\n${'═'.repeat(70)}`)
  console.log('✅ 照合完了')
})().catch(e => { console.error('❌', e.message); process.exit(1) })
