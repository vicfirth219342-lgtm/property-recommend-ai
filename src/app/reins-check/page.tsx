'use client'
import { useState, useCallback, useEffect } from 'react'

interface ExtractedProperty {
  property_name?: string
  address?: string
  price_man?: number
  area_sqm?: number
  built_year?: number
  built_month?: number
  station?: string
  walk_minutes?: number
  floor_plan?: string
  source_url?: string
  search_keywords?: string[]
}

interface ReinsCheck extends ExtractedProperty {
  id: string
  source_type: string
  match_score: number | null
  match_status: 'pending' | 'confirmed' | 'review' | 'not_found'
  matched_items: string[]
  unmatched_items: string[]
  reins_input: string | null
  checked_at: string | null
  created_at: string
}

const STATUS_CONFIG = {
  confirmed: { label: 'レインズ掲載あり',     color: 'bg-green-100 text-green-700',  bar: 'bg-green-500' },
  review:    { label: '要確認',               color: 'bg-yellow-100 text-yellow-700', bar: 'bg-yellow-500' },
  not_found: { label: '掲載なし可能性高い',   color: 'bg-red-100 text-red-700',      bar: 'bg-red-500' },
  pending:   { label: '未確認',               color: 'bg-slate-100 text-slate-500',  bar: 'bg-slate-300' },
}

type InputTab = 'email' | 'csv' | 'url' | 'pdf' | 'image'

// CSV をパース（シンプル版）
function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split('\n')
  const parse = (line: string) =>
    line.split(',').map(c => c.replace(/^["']|["']$/g, '').trim())
  return { headers: parse(lines[0] ?? ''), rows: lines.slice(1).map(parse) }
}

export default function ReinsCheckPage() {
  const [tab, setTab] = useState<InputTab>('email')
  const [inputText, setInputText] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedProperty[]>([])
  const [extractError, setExtractError] = useState('')
  const [saving, setSaving] = useState(false)

  const [checks, setChecks] = useState<ReinsCheck[]>([])
  const [loadingChecks, setLoadingChecks] = useState(false)
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null)
  const [reinsInput, setReinsInput] = useState('')
  const [matching, setMatching] = useState(false)

  const [copied, setCopied] = useState<string | null>(null)

  // 一覧取得
  const loadChecks = useCallback(async () => {
    setLoadingChecks(true)
    const res = await fetch('/api/reins-check')
    if (res.ok) setChecks(await res.json())
    setLoadingChecks(false)
  }, [])

  useEffect(() => { loadChecks() }, [])

  // テキスト・メールから抽出
  async function extractFromInput() {
    setExtracting(true)
    setExtractError('')
    setExtracted([])

    try {
      if (tab === 'csv') {
        const { headers, rows } = parseCsv(inputText)
        const res = await fetch('/api/reins-check', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'csv', headers, rows }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setExtracted(data)
      } else if (tab === 'url') {
        const res = await fetch('/api/reins-check/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'url', content: urlInput }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setExtracted([data])
      } else {
        // email / pdf_text / image_text
        const type = tab === 'email' ? 'email' : 'text'
        const res = await fetch('/api/reins-check', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, content: inputText }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setExtracted(data)
      }
    } catch (e) {
      setExtractError(String(e))
    } finally {
      setExtracting(false)
    }
  }

  // PDF・画像: テキストをそのまま貼り付けてextract（OCR結果をユーザーが貼る想定）
  // 将来: base64でサーバーに送って pdf-parse / Claude vision で処理

  // DBに保存
  async function saveExtracted() {
    setSaving(true)
    const res = await fetch('/api/reins-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_type: tab,
        raw_input: tab === 'url' ? urlInput : inputText,
        properties: extracted,
      }),
    })
    if (res.ok) {
      setExtracted([])
      setInputText('')
      setUrlInput('')
      await loadChecks()
    }
    setSaving(false)
  }

  // レインズ結果を照合
  async function matchReins(id: string) {
    if (!reinsInput.trim()) return
    setMatching(true)
    const res = await fetch(`/api/reins-check/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reins_input: reinsInput }),
    })
    if (res.ok) {
      setReinsInput('')
      setActiveCheckId(null)
      await loadChecks()
    }
    setMatching(false)
  }

  // キーワードをクリップボードにコピー
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

  const tabs: { key: InputTab; label: string }[] = [
    { key: 'email', label: 'メール本文' },
    { key: 'csv',   label: 'CSV' },
    { key: 'url',   label: '物件URL' },
    { key: 'pdf',   label: 'PDF図面（テキスト貼付）' },
    { key: 'image', label: '画像（テキスト貼付）' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">レインズ掲載確認</h1>
        <p className="text-sm text-slate-500 mt-1">
          メール・CSV・URLから物件を取り込み、レインズで手動検索後に結果を貼り付けて照合します。
          <span className="ml-2 text-amber-600 font-medium">レインズへの自動ログイン・自動巡回はしません。</span>
        </p>
      </div>

      {/* ─── 入力パネル ─── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-slate-700 mb-3">物件情報を取り込む</h2>

        {/* タブ */}
        <div className="flex gap-1 mb-4 border-b border-slate-200">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm rounded-t transition-colors ${
                tab === t.key
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'url' ? (
          <input
            type="url"
            placeholder="https://suumo.jp/... または https://athome.co.jp/..."
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 mb-3"
          />
        ) : (
          <div className="mb-3">
            {tab === 'email' && (
              <p className="text-xs text-slate-400 mb-1">メール本文をそのまま貼り付けてください</p>
            )}
            {tab === 'csv' && (
              <p className="text-xs text-slate-400 mb-1">1行目にヘッダー（物件名,住所,価格,面積,築年月,URL など）</p>
            )}
            {(tab === 'pdf' || tab === 'image') && (
              <p className="text-xs text-slate-400 mb-1">PDF・画像の文字をコピーして貼り付けてください（将来はアップロード対応予定）</p>
            )}
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              rows={7}
              placeholder={
                tab === 'csv'
                  ? '物件名,住所,価格,面積,築年月,間取り,駅,徒歩,URL\n白金タワー 1601,東京都港区白金1-17-1,15800万円,85.32㎡,2003年3月,3LDK,白金高輪駅,3分,...'
                  : '物件情報のテキストを貼り付けてください'
              }
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-mono resize-none"
            />
          </div>
        )}

        <div className="flex gap-2 items-center">
          <button
            onClick={extractFromInput}
            disabled={extracting || (tab === 'url' ? !urlInput.trim() : !inputText.trim())}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            {extracting ? '解析中...' : '物件情報を抽出'}
          </button>
          {extractError && <p className="text-red-500 text-sm">{extractError}</p>}
        </div>

        {/* 抽出結果プレビュー */}
        {extracted.length > 0 && (
          <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600 flex justify-between">
              <span>抽出結果（{extracted.length}件）— 内容を確認してDBに保存</span>
            </div>
            {extracted.map((p, i) => (
              <div key={i} className="px-4 py-3 border-t border-slate-100 text-sm">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {p.property_name && <div><span className="text-slate-400">物件名</span> {p.property_name}</div>}
                  {p.address       && <div><span className="text-slate-400">住所</span> {p.address}</div>}
                  {p.price_man     && <div><span className="text-slate-400">価格</span> {p.price_man.toLocaleString()}万円</div>}
                  {p.area_sqm      && <div><span className="text-slate-400">面積</span> {p.area_sqm}㎡</div>}
                  {p.floor_plan    && <div><span className="text-slate-400">間取り</span> {p.floor_plan}</div>}
                  {(p.built_year || p.built_month) && (
                    <div><span className="text-slate-400">築年月</span> {p.built_year}年{p.built_month ? `${p.built_month}月` : ''}</div>
                  )}
                  {p.station       && <div><span className="text-slate-400">駅</span> {p.station} 徒歩{p.walk_minutes}分</div>}
                </div>
                {p.search_keywords && p.search_keywords.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.search_keywords.map(k => (
                      <button
                        key={k}
                        onClick={() => copyKeyword(k)}
                        className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                          copied === k
                            ? 'bg-green-100 border-green-300 text-green-700'
                            : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {copied === k ? 'コピー済み ✓' : `📋 ${k}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
              <button
                onClick={saveExtracted}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {saving ? '保存中...' : `${extracted.length}件をDBに保存`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── 照合待ちリスト ─── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-slate-700">
            照合リスト
            <span className="ml-2 text-slate-400 font-normal text-sm">
              （{checks.filter(c => c.match_status === 'pending').length}件 未確認）
            </span>
          </h2>
          <button
            onClick={loadChecks}
            disabled={loadingChecks}
            className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-2 py-1 rounded"
          >
            {loadingChecks ? '...' : '更新'}
          </button>
        </div>

        {checks.length === 0 && !loadingChecks && (
          <p className="text-slate-400 text-sm py-4 text-center">物件がありません。上から取り込んでください。</p>
        )}

        <div className="space-y-3">
          {checks.map(c => {
            const st = STATUS_CONFIG[c.match_status]
            const isActive = activeCheckId === c.id

            return (
              <div key={c.id} className="border border-slate-200 rounded-lg overflow-hidden">
                {/* 物件ヘッダー */}
                <div className="px-4 py-3 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-slate-800 truncate">
                        {c.property_name ?? '（物件名なし）'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${st.color}`}>
                        {st.label}
                      </span>
                      {c.match_score !== null && (
                        <span className="text-xs text-slate-400">{c.match_score}点</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                      {c.address    && <span>{c.address}</span>}
                      {c.price_man  && <span>{c.price_man.toLocaleString()}万円</span>}
                      {c.area_sqm   && <span>{c.area_sqm}㎡</span>}
                      {c.floor_plan && <span>{c.floor_plan}</span>}
                      {c.station    && <span>{c.station} 徒歩{c.walk_minutes}分</span>}
                    </div>
                    {/* 一致判定バー */}
                    {c.match_score !== null && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-slate-100 rounded-full w-48">
                          <div
                            className={`h-1.5 rounded-full ${st.bar}`}
                            style={{ width: `${c.match_score}%` }}
                          />
                        </div>
                        {c.matched_items?.length > 0 && (
                          <div className="text-xs text-slate-400 mt-1">
                            一致: {c.matched_items.join(' / ')}
                          </div>
                        )}
                        {c.unmatched_items?.length > 0 && (
                          <div className="text-xs text-red-400 mt-0.5">
                            不一致: {c.unmatched_items.join(' / ')}
                          </div>
                        )}
                        {/* 顧客提案との連携表示 */}
                        <div className={`text-xs mt-1 font-medium ${
                          c.match_status === 'confirmed' ? 'text-green-700' :
                          c.match_status === 'not_found' ? 'text-orange-600' : 'text-slate-500'
                        }`}>
                          {c.match_status === 'confirmed' && '→ 当社提案可能性あり'}
                          {c.match_status === 'not_found' && '→ 元付・掲載元確認が必要'}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {/* レインズ検索キーワードコピー */}
                    {c.search_keywords && (c.search_keywords as string[]).length > 0 && (
                      <div className="flex flex-col gap-1">
                        {(c.search_keywords as string[]).slice(0, 2).map((k: string) => (
                          <button
                            key={k}
                            onClick={() => copyKeyword(k)}
                            title="レインズ検索用コピー"
                            className={`text-xs px-2 py-1 rounded border transition-colors ${
                              copied === k
                                ? 'bg-green-100 border-green-300 text-green-700'
                                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {copied === k ? '✓' : '📋'} {k.length > 18 ? k.slice(0, 18) + '…' : k}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setActiveCheckId(isActive ? null : c.id)}
                      className="text-xs border border-blue-300 text-blue-600 px-3 py-1 rounded hover:bg-blue-50 transition-colors self-start"
                    >
                      {isActive ? '閉じる' : 'レインズ結果を貼る'}
                    </button>
                    <button
                      onClick={() => deleteCheck(c.id)}
                      className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded"
                    >
                      削除
                    </button>
                  </div>
                </div>

                {/* レインズ結果入力パネル */}
                {isActive && (
                  <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs text-slate-500 mb-2">
                      レインズにログイン後、検索結果のテキストをそのまま貼り付けてください。
                      複数物件が含まれていても構いません。
                    </p>
                    <textarea
                      value={reinsInput}
                      onChange={e => setReinsInput(e.target.value)}
                      rows={6}
                      placeholder="レインズの検索結果テキストをここに貼り付け..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-mono resize-none mb-3"
                    />
                    <button
                      onClick={() => matchReins(c.id)}
                      disabled={matching || !reinsInput.trim()}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
                    >
                      {matching ? '照合中...' : '照合する'}
                    </button>
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
