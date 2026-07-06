'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Customer } from '@/types'

const RANK_COLORS: Record<string, string> = {
  A: 'bg-red-100 text-red-700',
  B: 'bg-yellow-100 text-yellow-700',
  C: 'bg-slate-100 text-slate-600',
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active')

  useEffect(() => {
    fetch(`/api/customers?status=${statusFilter}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCustomers(data) })
      .finally(() => setLoading(false))
  }, [statusFilter])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」を削除（非アクティブ化）しますか？`)) return
    await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    setCustomers((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">顧客管理</h1>
        <Link
          href="/customers/new"
          className="bg-slate-800 text-white px-5 py-2 rounded-lg hover:bg-slate-700 transition-colors text-sm"
        >
          + 新規顧客登録
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setStatusFilter('active')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === 'active' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          アクティブ
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          全件
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400 py-12 text-center">読み込み中...</div>
      ) : customers.length === 0 ? (
        <div className="text-slate-400 py-12 text-center">顧客が登録されていません</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500 whitespace-nowrap w-24">No</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 whitespace-nowrap">顧客名</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 whitespace-nowrap w-16">ランク</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 whitespace-nowrap">メール</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 whitespace-nowrap">電話</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 whitespace-nowrap w-28">ステータス</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500">{c.customer_no}</td>
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
                  <td className="px-4 py-3 text-slate-500">{c.email ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-500">{c.phone ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.status === 'active' ? 'アクティブ' : '非アクティブ'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right flex gap-2 justify-end">
                    <Link
                      href={`/customers/${c.id}/edit`}
                      className="text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                    >
                      編集
                    </Link>
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className="text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      削除
                    </button>
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
