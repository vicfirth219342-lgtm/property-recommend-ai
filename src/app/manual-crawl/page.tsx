'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { PropertyWithMatch, ConditionMatchItem, CustomerCondition } from '@/types'
import {
  PortalAreaMapping, SiteKey,
  buildPortalUrl, BuildResult, resolveAreaNames, makeUrlLog,
} from '@/lib/portalUrlBuilder'

// -------------------------------------------------------
// 定数
// -------------------------------------------------------
const PORTALS: { key: SiteKey; label: string }[] = [
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

/** エリア照合バッジ一覧 */
function AreaResolutionBadges({ result, mappings, portal }: {
  result: BuildResult
  mappings: PortalAreaMapping[]
  portal: SiteKey
}) {
  const cond_area = result.resolvedAreas.concat(result.unresolvedAreas)
  if (cond_area.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {result.resolvedAreas.map(name => (
        <span key={name} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
          ✓ {name}
        </span>
      ))}
      {result.unresolvedAreas.map(name => (
        <span key={name} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
          ? {name}（マスター未登録）
        </span>
      ))}
    </div>
  )
}

// -------------------------------------------------------
// メインページ
// -------------------------------------------------------
export default function ManualCrawlPage() {
  const [customers, setCustomers]     = useState<CustomerWithCondition[]>([])
  const [mappings, setMappings]       = useState<PortalAreaMapping[]>([])
  const [loadingMaps, setLoadingMaps] = useState(true)

  const [customerId, setCustomerId]   = useState('')
  const [portal, setPortal]           = useState<SiteKey>('suumo')
  const [maxPages, setMaxPages]       = useState(3)
  const [showUrls, setShowUrls]       = useState(false)
  const [manualMode, setManualMode]   = useState(false)
  const [manualUrl, setManualUrl]     = useState('')

  const [submitting, setSubmitting]   = useState(false)
  const [formError, setFormError]     = useState<string | null>(null)
  const [submitUrlIdx, setSubmitUrlIdx] = useState(0)  // 複数URLの場合どれを使うか

  const [job, setJob]                 = useState<CrawlJob | null>(null)
  const [elapsed, setElapsed]         = useState(0)
  const [filter, setFilter]           = useState<'all' | 'matched'>('all')
  const [proposedIds, setProposedIds] = useState<Set<string>>(new Set())

  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // マスターデータ + 顧客一覧を並行取得
  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/area-mappings').then(r => r.json()),
    ]).then(([cust, maps]) => {
      const list: CustomerWithCondition[] = Array.isArray(cust) ? cust : (cust.customers ?? [])
      setCustomers(list)
      if (list.length > 0) setCustomerId(list[0].id)
      setMappings(Array.isArray(maps) ? maps : [])
      setLoadingMaps(false)
    })
  }, [])

  useEffect(() => () => {
    if (pollRef.current)    clearInterval(pollRef.current)
    if (elapsedRef.current) clearInterval(elapsedRef.current)
  }, [])

  // 選択中顧客と条件
  const selectedCustomer = customers.find(c => c.id === customerId)
  const condition        = selectedCustomer?.customer_conditions?.[0] ?? null

  // URL 生成
  const buildResult: BuildResult | null = condition && !loadingMaps
    ? buildPortalUrl(portal, condition, mappings)
    : null

  // 送信に使うURL
  const activeUrl = manualMode
    ? manualUrl.trim()
    : buildResult?.urls[submitUrlIdx]?.url ?? null

  // 顧客が変わったら手動モード解除
  useEffect(() => {
    setManualMode(false)
    setManualUrl('')
    setSubmitUrlIdx(0)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeUrl || !customerId) return

    // 0件判別ログを console に記録（デバッグ用）
    if (buildResult && !manualMode) {
      console.info('[manual-crawl] URL生成ログ:', makeUrlLog(portal, buildResult, condition!))
    }

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

  const isActive       = job?.status === 'pending' || job?.status === 'running'
  const canSubmit      = !!activeUrl && !!customerId && !submitting && !isActive
  const displayedProps = (job?.result?.properties ?? [])
    .filter(p => !proposedIds.has(p.propertyId ?? ''))
    .filter(p => filter === 'all' ? true : p.matchScore >= 0.5)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">手動探索</h1>
        <p className="text-sm text-slate-500 mt-1">
          顧客条件とポータルエリアマスターから検索URLを自動生成し、GitHub Actions 経由で物件を取得します。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 mb-6 space-y-5">

        {/* 顧客選択 */}
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

        {/* ポータル選択 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">ポータル</label>
          <div className="flex flex-wrap gap-2">
            {PORTALS.map(p => (
              <button key={p.key} type="button" onClick={() => setPortal(p.key)}
                className={`px-3 py-1.5 rounded-lg text-sm border-2 transition-colors ${
                  portal === p.key
                    ? 'border-slate-700 bg-slate-50 font-semibold text-slate-800'
                    : 'border-slate-200 text-slate-600 hover:border-slate-400'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 取得ページ数 */}
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

        {/* ---- 生成URL セクション ---- */}
        {!manualMode && buildResult && (
          <div className="space-y-2">

            {/* エリア照合結果 */}
            {condition?.area && (
              <AreaResolutionBadges result={buildResult} mappings={mappings} portal={portal} />
            )}

            {/* 警告 */}
            {buildResult.warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                ⚠ {w}
              </p>
            ))}

            {/* 要確認 */}
            {!buildResult.canGenerate && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-orange-800">要確認: URLを自動生成できませんでした</p>
                <p className="text-xs text-orange-700 mt-1">
                  エリア「{buildResult.unresolvedAreas.join('・')}」がマスターに未登録です。<br />
                  下の「手動でURLを入力」から検索URLを貼り付けて実行してください。<br />
                  管理者はSupabase の <code className="bg-orange-100 px-1 rounded">portal_area_mappings</code> テーブルにエントリを追加することで解決します。
                </p>
              </div>
            )}

            {/* 生成URL表示（折り畳み） */}
            {buildResult.canGenerate && (
              <>
                <button type="button" onClick={() => setShowUrls(v => !v)}
                  className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors">
                  {showUrls ? '▲ 生成URLを隠す' : '▼ 生成URLを確認する'}
                </button>

                {showUrls && (
                  <div className="space-y-2">
                    {buildResult.urls.map((u, i) => (
                      <div key={i}
                        className={`rounded-lg p-3 border flex items-start gap-2 cursor-pointer transition-colors ${
                          submitUrlIdx === i
                            ? 'bg-slate-100 border-slate-400'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-400'
                        }`}
                        onClick={() => setSubmitUrlIdx(i)}
                      >
                        {buildResult.urls.length > 1 && (
                          <input type="radio" readOnly checked={submitUrlIdx === i}
                            className="mt-0.5 flex-shrink-0 accent-slate-700" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 mb-0.5">{u.label}</p>
                          <a href={u.url} target="_blank" rel="noopener noreferrer"
                             className="text-xs text-blue-700 hover:underline break-all font-mono">
                            {u.url}
                          </a>
                        </div>
                        <button type="button"
                          onClick={ev => { ev.stopPropagation(); navigator.clipboard.writeText(u.url) }}
                          className="text-xs text-slate-400 hover:text-slate-700 border border-slate-200 rounded px-2 py-0.5 bg-white flex-shrink-0">
                          コピー
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* マスターロード中 */}
        {loadingMaps && (
          <p className="text-xs text-slate-400">エリアマスターを読み込み中...</p>
        )}

        {/* 手動URLフォールバック */}
        <div>
          <button type="button" onClick={() => setManualMode(v => !v)}
            className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors">
            {manualMode ? '▲ 自動生成に戻す' : '▼ 手動でURLを入力する（フォールバック）'}
          </button>

          {manualMode && (
            <div className="mt-2 space-y-1">
              <input
                type="url"
                value={manualUrl}
                onChange={e => setManualUrl(e.target.value)}
                placeholder={`https://suumo.jp/jj/bukken/ichiran/...`}
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

        <button type="submit" disabled={!canSubmit}
          className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-semibold hover:bg-slate-700 disabled:opacity-40 transition-colors">
          {submitting ? '起動中...' :
           isActive   ? '探索中（実行中）' :
           !condition && !manualMode ? '条件が未登録です' :
           manualMode && !manualUrl ? 'URLを入力してください' :
           !buildResult?.canGenerate && !manualMode ? 'URLを手動で入力してください' :
           '今すぐ探索'}
        </button>
      </form>

      {/* ジョブ状態 */}
      {job && (
        <div className="space-y-4">
          <JobStatusBanner job={job} elapsed={elapsed} />

          {job.status === 'completed' && job.result && (
            <div>
              {/* 0件の場合の診断ヒント */}
              {job.properties_found === 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 text-sm text-slate-600">
                  <p className="font-semibold mb-1">物件が0件でした。考えられる原因:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>検索条件が厳しすぎる（価格・面積・徒歩分の範囲を広げてみてください）</li>
                    <li>URL生成のエリアコードが誤っている可能性（「生成URLを確認する」でブラウザで開いて確認）</li>
                    <li>ポータルのHTML構造が変更された（クローラー側の問題、エンジニアへ連絡）</li>
                  </ul>
                  <p className="mt-2 text-xs text-slate-400">
                    ブラウザコンソールに詳細なURL生成ログが記録されています（F12 → Console）。
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
