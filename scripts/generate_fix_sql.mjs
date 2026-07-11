#!/usr/bin/env node
/**
 * 未登録 portal_area_params の本番INSERT SQLを生成する
 * - area_masters の実在IDを使用
 * - 日本語スラグは除去してローマ字マッピングで解決
 * - verified=false, notes='要確認' で登録
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../.env.local')
const env = readFileSync(envPath, 'utf8')
const envMap = {}
for (const line of env.split('\n')) {
  const [k, ...vs] = line.split('=')
  if (k && vs.length) envMap[k.trim()] = vs.join('=').trim()
}

const SUPABASE_URL = envMap['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_KEY = envMap['SUPABASE_SERVICE_ROLE_KEY'] || envMap['NEXT_PUBLIC_SUPABASE_ANON_KEY']
const HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }

async function get(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: HEADERS })
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

// ── ローマ字マッピング（portal_area_params に登録済みのものから正引き） ──
// suumo の station_path の portal_url_param を "東京都駅名" → スラグ で逆引きマップを作る
async function buildSlugMap() {
  // 既存の登録から portal→ slug を逆引き
  const params = await get(
    'portal_area_params?select=area_id,portal,param_type,portal_url_param&limit=2000'
  )
  const masters = await get(
    'area_masters?select=id,display_name,area_type,prefecture&prefecture=in.(東京都,神奈川県)&limit=1000'
  )

  // area_id → master
  const masterById = new Map(masters.map(m => [m.id, m]))

  // portal×display_name → portal_url_param
  const slugMap = { suumo: {}, athome: {}, homes: {} }
  for (const p of params) {
    const m = masterById.get(p.area_id)
    if (!m) continue
    const key = `${m.prefecture}__${m.display_name}`
    if (!slugMap[p.portal]) continue
    slugMap[p.portal][key] = { paramType: p.param_type, paramValue: p.portal_url_param }
  }
  return { slugMap, masters, params }
}

// ── ローマ字変換テーブル（主要な駅・区・市） ──────────────────────────────
// 既存データの portal_url_param パターンを参考に手動マッピング
const JP_TO_ROMAJI = {
  // 神奈川 駅
  '川崎': 'kawasaki', '横浜': 'yokohama', '武蔵小杉': 'musashikosugi',
  '新丸子': 'shinnmaruko', '元住吉': 'motosumiyoshi', '日吉': 'hiyoshi',
  '綱島': 'tsunashima', '菊名': 'kikuna', '大倉山': 'okurayama',
  '新横浜': 'shinyokohama', '小机': 'kozukue', '鴨居': 'kamoi',
  '中山': 'nakayama', '長津田': 'nagatsuta', '十日市場': 'tokaichibastation',
  '中町': 'nakamachi', '溝の口': 'mizonokuchi', '津田山': 'tsudayama',
  '久地': 'kuji', '宿河原': 'shukugawara', '登戸': 'noborito',
  '向ヶ丘遊園': 'mukogaokayuen', '生田': 'ikuta', '読売ランド前': 'yomiurilandmae',
  '百合ヶ丘': 'yurigaoka', '新百合ヶ丘': 'shinyurigaoka', '柿生': 'kakinoki',
  '鶴川': 'tsurukawa', '町田': 'machida', '相模大野': 'sagamiono',
  '小田急相模原': 'odakyusagamihara', '相武台前': 'sobudaimae',
  '座間': 'zama', '海老名': 'ebina', '厚木': 'atsugi',
  '本厚木': 'honatsugis', '愛甲石田': 'aikoishida', '伊勢原': 'isehara',
  '鶴巻温泉': 'tsurumakionsen', '東海大学前': 'tokaidaigakumae',
  '秦野': 'hadano', '渋沢': 'shibusawa', '新松田': 'shinmatsuda',
  '松田': 'matsuda', '東名厚木': 'tomeiatsugis',
  '二子玉川': 'futakotamagawa', '二子新地': 'futakoshinchi',
  '高津': 'takatsu', '梶が谷': 'kajigaya', '宮崎台': 'miyazakidai',
  '宮前平': 'miyamaedaira', '鷺沼': 'saginuma', 'たまプラーザ': 'tamapraza',
  'あざみ野': 'azamino', '江田': 'eda', '市が尾': 'ichigao',
  '藤が丘': 'fujigaoka', '青葉台': 'aobadai', '田奈': 'tana',
  '恩田': 'onda', 'こどもの国': 'kodomonokuni',
  '大船': 'ofuna', '戸塚': 'totsuka', '横須賀': 'yokosuka',
  '逗子': 'zushi', '鎌倉': 'kamakura', '北鎌倉': 'kitakamakura',
  '藤沢': 'fujisawa', '辻堂': 'tsujido', '茅ヶ崎': 'chigasaki',
  '平塚': 'hiratsuka', '二宮': 'ninomiya',
  // 東京 駅
  '渋谷': 'shibuya', '新宿': 'shinjuku', '池袋': 'ikebukuro',
  '品川': 'shinagawa', '上野': 'ueno', '秋葉原': 'akihabara',
  '東京': 'tokyo', '有楽町': 'yurakucho', '新橋': 'shinbashi',
  '浜松町': 'hamamatsucho', '田町': 'tamachi', '大崎': 'osaki',
  '恵比寿': 'ebisu', '目黒': 'meguro', '五反田': 'gotanda',
  '大井町': 'oimachi', '蒲田': 'kamata', '川崎（東京口）': 'kawasaki',
  '赤坂': 'akasaka', '六本木': 'roppongi', '麻布十番': 'azabujuban',
  '白金高輪': 'shirokane-takanawa', '高輪ゲートウェイ': 'takanawagatewayst',
  '三田': 'mita', '芝公園': 'shibakoen', '御成門': 'onarimon',
  '大門': 'daimon', '浜崎橋': 'hamazakibashi', '汐留': 'shiodome',
  '築地': 'tsukiji', '月島': 'tsukishima', '勝どき': 'kachidoki',
  '豊洲': 'toyosu', '辰巳': 'tatsumi', '新木場': 'shinkiba',
  '天王洲アイル': 'tennozuaisle', '国際展示場': 'kokusakitenjijo',
  '台場': 'daiba', '東雲': 'shinonome', '東京テレポート': 'tokyoteleport',
  '錦糸町': 'kinshicho', '亀戸': 'kameido', '平井': 'hirai',
  '新小岩': 'shinkoiwa', '小岩': 'koiwa', '市川': 'ichikawa',
  '亀有': 'kameari', '金町': 'kanamachi', '松戸': 'matsudo',
  '北千住': 'kitasenju', '南千住': 'minamiesenju', '三ノ輪': 'minowa',
  '入谷': 'iriya', '鶯谷': 'uguisudani', '日暮里': 'nippori',
  '新三河島': 'shimmikawashima', '町屋': 'machiya', '東尾久三丁目': 'higashiogusanchome',
  '熊野前': 'kumanomae', '宮ノ前': 'miyanomae', '小台': 'odai',
  '荒川遊園地前': 'arakawayuenchimae', '荒川車庫前': 'arakawashakochomae',
  '荒川二丁目': 'arakawanichome', '荒川七丁目': 'arakawananachome',
  '町屋二丁目': 'machiyanchome',
  '中野': 'nakano', '高円寺': 'koenji', '阿佐ヶ谷': 'asagaya',
  '荻窪': 'ogikubo', '西荻窪': 'nishiogikubo', '吉祥寺': 'kichijoji',
  '三鷹': 'mitaka', '武蔵境': 'musashisakai', '東小金井': 'higashikoganei',
  '武蔵小金井': 'musashikoganei', '国分寺': 'kokubunji',
  '西国分寺': 'nishikokubunji', '国立': 'kunitachi', '立川': 'tachikawa',
  '日野': 'hino', '豊田': 'toyota', '八王子': 'hachioji',
  '西八王子': 'nishihachioji', '高尾': 'takao',
  '代々木': 'yoyogi', '千駄ヶ谷': 'sendagaya', '信濃町': 'shinanomachi',
  '四ツ谷': 'yotsuya', '市ケ谷': 'ichigaya', '飯田橋': 'iidabashi',
  '水道橋': 'suidobashi', '御茶ノ水': 'ochanomizu', '神田': 'kanda',
  '代官山': 'daikanyama', '中目黒': 'nakameguro', '祐天寺': 'yutenjis',
  '学芸大学': 'gakugeidaigaku', '都立大学': 'toritsu-daigaku',
  '自由が丘': 'jiyugaoka', '田園調布': 'denen-chofu',
  '多摩川': 'tamagawa', '新丸子（東急）': 'shinmaruko',
  '下北沢': 'shimokitazawa', '世田谷代田': 'setagayadaita',
  '梅ヶ丘': 'umegaoka', '豪徳寺': 'gotokuji', '山下': 'yamashita',
  '松原': 'matsubara', '明大前': 'meidaimae', '下高井戸': 'shimotakaido',
  '桜上水': 'sakurajosui', '上北沢': 'kamikitazawa', '八幡山': 'hachimanyama',
  '芦花公園': 'rokakouen', '千歳烏山': 'chitosekarasuyama',
  '仙川': 'sengawa', 'つつじヶ丘': 'tsutsujioka', '柴崎': 'shibasaki',
  '国領': 'kokuryo', '布田': 'fuda', '調布': 'chofu',
  '西調布': 'nishicho', '飛田給': 'tobita', '武蔵野台': 'musashinodai',
  '多磨霊園': 'tamagoreien', '白糸台': 'shiraito-dai', '競艇場前': 'kyoteijomae',
  '是政': 'koremasa', '南武線矢野口': 'nanbusenyanoguchi',
  '稲城長沼': 'inaginaganuma', '稲城': 'inagi', '矢野口': 'yanoguchi',
  '南多摩': 'minamitama', '府中本町': 'fuchuhomachi', '分倍河原': 'bubaigawara',
  '府中': 'fuchu', '東府中': 'higashifuchu', '多磨': 'tama',
  '北府中': 'kitafuchu',
  '二重橋前': 'nijubashimae', '京橋': 'kyobashi', '銀座': 'ginza',
  '新富町': 'shintomichostation', '八丁堀': 'hatchobori', '越中島': 'etchujima',
  '潮見': 'shiomi', '葛西臨海公園': 'kasairinkaikouen', '舞浜': 'maihama',
  // 区
  '千代田区': 'chiyoda', '中央区': 'chuo', '港区': 'minato',
  '新宿区': 'shinjuku', '文京区': 'bunkyo', '台東区': 'taito',
  '墨田区': 'sumida', '江東区': 'koto', '品川区': 'shinagawa',
  '目黒区': 'meguro', '大田区': 'ota', '世田谷区': 'setagaya',
  '渋谷区': 'shibuya', '中野区': 'nakano', '杉並区': 'suginami',
  '豊島区': 'toshima', '北区': 'kita', '荒川区': 'arakawa',
  '板橋区': 'itabashi', '練馬区': 'nerima', '足立区': 'adachi',
  '葛飾区': 'katsushika', '江戸川区': 'edogawa',
  // 市（東京）
  '八王子市': 'hachioji', '立川市': 'tachikawa', '武蔵野市': 'musashino',
  '三鷹市': 'mitaka', '青梅市': 'ome', '府中市': 'fuchu',
  '昭島市': 'akishima', '調布市': 'chofu', '町田市': 'machida',
  '小金井市': 'koganei', '小平市': 'kodaira', '日野市': 'hino',
  '東村山市': 'higashimurayama', '国分寺市': 'kokubunji',
  '国立市': 'kunitachi', '福生市': 'fussa', '狛江市': 'komae',
  '東大和市': 'higashiyamato', '清瀬市': 'kiyose', '東久留米市': 'higashikurume',
  '武蔵村山市': 'musashimurayama', '多摩市': 'tama', '稲城市': 'inagi',
  '羽村市': 'hamura', 'あきる野市': 'akiruno', '西東京市': 'nishitokyo',
  // 市（神奈川）
  '横浜市': 'yokohama', '川崎市': 'kawasaki', '相模原市': 'sagamihara',
  '横須賀市': 'yokosuka', '平塚市': 'hiratsuka', '鎌倉市': 'kamakura',
  '藤沢市': 'fujisawa', '小田原市': 'odawara', '茅ヶ崎市': 'chigasaki',
  '逗子市': 'zushi', '三浦市': 'miura', '秦野市': 'hadano',
  '厚木市': 'atsugi', '大和市': 'yamato', '伊勢原市': 'isehara',
  '海老名市': 'ebina', '座間市': 'zama', '南足柄市': 'minamiashigara',
  '綾瀬市': 'ayase',
  // 東京 追加駅
  '高田馬場': 'takadanobaba', '王子': 'oji', '赤羽': 'akabane',
  '明治神宮前': 'meijijingumae', '湯島': 'yushima', '根津': 'nezu',
  '千駄木': 'sendagi', '浅草': 'asakusa', '日比谷': 'hibiya',
  '早稲田': 'waseda', '神楽坂': 'kagurazaka', '九段下': 'kudanshita',
  '水天宮前': 'suitengumae', '半蔵門': 'hanzomon', '神保町': 'jimbocho',
  '本駒込': 'honkomagome', '西ヶ原': 'nishigahara', '赤羽岩淵': 'akabaneiwabuchi',
  '春日': 'kasuga', '千石': 'sengoku', '西巣鴨': 'nishisugamo',
  '高島平': 'takashimadaira', '森下': 'morishita', '菊川': 'kikukawa',
  '馬喰横山': 'bakuroyokoyama', '岩本町': 'iwamotocho', '曙橋': 'akebonobashi',
  '代田橋': 'daitabashi', '両国': 'ryogoku', '駒場東大前': 'komabatoddaimae',
  '狛江': 'komae', '立川北': 'tachikawakit', '立川南': 'tachikawamina',
  '代々木公園': 'yoyogikouen', '赤羽橋': 'akabanebashi',
  '泉岳寺': 'sengakuji', '神谷町': 'kamiyacho',
  '六本木一丁目': 'roppongiiichome', '溜池山王': 'tameikesanno',
  '新宿三丁目': 'shinjukusanchome', '若松河田': 'wakamatsu-kawada',
  '牛込神楽坂': 'ushigome-kagurazaka', '永田町': 'nagatacho',
  '霞ヶ関': 'kasumigaseki', '洗足': 'senzoku',
  '本郷三丁目': 'hongosanchome', '茗荷谷': 'myogadani',
  '東池袋': 'higashiikebukuro', '高幡不動': 'takahatafudo',
  '多摩センター': 'tamacenter',
  // 東京 市・村
  '檜原村': 'hinohara',
  // 神奈川 追加駅
  '小田原': 'odawara', '元町・中華街': 'motomachichuukagai',
  '京急川崎': 'keikyu-kawasaki', '江ノ島': 'enoshima',
  // 神奈川 区（相模原市）
  '相模原市緑区': 'sagamihara-midori-ku',
  '相模原市中央区': 'sagamihara-chuo-ku', '相模原市南区': 'sagamihara-minami-ku',
  // 神奈川 溝ノ口系
  '武蔵溝ノ口': 'musashimizonokuchi',
}

// 名前 → ローマ字スラグ
function toRomaji(name, areaType) {
  // 区・市 suffix を取り除いて検索
  const normalized = name.replace(/[駅区市町村]$/, '')
  const withSuffix = name

  // マッピングテーブルから直接取得
  if (JP_TO_ROMAJI[withSuffix]) return JP_TO_ROMAJI[withSuffix]
  if (JP_TO_ROMAJI[normalized]) return JP_TO_ROMAJI[normalized]
  return null  // マッピングなし
}

function buildParam(master, portal, existingSlugMap) {
  const { id, display_name: name, area_type, prefecture } = master
  const pref = prefecture === '神奈川県' ? 'kanagawa' : 'tokyo'
  const key = `${prefecture}__${name}`

  // 同エリアの他ポータルのスラグから推測できないか試みる
  const knownSuumo = existingSlugMap.suumo[key]
  const knownAthome = existingSlugMap.athome[key]
  const knownHomes = existingSlugMap.homes[key]

  const romaji = toRomaji(name, area_type)

  if (portal === 'suumo') {
    // suumo: station_path = pref/eki_slug, city_path = pref/slug
    if (!romaji) return null
    if (area_type === 'station') {
      return { paramType: 'station_path', paramValue: `${pref}/eki_${romaji}` }
    }
    const slug = romaji.replace(/[区市]$/, '')
    return { paramType: 'city_path', paramValue: `${pref}/${slug}` }
  }

  if (portal === 'athome' || portal === 'homes') {
    // athome/homes: station_path = /pref/slug-station, city_path = /pref/slug-city 等
    // 既存の homes データから athome を推測、その逆も
    if (portal === 'athome' && knownHomes) {
      return { paramType: knownHomes.paramType, paramValue: knownHomes.paramValue }
    }
    if (portal === 'homes' && knownAthome) {
      return { paramType: knownAthome.paramType, paramValue: knownAthome.paramValue }
    }

    if (!romaji) return null

    if (area_type === 'station') {
      return { paramType: 'station_path', paramValue: `/${pref}/${romaji}-station` }
    }
    const slug = romaji.replace(/[区市]$/, '')
    return { paramType: 'city_path', paramValue: `/${pref}/${slug}-city` }
  }
  return null
}

;(async () => {
  console.log('🔍 欠落 portal_area_params を検出中...')

  const { slugMap: existingSlugMap, masters, params } = await buildSlugMap()
  console.log(`  area_masters: ${masters.length} 件, portal_area_params: ${params.length} 件`)

  // area_id → registered portals
  const registeredPortals = new Map()
  for (const p of params) {
    if (!registeredPortals.has(p.area_id)) registeredPortals.set(p.area_id, new Set())
    registeredPortals.get(p.area_id).add(p.portal)
  }

  const PORTALS = ['suumo', 'athome', 'homes']
  const missing = []

  for (const master of masters) {
    const registered = registeredPortals.get(master.id) ?? new Set()
    for (const portal of PORTALS) {
      if (!registered.has(portal)) {
        const suggestion = buildParam(master, portal, existingSlugMap)
        missing.push({ master, portal, suggestion })
      }
    }
  }

  const withSuggestion  = missing.filter(m => m.suggestion)
  const withoutSuggestion = missing.filter(m => !m.suggestion)

  console.log(`\n  未登録合計: ${missing.length} 件`)
  console.log(`  スラグ推測可能: ${withSuggestion.length} 件`)
  console.log(`  スラグ不明（要手動）: ${withoutSuggestion.length} 件`)

  if (withoutSuggestion.length > 0) {
    console.log('\n⚠️  スラグ不明（ローマ字マッピング未定義）:')
    for (const { master, portal } of withoutSuggestion) {
      console.log(`  ${master.display_name} (${master.area_type}/${master.prefecture}) → ${portal}`)
    }
  }

  // SQL 生成
  const lines = [
    '-- ============================================================',
    '-- fix_missing_portal_params.sql',
    `-- 生成日時: ${new Date().toISOString()}`,
    `-- 未登録: ${withSuggestion.length} 件のINSERT (スラグ推測可能分のみ)`,
    `-- スラグ不明のため除外: ${withoutSuggestion.length} 件`,
    '-- ⚠️  verified=false で登録。URLを目視確認後 verified=true に更新してください',
    '-- ON CONFLICT DO NOTHING で冪等（重複安全）',
    '-- ============================================================',
    '',
    'ALTER TABLE portal_area_params',
    '  ADD CONSTRAINT IF NOT EXISTS portal_area_params_area_portal_unique',
    '  UNIQUE (area_id, portal, param_type);',
    '',
  ]

  // ポータル別に並べて見やすくする
  for (const portal of PORTALS) {
    const items = withSuggestion.filter(m => m.portal === portal)
    if (!items.length) continue
    lines.push(`-- ── ${portal.toUpperCase()} (${items.length}件) ─────────────────────────────────────`)
    for (const { master, portal: p, suggestion } of items) {
      lines.push(
        `INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES`,
        `  ('${master.id}', '${p}', '${suggestion.paramType}', '${suggestion.paramValue}', false, '要確認：自動生成 ${new Date().toISOString().slice(0,10)}')`,
        `  -- ${master.display_name} (${master.area_type}/${master.prefecture})`,
        `  ON CONFLICT DO NOTHING;`,
        '',
      )
    }
  }

  if (withoutSuggestion.length > 0) {
    lines.push('-- ── スラグ不明のため除外（手動登録が必要）──────────────────')
    for (const { master, portal } of withoutSuggestion) {
      lines.push(`-- MISSING: ${master.display_name} (${master.area_type}/${master.prefecture}) → ${portal}`)
    }
  }

  const sql = lines.join('\n')
  const outPath = resolve(__dir, '../supabase/fix_missing_portal_params.sql')
  writeFileSync(outPath, sql, 'utf8')
  console.log(`\n💾 SQL保存: supabase/fix_missing_portal_params.sql (${withSuggestion.length} 件のINSERT)`)
  console.log('完了。')
})().catch(e => { console.error('❌', e.message); process.exit(1) })
