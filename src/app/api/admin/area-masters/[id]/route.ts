import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// PUT: area_master 更新
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServiceClient()
  const { id } = await params
  const body = await req.json()

  const { display_name, area_type, prefecture, city, ward, station_name, station_ward, line_name, yomi } = body

  const { error } = await supabase
    .from('area_masters')
    .update({ display_name, area_type, prefecture, city, ward, station_name, station_ward, line_name, yomi })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE: area_master 削除（area_aliases・portal_area_params はカスケード削除）
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServiceClient()
  const { id } = await params

  const { error } = await supabase.from('area_masters').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
