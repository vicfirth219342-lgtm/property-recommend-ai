import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 顧客ごとの未提案物件を取得
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customer_id')

  if (!customerId) return NextResponse.json({ error: 'customer_id required' }, { status: 400 })

  // 提案済み物件IDを取得
  const { data: proposed } = await supabase
    .from('proposals')
    .select('property_id')
    .eq('customer_id', customerId)

  const proposedIds = proposed?.map((p) => p.property_id) ?? []

  // 未提案物件を取得（顧客の検索URLと同じサイトの物件）
  const { data: searchUrls } = await supabase
    .from('customer_search_urls')
    .select('site')
    .eq('customer_id', customerId)
    .eq('is_active', true)

  const activeSites = searchUrls?.map((u) => u.site) ?? []

  let query = supabase
    .from('properties')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(50)

  if (activeSites.length > 0) {
    query = query.in('site', activeSites)
  }

  if (proposedIds.length > 0) {
    query = query.not('id', 'in', `(${proposedIds.join(',')})`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// 提案済みとして記録
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()
  const { customer_id, property_ids, batch_id } = body

  if (!customer_id || !property_ids?.length) {
    return NextResponse.json({ error: 'customer_id and property_ids required' }, { status: 400 })
  }

  const rows = property_ids.map((property_id: string) => ({
    customer_id,
    property_id,
    batch_id,
  }))

  const { error } = await supabase.from('proposals').upsert(rows, { onConflict: 'customer_id,property_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ saved: rows.length })
}
