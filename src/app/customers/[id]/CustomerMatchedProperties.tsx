'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface MatchedProperty {
  id: string
  property_name: string | null
  address: string | null
  price_man: number | null
  area_sqm: number | null
  floor_plan: string | null
  built_year: number | null
  station: string | null
  walk_minutes: number | null
  match_status: 'match' | 'partial'
  reasons: string[]
}

export default function CustomerMatchedProperties({ customerId }: { customerId: string }) {
  const [matches, setMatches] = useState<MatchedProperty[]>([])
  const [partials, setPartials] = useState<MatchedProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/customers/${customerId}/matches`)
      .then(r => r.json())
      .then(d => {
        setMatches(d.matches ?? [])
        setPartials(d.partials ?? [])
        if (d.message) setMessage(d.message)
      })
      .finally(() => setLoading(false))
  }, [customerId])

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="font-semibold text-slate-700 mb-1">合うレインズ物件</h2>
      <p className="text-xs text-slate-400 mb-4">取り込み済みのレインズ物件と希望条件を照合しています。</p>

      {loading ? (
        <div className="text-slate-400 py-8 text-center text-sm">照合中...</div>
      ) : message ? (
        <div className="text-slate-400 py-8 text-center text-sm">{message}</div>
      ) : matches.length === 0 && partials.length === 0 ? (
        <div className="text-slate-400 py-8 text-center text-sm">合う物件がまだありません</div>
      ) : (
        <div className="space-y-6">
          <Section title="条件一致" color="green" list={matches} showReasons={false} />
          <Section title="一部条件一致" color="amber" list={partials} showReasons={true} />
        </div>
      )}
    </div>
  )
}

function Section({ title, color, list, showReasons }: {
  title: string; color: 'green' | 'amber'; list: MatchedProperty[]; showReasons: boolean
}) {
  const head = color === 'green' ? 'text-green-700' : 'text-amber-700'
  if (list.length === 0) return null
  return (
    <div>
      <h3 className={`text-sm font-semibold mb-2 ${head}`}>{title}（{list.length}件）</h3>
      <div className="space-y-2">
        {list.map(p => (
          <Link
            key={p.id}
            href={`/properties/${p.id}`}
            className="block border border-slate-100 rounded-lg px-4 py-3 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-800">{p.property_name ?? '（物件名なし）'}</span>
              <span className="font-medium text-slate-700 text-sm">
                {p.price_man != null ? `${p.price_man.toLocaleString()}万円` : '-'}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {p.address ?? '-'}
              {' ／ '}{p.area_sqm != null ? `${p.area_sqm}㎡` : '-'}
              {' ／ '}{p.floor_plan ?? '-'}
              {' ／ '}{p.walk_minutes != null ? `徒歩${p.walk_minutes}分` : '-'}
              {' ／ '}{p.built_year != null ? `${p.built_year}年築` : '-'}
            </div>
            {showReasons && p.reasons.length > 0 && (
              <div className="text-xs text-amber-600 mt-1">外れ: {p.reasons.join(' / ')}</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
