import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { generateAndSaveUrls } from '@/lib/urlGenerationService'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('customers')
    .select(`*, customer_conditions(*), customer_search_urls(*)`)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const body = await req.json()

  // 現在のデータ取得（変更ログ用）
  const { data: before } = await supabase.from('customers').select('*').eq('id', id).single()

  const {
    customer_no, name, email, phone, rank, sales_memo, status,
    area, property_type,
    transaction_type,
    budget_min, budget_max,
    rent_min, rent_max,
    area_sqm_min, area_sqm_max, walk_minutes_max, building_age_max, other_conditions,
  } = body

  const { data: customer, error } = await supabase
    .from('customers')
    .update({ customer_no, name, email, phone, rank, sales_memo, status })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 条件更新 (upsert)
  await supabase.from('customer_conditions').upsert(
    {
      customer_id: id,
      transaction_type: transaction_type ?? 'sale',
      area, property_type,
      budget_min, budget_max,
      rent_min, rent_max,
      area_sqm_min, area_sqm_max, walk_minutes_max, building_age_max, other_conditions,
    },
    { onConflict: 'customer_id' }
  )

  // 変更ログ
  await supabase.from('customer_change_logs').insert({
    customer_id: id,
    action: 'update',
    before_data: before,
    after_data: customer,
  })

  // 条件が含まれている場合は検索URLを自動再生成
  const conditionFields = [
    'transaction_type', 'area', 'property_type',
    'budget_min', 'budget_max', 'rent_min', 'rent_max',
    'area_sqm_min', 'area_sqm_max', 'walk_minutes_max', 'building_age_max',
  ]
  const hasCondition = conditionFields.some(f => f in body)
  if (hasCondition) {
    const condForGen = {
      customer_id:      id,
      transaction_type: transaction_type ?? 'sale',
      area, property_type,
      budget_min, budget_max,
      rent_min, rent_max,
      area_sqm_min, area_sqm_max, walk_minutes_max, building_age_max,
      other_conditions: body.other_conditions ?? null,
    }
    // fire-and-forget (失敗してもレスポンスには影響させない)
    generateAndSaveUrls(id, condForGen as Parameters<typeof generateAndSaveUrls>[1], supabase)
      .catch(err => console.error('[PATCH /customers/:id] URL generation failed:', err))
  }

  return NextResponse.json(customer)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  // 論理削除
  const { error } = await supabase
    .from('customers')
    .update({ status: 'inactive', deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('customer_change_logs').insert({
    customer_id: id,
    action: 'delete',
  })

  return NextResponse.json({ success: true })
}
