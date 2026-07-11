import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET: 未解決エリア一覧
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'unresolved'

  const { data, error } = await supabase
    .from('unresolved_area_mappings')
    .select('*')
    .eq('status', status)
    .order('occurrence_count', { ascending: false })
    .order('last_seen_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
