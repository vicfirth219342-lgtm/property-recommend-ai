import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { matchProperty } from '@/lib/conditionMatch'

export type { MatchStatus } from '@/lib/conditionMatch'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customer_id')
  const showDebug  = searchParams.get('debug') === 'true'  // AREA_OUT_OF_SCOPE 表示フラグ

  if (!customerId) return NextResponse.json({ error: 'customer_id required' }, { status: 400 })

  // 顧客・条件取得
  const { data: customer } = await supabase
    .from('customers')
    .select('*, customer_conditions(*), customer_search_urls(*)')
    .eq('id', customerId)
    .is('deleted_at', null)
    .single()

  if (!customer) return NextResponse.json({ error: '顧客が見つかりません' }, { status: 404 })

  const cond   = customer.customer_conditions?.[0] ?? null
  const txType = cond?.transaction_type ?? 'sale'

  // 提案済みIDを取得
  const { data: proposed } = await supabase
    .from('proposals')
    .select('property_id')
    .eq('customer_id', customerId)
  const proposedSet = new Set((proposed ?? []).map((p: { property_id: string }) => p.property_id))

  // ── customer_property_sources でエリアフィルタ ──────────────────────
  const { data: sources, error: srcErr } = await supabase
    .from('customer_property_sources')
    .select('property_id, crawled_at')
    .eq('customer_id', customerId)

  const hasSourceTable = !srcErr
  const sourceSet = hasSourceTable && sources?.length
    ? new Set(sources.map((s: { property_id: string }) => s.property_id))
    : null  // null = フィルタ無効（全件対象）

  // 新着判定: この顧客への初回紐付け日時（複数ポータルなら最古）
  const firstLinkedAt = new Map<string, number>()
  for (const s of sources ?? []) {
    const t = new Date(s.crawled_at).getTime()
    const prev = firstLinkedAt.get(s.property_id)
    if (prev === undefined || t < prev) firstLinkedAt.set(s.property_id, t)
  }

  // 物件取得（txType で絞る、上限 2000）
  const { data: allProps, error: propErr } = await supabase
    .from('properties')
    .select('*')
    .eq('transaction_type', txType)
    .limit(2000)

  if (propErr) return NextResponse.json({ error: propErr.message }, { status: 500 })

  const all = allProps ?? []

  // エリア内 / エリア外 に分類
  const inScope    = sourceSet ? all.filter(p => sourceSet.has(p.id))  : all
  const outOfScope = sourceSet ? all.filter(p => !sourceSet.has(p.id)) : []

  // ── レインズ照合状態を一括取得 ──────────────────────────
  const inScopeIds = inScope.map(p => p.id)

  // ── ポータル横断の掲載元を一括取得（テーブル未作成時は空のまま） ──
  const listingsByProp = new Map<string, Array<{ portal: string; source_url: string; is_active: boolean; last_seen_at: string; consecutive_miss_count: number }>>()
  if (inScopeIds.length > 0) {
    const { data: listings } = await supabase
      .from('property_portal_listings')
      .select('property_id, portal, source_url, is_active, last_seen_at, consecutive_miss_count')
      .in('property_id', inScopeIds)
    for (const li of listings ?? []) {
      if (!listingsByProp.has(li.property_id)) listingsByProp.set(li.property_id, [])
      listingsByProp.get(li.property_id)!.push({
        portal: li.portal, source_url: li.source_url, is_active: li.is_active,
        last_seen_at: li.last_seen_at, consecutive_miss_count: li.consecutive_miss_count,
      })
    }
  }
  const { data: reinsQueues } = await supabase
    .from('reins_check_queue')
    .select('id, property_id, status')
    .eq('customer_id', customerId)
    .in('property_id', inScopeIds.length > 0 ? inScopeIds : ['__none__'])
  const reinsQueueByProp = new Map((reinsQueues ?? []).map((q: { id: string; property_id: string; status: string }) => [q.property_id, q]))

  // 判定結果を全件取得して手動確定を優先
  // 優先順: manual+confirmed > auto+confirmed > latest (decided_at DESC, id DESC)
  const reinsQueueIds = (reinsQueues ?? []).map((q: { id: string }) => q.id)
  const { data: reinsResults } = reinsQueueIds.length > 0
    ? await supabase
        .from('reins_match_results')
        .select('queue_id, verdict, method, reins_number, agent_company, decided_at, decided_by, note')
        .in('queue_id', reinsQueueIds)
        .order('decided_at', { ascending: false })
    : { data: [] }
  const latestResultByQueue = new Map<string, {
    verdict: string; method: string; reins_number: string | null
    agent_company: string | null; decided_at: string; decided_by: string | null; note: string | null
  }>()
  for (const r of reinsResults ?? []) {
    const existing = latestResultByQueue.get(r.queue_id)
    if (!existing) { latestResultByQueue.set(r.queue_id, r); continue }
    // 手動確定は自動確定より優先
    const isManualConfirm = r.method === 'manual' && r.verdict === 'confirmed'
    const existingIsManualConfirm = existing.method === 'manual' && existing.verdict === 'confirmed'
    if (isManualConfirm && !existingIsManualConfirm) latestResultByQueue.set(r.queue_id, r)
  }

  // 照合
  const results = inScope.map(p => {
    const match = matchProperty(p, cond)

    // 価格変動
    let priceChange: { diff: number; diffMan: number; label: string } | null = null
    if (p.last_price !== null && p.current_price !== null && p.last_price !== p.current_price) {
      const diff = p.current_price - p.last_price
      const diffMan = Math.round(diff / 10000)
      priceChange = { diff, diffMan, label: diffMan < 0 ? `${Math.abs(diffMan)}万円値下げ` : `${diffMan}万円値上げ` }
    }
    // 新着: この顧客への初回紐付けから7日以内（sources 未紐付け時は first_seen_at にフォールバック）
    const linkedAt = firstLinkedAt.get(p.id)
      ?? (p.first_seen_at ? new Date(p.first_seen_at).getTime() : null)
    const isNew = linkedAt !== null
      ? Date.now() - linkedAt < 7 * 24 * 60 * 60 * 1000
      : false

    // レインズ照合状態
    const rq = reinsQueueByProp.get(p.id)
    let reinsStatus: string | null = null
    let reinsInfo: {
      reins_number: string | null; agent_company: string | null
      decided_at: string; decided_by: string | null; note: string | null; method: string
    } | null = null
    if (rq) {
      const latestResult = latestResultByQueue.get(rq.id)
      if (rq.status === 'matched' && latestResult?.verdict === 'confirmed') {
        reinsStatus = 'confirmed'
        reinsInfo = {
          reins_number: latestResult.reins_number,
          agent_company: latestResult.agent_company,
          decided_at: latestResult.decided_at,
          decided_by: latestResult.decided_by ?? null,
          note: latestResult.note ?? null,
          method: latestResult.method,
        }
      } else if (rq.status === 'needs_review') {
        reinsStatus = 'needs_review'
      } else if (rq.status === 'not_found') {
        reinsStatus = 'not_found'
      } else {
        reinsStatus = 'pending'
      }
    }

    return {
      ...p, ...match, priceChange, isNew, proposed: proposedSet.has(p.id), reinsStatus, reinsInfo,
      portalListings: listingsByProp.get(p.id) ?? [],
    }
  })

  // タブ別に分類（提案済みを除外）
  const matches      = results.filter(r => r.status === 'MATCH'             && !r.proposed)
  const needManual   = results.filter(r => r.status === 'NEED_MANUAL_CHECK' && !r.proposed)
  const noMatch      = results.filter(r => r.status === 'NO_MATCH'          && !r.proposed)

  // 統計
  const newCount          = matches.filter(r => r.isNew).length
  const priceChangedCount = matches.filter(r => r.priceChange !== null).length

  // NO_MATCH 除外理由別集計
  const noMatchReasons: Record<string, number> = {}
  for (const r of noMatch) {
    for (const reason of r.reasons) {
      const key = reason.split('（')[0]
      noMatchReasons[key] = (noMatchReasons[key] ?? 0) + 1
    }
  }
  // NEED_MANUAL_CHECK 未取得項目別集計
  const missingFieldCounts: Record<string, number> = {}
  for (const r of needManual) {
    for (const f of r.missingFields) {
      missingFieldCounts[f] = (missingFieldCounts[f] ?? 0) + 1
    }
  }

  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      customer_no: customer.customer_no,
      rank: customer.rank,
    },
    conditions: cond,
    // タブ別
    matches,
    needManual,
    noMatch,
    // 後方互換 (既存コードが candidates を参照している場合)
    candidates: matches,
    total: matches.length,
    newCount,
    priceChangedCount,
    // 集計
    summary: {
      inScopeTotal:    inScope.length,
      outOfScopeTotal: outOfScope.length,
      matchCount:      matches.length,
      needManualCount: needManual.length,
      noMatchCount:    noMatch.length,
      noMatchReasons,
      missingFieldCounts,
      hasSourceTable,
      sourceCount: sources?.length ?? 0,
    },
    // デバッグ用（?debug=true のみ）
    outOfScope: showDebug ? outOfScope.map(p => ({ id: p.id, name: p.name, address: p.address })) : undefined,
  })
}
