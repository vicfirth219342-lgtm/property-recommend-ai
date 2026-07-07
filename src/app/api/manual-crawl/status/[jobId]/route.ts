import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('crawl_jobs')
    .select('id, status, site, portal_name, url, properties_found, new_count, result, error_message, started_at, finished_at, created_at')
    .eq('id', jobId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'ジョブが見つかりません' }, { status: 404 })
  return NextResponse.json(data)
}
