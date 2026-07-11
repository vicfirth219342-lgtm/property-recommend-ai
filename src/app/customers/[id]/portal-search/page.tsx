'use client'
import { useEffect, useState, useCallback, use } from 'react'

// ── 型定義 ───────────────────────────────────────────────────
interface Job {
  id: string; customer_id: string; transaction_type: string; status: string
  target_portals: string[]; started_at: string | null; completed_at: string | null
  total_fetched: number; total_saved: number; total_new: number; total_duplicates: number
  total_matched: number; total_manual_check: number; total_no_match: number
  cross_portal_dups: number; error_summary: string | null; created_at: string
}
interface JobResult {
  id: string; portal: string; search_url: string | null; status: string
  fetched_count: number; saved_count: number; new_count: number; duplicate_count: number
  error_message: string | null; started_at: string | null; completed_at: string | null
}

const PORTALS = [
  { key: 'suumo',  label: 'SUUMO' },
  { key: 'athome', label: 'アットホーム' },
  { key: 'homes',  label: "HOME'S" },
]
const PORTAL_LABEL: Record<string, string> = { suumo: 'SUUMO', athome: 'athome', homes: "HOME'S" }

const JOB_STATUS_LABEL: Record<string, string> = {
  queued: '待機中', running: '実行中', completed: '完了',
  partial_failed: '一部失敗', failed: '失敗',
}
const JOB_STATUS_COLOR: Record<string, string> = {
  queued: 'bg-slate-100 text-slate-600', running: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700', partial_failed: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-600',
}
const RESULT_STATUS_LABEL: Record<string, string> = {
  queued: '待機中', running: '実行中', completed: '完了', no_results: '0件取得',
  url_missing: 'URL未生成', fetch_error: '取得エラー', save_error: '保存エラー', timeout: 'タイムアウト',
}
const RESULT_STATUS_COLOR: Record<string, string> = {
  completed: 'bg-green-100 text-green-700', no_results: 'bg-slate-100 text-slate-600',
  running: 'bg-blue-100 text-blue-700', queued: 'bg-slate-100 text-slate-500',
  url_missing: 'bg-amber-100 text-amber-700', fetch_error: 'bg-red-100 text-red-600',
  save_error: 'bg-red-100 text-red-600', timeout: 'bg-red-100 text-red-600',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

// ── メインページ ────────────────────────────────────────────
export default function PortalSearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: customerId } = use(params)
  const [customerName, setCustomerName] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({ suumo: true, athome: true, homes: true })
  const [autoReinsQueue, setAutoReinsQueue] = useState(false)
  const [running, setRunning] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null)
  const [jobResults, setJobResults] = useState<Record<string, JobResult[]>>({})
  const [runError, setRunError] = useState<string | null>(null)

  const loadJobs = useCallback(() => {
    fetch(`/api/portal-search/jobs?customer_id=${customerId}`)
      .then(r => r.json())
      .then(d => setJobs(d.jobs ?? []))
  }, [customerId])

  useEffect(() => {
    loadJobs()
    fetch(`/api/customers/${customerId}`)
      .then(r => r.json())
      .then(d => setCustomerName(d.customer?.name ?? d.name ?? ''))
      .catch(() => {})
    // 再照合ON/OFF設定を復元
    const saved = localStorage.getItem('portal_search_auto_reins_queue')
    if (saved !== null) setAutoReinsQueue(saved === 'true')
  }, [customerId, loadJobs])

  async function loadJobDetail(jobId: string) {
    const res = await fetch(`/api/portal-search/jobs/${jobId}`)
    const json = await res.json()
    setJobResults(prev => ({ ...prev, [jobId]: json.results ?? [] }))
  }

  async function runSearch() {
    const portals = PORTALS.filter(p => selected[p.key]).map(p => p.key)
    if (portals.length === 0) { alert('ポータルを1つ以上選択してください'); return }
    setRunning(true)
    setRunError(null)
    try {
      const res = await fetch('/api/portal-search/run-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          portals,
          auto_reins_queue: autoReinsQueue,
          created_by: 'ui',
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setRunError(json.error ?? '実行に失敗しました')
      } else {
        loadJobs()
        if (json.job_id) {
          setExpandedJobId(json.job_id)
          loadJobDetail(json.job_id)
        }
      }
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  function toggleAutoReins(v: boolean) {
    setAutoReinsQueue(v)
    localStorage.setItem('portal_search_auto_reins_queue', String(v))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-6">
          <a href={`/customers/${customerId}/candidates`} className="text-sm text-slate-400 hover:text-slate-600">← 提案候補へ戻る</a>
          <h1 className="text-xl font-bold text-slate-800">全ポータル一括検索{customerName ? `：${customerName}` : ''}</h1>
        </div>

        {/* 実行パネル */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <div className="flex items-center gap-6 mb-4">
            <span className="text-sm font-medium text-slate-600">対象ポータル</span>
            {PORTALS.map(p => (
              <label key={p.key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected[p.key]}
                  onChange={e => setSelected(s => ({ ...s, [p.key]: e.target.checked }))}
                  className="w-4 h-4"
                />
                {p.label}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={runSearch}
              disabled={running}
              className="bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {running ? '検索中...（数分かかります）' : '全ポータルを一括検索'}
            </button>
            <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={autoReinsQueue}
                onChange={e => toggleAutoReins(e.target.checked)}
              />
              条件一致した物件をレインズ照合キューへ自動投入（照合自体は実行しません）
            </label>
          </div>
          {runError && (
            <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{runError}</div>
          )}
        </div>

        {/* ジョブ履歴 */}
        <h2 className="text-sm font-semibold text-slate-600 mb-3">検索履歴</h2>
        {jobs.length === 0 ? (
          <div className="text-center text-slate-400 py-12 bg-white rounded-xl border border-slate-200 text-sm">
            まだ一括検索を実行していません
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map(job => (
              <div key={job.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => {
                    const next = expandedJobId === job.id ? null : job.id
                    setExpandedJobId(next)
                    if (next && !jobResults[job.id]) loadJobDetail(job.id)
                  }}
                  className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${JOB_STATUS_COLOR[job.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {JOB_STATUS_LABEL[job.status] ?? job.status}
                    </span>
                    <span className="text-xs text-slate-400">{fmtDate(job.created_at)}</span>
                    <span className="text-xs text-slate-500">
                      {(job.target_portals ?? []).map(p => PORTAL_LABEL[p] ?? p).join(' / ')}
                    </span>
                    <span className="text-sm text-slate-700 ml-auto flex gap-3">
                      <span>取得 <strong>{job.total_fetched}</strong></span>
                      <span className="text-green-600">新規 <strong>{job.total_new}</strong></span>
                      <span className="text-slate-400">重複 {job.total_duplicates}</span>
                      {job.cross_portal_dups > 0 && <span className="text-blue-500">横断統合 {job.cross_portal_dups}</span>}
                    </span>
                    <span className="text-slate-400 text-sm">{expandedJobId === job.id ? '▼' : '▶'}</span>
                  </div>
                  {/* 全体集計 */}
                  <div className="flex gap-4 mt-1.5 text-xs text-slate-400">
                    <span className="text-green-600">条件一致 {job.total_matched}</span>
                    <span className="text-amber-600">手動確認 {job.total_manual_check}</span>
                    <span>条件不一致 {job.total_no_match}</span>
                    {job.error_summary && <span className="text-red-500 truncate max-w-md">{job.error_summary}</span>}
                  </div>
                </button>

                {/* ポータル別結果 */}
                {expandedJobId === job.id && (
                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                    {!jobResults[job.id] ? (
                      <div className="text-xs text-slate-400 py-2">読み込み中...</div>
                    ) : jobResults[job.id].length === 0 ? (
                      <div className="text-xs text-slate-400 py-2">ポータル別結果がありません</div>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-200">
                            <th className="text-left py-1.5 font-normal">ポータル</th>
                            <th className="text-left py-1.5 font-normal">状態</th>
                            <th className="text-right py-1.5 font-normal">取得</th>
                            <th className="text-right py-1.5 font-normal">新規</th>
                            <th className="text-right py-1.5 font-normal">重複</th>
                            <th className="text-right py-1.5 font-normal">保存</th>
                            <th className="text-left py-1.5 pl-4 font-normal">エラー</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jobResults[job.id].map(r => (
                            <tr key={r.id} className="border-b border-slate-100">
                              <td className="py-2 font-medium text-slate-700">
                                {PORTAL_LABEL[r.portal] ?? r.portal}
                                {r.search_url && (
                                  <a href={r.search_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 ml-1">↗</a>
                                )}
                              </td>
                              <td className="py-2">
                                <span className={`px-1.5 py-0.5 rounded font-medium ${RESULT_STATUS_COLOR[r.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                  {RESULT_STATUS_LABEL[r.status] ?? r.status}
                                </span>
                              </td>
                              <td className="py-2 text-right">{r.fetched_count}</td>
                              <td className="py-2 text-right text-green-600 font-semibold">{r.new_count}</td>
                              <td className="py-2 text-right text-slate-400">{r.duplicate_count}</td>
                              <td className="py-2 text-right">{r.saved_count}</td>
                              <td className="py-2 pl-4 text-red-500 max-w-xs truncate">{r.error_message ?? ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    <div className="mt-3">
                      <a
                        href={`/customers/${customerId}/candidates`}
                        className="text-xs text-blue-600 hover:underline"
                      >→ 提案候補画面で結果を確認する</a>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
