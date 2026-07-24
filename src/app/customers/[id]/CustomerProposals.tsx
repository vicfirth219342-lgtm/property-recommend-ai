'use client'
import { useEffect, useState } from 'react'

interface Proposal {
  id: string
  property_name: string | null
  address: string | null
  price_man: number | null
  area_sqm: number | null
  floor_plan: string | null
  built_year: number | null
  station: string | null
  walk_minutes: number | null
  proposed_at: string
}

export default function CustomerProposals({ customerId }: { customerId: string }) {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/customers/${customerId}/proposals`)
      .then(r => r.json())
      .then(d => setProposals(d.proposals ?? []))
      .finally(() => setLoading(false))
  }, [customerId])

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="font-semibold text-slate-700 mb-1">提案済み物件</h2>
      <p className="text-xs text-slate-400 mb-4">この顧客に提案した物件の一覧です。取込リストから削除しても残ります。</p>

      {loading ? (
        <div className="text-slate-400 py-6 text-center text-sm">読み込み中...</div>
      ) : proposals.length === 0 ? (
        <div className="text-slate-400 py-6 text-center text-sm">提案済みの物件はまだありません</div>
      ) : (
        <div className="space-y-2">
          {proposals.map(p => (
            <div key={p.id} className="border border-slate-100 rounded-lg px-4 py-3">
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
                {' ／ '}{p.station ? `${p.station}` : ''}{p.walk_minutes != null ? ` 徒歩${p.walk_minutes}分` : ''}
                {' ／ '}{p.built_year != null ? `${p.built_year}年築` : '-'}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                提案日: {new Date(p.proposed_at).toLocaleDateString('ja-JP')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
