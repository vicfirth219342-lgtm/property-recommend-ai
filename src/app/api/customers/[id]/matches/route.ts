// GET /api/customers/[id]/matches
// この顧客に合うレインズ物件（一致項目数の多い順）を都度計算で返す
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { matchCustomerReins, type ConditionLike } from '@/lib/matchCustomerReins'

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

  const [{ data: props }, { data: proposals }] = await Promise.all([
    supabase
      .from('reins_imported_properties')
      .select('id, reins_number, property_name, address, price_man, area_sqm, floor_plan, floor_number, built_year, built_month, transaction_type, station, walk_minutes, agent_company, imported_at')
      .order('imported_at', { ascending: false })
      .limit(2000),
    supabase
      .from('customer_reins_proposals')
      .select('reins_property_id')
      .eq('customer_id', id),
  ])

  const proposedIds = new Set((proposals ?? []).map(p => p.reins_property_id))

  const matches: unknown[] = []
  const partials: unknown[] = []

  for (const p of props ?? []) {
    const r = matchCustomerReins(p, cond)
    if (r.status === 'excluded') continue
    const item = {
      ...p,
      match_status: r.status,
      reasons: r.reasons,
      matched: r.matched,
      matched_count: r.matched.length,
      proposed: proposedIds.has(p.id),
    }
    if (r.status === 'match') matches.push(item)
    else partials.push(item)
  }

  // 一致項目数の多い順にソート
  const byMatchedCount = (a: any, b: any) => (b.matched_count ?? 0) - (a.matched_count ?? 0)
  matches.sort(byMatchedCount)
  partials.sort(byMatchedCount)

  return NextResponse.json({ ok: true, matches, partials })
}
