import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/reins-queue — 照合キュー一覧（タブ別）
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'all'
  const customerId = searchParams.get('customer_id')

  // ── ステータス別件数 ──
  const { data: allQueue } = await supabase
    .from('reins_check_queue')
    .select('id, status')
  const counts: Record<string, number> = {}
  for (const q of allQueue ?? []) {
    counts[q.status] = (counts[q.status] ?? 0) + 1
  }

  // ── キュー取得（JOINなしのため各テーブルを個別取得） ──
  let queueQuery = supabase
    .from('reins_check_queue')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(500)

  if (status !== 'all') queueQuery = queueQuery.eq('status', status)
  if (customerId) queueQuery = queueQuery.eq('customer_id', customerId)

  const { data: queue, error: qErr } = await queueQuery
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  if (!queue?.length) {
    return NextResponse.json({ counts, items: [] })
  }

  // 関連データを一括取得
  const propIds = [...new Set(queue.map(q => q.property_id))]
  const custIds = [...new Set(queue.map(q => q.customer_id).filter(Boolean))]
  const queueIds = queue.map(q => q.id)

  const [propsRes, custsRes, candsRes, resultsRes] = await Promise.all([
    supabase.from('properties')
      .select('id, name, address, current_price, monthly_rent, area_sqm, built_year, built_month, walk_minutes, nearest_station, floor_number, transaction_type, site, url')
      .in('id', propIds),
    custIds.length
      ? supabase.from('customers').select('id, name, customer_no').in('id', custIds)
      : Promise.resolve({ data: [] }),
    supabase.from('reins_match_candidates')
      .select('id, queue_id, reins_property_id, score, score_detail, matched_fields, unmatched_fields, rank')
      .in('queue_id', queueIds)
      .order('rank', { ascending: true }),
    supabase.from('reins_match_results')
      .select('id, queue_id, candidate_id, verdict, method, decided_by, reins_number, agent_company, note, decided_at')
      .in('queue_id', queueIds)
      .order('decided_at', { ascending: false }),
  ])

  const propMap = new Map((propsRes.data ?? []).map(p => [p.id, p]))
  const custMap = new Map(((custsRes as { data: { id: string; name: string; customer_no: string }[] | null }).data ?? []).map(c => [c.id, c]))

  // candidates / results をキューIDでグルーピング
  const candsByQueue = new Map<string, typeof candsRes.data>()
  for (const c of candsRes.data ?? []) {
    if (!candsByQueue.has(c.queue_id)) candsByQueue.set(c.queue_id, [])
    candsByQueue.get(c.queue_id)!.push(c)
  }
  const resultsByQueue = new Map<string, typeof resultsRes.data>()
  for (const r of resultsRes.data ?? []) {
    if (!resultsByQueue.has(r.queue_id)) resultsByQueue.set(r.queue_id, [])
    resultsByQueue.get(r.queue_id)!.push(r)
  }

  // レインズ物件IDを収集して一括取得
  const reinsIds = [...new Set((candsRes.data ?? []).map(c => c.reins_property_id).filter(Boolean))]
  let reinsMap = new Map<string, Record<string, unknown>>()
  if (reinsIds.length) {
    const { data: reinsProps } = await supabase
      .from('reins_imported_properties')
      .select('id, reins_number, property_name, address, price_man, area_sqm, built_year, built_month, floor_number, station, walk_minutes, agent_company, floor_plan')
      .in('id', reinsIds)
    reinsMap = new Map((reinsProps ?? []).map(r => [r.id, r]))
  }

  // 組み立て
  const items = queue.map(q => {
    const prop = propMap.get(q.property_id)
    const cust = q.customer_id ? custMap.get(q.customer_id) : null
    const cands = (candsByQueue.get(q.id) ?? []).map(c => ({
      ...c,
      reins: c.reins_property_id ? reinsMap.get(c.reins_property_id) ?? null : null,
    }))
    const results = resultsByQueue.get(q.id) ?? []
    const latestResult = results[0] ?? null

    // 最高スコア・gap
    const rank1 = cands.find(c => c.rank === 1)
    const gap = rank1?.score_detail?.gap ?? null

    return {
      id: q.id,
      status: q.status,
      not_found_reason: q.not_found_reason ?? null,
      priority: q.priority,
      requested_by: q.requested_by,
      created_at: q.created_at,
      updated_at: q.updated_at,
      property: prop ?? null,
      customer: cust ?? null,
      candidates: cands,
      latestResult,
      resultHistory: results,
      bestScore: rank1?.score ?? null,
      gap,
      guardCount: rank1?.score_detail?.guards?.length ?? 0,
    }
  })

  return NextResponse.json({ counts, items })
}

// POST /api/reins-queue
// 物件をレインズ照合キューに追加する
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()
  const { property_id, customer_id, requested_by = 'manual_crawl' } = body

  if (!property_id) {
    return NextResponse.json({ error: 'property_id は必須です' }, { status: 400 })
  }

  // 既にキューにある場合は既存レコードを返す
  const existingQuery = supabase
    .from('reins_check_queue')
    .select('id, status, updated_at')
    .eq('property_id', property_id)
  if (customer_id) existingQuery.eq('customer_id', customer_id)

  const { data: existing } = await existingQuery.order('updated_at', { ascending: false }).limit(1).single()

  if (existing) {
    return NextResponse.json({ alreadyQueued: true, queue: existing })
  }

  const insertData: Record<string, unknown> = {
    property_id,
    status: 'queued',
    requested_by,
  }
  if (customer_id) insertData.customer_id = customer_id

  const { data, error } = await supabase
    .from('reins_check_queue')
    .insert(insertData)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, queue: data })
}
