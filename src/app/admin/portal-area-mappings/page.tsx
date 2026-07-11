'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── 型定義 ───────────────────────────────────────────────
interface AliasRow    { id: string; alias: string }
interface ParamRow    { id: string; portal: string; param_type: string; portal_code: string | null; portal_url_param: string }
interface AreaMaster  {
  id: string; area_type: string; display_name: string
  prefecture: string | null; city: string | null; ward: string | null
  station_name: string | null; station_ward: string | null; line_name: string | null; yomi: string | null
  area_aliases: AliasRow[]
  portal_area_params: ParamRow[]
}
interface UnresolvedRow {
  id: string; portal: string; raw_area_name: string; normalized_area_name: string | null
  prefecture: string | null; occurrence_count: number; last_seen_at: string; status: string
}

const AREA_TYPES  = ['station', 'ward', 'city', 'town', 'prefecture'] as const
const PORTALS     = ['suumo', 'athome', 'homes'] as const
const PARAM_TYPES = ['query', 'path', 'station_path'] as const

const AREA_TYPE_LABELS: Record<string, string> = {
  station: '駅', ward: '区', city: '市', town: '町', prefecture: '都道府県',
}
const PORTAL_COLORS: Record<string, string> = {
  suumo: 'bg-green-100 text-green-700',
  athome: 'bg-blue-100 text-blue-700',
  homes: 'bg-orange-100 text-orange-700',
}

// ─── 追加フォームの初期値 ────────────────────────────────
const EMPTY_FORM = {
  display_name: '', area_type: 'station', prefecture: '', city: '', ward: '',
  station_name: '', station_ward: '', line_name: '', yomi: '',
  alias: '', portal: 'suumo', param_type: 'station_path', portal_code: '', portal_url_param: '',
}

// ─── メインコンポーネント ────────────────────────────────
export default function PortalAreaMappingsPage() {
  const [tab, setTab] = useState<'masters' | 'unresolved'>('masters')
  const [masters, setMasters] = useState<AreaMaster[]>([])
  const [unresolved, setUnresolved] = useState<UnresolvedRow[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // 追加フォーム
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [formLoading, setFormLoading] = useState(false)

  // 編集
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<AreaMaster>>({})

  // ── デバウンス検索 ───────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  // ── データ取得 ───────────────────────────────────────────
  const fetchMasters = useCallback(async () => {
    setLoading(true)
    const qs = debouncedSearch ? `?q=${encodeURIComponent(debouncedSearch)}` : ''
    const res = await fetch(`/api/admin/area-masters${qs}`)
    const data = await res.json()
    setMasters(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [debouncedSearch])

  const fetchUnresolved = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/unresolved-areas?status=unresolved')
    const data = await res.json()
    setUnresolved(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchMasters() }, [fetchMasters])
  useEffect(() => { fetchUnresolved() }, [fetchUnresolved])

  // ── トースト ─────────────────────────────────────────────
  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── 追加フォーム送信 ─────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true)
    const res = await fetch('/api/admin/area-masters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setFormLoading(false)
    if (!res.ok) { showToast(data.error ?? '追加失敗', 'err'); return }
    showToast('追加しました', 'ok')
    setForm({ ...EMPTY_FORM })
    setShowForm(false)
    fetchMasters()
    fetchUnresolved()
  }

  // ── 削除 ──────────────────────────────────────────────────
  async function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？\n関連するエイリアス・ポータルパラメータも削除されます。`)) return
    const res = await fetch(`/api/admin/area-masters/${id}`, { method: 'DELETE' })
    if (!res.ok) { showToast('削除失敗', 'err'); return }
    showToast('削除しました', 'ok')
    setMasters(prev => prev.filter(m => m.id !== id))
  }

  // ── 編集保存 ─────────────────────────────────────────────
  async function handleEditSave(id: string) {
    const res = await fetch(`/api/admin/area-masters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (!res.ok) { showToast('更新失敗', 'err'); return }
    showToast('更新しました', 'ok')
    setEditId(null)
    fetchMasters()
  }

  // ── 未解決エリアをignore ─────────────────────────────────
  async function handleIgnore(id: string) {
    const res = await fetch(`/api/admin/unresolved-areas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ignored' }),
    })
    if (!res.ok) { showToast('更新失敗', 'err'); return }
    setUnresolved(prev => prev.filter(r => r.id !== id))
  }

  // ── 未解決→追加フォームへ引き継ぎ ───────────────────────
  function handleAddFromUnresolved(row: UnresolvedRow) {
    setForm({
      ...EMPTY_FORM,
      display_name: row.normalized_area_name ?? row.raw_area_name,
      alias: row.raw_area_name,
      prefecture: row.prefecture ?? '',
      portal: row.portal,
    })
    setShowForm(true)
    setTab('masters')
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)
  }

  // ── 追加完了後に未解決を resolved にする ─────────────────
  async function resolveUnresolved(raw_area_name: string, portal: string, area_id: string) {
    const row = unresolved.find(r => r.raw_area_name === raw_area_name && r.portal === portal)
    if (!row) return
    await fetch(`/api/admin/unresolved-areas/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved', resolved_area_id: area_id }),
    })
    setUnresolved(prev => prev.filter(r => r.id !== row.id))
  }

  // ── フォーム送信後に未解決解決 ──────────────────────────
  async function handleAddWithResolve(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true)
    const res = await fetch('/api/admin/area-masters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setFormLoading(false)
    if (!res.ok) { showToast(data.error ?? '追加失敗', 'err'); return }

    // 対応する未解決エリアを resolved に
    if (form.alias && form.portal) {
      await resolveUnresolved(form.alias, form.portal, data.area_id)
    }
    showToast('追加しました', 'ok')
    setForm({ ...EMPTY_FORM })
    setShowForm(false)
    fetchMasters()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* トースト */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">エリアマスター管理</h1>
          <p className="text-sm text-slate-500 mt-1">area_masters / area_aliases / portal_area_params</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setForm({ ...EMPTY_FORM }) }}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700"
        >
          {showForm ? '✕ キャンセル' : '＋ エリア追加'}
        </button>
      </div>

      {/* 追加フォーム */}
      {showForm && (
        <form onSubmit={handleAddWithResolve} className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-4">エリア新規追加</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <Field label="display_name *" required>
              <input className={inp} value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} required />
            </Field>
            <Field label="area_type *" required>
              <select className={inp} value={form.area_type} onChange={e => setForm(f => ({ ...f, area_type: e.target.value }))}>
                {AREA_TYPES.map(t => <option key={t} value={t}>{t} ({AREA_TYPE_LABELS[t]})</option>)}
              </select>
            </Field>
            <Field label="prefecture">
              <input className={inp} value={form.prefecture} placeholder="東京都" onChange={e => setForm(f => ({ ...f, prefecture: e.target.value }))} />
            </Field>
            <Field label="city">
              <input className={inp} value={form.city} placeholder="港区" onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </Field>
            <Field label="ward">
              <input className={inp} value={form.ward} onChange={e => setForm(f => ({ ...f, ward: e.target.value }))} />
            </Field>
            <Field label="station_name">
              <input className={inp} value={form.station_name} onChange={e => setForm(f => ({ ...f, station_name: e.target.value }))} />
            </Field>
            <Field label="station_ward">
              <input className={inp} value={form.station_ward} placeholder="渋谷区" onChange={e => setForm(f => ({ ...f, station_ward: e.target.value }))} />
            </Field>
            <Field label="line_name">
              <input className={inp} value={form.line_name} placeholder="京王新線" onChange={e => setForm(f => ({ ...f, line_name: e.target.value }))} />
            </Field>
            <Field label="yomi">
              <input className={inp} value={form.yomi} placeholder="はつだい" onChange={e => setForm(f => ({ ...f, yomi: e.target.value }))} />
            </Field>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500 mb-3 font-medium">エイリアス（任意）</p>
            <div className="grid grid-cols-1 gap-4">
              <Field label="alias（例: 初台駅）">
                <input className={inp} value={form.alias} onChange={e => setForm(f => ({ ...f, alias: e.target.value }))} />
              </Field>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500 mb-3 font-medium">ポータルURLパラメータ（任意）</p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Field label="portal">
                <select className={inp} value={form.portal} onChange={e => setForm(f => ({ ...f, portal: e.target.value }))}>
                  {PORTALS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="param_type">
                <select className={inp} value={form.param_type} onChange={e => setForm(f => ({ ...f, param_type: e.target.value }))}>
                  {PARAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="portal_code">
                <input className={inp} value={form.portal_code} placeholder="13104" onChange={e => setForm(f => ({ ...f, portal_code: e.target.value }))} />
              </Field>
              <Field label="portal_url_param">
                <input className={inp} value={form.portal_url_param} placeholder="tokyo/eki_hatsudai" onChange={e => setForm(f => ({ ...f, portal_url_param: e.target.value }))} />
              </Field>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button type="submit" disabled={formLoading} className="bg-slate-800 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
              {formLoading ? '追加中...' : '追加する'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="border border-slate-300 text-slate-600 px-5 py-2 rounded-lg text-sm hover:bg-slate-50">
              キャンセル
            </button>
          </div>
        </form>
      )}

      {/* タブ */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        <TabBtn active={tab === 'masters'} onClick={() => setTab('masters')}>
          登録済みエリア <span className="ml-1 text-xs opacity-60">({masters.length})</span>
        </TabBtn>
        <TabBtn active={tab === 'unresolved'} onClick={() => setTab('unresolved')}>
          未解決エリア
          {unresolved.length > 0 && (
            <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{unresolved.length}</span>
          )}
        </TabBtn>
      </div>

      {/* 登録済みエリアタブ */}
      {tab === 'masters' && (
        <>
          {/* 検索 */}
          <div className="mb-4">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="検索: エリア名・エイリアス・都道府県・区・駅名所在区・URLパラメータ"
              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {loading ? (
            <p className="text-slate-400 text-sm py-8 text-center">読み込み中...</p>
          ) : masters.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">該当するエリアがありません</p>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['種別', '表示名', '都道府県', '市・区', '駅所在区', '路線', 'エイリアス', 'ポータルパラメータ', '操作'].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {masters.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        {editId === m.id ? (
                          // 編集行
                          <>
                            <td className="px-3 py-2">
                              <select className={`${inp} py-1`} value={editForm.area_type ?? ''} onChange={e => setEditForm(f => ({ ...f, area_type: e.target.value }))}>
                                {AREA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input className={`${inp} py-1`} value={editForm.display_name ?? ''} onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))} />
                            </td>
                            <td className="px-3 py-2">
                              <input className={`${inp} py-1`} value={editForm.prefecture ?? ''} onChange={e => setEditForm(f => ({ ...f, prefecture: e.target.value }))} />
                            </td>
                            <td className="px-3 py-2">
                              <input className={`${inp} py-1`} value={editForm.city ?? ''} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} />
                            </td>
                            <td className="px-3 py-2">
                              <input className={`${inp} py-1`} value={editForm.station_ward ?? ''} onChange={e => setEditForm(f => ({ ...f, station_ward: e.target.value }))} />
                            </td>
                            <td className="px-3 py-2">
                              <input className={`${inp} py-1`} value={editForm.line_name ?? ''} onChange={e => setEditForm(f => ({ ...f, line_name: e.target.value }))} />
                            </td>
                            <td className="px-3 py-2 text-slate-400 text-xs">（エイリアス編集は別途）</td>
                            <td className="px-3 py-2 text-slate-400 text-xs">（パラメータ編集は別途）</td>
                            <td className="px-3 py-2">
                              <div className="flex gap-1">
                                <button onClick={() => handleEditSave(m.id)} className="text-xs bg-slate-800 text-white px-2 py-1 rounded hover:bg-slate-700">保存</button>
                                <button onClick={() => setEditId(null)} className="text-xs border border-slate-300 text-slate-600 px-2 py-1 rounded hover:bg-slate-50">戻る</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          // 表示行
                          <>
                            <td className="px-3 py-2.5">
                              <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                {AREA_TYPE_LABELS[m.area_type] ?? m.area_type}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-medium text-slate-800">{m.display_name}</td>
                            <td className="px-3 py-2.5 text-slate-500">{m.prefecture ?? '—'}</td>
                            <td className="px-3 py-2.5 text-slate-500">{m.city ?? m.ward ?? '—'}</td>
                            <td className="px-3 py-2.5 text-slate-500">{m.station_ward ?? '—'}</td>
                            <td className="px-3 py-2.5 text-slate-500">{m.line_name ?? '—'}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap gap-1">
                                {m.area_aliases.map(a => (
                                  <span key={a.id} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">{a.alias}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-col gap-1">
                                {m.portal_area_params.map(p => (
                                  <div key={p.id} className="flex items-center gap-1.5">
                                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PORTAL_COLORS[p.portal] ?? 'bg-slate-100 text-slate-600'}`}>{p.portal}</span>
                                    <span className="text-xs text-slate-500 font-mono">{p.portal_url_param}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => { setEditId(m.id); setEditForm({ ...m }) }}
                                  className="text-xs border border-slate-300 text-slate-600 px-2 py-1 rounded hover:bg-slate-50"
                                >
                                  編集
                                </button>
                                <button
                                  onClick={() => handleDelete(m.id, m.display_name)}
                                  className="text-xs border border-red-200 text-red-600 px-2 py-1 rounded hover:bg-red-50"
                                >
                                  削除
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* 未解決エリアタブ */}
      {tab === 'unresolved' && (
        <>
          {loading ? (
            <p className="text-slate-400 text-sm py-8 text-center">読み込み中...</p>
          ) : unresolved.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <p className="text-green-600 font-medium">未解決エリアはありません</p>
              <p className="text-slate-400 text-sm mt-1">URL生成時に解決できなかったエリアがここに表示されます</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['エリア名', '正規化名', 'ポータル', '都道府県', '出現回数', '最終確認', '操作'].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unresolved.map(row => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-medium text-slate-800">{row.raw_area_name}</td>
                        <td className="px-3 py-2.5 text-slate-500">{row.normalized_area_name ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PORTAL_COLORS[row.portal] ?? 'bg-slate-100 text-slate-600'}`}>
                            {row.portal}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500">{row.prefecture ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs font-bold ${row.occurrence_count >= 3 ? 'text-red-600' : 'text-slate-700'}`}>
                            {row.occurrence_count}回
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                          {new Date(row.last_seen_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleAddFromUnresolved(row)}
                              className="text-xs bg-slate-800 text-white px-2 py-1 rounded hover:bg-slate-700 whitespace-nowrap"
                            >
                              マスターに追加
                            </button>
                            <button
                              onClick={() => handleIgnore(row.id)}
                              className="text-xs border border-slate-300 text-slate-400 px-2 py-1 rounded hover:bg-slate-50"
                            >
                              無視
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── 小コンポーネント ─────────────────────────────────────
function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

const inp = 'w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400'
