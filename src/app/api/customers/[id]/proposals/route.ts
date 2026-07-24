// GET  /api/customers/[id]/proposals — 提案済み物件一覧
// POST /api/customers/[id]/proposals — 物件を提案（データをコピー保存）
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('customer_reins_proposals')
    .select('*')
    .eq('customer_id', id)
    .order('proposed_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, proposals: data })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body?.property_id) {
    return NextResponse.json({ error: 'property_id が必要です' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // 元の物件データを取得してコピー
  const { data: prop, error: pErr } = await supabase
    .from('reins_imported_properties')
    .select('*')
    .eq('id', body.property_id)
    .single()

  if (pErr || !prop) {
    return NextResponse.json({ error: '物件が見つかりません' }, { status: 404 })
  }

  // 重複チェック
  const { data: existing } = await supabase
    .from('customer_reins_proposals')
    .select('id')
    .eq('customer_id', id)
    .eq('reins_property_id', body.property_id)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'この物件は既に提案済みです' }, { status: 409 })
  }

  const { error: iErr } = await supabase
    .from('customer_reins_proposals')
    .insert({
      customer_id: id,
      reins_property_id: prop.id,
      reins_number: prop.reins_number,
      property_name: prop.property_name,
      address: prop.address,
      price_man: prop.price_man,
      area_sqm: prop.area_sqm,
      floor_plan: prop.floor_plan,
      floor_number: prop.floor_number,
      built_year: prop.built_year,
      built_month: prop.built_month,
      station: prop.station,
      walk_minutes: prop.walk_minutes,
      transaction_type: prop.transaction_type,
      agent_company: prop.agent_company,
    })

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
