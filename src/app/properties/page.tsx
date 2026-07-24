'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'

interface PropertyRow {
  id: string
  reins_number: string | null
  property_name: string | null
  address: string | null
  price_man: number | null
  area_sqm: number | null
  floor_plan: string | null
  built_year: number | null
  station: string | null
  walk_minutes: number | null
  transaction_type: string | null
  imported_at: string | null
  match_count: number
  partial_count: number
}

export default function PropertiesPage() {
  const [props, setProps] = useState<PropertyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/reins/properties')
      .then(r => r.json())
      .then(d => { if (d.properties) setProps(d.properties) })
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!search) return props
    const q = search.toLowerCase()
    return props.filter(p =>
      (p.property_name ?? '').toLowerCase().includes(q) ||
      (p.address ?? '').toLowerCase().includes(q) ||
      (p.station ?? '').toLowerCase().includes(q) ||
      (p.reins_number ?? '').includes(q)
    )
  }, [props, search])

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">物件一覧（レインズ取込）</h1>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="物件名・所在地・駅・物件番号"
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      {loading ? (
        <div className="text-slate-400 py-16 text-center">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-slate-400 py-16 text-center">
          {search ? '該当する物件がありません' : 'レインズ物件がまだ取り込まれていません。Chrome拡張の「このページを取り込む」で追加してください。'}
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-400 mb-2">{filtered.length}件表示 / 全{props.length}件</p>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">物件名 / 所在地</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 whitespace-nowrap">価格</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">面積/間取</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">駅徒歩</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 whitespace-nowrap">合う顧客</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/properties/${p.id}`} className="font-medium text-slate-800 hover:underline">
                        {p.property_name ?? '（物件名なし）'}
                      </Link>
                      <div className="text-xs text-slate-400">{p.address ?? '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-medium">
                      {p.price_man != null ? `${p.price_man.toLocaleString()}万円` : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {p.area_sqm != null ? `${p.area_sqm}㎡` : '-'} / {p.floor_plan ?? '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {p.walk_minutes != null ? `徒歩${p.walk_minutes}分` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex gap-1.5 justify-center">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">一致 {p.match_count}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">一部 {p.partial_count}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
