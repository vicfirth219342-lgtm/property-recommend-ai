'use client'
import { useState } from 'react'
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

const FIELD = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400'
const LABEL = 'block text-sm font-medium text-slate-700 mb-1'

export default function CustomerForm({ initial, customerId }: Props) {
  const router = useRouter()
  const cond = initial?.customer_conditions?.[0]
  const urls = initial?.customer_search_urls ?? []

  const [form, setForm] = useState({
    customer_no: initial?.customer_no ?? '',
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    rank: initial?.rank ?? 'C',
    status: initial?.status ?? 'active',
    sales_memo: initial?.sales_memo ?? '',
    area: cond?.area ?? '',
    property_type: cond?.property_type ?? '',
    budget_min: cond?.budget_min ?? '',
    budget_max: cond?.budget_max ?? '',
    area_sqm_min: cond?.area_sqm_min ?? '',
    area_sqm_max: cond?.area_sqm_max ?? '',
    walk_minutes_max: cond?.walk_minutes_max ?? '',
    building_age_max: cond?.building_age_max ?? '',
    other_conditions: cond?.other_conditions ?? '',
  })

  const [searchUrls, setSearchUrls] = useState<GeneratedUrls>({
    suumo: urls.find((u) => u.site === 'suumo')?.url ?? '',
    athome: urls.find((u) => u.site === 'athome')?.url ?? '',
    homes: urls.find((u) => u.site === 'homes')?.url ?? '',
  })

  const [generatedUrls, setGeneratedUrls] = useState<GeneratedUrls | null>(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const method = customerId ? 'PATCH' : 'POST'
      const endpoint = customerId ? `/api/customers/${customerId}` : '/api/customers'
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? '保存失敗')
      }
      const customer = await res.json()
      const targetId = customerId ?? customer.id

      // 検索URL保存
      for (const [site, url] of Object.entries(searchUrls)) {
        if (url) {
          await fetch('/api/search-urls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_id: targetId, site, url }),
          })
        }
      }

      router.push('/customers')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function generateUrls() {
    if (!customerId) return
    setGenerating(true)
    const res = await fetch(`/api/search-urls?customer_id=${customerId}`)
    if (res.ok) {
      const data = await res.json()
      setGeneratedUrls(data)
    }
    setGenerating(false)
  }

  function applyGeneratedUrls() {
    if (!generatedUrls) return
    setSearchUrls({ suumo: generatedUrls.suumo, athome: generatedUrls.athome, homes: generatedUrls.homes })
    setGeneratedUrls(null)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
      )}

      {/* 基本情報 */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-lg mb-4">基本情報</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>顧客No *</label>
            <input required className={FIELD} value={form.customer_no} onChange={(e) => set('customer_no', e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>顧客名 *</label>
            <input required className={FIELD} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>メールアドレス</label>
            <input type="email" className={FIELD} value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>電話番号</label>
            <input className={FIELD} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>顧客ランク</label>
            <select className={FIELD} value={form.rank} onChange={(e) => set('rank', e.target.value)}>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>ステータス</label>
            <select className={FIELD} value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="active">アクティブ</option>
              <option value="inactive">非アクティブ</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={LABEL}>営業メモ</label>
            <textarea className={FIELD} rows={3} value={form.sales_memo} onChange={(e) => set('sales_memo', e.target.value)} />
          </div>
        </div>
      </section>

      {/* 希望条件 */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-lg mb-4">希望条件</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>希望エリア</label>
            <input className={FIELD} placeholder="例: 港区・渋谷区" value={form.area} onChange={(e) => set('area', e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>物件種別</label>
            <input className={FIELD} placeholder="例: 中古マンション" value={form.property_type} onChange={(e) => set('property_type', e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>予算下限（万円）</label>
            <input type="number" className={FIELD} value={form.budget_min} onChange={(e) => set('budget_min', e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>予算上限（万円）</label>
            <input type="number" className={FIELD} value={form.budget_max} onChange={(e) => set('budget_max', e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>面積下限（㎡）</label>
            <input type="number" step="0.01" className={FIELD} value={form.area_sqm_min} onChange={(e) => set('area_sqm_min', e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>面積上限（㎡）</label>
            <input type="number" step="0.01" className={FIELD} value={form.area_sqm_max} onChange={(e) => set('area_sqm_max', e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>駅徒歩（分以内）</label>
            <input type="number" className={FIELD} value={form.walk_minutes_max} onChange={(e) => set('walk_minutes_max', e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>築年数（年以内）</label>
            <input type="number" className={FIELD} value={form.building_age_max} onChange={(e) => set('building_age_max', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className={LABEL}>その他条件</label>
            <textarea className={FIELD} rows={2} value={form.other_conditions} onChange={(e) => set('other_conditions', e.target.value)} />
          </div>
        </div>
      </section>

      {/* 検索URL */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg">検索URL</h2>
          {customerId && (
            <button
              type="button"
              onClick={generateUrls}
              disabled={generating}
              className="text-sm border border-slate-300 px-4 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              {generating ? '生成中...' : '条件からURL自動生成'}
            </button>
          )}
        </div>

        {generatedUrls && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-blue-700 mb-2">以下のURLが生成されました。確認後「このURLを保存」を押してください。</p>
            {(['suumo', 'athome', 'homes'] as const).map((site) => (
              <div key={site} className="mb-2">
                <span className="text-xs font-bold text-blue-600 uppercase">{site}</span>
                <p className="text-xs text-blue-700 break-all">{generatedUrls[site]}</p>
              </div>
            ))}
            <div className="flex gap-2 mt-3">
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

        {(['suumo', 'athome', 'homes'] as const).map((site) => (
          <div key={site} className="mb-3">
            <label className={LABEL}>{site === 'suumo' ? 'SUUMO' : site === 'athome' ? 'アットホーム' : "HOME'S"} 検索URL</label>
            <input
              className={FIELD}
              placeholder={`https://...`}
              value={searchUrls[site]}
              onChange={(e) => setSearchUrls((u) => ({ ...u, [site]: e.target.value }))}
            />
          </div>
        ))}
      </section>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-slate-800 text-white px-8 py-2.5 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中...' : '保存'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/customers')}
          className="border border-slate-300 px-6 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}
