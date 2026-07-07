'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { formatBuiltDateLabel } from '@/lib/parseBuiltDate'

interface PriceChange {
  diff: number
  diffMan: number
  label: string
}

interface Candidate {
  id: string
  site: string
  name: string
  address: string | null
  current_price: number | null
  last_price: number | null
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
}

interface Condition {
  area: string | null
  budget_min: number | null
  budget_max: number | null
  area_sqm_min: number | null
  area_sqm_max: number | null
  walk_minutes_max: number | null
  building_age_max: number | null
}

interface CandidatesResponse {
  customer: { id: string; name: string; customer_no: string; rank: string }
  conditions: Condition | null
  candidates: Candidate[]
  total: number
  priceChangedCount: number
  newCount: number
}

const SITE_LABELS: Record<string, string> = {
  suumo: 'SUUMO',
  athome: 'アットホーム',
  homes: "HOME'S",
}

const SITE_COLORS: Record<string, string> = {
  suumo: 'bg-green-100 text-green-700',
  athome: 'bg-orange-100 text-orange-700',
  homes: 'bg-blue-100 text-blue-700',
}

type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'price_change'
type FilterKey = 'all' | 'new' | 'price_changed'

function formatPrice(price: number | null) {
  if (!price) return '価格未定'
  return `${(price / 10000).toLocaleString()}万円`
}

export default function CandidatesPage() {
  const params = useParams()
  const customerId = params.id as string

  const [data, setData] = useState<CandidatesResponse | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [proposing, setProposing] = useState<Set<string>>(new Set())
  const [proposed, setProposed] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [filterKey, setFilterKey] = useState<FilterKey>('all')
  const [bulkProposing, setBulkProposing] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setFetchError(null)
    fetch(`/api/proposals/candidates?customer_id=${customerId}`)
      .then(async r => {
        const json = await r.json()
        if (!r.ok || json.error) {
          setFetchError(json.error ?? '顧客情報が取得できませんでした')
          return
        }
        // customer フィールドが欠落している場合もエラー扱い
        if (!json.customer) {
          setFetchError('顧客情報が取得できませんでした')
          return
        }
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
    setProposed(prev => new Set(prev).add(propertyId))
    setProposing(prev => { const s = new Set(prev); s.delete(propertyId); return s })
  }

  async function markAllProposed() {
    if (!data) return
    const ids = visibleCandidates.map(c => c.id)
    if (!confirm(`表示中の${ids.length}件を全て提案済みにしますか？`)) return
    setBulkProposing(true)
    await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId, property_ids: ids }),
    })
    setProposed(prev => new Set([...prev, ...ids]))
    setBulkProposing(false)
  }

  const candidates = data?.candidates ?? []

  // フィルタ
  const filtered = candidates.filter(c => {
    if (proposed.has(c.id)) return false
    if (filterKey === 'new') return c.isNew
    if (filterKey === 'price_changed') return c.priceChange !== null
    return true
  })

  // ソート
  const visibleCandidates = [...filtered].sort((a, b) => {
    if (sortKey === 'price_asc') return (a.current_price ?? 0) - (b.current_price ?? 0)
    if (sortKey === 'price_desc') return (b.current_price ?? 0) - (a.current_price ?? 0)
    if (sortKey === 'price_change') {
      const aChanged = a.priceChange !== null ? 1 : 0
      const bChanged = b.priceChange !== null ? 1 : 0
      return bChanged - aChanged
    }
    // newest: first_seen_at DESC
    return new Date(b.first_seen_at ?? 0).getTime() - new Date(a.first_seen_at ?? 0).getTime()
  })

  const cond = data?.conditions

  // ローディング中 or エラー時は早期return
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
        <Link href="/customers" className="text-sm text-slate-500 hover:underline">
          ← 顧客一覧に戻る
        </Link>
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
          <button
            onClick={markAllProposed}
            disabled={bulkProposing || visibleCandidates.length === 0}
            className="text-sm border border-slate-300 px-4 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            {bulkProposing ? '処理中...' : `表示中${visibleCandidates.length}件を一括提案済み`}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* 条件サマリー */}
        {cond && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 flex flex-wrap gap-3 text-sm">
            <span className="text-slate-400 text-xs self-center">照合条件：</span>
            {cond.area && <Chip label={`エリア: ${cond.area}`} />}
            {(cond.budget_min || cond.budget_max) && (
              <Chip label={`予算: ${cond.budget_min ? `${cond.budget_min}万` : '下限なし'} 〜 ${cond.budget_max ? `${cond.budget_max}万` : '上限なし'}`} />
            )}
            {cond.area_sqm_min && <Chip label={`面積: ${cond.area_sqm_min}㎡以上`} />}
            {cond.area_sqm_max && <Chip label={`面積: ${cond.area_sqm_max}㎡以下`} />}
            {cond.walk_minutes_max && <Chip label={`徒歩: ${cond.walk_minutes_max}分以内`} />}
            {cond.building_age_max && <Chip label={`築: ${cond.building_age_max}年以内`} />}
          </div>
        )}

        {/* 統計バー */}
        {data && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <StatCard label="提案候補" value={`${data.total - proposed.size}件`} sub={`提案済み${proposed.size}件除く`} />
            <StatCard label="新着（7日以内）" value={`${data.newCount}件`} color="blue" />
            <StatCard label="価格変動あり" value={`${data.priceChangedCount}件`} color="amber" />
          </div>
        )}

        {/* フィルター・ソートバー */}
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <div className="flex gap-1">
            {([
              { key: 'all', label: '全件' },
              { key: 'new', label: '🆕 新着のみ' },
              { key: 'price_changed', label: '💹 価格変動のみ' },
            ] as { key: FilterKey; label: string }[]).map(f => (
              <button
                key={f.key}
                onClick={() => setFilterKey(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterKey === f.key
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
            <span>並び順：</span>
            {([
              { key: 'newest', label: '新着順' },
              { key: 'price_asc', label: '価格↑' },
              { key: 'price_desc', label: '価格↓' },
              { key: 'price_change', label: '価格変動優先' },
            ] as { key: SortKey; label: string }[]).map(s => (
              <button
                key={s.key}
                onClick={() => setSortKey(s.key)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  sortKey === s.key
                    ? 'bg-slate-700 text-white'
                    : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 物件一覧 */}
        {visibleCandidates.length === 0 ? (
          <div className="text-center text-slate-400 py-20 bg-white rounded-xl border border-slate-200">
            {filterKey !== 'all' ? 'フィルタ条件に一致する物件がありません' : '提案候補物件がありません'}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleCandidates.map(c => (
              <PropertyCard
                key={c.id}
                candidate={c}
                isPending={proposing.has(c.id)}
                onPropose={() => markProposed(c.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PropertyCard({
  candidate: c,
  isPending,
  onPropose,
}: {
  candidate: Candidate
  isPending: boolean
  onPropose: () => void
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-4 hover:border-slate-300 transition-colors">
      {/* サムネイル */}
      {c.thumbnail_url ? (
        <img
          src={c.thumbnail_url}
          alt={c.name}
          className="w-28 h-20 object-cover rounded-lg flex-shrink-0"
        />
      ) : (
        <div className="w-28 h-20 bg-slate-100 rounded-lg flex-shrink-0 flex items-center justify-center text-slate-300 text-xs">
          No Image
        </div>
      )}

      {/* 本文 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${SITE_COLORS[c.site]}`}>
              {SITE_LABELS[c.site]}
            </span>
            {c.isNew && (
              <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                新着
              </span>
            )}
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-sm hover:underline text-slate-800 truncate"
            >
              {c.name}
            </a>
          </div>
        </div>

        {c.address && (
          <p className="text-xs text-slate-500 mb-2">{c.address}</p>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          {/* 価格（変動バッジ付き） */}
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-900">
              {formatPrice(c.current_price)}
            </span>
            {c.priceChange && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                c.priceChange.diff < 0
                  ? 'bg-red-100 text-red-600'
                  : 'bg-green-100 text-green-700'
              }`}>
                {c.priceChange.diff < 0 ? '▼' : '▲'} {c.priceChange.label}
              </span>
            )}
            {c.last_price !== null && c.last_price !== c.current_price && (
              <span className="text-xs text-slate-400 line-through">
                {formatPrice(c.last_price)}
              </span>
            )}
          </div>

          {/* 物件スペック */}
          <div className="flex gap-2 text-xs text-slate-600 flex-wrap">
            {c.floor_plan && <span className="bg-slate-100 px-1.5 py-0.5 rounded">{c.floor_plan}</span>}
            {c.area_sqm && <span className="bg-slate-100 px-1.5 py-0.5 rounded">{c.area_sqm}㎡</span>}
            {c.walk_minutes && <span className="bg-slate-100 px-1.5 py-0.5 rounded">徒歩{c.walk_minutes}分</span>}
            <span className={`px-1.5 py-0.5 rounded ${c.building_age !== null ? 'bg-slate-100 text-slate-600' : 'text-slate-400'}`}>
              {formatBuiltDateLabel(c.built_year, c.built_month, c.building_age)}
            </span>
          </div>
        </div>

        {c.first_seen_at && (
          <p className="text-xs text-slate-400 mt-1.5">
            初回確認: {new Date(c.first_seen_at).toLocaleDateString('ja-JP')}
          </p>
        )}
      </div>

      {/* 提案ボタン */}
      <div className="flex-shrink-0 flex items-center">
        <button
          onClick={onPropose}
          disabled={isPending}
          className="text-xs border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white hover:border-slate-800 disabled:opacity-50 transition-all font-medium whitespace-nowrap"
        >
          {isPending ? '処理中...' : '提案済みにする'}
        </button>
      </div>
    </div>
  )
}

function Chip({ label }: { label: string }) {
  return (
    <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full">{label}</span>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  const colorClass = color === 'blue' ? 'text-blue-600' : color === 'amber' ? 'text-amber-600' : 'text-slate-800'
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-300 mt-0.5">{sub}</div>}
    </div>
  )
}
