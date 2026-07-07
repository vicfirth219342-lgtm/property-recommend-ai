import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 提案済みとして記録
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()
  const { customer_id, property_ids, batch_id } = body

  if (!customer_id || !property_ids?.length) {
    return NextResponse.json({ error: 'customer_id and property_ids required' }, { status: 400 })
  }

  const rows = property_ids.map((property_id: string) => ({
    customer_id,
    property_id,
    batch_id,
  }))

  const { error } = await supabase.from('proposals').upsert(rows, { onConflict: 'customer_id,property_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ saved: rows.length })
}
