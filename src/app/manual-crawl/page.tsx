'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { PropertyWithMatch, ConditionMatchItem, CustomerCondition, CustomerSearchUrl } from '@/types'

// -------------------------------------------------------
// 定数
// -------------------------------------------------------
const PORTALS: { key: string; label: string }[] = [
  { key: 'suumo',  label: 'SUUMO' },
  { key: 'athome', label: 'アットホーム' },
  { key: 'homes',  label: "LIFULL HOME'S" },
]

const PAGE_OPTIONS = [
  { value: 1,  label: '1ページ',  desc: '動作確認' },
  { value: 3,  label: '3ページ',  desc: '新着確認（推奨）' },
  { value: 10, label: '10ページ', desc: '広範囲取得' },
]

// -------------------------------------------------------
// 型
// -------------------------------------------------------
interface CustomerWithCondition {
  id: string
  name: string
  customer_no: string
  customer_conditions: CustomerCondition[]
  customer_search_urls: CustomerSearchUrl[]
}

type JobStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed'

// -------------------------------------------------------
// 一括検索モード用の型
// -------------------------------------------------------
interface BulkJobResult {
  id: string
  portal: string
  status: string
  fetched_count: number
  new_count: number
  duplicate_count: number
  error_message: string | null
}

interface BulkRunResponse {
  ok?: boolean
  error?: string
  job_id?: string
  status?: string
  total_fetched?: number
  total_new?: number
  total_duplicates?: number
  total_matched?: number
  total_manual_check?: number
  errors?: string[]
}

const BULK_PORTAL_LABEL: Record<string, string> = { suumo: 'SUUMO', homes: "HOME'S", athome: 'アットホーム' }
const BULK_RESULT_STATUS_LABEL: Record<string, string> = {
  completed: '完了', no_results: '0件取得', url_missing: 'URL未生成',
  fetch_error: '失敗（取得エラー）', save_error: '失敗（保存エラー）', timeout: '失敗（タイムアウト）',
}

interface CrawlJob {
  id: string
  status: JobStatus
  site: string
  portal_name: string
  properties_found: number | null
  new_count: number | null
  result: { properties: (PropertyWithMatch & { isAlreadyProposed?: boolean })[] } | null
  error_message: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

// -------------------------------------------------------
// 小コンポーネント
// -------------------------------------------------------
function MatchBadge({ item }: { item: ConditionMatchItem }) {
  const color = item.match === 'ok' ? 'text-green-700 bg-green-50' :
                item.match === 'ng' ? 'text-red-600 bg-red-50' :
                'text-slate-400 bg-slate-50'
  const icon  = item.match === 'ok' ? '○' : item.match === 'ng' ? '✕' : '—'
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${color}`}>
      <span className="font-bold">{icon}</span>
      <span>{item.label}</span>
      {item.actual && <span className="opacity-70">({item.actual})</span>}
    </span>
  )
}

function ScoreBar({ score }: { score: number }) {
  const pct   = Math.round(score * 100)
  const color = score >= 0.8 ? 'bg-green-500' : score >= 0.5 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

// レインズ照合ステータスの表示設定
const REINS_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  unchecked:   { label: '未照合',         color: 'bg-slate-100 text-slate-500' },
  queued:      { label: '照合待ち',       color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: '照合中',         color: 'bg-amber-100 text-amber-700' },
  found:       { label: '掲載あり',       color: 'bg-green-100 text-green-700' },
  candidates:  { label: '候補あり・要確認', color: 'bg-yellow-100 text-yellow-700' },
  not_found:   { label: '掲載なし',       color: 'bg-red-50 text-red-600' },
  error:       { label: 'エラー',         color: 'bg-red-100 text-red-700' },
}

function ReinsStatusBadge({ status }: { status: string }) {
  const cfg = REINS_STATUS_CONFIG[status] ?? REINS_STATUS_CONFIG.unchecked
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function PropertyCard({
  prop, customerId, onProposed,
}: {
  prop: PropertyWithMatch & { isAlreadyProposed?: boolean }
  customerId: string
  onProposed: (id: string) => void
}) {
  const [addingCandidate, setAddingCandidate] = useState(false)
  const [candidateState, setCandidateState] = useState<{
    done: boolean; addedAt: string | null
  }>({ done: prop.isAlreadyProposed ?? false, addedAt: null })

  const [reinsStatus, setReinsStatus] = useState<string>('unchecked')
  const [reinsQueuing, setReinsQueuing] = useState(false)

  // 初期ロード: この物件がすでに候補・キューに入っているか確認
  useEffect(() => {
    if (!prop.propertyId || !customerId) return
    // 候補追加済みチェック
    fetch(`/api/proposal-candidates?customer_id=${customerId}`)
      .then(r => r.json())
      .then((list: Array<{ property_id: string; added_at: string; displayReinsStatus?: string }>) => {
        const found = list.find(c => c.property_id === prop.propertyId)
        if (found) {
          setCandidateState({ done: true, addedAt: found.added_at })
          if (found.displayReinsStatus) setReinsStatus(found.displayReinsStatus)
        }
      })
      .catch(() => {})

    // レインズキューのステータス確認
    fetch(`/api/reins-queue?customer_id=${customerId}`)
      .then(r => r.json())
      .then((data: { items?: Array<{ property?: { id: string }; status: string }> }) => {
        const item = (data.items ?? []).find(i => i.property?.id === prop.propertyId)
        if (item) setReinsStatus(mapQueueStatus(item.status))
      })
      .catch(() => {})
  }, [prop.propertyId, customerId])

  function mapQueueStatus(status: string): string {
    if (status === 'queued') return 'queued'
    if (status === 'in_progress') return 'in_progress'
    if (status === 'matched') return 'found'
    if (status === 'needs_review') return 'candidates'
    if (status === 'not_found') return 'not_found'
    return 'unchecked'
  }

  async function queueReinsCheck() {
    if (!prop.propertyId) return
    setReinsQueuing(true)
    const res = await fetch('/api/reins-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: prop.propertyId, customer_id: customerId }),
    })
    const json = await res.json()
    if (res.ok) {
      setReinsStatus(json.alreadyQueued ? mapQueueStatus(json.queue.status) : 'queued')
    } else {
      setReinsStatus('error')
    }
    setReinsQueuing(false)
  }

  async function addToCandidate() {
    if (!prop.propertyId) return
    setAddingCandidate(true)
    const res = await fetch('/api/proposal-candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: customerId,
        property_id: prop.propertyId,
        source: 'manual_crawl',
        reins_status: reinsStatus,
      }),
    })
    const json = await res.json()
    if (res.ok) {
      const addedAt = json.candidate?.added_at ?? json.added_at ?? new Date().toISOString()
      setCandidateState({ done: true, addedAt })
      onProposed(prop.propertyId)
    }
    setAddingCandidate(false)
  }

  const isRentProp = prop.transaction_type === 'rent'
  const displayPrice = isRentProp ? prop.monthly_rent : prop.price
  const fmt = (p: number | null) => p ? `${(p / 10000).toLocaleString()}万円` : '価格未定'
  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`
  }

  return (
    <div className={`border rounded-xl p-4 transition-colors ${
      candidateState.done ? 'bg-green-50 border-green-200' :
      prop.matchScore >= 0.8 ? 'bg-white border-slate-200' : 'bg-white border-slate-100 opacity-80'
    }`}>
      {/* ヘッダー行 */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {prop.isNew && <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded font-medium">新規</span>}
            {candidateState.done && <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded font-medium">候補追加済</span>}
            <span className="text-xs text-slate-400 uppercase">{prop.site}</span>
            <ReinsStatusBadge status={reinsStatus} />
          </div>
          {/* 物件名 = 詳細ページURL へのリンク */}
          <a href={prop.url} target="_blank" rel="noopener noreferrer"
             className="font-semibold text-sm text-blue-800 hover:underline leading-tight block truncate">
            {prop.name}
          </a>
          {prop.address && <p className="text-xs text-slate-500 mt-0.5 truncate">{prop.address}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-bold text-slate-800">{fmt(displayPrice)}</div>
          {prop.floor_plan && <div className="text-xs text-slate-500">{prop.floor_plan}</div>}
        </div>
      </div>

      {/* スペック */}
      <div className="flex gap-2 text-xs text-slate-500 mb-2 flex-wrap">
        {prop.area_sqm     && <span className="bg-slate-50 px-1.5 py-0.5 rounded">{prop.area_sqm}㎡</span>}
        {prop.walk_minutes && <span className="bg-slate-50 px-1.5 py-0.5 rounded">徒歩{prop.walk_minutes}分</span>}
        {prop.building_age !== null && <span className="bg-slate-50 px-1.5 py-0.5 rounded">築{prop.building_age}年</span>}
      </div>

      <ScoreBar score={prop.matchScore} />
      {prop.matchItems && prop.matchItems.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {prop.matchItems.map((item, i) => <MatchBadge key={i} item={item} />)}
        </div>
      )}

      {/* アクションボタン行 */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
        {/* レインズ照合ボタン */}
        <div className="flex flex-col gap-1 items-start">
          {prop.matchConfidence === 'estimated' && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              推定一致（{prop.estimatedSimilarity}%）
            </span>
          )}
          <button
            onClick={queueReinsCheck}
            disabled={reinsQueuing || reinsStatus === 'queued' || reinsStatus === 'in_progress' || !prop.propertyId}
            className="text-xs border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors font-medium"
          >
            {reinsQueuing ? '照合キュー投入中...' :
             reinsStatus === 'queued' ? '照合待ち中...' :
             reinsStatus === 'in_progress' ? '照合中...' :
             'レインズ照合'}
          </button>
        </div>

        {/* 提案候補追加ボタン */}
        {candidateState.done ? (
          <span className="text-xs text-green-700 font-medium">
            ✓ {candidateState.addedAt ? `${fmtDate(candidateState.addedAt)}に追加済` : '追加済'}
          </span>
        ) : (
          <button
            onClick={addToCandidate}
            disabled={addingCandidate || !prop.propertyId}
            className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-40 transition-colors font-medium"
          >
            {addingCandidate ? '追加中...' : '提案候補に追加'}
          </button>
        )}
      </div>
    </div>
  )
}

function JobStatusBanner({ job, elapsed }: { job: CrawlJob; elapsed: number }) {
  if (job.status === 'pending') return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
      <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-blue-800">GitHub Actions を起動しています...</p>
        <p className="text-xs text-blue-600 mt-0.5">初回起動に1〜2分かかります。（{elapsed}秒経過）</p>
      </div>
    </div>
  )
  if (job.status === 'running') return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
      <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-amber-800">探索中です...</p>
        <p className="text-xs text-amber-600 mt-0.5">{job.portal_name} を巡回しています。（{elapsed}秒経過）</p>
      </div>
    </div>
  )
  if (job.status === 'completed') return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
      <span className="text-green-500 text-xl flex-shrink-0">✓</span>
      <div>
        <p className="text-sm font-semibold text-green-800">探索完了</p>
        <p className="text-xs text-green-600 mt-0.5">
          {job.properties_found ?? 0}件取得、うち新規 <strong>{job.new_count ?? 0}件</strong> をDBに保存しました。
        </p>
      </div>
    </div>
  )
  if (job.status === 'failed') return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
      <p className="text-sm font-semibold text-red-800">探索に失敗しました</p>
      {job.error_message && <p className="text-xs text-red-600 mt-1 whitespace-pre-wrap">{job.error_message}</p>}
    </div>
  )
  return null
}

/** 顧客条件の1行サマリ */
function ConditionSummary({ cond }: { cond: CustomerCondition }) {
  const isSale = cond.transaction_type !== 'rent'
  const parts: string[] = []
  if (cond.area) parts.push(cond.area)
  if (cond.property_type) parts.push(cond.property_type)
  if (isSale && (cond.budget_min || cond.budget_max))
    parts.push(`${cond.budget_min ?? ''}〜${cond.budget_max ?? ''}万円`)
  if (!isSale && (cond.rent_min || cond.rent_max))
    parts.push(`賃料 ${cond.rent_min ?? ''}〜${cond.rent_max ?? ''}万円`)
  if (cond.area_sqm_min || cond.area_sqm_max)
    parts.push(`${cond.area_sqm_min ?? ''}〜${cond.area_sqm_max ?? ''}㎡`)
  if (cond.walk_minutes_max) parts.push(`徒歩${cond.walk_minutes_max}分以内`)
  if (cond.building_age_max) parts.push(`築${cond.building_age_max}年以内`)
  if (parts.length === 0) return <span className="text-slate-400">条件未設定</span>
  return <span className="text-slate-600">{parts.join(' / ')}</span>
}

// -------------------------------------------------------
// URL カードコンポーネント
// -------------------------------------------------------
function UrlCard({
  searchUrl,
  selected,
  onSelect,
  onDeactivated,
}: {
  searchUrl: CustomerSearchUrl
  selected: boolean
  onSelect: () => void
  onDeactivated: () => void
}) {
  const [deactivating, setDeactivating] = useState(false)

  async function handleDeactivate(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('このURLを無効化しますか？（削除はされません。再度有効化したい場合はSupabaseから is_active を戻してください）')) return
    setDeactivating(true)
    const res = await fetch(`/api/search-urls/${searchUrl.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    })
    setDeactivating(false)
    if (res.ok) onDeactivated()
  }

  return (
    <div
      onClick={onSelect}
      className={`rounded-lg p-3 border cursor-pointer transition-colors ${
        selected
          ? 'bg-slate-100 border-slate-500 ring-1 ring-slate-400'
          : 'bg-white border-slate-200 hover:border-slate-400'
      }`}
    >
      <div className="flex items-start gap-2">
        <input type="radio" readOnly checked={selected} className="mt-0.5 flex-shrink-0 accent-slate-700" />
        <div className="flex-1 min-w-0">
          {searchUrl.url_label && (
            <p className="text-xs font-medium text-slate-700 mb-0.5">{searchUrl.url_label}</p>
          )}
          <a
            href={searchUrl.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-xs text-blue-700 hover:underline break-all font-mono"
          >
            {searchUrl.url}
          </a>
          <div className="flex items-center gap-2 mt-1">
            {searchUrl.generated_by === 'auto' ? (
              <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                自動生成
              </span>
            ) : (
              <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-full">
                手動登録
              </span>
            )}
            {searchUrl.last_crawled_at && (
              <span className="text-xs text-slate-400">
                最終探索: {new Date(searchUrl.last_crawled_at).toLocaleDateString('ja-JP')}
              </span>
            )}
          </div>
          {/* 未解決エリアのログ表示 */}
          {Array.isArray(searchUrl.generation_log?.['unresolved_areas']) &&
           (searchUrl.generation_log!['unresolved_areas'] as string[]).length > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠ マスター未登録: {(searchUrl.generation_log!['unresolved_areas'] as string[]).join('・')}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleDeactivate}
          disabled={deactivating}
          className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded px-2 py-0.5 bg-white flex-shrink-0 disabled:opacity-40"
        >
          {deactivating ? '無効化中...' : '無効化'}
        </button>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(searchUrl.url) }}
          className="text-xs text-slate-400 hover:text-slate-700 border border-slate-200 rounded px-2 py-0.5 bg-white flex-shrink-0"
        >
          コピー
        </button>
      </div>
    </div>
  )
}

// 一括検索の結果1行（○/△アイコン付き）
function BulkResultRow({ r }: { r: BulkJobResult }) {
  const ok = r.status === 'completed' || r.status === 'no_results'
  const icon = ok ? '○' : '△'
  const iconColor = ok ? 'text-green-600' : 'text-amber-500'
  return (
    <div className="flex items-center gap-2 text-sm py-1.5">
      <span className={`font-bold ${iconColor}`}>{icon}</span>
      <span className="font-medium text-slate-700 w-24 flex-shrink-0">{BULK_PORTAL_LABEL[r.portal] ?? r.portal}</span>
      {ok ? (
        <span className="text-slate-600">
          {r.status === 'no_results' ? '0件取得' : `完了 ${r.fetched_count}件（新規${r.new_count}）`}
        </span>
      ) : (
        <span className="text-amber-600">
          {BULK_RESULT_STATUS_LABEL[r.status] ?? '失敗'}
          {r.error_message && <span className="text-slate-400 ml-1">— {r.error_message}</span>}
        </span>
      )}
    </div>
  )
}

// -------------------------------------------------------
// 手動取込パネル
// -------------------------------------------------------
interface MiCandidate {
  id: string
  file_id: string
  portal: string
  property_name: string | null
  price: number | null
  area_sqm: number | null
  layout: string | null
  built_year: number | null
  walk_minutes: number | null
  detail_url: string | null
  parse_status: string
  duplicate_status: string
  is_selected: boolean
  missing_fields: string[]
}
interface MiFile {
  id: string
  file_name: string | null
  page_number: number | null
  status: string
  detected_count: number
  error_message: string | null
}
interface MiJob {
  id: string
  status: string
  file_count: number
  files_parsed: number
  detected_count: number
  new_count: number
  duplicate_count: number
  needs_manual_check_count: number
  missing_pages: number[]
  error_summary: string | null
}
interface MiJobHistoryRow extends MiJob {
  created_at: string
  portal: string
  customers?: { name: string }
}

const MI_PORTAL_LABEL: Record<string, string> = { suumo: 'SUUMO', homes: "HOME'S", athome: 'アットホーム' }

function ManualImportPanel({ customers }: { customers: CustomerWithCondition[] }) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '')
  const [portal, setPortal] = useState<'suumo' | 'homes' | 'athome'>('suumo')
  const [htmlFiles, setHtmlFiles] = useState<FileList | null>(null)
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [htmlText, setHtmlText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [job, setJob] = useState<MiJob | null>(null)
  const [files, setFiles] = useState<MiFile[]>([])
  const [candidates, setCandidates] = useState<MiCandidate[]>([])
  const [confirming, setConfirming] = useState(false)
  const [confirmResult, setConfirmResult] = useState<{ new_count: number; matched: number; manual_check: number; no_match: number; save_errors: number; status: string } | null>(null)
  const [history, setHistory] = useState<MiJobHistoryRow[]>([])

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadHistory = useCallback(() => {
    fetch(`/api/portal-search/manual-import/jobs${customerId ? `?customer_id=${customerId}` : ''}`)
      .then(r => r.json()).then(d => setHistory(d.jobs ?? [])).catch(() => {})
  }, [customerId])

  useEffect(() => { loadHistory() }, [loadHistory])
  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current) }, [])

  async function loadJobDetail(jobId: string) {
    const res = await fetch(`/api/portal-search/manual-import/jobs/${jobId}`)
    if (!res.ok) return
    const data = await res.json()
    setJob(data.job)
    setFiles(data.files ?? [])
    setCandidates(data.candidates ?? [])
    return data.job as MiJob
  }

  async function runNextBatch(jobId: string) {
    const res = await fetch('/api/portal-search/manual-import/batch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data) {
      setError(data?.error ?? 'バッチ解析に失敗しました')
      return
    }
    await loadJobDetail(jobId)
    if (!data.done) {
      pollRef.current = setTimeout(() => runNextBatch(jobId), 300)
    } else {
      loadHistory()
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId) return
    if ((!htmlFiles || htmlFiles.length === 0) && !zipFile && !htmlText.trim()) {
      setError('HTMLファイル・ZIP・HTML貼り付けのいずれかを指定してください')
      return
    }
    setSubmitting(true)
    setError(null)
    setJob(null); setFiles([]); setCandidates([]); setConfirmResult(null)

    const form = new FormData()
    form.append('customer_id', customerId)
    form.append('portal', portal)
    if (htmlFiles) for (const f of Array.from(htmlFiles)) form.append('html_files', f)
    if (zipFile) form.append('zip_file', zipFile)
    if (htmlText.trim()) form.append('html_text', htmlText)

    try {
      const res = await fetch('/api/portal-search/manual-import/init', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? '取込の開始に失敗しました'); setSubmitting(false); return }
      await loadJobDetail(data.job_id)
      runNextBatch(data.job_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleCandidate(c: MiCandidate) {
    const next = !c.is_selected
    setCandidates(prev => prev.map(x => x.id === c.id ? { ...x, is_selected: next } : x))
    if (!job) return
    await fetch(`/api/portal-search/manual-import/jobs/${job.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidates: [{ id: c.id, is_selected: next }] }),
    })
  }

  async function handleConfirm() {
    if (!job) return
    setConfirming(true)
    setError(null)
    try {
      const res = await fetch('/api/portal-search/manual-import/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? '確定保存に失敗しました'); return }
      setConfirmResult(data)
      await loadJobDetail(job.id)
      loadHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setConfirming(false)
    }
  }

  const isParsing = job && job.status !== 'previewed' && job.status !== 'completed' && job.status !== 'partial_failed' && job.status !== 'failed'
  const normalCandidates = candidates.filter(c => c.parse_status === 'ok')
  const needsCheckCandidates = candidates.filter(c => c.parse_status === 'needs_manual_check')

  return (
    <div className="space-y-6">
      <form onSubmit={handleUpload} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">対象顧客</label>
          <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            value={customerId} onChange={e => setCustomerId(e.target.value)}>
            {customers.map(c => <option key={c.id} value={c.id}>{c.customer_no} — {c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">対象ポータル</label>
          <div className="flex gap-2">
            {(['suumo', 'homes', 'athome'] as const).map(p => (
              <button key={p} type="button" onClick={() => setPortal(p)}
                className={`px-3 py-1.5 rounded-lg text-sm border-2 transition-colors ${
                  portal === p ? 'border-slate-700 bg-slate-50 font-semibold text-slate-800' : 'border-slate-200 text-slate-600 hover:border-slate-400'
                }`}>
                {MI_PORTAL_LABEL[p]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">HTMLファイル（複数選択可）</label>
          <input type="file" multiple accept=".html,.htm" onChange={e => setHtmlFiles(e.target.files)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
          <p className="text-xs text-slate-400 mt-1">page1.html, page2.html のように複数ページを一度に選択できます</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">ZIPファイル</label>
          <input type="file" accept=".zip" onChange={e => setZipFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
          <p className="text-xs text-slate-400 mt-1">
            上限: ZIP 50MB／展開後合計 200MB／HTMLファイル数 200／1ファイル 5MB。画像・CSS・JSは無視されます
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">HTMLソース貼り付け（任意）</label>
          <textarea value={htmlText} onChange={e => setHtmlText(e.target.value)} rows={4}
            placeholder="ブラウザの「ページのソースを表示」またはdocument.documentElement.outerHTMLの内容を貼り付け"
            className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2" />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          推奨保存方法: ブラウザで検索結果ページを開き「ページのソースを表示」→全選択コピー→保存、または「名前を付けて保存」で
          <strong>「HTMLのみ」</strong>を選択してください。「ウェブページ、完全」は検索結果DOMが欠落する場合があります。
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 whitespace-pre-wrap">{error}</div>}

        <button type="submit" disabled={submitting || !customerId}
          className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-semibold hover:bg-slate-700 disabled:opacity-40 transition-colors">
          {submitting ? 'アップロード中...' : '取込を開始（プレビュー）'}
        </button>
      </form>

      {job && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              job.status === 'previewed' ? 'bg-blue-100 text-blue-700' :
              job.status === 'completed' ? 'bg-green-100 text-green-700' :
              job.status === 'partial_failed' ? 'bg-amber-100 text-amber-700' :
              job.status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
            }`}>
              {job.status}
            </span>
            {isParsing && (
              <span className="text-sm text-slate-500">
                解析中... {job.files_parsed} / {job.file_count} ファイル処理済み
              </span>
            )}
          </div>

          {job.missing_pages.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              ⚠ {job.missing_pages.join('・')}ページ目が不足しています
            </div>
          )}

          {job.status === 'previewed' && (
            <>
              <div className="flex gap-4 text-sm text-slate-600">
                <span>検出 <strong>{job.detected_count}</strong></span>
                <span className="text-slate-400">重複 {job.duplicate_count}</span>
                <span className="text-amber-600">要手動確認 {job.needs_manual_check_count}</span>
              </div>

              <div className="max-h-96 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100">
                {normalCandidates.map(c => (
                  <label key={c.id} className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer ${c.duplicate_status !== 'new' ? 'opacity-50' : ''}`}>
                    <input type="checkbox" checked={c.is_selected} onChange={() => toggleCandidate(c)} className="w-4 h-4" />
                    <span className="flex-1 truncate">{c.property_name}</span>
                    <span className="text-slate-500 w-24 text-right">{c.price ? `${Math.round(c.price / 10000).toLocaleString()}万円` : '—'}</span>
                    <span className="text-slate-400 w-16 text-right">{c.area_sqm ?? '—'}㎡</span>
                    {c.duplicate_status !== 'new' && <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{c.duplicate_status}</span>}
                  </label>
                ))}
              </div>

              {needsCheckCandidates.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-700 mb-1">NEED_MANUAL_CHECK（athome必須項目不足・保存対象外）</p>
                  <div className="max-h-56 overflow-y-auto border border-amber-100 bg-amber-50 rounded-lg divide-y divide-amber-100">
                    {needsCheckCandidates.map(c => {
                      const f = files.find(f => f.id === c.file_id)
                      return (
                        <div key={c.id} className="px-3 py-2 text-xs text-amber-800">
                          <div>{c.property_name || '（物件名不明）'} | {c.price ? `${Math.round(c.price / 10000)}万円` : '価格不明'} | {c.detail_url || 'URL不明'}</div>
                          <div className="text-amber-500">不足: {c.missing_fields.join('・')} / ファイル: {f?.file_name} (page {f?.page_number ?? '—'})</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <button onClick={handleConfirm} disabled={confirming}
                className="w-full bg-green-700 text-white py-2.5 rounded-lg font-semibold hover:bg-green-800 disabled:opacity-40 transition-colors">
                {confirming ? '確定中...' : '全件取込を確定'}
              </button>
            </>
          )}

          {confirmResult && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700">
              新規保存 {confirmResult.new_count} / MATCH {confirmResult.matched} / NEED_MANUAL_CHECK {confirmResult.manual_check} / NO_MATCH {confirmResult.no_match}
              {confirmResult.save_errors > 0 && <span className="text-red-600"> / 保存失敗 {confirmResult.save_errors}</span>}
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-600 mb-2">手動取込履歴</h3>
        {history.length === 0 ? (
          <div className="text-center text-slate-400 py-8 bg-white rounded-xl border border-slate-200 text-sm">まだ手動取込を実行していません</div>
        ) : (
          <div className="space-y-1.5">
            {history.map(h => (
              <div key={h.id} className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-xs flex items-center gap-3">
                <span className="text-slate-400">{new Date(h.created_at).toLocaleString('ja-JP')}</span>
                <span className="text-slate-600">{h.customers?.name}</span>
                <span className="font-medium">{MI_PORTAL_LABEL[h.portal] ?? h.portal}</span>
                <span className="text-slate-500">{h.file_count}ページ</span>
                <span>検出{h.detected_count}</span>
                <span className="text-green-600">新規{h.new_count}</span>
                <span className="text-slate-400">重複{h.duplicate_count}</span>
                <span className="text-amber-600">要確認{h.needs_manual_check_count}</span>
                <span className={`ml-auto px-2 py-0.5 rounded-full ${
                  h.status === 'completed' ? 'bg-green-100 text-green-700' :
                  h.status === 'partial_failed' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                }`}>{h.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// -------------------------------------------------------
// メインページ
// -------------------------------------------------------
export default function ManualCrawlPage() {
  const [customers, setCustomers]   = useState<CustomerWithCondition[]>([])
  const [loading, setLoading]       = useState(true)

  const [searchMode, setSearchMode] = useState<'single' | 'bulk' | 'manual_import'>('single')

  const [customerId, setCustomerId] = useState('')
  const [portal, setPortal]         = useState('suumo')
  const [maxPages, setMaxPages]     = useState(3)
  const [selectedUrlId, setSelectedUrlId] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualUrl, setManualUrl]   = useState('')
  const [showUrlPanel, setShowUrlPanel] = useState(false)

  // 一括検索モード用
  const [bulkPortals, setBulkPortals] = useState<Record<string, boolean>>({ suumo: true, homes: true, athome: true })
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkError, setBulkError]     = useState<string | null>(null)
  const [bulkSummary, setBulkSummary] = useState<BulkRunResponse | null>(null)
  const [bulkResults, setBulkResults] = useState<BulkJobResult[]>([])

  const [regenerating, setRegenerating] = useState(false)
  const [regenResult, setRegenResult]   = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState<string | null>(null)

  const [job, setJob]               = useState<CrawlJob | null>(null)
  const [elapsed, setElapsed]       = useState(0)
  const [filter, setFilter]         = useState<'all' | 'matched'>('all')
  const [proposedIds, setProposedIds] = useState<Set<string>>(new Set())

  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 顧客一覧取得 (customer_search_urls を含む)
  const fetchCustomers = useCallback(async () => {
    const res = await fetch('/api/customers')
    const data = await res.json()
    const list: CustomerWithCondition[] = Array.isArray(data) ? data : (data.customers ?? [])
    setCustomers(list)
    if (list.length > 0 && !customerId) setCustomerId(list[0].id)
    setLoading(false)
  }, [customerId])

  useEffect(() => { fetchCustomers() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    if (pollRef.current)    clearInterval(pollRef.current)
    if (elapsedRef.current) clearInterval(elapsedRef.current)
  }, [])

  // 選択中顧客
  const selectedCustomer = customers.find(c => c.id === customerId)
  const condition        = selectedCustomer?.customer_conditions?.[0] ?? null

  // 選択ポータルの保存済み URL
  const portalUrls = (selectedCustomer?.customer_search_urls ?? []).filter(
    u => u.site === portal && u.is_active
  )

  // 選択 URL
  const selectedUrl = portalUrls.find(u => u.id === selectedUrlId) ?? portalUrls[0] ?? null

  // 実際に送信する URL
  const activeUrl = manualMode ? manualUrl.trim() : selectedUrl?.url ?? null

  // ポータルまたは顧客が変わったら URL 選択をリセット
  useEffect(() => {
    setSelectedUrlId(null)
    setManualMode(false)
    setManualUrl('')
    setRegenResult(null)
  }, [customerId, portal])

  // 一括検索モードに切り替えたら前回結果をクリア
  useEffect(() => {
    setBulkSummary(null)
    setBulkResults([])
    setBulkError(null)
  }, [customerId, searchMode])

  // 一括検索実行（SUUMO → 30秒待機 → HOME'S → 30秒待機 → athome の順にAPI側で実行される）
  async function runBulkSearch() {
    if (!customerId) return
    const portals = Object.entries(bulkPortals).filter(([, v]) => v).map(([k]) => k)
    if (portals.length === 0) {
      setBulkError('ポータルを1つ以上選択してください')
      return
    }
    setBulkRunning(true)
    setBulkError(null)
    setBulkSummary(null)
    setBulkResults([])
    try {
      const res = await fetch('/api/portal-search/run-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, portals, created_by: 'manual-crawl-ui' }),
      })
      const data: BulkRunResponse = await res.json()
      if (!res.ok || !data.ok) {
        setBulkError(data.error ?? '一括検索の実行に失敗しました')
        return
      }
      setBulkSummary(data)
      if (data.job_id) {
        const detailRes = await fetch(`/api/portal-search/jobs/${data.job_id}`)
        if (detailRes.ok) {
          const detail = await detailRes.json()
          setBulkResults(detail.results ?? [])
        }
      }
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : String(e))
    } finally {
      setBulkRunning(false)
    }
  }

  function startPolling(jobId: string) {
    setElapsed(0)
    elapsedRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    pollRef.current = setInterval(async () => {
      const res  = await fetch(`/api/manual-crawl/status/${jobId}`)
      if (!res.ok) return
      const data: CrawlJob = await res.json()
      setJob(data)
      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(pollRef.current!)
        clearInterval(elapsedRef.current!)
      }
    }, 5000)
  }

  // URL 再生成
  async function handleRegenerate() {
    if (!customerId) return
    setRegenerating(true)
    setRegenResult(null)
    try {
      const res = await fetch(`/api/customers/${customerId}/regenerate-urls`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setRegenResult(`エラー: ${data.error ?? '再生成に失敗しました'}`)
        return
      }
      // 顧客データを再取得して URL を更新
      await fetchCustomers()
      const summaries: Array<{ portal: string; urlCount: number; canGenerate: boolean; unresolvedAreas: string[] }>
        = data.summaries ?? []
      const unresolved = summaries.flatMap(s => s.unresolvedAreas)
      if (unresolved.length > 0) {
        setRegenResult(`再生成完了。未解決エリア: ${unresolved.join('・')}（portal_area_mappings への追加が必要）`)
      } else {
        setRegenResult(`再生成完了。`)
      }
    } catch {
      setRegenResult('再生成中にエラーが発生しました。')
    } finally {
      setRegenerating(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeUrl || !customerId) return

    setSubmitting(true)
    setFormError(null)
    setJob(null)
    setFilter('all')
    setProposedIds(new Set())

    const res = await fetch('/api/manual-crawl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portalName: PORTALS.find(p => p.key === portal)?.label ?? portal,
        url:        activeUrl,
        customerId,
        maxPages,
      }),
    })
    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setFormError(data.error ?? '探索の開始に失敗しました')
      return
    }

    const newJob: CrawlJob = {
      id: data.jobId, status: 'pending',
      site: portal,
      portal_name: PORTALS.find(p => p.key === portal)?.label ?? portal,
      properties_found: null, new_count: null, result: null,
      error_message: null, started_at: null, finished_at: null,
      created_at: new Date().toISOString(),
    }
    setJob(newJob)
    startPolling(data.jobId)
  }

  const isActive  = job?.status === 'pending' || job?.status === 'running'
  const canSubmit = !!activeUrl && !!customerId && !submitting && !isActive

  const displayedProps = (job?.result?.properties ?? [])
    .filter(p => !proposedIds.has(p.propertyId ?? ''))
    .filter(p => filter === 'all' ? true : p.matchScore >= 0.5)

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">読み込み中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">手動探索</h1>
        <p className="text-sm text-slate-500 mt-1">
          顧客を選択してポータルを指定し、「今すぐ探索」を押すだけで物件を取得します。
          検索URLは顧客条件の保存時に自動生成されます。
        </p>
      </div>

      {/* ---- モード切替 ---- */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setSearchMode('single')}
          className={`px-4 py-1.5 rounded-lg text-sm border-2 transition-colors ${
            searchMode === 'single'
              ? 'border-slate-700 bg-slate-50 font-semibold text-slate-800'
              : 'border-slate-200 text-slate-500 hover:border-slate-400'
          }`}
        >
          単一ポータル
        </button>
        <button
          type="button"
          onClick={() => setSearchMode('bulk')}
          className={`px-4 py-1.5 rounded-lg text-sm border-2 transition-colors ${
            searchMode === 'bulk'
              ? 'border-slate-700 bg-slate-50 font-semibold text-slate-800'
              : 'border-slate-200 text-slate-500 hover:border-slate-400'
          }`}
        >
          一括検索（複数ポータル）
        </button>
        <button
          type="button"
          onClick={() => setSearchMode('manual_import')}
          className={`px-4 py-1.5 rounded-lg text-sm border-2 transition-colors ${
            searchMode === 'manual_import'
              ? 'border-slate-700 bg-slate-50 font-semibold text-slate-800'
              : 'border-slate-200 text-slate-500 hover:border-slate-400'
          }`}
        >
          手動取込
        </button>
      </div>

      {/* ==================================================== */}
      {/* 手動取込モード */}
      {/* ==================================================== */}
      {searchMode === 'manual_import' && (
        <ManualImportPanel customers={customers} />
      )}

      {/* ==================================================== */}
      {/* 一括検索モード */}
      {/* ==================================================== */}
      {searchMode === 'bulk' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">対象顧客</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.customer_no} — {c.name}</option>
              ))}
            </select>
            {condition ? (
              <p className="text-xs mt-1.5 ml-0.5">
                <span className="text-slate-400">希望条件: </span>
                <ConditionSummary cond={condition} />
              </p>
            ) : customerId ? (
              <p className="text-xs text-amber-600 mt-1.5 ml-0.5">
                希望条件が未登録です。顧客詳細から条件を入力してください。
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">対象ポータル（複数選択可）</label>
            <div className="flex gap-5">
              {PORTALS.map(p => (
                <label key={p.key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkPortals[p.key] ?? false}
                    onChange={e => setBulkPortals(s => ({ ...s, [p.key]: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  {p.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              実行順は SUUMO → 30秒待機 → HOME&apos;S → 30秒待機 → アットホーム に固定されます（bot対策）。
            </p>
          </div>

          <button
            type="button"
            onClick={runBulkSearch}
            disabled={bulkRunning || !customerId}
            className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-semibold hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            {bulkRunning ? '検索中...（数分かかります）' : '今すぐ検索'}
          </button>

          {bulkError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 whitespace-pre-wrap">
              {bulkError}
            </div>
          )}

          {bulkSummary && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  bulkSummary.status === 'completed' ? 'bg-green-100 text-green-700' :
                  bulkSummary.status === 'partial_failed' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-600'
                }`}>
                  {bulkSummary.status === 'completed' ? '完了' :
                   bulkSummary.status === 'partial_failed' ? '一部失敗' : '失敗'}
                </span>
                <span className="text-sm text-slate-600">
                  取得 <strong>{bulkSummary.total_fetched ?? 0}</strong> ／
                  重複 {bulkSummary.total_duplicates ?? 0} ／
                  条件一致 <strong className="text-green-600">{bulkSummary.total_matched ?? 0}</strong> ／
                  要手動確認 {bulkSummary.total_manual_check ?? 0}
                </span>
              </div>

              {/* ポータル別結果一覧（○/△） */}
              <div className="bg-slate-50 rounded-lg px-4 py-2 divide-y divide-slate-200">
                {bulkResults.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">結果を読み込み中...</p>
                ) : (
                  bulkResults.map(r => <BulkResultRow key={r.id} r={r} />)
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* 単一ポータルモード */}
      {/* ==================================================== */}
      {searchMode === 'single' && (
      <>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 mb-6 space-y-5">

        {/* ---- 顧客選択 ---- */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">対象顧客</label>
          <select
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            value={customerId}
            onChange={e => { setCustomerId(e.target.value); setJob(null) }}
          >
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.customer_no} — {c.name}</option>
            ))}
          </select>

          {condition ? (
            <p className="text-xs mt-1.5 ml-0.5">
              <span className="text-slate-400">希望条件: </span>
              <ConditionSummary cond={condition} />
            </p>
          ) : customerId ? (
            <p className="text-xs text-amber-600 mt-1.5 ml-0.5">
              希望条件が未登録です。顧客詳細から条件を入力してください。
            </p>
          ) : null}
        </div>

        {/* ---- ポータル選択 ---- */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">ポータル</label>
          <div className="flex flex-wrap gap-2">
            {PORTALS.map(p => {
              const urls = (selectedCustomer?.customer_search_urls ?? []).filter(
                u => u.site === p.key && u.is_active
              )
              const hasUrl = urls.length > 0
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPortal(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm border-2 transition-colors relative ${
                    portal === p.key
                      ? 'border-slate-700 bg-slate-50 font-semibold text-slate-800'
                      : 'border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {p.label}
                  {hasUrl ? (
                    <span className="ml-1.5 text-xs text-green-600 font-normal">✓</span>
                  ) : (
                    <span className="ml-1.5 text-xs text-slate-400 font-normal">—</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ---- URL セクション ---- */}
        {!manualMode && (
          <div className="space-y-2">
            {portalUrls.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-amber-800">
                  {PORTALS.find(p => p.key === portal)?.label} の検索URLが未生成です
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  「URLを再生成」ボタンを押すか、顧客条件を保存すると自動生成されます。<br />
                  エリアがマスターに未登録の場合は「手動でURLを入力」をご利用ください。
                </p>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowUrlPanel(v => !v)}
                  className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
                >
                  {showUrlPanel ? '▲ URLを隠す' : '▼ 検索URLを確認する'}
                </button>
                {showUrlPanel && (
                  <div className="space-y-2">
                    {portalUrls.map(u => (
                      <UrlCard
                        key={u.id}
                        searchUrl={u}
                        selected={selectedUrl?.id === u.id}
                        onSelect={() => setSelectedUrlId(u.id)}
                        onDeactivated={() => fetchCustomers()}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* URL再生成 */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={regenerating || !condition}
                className="text-xs bg-white text-slate-600 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 hover:border-slate-400 disabled:opacity-40 transition-colors font-medium"
              >
                {regenerating ? '再生成中...' : 'URLを再生成'}
              </button>
              {regenResult && (
                <p className={`text-xs ${regenResult.startsWith('エラー') ? 'text-red-600' : 'text-slate-500'}`}>
                  {regenResult}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ---- 取得ページ数 ---- */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">取得ページ数</label>
          <div className="flex gap-2">
            {PAGE_OPTIONS.map(o => (
              <button key={o.value} type="button" onClick={() => setMaxPages(o.value)}
                className={`flex-1 border-2 rounded-lg py-2 text-center transition-colors ${
                  maxPages === o.value
                    ? 'border-slate-700 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-400'
                }`}>
                <div className="font-semibold text-sm text-slate-800">{o.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{o.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ---- 手動URLフォールバック ---- */}
        <div>
          <button type="button" onClick={() => setManualMode(v => !v)}
            className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors">
            {manualMode ? '▲ 自動生成URLに戻す' : '▼ 手動でURLを入力する（フォールバック）'}
          </button>

          {manualMode && (
            <div className="mt-2 space-y-1">
              <input
                type="url"
                value={manualUrl}
                onChange={e => setManualUrl(e.target.value)}
                placeholder="https://suumo.jp/jj/bukken/ichiran/..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <p className="text-xs text-slate-400">
                ブラウザで絞り込んだ検索結果ページのURLをそのまま貼り付けてください。
              </p>
            </div>
          )}
        </div>

        {formError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 whitespace-pre-wrap">
            {formError}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-semibold hover:bg-slate-700 disabled:opacity-40 transition-colors"
        >
          {submitting ? '起動中...' :
           isActive   ? '探索中（実行中）' :
           !condition && !manualMode ? '条件が未登録です' :
           !activeUrl ? 'URLを生成または手動入力してください' :
           '今すぐ探索'}
        </button>
      </form>

      {/* ---- ジョブ状態 ---- */}
      {job && (
        <div className="space-y-4">
          <JobStatusBanner job={job} elapsed={elapsed} />

          {job.status === 'completed' && job.result && (
            <div>
              {job.properties_found === 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 text-sm text-slate-600">
                  <p className="font-semibold mb-1">物件が0件でした。考えられる原因:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>検索条件が厳しすぎる（価格・面積・徒歩分の範囲を広げてみてください）</li>
                    <li>URLのエリアコードが未解決（「検索URLを確認する」で開いてブラウザで確認）</li>
                    <li>ポータルのHTML構造が変更された（クローラー側の問題）</li>
                  </ul>
                  <p className="mt-2 text-xs text-slate-400">
                    generation_log に詳細な診断情報が記録されています（Supabase で確認可能）。
                  </p>
                </div>
              )}

              <div className="flex gap-2 mb-4">
                {(['all', 'matched'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      filter === f ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}>
                    {f === 'all' ? `全件 (${job.result!.properties.length})` : '条件一致のみ'}
                  </button>
                ))}
              </div>

              {displayedProps.length === 0 ? (
                <div className="text-center text-slate-400 py-12 bg-white rounded-xl border border-slate-200">
                  {filter !== 'all' ? '条件に合致する物件がありません' : '物件が見つかりませんでした'}
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedProps.map((p, i) => (
                    <PropertyCard key={i} prop={p} customerId={customerId}
                      onProposed={id => setProposedIds(prev => new Set([...prev, id]))} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </>)}
    </div>
  )
}
