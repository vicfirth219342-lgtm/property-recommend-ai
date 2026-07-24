// POST /api/reins/properties/delete — 個別・一括削除
// body: { ids: string[] }
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: 'ids が必要です' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error, count } = await supabase
    .from('reins_imported_properties')
    .delete()
    .in('id', body.ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, deleted_count: count ?? body.ids.length })
}
