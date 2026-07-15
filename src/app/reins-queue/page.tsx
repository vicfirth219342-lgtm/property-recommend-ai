'use client'
import { useEffect, useState, useCallback } from 'react'

// ── 型定義 ───────────────────────────────────────────────────
interface Property {
  id: string; name: string; address: string | null; current_price: number | null
  monthly_rent: number | null; area_sqm: number | null; built_year: number | null
  built_month: number | null; walk_minutes: number | null; nearest_station: string | null
  floor_number: number | null; transaction_type: string; site: string; url: string
}
interface Customer { id: string; name: string; customer_no: string }
interface ScoreItem { match: string; points: number; portal?: unknown; reins?: unknown }
interface Gap { best_score: number; second_score: number; score_gap: number; downgraded: boolean }
interface ScoreDetail {
  version: number; total: number; verdict: string; guards: string[]
  items: Record<string, ScoreItem>; gap?: Gap
}
interface ReinsProperty {
  id: string; reins_number: string | null; property_name: string | null; address: string | null
  price_man: number | null; area_sqm: number | null; built_year: number | null
  built_month: number | null; floor_number: number | null; station: string | null
  walk_minutes: number | null; agent_company: string | null; floor_plan: string | null
}
interface Candidate {
  id: string; queue_id: string; reins_property_id: string | null; score: number
  score_detail: ScoreDetail; matched_fields: string[]; unmatched_fields: string[]
  rank: number; reins: ReinsProperty | null
}
interface MatchResult {
  id: string; queue_id: string; candidate_id: string | null; verdict: string
  method: string; decided_by: string | null; reins_number: string | null
  agent_company: string | null; note: string | null; decided_at: string
}
interface QueueItem {
  id: string; status: string; not_found_reason: string | null; priority: number; requested_by: string
  created_at: string; updated_at: string; property: Property | null
  customer: Customer | null; candidates: Candidate[]; latestResult: MatchResult | null
  resultHistory: MatchResult[]; bestScore: number | null; gap: Gap | null
  guardCount: number
}

type TabKey = 'all' | 'queued' | 'matched' | 'needs_review' | 'not_found'

const TAB_DEFS: { key: TabKey; label: string; statusFilter: string }[] = [
  { key: 'all',          label: '全件',       statusFilter: 'all' },
  { key: 'queued',       label: '照合待ち',    statusFilter: 'queued' },
  { key: 'matched',      label: '自動一致',    statusFilter: 'matched' },
  { key: 'needs_review', label: '要確認',      statusFilter: 'needs_review' },
  { key: 'not_found',    label: '一致なし',    statusFilter: 'not_found' },
]

const SITE_LABELS: Record<string, string> = { suumo: 'SUUMO', athome: 'アットホーム', homes: "HOME'S" }
const VERDICT_LABEL: Record<string, string> = {
  confirmed: '確定', rejected: '除外', not_found: '一致なし', inconclusive: '要確認',
}
const STATUS_COLORS: Record<string, string> = {
  queued: 'bg-slate-100 text-slate-600', in_progress: 'bg-blue-100 text-blue-700',
  matched: 'bg-green-100 text-green-700', needs_review: 'bg-amber-100 text-amber-700',
  not_found: 'bg-red-50 text-red-600',
}
// not_found 原因の日本語表示
const NOT_FOUND_REASON_LABEL: Record<string, string> = {
  no_candidates:          'レインズ候補なし',
  below_threshold:        '類似候補あり・基準未達',
  all_candidates_blocked: '全候補ガード対象',
  fetch_error:            'データ取得エラー',
  manually_not_found:     '手動で一致なし判定',
  unknown:                '原因不明',
}
// ガード理由の日本語表示
const GUARD_LABEL: Record<string, string> = {
  address_prefecture_mismatch: '都道府県が一致していません',
  address_city_mismatch:       '市区町村が一致していません',
  address_town_mismatch:       '町名が一致していません',
  address_chome_mismatch:      '丁目が一致していません',
  area_mismatch:               '面積差が許容範囲を超えています',
  built_year_mismatch:         '築年差が許容範囲を超えています',
  floor_mismatch:              '所在階が一致していません',
  room_mismatch:               '部屋番号が一致していません',
  price_mismatch:              '価格差が許容範囲を超えています',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
function fmtPrice(p: number | null) { return p ? `${p.toLocaleString()}万円` : '—' }
function fmtRent(r: number | null) { return r ? `${(r/10000).toFixed(1)}万円/月` : '—' }
function builtLabel(y: number|null, m: number|null) { return y ? (m ? `${y}年${m}月` : `${y}年`) : '不明' }

// ── メインページ ────────────────────────────────────────────
export default function ReinsQueuePage() {
  const [tab, setTab] = useState<TabKey>('all')
  const [items, setItems] = useState<QueueItem[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const qs = tab === 'all' ? '' : `?status=${tab}`
    fetch(`/api/reins-queue${qs}`)
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setCounts(d.counts ?? {}) })
      .finally(() => setLoading(false))
  }, [tab])

  useEffect(() => { load(); setSelectedIds(new Set()) }, [load])

  async function deleteSelected(ids: string[]) {
    if (ids.length === 0) return
    if (!confirm(`${ids.length}件を削除しますか？`)) return
    setDeleting(true)
    await fetch('/api/reins-queue', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    setDeleting(false)
    setSelectedIds(new Set())
    load()
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map(i => i.id)))
    }
  }

  async function runAutoMatch() {
    setRunning(true)
    const res = await fetch('/api/reins-match/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    const json = await res.json()
    alert(`照合完了: ${json.processed}件処理（AUTO_MATCH ${json.auto_match}件, 要確認 ${json.needs_review}件, 一致なし ${json.not_found}件）`)
    setRunning(false)
    load()
  }

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-slate-800">レインズ照合キュー</h1>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={() => deleteSelected([...selectedIds])}
                disabled={deleting}
                className="text-sm border border-red-300 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {deleting ? '削除中...' : `選択した${selectedIds.size}件を削除`}
              </button>
            )}
            <button
              onClick={runAutoMatch}
              disabled={running}
              className="text-sm bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {running ? '照合中...' : '自動照合を実行'}
            </button>
          </div>
        </div>

        {/* タブ */}
        <div className="flex gap-1 mb-5 border-b border-slate-200">
          {TAB_DEFS.map(t => {
            const c = t.key === 'all' ? totalCount : (counts[t.statusFilter] ?? 0)
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t.key ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  tab === t.key ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
                }`}>{c}</span>
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="text-center text-slate-400 py-20">読み込み中...</div>
        ) : items.length === 0 ? (
          <div className="text-center text-slate-400 py-20 bg-white rounded-xl border border-slate-200">
            照合キューにデータがありません
          </div>
        ) : (
          <>
            {/* 全選択バー */}
            <div className="flex items-center gap-3 px-2 mb-2">
              <input
                type="checkbox"
                checked={selectedIds.size === items.length && items.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 accent-slate-700"
              />
              <span className="text-xs text-slate-500">
                {selectedIds.size > 0 ? `${selectedIds.size}件選択中` : '全選択'}
              </span>
            </div>
            <div className="space-y-2">
              {items.map(item => (
                <QueueRow
                  key={item.id}
                  item={item}
                  expanded={expandedId === item.id}
                  onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  onReload={load}
                  selected={selectedIds.has(item.id)}
                  onSelect={() => toggleSelect(item.id)}
                  onDelete={() => deleteSelected([item.id])}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── 一覧行 ──────────────────────────────────────────────────
function QueueRow({ item, expanded, onToggle, onReload, selected, onSelect, onDelete }: {
  item: QueueItem; expanded: boolean; onToggle: () => void; onReload: () => void
  selected: boolean; onSelect: () => void; onDelete: () => void
}) {
  const p = item.property
  const isSale = p?.transaction_type === 'sale'
  const price = isSale ? fmtPrice(p?.current_price ?? null) : fmtRent(p?.monthly_rent ?? null)

  return (
    <div className={`bg-white rounded-xl border overflow-hidden ${selected ? 'border-slate-400 ring-1 ring-slate-300' : 'border-slate-200'}`}>
      {/* サマリー行 */}
      <div className="flex items-start">
        {/* チェックボックス */}
        <div className="flex items-center px-3 pt-4" onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="w-4 h-4 accent-slate-700"
          />
        </div>
        <button onClick={onToggle} className="flex-1 text-left px-3 py-3.5 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          {/* ステータスバッジ */}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[item.status] ?? 'bg-slate-100 text-slate-600'}`}>
            {item.status === 'matched' ? '自動一致' : item.status === 'needs_review' ? '要確認'
             : item.status === 'not_found' ? '一致なし' : item.status === 'queued' ? '照合待ち' : item.status}
          </span>

          {/* not_found 原因 */}
          {item.status === 'not_found' && item.not_found_reason && (
            <span className="text-xs text-red-500 flex-shrink-0 bg-red-50 px-2 py-0.5 rounded">
              {NOT_FOUND_REASON_LABEL[item.not_found_reason] ?? item.not_found_reason}
            </span>
          )}

          {/* 顧客名 */}
          {item.customer && (
            <span className="text-xs text-slate-400 flex-shrink-0">{item.customer.name}</span>
          )}

          {/* 物件名 */}
          <span className="font-medium text-sm text-slate-800 truncate flex-1 min-w-0">
            {p?.name ?? '物件不明'}
          </span>

          {/* 価格 */}
          <span className="text-sm font-semibold text-slate-700 flex-shrink-0">{price}</span>

          {/* 面積 */}
          <span className="text-xs text-slate-500 flex-shrink-0">{p?.area_sqm ? `${p.area_sqm}㎡` : '—'}</span>

          {/* 築年 */}
          <span className="text-xs text-slate-500 flex-shrink-0">{builtLabel(p?.built_year ?? null, p?.built_month ?? null)}</span>

          {/* スコア */}
          {item.bestScore !== null && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 ${
              item.bestScore >= 80 ? 'bg-green-100 text-green-700' : item.bestScore >= 45 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {item.bestScore}点
            </span>
          )}

          {/* gap */}
          {item.gap && (
            <span className={`text-xs flex-shrink-0 ${item.gap.downgraded ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
              gap:{item.gap.score_gap}
            </span>
          )}

          {/* ガード件数 */}
          {item.guardCount > 0 && (
            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
              guard×{item.guardCount}
            </span>
          )}

          {/* ポータル */}
          <span className="text-xs text-slate-400 flex-shrink-0">{SITE_LABELS[p?.site ?? ''] ?? p?.site}</span>

          {/* 照合日時 */}
          <span className="text-xs text-slate-300 flex-shrink-0">{fmtDate(item.updated_at)}</span>

          {/* 展開アイコン */}
          <span className="text-slate-400 flex-shrink-0 text-sm">{expanded ? '▼' : '▶'}</span>
        </div>

        {/* 住所・駅 */}
        <div className="flex gap-4 mt-1 text-xs text-slate-400">
          {p?.address && <span>{p.address}</span>}
          {p?.nearest_station && <span>{p.nearest_station}駅 徒歩{p.walk_minutes ?? '?'}分</span>}
          {item.latestResult && (
            <span className="ml-auto">最終判定: {VERDICT_LABEL[item.latestResult.verdict] ?? item.latestResult.verdict}（{item.latestResult.method}）{fmtDate(item.latestResult.decided_at)}</span>
          )}
        </div>
        </button>
        {/* 個別削除ボタン */}
        <div className="flex items-center pr-3 pt-3" onClick={e => e.stopPropagation()}>
          <button
            onClick={onDelete}
            className="text-xs text-slate-300 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors"
            title="削除"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 展開: 詳細比較 */}
      {expanded && (
        <DetailPanel item={item} onReload={onReload} />
      )}
    </div>
  )
}

// ── 詳細パネル ──────────────────────────────────────────────
function DetailPanel({ item, onReload }: { item: QueueItem; onReload: () => void }) {
  const p = item.property
  const cands = item.candidates.sort((a, b) => a.rank - b.rank)
  const [judging, setJudging] = useState(false)
  const [judgeMemo, setJudgeMemo] = useState('')
  const [judgeBy, setJudgeBy] = useState('')
  const [showCorrection, setShowCorrection] = useState(false)

  async function submitJudge(verdict: string, candidateId?: string | null, reinsNumber?: string | null, agentCompany?: string | null) {
    if (!judgeBy.trim()) { alert('判定者名を入力してください'); return }
    setJudging(true)
    await fetch('/api/reins-queue/judge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queue_id: item.id,
        candidate_id: candidateId ?? null,
        verdict,
        decided_by: judgeBy.trim(),
        note: judgeMemo.trim() || null,
        reins_number: reinsNumber ?? null,
        agent_company: agentCompany ?? null,
      }),
    })
    setJudging(false)
    setJudgeMemo('')
    onReload()
  }

  const COMPARE_FIELDS: { key: string; label: string; portalVal: (p: Property | null) => string; reinsVal: (r: ReinsProperty | null) => string }[] = [
    { key: 'name',         label: '物件名',      portalVal: p => p?.name ?? '—', reinsVal: r => r?.property_name ?? '—' },
    { key: 'address',      label: '住所',        portalVal: p => p?.address ?? '—', reinsVal: r => r?.address ?? '—' },
    { key: 'area_sqm',     label: '面積',        portalVal: p => p?.area_sqm ? `${p.area_sqm}㎡` : '—', reinsVal: r => r?.area_sqm ? `${r.area_sqm}㎡` : '—' },
    { key: 'built_year',   label: '築年',        portalVal: p => builtLabel(p?.built_year ?? null, p?.built_month ?? null), reinsVal: r => builtLabel(r?.built_year ?? null, r?.built_month ?? null) },
    { key: 'price',        label: '価格',        portalVal: p => p?.transaction_type === 'rent' ? fmtRent(p?.monthly_rent ?? null) : fmtPrice(p?.current_price ?? null), reinsVal: r => fmtPrice(r?.price_man ?? null) },
    { key: 'floor_number', label: '所在階',       portalVal: p => p?.floor_number != null ? `${p.floor_number}F` : '—', reinsVal: r => r?.floor_number != null ? `${r.floor_number}F` : '—' },
    { key: 'station',      label: '最寄駅',       portalVal: p => p?.nearest_station ?? '—', reinsVal: r => r?.station ?? '—' },
    { key: 'walk',         label: '徒歩',        portalVal: p => p?.walk_minutes != null ? `${p.walk_minutes}分` : '—', reinsVal: r => r?.walk_minutes != null ? `${r.walk_minutes}分` : '—' },
    { key: 'reins_number', label: 'レインズ番号',  portalVal: () => '—', reinsVal: r => r?.reins_number ?? '—' },
    { key: 'agent',        label: '元付会社',      portalVal: () => '—', reinsVal: r => r?.agent_company ?? '—' },
  ]

  return (
    <div className="border-t border-slate-100 bg-slate-50 p-5">
      {/* 判定者入力 */}
      <div className="flex gap-3 mb-4 items-center">
        <label className="text-xs text-slate-500 flex-shrink-0">判定者</label>
        <input
          type="text" value={judgeBy} onChange={e => setJudgeBy(e.target.value)}
          placeholder="名前を入力" className="text-sm border border-slate-300 rounded px-2 py-1 w-36"
        />
        <label className="text-xs text-slate-500 flex-shrink-0">メモ</label>
        <input
          type="text" value={judgeMemo} onChange={e => setJudgeMemo(e.target.value)}
          placeholder="任意メモ" className="text-sm border border-slate-300 rounded px-2 py-1 flex-1"
        />
        <button
          onClick={() => submitJudge('not_found')}
          disabled={judging}
          className="text-xs border border-red-300 text-red-600 px-3 py-1.5 rounded hover:bg-red-50 disabled:opacity-50 flex-shrink-0"
        >一致なし</button>
        <button
          onClick={() => submitJudge('inconclusive')}
          disabled={judging}
          className="text-xs border border-amber-300 text-amber-600 px-3 py-1.5 rounded hover:bg-amber-50 disabled:opacity-50 flex-shrink-0"
        >再確認に戻す</button>
        <button
          onClick={() => setShowCorrection(!showCorrection)}
          className="text-xs border border-blue-300 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-50 flex-shrink-0"
        >取得データを修正</button>
      </div>

      {/* データ修正フォーム */}
      {showCorrection && p && (
        <CorrectionForm
          property={p}
          queueId={item.id}
          onDone={() => { setShowCorrection(false); onReload() }}
        />
      )}

      {/* 一致なし原因表示 */}
      {item.status === 'not_found' && item.not_found_reason && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <span className="font-semibold">一致なし原因：</span>
          {NOT_FOUND_REASON_LABEL[item.not_found_reason] ?? item.not_found_reason}
          <span className="ml-2 text-red-400">({item.not_found_reason})</span>
        </div>
      )}

      {/* 比較テーブル */}
      {cands.length === 0 ? (
        <div className="text-sm text-slate-400 py-6 text-center">照合候補がありません</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2 text-slate-500 font-normal w-24">項目</th>
                <th className="text-left py-2 px-2 text-slate-700 font-semibold bg-blue-50 rounded-tl min-w-[180px]">
                  ポータル物件
                  {p?.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 ml-1 font-normal">↗</a>
                  )}
                </th>
                {cands.map(c => (
                  <th key={c.id} className={`text-left py-2 px-2 font-semibold min-w-[180px] ${
                    c.rank === 1 ? 'bg-green-50' : 'bg-slate-50'
                  }`}>
                    候補{c.rank}位（{c.score}点）
                    {c.score_detail?.verdict === 'BLOCKED' && (
                      <span className="text-red-500 ml-1 font-normal">BLOCKED</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_FIELDS.map(f => (
                <tr key={f.key} className="border-b border-slate-100">
                  <td className="py-1.5 px-2 text-slate-600 font-medium">{f.label}</td>
                  <td className="py-1.5 px-2 bg-blue-50 text-slate-800">{f.portalVal(p)}</td>
                  {cands.map(c => (
                    <td key={c.id} className={`py-1.5 px-2 text-slate-800 ${c.rank === 1 ? 'bg-green-50' : 'bg-slate-50'}`}>
                      {f.reinsVal(c.reins)}
                    </td>
                  ))}
                </tr>
              ))}
              {/* 判定ボタン行 */}
              <tr>
                <td className="py-2 px-2"></td>
                <td className="py-2 px-2"></td>
                {cands.map(c => (
                  <td key={c.id} className="py-2 px-2">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => submitJudge('confirmed', c.id, c.reins?.reins_number, c.reins?.agent_company)}
                        disabled={judging}
                        className="text-xs bg-green-600 text-white px-2.5 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                      >この候補で確定</button>
                      <button
                        onClick={() => submitJudge('rejected', c.id)}
                        disabled={judging}
                        className="text-xs border border-slate-300 text-slate-600 px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-50"
                      >除外</button>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* スコア内訳 */}
      {cands.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-slate-600 mb-2">スコア内訳（1位候補）</h4>
          <ScoreBreakdown detail={cands[0].score_detail} />
        </div>
      )}

      {/* 判定履歴 */}
      {item.resultHistory.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-slate-600 mb-2">判定履歴（append-only）</h4>
          <div className="space-y-1">
            {item.resultHistory.map((r, i) => (
              <div key={r.id} className={`flex gap-3 text-xs py-1.5 px-3 rounded ${i === 0 ? 'bg-white border border-slate-200' : 'bg-slate-50'}`}>
                {i === 0 && <span className="text-green-600 font-semibold">最新</span>}
                <span className={`font-medium ${r.verdict === 'confirmed' ? 'text-green-600' : r.verdict === 'not_found' ? 'text-red-500' : 'text-amber-600'}`}>
                  {VERDICT_LABEL[r.verdict] ?? r.verdict}
                </span>
                <span className="text-slate-400">{r.method}</span>
                <span className="text-slate-500">{r.decided_by}</span>
                {r.reins_number && <span className="text-slate-400">#{r.reins_number}</span>}
                {r.note && <span className="text-slate-400 truncate max-w-xs">{r.note}</span>}
                <span className="text-slate-300 ml-auto">{fmtDate(r.decided_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── データ修正フォーム ──────────────────────────────────────
function CorrectionForm({ property, queueId, onDone }: {
  property: Property; queueId: string; onDone: () => void
}) {
  const [correctedBy, setCorrectedBy] = useState('')
  const [reason, setReason] = useState('')
  const [rematch, setRematch] = useState(true)
  const [saving, setSaving] = useState(false)
  const [vals, setVals] = useState({
    name: property.name ?? '',
    address: property.address ?? '',
    area_sqm: String(property.area_sqm ?? ''),
    current_price: String(property.current_price ?? ''),
    built_year: String(property.built_year ?? ''),
    built_month: String(property.built_month ?? ''),
    floor_number: String(property.floor_number ?? ''),
    nearest_station: property.nearest_station ?? '',
    walk_minutes: String(property.walk_minutes ?? ''),
  })

  type ValKey = keyof typeof vals
  const FIELDS: { key: ValKey; label: string; type?: string }[] = [
    { key: 'name',            label: '物件名' },
    { key: 'address',         label: '住所' },
    { key: 'area_sqm',        label: '専有面積（㎡）', type: 'number' },
    { key: 'current_price',   label: '価格（万円）',   type: 'number' },
    { key: 'built_year',      label: '築年',           type: 'number' },
    { key: 'built_month',     label: '築月',           type: 'number' },
    { key: 'floor_number',    label: '所在階',         type: 'number' },
    { key: 'nearest_station', label: '最寄駅' },
    { key: 'walk_minutes',    label: '徒歩（分）',     type: 'number' },
  ]

  // 変更があったフィールドのみ送信
  const origVals: Record<ValKey, string> = {
    name: property.name ?? '', address: property.address ?? '',
    area_sqm: String(property.area_sqm ?? ''), current_price: String(property.current_price ?? ''),
    built_year: String(property.built_year ?? ''), built_month: String(property.built_month ?? ''),
    floor_number: String(property.floor_number ?? ''), nearest_station: property.nearest_station ?? '',
    walk_minutes: String(property.walk_minutes ?? ''),
  }
  const changed = FIELDS.filter(f => vals[f.key] !== origVals[f.key])

  async function handleSave() {
    if (!correctedBy.trim()) { alert('修正者名を入力してください'); return }
    if (changed.length === 0) { alert('変更された項目がありません'); return }
    setSaving(true)
    const corrections = changed.map(f => ({
      field: f.key,
      value: f.type === 'number' ? (vals[f.key] ? Number(vals[f.key]) : null) : vals[f.key] || null,
    }))
    const res = await fetch('/api/reins-queue/correct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queue_id: queueId, property_id: property.id, corrections, corrected_by: correctedBy, reason, rematch }),
    })
    const json = await res.json()
    setSaving(false)
    if (json.ok) {
      alert(`修正完了（${json.corrected}件）${rematch ? '\n再照合を実行しました' : ''}`)
      onDone()
    } else {
      alert(`エラー: ${json.error}`)
    }
  }

  return (
    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 className="text-xs font-semibold text-blue-800 mb-3">ポータル取得データを修正</h4>
      <div className="grid grid-cols-3 gap-3 mb-3">
        {FIELDS.map(f => (
          <div key={f.key}>
            <label className="text-xs text-slate-500 block mb-0.5">{f.label}</label>
            <input
              type={f.type ?? 'text'}
              value={vals[f.key]}
              onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
              className={`text-xs border rounded px-2 py-1 w-full ${vals[f.key] !== origVals[f.key] ? 'border-blue-400 bg-yellow-50' : 'border-slate-300'}`}
            />
          </div>
        ))}
      </div>
      {changed.length > 0 && (
        <div className="mb-3 text-xs text-blue-700">
          変更項目: {changed.map(f => f.label).join('、')}
        </div>
      )}
      <div className="flex gap-3 items-center">
        <input type="text" value={correctedBy} onChange={e => setCorrectedBy(e.target.value)}
          placeholder="修正者名（必須）" className="text-xs border border-slate-300 rounded px-2 py-1 w-32" />
        <input type="text" value={reason} onChange={e => setReason(e.target.value)}
          placeholder="修正理由（任意）" className="text-xs border border-slate-300 rounded px-2 py-1 flex-1" />
        <label className="flex items-center gap-1.5 text-xs text-slate-600 flex-shrink-0">
          <input type="checkbox" checked={rematch} onChange={e => setRematch(e.target.checked)} />
          修正後に再照合
        </label>
        <button onClick={handleSave} disabled={saving || changed.length === 0}
          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 flex-shrink-0">
          {saving ? '保存中...' : '保存する'}
        </button>
        <button onClick={onDone}
          className="text-xs border border-slate-300 text-slate-600 px-2 py-1.5 rounded hover:bg-slate-100 flex-shrink-0">
          キャンセル
        </button>
      </div>
    </div>
  )
}

// ── スコア内訳 ──────────────────────────────────────────────
function ScoreBreakdown({ detail }: { detail: ScoreDetail }) {
  const ITEM_LABELS: Record<string, string> = {
    address: '住所', area_sqm: '面積', built_year: '築年', price: '価格',
    floor_number: '所在階', station: '最寄駅', property_name: '物件名', room_number: '部屋番号',
  }
  const MAX_POINTS: Record<string, number> = {
    address: 30, area_sqm: 25, built_year: 15, price: 15, floor_number: 10, station: 5, property_name: 5, room_number: 5,
  }

  const isGuarded = (key: string) => {
    const aliases: Record<string, string[]> = { area_sqm: ['area'], built_year: ['built_year'], floor_number: ['floor'], room_number: ['room'] }
    const keys = [key, ...(aliases[key] ?? [])]
    return detail.guards.some(g => keys.some(k => g.includes(k)))
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {Object.entries(detail.items).map(([key, item]) => {
          const guarded = isGuarded(key)
          return (
            <div key={key} className={`rounded-lg p-2.5 text-xs ${guarded ? 'bg-red-50 border border-red-200' : item.points > 0 ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`font-medium ${guarded ? 'text-red-700' : 'text-slate-700'}`}>
                  {ITEM_LABELS[key] ?? key}
                </span>
                <span className={`font-bold ${guarded ? 'text-red-600' : item.points > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                  {item.points}/{MAX_POINTS[key] ?? '?'}
                </span>
              </div>
              <div className="text-slate-500">
                {item.match}
                {guarded && <span className="text-red-500 ml-1 font-semibold">GUARD</span>}
              </div>
              {item.portal !== undefined && (
                <div className="mt-1 text-slate-400">
                  P: {String(item.portal ?? '—').slice(0, 30)} / R: {String(item.reins ?? '—').slice(0, 30)}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ガード理由（日本語表示） */}
      {detail.guards.length > 0 && (
        <div className="mb-3 space-y-1">
          {detail.guards.map(g => (
            <div key={g} className="flex items-center gap-2 text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded">
              <span className="font-semibold">GUARD</span>
              <span>{GUARD_LABEL[g] ?? g}</span>
              <span className="text-red-400 ml-auto font-mono">{g}</span>
            </div>
          ))}
        </div>
      )}

      {/* gap 情報 */}
      {detail.gap && (
        <div className={`flex gap-4 text-xs px-3 py-2 rounded ${detail.gap.downgraded ? 'bg-red-50 border border-red-200' : 'bg-slate-100'}`}>
          <span>best: <strong>{detail.gap.best_score}</strong></span>
          <span>second: <strong>{detail.gap.second_score}</strong></span>
          <span>gap: <strong>{detail.gap.score_gap}</strong></span>
          {detail.gap.downgraded && <span className="text-red-600 font-semibold">gap≤5 のため NEEDS_REVIEW に降格</span>}
        </div>
      )}

      <div className="mt-2 text-xs text-slate-400">
        スコアリング v{detail.version} | 合計 {detail.total}点 | 判定: {detail.verdict} | ガード: {detail.guards.length === 0 ? 'なし' : detail.guards.length + '件'}
      </div>
    </div>
  )
}
