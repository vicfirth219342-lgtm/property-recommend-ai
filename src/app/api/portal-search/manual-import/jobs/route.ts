import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/portal-search/manual-import/jobs?customer_id=xxx — 手動取込履歴
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const customerId = req.nextUrl.searchParams.get('customer_id')

  let query = supabase.from('manual_import_jobs').select('*, customers(name)').order('created_at', { ascending: false }).limit(50)
  if (customerId) query = query.eq('customer_id', customerId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ jobs: data ?? [] })
}
