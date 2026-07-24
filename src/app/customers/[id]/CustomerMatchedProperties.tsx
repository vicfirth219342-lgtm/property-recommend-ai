'use client'
import { useEffect, useState, useCallback } from 'react'

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
  matched: string[]
  matched_count: number
  proposed: boolean
}

export default function CustomerMatchedProperties({ customerId }: { customerId: string }) {
  const [matches, setMatches] = useState<MatchedProperty[]>([])
  const [partials, setPartials] = useState<MatchedProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const reload = useCallback(() => {
    setLoading(true)
    fetch(`/api/customers/${customerId}/matches`)
      .then(r => r.json())
      .then(d => {
        setMatches(d.matches ?? [])
        setPartials(d.partials ?? [])
        if (d.message) setMessage(d.message)
        setSelectedIds(new Set())
      })
      .finally(() => setLoading(false))
  }, [customerId])

  useEffect(() => { reload() }, [reload])

  const allItems = [...matches, ...partials]

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === allItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allItems.map(p => p.id)))
    }
  }

  async function propose(propertyId: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/customers/${customerId}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: propertyId }),
      })
      const d = await res.json()
      if (!res.ok) { alert(d.error ?? 'エラー'); return }
      reload()
    } finally { setBusy(false) }
  }

  async function deleteProperties(ids: string[]) {
    if (ids.length === 0) return
    if (!confirm(`${ids.length}件の物件を取込リストから削除しますか？\n（提案済みの物件は提案リストに残ります）`)) return
    setBusy(true)
    try {
      await fetch('/api/reins/properties/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      reload()
    } finally { setBusy(false) }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-slate-700">合うレインズ物件</h2>
        {allItems.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 border border-slate-200 rounded"
            >
              {selectedIds.size === allItems.length ? '選択解除' : '全選択'}
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={() => deleteProperties([...selectedIds])}
                disabled={busy}
                className="text-xs text-red-600 hover:text-red-800 px-2 py-1 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
              >
                選択削除（{selectedIds.size}件）
              </button>
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400 mb-4">一致項目が多い順に表示。提案済み物件は削除しても提案リストに残ります。</p>

      {loading ? (
        <div className="text-slate-400 py-8 text-center text-sm">照合中...</div>
      ) : message ? (
        <div className="text-slate-400 py-8 text-center text-sm">{message}</div>
      ) : allItems.length === 0 ? (
        <div className="text-slate-400 py-8 text-center text-sm">合う物件がまだありません</div>
      ) : (
        <div className="space-y-6">
          <Section
            title="条件一致" color="green" list={matches}
            selectedIds={selectedIds} onToggle={toggleSelect}
            onPropose={propose} onDelete={(id) => deleteProperties([id])}
            busy={busy}
          />
          <Section
            title="一部条件一致" color="amber" list={partials}
            selectedIds={selectedIds} onToggle={toggleSelect}
            onPropose={propose} onDelete={(id) => deleteProperties([id])}
            busy={busy}
          />
        </div>
      )}
    </div>
  )
}

function Section({ title, color, list, selectedIds, onToggle, onPropose, onDelete, busy }: {
  title: string
  color: 'green' | 'amber'
  list: MatchedProperty[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onPropose: (id: string) => void
  onDelete: (id: string) => void
  busy: boolean
}) {
  const head = color === 'green' ? 'text-green-700' : 'text-amber-700'
  if (list.length === 0) return null
  return (
    <div>
      <h3 className={`text-sm font-semibold mb-2 ${head}`}>{title}（{list.length}件）</h3>
      <div className="space-y-2">
        {list.map(p => (
          <div
            key={p.id}
            className={`border rounded-lg px-4 py-3 transition-colors ${
              selectedIds.has(p.id) ? 'border-blue-300 bg-blue-50' : 'border-slate-100 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedIds.has(p.id)}
                onChange={() => onToggle(p.id)}
                className="mt-1 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800 truncate">{p.property_name ?? '（物件名なし）'}</span>
                  <span className="font-medium text-slate-700 text-sm shrink-0 ml-2">
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
                {p.matched.length > 0 && (
                  <div className="text-xs text-green-600 mt-1">
                    一致: {p.matched.join(' / ')}（{p.matched_count}項目）
                  </div>
                )}
                {p.reasons.length > 0 && (
                  <div className="text-xs text-amber-600 mt-1">外れ: {p.reasons.join(' / ')}</div>
                )}
                <div className="flex gap-2 mt-2">
                  {p.proposed ? (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">提案済み</span>
                  ) : (
                    <button
                      onClick={() => onPropose(p.id)}
                      disabled={busy}
                      className="text-xs text-blue-600 hover:text-blue-800 px-2 py-0.5 border border-blue-200 rounded hover:bg-blue-50 disabled:opacity-50"
                    >
                      提案する
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(p.id)}
                    disabled={busy}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
