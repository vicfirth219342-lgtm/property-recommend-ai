#!/usr/bin/env node
/**
 * scripts/validate-urls.mjs
 * 実URLアクセスによるポータルURL有効性確認スクリプト
 *
 * 確認内容:
 *   - HTTP 200 で開けるか
 *   - リダイレクトされていないか（最終URLが期待パスを含むか）
 *   - 検索結果ページとして成立しているか（件数/物件カード）
 *   - 物件0件ではないか
 *
 * 結果に応じて portal_area_params を更新:
 *   - OK → verified=true, notes='URL確認済み YYYY-MM-DD'
 *   - URL_INVALID / ZERO_RESULTS / NEED_MANUAL_CHECK → notes に詳細を記録
 *
 * 使い方:
 *   node scripts/validate-urls.mjs --areas 新丸子,武蔵小杉,武蔵中原
 *   node scripts/validate-urls.mjs --areas 新丸子 --portal suumo
 *   node scripts/validate-urls.mjs --limit 20              # verified=false 上位N件
 *   node scripts/validate-urls.mjs --dry-run               # DBを更新せず結果表示のみ
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const envText = readFileSync(resolve(__dir, '../.env.local'), 'utf8')
const envMap = {}
for (const line of envText.split('\n')) {
  const [k, ...vs] = line.split('=')
  if (k && vs.length) envMap[k.trim()] = vs.join('=').trim()
}

const SUPABASE_URL = envMap['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_KEY = envMap['SUPABASE_SERVICE_ROLE_KEY']
const HEADERS_SB   = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' }

// ── CLI 引数パース ─────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null }
const hasFlag = (flag) => args.includes(flag)

const AREA_NAMES  = getArg('--areas')?.split(',').map(s => s.trim()) ?? []
const PORTAL_FILTER = getArg('--portal') ?? null     // suumo / athome / homes
const LIMIT       = parseInt(getArg('--limit') ?? '0')
const DRY_RUN     = hasFlag('--dry-run')
const DELAY_MS    = parseInt(getArg('--delay') ?? '1200')  // ポータル負荷軽減

// ── Supabase REST ──────────────────────────────────────────────
async function sbGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: HEADERS_SB })
  if (!r.ok) throw new Error(`GET ${path}: ${r.status}`)
  return r.json()
}

async function sbPatch(table, id, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...HEADERS_SB, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`PATCH ${table}#${id}: ${r.status}`)
}

// portal_area_params にはidがない → area_id+portal+param_type で特定
async function sbPatchParam(areaId, portal, paramType, body) {
  const qs = `area_id=eq.${areaId}&portal=eq.${portal}&param_type=eq.${paramType}`
  const r = await fetch(`${SUPABASE_URL}/rest/v1/portal_area_params?${qs}`, {
    method: 'PATCH',
    headers: { ...HEADERS_SB, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`PATCH portal_area_params: ${r.status} ${await r.text()}`)
}

// ── URL生成（urlDebug.ts の CLI版） ───────────────────────────
const TC = { priceMin: 5000, priceMax: 7000, areaMin: 60, walk: 15, age: 25 }

function buildUrl(portal, param) {
  const v = param.portal_url_param
  if (portal === 'suumo') {
    if (/^[a-z]+\/eki_[a-z0-9_-]+$/.test(v) || /^[a-z]+\/[a-z0-9_-]+$/.test(v)) {
      return `https://suumo.jp/ms/chuko/${v}/?kb=${TC.priceMin}&kt=${TC.priceMax}&mb=${TC.areaMin}&ekk=${TC.walk}&cn=${TC.age}`
    }
    const sp = new URLSearchParams(v)
    const ta = sp.get('ta') ?? '13'
    const sc = sp.get('sc') ?? ''
    return `https://suumo.jp/jj/bukken/ichiran/JJ010FJ001/?ar=030&bs=010&ta=${ta}${sc ? '&sc='+sc : ''}&tc=0300101&kb=${TC.priceMin}&kt=${TC.priceMax}&mb=${TC.areaMin}&ekk=${TC.walk}&cn=${TC.age}`
  }
  if (portal === 'athome') {
    return `https://www.athome.co.jp/mansion/chuko${v}/list/?PRICE=${TC.priceMin}-${TC.priceMax}&MENSEKI=${TC.areaMin}-&TIKO=${TC.walk}&CHIKU=${TC.age}`
  }
  if (portal === 'homes') {
    return `https://www.homes.co.jp/mansion/chuko${v}/list/?priceMin=${TC.priceMin}&priceMax=${TC.priceMax}&areaMin=${TC.areaMin}&tsuukin=${TC.walk}&chiku=${TC.age}`
  }
  return null
}

// ── HTTPアクセス確認 ───────────────────────────────────────────
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

// ポータルごとの「有効な検索結果ページ」判定パターン
const VALID_PATTERNS = {
  suumo:  [/\d+件/, /物件情報/, /中古マンション/],
  athome: [/\d+件/, /物件一覧/, /中古マンション/],
  homes:  [/\d+件/, /物件一覧/, /中古マンション/, /LIFULL HOME'S/],
}

const ZERO_PATTERNS = {
  suumo:  [/0件/, /該当する物件はありません/, /見つかりません/],
  athome: [/0件/, /該当する物件はありません/, /見つかりません/],
  homes:  [/0件/, /該当する物件はありません/, /見つかりません/],
}

async function validateUrl(portal, url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'ja,en;q=0.9' },
      redirect: 'follow',
      signal: ctrl.signal,
    })
    clearTimeout(timer)

    const finalUrl = res.url
    const status   = res.status

    if (status !== 200) {
      return { result: 'URL_INVALID', detail: `HTTP ${status}`, finalUrl }
    }

    // リダイレクト先がトップページ・エラーページに飛んでいないか
    const redirectedToTop = (
      finalUrl === 'https://suumo.jp/' ||
      finalUrl === 'https://www.athome.co.jp/' ||
      finalUrl === 'https://www.homes.co.jp/' ||
      /\/(error|404|notfound)/i.test(finalUrl)
    )
    if (redirectedToTop) {
      return { result: 'URL_INVALID', detail: `トップページへリダイレクト: ${finalUrl}`, finalUrl }
    }

    const html = await res.text()

    // 0件チェック（先に判定）
    for (const pat of ZERO_PATTERNS[portal] ?? []) {
      if (pat.test(html)) {
        return { result: 'ZERO_RESULTS', detail: '0件または物件なし', finalUrl }
      }
    }

    // 有効ページパターン確認
    const validHits = (VALID_PATTERNS[portal] ?? []).filter(p => p.test(html))
    if (validHits.length >= 1) {
      // 件数を抽出
      const countMatch = html.match(/(\d[\d,]+)\s*件/)
      const count = countMatch ? countMatch[1] : '?'
      return { result: 'OK', detail: `${count}件 検索結果ページ確認`, finalUrl }
    }

    return { result: 'NEED_MANUAL_CHECK', detail: '有効パターン未検出（要目視確認）', finalUrl }

  } catch (e) {
    clearTimeout(timer)
    if (e.name === 'AbortError') return { result: 'CRAWL_FAILED', detail: 'タイムアウト(15s)', finalUrl: url }
    return { result: 'CRAWL_FAILED', detail: e.message, finalUrl: url }
  }
}

// ── メイン ────────────────────────────────────────────────────
const TODAY = new Date().toISOString().slice(0, 10)

;(async () => {
  console.log(`\n🔍 URL実アクセス確認スクリプト ${DRY_RUN ? '[DRY RUN]' : ''}`)
  console.log(`   テスト条件: ${TC.priceMin}〜${TC.priceMax}万円 / ${TC.areaMin}㎡ / 徒歩${TC.walk}分 / 築${TC.age}年\n`)

  // ── 対象パラメータを取得 ───────────────────────────────────
  let targetParams = []

  if (AREA_NAMES.length > 0) {
    // エリア名指定
    const nameFilter = AREA_NAMES.map(n => `"${n}"`).join(',')
    const masters = await sbGet(
      `area_masters?select=id,display_name,area_type,prefecture&display_name=in.(${nameFilter})&prefecture=in.(東京都,神奈川県)`
    )
    if (!masters.length) { console.error('指定エリアが見つかりません:', AREA_NAMES); process.exit(1) }

    console.log(`対象エリア: ${masters.map(m => m.display_name).join(', ')}`)

    for (const master of masters) {
      let q = `portal_area_params?select=area_id,portal,param_type,portal_url_param,verified,notes&area_id=eq.${master.id}`
      if (PORTAL_FILTER) q += `&portal=eq.${PORTAL_FILTER}`
      const params = await sbGet(q)
      targetParams.push(...params.map(p => ({ ...p, display_name: master.display_name, area_type: master.area_type, prefecture: master.prefecture })))
    }
  } else {
    // verified=false 全件（優先順: athome → homes → suumo）
    let q = 'portal_area_params?select=area_id,portal,param_type,portal_url_param,verified,notes&verified=eq.false&order=portal'
    if (PORTAL_FILTER) q += `&portal=eq.${PORTAL_FILTER}`
    if (LIMIT) q += `&limit=${LIMIT}`
    const params = await sbGet(q)

    // display_name を area_masters から補完
    const ids = [...new Set(params.map(p => p.area_id))]
    const masters = await sbGet(`area_masters?select=id,display_name,area_type,prefecture&id=in.(${ids.join(',')})`)
    const mMap = new Map(masters.map(m => [m.id, m]))

    targetParams = params.map(p => {
      const m = mMap.get(p.area_id) ?? {}
      return { ...p, display_name: m.display_name, area_type: m.area_type, prefecture: m.prefecture }
    })
  }

  if (!targetParams.length) { console.log('対象パラメータなし'); process.exit(0) }
  console.log(`確認対象: ${targetParams.length} 件\n`)

  // ── 各URLをアクセス確認 ───────────────────────────────────
  const summary = { OK: 0, ZERO_RESULTS: 0, URL_INVALID: 0, CRAWL_FAILED: 0, NEED_MANUAL_CHECK: 0 }
  const rows = []

  for (const param of targetParams) {
    const url = buildUrl(param.portal, param)
    if (!url) {
      console.log(`⚠️  URL生成失敗: ${param.display_name} / ${param.portal}`)
      continue
    }

    process.stdout.write(`  ${param.display_name} [${param.portal}] ... `)
    const { result, detail, finalUrl } = await validateUrl(param.portal, url)

    const icon = result === 'OK' ? '✅' : result === 'ZERO_RESULTS' ? '🟡' : result === 'CRAWL_FAILED' ? '🔴' : result === 'URL_INVALID' ? '❌' : '⚠️'
    console.log(`${icon} ${result}  ${detail}`)
    if (finalUrl !== url) console.log(`     → リダイレクト先: ${finalUrl}`)

    summary[result] = (summary[result] ?? 0) + 1
    rows.push({ param, url, result, detail, finalUrl })

    // DB更新
    if (!DRY_RUN) {
      const noteStr = `${result}: ${detail} [${TODAY}]`
      try {
        if (result === 'OK') {
          await sbPatchParam(param.area_id, param.portal, param.param_type, {
            verified: true,
            notes: `URL確認済み ${TODAY}`,
          })
        } else {
          await sbPatchParam(param.area_id, param.portal, param.param_type, {
            verified: false,
            notes: noteStr,
          })
        }
      } catch (e) {
        console.log(`     ⚠️  DB更新失敗: ${e.message}`)
      }
    }

    // ポータル負荷対策
    await new Promise(r => setTimeout(r, DELAY_MS))
  }

  // ── サマリー ──────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60))
  console.log('📊 確認結果サマリー')
  console.log(`  ✅ OK（verified=true に更新）: ${summary.OK ?? 0} 件`)
  console.log(`  🟡 ZERO_RESULTS:              ${summary.ZERO_RESULTS ?? 0} 件`)
  console.log(`  ❌ URL_INVALID:               ${summary.URL_INVALID ?? 0} 件`)
  console.log(`  🔴 CRAWL_FAILED:              ${summary.CRAWL_FAILED ?? 0} 件`)
  console.log(`  ⚠️  NEED_MANUAL_CHECK:         ${summary.NEED_MANUAL_CHECK ?? 0} 件`)
  if (DRY_RUN) console.log('\n  ⚠️  DRY RUN のため DB は更新されていません')
  else console.log('\n  ✅ DB更新完了')

  // 失敗一覧
  const failed = rows.filter(r => r.result !== 'OK')
  if (failed.length) {
    console.log('\n⚠️  要確認リスト:')
    for (const r of failed) {
      console.log(`  [${r.result}] ${r.param.display_name} / ${r.param.portal}: ${r.detail}`)
      console.log(`    ${r.url}`)
    }
  }
})().catch(e => { console.error('❌', e.message); process.exit(1) })
