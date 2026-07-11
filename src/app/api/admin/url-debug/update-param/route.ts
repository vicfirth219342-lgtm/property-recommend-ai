/**
 * PATCH /api/admin/url-debug/update-param
 * portal_area_params の verified / notes を更新する
 *
 * Body: { area_id, portal, verified?, notes?, status? }
 * status は 'URL_INVALID' など — notes に自動セットされる
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { area_id, portal, verified, notes, status } = body

  if (!area_id || !portal) {
    return NextResponse.json({ error: 'area_id と portal は必須です' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)

  const patch: Record<string, unknown> = {}
  if (verified !== undefined) patch.verified = verified
  if (notes !== undefined)    patch.notes    = notes
  if (status)                 patch.notes    = `${status} [${today}]`

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '更新フィールドがありません' }, { status: 400 })
  }

  const { error } = await supabase
    .from('portal_area_params')
    .update(patch)
    .eq('area_id', area_id)
    .eq('portal', portal)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
