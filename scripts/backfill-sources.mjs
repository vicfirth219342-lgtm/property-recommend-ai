#!/usr/bin/env node
/**
 * scripts/backfill-sources.mjs
 * 既存 properties を customer_property_sources にバックフィルする。
 * customer_property_sources テーブル作成後に1回だけ実行する。
 *
 * 判定ルール（アドレスベースのヒューリスティック）:
 *   - 神奈川県川崎市: 八矢様（武蔵小杉・武蔵中原）の sale 物件
 *   - 東京都渋谷区・新宿区の賃貸: 清藤様（初台）の rent 物件
 *   それ以外（東京都新宿区の売買等）: どの顧客にも紐付けない
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
const NOW = new Date().toISOString()

const args    = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')

async function sbGet(path) {
  const r = await fetch(`${SB}/rest/v1/${path}`, { headers: H })
  if (!r.ok) throw new Error(`GET ${path}: ${r.status} ${await r.text()}`)
  return r.json()
}
async function sbUpsert(table, rows) {
  if (DRY_RUN) { console.log(`  [DRY] UPSERT ${table}: ${rows.length}件`); return }
  const r = await fetch(`${SB}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  })
  if (!r.ok) throw new Error(`UPSERT ${table}: ${r.status} ${await r.text()}`)
}

;(async () => {
  console.log(`\n🔧 customer_property_sources バックフィル${DRY_RUN ? ' [DRY RUN]' : ''}\n`)

  // 顧客情報
  const custs = await sbGet('customers?select=id,name')
  const custByName = new Map(custs.map(c => [c.name, c.id]))
  const yayaId   = custByName.get('八矢様')
  const kiyofujiId = custByName.get('清藤')
  console.log(`八矢様 ID: ${yayaId}`)
  console.log(`清藤 ID:   ${kiyofujiId}`)

  // area_masters から対象エリアIDを取得
  const areaMasters = await sbGet(
    'area_masters?display_name=in.("武蔵小杉","武蔵中原","初台")&select=id,display_name'
  )
  const areaByName = new Map(areaMasters.map(a => [a.display_name, a.id]))
  console.log('エリアID:', Object.fromEntries(areaByName))

  // 全物件を取得
  const all = await sbGet(
    'properties?select=id,address,transaction_type,site&limit=2000'
  )
  console.log(`\n全物件: ${all.length}件`)

  const sourceRows = []

  for (const p of all) {
    const addr = p.address ?? ''
    const tx   = p.transaction_type

    // 八矢様: 神奈川県川崎市の売買物件
    if (tx === 'sale' && addr.includes('神奈川県川崎市') && yayaId) {
      // 中原区 → 武蔵小杉 or 武蔵中原、高津区/幸区 → 武蔵小杉 (隣接エリア)
      const areaId = addr.includes('中原区')
        ? (areaByName.get('武蔵中原') ?? areaByName.get('武蔵小杉'))
        : areaByName.get('武蔵小杉')

      sourceRows.push({
        customer_id: yayaId,
        property_id: p.id,
        area_id:     areaId ?? null,
        portal:      p.site,
        search_url:  null,
        crawled_at:  NOW,
      })
    }

    // 清藤様: 東京都渋谷区・新宿区の賃貸物件
    if (tx === 'rent' && (addr.includes('東京都渋谷区') || addr.includes('東京都新宿区')) && kiyofujiId) {
      sourceRows.push({
        customer_id: kiyofujiId,
        property_id: p.id,
        area_id:     areaByName.get('初台') ?? null,
        portal:      p.site,
        search_url:  null,
        crawled_at:  NOW,
      })
    }
  }

  // 八矢様・清藤様の件数を集計
  const yayaRows     = sourceRows.filter(r => r.customer_id === yayaId)
  const kiyofujiRows = sourceRows.filter(r => r.customer_id === kiyofujiId)
  console.log(`\n八矢様 → ${yayaRows.length}件紐付け`)
  console.log(`清藤様 → ${kiyofujiRows.length}件紐付け`)
  console.log(`合計   → ${sourceRows.length}件`)

  if (sourceRows.length === 0) {
    console.log('紐付け対象なし。終了します。')
    return
  }

  await sbUpsert('customer_property_sources', sourceRows)
  console.log(`\n✅ バックフィル完了${DRY_RUN ? ' [DRY RUN]' : ''}`)
})().catch(e => { console.error('❌', e.message); process.exit(1) })
