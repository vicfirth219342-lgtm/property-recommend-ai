#!/usr/bin/env node
/**
 * scripts/fill-built-year.mjs
 * built_year=null の物件について築年月を補完する
 *
 * ① SUUMOの一覧ページ再クロール時に取得できていたはずの築年月を再試行
 * ② それでも不明な場合のみ詳細ページを取得
 *
 * 使い方:
 *   node scripts/fill-built-year.mjs                  # sale物件全件
 *   node scripts/fill-built-year.mjs --tx rent         # rent物件
 *   node scripts/fill-built-year.mjs --dry-run         # DB保存しない
 *   node scripts/fill-built-year.mjs --limit 20        # 対象件数上限
 *
 * 前提:
 *   propertiesテーブルに以下カラムが存在すること（なければ任意）:
 *     age_source TEXT
 *     built_year_estimated BOOLEAN DEFAULT false
 *     detail_fetched_at TIMESTAMPTZ
 *
 * ※ 上記カラムが未存在でも動作する（保存をスキップ）
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
const H   = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
const UA  = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

const CURRENT_YEAR  = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth() + 1

const args    = process.argv.slice(2)
const getArg  = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }
const hasFlag = f => args.includes(f)
const DRY_RUN = hasFlag('--dry-run')
const TX_TYPE = getArg('--tx') ?? 'sale'
const LIMIT   = parseInt(getArg('--limit') ?? '300', 10)

// 詳細ページ取得間のウェイト（ミリ秒）
const FETCH_DELAY   = 1500
const RETRY_DELAYS  = [2000, 5000, 12000]

// ── Supabase ────────────────────────────────────────────────────────
async function sbGet(path) {
  const r = await fetch(`${SB}/rest/v1/${path}`, { headers: H })
  if (!r.ok) throw new Error(`GET ${path}: ${r.status} ${await r.text()}`)
  return r.json()
}

async function sbPatch(table, id, data) {
  const r = await fetch(`${SB}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify(data),
  })
  if (!r.ok) {
    const msg = await r.text()
    // age_sourceカラムが未存在の場合はフォールバック（カラム省いて再試行）
    if (msg.includes('age_source') || msg.includes('built_year_estimated') || msg.includes('detail_fetched_at')) {
      const fallback = {
        built_year:  data.built_year,
        built_month: data.built_month,
        building_age: data.building_age,
      }
      const r2 = await fetch(`${SB}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...H, Prefer: 'return=minimal' },
        body: JSON.stringify(fallback),
      })
      if (!r2.ok) throw new Error(`PATCH fallback ${table} ${id}: ${r2.status} ${await r2.text()}`)
      return 'fallback'
    }
    throw new Error(`PATCH ${table} ${id}: ${r.status} ${msg}`)
  }
}

// ── 和暦変換 ─────────────────────────────────────────────────────────
const ERA_MAP = {
  '令和': 2018,  // 令和1年 = 2019年 → 2018 + nengo
  '平成': 1988,  // 平成1年 = 1989年
  '昭和': 1925,  // 昭和1年 = 1926年
  '大正': 1911,
  '明治': 1867,
}

function eraToYear(eraName, nen) {
  const base = ERA_MAP[eraName]
  return base ? base + nen : null
}

// ── 築年月パーサー（改良版・和暦対応） ───────────────────────────────
/**
 * 文字列から築年月を解析する
 * @returns {{ year: number|null, month: number|null, estimated: boolean, source: string|null }}
 */
function parseBuiltDateStr(str) {
  if (!str || str.trim() === '' || str === '-') {
    return { year: null, month: null, estimated: false, source: null }
  }

  // ① 西暦 YYYY年MM月
  const m1 = str.match(/(\d{4})年(\d{1,2})月/)
  if (m1) {
    return { year: parseInt(m1[1]), month: parseInt(m1[2]), estimated: false, source: 'year_month' }
  }

  // ② 西暦 YYYY年 (月なし)
  const m2 = str.match(/(\d{4})年/)
  if (m2) {
    return { year: parseInt(m2[1]), month: null, estimated: false, source: 'year_only' }
  }

  // ③ 和暦 XX元年MM月 / XX〇年MM月
  for (const [eraName, base] of Object.entries(ERA_MAP)) {
    // 例: 「平成20年3月」「令和元年4月」
    const re = new RegExp(`${eraName}(元|\\d+)年(\\d{1,2})月`)
    const m = str.match(re)
    if (m) {
      const nen = m[1] === '元' ? 1 : parseInt(m[1])
      const year = base + nen
      return { year, month: parseInt(m[2]), estimated: false, source: 'wareki' }
    }
    // 月なし
    const re2 = new RegExp(`${eraName}(元|\\d+)年`)
    const m2 = str.match(re2)
    if (m2) {
      const nen = m2[1] === '元' ? 1 : parseInt(m2[1])
      return { year: base + nen, month: null, estimated: false, source: 'wareki' }
    }
  }

  // ④ 「築XX年」→ 現在年から逆算（推定）
  const mAge = str.match(/築(\d+)年/)
  if (mAge) {
    const age = parseInt(mAge[1])
    return {
      year: CURRENT_YEAR - age,
      month: null,
      estimated: true,
      source: 'age_text_estimate',
    }
  }

  return { year: null, month: null, estimated: false, source: null }
}

// ── テキスト抽出ユーティリティ ─────────────────────────────────────
function txt(html) {
  return (html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

// ── SUUMO売買詳細ページ パーサー ────────────────────────────────────
function parseSaleDetailPage(html) {
  // SUUMO詳細: <th>完成時期（築年月）ヒント</th><td>2023年12月</td>
  // thの中に「築年月」または「完成時期」が含まれる行を探す
  const thTd = [...html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/g)]
  for (const m of thTd) {
    const key = txt(m[1])
    if (key.includes('築年月') || key.includes('完成時期') || key.includes('建築年月')) {
      const raw = txt(m[2])
      const parsed = parseBuiltDateStr(raw)
      if (parsed.year) return { ...parsed, rawText: raw }
    }
  }

  // dt/dd形式（一覧ページと同じ形式の場合）
  const dts = [...html.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g)]
  for (const m of dts) {
    const key = txt(m[1])
    if (key.includes('築年月') || key.includes('完成時期')) {
      const raw = txt(m[2])
      const parsed = parseBuiltDateStr(raw)
      if (parsed.year) return { ...parsed, rawText: raw }
    }
  }

  return { year: null, month: null, estimated: false, source: null, rawText: '' }
}

// ── SUUMO賃貸詳細ページ パーサー ─────────────────────────────────
function parseRentDetailPage(html) {
  // 賃貸詳細も売買と同じ th/td 形式で「築年月」が含まれる
  const thTd = [...html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/g)]
  for (const m of thTd) {
    const key = txt(m[1])
    if (key.includes('築年月') || key.includes('完成時期') || key.includes('建築年月')) {
      const raw = txt(m[2])
      const parsed = parseBuiltDateStr(raw)
      if (parsed.year) return { ...parsed, rawText: raw }
    }
  }
  // 築年数のみの場合（「新築」「1年」など）
  for (const m of thTd) {
    const key = txt(m[1])
    if (key === '築年数') {
      const raw = txt(m[2])
      if (raw === '新築') return { year: CURRENT_YEAR, month: CURRENT_MONTH, estimated: true, source: 'age_text_estimate', rawText: raw }
      const parsed = parseBuiltDateStr(raw)
      if (parsed.year) return { ...parsed, rawText: raw }
    }
  }
  return { year: null, month: null, estimated: false, source: null, rawText: '' }
}

// ── HTTPフェッチ（リトライ付き） ──────────────────────────────────
async function fetchWithRetry(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'ja,en;q=0.9' },
        redirect: 'follow',
        signal: AbortSignal.timeout(20000),
      })
      if (r.status === 429 || r.status >= 500) {
        const wait = RETRY_DELAYS[attempt] ?? 15000
        console.log(`     HTTP ${r.status} → ${wait / 1000}秒後にリトライ...`)
        await new Promise(r => setTimeout(r, wait))
        continue
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return await r.text()
    } catch (e) {
      if (attempt < retries - 1) {
        const wait = RETRY_DELAYS[attempt] ?? 15000
        console.log(`     エラー(${e.message}) → ${wait / 1000}秒後にリトライ...`)
        await new Promise(r => setTimeout(r, wait))
      } else {
        throw e
      }
    }
  }
}

// ── メイン ─────────────────────────────────────────────────────────
;(async () => {
  console.log(`\n🔍 築年月補完スクリプト${DRY_RUN ? ' [DRY RUN]' : ''} — ${new Date().toLocaleDateString('ja-JP')}`)
  console.log(`   対象: transaction_type=${TX_TYPE}, 上限=${LIMIT}件\n`)

  // built_year=null の物件を取得
  const targets = await sbGet(
    `properties?built_year=is.null&transaction_type=eq.${TX_TYPE}&select=id,site,name,url,site_property_id,transaction_type&limit=${LIMIT}&order=id.asc`
  )

  // detail_fetched_at が存在する場合は除外（既に取得済み）
  // → カラムが存在しない場合は全件対象になる（問題なし）
  let targetList = targets
  try {
    const withDetail = await sbGet(
      `properties?built_year=is.null&transaction_type=eq.${TX_TYPE}&detail_fetched_at=is.null&select=id,site,name,url,site_property_id,transaction_type&limit=${LIMIT}&order=id.asc`
    )
    targetList = withDetail
    console.log(`   ※ detail_fetched_atカラム検出: 未取得のみ対象`)
  } catch { /* カラム未存在 → 全件対象のまま */ }

  console.log(`📦 built_year=null: ${targetList.length}件\n`)

  if (targetList.length === 0) {
    console.log('補完対象なし。終了します。')
    return
  }

  // ── カウンタ ─────────────────────────────────────────────────────
  const stat = {
    total: targetList.length,
    fromDetail: 0,      // 詳細ページで補完
    stillUnknown: 0,    // それでも不明
    errors: 0,
    ageExceeded25: 0,   // 築25年超（八矢様基準）
    ageWithin25: 0,     // 築25年以内
  }

  const newMatches = []       // 新たに条件一致の可能性がある物件
  const ageExceededList = []  // 築年数超過物件

  for (let i = 0; i < targetList.length; i++) {
    const prop = targetList[i]
    const progress = `[${i + 1}/${targetList.length}]`

    process.stdout.write(`${progress} ${(prop.name ?? '').slice(0, 28)}... `)

    // SUUMO以外はスキップ（現在は SUUMO のみクロール済み）
    if (prop.site !== 'suumo') {
      console.log(`スキップ (site=${prop.site})`)
      stat.stillUnknown++
      continue
    }

    if (!prop.url) {
      console.log('URL不明 → スキップ')
      stat.stillUnknown++
      continue
    }

    // 詳細ページ取得
    let html
    try {
      html = await fetchWithRetry(prop.url)
    } catch (e) {
      console.log(`取得失敗: ${e.message}`)
      stat.errors++
      stat.stillUnknown++
      continue
    }

    // パース
    const parsed = prop.transaction_type === 'rent'
      ? parseRentDetailPage(html)
      : parseSaleDetailPage(html)

    if (!parsed.year) {
      console.log('築年月 不明')
      stat.stillUnknown++
      // detail_fetched_atだけ更新して再クロール防止
      if (!DRY_RUN) {
        try {
          await sbPatch('properties', prop.id, { detail_fetched_at: new Date().toISOString() })
        } catch { /* カラム未存在なら無視 */ }
      }
      await new Promise(r => setTimeout(r, FETCH_DELAY))
      continue
    }

    const age = CURRENT_YEAR - parsed.year - (parsed.month && parsed.month > CURRENT_MONTH ? 1 : 0)
    const estimatedFlag = parsed.estimated ? '(推定)' : ''
    console.log(`${parsed.year}年${parsed.month ? parsed.month + '月' : ''} 築${age}年 ${estimatedFlag}[${parsed.source}]`)

    stat.fromDetail++
    if (age > 25) {
      stat.ageExceeded25++
      ageExceededList.push({ name: prop.name, builtYear: parsed.year, age })
    } else {
      stat.ageWithin25++
      newMatches.push({ name: prop.name, builtYear: parsed.year, builtMonth: parsed.month, age, url: prop.url, estimated: parsed.estimated })
    }

    // DB更新
    if (!DRY_RUN) {
      const updateData = {
        built_year:   parsed.year,
        built_month:  parsed.month ?? null,
        building_age: age,
        // 拡張カラム（存在すれば保存、なければフォールバック）
        age_source:           parsed.estimated ? 'age_text_estimate' : 'detail_page',
        built_year_estimated: parsed.estimated,
        detail_fetched_at:    new Date().toISOString(),
      }
      try {
        const result = await sbPatch('properties', prop.id, updateData)
        if (result === 'fallback') {
          // 拡張カラムなし → フォールバックで保存成功
        }
      } catch (e) {
        console.error(`   ⚠️  DB更新失敗: ${e.message}`)
        stat.errors++
      }
    }

    // リクエスト間隔
    await new Promise(r => setTimeout(r, FETCH_DELAY))
  }

  // ── レポート ─────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(70)}`)
  console.log('📊 築年月補完レポート')
  console.log(`${'═'.repeat(70)}`)
  console.log(`   対象件数:              ${stat.total}件`)
  console.log(`   詳細ページで補完:       ${stat.fromDetail}件`)
  console.log(`   補完成功率:             ${((stat.fromDetail / stat.total) * 100).toFixed(1)}%`)
  console.log(`   それでも築年不明:       ${stat.stillUnknown}件`)
  console.log(`   取得エラー:             ${stat.errors}件`)
  console.log()
  console.log(`   ── 補完後の築年数分布 ──`)
  console.log(`   築25年以内（条件一致可能性あり）: ${stat.ageWithin25}件`)
  console.log(`   築25年超（八矢様基準で除外）:    ${stat.ageExceeded25}件`)

  if (newMatches.length) {
    console.log(`\n   ▶ 新たに条件一致の可能性がある物件 (築25年以内):`)
    for (const p of newMatches) {
      const est = p.estimated ? ' ※推定値' : ''
      console.log(`     ✅ ${p.name} | ${p.builtYear}年${p.builtMonth ? p.builtMonth + '月' : ''} (築${p.age}年)${est}`)
      console.log(`        ${p.url}`)
    }
  }

  if (ageExceededList.length) {
    console.log(`\n   ▶ 築年数超過で除外確定（築25年超）:`)
    for (const p of ageExceededList.slice(0, 20)) {
      console.log(`     ❌ ${p.name} | 築${p.builtYear}年 → 築${p.age}年`)
    }
    if (ageExceededList.length > 20) {
      console.log(`     ... 他${ageExceededList.length - 20}件`)
    }
  }

  console.log(`\n${'═'.repeat(70)}`)
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN: DB更新は行っていません')
  } else {
    console.log(`✅ 完了: ${stat.fromDetail}件の築年月を補完しました`)
    console.log('   ※ 補完完了後、match-properties.mjs を再実行してください')
  }
})().catch(e => { console.error('❌', e.message); process.exit(1) })
