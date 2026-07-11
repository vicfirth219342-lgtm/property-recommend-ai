#!/usr/bin/env node
// scripts/test_url_generation.mjs
// URL生成デバッグ用テストスクリプト (fetch only, no Supabase client)

const BASE = 'https://dhlwthogurcsrfnwfmbm.supabase.co'
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRobHd0aG9ndXJjc3JmbndmbWJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMyMjkzMywiZXhwIjoyMDk4ODk4OTMzfQ.b9WauT47aKd1PA8YTtq6av04kgrqGr05cDOUKJpmZWM'

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

async function get(path) {
  const r = await fetch(`${BASE}/rest/v1/${path}`, { headers: H })
  return r.json()
}

// ── URLパラメータビルダー（portalUrlBuilder.ts のロジックを移植） ──────────

const SUUMO_AR = {
  '13': '030', // 東京都
  '14': '030', // 神奈川県
}

const TYPE_PRIORITY = { station: 0, town: 1, ward: 2, city: 2, prefecture: 3 }

function isSuumoStationPath(p) {
  return /^[a-z]+\/eki_[a-z0-9_-]+$/.test(p)
}

function suumoWalk(min) {
  if (!min) return null
  return String([1,3,5,7,10,15,20].find(s => s >= min) ?? 20)
}

function suumoAge(years) {
  if (!years) return null
  return String([1,3,5,7,10,15,20,25,30].find(s => s >= years) ?? 30)
}

function suumoTypeSegment(pt, isSale) {
  if (isSale) {
    if (pt?.includes('新築') && pt?.includes('マンション')) return 'ms/shinchiku'
    if (pt?.includes('戸建') || pt?.includes('一戸建'))     return 'ikkodate/chuko'
    if (pt?.includes('土地'))                               return 'tochi'
    return 'ms/chuko'
  } else {
    if (pt?.includes('戸建') || pt?.includes('一戸建')) return 'chintai/ikkodate'
    return 'chintai/mansion'
  }
}

function buildSuumoUrl(cond, param) {
  const isSale = cond.type !== 'rent'
  const wk = suumoWalk(cond.walk)
  const ag = suumoAge(cond.age)

  if (param && isSuumoStationPath(param.portal_url_param)) {
    const path = param.portal_url_param
    const seg  = suumoTypeSegment(null, isSale)
    const q = []
    if (isSale) {
      if (cond.priceMin) q.push(`kb=${cond.priceMin}`)
      if (cond.priceMax) q.push(`kt=${cond.priceMax}`)
    } else {
      if (cond.priceMin) q.push(`cb=${cond.priceMin}`)
      if (cond.priceMax) q.push(`ct=${cond.priceMax}`)
    }
    if (cond.areaMin) q.push(`mb=${cond.areaMin}`)
    if (wk) q.push(`ekk=${wk}`)
    if (ag) q.push(`cn=${ag}`)
    const qs = q.length ? `?${q.join('&')}` : ''
    return `https://suumo.jp/${seg}/${path}/${qs}`
  }

  if (param) {
    // query type (ta=13&sc=XXXXX)
    const sp = new URLSearchParams(param.portal_url_param)
    const ta = sp.get('ta') ?? '13'
    const ar = SUUMO_AR[ta] ?? '030'
    const base = { ar, bs: isSale ? '010' : '040', ta }
    let qs = new URLSearchParams(base).toString()
    const sc = sp.get('sc'); const ek = sp.get('ek')
    if (sc) qs += `&sc=${sc}`
    if (ek) qs += `&ek=${ek}`
    qs += `&tc=0300101`
    if (isSale) {
      if (cond.priceMin) qs += `&kb=${cond.priceMin}`
      if (cond.priceMax) qs += `&kt=${cond.priceMax}`
    } else {
      if (cond.priceMin) qs += `&cb=${cond.priceMin}`
      if (cond.priceMax) qs += `&ct=${cond.priceMax}`
    }
    if (cond.areaMin) qs += `&mb=${cond.areaMin}`
    if (wk) qs += `&${isSale ? 'ekk' : 'et'}=${wk}`
    if (ag) qs += `&cn=${ag}`
    const baseUrl = isSale
      ? 'https://suumo.jp/jj/bukken/ichiran/JJ010FJ001/'
      : 'https://suumo.jp/jj/chintai/ichiran/FR301FC001/'
    return `${baseUrl}?${qs}`
  }
  return null
}

function buildAthomeUrl(cond, param) {
  const isSale = cond.type !== 'rent'
  const seg = isSale ? '/mansion/chuko' : '/chintai'
  const q = {}
  if (isSale) {
    if (cond.priceMin != null || cond.priceMax != null)
      q.PRICE = `${cond.priceMin ?? ''}-${cond.priceMax ?? ''}`
  } else {
    if (cond.priceMin != null || cond.priceMax != null)
      q.PRICE = `${cond.priceMin ? cond.priceMin * 10000 : ''}-${cond.priceMax ? cond.priceMax * 10000 : ''}`
  }
  if (cond.areaMin) q.MENSEKI = `${cond.areaMin}-`
  if (cond.walk)    q.TIKO    = String(cond.walk)
  if (cond.age)     q.CHIKU   = String(cond.age)
  const qs = Object.keys(q).length ? `?${new URLSearchParams(q)}` : ''
  if (param) {
    return `https://www.athome.co.jp${seg}${param.portal_url_param}/list/${qs}`
  }
  return null
}

function buildHomesUrl(cond, param) {
  const isSale = cond.type !== 'rent'
  const seg = isSale ? '/mansion/chuko' : '/chintai'
  const q = {}
  if (isSale) {
    if (cond.priceMin) q.priceMin = String(cond.priceMin)
    if (cond.priceMax) q.priceMax = String(cond.priceMax)
  } else {
    if (cond.priceMin) q.priceMin = String(cond.priceMin)
    if (cond.priceMax) q.priceMax = String(cond.priceMax)
  }
  if (cond.areaMin) q.areaMin  = String(cond.areaMin)
  if (cond.walk)    q.tsuukin  = String(cond.walk)
  if (cond.age)     q.chiku    = String(cond.age)
  const qs = Object.keys(q).length ? `?${new URLSearchParams(q)}` : ''
  if (param) {
    return `https://www.homes.co.jp${seg}${param.portal_url_param}/list/${qs}`
  }
  return null
}

// ── テストケース定義 ────────────────────────────────────────────────────────

const TESTS = [
  { id:1,  area:'武蔵小杉', type:'sale', priceMin:5000, priceMax:7000, areaMin:60, walk:15, age:25 },
  { id:2,  area:'武蔵中原', type:'sale', priceMin:4000, priceMax:6000, areaMin:70, walk:10, age:20 },
  { id:3,  area:'元住吉',   type:'sale', priceMin:6000, priceMax:9000, areaMin:75, walk:10, age:15 },
  { id:4,  area:'新丸子',   type:'sale', priceMin:3000, priceMax:5000, areaMin:50, walk:10, age:30 },
  { id:5,  area:'日吉',     type:'sale', priceMin:7000, priceMax:10000,areaMin:80, walk:15, age:20 },
  { id:6,  area:'武蔵小杉', type:'rent', priceMin:15,   priceMax:25,   areaMin:50, walk:10, age:20 },
  { id:7,  area:'渋谷区',   type:'rent', priceMin:20,   priceMax:35,   areaMin:40, walk:10, age:15 },
  { id:8,  area:'港区',     type:'rent', priceMin:25,   priceMax:50,   areaMin:60, walk:15, age:20 },
  { id:9,  area:'横浜市中区',type:'sale',priceMin:5000, priceMax:8000, areaMin:70, walk:15, age:25 },
  { id:10, area:'新宿区',   type:'sale', priceMin:8000, priceMax:15000,areaMin:60, walk:10, age:20 },
]

// ── エリア解決 ──────────────────────────────────────────────────────────────

async function resolveArea(areaName) {
  const enc = encodeURIComponent(areaName)

  // 1. display_name 完全一致
  let rows = await get(`area_masters?display_name=eq.${enc}&select=id,display_name,area_type,prefecture`)
  if (!rows.length) {
    // 2. alias 検索
    const aliases = await get(`area_aliases?alias=eq.${enc}&select=area_id`)
    if (aliases.length) {
      const id = aliases[0].area_id
      rows = await get(`area_masters?id=eq.${id}&select=id,display_name,area_type,prefecture`)
    }
  }
  if (!rows.length) {
    // 3. 部分一致（display_name ILIKE）
    rows = await get(`area_masters?display_name=ilike.*${enc}*&select=id,display_name,area_type,prefecture&limit=1`)
  }

  if (!rows.length) return { master: null, params: [] }

  // area_type 優先度でソート
  rows.sort((a, b) => (TYPE_PRIORITY[a.area_type] ?? 9) - (TYPE_PRIORITY[b.area_type] ?? 9))
  const master = rows[0]

  const params = await get(
    `portal_area_params?area_id=eq.${master.id}&select=portal,param_type,portal_code,portal_url_param,verified,notes`
  )

  return { master, params }
}

// ── 検証 ───────────────────────────────────────────────────────────────────

function condReflection(cond, url) {
  if (!url) return { price:'—', area:'—', walk:'—', age:'—' }
  const price = (cond.priceMin ? url.includes(String(cond.priceMin)) : true) &&
                (cond.priceMax ? url.includes(String(cond.priceMax)) : true)
  const area  = cond.areaMin ? url.includes(String(cond.areaMin)) : true
  const walk  = cond.walk    ? url.includes(String(suumoWalk(cond.walk))) ||
                                url.includes(String(cond.walk))            : true
  const age   = cond.age     ? url.includes(String(suumoAge(cond.age))) ||
                                url.includes(String(cond.age))             : true
  return {
    price: price ? '✅' : '❌',
    area:  area  ? '✅' : '❌',
    walk:  walk  ? '✅' : '❌',
    age:   age   ? '✅' : '❌',
  }
}

// ── メイン ─────────────────────────────────────────────────────────────────

async function main() {
  // 全テストのエリアを並行解決
  const resolved = await Promise.all(TESTS.map(t => resolveArea(t.area)))

  // ── レポート出力 ──────────────────────────────────────────────────────────

  const LINE = '─'.repeat(120)
  console.log('\n' + '═'.repeat(120))
  console.log('  URL生成デバッグレポート')
  console.log('  実行日時: ' + new Date().toLocaleString('ja-JP'))
  console.log('═'.repeat(120) + '\n')

  const summary = []

  for (let i = 0; i < TESTS.length; i++) {
    const cond = TESTS[i]
    const { master, params } = resolved[i]

    const pSuumo  = params.find(p => p.portal === 'suumo')
    const pAthome = params.find(p => p.portal === 'athome')
    const pHomes  = params.find(p => p.portal === 'homes')

    // area_masters / portal_area_params 登録状況
    const masterStatus   = master ? `✅ ${master.area_type}（${master.prefecture ?? '?'}）` : '❌ 未登録'
    const suumoStatus    = pSuumo  ? (pSuumo.verified  ? '✅ verified' : '⚠️  未確認') : '❌ 未登録'
    const athomeStatus   = pAthome ? (pAthome.verified ? '✅ verified' : '⚠️  未確認') : '❌ 未登録'
    const homesStatus    = pHomes  ? (pHomes.verified  ? '✅ verified' : '⚠️  未確認') : '❌ 未登録'

    // URL生成
    const suumoUrl  = master ? buildSuumoUrl(cond, pSuumo)   : null
    const athomeUrl = master ? buildAthomeUrl(cond, pAthome)  : null
    const homesUrl  = master ? buildHomesUrl(cond, pHomes)    : null

    const suumoRef  = condReflection(cond, suumoUrl)
    const athomeRef = condReflection(cond, athomeUrl)
    const homesRef  = condReflection(cond, homesUrl)

    // 失敗判定
    const failures = []
    if (!master)    failures.push('area_masters未登録')
    if (!pSuumo)    failures.push('SUUMO params未登録')
    if (!pAthome)   failures.push('athome params未登録')
    if (!pHomes)    failures.push('homes params未登録')

    console.log(LINE)
    const typeLabel = cond.type === 'rent' ? '賃貸' : '売買'
    const priceLabel = cond.type === 'rent'
      ? `${cond.priceMin}〜${cond.priceMax}万円/月`
      : `${cond.priceMin}〜${cond.priceMax}万円`
    console.log(`【テスト${cond.id}】${typeLabel} ／ ${cond.area} ／ ${priceLabel} ／ ${cond.areaMin}㎡以上 ／ 徒歩${cond.walk}分 ／ 築${cond.age}年`)
    console.log()
    console.log(`  ▶ area_masters   : ${masterStatus}`)
    console.log(`    portal SUUMO   : ${suumoStatus}${ pSuumo ? `  [${pSuumo.param_type}] ${pSuumo.portal_url_param}` : '' }`)
    console.log(`    portal athome  : ${athomeStatus}${ pAthome ? `  [${pAthome.param_type}] ${pAthome.portal_url_param}` : '' }`)
    console.log(`    portal homes   : ${homesStatus}${ pHomes ? `  [${pHomes.param_type}] ${pHomes.portal_url_param}` : '' }`)
    console.log()

    if (suumoUrl) {
      console.log(`  ① SUUMO`)
      console.log(`     ${suumoUrl}`)
      console.log(`     条件反映: 価格${suumoRef.price} 面積${suumoRef.area} 徒歩${suumoRef.walk} 築年${suumoRef.age}`)
    } else {
      console.log(`  ① SUUMO   : ❌ URL生成失敗（${failures.join(' / ')}）`)
    }

    if (athomeUrl) {
      console.log(`  ② athome`)
      console.log(`     ${athomeUrl}`)
      console.log(`     条件反映: 価格${athomeRef.price} 面積${athomeRef.area} 徒歩${athomeRef.walk} 築年${athomeRef.age}`)
    } else {
      console.log(`  ② athome  : ❌ URL生成失敗（${failures.join(' / ')}）`)
    }

    if (homesUrl) {
      console.log(`  ③ HOME'S`)
      console.log(`     ${homesUrl}`)
      console.log(`     条件反映: 価格${homesRef.price} 面積${homesRef.area} 徒歩${homesRef.walk} 築年${homesRef.age}`)
    } else {
      console.log(`  ③ HOME'S  : ❌ URL生成失敗（${failures.join(' / ')}）`)
    }

    console.log()

    summary.push({
      id:     cond.id,
      area:   cond.area,
      type:   typeLabel,
      master: !!master,
      suumo:  !!suumoUrl,
      athome: !!athomeUrl,
      homes:  !!homesUrl,
      suumoVerified:  pSuumo?.verified  ?? false,
      athomeVerified: pAthome?.verified ?? false,
      homesVerified:  pHomes?.verified  ?? false,
      failures,
      areaType: master?.area_type ?? '—',
    })
  }

  // ── サマリーテーブル ──────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(120))
  console.log('  サマリーテーブル')
  console.log('═'.repeat(120))

  const hdr = 'No  エリア            種別  マスタ  SUUMO         athome        homes         失敗理由'
  console.log(hdr)
  console.log('─'.repeat(120))

  for (const s of summary) {
    const areaCell    = s.area.padEnd(14)
    const typeCell    = s.type.padEnd(4)
    const masterCell  = s.master ? '✅ '+s.areaType.padEnd(7) : '❌ 未登録  '
    const suumoCell   = !s.suumo  ? '❌ 生成失敗   '
                      : !s.suumoVerified  ? '⚠️  未確認    '
                      : '✅ OK        '
    const athomeCell  = !s.athome ? '❌ 生成失敗   '
                      : !s.athomeVerified ? '⚠️  未確認    '
                      : '✅ OK        '
    const homesCell   = !s.homes  ? '❌ 生成失敗   '
                      : !s.homesVerified  ? '⚠️  未確認    '
                      : '✅ OK        '
    const failCell    = s.failures.length ? s.failures.join(', ') : '—'
    console.log(`${String(s.id).padStart(2)}  ${areaCell}  ${typeCell}  ${masterCell}  ${suumoCell}  ${athomeCell}  ${homesCell}  ${failCell}`)
  }

  console.log('─'.repeat(120))

  // ── 集計 ──────────────────────────────────────────────────────────────────
  const total       = summary.length
  const masterOk    = summary.filter(s => s.master).length
  const suumoOk     = summary.filter(s => s.suumo).length
  const athomeOk    = summary.filter(s => s.athome).length
  const homesOk     = summary.filter(s => s.homes).length
  const allOk       = summary.filter(s => s.suumo && s.athome && s.homes).length
  const masterFail  = summary.filter(s => !s.master).map(s => s.area)
  const suumoFail   = summary.filter(s => !s.suumo).map(s => s.area)
  const athomeFail  = summary.filter(s => !s.athome).map(s => s.area)
  const homesFail   = summary.filter(s => !s.homes).map(s => s.area)
  const unverified  = summary.filter(s => (s.suumo && !s.suumoVerified) || (s.athome && !s.athomeVerified) || (s.homes && !s.homesVerified))
                             .map(s => s.area)

  console.log(`\n  テスト総数      : ${total}件`)
  console.log(`  area_masters OK : ${masterOk}/${total} 件`)
  console.log(`  SUUMO URL生成   : ${suumoOk}/${total} 件`)
  console.log(`  athome URL生成  : ${athomeOk}/${total} 件`)
  console.log(`  HOME'S URL生成  : ${homesOk}/${total} 件`)
  console.log(`  3ポータル全成功 : ${allOk}/${total} 件`)
  if (masterFail.length) console.log(`\n  ❌ area_masters未登録  : ${masterFail.join(', ')}`)
  if (suumoFail.length)  console.log(`  ❌ SUUMO生成失敗       : ${suumoFail.join(', ')}`)
  if (athomeFail.length) console.log(`  ❌ athome生成失敗      : ${athomeFail.join(', ')}`)
  if (homesFail.length)  console.log(`  ❌ homes生成失敗       : ${homesFail.join(', ')}`)
  if (unverified.length) console.log(`  ⚠️  verified=false      : ${[...new Set(unverified)].join(', ')}`)
  console.log()
}

main().catch(e => { console.error(e); process.exit(1) })
