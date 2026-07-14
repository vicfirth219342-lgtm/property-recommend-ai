import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/proposal-candidates?customer_id=xxx
// 候補一覧を返す。reins_check_queue の最新ステータスを JOIN して上書き
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customer_id')
  if (!customerId) return NextResponse.json({ error: 'customer_id は必須です' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: candidates, error } = await supabase
    .from('proposal_candidates')
    .select(`
      id, customer_id, property_id, added_at, added_by, source,
      reins_status, proposal_status, memo, created_at, updated_at,
      properties (
        id, name, address, price, monthly_rent, area_sqm, floor_plan,
        building_age, walk_minutes, url, thumbnail_url, site, transaction_type,
        built_year, built_month, floor_number
      )
    `)
    .eq('customer_id', customerId)
    .order('added_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // property_portal_listings でポータル別 URL を取得
  const propertyIds = (candidates ?? []).map(c => c.property_id)
  const { data: listings } = propertyIds.length
    ? await supabase
        .from('property_portal_listings')
        .select('property_id, portal, source_url')
        .in('property_id', propertyIds)
        .eq('is_active', true)
    : { data: [] }

  // reins_check_queue の最新ステータスを取得（snapshot より優先）
  const { data: queueItems } = propertyIds.length
    ? await supabase
        .from('reins_check_queue')
        .select('id, property_id, status, not_found_reason, updated_at')
        .eq('customer_id', customerId)
        .in('property_id', propertyIds)
        .order('updated_at', { ascending: false })
    : { data: [] }

  // reins_match_results の最新 verdict を取得
  const queueIds = (queueItems ?? []).map(q => q.id).filter(Boolean)
  const { data: matchResults } = queueIds.length
    ? await supabase
        .from('reins_match_results')
        .select('queue_id, verdict, reins_number, agent_company, decided_at')
        .in('queue_id', queueIds)
        .order('decided_at', { ascending: false })
    : { data: [] }

  // index maps
  const listingsByPropId = new Map<string, { portal: string; source_url: string }[]>()
  for (const l of listings ?? []) {
    if (!listingsByPropId.has(l.property_id)) listingsByPropId.set(l.property_id, [])
    listingsByPropId.get(l.property_id)!.push({ portal: l.portal, source_url: l.source_url })
  }

  // 同じ property_id に対してキューは複数あり得るが最新を使う
  const latestQueueByPropId = new Map<string, { status: string; not_found_reason: string | null; id?: string }>()
  for (const q of (queueItems ?? []).slice().reverse()) {
    latestQueueByPropId.set(q.property_id, q)
  }

  const latestResultByQueueId = new Map<string, { verdict: string; reins_number: string | null; agent_company: string | null }>()
  for (const r of (matchResults ?? []).slice().reverse()) {
    latestResultByQueueId.set(r.queue_id, r)
  }

  // 候補リストを組み立て
  const result = (candidates ?? []).map(c => {
    const queueItem = latestQueueByPropId.get(c.property_id)
    const matchResult = queueItem?.id ? latestResultByQueueId.get(queueItem.id) : null

    // reins の表示ステータスを計算（キューの最新を優先、なければ snapshot）
    let displayReinsStatus = c.reins_status
    if (queueItem) {
      if (queueItem.status === 'queued' || queueItem.status === 'in_progress') {
        displayReinsStatus = queueItem.status === 'queued' ? 'queued' : 'in_progress'
      } else if (queueItem.status === 'matched') {
        displayReinsStatus = matchResult?.verdict === 'confirmed' ? 'found' : 'candidates'
      } else if (queueItem.status === 'needs_review') {
        displayReinsStatus = 'candidates'
      } else if (queueItem.status === 'not_found') {
        displayReinsStatus = 'not_found'
      }
    }

    return {
      ...c,
      displayReinsStatus,
      matchResult,
      portalListings: listingsByPropId.get(c.property_id) ?? [],
    }
  })

  return NextResponse.json(result)
}

// POST /api/proposal-candidates
// { customer_id, property_id, source?, added_by? }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { customer_id, property_id, source = 'manual_crawl', added_by } = body

  if (!customer_id || !property_id) {
    return NextResponse.json({ error: 'customer_id と property_id は必須です' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // 重複チェック
  const { data: existing } = await supabase
    .from('proposal_candidates')
    .select('id, added_at')
    .eq('customer_id', customer_id)
    .eq('property_id', property_id)
    .single()

  if (existing) {
    return NextResponse.json({
      alreadyAdded: true,
      id: existing.id,
      added_at: existing.added_at,
    })
  }

  const { data, error } = await supabase
    .from('proposal_candidates')
    .insert({ customer_id, property_id, source, added_by: added_by ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, candidate: data })
}
