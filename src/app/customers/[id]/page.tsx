import { createServiceClient } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import UnproposedProperties from './UnproposedProperties'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('*, customer_conditions(*), customer_search_urls(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!customer) notFound()

  const cond = customer.customer_conditions?.[0]
  const urls = customer.customer_search_urls ?? []

  const RANK_COLORS: Record<string, string> = {
    A: 'bg-red-100 text-red-700',
    B: 'bg-yellow-100 text-yellow-700',
    C: 'bg-slate-100 text-slate-600',
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            <span className={`px-2 py-0.5 rounded text-sm font-bold ${RANK_COLORS[customer.rank]}`}>
              ランク {customer.rank}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs ${customer.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {customer.status === 'active' ? 'アクティブ' : '非アクティブ'}
            </span>
          </div>
          <p className="text-slate-500 text-sm">No. {customer.customer_no}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/customers/${id}/proposal-candidates`}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 text-sm transition-colors font-medium"
          >
            提案候補リスト
          </Link>
          <Link
            href={`/customers/${id}/candidates`}
            className="border border-slate-300 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 text-sm transition-colors"
          >
            条件照合一覧
          </Link>
          <Link
            href={`/customers/${id}/edit`}
            className="border border-slate-300 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 text-sm transition-colors"
          >
            編集
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 mb-3">連絡先</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2"><dt className="text-slate-500 w-20 font-medium">メール</dt><dd className="text-slate-700">{customer.email ?? '-'}</dd></div>
            <div className="flex gap-2"><dt className="text-slate-500 w-20 font-medium">電話</dt><dd className="text-slate-700">{customer.phone ?? '-'}</dd></div>
          </dl>
        </div>

        {cond && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-700 mb-3">希望条件</h2>
            <dl className="space-y-1.5 text-sm">
              {cond.area && <div className="flex gap-2"><dt className="text-slate-500 font-medium w-20">エリア</dt><dd className="text-slate-700">{cond.area}</dd></div>}
              {cond.property_type && <div className="flex gap-2"><dt className="text-slate-500 font-medium w-20">種別</dt><dd className="text-slate-700">{cond.property_type}</dd></div>}
              {(cond.budget_min || cond.budget_max) && (
                <div className="flex gap-2">
                  <dt className="text-slate-500 font-medium w-20">予算</dt>
                  <dd className="text-slate-700">{cond.budget_min ? `${cond.budget_min}万` : '〜'} 〜 {cond.budget_max ? `${cond.budget_max}万` : '上限なし'}</dd>
                </div>
              )}
              {cond.area_sqm_min && <div className="flex gap-2"><dt className="text-slate-500 font-medium w-20">面積</dt><dd className="text-slate-700">{cond.area_sqm_min}㎡以上</dd></div>}
              {cond.walk_minutes_max && <div className="flex gap-2"><dt className="text-slate-500 font-medium w-20">駅徒歩</dt><dd className="text-slate-700">{cond.walk_minutes_max}分以内</dd></div>}
              {cond.building_age_max && <div className="flex gap-2"><dt className="text-slate-500 font-medium w-20">築年数</dt><dd className="text-slate-700">{cond.building_age_max}年以内</dd></div>}
            </dl>
          </div>
        )}
      </div>

      {/* 検索URL */}
      {urls.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="font-semibold text-slate-700 mb-3">登録済み検索URL</h2>
          <div className="space-y-2">
            {urls.map((u: { site: string; url: string; is_active: boolean }) => (
              <div key={u.site} className="flex items-center gap-3 text-sm">
                <span className="font-medium uppercase w-16 text-slate-600">{u.site}</span>
                <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                  {u.url}
                </a>
                {!u.is_active && <span className="text-red-400 text-xs">停止中</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {customer.sales_memo && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="font-semibold text-slate-700 mb-2">営業メモ</h2>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{customer.sales_memo}</p>
        </div>
      )}

      {/* 未提案物件 */}
      <UnproposedProperties customerId={id} />
    </div>
  )
}
