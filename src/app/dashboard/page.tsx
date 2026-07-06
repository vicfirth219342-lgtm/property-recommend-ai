'use client'
import { useState } from 'react'

interface CrawlResult {
  crawled: number
  totalNew: number
  results: Array<{ customer_id: string; site: string; found?: number; new?: number; error?: string }>
}

export default function DashboardPage() {
  const [crawling, setCrawling] = useState(false)
  const [result, setResult] = useState<CrawlResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runCrawl() {
    setCrawling(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/crawl', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '探索失敗')
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCrawling(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="font-semibold text-lg mb-3">手動探索実行</h2>
        <p className="text-slate-500 text-sm mb-4">
          全顧客の登録済み検索URLを使って物件を探索します。
        </p>
        <button
          onClick={runCrawl}
          disabled={crawling}
          className="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {crawling ? '探索中...' : '今すぐ探索実行'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-lg mb-3">探索結果</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-slate-800">{result.crawled}</div>
              <div className="text-sm text-slate-500 mt-1">探索URL数</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-700">{result.totalNew}</div>
              <div className="text-sm text-slate-500 mt-1">新規取得物件数</div>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {result.results.map((r, i) => (
              <div key={i} className="py-2 flex justify-between text-sm">
                <span className="text-slate-600">
                  <span className="font-medium">{r.site.toUpperCase()}</span>
                  <span className="text-slate-400 ml-2">({r.customer_id.slice(0, 8)}...)</span>
                </span>
                {r.error ? (
                  <span className="text-red-500">エラー: {r.error}</span>
                ) : (
                  <span className="text-slate-700">取得 {r.found}件 / 新規 {r.new}件</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
