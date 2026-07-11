#!/usr/bin/env node
/**
 * npm run debug:url-generation
 * area_masters 全件 × 3ポータルの URL生成パラメータ欠落チェック
 * Node.js 20 対応: fetch のみ使用（supabase-js不使用）
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// .env.local を手動読み込み
const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../.env.local')
try {
  const env = readFileSync(envPath, 'utf8')
  for (const line of env.split('\n')) {
    const [k, ...vs] = line.split('=')
    if (k && vs.length) process.env[k.trim()] = vs.join('=').trim()
  }
} catch { /* .env.local がない場合は環境変数に頼る */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL / SUPABASE_KEY が未設定です')
  process.exit(1)
}

// ── Supabase REST ヘルパー ──────────────────────────────────────────────
const headers = {
  apikey:        SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

async function supabaseSelect(table, queryString = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${queryString}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`)
  return res.json()
}

// ── URL 生成ロジック（portalUrlBuilder.ts の CLI 用複製） ──────────────
const TEST_COND = { priceMin: 5000, priceMax: 7000, areaMin: 60, walk: 15, age: 25 }

function buildSuumoUrl(param, cond) {
  const type = param.param_type
  if (type === 'station_path' || type === 'path') {
    const base = `https://suumo.jp/ms/chuko/${param.portal_url_param}/`
    const qs = new URLSearchParams({
      kb: '1', ku: '9999999', mb: String(cond.areaMin), mt: '9999999',
      et: String(cond.walk), cn: String(cond.age), shkr1: '03', shkr2: '03',
      shkr3: '03', shkr4: '03', shkr5: '03', ar: '030', bs: '010',
    })
    return `${base}?${qs}`
  }
  if (type === 'city_path') {
    const base = `https://suumo.jp/ms/chuko/${param.portal_url_param}/`
    const qs = new URLSearchParams({
      kb: '1', ku: '9999999', mb: String(cond.areaMin), mt: '9999999',
      et: String(cond.walk), cn: String(cond.age), shkr1: '03', shkr2: '03',
      shkr3: '03', shkr4: '03', shkr5: '03', ar: '030', bs: '010',
    })
    return `${base}?${qs}`
  }
  if (type === 'query') {
    const qs = new URLSearchParams({
      ...Object.fromEntries(param.portal_url_param.split('&').map(p => p.split('='))),
      kb: '1', ku: '9999999', mb: String(cond.areaMin), mt: '9999999',
      et: String(cond.walk), cn: String(cond.age), shkr1: '03', shkr2: '03',
      shkr3: '03', shkr4: '03', shkr5: '03', ar: '030', bs: '010',
    })
    return `https://suumo.jp/jj/bukken/ichiran/JJ010FJ001/?${qs}`
  }
  return null
}

function buildPathPortalUrl(portal, param, cond) {
  const base = portal === 'athome'
    ? `https://www.athome.co.jp/mansion/chuko${param.portal_url_param}/list/`
    : `https://www.homes.co.jp/mansion/chuko${param.portal_url_param}/list/`
  const qs = portal === 'athome'
    ? new URLSearchParams({
        PRICE: `${cond.priceMin * 10000}-${cond.priceMax * 10000}`,
        FLOOR_PLAN: '', MENSEKI: `${cond.areaMin}-`,
        WALK: String(cond.walk), BLDYEAR: `${2026 - cond.age}-`,
      })
    : new URLSearchParams({
        priceMin: String(cond.priceMin), priceMax: String(cond.priceMax),
        floorPlanMin: '1', areaMin: String(cond.areaMin),
        walkMin: String(cond.walk), buildYearMin: String(2026 - cond.age),
      })
  return `${base}?${qs}`
}

function generateUrl(portal, param, cond) {
  if (portal === 'suumo') return buildSuumoUrl(param, cond)
  return buildPathPortalUrl(portal, param, cond)
}

function suggestParam(master, portal) {
  const name = master.display_name
  const pref = master.prefecture === '神奈川県' ? 'kanagawa' : 'tokyo'
  const slug = name
    .replace(/駅$/, '').replace(/区$/, '').replace(/市$/, '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '-')

  if (portal === 'suumo') {
    if (master.area_type === 'station') {
      return { paramType: 'station_path', paramValue: `${pref}/eki_${slug}` }
    }
    if (master.area_type === 'ward' || master.area_type === 'city') {
      return { paramType: 'city_path', paramValue: `${pref}/${slug}` }
    }
    return { paramType: 'query', paramValue: `ta=&sc=` }
  }

  const pathSlug = master.area_type === 'station'
    ? `/${pref}/${slug}-station`
    : `/${pref}/${slug}`
  return { paramType: 'station_path', paramValue: pathSlug }
}

function checkCondition(url, cond) {
  if (!url) return false
  const checks = [
    url.includes(String(cond.areaMin)),
    url.includes(String(cond.walk)),
    url.includes(String(cond.age)) || url.includes(String(2026 - cond.age)),
    url.includes(String(cond.priceMin)) || url.includes(String(cond.priceMin * 10000)),
    url.includes(String(cond.priceMax)) || url.includes(String(cond.priceMax * 10000)),
  ]
  return checks.every(Boolean)
}

// ── メイン ────────────────────────────────────────────────────────────────
const PORTALS = ['suumo', 'athome', 'homes']
const STATUS_ICON = {
  OK:                      '✅',
  PARAM_MISSING:           '❌',
  URL_INVALID:             '🔴',
  NEED_MANUAL_CHECK:       '⚠️',
  CONDITION_NOT_REFLECTED: '⚠️',
}

;(async () => {
  console.log('🔍 URL生成デバッグ — 全件チェック開始')
  console.log(`   テスト条件: 売買 ${TEST_COND.priceMin}〜${TEST_COND.priceMax}万円 / ${TEST_COND.areaMin}㎡以上 / 徒歩${TEST_COND.walk}分 / 築${TEST_COND.age}年以内\n`)

  const masters = await supabaseSelect('area_masters',
    'select=id,area_type,display_name,prefecture,line_name' +
    '&prefecture=in.(東京都,神奈川県)' +
    '&order=prefecture,area_type,display_name'
  )
  console.log(`   area_masters: ${masters.length} 件`)

  // portal_area_params を一括取得（1000件ずつ）
  let params = []
  let offset = 0
  const CHUNK = 1000
  while (true) {
    const chunk = await supabaseSelect('portal_area_params',
      `select=area_id,portal,param_type,portal_url_param,verified,notes&limit=${CHUNK}&offset=${offset}`
    )
    params = [...params, ...chunk]
    if (chunk.length < CHUNK) break
    offset += CHUNK
  }
  console.log(`   portal_area_params: ${params.length} 件\n`)

  // area_id → params[] マップ
  const paramMap = new Map()
  for (const p of params) {
    const list = paramMap.get(p.area_id) ?? []
    list.push(p)
    paramMap.set(p.area_id, list)
  }

  // 集計
  const missingItems = []
  const byPortal = { suumo: { ok: 0, missing: 0 }, athome: { ok: 0, missing: 0 }, homes: { ok: 0, missing: 0 } }

  for (const master of masters) {
    const areaParams = paramMap.get(master.id) ?? []
    for (const portal of PORTALS) {
      const param = areaParams.find(p => p.portal === portal)
      if (!param) {
        byPortal[portal].missing++
        const suggested = suggestParam(master, portal)
        missingItems.push({ master, portal, suggested })
      } else {
        byPortal[portal].ok++
      }
    }
  }

  // サマリー
  console.log('📊 ポータル別サマリー')
  console.log('─'.repeat(60))
  for (const portal of PORTALS) {
    const { ok, missing } = byPortal[portal]
    const icon = missing === 0 ? '✅' : '❌'
    console.log(`  ${icon} ${portal.padEnd(8)}: OK ${String(ok).padStart(3)} 件 / 未登録 ${String(missing).padStart(3)} 件`)
  }

  const totalMissing = missingItems.length
  console.log(`\n  合計未登録: ${totalMissing} 件 / 全 ${masters.length * 3} ポータルパラメータ中`)

  if (totalMissing === 0) {
    console.log('\n✅ 全エリアの portal_area_params が揃っています。')
    return
  }

  // 欠落一覧
  console.log('\n❌ 未登録一覧（上位20件）')
  console.log('─'.repeat(80))
  const show = missingItems.slice(0, 20)
  for (const { master, portal, suggested } of show) {
    console.log(`  ${master.display_name} (${master.area_type} / ${master.prefecture}) → ${portal}`)
    console.log(`    推測: type=${suggested.paramType}, value="${suggested.paramValue}"`)
  }
  if (missingItems.length > 20) {
    console.log(`  ... 他 ${missingItems.length - 20} 件`)
  }

  // INSERT SQL 生成
  console.log('\n📝 修正用 INSERT SQL（コピーして Supabase Dashboard で実行）')
  console.log('─'.repeat(80))
  const sqlLines = ['-- 以下を Supabase Dashboard の SQL Editor に貼り付けて実行してください']
  sqlLines.push('-- verified=false で登録後、URLを目視確認して verified=true に更新してください\n')
  for (const { master, portal, suggested } of missingItems) {
    sqlLines.push(
      `INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes)`,
      `SELECT id, '${portal}', '${suggested.paramType}', '${suggested.paramValue}', false, '要確認：推測URL自動生成'`,
      `FROM area_masters WHERE id = '${master.id}';  -- ${master.display_name}`,
      ''
    )
  }
  const sql = sqlLines.join('\n')

  // SQL をファイルに保存
  const { writeFileSync } = await import('fs')
  const outPath = resolve(__dir, '../supabase/fix_missing_portal_params.sql')
  writeFileSync(outPath, sql, 'utf8')
  console.log(`\n💾 SQL を保存しました: supabase/fix_missing_portal_params.sql`)
  console.log(`   (${missingItems.length} 件の INSERT 文)`)

  console.log('\n完了。')
})().catch(err => {
  console.error('❌', err.message)
  process.exit(1)
})
