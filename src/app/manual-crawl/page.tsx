'use client'
import { useEffect, useState } from 'react'
import { ManualCrawlResult, PropertyWithMatch, ConditionMatchItem } from '@/types'

const PORTAL_PRESETS = [
  { name: 'SUUMO',          type: 'public', hint: 'suumo.jp' },
  { name: 'アットホーム',    type: 'public', hint: 'athome.co.jp' },
  { name: "LIFULL HOME'S",  type: 'public', hint: 'homes.co.jp' },
  { name: 'イタンジ',        type: 'login',  hint: 'itandibb.jp' },
  { name: 'レインズ',        type: 'login',  hint: 'reins.or.jp' },
  { name: 'その他',          type: 'login',  hint: '' },
]

const PAGE_OPTIONS = [
  { value: 1,  label: '1ページのみ',   desc: '動作確認・速度優先' },
  { value: 3,  label: '最大3ページ',   desc: '直近の新着を確認' },
  { value: 10, label: '最大10ページ',  desc: '広めに取得' },
]

interface Customer { id: string; name: string; customer_no: string }

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
  const pct = Math.round(score * 100)
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
  prop,
  customerId,
  onProposed,
}: {
  prop: PropertyWithMatch & { isAlreadyProposed?: boolean }
  customerId: string
  onProposed: (propertyId: string) => void
}) {
  const [proposing, setProposing] = useState(false)
  const [done, setDone] = useState(prop.isAlreadyProposed ?? false)

  async function propose() {
    if (!prop.propertyId) return
    setProposing(true)
    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId, property_id: prop.propertyId }),
    })
    if (res.ok) {
      setDone(true)
      onProposed(prop.propertyId)
    }
    setProposing(false)
  }

  const formatPrice = (p: number | null) =>
    p ? `${(p / 10000).toLocaleString()}万円` : '価格未定'

  return (
    <div className={`border rounded-xl p-4 transition-colors ${
      done ? 'bg-green-50 border-green-200' :
      prop.matchScore >= 0.8 ? 'bg-white border-slate-200' :
      prop.matchScore >= 0.5 ? 'bg-white border-slate-200' :
      'bg-white border-slate-100 opacity-80'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {prop.isNew && (
              <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded font-medium">新規</span>
            )}
            {done && (
              <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded font-medium">提案済</span>
            )}
            <span className="text-xs text-slate-400 uppercase">{prop.site}</span>
          </div>
          <a href={prop.url} target="_blank" rel="noopener noreferrer"
             className="font-semibold text-sm text-blue-800 hover:underline leading-tight block truncate">
            {prop.name}
          </a>
          {prop.address && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{prop.address}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-slate-800">{formatPrice(prop.price)}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {[prop.floor_plan, prop.area_sqm ? `${prop.area_sqm}㎡` : null].filter(Boolean).join(' / ')}
          </div>
        </div>
      </div>

      {/* スペック */}
      <div className="flex gap-3 text-xs text-slate-500 mb-2">
        {prop.walk_minutes   && <span>徒歩{prop.walk_minutes}分</span>}
        {prop.building_age   && <span>築{prop.building_age}年</span>}
        {prop.room_number    && <span>{prop.room_number}</span>}
      </div>

      {/* 条件照合 */}
      {prop.matchItems.length > 0 && (
        <div className="mb-2">
          <ScoreBar score={prop.matchScore} />
          <div className="flex flex-wrap gap-1 mt-1.5">
            {prop.matchItems.map((item, i) => <MatchBadge key={i} item={item} />)}
          </div>
        </div>
      )}

      {/* 提案ボタン */}
      <div className="flex justify-end mt-2">
        {done ? (
          <span className="text-xs text-green-700 font-medium">✓ 提案候補に追加済</span>
        ) : (
          <button
            onClick={propose}
            disabled={proposing || !prop.propertyId}
            className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-40 transition-colors font-medium"
          >
            {proposing ? '追加中...' : '提案候補に追加'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function ManualCrawlPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [portalPreset, setPortalPreset] = useState(PORTAL_PRESETS[0])
  const [portalName, setPortalName] = useState(PORTAL_PRESETS[0].name)
  const [url, setUrl] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [maxPages, setMaxPages] = useState(3)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ManualCrawlResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [proposedIds, setProposedIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'matched'>('all')

  useEffect(() => {
    fetch('/api/customers')
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (d.customers ?? [])
        setCustomers(list)
        if (list.length > 0) setCustomerId(list[0].id)
      })
  }, [])

  async function run() {
    if (!url.trim() || !customerId) return
    setLoading(true)
    setError(null)
    setResult(null)
    setProposedIds(new Set())
    try {
      const res = await fetch('/api/manual-crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portalName, url: url.trim(), customerId, maxPages }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '探索に失敗しました')
        return
      }
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  function selectPreset(preset: typeof PORTAL_PRESETS[0]) {
    setPortalPreset(preset)
    setPortalName(preset.name)
    setUrl('')
  }

  const displayedProps = result?.properties.filter(p =>
    filter === 'all' ? true : p.matchScore >= 0.5
  ) ?? []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">ログイン型ポータル 手動探索</h1>
        <p className="text-sm text-slate-500 mt-1">
          ポータルサイトで検索した結果URLを貼り付けて、物件を取得・提案候補に追加できます。
          <br />
          <span className="text-amber-600 font-medium">※ この画面での探索は自動巡回・Cronメールの対象外です。</span>
        </p>
      </div>

      {/* Vercel環境での注意 */}
      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6 flex gap-3">
        <span className="text-amber-500 text-xl flex-shrink-0">⚠</span>
        <div>
          <p className="text-sm font-semibold text-amber-800">この機能はローカル環境専用です</p>
          <p className="text-xs text-amber-700 mt-1">
            Vercel（本番）環境ではPlaywrightが動作しないため、探索実行はできません。<br />
            ローカルで <code className="bg-amber-100 px-1 rounded">npm run dev</code> を起動し、<strong>http://localhost:3003/manual-crawl</strong> から操作してください。
          </p>
        </div>
      </div>

      {/* フォーム */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        {/* ポータル選択 */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-700 mb-2">ポータル名</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {PORTAL_PRESETS.map(p => (
              <button
                key={p.name}
                onClick={() => selectPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-sm border-2 transition-colors ${
                  portalPreset.name === p.name
                    ? 'border-slate-700 bg-slate-50 font-semibold text-slate-800'
                    : 'border-slate-300 text-slate-700 hover:border-slate-500 hover:text-slate-800'
                }`}
              >
                {p.name}
                {p.type === 'login' && (
                  <span className="ml-1 text-xs text-amber-500">[要ログイン]</span>
                )}
              </button>
            ))}
          </div>
          {portalPreset.name === 'その他' && (
            <input
              type="text"
              value={portalName}
              onChange={e => setPortalName(e.target.value)}
              placeholder="ポータル名を入力"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          )}
          {portalPreset.type === 'login' && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <strong>ログイン型ポータルについて：</strong>
              ブラウザで手動ログイン後、検索結果ページのURLをコピーして貼り付けてください。
              セッションの問題で取得できない場合があります。ID・パスワードの保存はしません。
            </div>
          )}
        </div>

        {/* URL入力 */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            検索結果URL
          </label>
          <textarea
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder={`https://${portalPreset.hint || 'example.com'}/...`}
            rows={3}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none placeholder:text-slate-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-5 mb-5">
          {/* 対象顧客 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">対象顧客</label>
            <select
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}（{c.customer_no}）
                </option>
              ))}
            </select>
          </div>

          {/* 探索モード */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">探索範囲</label>
            <div className="flex flex-col gap-1.5">
              {PAGE_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="maxPages"
                    value={opt.value}
                    checked={maxPages === opt.value}
                    onChange={() => setMaxPages(opt.value)}
                    className="accent-slate-700"
                  />
                  <span className="text-sm font-medium text-slate-800">{opt.label}</span>
                  <span className="text-xs text-slate-500">{opt.desc}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={run}
          disabled={loading || !url.trim() || !customerId}
          className="bg-slate-800 text-white px-6 py-2.5 rounded-lg hover:bg-slate-700 disabled:opacity-40 transition-colors font-medium"
        >
          {loading ? '探索中... しばらくお待ちください' : '探索実行'}
        </button>
      </div>

      {/* エラー */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 whitespace-pre-wrap text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 結果 */}
      {result && (
        <div>
          {/* サマリー */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">
                探索結果
                <span className="ml-2 text-sm font-normal text-slate-400">{result.portalName}</span>
              </h2>
              <span className="text-xs text-slate-400">
                {result.checkedPages}ページ巡回 / 停止: {result.stoppedReason}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: '取得物件', value: result.fetchedCount, color: '' },
                { label: '新規',     value: result.newCount,     color: 'text-blue-700' },
                { label: '重複',     value: result.duplicateCount, color: 'text-slate-400' },
                { label: '条件照合', value: `${result.properties.filter(p => p.matchScore >= 0.5).length}/${result.properties.length}`, color: 'text-green-700' },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className={`text-2xl font-bold ${s.color || 'text-slate-800'}`}>{s.value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* フィルター */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${filter === 'all' ? 'border-slate-700 bg-slate-50 font-medium' : 'border-slate-200'}`}
              >
                全件 ({result.properties.length})
              </button>
              <button
                onClick={() => setFilter('matched')}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${filter === 'matched' ? 'border-slate-700 bg-slate-50 font-medium' : 'border-slate-200'}`}
              >
                条件合致のみ ({result.properties.filter(p => p.matchScore >= 0.5).length})
              </button>
            </div>
          </div>

          {/* 物件リスト */}
          <div className="grid grid-cols-1 gap-3">
            {displayedProps.map((prop, i) => (
              <PropertyCard
                key={i}
                prop={prop}
                customerId={customerId}
                onProposed={id => setProposedIds(prev => new Set([...prev, id]))}
              />
            ))}
            {displayedProps.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                {filter === 'matched' ? '条件に合致する物件がありません' : '物件が取得できませんでした'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
