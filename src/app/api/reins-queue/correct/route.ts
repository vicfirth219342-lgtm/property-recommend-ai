import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const ALLOWED_FIELDS: Record<string, string> = {
  name:            'name',
  address:         'address',
  area_sqm:        'area_sqm',
  current_price:   'current_price',
  built_year:      'built_year',
  built_month:     'built_month',
  floor_number:    'floor_number',
  nearest_station: 'nearest_station',
  walk_minutes:    'walk_minutes',
}

// POST /api/reins-queue/correct
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()
  const {
    queue_id,
    property_id,
    corrections,
    corrected_by,
    reason,
    rematch = false,
  } = body as {
    queue_id?: string
    property_id: string
    corrections: Array<{ field: string; value: string | number | null }>
    corrected_by: string
    reason?: string
    rematch?: boolean
  }

  if (!property_id || !corrections?.length || !corrected_by) {
    return NextResponse.json({ error: 'property_id, corrections, corrected_by は必須です' }, { status: 400 })
  }

  const invalidFields = corrections.filter(c => !ALLOWED_FIELDS[c.field])
  if (invalidFields.length) {
    return NextResponse.json({ error: `不正なフィールド: ${invalidFields.map(f => f.field).join(', ')}` }, { status: 400 })
  }

  // 現在値を取得
  const { data: currentRaw, error: fetchErr } = await supabase
    .from('properties')
    .select('name, address, area_sqm, current_price, built_year, built_month, floor_number, nearest_station, walk_minutes')
    .eq('id', property_id)
    .single()
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const current = currentRaw as Record<string, unknown>

  // フィールドを修正
  const updatePayload: Record<string, unknown> = {}
  for (const c of corrections) {
    const col = ALLOWED_FIELDS[c.field]
    if (col) updatePayload[col] = c.value
  }

  const { error: updateErr } = await supabase
    .from('properties')
    .update(updatePayload)
    .eq('id', property_id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // 修正履歴を append-only で保存
  const correctionRows = corrections.map(c => ({
    property_id,
    queue_id: queue_id ?? null,
    corrected_by,
    reason: reason ?? null,
    field_name: c.field,
    before_value: String(current[ALLOWED_FIELDS[c.field]] ?? ''),
    after_value: String(c.value ?? ''),
  }))
  await supabase.from('property_corrections').insert(correctionRows)

  // 監査ログ
  const auditBefore = Object.fromEntries(corrections.map(c => [c.field, current[ALLOWED_FIELDS[c.field]] ?? null]))
  const auditAfter  = Object.fromEntries(corrections.map(c => [c.field, c.value]))
  await supabase.from('reins_audit_logs').insert({
    queue_id: queue_id ?? null,
    property_id,
    operation: 'data_correction',
    operator: corrected_by,
    before_value: auditBefore,
    after_value: auditAfter,
    note: reason ?? null,
  })

  // 再照合
  if (rematch && queue_id) {
    await supabase
      .from('reins_check_queue')
      .update({ status: 'queued', not_found_reason: null, updated_at: new Date().toISOString() })
      .eq('id', queue_id)

    await supabase.from('reins_audit_logs').insert({
      queue_id,
      property_id,
      operation: 'rematch',
      operator: corrected_by,
      before_value: { status: 'previous' },
      after_value: { status: 'queued' },
      note: '修正後に再照合を実行',
    })

    const runRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/reins-match/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queue_ids: [queue_id] }),
    })
    const runJson = await runRes.json().catch(() => ({})) as Record<string, unknown>
    return NextResponse.json({ ok: true, corrected: corrections.length, rematch: runJson })
  }

  return NextResponse.json({ ok: true, corrected: corrections.length })
}

// GET /api/reins-queue/correct?property_id=xxx — 修正履歴取得
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const propertyId = searchParams.get('property_id')
  if (!propertyId) return NextResponse.json({ error: 'property_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('property_corrections')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ corrections: data ?? [] })
}
