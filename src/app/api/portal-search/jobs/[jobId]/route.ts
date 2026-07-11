import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/portal-search/jobs/[jobId] — ジョブ詳細（ポータル別結果つき）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params
  const supabase = createServiceClient()

  const [{ data: job, error: jErr }, { data: results }] = await Promise.all([
    supabase.from('portal_search_jobs').select('*').eq('id', jobId).single(),
    supabase.from('portal_search_job_results').select('*').eq('job_id', jobId).order('created_at', { ascending: true }),
  ])
  if (jErr || !job) return NextResponse.json({ error: 'ジョブが見つかりません' }, { status: 404 })

  return NextResponse.json({ job, results: results ?? [] })
}
