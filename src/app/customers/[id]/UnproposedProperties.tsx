'use client'
import { useEffect, useState } from 'react'
import { Property } from '@/types'

function formatPrice(price: number | null) {
  if (!price) return '-'
  return `${(price / 10000).toLocaleString()}万円`
}

export default function UnproposedProperties({ customerId }: { customerId: string }) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    fetch(`/api/proposals?customer_id=${customerId}`)
      .then((r) => r.json())
      .then(setProperties)
      .finally(() => setLoading(false))
  }, [customerId])

  async function markAsProposed(propertyId: string) {
    setMarking(true)
    await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId, property_ids: [propertyId] }),
    })
    setProperties((prev) => prev.filter((p) => p.id !== propertyId))
    setMarking(false)
  }

  const SITE_LABELS: Record<string, string> = { suumo: 'SUUMO', athome: 'アットホーム', homes: "HOME'S" }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="font-semibold mb-3">未提案物件 {!loading && `(${properties.length}件)`}</h2>
      {loading ? (
        <p className="text-slate-400 text-sm">読み込み中...</p>
      ) : properties.length === 0 ? (
        <p className="text-slate-400 text-sm">未提案物件はありません</p>
      ) : (
        <div className="space-y-3">
          {properties.map((p) => (
            <div key={p.id} className="flex gap-4 border border-slate-100 rounded-lg p-3 hover:border-slate-200 transition-colors">
              {p.thumbnail_url && (
                <img src={p.thumbnail_url} alt={p.name} className="w-20 h-16 object-cover rounded flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:underline truncate">
                    {p.name}
                  </a>
                  <span className="text-xs text-slate-400 flex-shrink-0">{SITE_LABELS[p.site]}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{p.address}</p>
                <div className="flex gap-3 mt-1 text-xs text-slate-600">
                  <span className="font-medium text-slate-800">{formatPrice(p.price)}</span>
                  {p.floor_plan && <span>{p.floor_plan}</span>}
                  {p.area_sqm && <span>{p.area_sqm}㎡</span>}
                  {p.walk_minutes && <span>徒歩{p.walk_minutes}分</span>}
                  {p.building_age && <span>築{p.building_age}年</span>}
                </div>
              </div>
              <button
                onClick={() => markAsProposed(p.id)}
                disabled={marking}
                className="flex-shrink-0 text-xs border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-50 disabled:opacity-50 transition-colors self-center"
              >
                提案済みにする
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
