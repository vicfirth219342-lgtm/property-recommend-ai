'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

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
  url: string
  thumbnail_url: string | null
  first_seen_at: string | null
  priceChange: PriceChange | null
  isNew: boolean
}

interface CandidatesResponse {
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

function formatPrice(price: number | null) {
  if (!price) return '価格未定'
  return `${(price / 10000).toLocaleString()}万円`
}

export default function UnproposedProperties({ customerId }: { customerId: string }) {
  const [data, setData] = useState<CandidatesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [proposing, setProposing] = useState<Set<string>>(new Set())
  const [proposed, setProposed] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(`/api/proposals/candidates?customer_id=${customerId}&limit=10`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [customerId])

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

  const candidates = (data?.candidates ?? []).filter(c => !proposed.has(c.id))
  const total = (data?.total ?? 0) - proposed.size

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">
          提案候補
          {!loading && <span className="text-slate-400 font-normal text-sm ml-2">（{total}件）</span>}
        </h2>
        <Link
          href={`/customers/${customerId}/candidates`}
          className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
        >
          全件表示・一括提案 →
        </Link>
      </div>

      {/* 価格変動バッジ */}
      {!loading && (data?.priceChangedCount ?? 0) > 0 && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
          💹 {data!.priceChangedCount}件の物件で価格変動があります
        </div>
      )}

      {loading ? (
        <p className="text-slate-400 text-sm">照合中...</p>
      ) : candidates.length === 0 ? (
        <p className="text-slate-400 text-sm">条件に合致する未提案物件がありません</p>
      ) : (
        <div className="space-y-2">
          {candidates.slice(0, 5).map(c => (
            <div key={c.id} className="flex gap-3 border border-slate-100 rounded-lg p-3 hover:border-slate-200 transition-colors">
              {c.thumbnail_url && (
                <img src={c.thumbnail_url} alt={c.name} className="w-16 h-12 object-cover rounded flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {c.isNew && (
                    <span className="text-xs bg-blue-500 text-white px-1 py-0.5 rounded font-medium">新</span>
                  )}
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-medium text-xs hover:underline truncate text-slate-800">
                    {c.name}
                  </a>
                  <span className="text-xs text-slate-300 flex-shrink-0">{SITE_LABELS[c.site]}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-800">{formatPrice(c.current_price)}</span>
                  {c.priceChange && (
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                      c.priceChange.diff < 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                    }`}>
                      {c.priceChange.diff < 0 ? '▼' : '▲'} {c.priceChange.label}
                    </span>
                  )}
                  {c.last_price !== null && c.last_price !== c.current_price && (
                    <span className="text-xs text-slate-300 line-through">{formatPrice(c.last_price)}</span>
                  )}
                  <span className="text-xs text-slate-400">
                    {[c.floor_plan, c.area_sqm ? `${c.area_sqm}㎡` : null, c.walk_minutes ? `徒歩${c.walk_minutes}分` : null].filter(Boolean).join(' / ')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => markProposed(c.id)}
                disabled={proposing.has(c.id)}
                className="flex-shrink-0 text-xs border border-slate-200 px-2.5 py-1.5 rounded hover:bg-slate-800 hover:text-white hover:border-slate-800 disabled:opacity-50 transition-all self-center whitespace-nowrap"
              >
                {proposing.has(c.id) ? '...' : '提案済み'}
              </button>
            </div>
          ))}
          {total > 5 && (
            <Link
              href={`/customers/${customerId}/candidates`}
              className="block text-center text-sm text-slate-500 hover:text-slate-800 py-2 border border-dashed border-slate-200 rounded-lg hover:border-slate-400 transition-colors"
            >
              さらに {total - 5} 件を表示する →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
