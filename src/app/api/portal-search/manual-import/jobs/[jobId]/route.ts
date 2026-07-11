import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/portal-search/manual-import/jobs/[jobId] — ジョブ・ファイル・候補一覧
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params
  const supabase = createServiceClient()

  const [{ data: job, error: jErr }, { data: files }, { data: candidates }] = await Promise.all([
    supabase.from('manual_import_jobs').select('*').eq('id', jobId).single(),
    supabase.from('manual_import_files').select('id, file_name, page_number, status, detected_count, error_message').eq('job_id', jobId).order('created_at', { ascending: true }),
    supabase.from('manual_import_candidates').select('*').eq('job_id', jobId).order('created_at', { ascending: true }),
  ])
  if (jErr || !job) return NextResponse.json({ error: 'ジョブが見つかりません' }, { status: 404 })

  return NextResponse.json({ job, files: files ?? [], candidates: candidates ?? [] })
}

// PATCH /api/portal-search/manual-import/jobs/[jobId] — 候補の選択状態を更新（部分確定用）
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params
  const supabase = createServiceClient()
  const body = await req.json().catch(() => ({}))
  const updates = body.candidates as Array<{ id: string; is_selected: boolean }> | undefined
  if (!updates || !Array.isArray(updates)) {
    return NextResponse.json({ error: 'candidates[] が必要です' }, { status: 400 })
  }
  for (const u of updates) {
    await supabase.from('manual_import_candidates')
      .update({ is_selected: u.is_selected })
      .eq('id', u.id).eq('job_id', jobId)
  }
  return NextResponse.json({ ok: true })
}
