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
  management_fee?: number
  repair_fund?: number
  search_keywords?: string[]
  match_score: number | null
  match_status: 'pending' | 'confirmed' | 'review' | 'not_found'
  matched_items: string[]
  unmatched_items: string[]
  score_detail: ScoreDetail[] | null
  reins_number?: string
  agent_company?: string
  reins_page_url?: string
  checked_at: string | null
  created_at: string
}

interface ImportStat {
  id: string
  imported_at: string
  page_url?: string
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

export default function ReinsCheckPage() {
  const [checks, setChecks] = useState<ReinsCheck[]>([])
  const [loadingChecks, setLoadingChecks] = useState(false)
  const [importStats, setImportStats] = useState<ImportStat[]>([])

  // 取り込みパネル
  const [tab, setTab] = useState<InputTab>('email')
  const [inputText, setInputText] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedProperty[]>([])
  const [extractError, setExtractError] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  // 手動貼り付け（折りたたみ）
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null)
  const [reinsInput, setReinsInput] = useState('')
  const [accumulatedText, setAccumulatedText] = useState('')
  const [accumulatedPages, setAccumulatedPages] = useState(0)
  const [reinsUrlDetected, setReinsUrlDetected] = useState<string | null>(null)
  const [matching, setMatching] = useState(false)
  const [matchError, setMatchError] = useState('')
  const [lastExtracted, setLastExtracted] = useState<ExtractedProperty | null>(null)

  const loadChecks = useCallback(async () => {
    setLoadingChecks(true)
    const res = await fetch('/api/reins-check')
    if (res.ok) setChecks(await res.json())
    setLoadingChecks(false)
  }, [])

  const loadImportStats = useCallback(async () => {
    const res = await fetch('/api/reins/import-results')
    if (res.ok) setImportStats(await res.json())
  }, [])

  useEffect(() => { loadChecks(); loadImportStats() }, [])

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

  async function copyKeyword(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1500)
  }

  async function deleteCheck(id: string) {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/reins-check/${id}`, { method: 'DELETE' })
    setChecks(prev => prev.filter(c => c.id !== id))
  }

  // ─── 手動照合（バックアップ方式） ───────────────────────────
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
    setMatching(true); setMatchError(''); setLastExtracted(null)
    const res = await fetch(`/api/reins-check/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reins_input: textToMatch }),
    })
    const data = await res.json()
    if (res.ok) {
      if (data._extracted) setLastExtracted(data._extracted)
      resetManual(); setActiveCheckId(null); await loadChecks()
    } else { setMatchError(data.error ?? `エラー HTTP ${res.status}`) }
    setMatching(false)
  }

  const tabs: { key: InputTab; label: string }[] = [
    { key: 'email', label: 'メール本文' },
    { key: 'csv',   label: 'CSV' },
    { key: 'url',   label: '物件URL' },
    { key: 'pdf',   label: 'PDF/画像テキスト' },
  ]

  const lastImport = importStats[0]
  const pendingCount = checks.filter(c => c.match_status === 'pending').length
  const confirmedCount = checks.filter(c => c.match_status === 'confirmed').length

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* ─── ヘッダー ─── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">レインズ掲載確認</h1>
        <p className="text-sm text-slate-500 mt-1">
          Chrome拡張でレインズ検索結果を取り込み → 全候補物件と自動照合
        </p>
      </div>

      {/* ─── Chrome拡張 CTA ─── */}
      <div className="bg-slate-800 text-white rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-semibold text-base mb-1">Chrome拡張で一括照合（推奨）</h2>
            <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
              <li>レインズにログインして検索結果ページを開く</li>
              <li>Chrome拡張アイコンをクリック</li>
              <li>「この検索結果を送信」ボタンを押す</li>
              <li>全候補物件と自動照合・スコア更新</li>
            </ol>
          </div>
          <div className="text-right shrink-0">
            {lastImport ? (
              <div className="text-xs text-slate-400">
                <div>最終取り込み</div>
                <div className="text-slate-200 font-medium">
                  {new Date(lastImport.imported_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400">まだ取り込みがありません</div>
            )}
            <div className="mt-2 text-xs text-slate-300">
              <span className="text-green-400 font-bold">{confirmedCount}</span>件 掲載あり
              <span className="text-slate-400">{pendingCount}</span>件 未照合
            </div>
          </div>
        </div>
      </div>

      {/* ─── 候補物件 取り込みパネル ─── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-slate-700 mb-3">候補物件を追加</h2>
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
          <textarea value={inputText} onChange={e => setInputText(e.target.value)} rows={6}
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
                {p.search_keywords && p.search_keywords.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.search_keywords.map(k => (
                      <button key={k} onClick={() => copyKeyword(k)}
                        className={`px-2 py-0.5 rounded text-xs border transition-colors ${copied === k ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                        {copied === k ? '✓' : '📋'} {k}
                      </button>
                    ))}
                  </div>
                )}
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-slate-700">
            照合リスト
            <span className="ml-2 text-slate-400 font-normal text-sm">（{checks.length}件）</span>
          </h2>
          <button onClick={() => { loadChecks(); loadImportStats() }} disabled={loadingChecks}
            className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-2 py-1 rounded">
            {loadingChecks ? '...' : '更新'}
          </button>
        </div>

        {checks.length === 0 && !loadingChecks && (
          <p className="text-slate-400 text-sm py-4 text-center">候補物件がありません。上から取り込んでください。</p>
        )}

        <div className="space-y-3">
          {checks.map(c => {
            const st = STATUS_CONFIG[c.match_status]
            const isActive = activeCheckId === c.id

            return (
              <div key={c.id} className="border border-slate-200 rounded-lg overflow-hidden">

                {/* 物件ヘッダー */}
                <div className="px-4 py-3">
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
                      </div>

                      {/* ポータル物件情報 */}
                      <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                        {c.address      && <span>📍 {c.address}</span>}
                        {c.price_man    && <span>💴 {c.price_man.toLocaleString()}万円</span>}
                        {c.area_sqm     && <span>📐 {c.area_sqm}㎡</span>}
                        {c.floor_plan   && <span>{c.floor_plan}</span>}
                        {c.floor_number && <span>{c.floor_number}階</span>}
                        {c.station      && <span>🚉 {c.station} 徒歩{c.walk_minutes}分</span>}
                        {(c.built_year) && <span>🏗 {c.built_year}年{c.built_month ? `${c.built_month}月` : ''}築</span>}
                      </div>

                      {/* スコアバー */}
                      {c.match_score !== null && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 bg-slate-100 rounded-full flex-1 max-w-[160px]">
                              <div className={`h-1.5 rounded-full ${st.bar}`} style={{ width: `${Math.min(c.match_score, 100)}%` }} />
                            </div>
                            <span className="text-xs text-slate-500">{c.match_score}/100点</span>
                          </div>
                        </div>
                      )}

                      {/* レインズ照合結果（一括取り込み方式） */}
                      {(c.reins_number || c.agent_company) && (
                        <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-3 flex-wrap text-xs">
                            {c.reins_number && (
                              <span className="text-slate-600">
                                <span className="text-slate-400">物件番号</span> {c.reins_number}
                              </span>
                            )}
                            {c.agent_company && (
                              <span className="text-slate-600">
                                <span className="text-slate-400">元付</span> {c.agent_company}
                              </span>
                            )}
                            {c.reins_page_url && (
                              <a href={c.reins_page_url} target="_blank" rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-xs">
                                レインズで確認 →
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* スコア内訳 */}
                      {c.score_detail && c.score_detail.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 mt-2">
                          {c.score_detail.map(d => (
                            <div key={d.item} title={d.reason ?? ''}
                              className={`text-center text-xs px-1 py-1 rounded ${
                                d.earned > 0
                                  ? 'bg-green-50 text-green-700'
                                  : d.reason === 'データなし'
                                  ? 'bg-slate-50 text-slate-400'
                                  : 'bg-red-50 text-red-600'
                              }`}>
                              <div>{d.earned > 0 ? '✓' : '✗'} {d.item}</div>
                              <div className="font-mono text-xs opacity-70">+{d.earned}/{d.max}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 右側ボタン群 */}
                    <div className="flex flex-col gap-1 shrink-0">
                      {c.search_keywords && (c.search_keywords as string[]).length > 0 && (
                        (c.search_keywords as string[]).slice(0, 2).map((k: string) => (
                          <button key={k} onClick={() => copyKeyword(k)} title="レインズ検索キーワードをコピー"
                            className={`text-xs px-2 py-1 rounded border transition-colors ${copied === k ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
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

                  {/* 手動照合（折りたたみ「その他の方法」） */}
                  <div className="mt-2">
                    <button
                      onClick={() => { if (isActive) { resetManual() } setActiveCheckId(isActive ? null : c.id) }}
                      className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
                      {isActive ? '▲ 閉じる' : '▼ その他の方法（手動照合）'}
                    </button>
                  </div>
                </div>

                {/* 手動照合パネル */}
                {isActive && (
                  <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs text-slate-400 mb-3">
                      Chrome拡張が使えない場合：レインズのテキストをコピーして貼り付けてください。
                      複数ページは「追加」ボタンで蓄積できます。
                    </p>

                    {accumulatedPages > 0 && (
                      <div className="mb-2 flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                        <span className="text-green-700 text-xs font-medium">✓ {accumulatedPages}ページ分を蓄積済み</span>
                        <button onClick={resetManual} className="ml-auto text-xs text-red-400 hover:text-red-600">リセット</button>
                      </div>
                    )}

                    <textarea value={reinsInput} onChange={e => handleReinsInputChange(e.target.value)} rows={5}
                      placeholder={accumulatedPages > 0 ? `${accumulatedPages + 1}ページ目を貼り付け...` : 'レインズのURLまたはテキストを貼り付け...'}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono resize-none mb-2" />

                    {reinsUrlDetected && (
                      <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                        <p className="font-medium mb-1">🔗 URLが検出されました</p>
                        <p className="mb-2 text-blue-700">レインズはログイン認証があり直接取得できません。ページを開いて ⌘A→⌘C でコピーしてください。</p>
                        <div className="flex gap-2">
                          <a href={reinsUrlDetected} target="_blank" rel="noopener noreferrer"
                            className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">
                            レインズを開く →
                          </a>
                          <button onClick={() => { setReinsInput(''); setReinsUrlDetected(null) }}
                            className="text-blue-500 border border-blue-300 px-3 py-1 rounded text-xs">
                            クリア
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap items-center">
                      <button onClick={appendPage} disabled={!reinsInput.trim() || !!reinsUrlDetected}
                        className="bg-slate-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-slate-700 disabled:opacity-40">
                        このページを追加{accumulatedPages > 0 ? ` (${accumulatedPages + 1}P目)` : ''}
                      </button>
                      <button onClick={() => matchReins(c.id)}
                        disabled={matching || (!accumulatedText && !reinsInput.trim()) || !!reinsUrlDetected}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-40">
                        {matching ? '照合中...' : accumulatedPages > 0 ? `照合（${accumulatedPages}P分）` : '照合する'}
                      </button>
                      {matchError && <span className="text-red-500 text-xs">{matchError}</span>}
                    </div>

                    {lastExtracted && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                        <span className="font-medium">抽出内容: </span>
                        物件名:{lastExtracted.property_name ?? '未抽出'} /
                        価格:{lastExtracted.price_man != null ? `${lastExtracted.price_man}万` : '未抽出'} /
                        面積:{lastExtracted.area_sqm != null ? `${lastExtracted.area_sqm}㎡` : '未抽出'} /
                        間取り:{lastExtracted.floor_plan ?? '未抽出'}
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
