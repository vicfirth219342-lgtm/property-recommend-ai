'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Stats {
  customer_count: number
  property_count: number
  match_count: number
  partial_count: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(d => { if (d.ok) setStats(d) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>

      {/* 集計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="登録顧客数" value={stats?.customer_count} loading={loading} />
        <Stat label="取込物件数" value={stats?.property_count} loading={loading} />
        <Stat label="条件一致件数" value={stats?.match_count} loading={loading} color="green" />
        <Stat label="一部条件一致件数" value={stats?.partial_count} loading={loading} color="amber" />
      </div>

      {/* 主要ボタン */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Action href="/customers/new" title="顧客を登録する" desc="希望条件を入力して新規顧客を追加" />
        <Action href="/properties" title="物件一覧を見る" desc="取り込んだレインズ物件と合う顧客を確認" />
        <Action href="/customers" title="顧客一覧を見る" desc="顧客ごとの合う物件を確認" />
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="font-semibold text-slate-700 mb-1">レインズ検索結果を取り込む</div>
          <p className="text-sm text-slate-500 leading-relaxed">
            レインズにログインして手動検索 → 検索結果ページでChrome拡張の
            「このページを取り込む」を押すと物件が保存され、全顧客と自動照合されます。
          </p>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, loading, color }: { label: string; value?: number; loading: boolean; color?: 'green' | 'amber' }) {
  const c = color === 'green' ? 'text-green-700' : color === 'amber' ? 'text-amber-700' : 'text-slate-800'
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
      <div className={`text-3xl font-bold ${c}`}>
        {loading ? '…' : (value ?? 0).toLocaleString()}
      </div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
    </div>
  )
}

function Action({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-400 hover:bg-slate-50 transition-colors block">
      <div className="font-semibold text-slate-800 mb-1">{title}</div>
      <p className="text-sm text-slate-500">{desc}</p>
    </Link>
  )
}
