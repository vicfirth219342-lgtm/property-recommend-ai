import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// PATCH: ステータス更新（resolved / ignored）
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServiceClient()
  const { id } = await params
  const body = await req.json()
  const { status, resolved_area_id } = body as { status: string; resolved_area_id?: string }

  const { error } = await supabase
    .from('unresolved_area_mappings')
    .update({ status, resolved_area_id: resolved_area_id ?? null, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
