// GET /api/reins/properties/[id]
// 物件詳細 + 条件一致/一部一致の顧客リスト（都度計算・全有効顧客横断）
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { matchCustomerReins, type ConditionLike, type MatchStatus } from '@/lib/matchCustomerReins'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: property, error } = await supabase
    .from('reins_imported_properties')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !property) {
    return NextResponse.json({ error: '物件が見つかりません' }, { status: 404 })
  }

  const { data: customers } = await supabase
    .from('customers')
    .select('id, customer_no, name, rank, customer_conditions(*)')
    .eq('status', 'active')
    .is('deleted_at', null)

  const matched: Array<{
    customer_id: string
    customer_no: string
    name: string
    rank: string
    status: MatchStatus
    reasons: string[]
    matched: string[]
  }> = []

  for (const c of customers ?? []) {
    const cond = (c.customer_conditions as ConditionLike[] | undefined)?.[0]
    if (!cond) continue
    const r = matchCustomerReins(property, cond)
    if (r.status === 'excluded') continue
    matched.push({
      customer_id: c.id,
      customer_no: c.customer_no,
      name: c.name,
      rank: c.rank,
      status: r.status,
      reasons: r.reasons,
      matched: r.matched,
    })
  }

  return NextResponse.json({
    ok: true,
    property,
    matches: matched.filter(m => m.status === 'match'),
    partials: matched.filter(m => m.status === 'partial'),
  })
}
