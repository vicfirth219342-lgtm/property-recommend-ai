import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { extractFromText } from '@/lib/extractProperty'
import { matchFromReinsText } from '@/lib/matchReins'

// GET: 1件取得
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('pending_reins_checks')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

// PATCH: レインズ結果を貼り付けて照合
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const body = await req.json()
  const { reins_input } = body

  if (!reins_input?.trim()) {
    return NextResponse.json({ error: 'reins_input が空です' }, { status: 400 })
  }

  // 元物件データを取得
  const { data: original, error: fetchErr } = await supabase
    .from('pending_reins_checks')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !original) {
    return NextResponse.json({ error: '物件が見つかりません' }, { status: 404 })
  }

  // 照合
  const matchResult = matchFromReinsText(
    {
      property_name: original.property_name,
      address: original.address,
      price_man: original.price_man,
      area_sqm: original.area_sqm,
      built_year: original.built_year,
      built_month: original.built_month,
      station: original.station,
      walk_minutes: original.walk_minutes,
      floor_plan: original.floor_plan,
    },
    reins_input
  )

  const { data, error } = await supabase
    .from('pending_reins_checks')
    .update({
      reins_input,
      match_score:    matchResult.score,
      match_status:   matchResult.status,
      matched_items:  matchResult.matched_items,
      unmatched_items: matchResult.unmatched_items,
      score_detail:   matchResult.score_detail,
      checked_at:     new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE: 削除
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const { error } = await supabase.from('pending_reins_checks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
