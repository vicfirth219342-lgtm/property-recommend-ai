'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface PriceChange {
  diff: number
  diffMan: number
  label: string
}

interface Property {
  id: string
  site: string
  name: string
  address: string | null
  transaction_type: 'sale' | 'rent'
  current_price: number | null
  last_price: number | null
  monthly_rent: number | null
  management_fee: number | null
  repair_fund: number | null
  floor_plan: string | null
  area_sqm: number | null
  walk_minutes: number | null
  building_age: number | null
  built_year: number | null
  built_month: number | null
  url: string
  thumbnail_url: string | null
  first_seen_at: string | null
  priceChange: PriceChange | null
  isNew: boolean
  proposed: boolean
  status: 'MATCH' | 'NO_MATCH' | 'NEED_MANUAL_CHECK'
  reasons: string[]
  missingFields: string[]
  managementFeeUnknown: boolean
  buildingAge: number | null
  reinsStatus: string | null
  reinsInfo: { reins_number: string | null; agent_company: string | null; decided_at: string } | null
  portalListings: { portal: string; source_url: string; is_active: boolean; last_seen_at: string; consecutive_miss_count: number }[]
}

interface Condition {
  area: string | null
  transaction_type: 'sale' | 'rent' | null
  budget_min: number | null
  budget_max: number | null
  rent_min: number | null
  rent_max: number | null
  area_sqm_min: number | null
  area_sqm_max: number | null
  walk_minutes_max: number | null
  building_age_max: number | null
}

interface Summary {
  inScopeTotal: number
  outOfScopeTotal: number
  matchCount: number
  needManualCount: number
  noMatchCount: number
  noMatchReasons: Record<string, number>
  missingFieldCounts: Record<string, number>
  hasSourceTable: boolean
  sourceCount: number
}

interface CandidatesResponse {
  customer: { id: string; name: string; customer_no: string; rank: string }
  conditions: Condition | null
  matches: Property[]
  needManual: Property[]
  noMatch: Property[]
  total: number
  priceChangedCount: number
  newCount: number
  summary: Summary
}

const SITE_LABELS: Record<string, string> = {
  suumo: 'SUUMO',
  athome: 'アットホーム',
  homes: "HOME'S",
}

type TabKey = 'match' | 'manual' | 'nomatch'
type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'price_change'

// ── ユーティリティ ──────────────────────────────────────────
function builtLabel(year: number | null, month: number | null): string {
  if (!year) return '築年月不明'
  return month ? `${year}年${month}月` : `${year}年`
}

function calcAge(year: number | null, month: number | null): number | null {
  if (!year) return null
  const now = new Date()
  const age = now.getFullYear() - year
  return month && month > now.getMonth() + 1 ? age - 1 : age
}

function ageLabel(year: number | null, month: number | null): string {
  const age = calcAge(year, month)
  if (age === null) return '築年数不明'
  if (age === 0) return '築1年未満'
  return `築${age}年`
}

function priceMan(val: number | null): string {
  if (!val) return '—'
  return `${val.toLocaleString()}万円`
}

function rentLabel(rent: number | null): string {
  if (!rent) return '賃料未定'
  const man = rent / 10000
  return `${man % 1 === 0 ? man : man.toFixed(1)}万円/月`
}

function feeLabel(fee: number | null): string {
  if (fee === null || fee === undefined) return '管理費確認中'
  if (fee === 0) return '管理費なし'
  const man = fee / 10000
  return `${man % 1 === 0 ? man : man.toFixed(1)}万円/月`
}

function totalRentLabel(rent: number | null, fee: number | null): string {
  if (!rent) return '—'
  if (fee === null || fee === undefined) return '総月額確認中'
  const total = (rent + fee) / 10000
  return `${total % 1 === 0 ? total : total.toFixed(1)}万円/月`
}

function fetchedAt(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
}

function matchedConditions(prop: Property, cond: Condition | null): string[] {
  if (!cond) return []
  const tags: string[] = []
  const txType = cond.transaction_type ?? 'sale'
  if (txType === 'sale') {
    if (cond.budget_min && prop.current_price && prop.current_price >= cond.budget_min) tags.push(`予算下限 ✓`)
    if (cond.budget_max && prop.current_price && prop.current_price <= cond.budget_max) tags.push(`予算上限 ✓`)
  } else {
    const rentMan = (prop.monthly_rent ?? 0) / 10000
    if (cond.rent_min && rentMan >= cond.rent_min) tags.push(`賃料下限 ✓`)
    if (cond.rent_max && rentMan <= cond.rent_max) tags.push(`賃料上限 ✓`)
  }
  if (cond.area_sqm_min && prop.area_sqm && prop.area_sqm >= cond.area_sqm_min) tags.push(`面積 ✓`)
  if (cond.walk_minutes_max && prop.walk_minutes && prop.walk_minutes <= cond.walk_minutes_max) tags.push(`徒歩 ✓`)
  if (cond.building_age_max) {
    const age = calcAge(prop.built_year, prop.built_month)
    if (age !== null && age <= cond.building_age_max) tags.push(`築年数 ✓`)
  }
  return tags
}

// ── メインページ ────────────────────────────────────────────
export default function CandidatesPage() {
  const params = useParams()
  const customerId = params.id as string

  const [data, setData] = useState<CandidatesResponse | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [proposing, setProposing] = useState<Set<string>>(new Set())
  const [localProposed, setLocalProposed] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<TabKey>('match')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [syncingReins, setSyncingReins] = useState(false)
  const [syncResult, setSyncResult] = useState<{ registered: number; skipped: number } | null>(null)

  const load = useCallback(() => {
    setLoading(true); setFetchError(null)
    fetch(`/api/proposals/candidates?customer_id=${customerId}`)
      .then(async r => {
        const json = await r.json()
        if (!r.ok || json.error) { setFetchError(json.error ?? 'エラーが発生しました'); return }
        if (!json.customer) { setFetchError('顧客情報が取得できませんでした'); return }
        setData(json)
      })
      .catch(() => setFetchError('通信エラーが発生しました'))
      .finally(() => setLoading(false))
  }, [customerId])

  useEffect(() => { load() }, [load])

  async function markProposed(propertyId: string) {
    setProposing(prev => new Set(prev).add(propertyId))
    await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId, property_ids: [propertyId] }),
    })
    setLocalProposed(prev => new Set(prev).add(propertyId))
    setProposing(prev => { const s = new Set(prev); s.delete(propertyId); return s })
  }

  async function syncToReinsCheck() {
    if (!data) return
    setSyncingReins(true); setSyncResult(null)
    const res = await fetch('/api/reins-check/sync-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId }),
    })
    const json = await res.json()
    if (res.ok) setSyncResult({ registered: json.registered, skipped: json.skipped })
    else alert(json.error ?? '登録エラー')
    setSyncingReins(false)
  }

  const cond    = data?.conditions ?? null
  const summary = data?.summary

  const tabList: Property[] = (() => {
    if (!data) return []
    const list = tab === 'match'  ? data.matches
               : tab === 'manual' ? data.needManual
               :                    data.noMatch
    return list.filter(p => !localProposed.has(p.id))
  })()

  const sorted = [...tabList].sort((a, b) => {
    const pa = a.transaction_type === 'rent' ? (a.monthly_rent ?? 0) : (a.current_price ?? 0)
    const pb = b.transaction_type === 'rent' ? (b.monthly_rent ?? 0) : (b.current_price ?? 0)
    if (sortKey === 'price_asc')    return pa - pb
    if (sortKey === 'price_desc')   return pb - pa
    if (sortKey === 'price_change') return (b.priceChange ? 1 : 0) - (a.priceChange ? 1 : 0)
    return new Date(b.first_seen_at ?? 0).getTime() - new Date(a.first_seen_at ?? 0).getTime()
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400">照合中...</p>
      </div>
    )
  }
  if (fetchError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500 font-medium">{fetchError}</p>
        <Link href="/customers" className="text-sm text-slate-500 hover:underline">← 顧客一覧に戻る</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/customers/${customerId}`} className="text-slate-400 hover:text-slate-600 text-sm">
              ← 顧客詳細
            </Link>
            {data?.customer && (
              <>
                <span className="text-slate-300">|</span>
                <span className="font-semibold">{data.customer.name}</span>
                <span className="text-xs text-slate-400">{data.customer.customer_no}</span>
              </>
            )}
          </div>
          <div className="flex gap-2 items-center">
            {syncResult && (
              <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded">
                照合リストに{syncResult.registered}件追加（{syncResult.skipped}件スキップ）
              </span>
            )}
            <Link
              href={`/customers/${customerId}/portal-search`}
              className="text-sm bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
            >
              全ポータルを一括検索
            </Link>
            <button
              onClick={syncToReinsCheck}
              disabled={syncingReins || !data}
              className="text-sm border border-blue-300 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 disabled:opacity-40 transition-colors"
            >
              {syncingReins ? '登録中...' : 'レインズ照合リストに追加'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* 条件チップ */}
        {cond && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 flex flex-wrap gap-2 text-sm">
            <span className="text-slate-400 text-xs self-center">照合条件：</span>
            {cond.transaction_type && <Chip label={cond.transaction_type === 'sale' ? '売買' : '賃貸'} color={cond.transaction_type === 'sale' ? 'blue' : 'purple'} />}
            {cond.area && <Chip label={`エリア: ${cond.area}`} />}
            {cond.transaction_type !== 'rent' && (cond.budget_min || cond.budget_max) && (
              <Chip label={`予算: ${cond.budget_min ?? '-'}〜${cond.budget_max ?? '-'}万円`} />
            )}
            {cond.transaction_type === 'rent' && (cond.rent_min || cond.rent_max) && (
              <Chip label={`賃料: ${cond.rent_min ?? '-'}〜${cond.rent_max ?? '-'}万円/月`} />
            )}
            {cond.area_sqm_min && <Chip label={`${cond.area_sqm_min}㎡以上`} />}
            {cond.walk_minutes_max && <Chip label={`徒歩${cond.walk_minutes_max}分以内`} />}
            {cond.building_age_max && <Chip label={`築${cond.building_age_max}年以内`} />}
          </div>
        )}

        {/* サマリーカード */}
        {summary && (
          <div className="grid grid-cols-4 gap-3 mb-5">
            <StatCard label="エリア内取得" value={`${summary.inScopeTotal}件`} sub={summary.outOfScopeTotal > 0 ? `エリア外 ${summary.outOfScopeTotal}件除外` : undefined} />
            <StatCard label="条件一致" value={`${Math.max(0, summary.matchCount - localProposed.size)}件`} color="green" />
            <StatCard label="手動確認" value={`${summary.needManualCount}件`} color="amber" />
            <StatCard label="条件不一致" value={`${summary.noMatchCount}件`} color="slate" />
          </div>
        )}

        {/* ソーステーブル警告 */}
        {summary && !summary.hasSourceTable && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            ⚠️ エリアフィルタ無効：<code>customer_property_sources</code> テーブルが未作成です
          </div>
        )}

        {/* タブ */}
        <div className="flex gap-1 mb-4 border-b border-slate-200">
          {([
            { key: 'match'   as TabKey, label: '✅ 条件一致',   count: (data?.matches.filter(p => !localProposed.has(p.id)).length ?? 0) },
            { key: 'manual'  as TabKey, label: '🔍 手動確認',   count: (data?.needManual.filter(p => !localProposed.has(p.id)).length ?? 0) },
            { key: 'nomatch' as TabKey, label: '❌ 条件不一致', count: (data?.noMatch.length ?? 0) },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? 'border-slate-800 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                tab === t.key ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {t.count}
              </span>
            </button>
          ))}
          {/* ソート（条件一致タブのみ） */}
          {tab === 'match' && (
            <div className="ml-auto flex items-center gap-1 text-xs text-slate-500 pb-1">
              {([
                { key: 'newest'       as SortKey, label: '新着順' },
                { key: 'price_asc'   as SortKey, label: '価格↑' },
                { key: 'price_desc'  as SortKey, label: '価格↓' },
                { key: 'price_change'as SortKey, label: '価格変動' },
              ]).map(s => (
                <button
                  key={s.key}
                  onClick={() => setSortKey(s.key)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    sortKey === s.key ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* サブヘッダー（条件不一致 / 手動確認 用） */}
        {tab === 'manual' && summary && Object.keys(summary.missingFieldCounts).length > 0 && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex flex-wrap gap-3">
            <span className="font-medium">未取得項目：</span>
            {Object.entries(summary.missingFieldCounts).map(([f, cnt]) => (
              <span key={f} className="bg-white border border-amber-200 px-2 py-0.5 rounded">{f}不明：{cnt}件</span>
            ))}
          </div>
        )}
        {tab === 'nomatch' && summary && Object.keys(summary.noMatchReasons).length > 0 && (
          <div className="mb-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex flex-wrap gap-3">
            <span className="font-medium text-slate-700">除外理由：</span>
            {Object.entries(summary.noMatchReasons).map(([r, cnt]) => (
              <span key={r} className="bg-white border border-slate-200 px-2 py-0.5 rounded">{r}：{cnt}件</span>
            ))}
          </div>
        )}

        {/* 物件リスト */}
        {sorted.length === 0 ? (
          <div className="text-center text-slate-400 py-20 bg-white rounded-xl border border-slate-200">
            {tab === 'match' ? '条件に一致する物件がありません' :
             tab === 'manual' ? '手動確認が必要な物件はありません' :
             '条件不一致の物件はありません'}
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map(p => (
              <PropertyCard
                key={p.id}
                prop={p}
                tab={tab}
                cond={cond}
                isPending={proposing.has(p.id)}
                onPropose={tab !== 'nomatch' ? () => markProposed(p.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 物件カード ───────────────────────────────────────────────
function PropertyCard({
  prop: p, tab, cond, isPending, onPropose,
}: {
  prop: Property
  tab: TabKey
  cond: Condition | null
  isPending: boolean
  onPropose?: () => void
}) {
  const isSale = p.transaction_type === 'sale'
  const age = calcAge(p.built_year, p.built_month)
  const matched = tab === 'match' ? matchedConditions(p, cond) : []

  const borderClass = tab === 'match'  ? 'border-slate-200 hover:border-slate-300'
                    : tab === 'manual' ? 'border-amber-200 hover:border-amber-300'
                    :                    'border-slate-100 opacity-75'

  return (
    <div className={`bg-white rounded-xl border ${borderClass} p-5 transition-colors`}>
      <div className="flex gap-4">
        {/* サムネイル */}
        {p.thumbnail_url ? (
          <img src={p.thumbnail_url} alt={p.name}
            className="w-32 h-24 object-cover rounded-lg flex-shrink-0" />
        ) : (
          <div className="w-32 h-24 bg-slate-100 rounded-lg flex-shrink-0 flex items-center justify-center text-slate-300 text-xs">
            No Image
          </div>
        )}

        {/* 本文 */}
        <div className="flex-1 min-w-0">
          {/* 上段：バッジ + 物件名 */}
          <div className="flex items-start gap-2 mb-2 flex-wrap">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
              isSale ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
            }`}>
              {isSale ? '売買' : '賃貸'}
            </span>
            {/* 掲載元ポータルバッジ（複数掲載時は全ポータル表示・各URLへリンク） */}
            {(p.portalListings?.length ? p.portalListings : [{ portal: p.site, source_url: p.url, is_active: true, last_seen_at: '', consecutive_miss_count: 0 }]).map(li => (
              <a
                key={li.portal}
                href={li.source_url}
                target="_blank" rel="noopener noreferrer"
                title={li.is_active ? `${SITE_LABELS[li.portal] ?? li.portal}の掲載ページを開く` : '掲載終了の可能性（連続未取得）'}
                className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 hover:opacity-75 ${
                  li.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400 line-through'
                }`}
              >
                {SITE_LABELS[li.portal] ?? li.portal}
              </a>
            ))}
            {p.isNew && tab === 'match' && (
              <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded font-medium flex-shrink-0">新着</span>
            )}
            <a href={p.url} target="_blank" rel="noopener noreferrer"
              className="font-semibold text-sm hover:underline text-slate-800 leading-snug">
              {p.name}
            </a>
          </div>

          {/* 住所 */}
          {p.address && (
            <p className="text-xs text-slate-500 mb-3">{p.address}</p>
          )}

          {/* 価格グリッド */}
          {isSale ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 mb-3 text-sm">
              <DetailItem label="売買価格" value={
                <span className="font-bold text-slate-900 text-base">{priceMan(p.current_price)}</span>
              } />
              {p.priceChange && tab === 'match' && (
                <DetailItem label="価格変動" value={
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    p.priceChange.diff < 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                  }`}>
                    {p.priceChange.diff < 0 ? '▼' : '▲'} {p.priceChange.label}
                  </span>
                } />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 mb-3 text-sm">
              <DetailItem label="月額賃料" value={
                <span className="font-bold text-slate-900 text-base">{rentLabel(p.monthly_rent)}</span>
              } />
              <DetailItem label="管理費" value={
                <span className={p.management_fee === null ? 'text-amber-600 font-medium' : 'text-slate-800'}>
                  {feeLabel(p.management_fee)}
                </span>
              } />
              <DetailItem label="総月額" value={
                <span className={!p.management_fee ? 'text-amber-600 font-medium' : 'text-slate-900 font-bold'}>
                  {totalRentLabel(p.monthly_rent, p.management_fee)}
                </span>
              } />
            </div>
          )}

          {/* 仕様グリッド */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 text-xs text-slate-600 mb-3">
            {p.floor_plan   && <DetailItem label="間取り"   value={p.floor_plan} small />}
            {p.area_sqm     && <DetailItem label="専有面積" value={`${p.area_sqm}㎡`} small />}
            <DetailItem label="築年月"   value={builtLabel(p.built_year, p.built_month)} small />
            <DetailItem label="築年数"   value={ageLabel(p.built_year, p.built_month)} small />
            {p.walk_minutes !== null && p.walk_minutes !== undefined && (
              <DetailItem label="徒歩"     value={`${p.walk_minutes}分`} small />
            )}
            <DetailItem label="ポータル" value={SITE_LABELS[p.site] ?? p.site} small />
            <DetailItem label="取得日"   value={fetchedAt(p.first_seen_at)} small />
          </div>

          {/* 物件URL */}
          <div className="flex items-center gap-1.5 text-xs mb-3">
            <span className="text-slate-400">URL：</span>
            <a href={p.url} target="_blank" rel="noopener noreferrer"
              className="text-blue-600 hover:underline truncate max-w-xs">
              {p.url}
            </a>
            <a href={p.url} target="_blank" rel="noopener noreferrer"
              className="flex-shrink-0 text-xs border border-blue-200 text-blue-600 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors">
              開く↗
            </a>
          </div>

          {/* 一致した条件タグ（MATCHのみ） */}
          {tab === 'match' && matched.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {matched.map(m => (
                <span key={m} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                  {m}
                </span>
              ))}
            </div>
          )}

          {/* 除外理由タグ（NO_MATCHのみ） */}
          {tab === 'nomatch' && p.reasons.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {p.reasons.map((r, i) => (
                <span key={i} className="text-xs bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full">
                  {r}
                </span>
              ))}
            </div>
          )}

          {/* 未取得タグ（手動確認のみ） */}
          {tab === 'manual' && p.missingFields.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {p.missingFields.map(f => (
                <span key={f} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                  {f} 未取得
                </span>
              ))}
            </div>
          )}

          {/* 注意事項 */}
          {p.management_fee === null && !isSale && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ 管理費未取得のため総月額は確認中です。元ページで管理費をご確認ください。
            </p>
          )}

          {/* レインズ照合状態 */}
          {p.reinsStatus && (
            <div className="mt-2">
              {p.reinsStatus === 'confirmed' && (
                <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 rounded px-2.5 py-1.5">
                  <span className="text-green-700 font-semibold">レインズ掲載確認済み</span>
                  {p.reinsInfo?.reins_number && <span className="text-green-600">#{p.reinsInfo.reins_number}</span>}
                  {p.reinsInfo?.agent_company && <span className="text-green-600">{p.reinsInfo.agent_company}</span>}
                  {p.reinsInfo?.decided_at && <span className="text-green-400">{new Date(p.reinsInfo.decided_at).toLocaleDateString('ja-JP')}</span>}
                </div>
              )}
              {p.reinsStatus === 'needs_review' && (
                <span className="text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1 text-amber-700 font-medium">レインズ要確認</span>
              )}
              {p.reinsStatus === 'not_found' && (
                <span className="text-xs bg-red-50 border border-red-100 rounded px-2 py-1 text-red-500">レインズ掲載なし</span>
              )}
              {p.reinsStatus === 'pending' && (
                <span className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-400">レインズ照合待ち</span>
              )}
            </div>
          )}
          {!p.reinsStatus && (
            <div className="mt-2">
              <span className="text-xs text-slate-300">未照合</span>
            </div>
          )}
        </div>

        {/* 提案ボタン */}
        {onPropose && (
          <div className="flex-shrink-0 flex items-start pt-1">
            <button
              onClick={onPropose}
              disabled={isPending}
              className="text-xs border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white hover:border-slate-800 disabled:opacity-50 transition-all font-medium whitespace-nowrap"
            >
              {isPending ? '処理中...' : '提案済みにする'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 小コンポーネント ─────────────────────────────────────────
function DetailItem({
  label, value, small,
}: { label: string; value: React.ReactNode; small?: boolean }) {
  return (
    <div>
      <span className={`text-slate-400 ${small ? 'text-xs' : 'text-xs'}`}>{label}</span>
      <div className={small ? 'text-slate-700 text-xs mt-0.5' : 'mt-0.5'}>{value}</div>
    </div>
  )
}

function Chip({ label, color }: { label: string; color?: string }) {
  const cls = color === 'blue'   ? 'bg-blue-100 text-blue-700'
            : color === 'purple' ? 'bg-purple-100 text-purple-700'
            : 'bg-slate-100 text-slate-600'
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cls}`}>{label}</span>
}

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string
}) {
  const colorClass = color === 'green' ? 'text-green-600'
                   : color === 'amber' ? 'text-amber-600'
                   : color === 'slate' ? 'text-slate-400'
                   : 'text-slate-800'
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-300 mt-0.5">{sub}</div>}
    </div>
  )
}
