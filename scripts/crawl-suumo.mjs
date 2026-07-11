#!/usr/bin/env node
/**
 * scripts/crawl-suumo.mjs
 * SUUMO物件一覧をクロールして properties テーブルに保存する
 *
 * 使い方:
 *   node scripts/crawl-suumo.mjs --all              # 顧客登録済エリアを全件処理
 *   node scripts/crawl-suumo.mjs --area 武蔵小杉    # 特定エリアのみ
 *   node scripts/crawl-suumo.mjs --dry-run          # DB保存しない
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

const args    = process.argv.slice(2)
const getArg  = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }
const hasFlag = f => args.includes(f)
const AREA_NAME = getArg('--area')
const ALL_MODE  = hasFlag('--all')
const DRY_RUN   = hasFlag('--dry-run')
const NOW       = new Date().toISOString()
const TODAY     = NOW.slice(0, 10)

// ── Supabase ────────────────────────────────────────────────────
async function sbGet(path) {
  const r = await fetch(`${SB}/rest/v1/${path}`, { headers: H })
  if (!r.ok) throw new Error(`GET ${path}: ${r.status} ${await r.text()}`)
  return r.json()
}
async function sbUpsert(table, rows) {
  const r = await fetch(`${SB}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  })
  if (!r.ok) {
    const msg = await r.text()
    throw new Error(`UPSERT ${table}: ${r.status} ${msg}`)
  }
}

async function sbUpsertReturning(table, rows) {
  const r = await fetch(`${SB}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows),
  })
  if (!r.ok) throw new Error(`UPSERT ${table}: ${r.status} ${await r.text()}`)
  return r.json()
}

// customer_property_sources に書き込む（テーブルが未存在でもクロール自体は続行）
async function recordSources(customerId, propertyIds, areaId, searchUrl) {
  const rows = propertyIds.map(pid => ({
    customer_id: customerId,
    property_id: pid,
    area_id:     areaId ?? null,
    portal:      'suumo',
    search_url:  searchUrl ?? null,
    crawled_at:  NOW,
  }))
  try {
    await sbUpsert('customer_property_sources', rows)
  } catch (e) {
    if (e.message.includes('customer_property_sources')) {
      console.log(`   ⚠️  customer_property_sources テーブル未作成: ソース記録をスキップ`)
    } else {
      throw e
    }
  }
}

// ── URL構築 ─────────────────────────────────────────────────────
function buildSuumoUrl(urlParam, txType, cond) {
  const walk    = cond.walk_minutes_max ?? 15
  const age     = cond.building_age_max ?? 25
  const areaMin = cond.area_sqm_min ?? (txType === 'rent' ? 30 : 60)
  if (txType === 'rent') {
    return `https://suumo.jp/chintai/${urlParam}/?et=${walk}&mb=${areaMin}`
  }
  const priceMin = cond.budget_min ?? 5000
  const priceMax = cond.budget_max ?? 7000
  return `https://suumo.jp/ms/chuko/${urlParam}/?kb=${priceMin}&kt=${priceMax}&mb=${areaMin}&ekk=${walk}&cn=${age}`
}

// ── パーサーユーティリティ ────────────────────────────────────
function txt(html) { return html?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() ?? '' }

function parsePrice(str) {
  if (!str) return null
  const m = str.replace(/,/g, '').match(/([\d.]+)万円/)
  return m ? parseFloat(m[1]) : null
}
function parseArea(str) {
  const m = str?.match(/([\d.]+)\s*m/)
  return m ? parseFloat(m[1]) : null
}
function parseWalk(str) {
  const m = str?.match(/歩(\d+)分/)
  return m ? parseInt(m[1]) : null
}
const ERA_BASES = { '令和': 2018, '平成': 1988, '昭和': 1925, '大正': 1911 }
const CUR_YEAR  = new Date().getFullYear()
const CUR_MONTH = new Date().getMonth() + 1

function parseBuiltYear(str) {
  if (!str || str === '-') return { year: null, month: null }

  // ① 西暦 YYYY年MM月
  const m1 = str.match(/(\d{4})年(\d{1,2})月/)
  if (m1) return { year: parseInt(m1[1]), month: parseInt(m1[2]) }

  // ② 西暦 YYYY年（月なし）
  const m2 = str.match(/(\d{4})年/)
  if (m2) return { year: parseInt(m2[1]), month: null }

  // ③ 和暦 XX年MM月 / XX元年MM月
  for (const [era, base] of Object.entries(ERA_BASES)) {
    const rm = str.match(new RegExp(`${era}(元|\\d+)年(\\d{1,2})月`))
    if (rm) return { year: base + (rm[1] === '元' ? 1 : parseInt(rm[1])), month: parseInt(rm[2]) }
    const ry = str.match(new RegExp(`${era}(元|\\d+)年`))
    if (ry) return { year: base + (ry[1] === '元' ? 1 : parseInt(ry[1])), month: null }
  }

  // ④ 「築XX年」→ 逆算（推定値）
  const ma = str.match(/築(\d+)年/)
  if (ma) return { year: CUR_YEAR - parseInt(ma[1]), month: null }

  return { year: null, month: null }
}

// ── 売買ページパーサー (/ms/chuko/) ─────────────────────────────
// 構造: <div class="property_unit ..."> ブロック分割
function parseSalePage(html) {
  const parts = html.split('<div class="property_unit ')
  const props = []

  for (let i = 1; i < parts.length; i++) {
    const block = '<div class="property_unit ' + parts[i]

    // dt→dd マップ
    const info = Object.fromEntries(
      [...block.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g)]
        .map(m => [txt(m[1]), txt(m[2])])
    )

    // タイトル & URL
    const hrefMatch = block.match(/<h2 class="property_unit-title">\s*<a href="([^"]+)"/)
    const url  = hrefMatch ? `https://suumo.jp${hrefMatch[1]}` : null
    const ncM  = hrefMatch?.[1]?.match(/nc_(\d+)/)
    const siteId = ncM ? ncM[1] : null

    // 物件名優先、なければタイトルテキスト
    const title = block.match(/<h2 class="property_unit-title">\s*<a[^>]*>([\s\S]*?)<\/a>/)?.[1]
    const name  = info['物件名'] || txt(title ?? '')

    const priceStr = info['販売価格'] || info['売出価格']
    const { year: builtYear, month: builtMonth } = parseBuiltYear(info['築年月'])
    const walkMin = parseWalk(info['沿線・駅']) ?? parseWalk(block)

    if (!url || !name) continue

    props.push({
      site: 'suumo',
      site_property_id: siteId,
      name,
      address: info['所在地'] ?? null,
      price: parsePrice(priceStr),
      monthly_rent: null,
      area_sqm: parseArea(info['専有面積']),
      floor_plan: info['間取り'] ?? null,
      built_year: builtYear,
      built_month: builtMonth,
      walk_minutes: walkMin,
      url,
      thumbnail_url: block.match(/rel="(https?:\/\/img\.suumo[^"]+)"/)?.[1] ?? null,
      transaction_type: 'sale',
      dedup_key: siteId ? `suumo_${siteId}` : null,
      fetched_at: NOW,
      first_seen_at: NOW,
      last_seen_at: NOW,
      last_price: parsePrice(priceStr),
      current_price: parsePrice(priceStr),
    })
  }
  return props
}

// ── 賃貸ページパーサー (/chintai/) ──────────────────────────────
// 構造: <div class="cassetteitem"> → 建物1件 (1〜N部屋)
function parseRentPage(html) {
  const buildings = html.split('<div class="cassetteitem">')
  const props = []

  for (let bi = 1; bi < buildings.length; bi++) {
    const bBlock = '<div class="cassetteitem">' + buildings[bi]

    // 建物情報
    const bName    = txt(bBlock.match(/<div class="cassetteitem_content-title">([\s\S]*?)<\/div>/)?.[1] ?? '')
    const address  = txt(bBlock.match(/<li class="cassetteitem_detail-col1">([\s\S]*?)<\/li>/)?.[1] ?? '')
    const stationStr = txt(bBlock.match(/<li class="cassetteitem_detail-col2">([\s\S]*?)<\/li>/)?.[1] ?? '')
    const walkMin  = parseWalk(stationStr)
    const ageStr   = txt(bBlock.match(/<li class="cassetteitem_detail-col3">([\s\S]*?)<\/li>/)?.[1] ?? '')
    const { year: builtYear, month: builtMonth } = parseBuiltYear(ageStr)

    // 各部屋行（tbody の tr.js-cassette_link）
    const tbodyStart = bBlock.indexOf('<tbody>')
    const tbodyEnd   = bBlock.indexOf('</tbody>', tbodyStart)
    if (tbodyStart < 0) continue
    const tbody = bBlock.slice(tbodyStart, tbodyEnd + 8)

    const rows = [...tbody.matchAll(/<tr class="js-cassette_link[^"]*">([\s\S]*?)<\/tr>/g)]

    for (const rowM of rows) {
      const row = rowM[0]

      // 物件ID & URL
      const idM   = row.match(/value="(\d+)"/)
      const siteId = idM?.[1] ?? null
      const hrefM  = row.match(/href="(\/chintai\/jnc_[^"]+)"/)
      const url    = hrefM ? `https://suumo.jp${hrefM[1]}` : null

      // 賃料 (cassetteitem_price--rent)
      const rentStr = txt(row.match(/cassetteitem_price--rent">([\s\S]*?)<\/span>/)?.[1] ?? '')
      const rent = parsePrice(rentStr)

      // 管理費
      const mgmtStr = txt(row.match(/cassetteitem_price--administration">([\s\S]*?)<\/span>/)?.[1] ?? '')

      // 間取り
      const madori = txt(row.match(/cassetteitem_madori">([\s\S]*?)<\/span>/)?.[1] ?? '')

      // 面積
      const menseki = txt(row.match(/cassetteitem_menseki">([\s\S]*?)<\/span>/)?.[1] ?? '')
      const areaSqm = parseArea(menseki)

      if (!url && !siteId) continue

      // monthly_rent / management_fee は円単位 bigint
      const rentYen  = rent  ? Math.round(rent  * 10000) : null
      const mgmtYen  = parsePrice(mgmtStr) ? Math.round(parsePrice(mgmtStr) * 10000) : null

      props.push({
        site: 'suumo',
        site_property_id: siteId,
        name: bName || null,
        address,
        price: null,
        monthly_rent: rentYen,
        management_fee: mgmtYen,
        area_sqm: areaSqm,
        floor_plan: madori || null,
        built_year: builtYear,
        built_month: builtMonth,
        walk_minutes: walkMin,
        url,
        thumbnail_url: null,
        transaction_type: 'rent',
        dedup_key: siteId ? `suumo_${siteId}` : null,
        fetched_at: NOW,
        first_seen_at: NOW,
        last_seen_at: NOW,
        last_price: rentYen,
        current_price: rentYen,
      })
    }
  }
  return props
}

// ── フェッチ&パース ─────────────────────────────────────────────
async function fetchPage(url, txType, page = 1) {
  const pageUrl = page > 1 ? `${url}&pn=${page}` : url
  const r = await fetch(pageUrl, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'ja,en;q=0.9' },
    redirect: 'follow', signal: AbortSignal.timeout(20000),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const html = await r.text()

  const countM = html.match(/(\d[\d,]+)\s*件/)
  const total  = countM ? parseInt(countM[1].replace(/,/g, '')) : 0

  const props = txType === 'rent' ? parseRentPage(html) : parseSalePage(html)
  const perPage = txType === 'rent' ? 20 : 30  // SUUMO表示件数
  return { total, props, hasNext: props.length > 0 && total > page * perPage }
}

// ── メイン ─────────────────────────────────────────────────────
;(async () => {
  console.log(`\n🕷️  SUUMO クロール${DRY_RUN ? ' [DRY RUN]' : ''} — ${TODAY}`)

  // 顧客条件から対象エリアを収集
  const custs   = await sbGet('customers?select=id,name')
  const custMap = new Map(custs.map(c => [c.id, c.name]))
  const conds   = await sbGet(
    'customer_conditions?select=customer_id,area,transaction_type,budget_min,budget_max,area_sqm_min,walk_minutes_max,building_age_max,rent_min,rent_max'
  )

  const targets = []
  for (const cond of conds) {
    const custName = custMap.get(cond.customer_id) ?? '不明'
    const txType   = cond.transaction_type ?? 'sale'
    const areaText = cond.area ?? ''
    if (!areaText) continue

    const keywords = areaText.split(/[・、\s駅]+/).filter(k => k.length >= 2)
    if (AREA_NAME && !keywords.some(k => AREA_NAME.includes(k) || k.includes(AREA_NAME))) continue

    const nameCond = keywords.map(k => `"${k}"`).join(',')
    const masters  = await sbGet(
      `area_masters?display_name=in.(${nameCond})&prefecture=in.(東京都,神奈川県)&select=id,display_name`
    )
    for (const m of masters) {
      const params = await sbGet(
        `portal_area_params?area_id=eq.${m.id}&portal=eq.suumo&select=portal_url_param`
      )
      if (!params.length) { console.log(`  ⚠️ ${m.display_name}: suumo パラメータ未登録`); continue }
      targets.push({
        custName, custId: cond.customer_id,
        areaName: m.display_name, areaId: m.id,
        txType, cond, urlParam: params[0].portal_url_param,
      })
    }
  }

  if (!targets.length) { console.log('対象なし'); process.exit(0) }
  console.log(`対象: ${targets.map(t => `${t.custName}/${t.areaName}(${t.txType})`).join(', ')}\n`)

  let totalSaved = 0
  const report = []

  for (const { custName, custId, areaName, areaId, txType, cond, urlParam } of targets) {
    const baseUrl = buildSuumoUrl(urlParam, txType, cond)
    console.log(`\n📍 ${custName} / ${areaName} (${txType})`)
    console.log(`   ${baseUrl}`)

    const allProps = []
    let page = 1
    while (page <= 5) {
      process.stdout.write(`   page ${page}... `)
      try {
        const { total, props, hasNext } = await fetchPage(baseUrl, txType, page)
        console.log(`${props.length}件取得 (計${total}件)`)
        allProps.push(...props)
        if (!hasNext || props.length === 0) break
        page++
        await new Promise(r => setTimeout(r, 1500))
      } catch (e) {
        console.log(`エラー: ${e.message}`)
        break
      }
    }

    console.log(`   → パース完了: ${allProps.length}件`)

    // サンプル表示
    const valid = allProps.filter(p => p.dedup_key)
    valid.slice(0, 3).forEach(p => {
      const priceStr = txType === 'rent' ? `${p.monthly_rent ? (p.monthly_rent/10000).toFixed(1) : '?'}万円/月` : `${p.price}万円`
      console.log(`   - ${(p.name ?? '').slice(0, 25)} | ${priceStr} | ${p.area_sqm}㎡ | 築${p.built_year ?? '?'}年 | 徒歩${p.walk_minutes ?? '?'}分`)
    })

    if (!DRY_RUN && valid.length) {
      // ① properties upsert（ID付きで返却）
      const saved = await sbUpsertReturning('properties', valid)
      const savedIds = saved.map(p => p.id).filter(Boolean)
      console.log(`   ✅ ${valid.length}件 upsert完了`)
      totalSaved += valid.length

      // ② customer_property_sources に顧客×エリア×物件を記録
      if (savedIds.length && custId) {
        await recordSources(custId, savedIds, areaId, baseUrl)
        console.log(`   📌 customer_property_sources: ${savedIds.length}件 記録`)
      }
    }

    report.push({ custName, areaName, txType, count: valid.length, sample: valid.slice(0, 5) })
  }

  // ── 顧客条件との照合 ─────────────────────────────────────────
  console.log(`\n${'─'.repeat(60)}`)
  console.log('📊 顧客条件照合レポート')

  for (const cond of conds) {
    const custName = custMap.get(cond.customer_id)
    if (!custName) continue
    const txType = cond.transaction_type ?? 'sale'
    const areaText = cond.area ?? ''
    if (!areaText) continue

    const targetReport = report.filter(r => custName === r.custName)
    if (!targetReport.length) continue

    console.log(`\n▼ ${custName} (${txType}) — エリア: ${areaText}`)
    if (txType === 'rent') {
      console.log(`  賃料: ${cond.rent_min}〜${cond.rent_max}万円/月`)
    } else {
      console.log(`  予算: ${cond.budget_min}〜${cond.budget_max}万円`)
    }
    console.log(`  面積: ${cond.area_sqm_min ?? '-'}㎡以上  徒歩: ${cond.walk_minutes_max ?? '-'}分以内  築: ${cond.building_age_max ?? '-'}年以内`)

    for (const r of targetReport) {
      console.log(`\n  【${r.areaName}】 ${r.count}件取得`)
      // 条件合致物件を表示
      const matched = r.sample.filter(p => {
        if (txType === 'rent') {
          const ok_rent = !cond.rent_max || (p.monthly_rent && p.monthly_rent <= cond.rent_max)
          const ok_area = !cond.area_sqm_min || (p.area_sqm && p.area_sqm >= cond.area_sqm_min)
          return ok_rent && ok_area
        } else {
          const ok_price = !cond.budget_max || (p.price && p.price <= cond.budget_max)
          const ok_area  = !cond.area_sqm_min || (p.area_sqm && p.area_sqm >= cond.area_sqm_min)
          return ok_price && ok_area
        }
      })
      if (matched.length) {
        matched.forEach(p => {
          const priceStr = txType === 'rent' ? `${p.monthly_rent ? (p.monthly_rent/10000).toFixed(1) : '?'}万円/月` : `${p.price}万円`
          console.log(`  ✅ ${(p.name ?? '').slice(0,30)} | ${priceStr} | ${p.area_sqm}㎡ | 徒歩${p.walk_minutes}分`)
          console.log(`     ${p.url}`)
        })
      } else {
        console.log('  (サンプル5件内に条件合致なし)')
      }
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`完了: 合計 ${totalSaved}件保存${DRY_RUN ? ' [DRY RUN]' : ''}`)
})().catch(e => { console.error('❌', e.message); process.exit(1) })
