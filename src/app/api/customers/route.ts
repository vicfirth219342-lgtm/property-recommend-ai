import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'active'

  const query = supabase
    .from('customers')
    .select(`
      *,
      customer_conditions(*),
      customer_search_urls(*)
    `)
    .is('deleted_at', null)
    .order('customer_no')

  if (status !== 'all') {
    query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()

  const {
    customer_no, name, email, phone, rank, sales_memo, status,
    // condition fields
    area, property_type, budget_min, budget_max,
    area_sqm_min, area_sqm_max, walk_minutes_max, building_age_max, other_conditions,
  } = body

  // 顧客作成
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .insert({ customer_no, name, email, phone, rank, sales_memo, status: status ?? 'active' })
    .select()
    .single()

  if (custErr) return NextResponse.json({ error: custErr.message }, { status: 500 })

  // 条件作成
  await supabase.from('customer_conditions').insert({
    customer_id: customer.id,
    area, property_type, budget_min, budget_max,
    area_sqm_min, area_sqm_max, walk_minutes_max, building_age_max, other_conditions,
  })

  // 変更ログ
  await supabase.from('customer_change_logs').insert({
    customer_id: customer.id,
    action: 'create',
    after_data: customer,
  })

  return NextResponse.json(customer, { status: 201 })
}
