import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// POST /api/reins-queue/judge — 手動判定（append-only INSERT）
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()
  const {
    queue_id,
    candidate_id,
    verdict,       // confirmed | rejected | not_found | inconclusive
    decided_by,
    note,
    reins_number,
    agent_company,
  } = body as {
    queue_id: string
    candidate_id?: string | null
    verdict: string
    decided_by: string
    note?: string
    reins_number?: string | null
    agent_company?: string | null
  }

  if (!queue_id || !verdict || !decided_by) {
    return NextResponse.json({ error: 'queue_id, verdict, decided_by は必須です' }, { status: 400 })
  }

  const validVerdicts = ['confirmed', 'rejected', 'not_found', 'inconclusive']
  if (!validVerdicts.includes(verdict)) {
    return NextResponse.json({ error: `verdict は ${validVerdicts.join('/')} のいずれかです` }, { status: 400 })
  }

  // 現在のキュー状態を取得（監査ログ用）
  const { data: currentQueue } = await supabase
    .from('reins_check_queue')
    .select('status, not_found_reason, property_id')
    .eq('id', queue_id)
    .single()

  // append-only: INSERT のみ
  const { data: result, error: rErr } = await supabase
    .from('reins_match_results')
    .insert({
      queue_id,
      candidate_id: candidate_id ?? null,
      verdict,
      method: 'manual',
      decided_by,
      reins_number: reins_number ?? null,
      agent_company: agent_company ?? null,
      note: note ?? null,
    })
    .select()
    .single()

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })

  // キューステータス同期
  const statusMap: Record<string, string> = {
    confirmed: 'matched',
    rejected: 'needs_review',
    inconclusive: 'needs_review',
    not_found: 'not_found',
  }
  const newStatus = statusMap[verdict]

  const queueUpdate: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  }
  // manually_not_found: 人が「一致なし」と判定した場合
  if (verdict === 'not_found') {
    queueUpdate.not_found_reason = 'manually_not_found'
  } else if (verdict === 'inconclusive') {
    // 再確認に戻す場合は not_found_reason をクリア
    queueUpdate.not_found_reason = null
  }

  await supabase
    .from('reins_check_queue')
    .update(queueUpdate)
    .eq('id', queue_id)

  // 監査ログ
  const operationMap: Record<string, string> = {
    confirmed: 'manual_confirm',
    rejected: 'candidate_reject',
    not_found: 'not_found',
    inconclusive: 'back_to_review',
  }
  // 監査ログ（失敗しても主処理は止めない）
  try {
    await supabase.from('reins_audit_logs').insert({
      queue_id,
      property_id: currentQueue?.property_id ?? null,
      operation: operationMap[verdict],
      operator: decided_by,
      before_value: { status: currentQueue?.status ?? null, not_found_reason: currentQueue?.not_found_reason ?? null },
      after_value: { status: newStatus, verdict, candidate_id: candidate_id ?? null, reins_number: reins_number ?? null },
      note: note ?? null,
    })
  } catch (_) { /* ignore audit log errors */ }

  return NextResponse.json({ ok: true, result })
}
