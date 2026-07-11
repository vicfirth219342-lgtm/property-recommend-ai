import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/portal-search/jobs?customer_id=xxx — 一括検索ジョブ一覧
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customer_id')

  let q = supabase
    .from('portal_search_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
  if (customerId) q = q.eq('customer_id', customerId)

  const { data: jobs, error } = await q
  if (error) return NextResponse.json({ error: error.message, jobs: [] }, { status: 500 })

  return NextResponse.json({ jobs: jobs ?? [] })
}
