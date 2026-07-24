// GET /api/customers/[id]/matches
// この顧客に合うレインズ物件（条件一致→一部一致の順）を都度計算で返す
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { matchCustomerReins, type ConditionLike, type MatchStatus } from '@/lib/matchCustomerReins'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: customer, error: cErr } = await supabase
    .from('customers')
    .select('id, name, customer_conditions(*)')
    .eq('id', id)
    .single()

  if (cErr || !customer) {
    return NextResponse.json({ error: '顧客が見つかりません' }, { status: 404 })
  }

  const cond = (customer.customer_conditions as ConditionLike[] | undefined)?.[0]
  if (!cond) {
    return NextResponse.json({ ok: true, matches: [], partials: [], message: '希望条件が未登録です' })
  }

  const { data: props } = await supabase
    .from('reins_imported_properties')
    .select('id, reins_number, property_name, address, price_man, area_sqm, floor_plan, floor_number, built_year, built_month, transaction_type, station, walk_minutes, agent_company, imported_at')
    .order('imported_at', { ascending: false })
    .limit(2000)

  const matches: unknown[] = []
  const partials: unknown[] = []

  for (const p of props ?? []) {
    const r = matchCustomerReins(p, cond)
    if (r.status === 'excluded') continue
    const item = { ...p, match_status: r.status as MatchStatus, reasons: r.reasons, matched: r.matched }
    if (r.status === 'match') matches.push(item)
    else partials.push(item)
  }

  return NextResponse.json({ ok: true, matches, partials })
}
