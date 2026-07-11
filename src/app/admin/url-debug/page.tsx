'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AreaDebugResult, DebugStatus, Portal, TEST_CONDITION } from '@/lib/urlDebug'

// ── 定数 ─────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<DebugStatus, string> = {
  OK:                       'OK',
  PARAM_MISSING:            'パラメータ未登録',
  URL_INVALID:              'URL生成失敗',
  ZERO_RESULTS:             '0件',
  CRAWL_FAILED:             'クロール失敗',
  CONDITION_NOT_REFLECTED:  '条件未反映',
  NEED_MANUAL_CHECK:        '要確認',
}

const STATUS_CLASS: Record<DebugStatus, string> = {
  OK:                       'bg-green-100 text-green-800',
  PARAM_MISSING:            'bg-red-100 text-red-800',
  URL_INVALID:              'bg-red-100 text-red-800',
  ZERO_RESULTS:             'bg-yellow-100 text-yellow-800',
  CRAWL_FAILED:             'bg-red-100 text-red-800',
  CONDITION_NOT_REFLECTED:  'bg-orange-100 text-orange-800',
  NEED_MANUAL_CHECK:        'bg-yellow-100 text-yellow-800',
}

const AREA_TYPE_LABEL: Record<string, string> = {
  station: '駅', ward: '区', city: '市', town: '町', prefecture: '都道府県',
}

const PORTAL_COLOR: Record<Portal, string> = {
  suumo:  'text-green-700',
  athome: 'text-blue-700',
  homes:  'text-orange-700',
}

// ── SQL モーダル ──────────────────────────────────────────────────────────
function SqlModal({ sql, onClose }: { sql: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">修正用 INSERT SQL</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>
        <pre className="bg-gray-900 text-green-300 text-xs rounded-lg p-4 overflow-auto max-h-96 font-mono whitespace-pre-wrap break-all">{sql}</pre>
        <div className="flex gap-3 mt-4 justify-end">
          <button
            onClick={copy}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            {copied ? '✅ コピー完了' : 'クリップボードにコピー'}
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">閉じる</button>
        </div>
      </div>
    </div>
  )
}

// ── ポータルセル（URL開く / verified更新 / notes編集）───────────────────
function PortalCell({
  areaId,
  portal,
  pr,
  onUpdated,
}: {
  areaId: string
  portal: Portal
  pr: { status: DebugStatus; generatedUrl?: string | null; verified?: boolean; notes?: string | null; portal: Portal }
  onUpdated: (msg: string) => void
}) {
  const [notes, setNotes]     = useState(pr.notes ?? '')
  const [editing, setEditing] = useState(false)
  const [busy, setBusy]       = useState(false)

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true)
    const res = await fetch('/api/admin/url-debug/update-param', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ area_id: areaId, portal, ...body }),
    })
    setBusy(false)
    if (!res.ok) { onUpdated('❌ 更新失敗'); return false }
    return true
  }

  const setVerified = async () => {
    if (await patch({ verified: true, notes: `URL確認済み ${new Date().toISOString().slice(0,10)}` })) {
      onUpdated('✅ verified=true に更新しました')
    }
  }

  const setInvalid = async () => {
    if (await patch({ status: 'URL_INVALID', verified: false })) {
      onUpdated('🔴 URL_INVALID に設定しました')
    }
  }

  const saveNotes = async () => {
    if (await patch({ notes })) {
      setEditing(false)
      onUpdated('💬 notes を更新しました')
    }
  }

  return (
    <td className="px-3 py-3 align-top">
      <div className="flex flex-col gap-1 min-w-[130px]">
        {/* ステータスバッジ */}
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[pr.status]}`}>
          {pr.status === 'OK'               ? '✅ OK'
            : pr.status === 'PARAM_MISSING'  ? '❌ 未登録'
            : pr.status === 'NEED_MANUAL_CHECK' ? '⚠️ 要確認'
            : pr.status === 'CONDITION_NOT_REFLECTED' ? '⚠️ 条件NG'
            : pr.status === 'URL_INVALID'    ? '🔴 URL無効'
            : `⚠️ ${STATUS_LABEL[pr.status]}`}
        </span>

        {/* URLを開くボタン */}
        {pr.generatedUrl && (
          <a
            href={pr.generatedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100"
          >
            🔗 URLを開く
          </a>
        )}

        {/* verified=true / URL_INVALID ボタン */}
        {pr.status !== 'PARAM_MISSING' && (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={setVerified}
              disabled={busy}
              className="text-xs px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded hover:bg-green-200 disabled:opacity-50"
            >
              ✓ 確認済
            </button>
            <button
              onClick={setInvalid}
              disabled={busy}
              className="text-xs px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded hover:bg-red-200 disabled:opacity-50"
            >
              ✗ 無効
            </button>
          </div>
        )}

        {/* notes 表示 / 編集 */}
        {editing ? (
          <div className="flex flex-col gap-1 mt-1">
            <input
              autoFocus
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="text-xs border border-gray-300 rounded px-1.5 py-0.5 w-full"
              onKeyDown={e => { if (e.key === 'Enter') saveNotes(); if (e.key === 'Escape') setEditing(false) }}
            />
            <div className="flex gap-1">
              <button onClick={saveNotes} disabled={busy}
                className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                保存
              </button>
              <button onClick={() => setEditing(false)}
                className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-left text-xs text-gray-400 hover:text-gray-700 truncate max-w-[130px] mt-0.5"
            title={notes || 'notes を編集'}
          >
            {notes ? `📝 ${notes}` : '+ notes'}
          </button>
        )}
      </div>
    </td>
  )
}

// ── メインコンポーネント ──────────────────────────────────────────────────
function UrlDebugPageInner() {
  const sp = useSearchParams()

  const [results, setResults]           = useState<AreaDebugResult[]>([])
  const [loading, setLoading]           = useState(false)
  const [onlyMissing, setOnlyMissing]   = useState(sp.get('onlyMissing') === 'true')
  const [onlyUnverified, setOnlyUnverified] = useState(sp.get('onlyUnverified') === 'true')
  const [pref, setPref]                 = useState(sp.get('prefecture') ?? '')
  const [areaType, setAreaType]         = useState(sp.get('areaType') ?? '')
  const [portalFilter, setPortalFilter] = useState<Portal | ''>((sp.get('portal') as Portal) ?? '')
  const [areaSearch, setAreaSearch]     = useState(sp.get('area') ?? '')
  const [txType, setTxType]             = useState<'sale' | 'rent'>((sp.get('txType') as 'sale' | 'rent') ?? 'sale')
  const [sqlModal, setSqlModal]         = useState<string | null>(null)
  const [toast, setToast]               = useState<string | null>(null)
  const [reloadKey, setReloadKey]       = useState(0)

  // 集計（フィルタ前の全データ）
  const total      = results.length
  const missingAny = results.filter(r => r.missingCount > 0).length
  const byPortal   = (['suumo','athome','homes'] as Portal[]).map(p => ({
    portal: p,
    missing:    results.filter(r => r.results.find(pr => pr.portal === p && pr.status === 'PARAM_MISSING')).length,
    unverified: results.filter(r => r.results.find(pr => pr.portal === p && pr.status === 'NEED_MANUAL_CHECK')).length,
  }))

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({
      ...(onlyMissing ? { onlyMissing: 'true' } : {}),
      ...(pref     ? { prefecture: pref }     : {}),
      ...(areaType ? { areaType }              : {}),
      txType,
    })
    const res  = await fetch(`/api/admin/url-debug?${qs}`)
    const data = await res.json()
    setResults(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [onlyMissing, pref, areaType, txType, reloadKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  // クライアント側フィルタ（エリア名検索 + verified=false絞り込み）
  const displayed = results.filter(r => {
    if (areaSearch) {
      const q = areaSearch.trim()
      if (!r.master.display_name.includes(q)) return false
    }
    if (onlyUnverified) {
      const portals = portalFilter ? [portalFilter] : (['suumo','athome','homes'] as Portal[])
      const hasUnverified = portals.some(p =>
        r.results.find(pr => pr.portal === p && pr.status === 'NEED_MANUAL_CHECK')
      )
      if (!hasUnverified) return false
    }
    return true
  })

  // 表示するポータル列
  const visiblePortals = (portalFilter ? [portalFilter] : ['suumo','athome','homes']) as Portal[]

  // 全件 SQL 生成
  const generateAllSql = () => {
    const lines: string[] = ['-- 欠落 portal_area_params 修正用 INSERT SQL', '-- verified=false で登録後、目視確認の上 verified=true に更新してください', '']
    for (const r of results) {
      for (const pr of r.results) {
        if (pr.status === 'PARAM_MISSING' && pr.suggestedParamValue) {
          const pref2 = r.master.prefecture === '神奈川県' ? 'kanagawa' : 'tokyo'
          const isQuery = pr.portal === 'suumo' && pr.suggestedParamValue.startsWith('ta=')
          const pt = isQuery ? 'query' : 'station_path'
          lines.push(
            `INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes)`,
            `SELECT id, '${pr.portal}', '${pt}', '${pr.suggestedParamValue}', false, '要確認：推測URL自動生成'`,
            `FROM area_masters WHERE id = '${r.master.id}';  -- ${r.master.display_name} (${pref2})`,
            '',
          )
        }
      }
    }
    setSqlModal(lines.join('\n'))
  }

  const exportCsv = () => { window.location.href = '/api/admin/url-debug/export' }

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">URL生成デバッグ</h1>
      <p className="text-sm text-gray-500 mb-6">
        area_masters 全件 × SUUMO / athome / HOME'S の portal_area_params 登録状況と URL生成チェック
      </p>

      {/* 警告バナー */}
      {!loading && missingAny > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex flex-wrap gap-4 items-center">
          <span className="text-red-700 font-semibold">⚠️ URL生成パラメータ未登録: {missingAny} エリア</span>
          {byPortal.map(b => b.missing > 0 && (
            <span key={b.portal} className="text-red-600 text-sm">
              {b.portal}: {b.missing}件未登録
            </span>
          ))}
        </div>
      )}

      {/* テスト条件表示 */}
      <div className={`mb-4 border rounded-lg px-4 py-2 text-sm flex flex-wrap gap-4 ${txType === 'rent' ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
        <span className="font-medium">テスト条件:</span>
        <span>{txType === 'rent' ? '賃貸' : '売買 中古マンション'}</span>
        {txType === 'rent' ? (
          <><span>賃料 10〜20万円/月</span><span>面積 40㎡以上</span></>
        ) : (
          <><span>価格 {TEST_CONDITION.priceMin}〜{TEST_CONDITION.priceMax}万円</span><span>面積 {TEST_CONDITION.areaMin}㎡以上</span></>
        )}
        <span>徒歩 {TEST_CONDITION.walk}分以内</span>
        <span>築 {TEST_CONDITION.age}年以内</span>
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        {/* エリア名検索 */}
        <input
          type="text"
          value={areaSearch}
          onChange={e => setAreaSearch(e.target.value)}
          placeholder="エリア名で絞り込み"
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white w-40"
        />

        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyMissing}
            onChange={e => setOnlyMissing(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          欠落・要確認のみ
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyUnverified}
            onChange={e => setOnlyUnverified(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          verified=false のみ
        </label>

        <select
          value={pref}
          onChange={e => setPref(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="">全都道府県</option>
          <option value="東京都">東京都</option>
          <option value="神奈川県">神奈川県</option>
        </select>

        <select
          value={areaType}
          onChange={e => setAreaType(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="">全種別</option>
          <option value="station">駅</option>
          <option value="ward">区</option>
          <option value="city">市</option>
        </select>

        <select
          value={txType}
          onChange={e => setTxType(e.target.value as 'sale' | 'rent')}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white font-medium"
        >
          <option value="sale">売買</option>
          <option value="rent">賃貸</option>
        </select>

        <select
          value={portalFilter}
          onChange={e => setPortalFilter(e.target.value as Portal | '')}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="">全ポータル</option>
          <option value="suumo">SUUMO のみ</option>
          <option value="athome">athome のみ</option>
          <option value="homes">HOME'S のみ</option>
        </select>

        <button onClick={() => setReloadKey(k => k + 1)} disabled={loading}
          className="text-sm px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50">
          {loading ? '読込中…' : '再読込'}
        </button>

        <div className="ml-auto flex gap-2">
          <button onClick={generateAllSql}
            className="text-sm px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            修正用SQL生成
          </button>
          <button onClick={exportCsv}
            className="text-sm px-3 py-1.5 bg-green-700 text-white rounded-lg hover:bg-green-800">
            CSVエクスポート
          </button>
        </div>
      </div>

      {/* 集計バー */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <span className="text-gray-600">表示: <strong>{displayed.length}</strong> / {total} エリア</span>
        {byPortal.map(b => (
          <span key={b.portal} className={PORTAL_COLOR[b.portal as Portal]}>
            {b.portal}: 未登録 <strong>{b.missing}</strong> / 要確認 <strong>{b.unverified}</strong>
          </span>
        ))}
      </div>

      {/* テーブル */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">読込中…</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          {onlyMissing || onlyUnverified ? '該当なし ✅' : 'データなし'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-medium">エリア名</th>
                <th className="text-left px-4 py-3 font-medium">種別</th>
                <th className="text-left px-4 py-3 font-medium">都道府県</th>
                {visiblePortals.map(p => (
                  <th key={p} className="text-left px-3 py-3 font-medium min-w-[160px]">
                    {p === 'suumo' ? 'SUUMO' : p === 'athome' ? 'athome' : "HOME'S"}
                  </th>
                ))}
                <th className="text-center px-3 py-3 font-medium">欠落</th>
                <th className="text-center px-3 py-3 font-medium">SQL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayed.map(({ master, results: prs, missingCount, unverifiedCount }) => {
                const rowMissingSql = prs
                  .filter(pr => pr.status === 'PARAM_MISSING' && pr.suggestedParamValue)
                  .map(pr => {
                    const pref2 = master.prefecture === '神奈川県' ? 'kanagawa' : 'tokyo'
                    const isQuery = pr.portal === 'suumo' && pr.suggestedParamValue!.startsWith('ta=')
                    const pt = isQuery ? 'query' : 'station_path'
                    return [
                      `INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes)`,
                      `SELECT id, '${pr.portal}', '${pt}', '${pr.suggestedParamValue}', false, '要確認：推測URL自動生成'`,
                      `FROM area_masters WHERE id = '${master.id}';  -- ${master.display_name} (${pref2})`,
                    ].join('\n')
                  }).join('\n\n')

                return (
                  <tr key={master.id} className={missingCount > 0 ? 'bg-red-50' : unverifiedCount > 0 ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {master.display_name}
                      {master.line_name && <div className="text-xs text-gray-400">{master.line_name}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {AREA_TYPE_LABEL[master.area_type] ?? master.area_type}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{master.prefecture}</td>

                    {visiblePortals.map(portal => {
                      const pr = prs.find(p => p.portal === portal)!
                      return (
                        <PortalCell
                          key={portal}
                          areaId={master.id}
                          portal={portal}
                          pr={pr}
                          onUpdated={showToast}
                        />
                      )
                    })}

                    <td className="px-3 py-3 text-center align-top">
                      {missingCount > 0
                        ? <span className="font-bold text-red-700">{missingCount}</span>
                        : unverifiedCount > 0
                          ? <span className="font-bold text-yellow-600">△{unverifiedCount}</span>
                          : <span className="text-gray-300">—</span>}
                    </td>

                    <td className="px-3 py-3 text-center align-top">
                      {rowMissingSql ? (
                        <button
                          onClick={() => setSqlModal(rowMissingSql)}
                          className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                        >
                          SQL
                        </button>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* SQL モーダル */}
      {sqlModal && <SqlModal sql={sqlModal} onClose={() => setSqlModal(null)} />}

      {/* トースト */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}

export default function UrlDebugPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">読み込み中...</div>}>
      <UrlDebugPageInner />
    </Suspense>
  )
}
