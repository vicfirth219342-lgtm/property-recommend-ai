'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Customer {
  id: string
  name: string
  customer_no: string
  customer_conditions: {
    transaction_type: string
    property_type: string | null
    area: string | null
    budget_min: number | null
    budget_max: number | null
    rent_min: number | null
    rent_max: number | null
    area_sqm_min: number | null
    walk_minutes_max: number | null
    building_age_max: number | null
    other_conditions: string | null
  }[]
}

interface SearchTask {
  id: string
  customer_id: string
  customer_name: string
  transaction_type: string
  property_type: string | null
  area: string | null
  budget_min: number | null
  budget_max: number | null
  rent_min: number | null
  rent_max: number | null
  area_sqm_min: number | null
  walk_minutes_max: number | null
  building_age_max: number | null
  other_conditions: string | null
  status: string
  created_at: string
  fetched_at: string | null
}

const TX_LABEL: Record<string, string> = { sale: '売買', rent: '賃貸' }

export default function ReinsSearchPage() {
  const params = useParams()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [task, setTask] = useState<SearchTask | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)

  // 顧客情報を取得
  useEffect(() => {
    fetch(`/api/customers/${customerId}`)
      .then(r => r.json())
      .then(d => setCustomer(d))
      .catch(() => setError('顧客情報の取得に失敗しました'))
  }, [customerId])

  // タスク状態をポーリング（5秒ごと、最大24回 = 2分）
  useEffect(() => {
    if (!task || task.status === 'completed') return
    if (pollCount >= 24) return

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/reins/search-task?customer_id=${customerId}`)
        const data = await res.json()
        if (data.task) setTask(data.task)
      } catch { /* ignore */ }
      setPollCount(c => c + 1)
    }, 5000)

    return () => clearTimeout(timer)
  }, [task, pollCount, customerId])

  const handleSendToExtension = async () => {
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/reins/search-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'エラーが発生しました')
      setTask(data.task)
      setPollCount(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setSending(false)
    }
  }

  const handleCancelTask = async () => {
    if (!task) return
    setLoading(true)
    try {
      await fetch(`/api/reins/search-task?task_id=${task.id}`, { method: 'DELETE' })
      setTask(null)
      setPollCount(0)
    } catch { /* ignore */ }
    setLoading(false)
  }

  const cond = customer?.customer_conditions?.[0]

  const statusLabel: Record<string, { label: string; color: string }> = {
    pending:   { label: 'Chrome拡張が条件を取得待ち', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    fetched:   { label: 'Chrome拡張が条件を受け取りました', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    completed: { label: '検索完了', color: 'text-green-600 bg-green-50 border-green-200' },
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* パンくず */}
      <nav className="text-sm text-slate-400 mb-6 flex items-center gap-1.5">
        <Link href="/customers" className="hover:text-slate-600">顧客一覧</Link>
        <span>/</span>
        <Link href={`/customers/${customerId}`} className="hover:text-slate-600">
          {customer?.name ?? '...'}
        </Link>
        <span>/</span>
        <span className="text-slate-600">レインズで物件探索</span>
      </nav>

      <h1 className="text-2xl font-bold text-slate-800 mb-1">レインズで物件探索</h1>
      <p className="text-sm text-slate-500 mb-6">
        顧客条件をChrome拡張へ送信し、東日本レインズの検索を補助します
      </p>

      {/* 顧客条件の確認 */}
      {cond ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="font-semibold text-slate-700 mb-3 text-sm">
            {customer?.name} さんの希望条件（送信内容の確認）
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <CondRow label="売買／賃貸" value={TX_LABEL[cond.transaction_type] ?? cond.transaction_type} />
            <CondRow label="物件種別"   value={cond.property_type} />
            <CondRow label="エリア"     value={cond.area} />
            {cond.transaction_type === 'sale' ? (
              <CondRow
                label="価格"
                value={cond.budget_min || cond.budget_max
                  ? `${cond.budget_min ? `${cond.budget_min}万〜` : ''}${cond.budget_max ? `${cond.budget_max}万` : '上限なし'}`
                  : null}
              />
            ) : (
              <CondRow
                label="賃料"
                value={cond.rent_min || cond.rent_max
                  ? `${cond.rent_min ? `${cond.rent_min}万〜` : ''}${cond.rent_max ? `${cond.rent_max}万` : '上限なし'}`
                  : null}
              />
            )}
            <CondRow label="面積"       value={cond.area_sqm_min    ? `${cond.area_sqm_min}㎡以上` : null} />
            <CondRow label="駅徒歩"     value={cond.walk_minutes_max ? `${cond.walk_minutes_max}分以内` : null} />
            <CondRow label="築年数"     value={cond.building_age_max ? `${cond.building_age_max}年以内` : null} />
            {cond.other_conditions && (
              <div className="col-span-2">
                <CondRow label="その他条件" value={cond.other_conditions} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 text-sm text-amber-700">
          希望条件が登録されていません。
          <Link href={`/customers/${customerId}/edit`} className="underline ml-1">顧客編集</Link>
          で条件を登録してください。
        </div>
      )}

      {/* タスク状態 */}
      {task && (
        <div className={`border rounded-xl p-4 mb-6 text-sm ${statusLabel[task.status]?.color ?? 'bg-slate-50 border-slate-200 text-slate-600'}`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold mb-1">{statusLabel[task.status]?.label}</div>
              <div className="opacity-70 text-xs">
                タスクID: {task.id.slice(0, 8)}... / 作成: {new Date(task.created_at).toLocaleTimeString('ja-JP')}
                {task.fetched_at && ` / 取得: ${new Date(task.fetched_at).toLocaleTimeString('ja-JP')}`}
              </div>
            </div>
            {task.status !== 'completed' && (
              <button
                onClick={handleCancelTask}
                disabled={loading}
                className="text-xs text-slate-500 hover:text-slate-700 border border-slate-300 rounded px-2 py-1 ml-3"
              >
                キャンセル
              </button>
            )}
          </div>

          {/* fetched 状態 → 操作案内 */}
          {task.status === 'fetched' && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-blue-700 font-medium text-xs mb-1">Chrome拡張が条件を受け取りました。次の手順で進めてください：</p>
              <ol className="list-decimal list-inside text-xs space-y-0.5 text-blue-600">
                <li>東日本レインズ（system.reins.jp）を開く</li>
                <li>Chrome拡張のポップアップを開き「条件を入力する」をクリック</li>
                <li>検索フォームに条件が表示されたことを確認して検索を実行</li>
                <li>検索結果ページで「このページを追加」をクリック</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {/* メインCTAボタン */}
      <div className="flex gap-3">
        <button
          onClick={handleSendToExtension}
          disabled={sending || !cond}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-semibold text-sm transition-colors"
        >
          {sending ? '送信中...' : task ? '条件を再送信（上書き）' : 'Chrome拡張へ条件を送信'}
        </button>

        {task?.status === 'fetched' && (
          <a
            href="https://system.reins.jp/main/BK/GBK002100"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-700 hover:bg-slate-600 text-white py-3 px-5 rounded-xl font-semibold text-sm transition-colors"
          >
            レインズを開く →
          </a>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 使い方 */}
      <div className="mt-8 border-t border-slate-100 pt-6">
        <h3 className="text-sm font-semibold text-slate-600 mb-3">使い方</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-500">
          <li>「Chrome拡張へ条件を送信」を押す</li>
          <li>Chrome拡張のポップアップ（レインズ照合ツール）を開く</li>
          <li>「レインズ検索モード」タブで条件を確認する</li>
          <li>東日本レインズを開き「条件を入力する」をクリック</li>
          <li>検索フォームに条件が反映されることを確認して検索実行</li>
          <li>検索結果ページで「このページを追加」で結果を取り込む</li>
          <li>「アプリで照合する」でこの画面に戻り、条件一致物件を確認</li>
        </ol>
        <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-400">
          第1段階：条件の送受信確認フェーズ。自動入力（第2段階）はDOM調査後に実装予定。
        </div>
      </div>
    </div>
  )
}

function CondRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2">
      <dt className="text-slate-400 w-20 shrink-0">{label}</dt>
      <dd className="text-slate-700 font-medium">{value ?? <span className="text-slate-300">未設定</span>}</dd>
    </div>
  )
}
