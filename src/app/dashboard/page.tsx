'use client'
import { useState } from 'react'
import { CrawlMode } from '@/types'

interface CrawlResultItem {
  customer_id: string
  site: string
  mode?: string
  totalCount?: number | null
  totalPages?: number | null
  checkedPages?: number
  fetchedCount?: number
  newCount?: number
  duplicateCount?: number
  stoppedReason?: string
  error?: string
  warning?: string
}

interface CrawlResponse {
  crawled: number
  totalNew: number
  mode: string
  results: CrawlResultItem[]
}

const STOPPED_REASON_LABELS: Record<string, string> = {
  reached_last_page:          '最終ページに到達',
  reached_page_limit:         'ページ上限に到達',
  duplicate_sequence_detected: '連続重複検出（差分完了）',
  fetch_error:                 '取得エラー',
  no_results:                  '検索結果なし',
}

const MODE_OPTIONS: { value: CrawlMode; label: string; desc: string }[] = [
  { value: 'debug',  label: 'デバッグ（1ページ）',  desc: '動作確認用。1ページのみ取得' },
  { value: 'diff',   label: '差分（最大3ページ）',  desc: '新着上位ページのみ確認。通常運用向け' },
  { value: 'manual', label: '手動（最大10ページ）', desc: '広めに取得。手動実行向け' },
  { value: 'full',   label: '全件取得（全ページ）', desc: '初回登録時向け。時間がかかります' },
]

export default function DashboardPage() {
  const [mode, setMode] = useState<CrawlMode>('manual')
  const [crawling, setCrawling] = useState(false)
  const [result, setResult] = useState<CrawlResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runCrawl() {
    setCrawling(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
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

      {/* 探索モード選択 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="font-semibold text-lg mb-4">手動探索実行</h2>
        <p className="text-slate-500 text-sm mb-4">
          全顧客の登録済み検索URLから物件を探索します。
        </p>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {MODE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value)}
              className={`text-left p-3 rounded-lg border-2 transition-colors ${
                mode === opt.value
                  ? 'border-slate-700 bg-slate-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="font-medium text-sm">{opt.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>

        <button
          onClick={runCrawl}
          disabled={crawling}
          className="bg-slate-800 text-white px-6 py-2.5 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {crawling ? '探索中... しばらくお待ちください' : '探索実行'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* 探索結果 */}
      {result && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-lg mb-4">
            探索結果
            <span className="ml-2 text-sm font-normal text-slate-400">モード: {result.mode}</span>
          </h2>

          {/* サマリー */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <Stat label="探索URL数" value={result.crawled} />
            <Stat label="新規取得物件" value={result.totalNew} color="green" />
          </div>

          {/* 各URL別の詳細 */}
          <div className="space-y-3">
            {result.results.map((r, i) => (
              <div key={i} className={`rounded-lg border p-4 text-sm ${r.error ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold uppercase text-slate-700">{r.site}</span>
                  <span className="text-xs text-slate-400">{r.customer_id.slice(0, 8)}...</span>
                </div>

                {r.error ? (
                  <p className="text-red-600">エラー: {r.error}</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <MiniStat label="総件数" value={r.totalCount != null ? `${r.totalCount.toLocaleString()}件` : '不明'} />
                      <MiniStat label="総ページ" value={r.totalPages != null ? `${r.totalPages}P` : '不明'} />
                      <MiniStat label="巡回ページ" value={`${r.checkedPages ?? 0}P`} />
                      <MiniStat label="取得物件" value={`${r.fetchedCount ?? 0}件`} />
                      <MiniStat label="新規" value={`${r.newCount ?? 0}件`} color="green" />
                      <MiniStat label="重複" value={`${r.duplicateCount ?? 0}件`} />
                    </div>
                    <div className="text-xs text-slate-500">
                      停止理由: {STOPPED_REASON_LABELS[r.stoppedReason ?? ''] ?? r.stoppedReason}
                    </div>
                    {r.warning && (
                      <div className="text-xs text-amber-600 mt-1">{r.warning}</div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-4 text-center">
      <div className={`text-3xl font-bold ${color === 'green' ? 'text-green-700' : 'text-slate-800'}`}>
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded p-2 text-center border border-slate-100">
      <div className={`font-semibold ${color === 'green' ? 'text-green-700' : 'text-slate-700'}`}>
        {value}
      </div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}
