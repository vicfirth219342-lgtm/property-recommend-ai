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

function PropertyCard({
  prop, customerId, onProposed,
}: {
  prop: PropertyWithMatch & { isAlreadyProposed?: boolean }
  customerId: string
  onProposed: (id: string) => void
}) {
  const [proposing, setProposing] = useState(false)
  const [done, setDone] = useState(prop.isAlreadyProposed ?? false)

  async function propose() {
    if (!prop.propertyId) return
    setProposing(true)
    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId, property_ids: [prop.propertyId] }),
    })
    if (res.ok) { setDone(true); onProposed(prop.propertyId) }
    setProposing(false)
  }

  const fmt = (p: number | null) => p ? `${(p / 10000).toLocaleString()}万円` : '価格未定'

  return (
    <div className={`border rounded-xl p-4 transition-colors ${
      done ? 'bg-green-50 border-green-200' :
      prop.matchScore >= 0.8 ? 'bg-white border-slate-200' : 'bg-white border-slate-100 opacity-80'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {prop.isNew && <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded font-medium">新規</span>}
            {done       && <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded font-medium">提案済</span>}
            <span className="text-xs text-slate-400 uppercase">{prop.site}</span>
          </div>
          <a href={prop.url} target="_blank" rel="noopener noreferrer"
             className="font-semibold text-sm text-blue-800 hover:underline leading-tight block truncate">
            {prop.name}
          </a>
          {prop.address && <p className="text-xs text-slate-500 mt-0.5 truncate">{prop.address}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-bold text-slate-800">{fmt(prop.price)}</div>
          {prop.floor_plan && <div className="text-xs text-slate-500">{prop.floor_plan}</div>}
        </div>
      </div>
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
      <div className="flex justify-end mt-2">
        {done ? (
          <span className="text-xs text-green-700 font-medium">✓ 提案候補に追加済</span>
        ) : (
          <button onClick={propose} disabled={proposing || !prop.propertyId}
            className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-40 transition-colors font-medium">
            {proposing ? '追加中...' : '提案候補に追加'}
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
}: {
  searchUrl: CustomerSearchUrl
  selected: boolean
  onSelect: () => void
}) {
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
          onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(searchUrl.url) }}
          className="text-xs text-slate-400 hover:text-slate-700 border border-slate-200 rounded px-2 py-0.5 bg-white flex-shrink-0"
        >
          コピー
        </button>
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

  const [customerId, setCustomerId] = useState('')
  const [portal, setPortal]         = useState('suumo')
  const [maxPages, setMaxPages]     = useState(3)
  const [selectedUrlId, setSelectedUrlId] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualUrl, setManualUrl]   = useState('')
  const [showUrlPanel, setShowUrlPanel] = useState(false)

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
    </div>
  )
}
