// GET /api/dashboard/stats
// ダッシュボード用の集計（都度計算）
//   登録顧客数 / 取込物件数 / 条件一致件数 / 一部条件一致件数
// 一致件数 = 全レインズ物件 × 全有効顧客 の照合で match / partial になった組の総数
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { matchCustomerReins, type ConditionLike } from '@/lib/matchCustomerReins'

export async function GET() {
  const supabase = createServiceClient()

  const [{ count: customerCount }, { count: propertyCount }] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true })
      .eq('status', 'active').is('deleted_at', null),
    supabase.from('reins_imported_properties').select('id', { count: 'exact', head: true }),
  ])

  const { data: customers } = await supabase
    .from('customers')
    .select('id, customer_conditions(*)')
    .eq('status', 'active')
    .is('deleted_at', null)

  const conds: ConditionLike[] = (customers ?? [])
    .map(c => (c.customer_conditions as ConditionLike[] | undefined)?.[0])
    .filter(Boolean) as ConditionLike[]

  const { data: props } = await supabase
    .from('reins_imported_properties')
    .select('property_name, address, station, price_man, area_sqm, floor_plan, walk_minutes, built_year, built_month, transaction_type')
    .limit(2000)

  let matchCount = 0
  let partialCount = 0
  for (const p of props ?? []) {
    for (const cond of conds) {
      const r = matchCustomerReins(p, cond)
      if (r.status === 'match') matchCount++
      else if (r.status === 'partial') partialCount++
    }
  }

  return NextResponse.json({
    ok: true,
    customer_count: customerCount ?? 0,
    property_count: propertyCount ?? 0,
    match_count: matchCount,
    partial_count: partialCount,
  })
}
