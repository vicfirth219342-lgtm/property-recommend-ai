'use client'
import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import type { ReinsImportedProperty } from '@/types'

interface CustomerMatch {
  customer_id: string
  customer_no: string
  name: string
  rank: string
  status: 'match' | 'partial'
  reasons: string[]
  matched: string[]
}

const RANK_COLORS: Record<string, string> = {
  A: 'bg-red-100 text-red-700',
  B: 'bg-yellow-100 text-yellow-700',
  C: 'bg-slate-100 text-slate-600',
}

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [property, setProperty] = useState<ReinsImportedProperty | null>(null)
  const [matches, setMatches] = useState<CustomerMatch[]>([])
  const [partials, setPartials] = useState<CustomerMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/reins/properties/${id}`)
      .then(r => r.json())
      .then(d => {
        if (!d.ok) { setNotFound(true); return }
        setProperty(d.property)
        setMatches(d.matches ?? [])
        setPartials(d.partials ?? [])
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-8 text-slate-400">読み込み中...</div>
  if (notFound || !property) return <div className="p-8 text-slate-400">物件が見つかりません</div>

  const info: [string, string][] = [
    ['物件番号', property.reins_number ?? '-'],
    ['所在地', property.address ?? '-'],
    ['価格', property.price_man != null ? `${property.price_man.toLocaleString()}万円` : '-'],
    ['専有面積', property.area_sqm != null ? `${property.area_sqm}㎡` : '-'],
    ['間取り', property.floor_plan ?? '-'],
    ['所在階', property.floor_number != null ? `${property.floor_number}階` : '-'],
    ['最寄駅', property.station ?? '-'],
    ['駅徒歩', property.walk_minutes != null ? `徒歩${property.walk_minutes}分` : '-'],
    ['築年', property.built_year != null ? `${property.built_year}年${property.built_month ? `${property.built_month}月` : ''}` : '-'],
    ['取引態様', property.transaction_type === 'rent' ? '賃貸' : '売買'],
    ['元付会社', property.agent_company ?? '-'],
  ]

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/properties" className="text-sm text-slate-500 hover:underline">← 物件一覧へ戻る</Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">{property.property_name ?? '（物件名なし）'}</h1>

      {/* 物件情報 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="font-semibold text-lg mb-4">物件情報</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          {info.map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-slate-50 py-1">
              <span className="text-slate-500">{k}</span>
              <span className="font-medium text-slate-800 text-right">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-6 text-sm text-blue-800">
        この物件は登録されている有効顧客全員と照合しています。
      </div>

      <CustomerSection title="条件一致" color="green" list={matches} showReasons={false} />
      <CustomerSection title="一部条件一致" color="amber" list={partials} showReasons={true} />
    </div>
  )
}

function CustomerSection({ title, color, list, showReasons }: {
  title: string; color: 'green' | 'amber'; list: CustomerMatch[]; showReasons: boolean
}) {
  const head = color === 'green' ? 'text-green-700' : 'text-amber-700'
  return (
    <div className="mb-6">
      <h2 className={`font-semibold text-lg mb-3 ${head}`}>{title}（{list.length}名）</h2>
      {list.length === 0 ? (
        <p className="text-sm text-slate-400">該当する顧客はいません</p>
      ) : (
        <div className="space-y-2">
          {list.map(m => (
            <div key={m.customer_id} className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${RANK_COLORS[m.rank] ?? ''}`}>{m.rank}</span>
                <Link href={`/customers/${m.customer_id}`} className="font-medium text-slate-800 hover:underline">
                  {m.name}
                </Link>
                <span className="text-xs text-slate-400 font-mono">{m.customer_no}</span>
              </div>
              {showReasons && m.reasons.length > 0 && (
                <div className="text-xs text-amber-600 text-right max-w-[55%]">
                  {m.reasons.join(' / ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
