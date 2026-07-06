'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Customer } from '@/types'

const RANK_COLORS: Record<string, string> = {
  A: 'bg-red-100 text-red-700',
  B: 'bg-yellow-100 text-yellow-700',
  C: 'bg-slate-100 text-slate-600',
}

// 顧客Noを数値ソート用に正規化（C001→1, ２→2, TEST-001→1）
function sortKey(no: string): number {
  // 全角数字を半角に変換してから抽出
  const normalized = no.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
  const m = normalized.match(/(\d+)/)
  return m ? parseInt(m[1]) : 9999
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active')
  const [search, setSearch] = useState('')
  const [rankFilter, setRankFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/customers?status=${statusFilter}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCustomers(data) })
      .finally(() => setLoading(false))
  }, [statusFilter])

  const filtered = useMemo(() => {
    return customers
      .filter(c => {
        if (rankFilter !== 'ALL' && c.rank !== rankFilter) return false
        if (search) {
          const q = search.toLowerCase()
          return (
            c.name.toLowerCase().includes(q) ||
            c.customer_no.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.phone?.includes(q)
          )
        }
        return true
      })
      .sort((a, b) => sortKey(a.customer_no) - sortKey(b.customer_no))
  }, [customers, search, rankFilter])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」を削除（非アクティブ化）しますか？`)) return
    await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    setCustomers(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">顧客管理</h1>
        <Link
          href="/customers/new"
          className="bg-slate-800 text-white px-5 py-2 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
        >
          ＋ 新規顧客登録
        </Link>
      </div>

      {/* フィルターバー */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        {/* ステータス */}
        <div className="flex gap-1.5">
          {(['active', 'all'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s === 'active' ? 'アクティブ' : '全件'}
            </button>
          ))}
        </div>

        {/* ランク */}
        <div className="flex gap-1.5">
          {(['ALL', 'A', 'B', 'C'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRankFilter(r)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                rankFilter === r
                  ? 'bg-slate-700 text-white'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {r === 'ALL' ? '全ランク' : `${r}ランク`}
            </button>
          ))}
        </div>

        {/* 検索 */}
        <div className="ml-auto">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="名前・No・メールで検索"
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
      </div>

      {/* 件数表示 */}
      {!loading && (
        <p className="text-xs text-slate-400 mb-2">
          {filtered.length}件表示 / 全{customers.length}件
        </p>
      )}

      {/* テーブル */}
      {loading ? (
        <div className="text-slate-400 py-16 text-center">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-slate-400 py-16 text-center">
          {search || rankFilter !== 'ALL' ? '条件に一致する顧客がいません' : '顧客が登録されていません'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500 whitespace-nowrap w-24">No</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 whitespace-nowrap">顧客名</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 whitespace-nowrap w-20">ランク</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 whitespace-nowrap">メール</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 whitespace-nowrap">電話</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 whitespace-nowrap w-28">ステータス</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{c.customer_no}</td>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/customers/${c.id}`} className="hover:underline text-slate-800">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${RANK_COLORS[c.rank]}`}>
                      {c.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate">{c.email ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{c.phone ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {c.status === 'active' ? 'アクティブ' : '非アクティブ'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <Link
                        href={`/customers/${c.id}/edit`}
                        className="text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition-colors text-xs"
                      >
                        編集
                      </Link>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        className="text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors text-xs"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
