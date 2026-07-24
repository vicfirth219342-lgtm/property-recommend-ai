// GET /api/reins/properties
// レインズ取込物件の一覧 + 各物件の「条件一致/一部一致」顧客数（都度計算）
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { matchCustomerReins, type ConditionLike } from '@/lib/matchCustomerReins'

export async function GET() {
  const supabase = createServiceClient()

  const { data: props, error } = await supabase
    .from('reins_imported_properties')
    .select('id, reins_number, property_name, address, price_man, area_sqm, floor_plan, floor_number, built_year, built_month, transaction_type, station, walk_minutes, agent_company, imported_at')
    .order('imported_at', { ascending: false })
    .limit(1000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 有効顧客 + 条件を取得
  const { data: customers } = await supabase
    .from('customers')
    .select('id, customer_conditions(*)')
    .eq('status', 'active')
    .is('deleted_at', null)

  const conds: ConditionLike[] = (customers ?? [])
    .map(c => (c.customer_conditions as ConditionLike[] | undefined)?.[0])
    .filter(Boolean) as ConditionLike[]

  const result = (props ?? []).map(p => {
    let match = 0, partial = 0
    for (const cond of conds) {
      const r = matchCustomerReins(p, cond)
      if (r.status === 'match') match++
      else if (r.status === 'partial') partial++
    }
    return { ...p, match_count: match, partial_count: partial }
  })

  return NextResponse.json({ ok: true, count: result.length, properties: result })
}
