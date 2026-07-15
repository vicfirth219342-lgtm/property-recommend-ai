'use client'
import { useState, useCallback, useEffect } from 'react'

interface ScoreDetail {
  item: string
  earned: number
  max: number
  matched: boolean
  reason?: string
}

interface ReinsCheck {
  id: string
  source_type: string
  portal_url?: string
  property_name?: string
  address?: string
  price_man?: number
  area_sqm?: number
  floor_number?: number
  floor_plan?: string
  built_year?: number
  built_month?: number
  station?: string
  walk_minutes?: number
  search_keywords?: string[]
  match_score: number | null
  match_status: 'pending' | 'confirmed' | 'review' | 'not_found'
  matched_items: string[]
  unmatched_items: string[]
  score_detail: ScoreDetail[] | null
  reins_number?: string
  agent_company?: string
  checked_at: string | null
  created_at: string
}

interface SessionPage {
  id: string
  page_url?: string
  page_order: number
  imported_at: string
}

interface ImportSession {
  id: string
  status: string
  page_count: number
  property_count: number
  created_at: string
  pages: SessionPage[]
}

interface MatchResult {
  ok: boolean
  session_id: string
  pages_processed: number
  extracted_count: number
  with_name_count: number
  after_dedup: number
  over_limit: boolean
  matched_portals: number
  total_portals: number
  updated_count: number
  failed_count: number
  errors: string[]
  reins_properties: {
    reins_number?: string
    property_name?: string
    address?: string
    price_man?: number
    area_sqm?: number
    floor_plan?: string
    floor_number?: number
    agent_company?: string
    station?: string
  }[]
}

interface ExtractedProperty {
  property_name?: string
  address?: string
  price_man?: number
  area_sqm?: number
  floor_number?: number
  floor_plan?: string
  management_fee?: number
  repair_fund?: number
  source_url?: string
  search_keywords?: string[]
}

const STATUS_CONFIG = {
  confirmed: { label: 'レインズ掲載あり',   color: 'bg-green-100 text-green-700',  bar: 'bg-green-500',  icon: '✓' },
  review:    { label: '要確認',             color: 'bg-yellow-100 text-yellow-700', bar: 'bg-yellow-500', icon: '△' },
  not_found: { label: '掲載なし可能性高い', color: 'bg-red-100 text-red-700',      bar: 'bg-red-500',    icon: '✗' },
  pending:   { label: '未照合',             color: 'bg-slate-100 text-slate-500',  bar: 'bg-slate-300',  icon: '—' },
}

type InputTab = 'email' | 'csv' | 'url' | 'pdf'

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split('\n')
  const parse = (line: string) => line.split(',').map(c => c.replace(/^["']|["']$/g, '').trim())
  return { headers: parse(lines[0] ?? ''), rows: lines.slice(1).map(parse) }
}

// portal_url が同一の物件だけを重複扱い（nullは重複なし）
function deduplicateChecks(checks: ReinsCheck[]): { best: ReinsCheck; duplicates: ReinsCheck[] }[] {
  const groups = new Map<string, ReinsCheck[]>()
  for (const c of checks) {
    // portal_url が明確なURLのみをキーに使う（null/空は重複なし扱い）
    const key = c.portal_url && c.portal_url.startsWith('http') ? c.portal_url : c.id
    const existing = groups.get(key) ?? []
    groups.set(key, [...existing, c])
  }
  return Array.from(groups.values()).map(group => {
    const sorted = [...group].sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1))
    return { best: sorted[0], duplicates: sorted.slice(1) }
  })
}

export default function ReinsCheckPage() {
  const [checks, setChecks] = useState<ReinsCheck[]>([])
  const [loadingChecks, setLoadingChecks] = useState(false)
  const [session, setSession] = useState<ImportSession | null>(null)
  const [matching, setMatching] = useState(false)
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const [showReinsProps, setShowReinsProps] = useState(false)
  const [clearing, setClearing] = useState(false)

  // 取り込みパネル
  const [tab, setTab] = useState<InputTab>('email')
  const [inputText, setInputText] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedProperty[]>([])
  const [extractError, setExtractError] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  // 手動照合
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null)
  const [reinsInput, setReinsInput] = useState('')
  const [accumulatedText, setAccumulatedText] = useState('')
  const [accumulatedPages, setAccumulatedPages] = useState(0)
  const [reinsUrlDetected, setReinsUrlDetected] = useState<string | null>(null)
  const [manualMatching, setManualMatching] = useState(false)
  const [matchError, setMatchError] = useState('')
  const [lastExtracted, setLastExtracted] = useState<ExtractedProperty | null>(null)

  // スコア展開
  const [expandedScoreId, setExpandedScoreId] = useState<string | null>(null)

  // 一括削除
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  function toggleSelect(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleSelectAll() {
    const allIds = grouped.map(g => g.best.id)
    setSelectedIds(prev => prev.size === allIds.length ? new Set() : new Set(allIds))
  }

  async function deleteSelected(ids: string[]) {
    if (ids.length === 0) return
    if (!confirm(`${ids.length}件を削除しますか？`)) return
    setBulkDeleting(true)
    await Promise.all(ids.map(id => fetch(`/api/reins-check/${id}`, { method: 'DELETE' })))
    setChecks(prev => prev.filter(c => !ids.includes(c.id)))
    setSelectedIds(new Set())
    setBulkDeleting(false)
  }

  const loadChecks = useCallback(async () => {
    setLoadingChecks(true)
    const res = await fetch('/api/reins-check')
    if (res.ok) {
      const data = await res.json()
      console.log(`[debug] 照合リスト取得件数: ${data.length}件`)
      setChecks(data)
    }
    setLoadingChecks(false)
  }, [])

  const loadSession = useCallback(async () => {
    const res = await fetch('/api/reins/sessions/current')
    if (res.ok) {
      const data = await res.json()
      setSession(data.session ?? null)
    }
  }, [])

  useEffect(() => { loadChecks(); loadSession() }, [])

  // ─── セッション照合 ─────────────────────────────────────────
  async function runMatch() {
    if (!session) return
    setMatching(true); setMatchResult(null)
    const res = await fetch(`/api/reins/sessions/${session.id}/match`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setMatchResult(data)
      setSession(null)
      await loadChecks()
    } else {
      alert(data.error ?? '照合エラー')
    }
    setMatching(false)
  }

  async function clearSession() {
    if (!session) return
    if (!confirm(`${session.page_count}ページ分のデータを削除しますか？`)) return
    setClearing(true)
    await fetch(`/api/reins/sessions/${session.id}`, { method: 'DELETE' })
    setSession(null); setClearing(false)
  }

  // ─── 物件取り込み ───────────────────────────────────────────
  async function extractFromInput() {
    setExtracting(true); setExtractError(''); setExtracted([])
    try {
      if (tab === 'csv') {
        const { headers, rows } = parseCsv(inputText)
        const res = await fetch('/api/reins-check', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'csv', headers, rows }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setExtracted(data)
      } else if (tab === 'url') {
        const res = await fetch('/api/reins-check/extract', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'url', content: urlInput }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setExtracted([data])
      } else {
        const res = await fetch('/api/reins-check', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'email', content: inputText }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setExtracted(data)
      }
    } catch (e) { setExtractError(String(e)) }
    finally { setExtracting(false) }
  }

  async function saveExtracted() {
    setSaving(true)
    const res = await fetch('/api/reins-check', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_type: tab, raw_input: tab === 'url' ? urlInput : inputText, properties: extracted }),
    })
    if (res.ok) { setExtracted([]); setInputText(''); setUrlInput(''); await loadChecks() }
    setSaving(false)
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(text); setTimeout(() => setCopied(null), 1500)
  }

  async function deleteCheck(id: string) {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/reins-check/${id}`, { method: 'DELETE' })
    setChecks(prev => prev.filter(c => c.id !== id))
  }

  // ─── 手動照合 ─────────────────────────────────────────────
  function handleReinsInputChange(value: string) {
    setReinsInput(value)
    const trimmed = value.trim()
    setReinsUrlDetected(/^https?:\/\/[^\s]+/.test(trimmed) ? trimmed : null)
  }

  function appendPage() {
    if (!reinsInput.trim()) return
    setAccumulatedText(prev => prev + (prev ? '\n\n---\n\n' : '') + reinsInput.trim())
    setAccumulatedPages(prev => prev + 1)
    setReinsInput(''); setReinsUrlDetected(null)
  }

  function resetManual() {
    setAccumulatedText(''); setAccumulatedPages(0)
    setReinsInput(''); setReinsUrlDetected(null)
    setMatchError(''); setLastExtracted(null)
  }

  async function matchReins(id: string) {
    const textToMatch = accumulatedText || reinsInput.trim()
    if (!textToMatch) return
    setManualMatching(true); setMatchError(''); setLastExtracted(null)
    const res = await fetch(`/api/reins-check/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reins_input: textToMatch }),
    })
    const data = await res.json()
    if (res.ok) {
      if (data._extracted) setLastExtracted(data._extracted)
      resetManual(); setActiveCheckId(null); await loadChecks()
    } else { setMatchError(data.error ?? `エラー HTTP ${res.status}`) }
    setManualMatching(false)
  }

  const tabs: { key: InputTab; label: string }[] = [
    { key: 'email', label: 'メール本文' },
    { key: 'csv',   label: 'CSV' },
    { key: 'url',   label: '物件URL' },
    { key: 'pdf',   label: 'PDF/画像テキスト' },
  ]

  const pendingCount   = checks.filter(c => c.match_status === 'pending').length
  const confirmedCount = checks.filter(c => c.match_status === 'confirmed').length
  const grouped        = deduplicateChecks(checks)
  console.log(`[debug] 画面表示件数: ${grouped.length}件（DB取得: ${checks.length}件）`)

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* ─── ヘッダー ─── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">レインズ掲載確認</h1>
        <p className="text-sm text-slate-500 mt-1">
          Chrome拡張で複数ページを取り込み → まとめて一括照合
        </p>
      </div>

      {/* ─── レインズ取り込みセッション（メインパネル）─── */}
      <div className={`rounded-xl p-5 mb-6 border ${
        session ? 'bg-blue-900 border-blue-700 text-white' : 'bg-slate-800 border-slate-700 text-white'
      }`}>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h2 className="font-semibold text-base mb-1">
              {session ? 'レインズ取り込みセッション（進行中）' : 'Chrome拡張で一括照合（推奨）'}
            </h2>
            {session ? (
              <ol className="text-sm text-blue-200 space-y-1 list-decimal list-inside">
                <li>レインズで次のページを開いてChrome拡張の「このページを追加」を押す</li>
                <li>必要ページ分繰り返す</li>
                <li>全ページ追加後、下の「全ページまとめて照合」ボタンを押す</li>
              </ol>
            ) : (
              <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
                <li>レインズにログインして検索結果ページを開く</li>
                <li>Chrome拡張の「このページを追加」を押す（複数ページ繰り返し可）</li>
                <li>全ページ追加後、このページの「全ページまとめて照合」ボタンを押す</li>
              </ol>
            )}
          </div>

          {/* セッション統計 */}
          {session && (
            <div className="text-right shrink-0">
              <div className="text-xs text-blue-300 mb-0.5">取り込み済み</div>
              <div className="text-3xl font-bold text-blue-100">{session.page_count}<span className="text-lg ml-1">ページ</span></div>
              <div className="text-xs text-blue-400 mt-0.5">
                {new Date(session.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 開始
              </div>
            </div>
          )}

          {!session && (
            <div className="text-right shrink-0 text-xs text-slate-400">
              <div>セッションなし</div>
              <div className="mt-1">
                <span className="text-green-400 font-bold">{confirmedCount}</span>件 掲載あり
                &ensp;<span className="text-slate-400">{pendingCount}</span>件 未照合
              </div>
            </div>
          )}
        </div>

        {/* 取り込みページ一覧 */}
        {session && session.pages && session.pages.length > 0 && (
          <div className="mb-3 bg-blue-800 rounded-lg p-3 space-y-1">
            {session.pages.map(p => (
              <div key={p.id} className="text-xs text-blue-200 flex items-center gap-2">
                <span className="bg-blue-700 text-blue-100 px-1.5 py-0.5 rounded font-mono">{p.page_order}P</span>
                <span className="truncate text-blue-300">{p.page_url ? new URL(p.page_url).pathname.slice(0, 50) : '（URL不明）'}</span>
                <span className="shrink-0 text-blue-400">
                  {new Date(p.imported_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={runMatch}
            disabled={!session || matching}
            className="bg-white text-slate-800 font-bold px-4 py-2 rounded-lg text-sm hover:bg-blue-50 disabled:opacity-40 transition-colors">
            {matching ? '照合中...' : `全ページまとめて照合（${session?.page_count ?? 0}ページ）`}
          </button>
          {session && (
            <button
              onClick={clearSession}
              disabled={clearing}
              className="border border-blue-600 text-blue-300 px-3 py-2 rounded-lg text-xs hover:bg-blue-800 transition-colors">
              {clearing ? '...' : 'セッションをクリア'}
            </button>
          )}
          <button
            onClick={() => { loadChecks(); loadSession() }}
            disabled={loadingChecks}
            className="border border-slate-600 text-slate-300 px-3 py-2 rounded-lg text-xs hover:bg-slate-700 transition-colors ml-auto">
            {loadingChecks ? '...' : '更新'}
          </button>
        </div>

        {/* 照合結果サマリー */}
        {matchResult && (
          <div className="mt-4 bg-green-900 border border-green-700 rounded-lg p-3">
            <div className="text-green-200 font-semibold text-sm mb-2">照合完了</div>
            {matchResult.over_limit && (
              <div className="text-yellow-300 text-xs mb-2 bg-yellow-900/50 px-2 py-1 rounded">
                ⚠ 取り込み件数が多いため、検索条件を絞ることを推奨します（300件上限で切り捨て）
              </div>
            )}
            {/* デバッグ統計 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs text-green-300 mb-2">
              <div className="bg-green-950/40 rounded px-2 py-1">ページ処理：<span className="font-bold text-green-100">{matchResult.pages_processed}</span></div>
              <div className="bg-green-950/40 rounded px-2 py-1">抽出物件：<span className="font-bold text-green-100">{matchResult.extracted_count}</span></div>
              <div className="bg-green-950/40 rounded px-2 py-1">物件名取得：<span className="font-bold text-green-100">{matchResult.with_name_count}</span></div>
              <div className="bg-green-950/40 rounded px-2 py-1">重複除外後：<span className="font-bold text-green-100">{matchResult.after_dedup}</span></div>
              <div className="bg-green-950/40 rounded px-2 py-1">照合対象：<span className="font-bold text-green-100">{matchResult.total_portals}</span></div>
              <div className="bg-green-950/40 rounded px-2 py-1">
                DB保存：<span className="font-bold text-green-100">{matchResult.updated_count}</span>
                {matchResult.failed_count > 0 && <span className="text-red-300 ml-1">失敗{matchResult.failed_count}</span>}
              </div>
            </div>
            {/* DB保存エラー表示 */}
            {matchResult.errors && matchResult.errors.length > 0 && (
              <div className="mb-2 bg-red-900/60 border border-red-600 rounded px-2 py-2 text-xs text-red-200">
                <div className="font-semibold mb-1">⚠ DB保存エラー（{matchResult.errors.length}件）</div>
                {matchResult.errors.slice(0, 5).map((e, i) => (
                  <div key={i} className="font-mono text-red-300 text-xs truncate">{e}</div>
                ))}
                {matchResult.errors.length > 5 && (
                  <div className="text-red-400 text-xs mt-1">…他{matchResult.errors.length - 5}件（ブラウザのコンソールを確認）</div>
                )}
              </div>
            )}
            <button onClick={() => setShowReinsProps(v => !v)}
              className="text-xs text-green-400 underline mt-1 hover:text-green-200">
              {showReinsProps ? '▲ 閉じる' : `▼ 取り込んだレインズ物件（${matchResult.after_dedup}件）`}
            </button>
            {showReinsProps && (
              <div className="mt-2 space-y-1 max-h-56 overflow-y-auto">
                {matchResult.reins_properties.map((p, i) => (
                  <div key={i} className="text-xs text-green-300 bg-green-950/50 rounded px-2 py-1.5">
                    <div className="flex gap-2 items-baseline">
                      {p.reins_number && <span className="font-mono text-green-400 shrink-0 text-xs">{p.reins_number}</span>}
                      <span className="truncate font-medium">{p.property_name ?? '（物件名なし）'}</span>
                      {p.price_man && <span className="shrink-0 text-green-400">{p.price_man.toLocaleString()}万</span>}
                    </div>
                    <div className="flex gap-2 mt-0.5 text-green-500">
                      {p.address && <span className="truncate">{p.address}</span>}
                      {p.area_sqm && <span className="shrink-0">{p.area_sqm}㎡</span>}
                      {p.floor_plan && <span className="shrink-0">{p.floor_plan}</span>}
                      {p.floor_number && <span className="shrink-0">{p.floor_number}階</span>}
                    </div>
                    {p.agent_company && <div className="text-green-600 mt-0.5">{p.agent_company}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── 候補物件 取り込みパネル ─── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-slate-700 mb-3">候補物件を追加（手動）</h2>
        <div className="flex gap-1 mb-4 border-b border-slate-200">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm rounded-t transition-colors ${tab === t.key ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'url' ? (
          <input type="url" placeholder="https://suumo.jp/..." value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3" />
        ) : (
          <textarea value={inputText} onChange={e => setInputText(e.target.value)} rows={5}
            placeholder={tab === 'csv'
              ? '物件名,住所,価格,面積,築年月,間取り,駅,徒歩,URL\n白金タワー,東京都港区白金1-17-1,...'
              : '物件情報のテキストを貼り付けてください'}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono resize-none mb-3" />
        )}

        <div className="flex gap-2 items-center">
          <button onClick={extractFromInput}
            disabled={extracting || (tab === 'url' ? !urlInput.trim() : !inputText.trim())}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-40 transition-colors">
            {extracting ? '解析中...' : '物件情報を抽出'}
          </button>
          {extractError && <p className="text-red-500 text-sm">{extractError}</p>}
        </div>

        {extracted.length > 0 && (
          <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
              抽出結果（{extracted.length}件）— 確認してDBに保存
            </div>
            {extracted.map((p, i) => (
              <div key={i} className="px-4 py-3 border-t border-slate-100 text-sm">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  {p.property_name  && <div><span className="text-slate-400">物件名 </span>{p.property_name}</div>}
                  {p.address        && <div><span className="text-slate-400">住所 </span>{p.address}</div>}
                  {p.price_man      && <div><span className="text-slate-400">価格 </span>{p.price_man.toLocaleString()}万円</div>}
                  {p.area_sqm       && <div><span className="text-slate-400">面積 </span>{p.area_sqm}㎡</div>}
                  {p.floor_plan     && <div><span className="text-slate-400">間取り </span>{p.floor_plan}</div>}
                  {p.floor_number   && <div><span className="text-slate-400">階数 </span>{p.floor_number}階</div>}
                </div>
              </div>
            ))}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
              <button onClick={saveExtracted} disabled={saving}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors">
                {saving ? '保存中...' : `${extracted.length}件をDBに保存`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── 照合リスト ─── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h2 className="font-semibold text-slate-700">
            照合リスト
            <span className="ml-2 text-slate-400 font-normal text-sm">（{grouped.length}件表示 / DB {checks.length}件）</span>
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-2 text-xs">
              <span className="text-green-600 font-medium">{confirmedCount}件 掲載あり</span>
              <span className="text-slate-400">{pendingCount}件 未照合</span>
            </div>
            {selectedIds.size > 0 && (
              <button
                onClick={() => deleteSelected([...selectedIds])}
                disabled={bulkDeleting}
                className="text-xs border border-red-300 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {bulkDeleting ? '削除中...' : `選択した${selectedIds.size}件を削除`}
              </button>
            )}
          </div>
        </div>

        {/* 全選択バー */}
        {grouped.length > 0 && (
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
            <input
              type="checkbox"
              checked={selectedIds.size === grouped.length && grouped.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 accent-slate-700"
            />
            <span className="text-xs text-slate-500">
              {selectedIds.size > 0 ? `${selectedIds.size}件選択中` : '全選択'}
            </span>
          </div>
        )}

        {grouped.length === 0 && !loadingChecks && (
          <div className="text-slate-400 text-sm py-8 text-center">
            <div className="mb-2">候補物件がありません</div>
            <div className="text-xs">
              上の「候補物件を追加」フォームから手動追加、<br />
              または顧客詳細ページの「照合リストに追加」ボタンを使ってください
            </div>
          </div>
        )}

        <div className="space-y-3">
          {grouped.map(({ best: c, duplicates }) => {
            const st = STATUS_CONFIG[c.match_status]
            const isActive = activeCheckId === c.id
            const scoreExpanded = expandedScoreId === c.id

            return (
              <div key={c.id} className={`border rounded-lg overflow-hidden ${selectedIds.has(c.id) ? 'border-slate-400 ring-1 ring-slate-300' : 'border-slate-200'}`}>
                <div className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    {/* チェックボックス */}
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      className="w-4 h-4 mt-0.5 accent-slate-700 flex-shrink-0"
                    />
                  <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">

                      {/* 物件名 + ステータス */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs text-slate-400 uppercase tracking-wide">{c.source_type}</span>
                        <span className="font-medium text-slate-800">{c.property_name ?? '（物件名なし）'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                          {st.icon} {st.label}
                        </span>
                        {c.match_score !== null && (
                          <span className="text-xs text-slate-400 font-mono">{c.match_score}点</span>
                        )}
                        {duplicates.length > 0 && (
                          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            重複{duplicates.length}件
                          </span>
                        )}
                      </div>

                      {/* ポータル物件情報 */}
                      <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                        {c.address      && <span>{c.address}</span>}
                        {c.price_man    && <span>{c.price_man.toLocaleString()}万円</span>}
                        {c.area_sqm     && <span>{c.area_sqm}㎡</span>}
                        {c.floor_plan   && <span>{c.floor_plan}</span>}
                        {c.floor_number && <span>{c.floor_number}階</span>}
                        {c.station      && <span>{c.station} 徒歩{c.walk_minutes}分</span>}
                        {c.built_year   && <span>{c.built_year}年{c.built_month ? `${c.built_month}月` : ''}築</span>}
                        {c.portal_url   && (
                          <a href={c.portal_url} target="_blank" rel="noopener noreferrer"
                            className="text-blue-500 hover:underline">
                            ポータルURL
                          </a>
                        )}
                      </div>

                      {/* スコアバー */}
                      {c.match_score !== null && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1.5 bg-slate-100 rounded-full flex-1 max-w-[160px]">
                            <div className={`h-1.5 rounded-full ${st.bar}`} style={{ width: `${Math.min(c.match_score, 100)}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{c.match_score}/100点</span>
                        </div>
                      )}

                      {/* レインズ照合結果 */}
                      {(c.reins_number || c.agent_company) && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                          <div className="flex flex-wrap items-start gap-3">
                            {c.reins_number && (
                              <div>
                                <div className="text-xs text-blue-500 font-medium mb-0.5">レインズ物件番号</div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-sm text-slate-800 tracking-widest">{c.reins_number}</span>
                                  <button
                                    onClick={() => copyText(c.reins_number!)}
                                    className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                                      copied === c.reins_number
                                        ? 'bg-green-100 border-green-300 text-green-700'
                                        : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50'
                                    }`}>
                                    {copied === c.reins_number ? '✓ コピー済' : 'コピー'}
                                  </button>
                                </div>
                              </div>
                            )}
                            {c.agent_company && (
                              <div>
                                <div className="text-xs text-blue-500 font-medium mb-0.5">元付会社</div>
                                <div className="text-sm text-slate-700">{c.agent_company}</div>
                              </div>
                            )}
                          </div>
                          {c.reins_number && (
                            <p className="mt-2 text-xs text-blue-600">
                              レインズで「物件番号」検索から上記番号で検索してください
                            </p>
                          )}
                        </div>
                      )}

                      {/* スコア内訳 */}
                      {c.score_detail && c.score_detail.length > 0 && (
                        <div className="mt-2">
                          <button onClick={() => setExpandedScoreId(scoreExpanded ? null : c.id)}
                            className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 mb-1">
                            {scoreExpanded ? '▲ スコア内訳を閉じる' : '▼ スコア内訳を見る'}
                          </button>
                          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                            {c.score_detail.map(d => (
                              <div key={d.item}
                                className={`text-center text-xs px-1 py-1 rounded ${
                                  d.matched ? 'bg-green-50 text-green-700'
                                  : d.reason?.includes('データなし') ? 'bg-slate-50 text-slate-400'
                                  : 'bg-red-50 text-red-600'
                                }`}>
                                <div>{d.matched ? '✓' : '✗'} {d.item}</div>
                                <div className="font-mono opacity-70">+{d.earned}/{d.max}</div>
                              </div>
                            ))}
                          </div>
                          {scoreExpanded && (
                            <div className="mt-2 space-y-1">
                              {c.score_detail.map(d => (
                                <div key={d.item} className={`text-xs px-3 py-1.5 rounded flex items-start gap-2 ${
                                  d.matched ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                                }`}>
                                  <span className="font-medium shrink-0 w-16">{d.item}</span>
                                  <span className="text-xs opacity-80">{d.reason ?? (d.matched ? '一致' : '不一致')}</span>
                                  <span className="ml-auto font-mono shrink-0">+{d.earned}/{d.max}pt</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 右側ボタン */}
                    <div className="flex flex-col gap-1 shrink-0">
                      {c.search_keywords && (c.search_keywords as string[]).length > 0 && (
                        (c.search_keywords as string[]).slice(0, 2).map((k: string) => (
                          <button key={k} onClick={() => copyText(k)}
                            className={`text-xs px-2 py-1 rounded border transition-colors ${
                              copied === k ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}>
                            {copied === k ? '✓' : '📋'} {k.length > 16 ? k.slice(0, 16) + '…' : k}
                          </button>
                        ))
                      )}
                      <button onClick={() => deleteCheck(c.id)}
                        className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded">
                        削除
                      </button>
                    </div>
                  </div>

                  {/* 手動照合（折りたたみ） */}
                  <div className="mt-2">
                    <button
                      onClick={() => { if (isActive) resetManual(); setActiveCheckId(isActive ? null : c.id) }}
                      className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
                      {isActive ? '▲ 閉じる' : '▼ その他の方法（手動照合）'}
                    </button>
                  </div>
                  </div>{/* flex-1 wrapper close */}
                </div>{/* flex items-start gap-2 close */}
                </div>

                {/* 手動照合パネル */}
                {isActive && (
                  <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs text-slate-400 mb-3">
                      Chrome拡張が使えない場合：レインズのテキストをコピーして貼り付けてください。
                    </p>
                    {accumulatedPages > 0 && (
                      <div className="mb-2 flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                        <span className="text-green-700 text-xs font-medium">✓ {accumulatedPages}ページ分を蓄積済み</span>
                        <button onClick={resetManual} className="ml-auto text-xs text-red-400 hover:text-red-600">リセット</button>
                      </div>
                    )}
                    <textarea value={reinsInput} onChange={e => handleReinsInputChange(e.target.value)} rows={5}
                      placeholder={accumulatedPages > 0 ? `${accumulatedPages + 1}ページ目を貼り付け...` : 'レインズテキストを貼り付け...'}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono resize-none mb-2" />
                    {reinsUrlDetected && (
                      <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                        URLが検出されました。レインズはログイン必須のため直接取得できません。
                        ページを開いて全選択→コピーしてください。
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap items-center">
                      <button onClick={appendPage} disabled={!reinsInput.trim() || !!reinsUrlDetected}
                        className="bg-slate-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-slate-700 disabled:opacity-40">
                        追加{accumulatedPages > 0 ? ` (${accumulatedPages + 1}P目)` : ''}
                      </button>
                      <button onClick={() => matchReins(c.id)}
                        disabled={manualMatching || (!accumulatedText && !reinsInput.trim()) || !!reinsUrlDetected}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-40">
                        {manualMatching ? '照合中...' : `照合する${accumulatedPages > 0 ? `（${accumulatedPages}P）` : ''}`}
                      </button>
                      {matchError && <span className="text-red-500 text-xs">{matchError}</span>}
                    </div>
                    {lastExtracted && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                        抽出: {lastExtracted.property_name ?? '未抽出'} / {lastExtracted.price_man ?? '未抽出'}万 / {lastExtracted.area_sqm ?? '未抽出'}㎡ / {lastExtracted.floor_plan ?? '未抽出'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
