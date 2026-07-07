'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CustomerWithCondition } from '@/types'

interface GeneratedUrls {
  suumo: string
  athome: string
  homes: string
}

interface Props {
  initial?: Partial<CustomerWithCondition>
  customerId?: string
}

const FIELD = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white'
const LABEL = 'block text-sm font-medium text-slate-700 mb-1'
const SECTION = 'bg-white rounded-xl border border-slate-200 p-6'

export default function CustomerForm({ initial, customerId }: Props) {
  const router = useRouter()
  const isNew = !customerId
  const cond = initial?.customer_conditions?.[0]
  const existingUrls = initial?.customer_search_urls ?? []

  const [form, setForm] = useState({
    customer_no: initial?.customer_no ?? '',
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    rank: initial?.rank ?? 'C',
    status: initial?.status ?? 'active',
    sales_memo: initial?.sales_memo ?? '',
    transaction_type: (cond?.transaction_type ?? 'sale') as 'sale' | 'rent',
    area: cond?.area ?? '',
    property_type: cond?.property_type ?? '',
    // 売買
    budget_min: String(cond?.budget_min ?? ''),
    budget_max: String(cond?.budget_max ?? ''),
    // 賃貸
    rent_min: String(cond?.rent_min ?? ''),
    rent_max: String(cond?.rent_max ?? ''),
    // 共通
    area_sqm_min: String(cond?.area_sqm_min ?? ''),
    area_sqm_max: String(cond?.area_sqm_max ?? ''),
    walk_minutes_max: String(cond?.walk_minutes_max ?? ''),
    building_age_max: String(cond?.building_age_max ?? ''),
    other_conditions: cond?.other_conditions ?? '',
  })

  const [searchUrls, setSearchUrls] = useState<GeneratedUrls>({
    suumo: existingUrls.find(u => u.site === 'suumo')?.url ?? '',
    athome: existingUrls.find(u => u.site === 'athome')?.url ?? '',
    homes: existingUrls.find(u => u.site === 'homes')?.url ?? '',
  })

  const [generatedUrls, setGeneratedUrls] = useState<GeneratedUrls | null>(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [loadingNo, setLoadingNo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 新規作成時: 顧客No自動採番
  useEffect(() => {
    if (!isNew) return
    setLoadingNo(true)
    fetch('/api/customers/next-no')
      .then(r => r.json())
      .then(d => set('customer_no', d.next_no ?? ''))
      .finally(() => setLoadingNo(false))
  }, [isNew])

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  // 条件から検索URLを自動生成（保存はしない）
  async function generateUrls() {
    setGenerating(true)
    setGeneratedUrls(null)

    // 新規の場合は現在のフォーム内容からURLを構築
    if (isNew) {
      const urls = buildUrlsFromForm()
      setGeneratedUrls(urls)
      setGenerating(false)
      return
    }

    // 既存顧客の場合はAPIから取得
    const res = await fetch(`/api/search-urls?customer_id=${customerId}`)
    if (res.ok) {
      const data = await res.json()
      setGeneratedUrls(data)
    }
    setGenerating(false)
  }

  // フォーム内容からURLを直接構築
  function buildUrlsFromForm(): GeneratedUrls {
    const suumoParams = new URLSearchParams()
    suumoParams.set('ar', '030')
    suumoParams.set('bs', '011')
    suumoParams.set('ta', '13')
    if (form.budget_max) suumoParams.set('pt', String(parseInt(form.budget_max) * 10000))
    if (form.budget_min) suumoParams.set('pf', String(parseInt(form.budget_min) * 10000))
    if (form.area_sqm_min) suumoParams.set('mf', form.area_sqm_min)
    if (form.walk_minutes_max) suumoParams.set('et', form.walk_minutes_max)
    if (form.building_age_max) suumoParams.set('cnf', form.building_age_max)

    const athomeParams = new URLSearchParams()
    athomeParams.set('tp', '3')
    if (form.budget_max) athomeParams.set('sp', form.budget_max)
    if (form.area_sqm_min) athomeParams.set('ts', form.area_sqm_min)
    if (form.walk_minutes_max) athomeParams.set('wr', form.walk_minutes_max)

    const homesParams = new URLSearchParams()
    homesParams.set('done', 'bukken')
    homesParams.set('lb', '13')
    if (form.budget_max) homesParams.set('kk', form.budget_max)
    if (form.area_sqm_min) homesParams.set('ms', form.area_sqm_min)
    if (form.walk_minutes_max) homesParams.set('wr', form.walk_minutes_max)
    if (form.building_age_max) homesParams.set('ky', form.building_age_max)

    return {
      suumo: `https://suumo.jp/jj/bukken/ichiran/JJ012FC001/?${suumoParams}`,
      athome: `https://www.athome.co.jp/mansion/chuko/13/list/?${athomeParams}`,
      homes: `https://www.homes.co.jp/mansion/chuko/13/list/?${homesParams}`,
    }
  }

  function applyGeneratedUrls() {
    if (!generatedUrls) return
    setSearchUrls({ suumo: generatedUrls.suumo, athome: generatedUrls.athome, homes: generatedUrls.homes })
    setGeneratedUrls(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const method = customerId ? 'PATCH' : 'POST'
      const endpoint = customerId ? `/api/customers/${customerId}` : '/api/customers'
      const isSale = form.transaction_type === 'sale'
      const payload = {
        ...form,
        budget_min: isSale && form.budget_min ? parseInt(form.budget_min) : null,
        budget_max: isSale && form.budget_max ? parseInt(form.budget_max) : null,
        rent_min: !isSale && form.rent_min ? parseInt(form.rent_min) : null,
        rent_max: !isSale && form.rent_max ? parseInt(form.rent_max) : null,
        area_sqm_min: form.area_sqm_min ? parseFloat(form.area_sqm_min) : null,
        area_sqm_max: form.area_sqm_max ? parseFloat(form.area_sqm_max) : null,
        walk_minutes_max: form.walk_minutes_max ? parseInt(form.walk_minutes_max) : null,
        building_age_max: form.building_age_max ? parseInt(form.building_age_max) : null,
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? '保存失敗')
      }
      const customer = await res.json()
      const targetId = customerId ?? customer.id

      // 検索URLを保存（入力されているもののみ）
      for (const [site, url] of Object.entries(searchUrls)) {
        if (url.trim()) {
          await fetch('/api/search-urls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_id: targetId, site, url: url.trim(), transaction_type: form.transaction_type }),
          })
        }
      }

      router.push(`/customers/${targetId}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const siteLabels: Record<string, string> = {
    suumo: 'SUUMO',
    athome: 'アットホーム',
    homes: "LIFULL HOME'S",
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {/* ── 基本情報 ── */}
      <div className={SECTION}>
        <h2 className="font-semibold text-lg mb-4 text-slate-800">基本情報</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>
              顧客No
              {isNew && <span className="ml-2 text-xs text-slate-400">（自動採番）</span>}
            </label>
            <input
              className={FIELD + ' font-mono'}
              value={loadingNo ? '採番中...' : form.customer_no}
              onChange={e => set('customer_no', e.target.value)}
              required
            />
          </div>
          <div>
            <label className={LABEL}>顧客名 <span className="text-red-400">*</span></label>
            <input
              className={FIELD}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
              placeholder="例: 山田 太郎"
            />
          </div>
          <div>
            <label className={LABEL}>メールアドレス</label>
            <input
              type="email"
              className={FIELD}
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="example@email.com"
            />
          </div>
          <div>
            <label className={LABEL}>電話番号</label>
            <input
              className={FIELD}
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="090-0000-0000"
            />
          </div>
          <div>
            <label className={LABEL}>顧客ランク</label>
            <select className={FIELD} value={form.rank} onChange={e => set('rank', e.target.value)}>
              <option value="A">A ランク（優先）</option>
              <option value="B">B ランク（通常）</option>
              <option value="C">C ランク（様子見）</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>ステータス</label>
            <select className={FIELD} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="active">アクティブ</option>
              <option value="inactive">非アクティブ</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={LABEL}>営業メモ</label>
            <textarea
              className={FIELD}
              rows={3}
              value={form.sales_memo}
              onChange={e => set('sales_memo', e.target.value)}
              placeholder="商談メモ・注意事項など"
            />
          </div>
        </div>
      </div>

      {/* ── 希望条件 ── */}
      <div className={SECTION}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg text-slate-800">希望条件</h2>
          {/* 売買/賃貸 トグル */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {(['sale', 'rent'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => set('transaction_type', t)}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                  form.transaction_type === t
                    ? t === 'sale'
                      ? 'bg-blue-600 text-white'
                      : 'bg-purple-600 text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {t === 'sale' ? '売買' : '賃貸'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>希望エリア</label>
            <input
              className={FIELD}
              value={form.area}
              onChange={e => set('area', e.target.value)}
              placeholder="例: 港区・渋谷区・目黒区"
            />
          </div>
          <div>
            <label className={LABEL}>物件種別</label>
            <select className={FIELD} value={form.property_type} onChange={e => set('property_type', e.target.value)}>
              <option value="">選択してください</option>
              {form.transaction_type === 'sale' ? (
                <>
                  <option value="中古マンション">中古マンション</option>
                  <option value="新築マンション">新築マンション</option>
                  <option value="中古一戸建て">中古一戸建て</option>
                  <option value="新築一戸建て">新築一戸建て</option>
                  <option value="土地">土地</option>
                </>
              ) : (
                <>
                  <option value="マンション">マンション</option>
                  <option value="アパート">アパート</option>
                  <option value="一戸建て">一戸建て</option>
                  <option value="店舗・事務所">店舗・事務所</option>
                  <option value="その他">その他</option>
                </>
              )}
            </select>
          </div>

          {/* 売買: 予算 */}
          {form.transaction_type === 'sale' ? (
            <>
              <div>
                <label className={LABEL}>予算下限（万円）</label>
                <input
                  type="number"
                  className={FIELD}
                  value={form.budget_min}
                  onChange={e => set('budget_min', e.target.value)}
                  placeholder="例: 3000"
                  min="0"
                />
              </div>
              <div>
                <label className={LABEL}>予算上限（万円）</label>
                <input
                  type="number"
                  className={FIELD}
                  value={form.budget_max}
                  onChange={e => set('budget_max', e.target.value)}
                  placeholder="例: 8000"
                  min="0"
                />
              </div>
            </>
          ) : (
            /* 賃貸: 賃料 */
            <>
              <div>
                <label className={LABEL}>賃料下限（円/月）</label>
                <input
                  type="number"
                  className={FIELD}
                  value={form.rent_min}
                  onChange={e => set('rent_min', e.target.value)}
                  placeholder="例: 100000"
                  min="0"
                />
              </div>
              <div>
                <label className={LABEL}>賃料上限（円/月）</label>
                <input
                  type="number"
                  className={FIELD}
                  value={form.rent_max}
                  onChange={e => set('rent_max', e.target.value)}
                  placeholder="例: 300000"
                  min="0"
                />
              </div>
            </>
          )}
          <div>
            <label className={LABEL}>面積下限（㎡）</label>
            <input
              type="number"
              step="0.01"
              className={FIELD}
              value={form.area_sqm_min}
              onChange={e => set('area_sqm_min', e.target.value)}
              placeholder="例: 60"
              min="0"
            />
          </div>
          <div>
            <label className={LABEL}>面積上限（㎡）</label>
            <input
              type="number"
              step="0.01"
              className={FIELD}
              value={form.area_sqm_max}
              onChange={e => set('area_sqm_max', e.target.value)}
              placeholder="例: 120"
              min="0"
            />
          </div>
          <div>
            <label className={LABEL}>駅徒歩（分以内）</label>
            <select className={FIELD} value={form.walk_minutes_max} onChange={e => set('walk_minutes_max', e.target.value)}>
              <option value="">指定なし</option>
              {[1,3,5,7,10,15,20].map(n => (
                <option key={n} value={n}>{n}分以内</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>築年数（年以内）</label>
            <select className={FIELD} value={form.building_age_max} onChange={e => set('building_age_max', e.target.value)}>
              <option value="">指定なし</option>
              {[1,3,5,10,15,20,25,30].map(n => (
                <option key={n} value={n}>{n}年以内</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className={LABEL}>その他条件</label>
            <textarea
              className={FIELD}
              rows={2}
              value={form.other_conditions}
              onChange={e => set('other_conditions', e.target.value)}
              placeholder="例: 南向き希望、オートロック必須、ペット可など"
            />
          </div>
        </div>
      </div>

      {/* ── 検索URL ── */}
      <div className={SECTION}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-lg text-slate-800">検索URL</h2>
            <p className="text-xs text-slate-400 mt-0.5">各サイトで条件を設定した検索結果URLを貼り付けてください</p>
          </div>
          <button
            type="button"
            onClick={generateUrls}
            disabled={generating}
            className="text-sm border border-slate-300 px-4 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {generating ? (
              <><span className="animate-spin inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full"></span>生成中...</>
            ) : (
              '条件からURL自動生成'
            )}
          </button>
        </div>

        {/* 生成されたURL確認パネル */}
        {generatedUrls && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-blue-800 mb-3">
              以下のURLが生成されました。内容を確認して「このURLを保存」を押してください。
            </p>
            <div className="space-y-2 mb-4">
              {(['suumo', 'athome', 'homes'] as const).map(site => (
                <div key={site} className="bg-white rounded p-2 border border-blue-100">
                  <span className="text-xs font-bold text-blue-600 block mb-1">{siteLabels[site]}</span>
                  <a
                    href={generatedUrls[site]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-700 hover:underline break-all"
                  >
                    {generatedUrls[site]}
                  </a>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={applyGeneratedUrls}
                className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
              >
                このURLを保存
              </button>
              <button
                type="button"
                onClick={() => setGeneratedUrls(null)}
                className="text-sm text-slate-500 px-4 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {(['suumo', 'athome', 'homes'] as const).map(site => (
            <div key={site}>
              <label className={LABEL}>{siteLabels[site]}</label>
              <div className="flex gap-2">
                <input
                  className={FIELD}
                  placeholder="https://..."
                  value={searchUrls[site]}
                  onChange={e => setSearchUrls(u => ({ ...u, [site]: e.target.value }))}
                />
                {searchUrls[site] && (
                  <a
                    href={searchUrls[site]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 border border-slate-200 px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    確認
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 送信ボタン ── */}
      <div className="flex gap-3 pb-6">
        <button
          type="submit"
          disabled={saving || loadingNo}
          className="bg-slate-800 text-white px-8 py-2.5 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors font-medium"
        >
          {saving ? '保存中...' : isNew ? '顧客を登録する' : '変更を保存する'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-slate-300 px-6 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}
