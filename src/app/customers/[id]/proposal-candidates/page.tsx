'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

// ── 型定義 ──────────────────────────────────────────────────
interface Property {
  id: string
  name: string
  address: string | null
  price: number | null
  monthly_rent: number | null
  area_sqm: number | null
  floor_plan: string | null
  building_age: number | null
  walk_minutes: number | null
  url: string
  site: string
  transaction_type: string
  built_year: number | null
  built_month: number | null
  floor_number: number | null
}

interface PortalListing {
  portal: string
  source_url: string
}

interface MatchResult {
  verdict: string
  reins_number: string | null
  agent_company: string | null
}

interface Candidate {
  id: string
  customer_id: string
  property_id: string
  added_at: string
  added_by: string | null
  source: string | null
  reins_status: string
  displayReinsStatus: string
  proposal_status: string
  memo: string | null
  created_at: string
  updated_at: string
  properties: Property | null
  portalListings: PortalListing[]
  matchResult: MatchResult | null
}

// ── 定数 ───────────────────────────────────────────────────
const PROPOSAL_STATUS_OPTIONS = [
  { value: 'pending',     label: '未提案',      color: 'bg-slate-100 text-slate-600' },
  { value: 'preparing',   label: '提案準備中',  color: 'bg-blue-100 text-blue-700' },
  { value: 'proposed',    label: '提案済み',    color: 'bg-green-100 text-green-700' },
  { value: 'considering', label: '顧客検討中',  color: 'bg-amber-100 text-amber-700' },
  { value: 'rejected',    label: '見送り',      color: 'bg-red-50 text-red-600' },
  { value: 'contracted',  label: '成約',        color: 'bg-purple-100 text-purple-700' },
]

const REINS_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  unchecked:   { label: '未照合',         color: 'bg-slate-100 text-slate-500' },
  queued:      { label: '照合待ち',       color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: '照合中',         color: 'bg-amber-100 text-amber-700' },
  found:       { label: '掲載あり',       color: 'bg-green-100 text-green-700' },
  candidates:  { label: '候補あり・要確認', color: 'bg-yellow-100 text-yellow-700' },
  not_found:   { label: '掲載なし',       color: 'bg-red-50 text-red-600' },
  error:       { label: 'エラー',         color: 'bg-red-100 text-red-700' },
}

const PORTAL_LABELS: Record<string, string> = {
  suumo: 'SUUMO', athome: 'アットホーム', homes: "HOME'S"
}

// ── ユーティリティ ──────────────────────────────────────────
function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
}

function fmtPrice(prop: Property | null): string {
  if (!prop) return '—'
  const isRent = prop.transaction_type === 'rent'
  const val = isRent ? prop.monthly_rent : prop.price
  if (!val) return '価格未定'
  return `${val.toLocaleString()}万円${isRent ? '/月' : ''}`
}

function ProposalStatusBadge({ status }: { status: string }) {
  const opt = PROPOSAL_STATUS_OPTIONS.find(o => o.value === status)
  return (
    <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${opt?.color ?? 'bg-slate-100 text-slate-500'}`}>
      {opt?.label ?? status}
    </span>
  )
}

function ReinsStatusBadge({ status }: { status: string }) {
  const cfg = REINS_STATUS_CONFIG[status] ?? REINS_STATUS_CONFIG.unchecked
  return (
    <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

// ── 候補カード ───────────────────────────────────────────────
function CandidateCard({
  candidate,
  onStatusChange,
  onDelete,
  onMemoSave,
}: {
  candidate: Candidate
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
  onMemoSave: (id: string, memo: string) => void
}) {
  const [editingMemo, setEditingMemo] = useState(false)
  const [memo, setMemo] = useState(candidate.memo ?? '')
  const [savingMemo, setSavingMemo] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const prop = candidate.properties

  async function saveMemo() {
    setSavingMemo(true)
    await fetch(`/api/proposal-candidates/${candidate.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memo }),
    })
    setSavingMemo(false)
    setEditingMemo(false)
    onMemoSave(candidate.id, memo)
  }

  async function handleDelete() {
    if (!confirm('この候補を削除しますか？')) return
    setDeleting(true)
    await fetch(`/api/proposal-candidates/${candidate.id}`, { method: 'DELETE' })
    onDelete(candidate.id)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs text-slate-400">追加日: {fmtDate(candidate.added_at)}</span>
            <ReinsStatusBadge status={candidate.displayReinsStatus} />
            <ProposalStatusBadge status={candidate.proposal_status} />
          </div>
          <a
            href={prop?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sm text-blue-800 hover:underline leading-tight block"
          >
            {prop?.name ?? '(物件名不明)'}
          </a>
          {prop?.address && <p className="text-xs text-slate-500 mt-0.5">{prop.address}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-bold text-slate-800 text-sm">{fmtPrice(prop)}</div>
          {prop?.floor_plan && <div className="text-xs text-slate-500">{prop.floor_plan}</div>}
        </div>
      </div>

      {/* スペック */}
      <div className="flex gap-2 text-xs text-slate-500 flex-wrap">
        {prop?.area_sqm && <span className="bg-slate-50 px-1.5 py-0.5 rounded">{prop.area_sqm}㎡</span>}
        {prop?.walk_minutes && <span className="bg-slate-50 px-1.5 py-0.5 rounded">徒歩{prop.walk_minutes}分</span>}
        {prop?.building_age != null && <span className="bg-slate-50 px-1.5 py-0.5 rounded">築{prop.building_age}年</span>}
        {prop?.floor_number && <span className="bg-slate-50 px-1.5 py-0.5 rounded">{prop.floor_number}階</span>}
        <span className="text-slate-400 uppercase">{prop?.site}</span>
      </div>

      {/* ポータル掲載URL（複数ポータル） */}
      {candidate.portalListings.length > 0 && (
        <div className="space-y-1">
          {candidate.portalListings.map(l => (
            <a
              key={l.portal}
              href={l.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-blue-700 hover:underline"
            >
              <span className="font-medium text-slate-600 w-24 flex-shrink-0">{PORTAL_LABELS[l.portal] ?? l.portal}</span>
              <span className="truncate">{l.source_url}</span>
            </a>
          ))}
        </div>
      )}

      {/* レインズ照合結果詳細 */}
      {candidate.matchResult && (
        <div className="bg-slate-50 rounded-lg p-2 text-xs space-y-0.5">
          <p className="font-medium text-slate-600">レインズ照合結果</p>
          {candidate.matchResult.reins_number && (
            <p className="text-slate-700">物件番号: {candidate.matchResult.reins_number}</p>
          )}
          {candidate.matchResult.agent_company && (
            <p className="text-slate-700">業者名: {candidate.matchResult.agent_company}</p>
          )}
        </div>
      )}

      {/* 提案ステータス変更 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 flex-shrink-0">提案状況:</span>
        <select
          value={candidate.proposal_status}
          onChange={e => onStatusChange(candidate.id, e.target.value)}
          className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-700"
        >
          {PROPOSAL_STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* メモ */}
      <div>
        {editingMemo ? (
          <div className="space-y-1">
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded p-2 resize-none h-16"
              placeholder="メモを入力..."
            />
            <div className="flex gap-2">
              <button
                onClick={saveMemo}
                disabled={savingMemo}
                className="text-xs bg-slate-800 text-white px-3 py-1 rounded hover:bg-slate-700 disabled:opacity-40"
              >
                {savingMemo ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => { setMemo(candidate.memo ?? ''); setEditingMemo(false) }}
                className="text-xs text-slate-500 px-3 py-1 rounded border border-slate-200 hover:bg-slate-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditingMemo(true)}
            className="text-xs text-slate-400 hover:text-slate-700"
          >
            {memo ? `メモ: ${memo}` : 'メモを追加...'}
          </button>
        )}
      </div>

      {/* 削除ボタン */}
      <div className="flex justify-end">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40"
        >
          {deleting ? '削除中...' : '候補から削除'}
        </button>
      </div>
    </div>
  )
}

// ── メインページ ────────────────────────────────────────────
export default function ProposalCandidatesPage() {
  const params = useParams()
  const customerId = params.id as string

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/proposal-candidates?customer_id=${customerId}`).then(r => r.json()),
      fetch(`/api/customers/${customerId}`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([list, cust]) => {
      setCandidates(Array.isArray(list) ? list : [])
      if (cust?.name) setCustomerName(cust.name)
    }).finally(() => setLoading(false))
  }, [customerId])

  useEffect(() => { load() }, [load])

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/proposal-candidates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposal_status: status }),
    })
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, proposal_status: status } : c))
  }

  function handleDelete(id: string) {
    setCandidates(prev => prev.filter(c => c.id !== id))
  }

  function handleMemoSave(id: string, memo: string) {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, memo } : c))
  }

  const filtered = filterStatus === 'all'
    ? candidates
    : candidates.filter(c => c.proposal_status === filterStatus)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={`/customers/${customerId}`} className="text-xs text-slate-500 hover:underline mb-1 block">
            ← {customerName || '顧客詳細'} に戻る
          </Link>
          <h1 className="text-xl font-bold text-slate-800">提案候補リスト</h1>
          {customerName && <p className="text-sm text-slate-500">{customerName}</p>}
        </div>
        <div className="flex gap-2">
          <Link
            href="/manual-crawl"
            className="text-xs bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-700"
          >
            手動探索へ
          </Link>
          <button
            onClick={load}
            className="text-xs border border-slate-300 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50"
          >
            更新
          </button>
        </div>
      </div>

      {/* フィルター */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilterStatus('all')}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filterStatus === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'}`}
        >
          すべて ({candidates.length})
        </button>
        {PROPOSAL_STATUS_OPTIONS.map(opt => {
          const cnt = candidates.filter(c => c.proposal_status === opt.value).length
          if (cnt === 0) return null
          return (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filterStatus === opt.value ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'}`}
            >
              {opt.label} ({cnt})
            </button>
          )
        })}
      </div>

      {/* 候補リスト */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="mb-2">候補物件がありません</p>
          <Link href="/manual-crawl" className="text-sm text-blue-600 hover:underline">
            手動探索で物件を探す →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(c => (
            <CandidateCard
              key={c.id}
              candidate={c}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onMemoSave={handleMemoSave}
            />
          ))}
        </div>
      )}
    </div>
  )
}
