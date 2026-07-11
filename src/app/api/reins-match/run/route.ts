import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import {
  matchAgainstReins,
  SCORING_VERSION,
  type PortalProperty,
  type ReinsProperty,
} from '@/lib/reinsAutoMatch'

// not_found 原因分類
// no_candidates        : レインズ候補が1件も取得できなかった
// below_threshold      : 候補は存在したが、スコアが基準未満
// all_candidates_blocked: 候補は存在したが全件ガード対象
// fetch_error          : データ取得または照合処理でエラー
// unknown              : 判定不可
function classifyNotFoundReason(
  outcome: ReturnType<typeof matchAgainstReins>
): string {
  if (outcome.candidates.length === 0) return 'no_candidates'

  const allBlocked = outcome.candidates.every(c => c.result.detail.verdict === 'BLOCKED')
  if (allBlocked) return 'all_candidates_blocked'

  const allBelowThreshold = outcome.candidates.every(c => c.result.detail.verdict === 'NO_MATCH')
  if (allBelowThreshold) return 'below_threshold'

  return 'unknown'
}

// POST /api/reins-match/run
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json().catch(() => ({}))
  const { queue_ids, limit = 50 } = body as { queue_ids?: string[]; limit?: number }

  let query = supabase
    .from('reins_check_queue')
    .select('id, property_id, customer_id, status')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(Math.min(limit, 200))

  if (queue_ids?.length) query = query.in('id', queue_ids)
  else query = query.in('status', ['queued', 'needs_review'])

  const { data: queue, error: qErr } = await query
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })
  if (!queue?.length) return NextResponse.json({ ok: true, processed: 0, message: '照合対象がありません' })

  const propIds = [...new Set(queue.map(q => q.property_id))]
  const { data: props, error: pErr } = await supabase
    .from('properties')
    .select('id, name, address, current_price, area_sqm, built_year, floor_number, room_number, nearest_station')
    .in('id', propIds)
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
  const propMap = new Map((props ?? []).map(p => [p.id, p as PortalProperty]))

  const reinsAll: ReinsProperty[] = []
  for (let from = 0; from < 10000; from += 1000) {
    const { data: page, error: rErr } = await supabase
      .from('reins_imported_properties')
      .select('id, reins_number, property_name, address, price_man, area_sqm, built_year, floor_number, station')
      .range(from, from + 999)
    if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })
    if (!page?.length) break
    reinsAll.push(...(page as ReinsProperty[]))
    if (page.length < 1000) break
  }

  const summary = {
    processed: 0,
    auto_match: 0,
    needs_review: 0,
    not_found: 0,
    downgraded: 0,
    errors: [] as string[],
    not_found_reasons: {} as Record<string, number>,
  }

  for (const q of queue) {
    const portal = propMap.get(q.property_id)
    if (!portal) { summary.errors.push(`property not found: ${q.property_id}`); continue }

    const outcome = matchAgainstReins(portal, reinsAll)

    // ① 候補を洗い替え
    await supabase.from('reins_match_candidates').delete().eq('queue_id', q.id)

    const candidateIdByRank = new Map<number, string>()
    for (const c of outcome.candidates) {
      const matchedFields = Object.entries(c.result.detail.items)
        .filter(([, v]) => v.points > 0).map(([k]) => k)
      const unmatchedFields = Object.entries(c.result.detail.items)
        .filter(([, v]) => v.match === 'mismatch' || v.match.endsWith('_mismatch')).map(([k]) => k)

      const { data: inserted, error: cErr } = await supabase
        .from('reins_match_candidates')
        .insert({
          queue_id: q.id,
          reins_property_id: c.reins.id,
          score: c.result.score,
          score_detail: c.result.detail,
          matched_fields: matchedFields,
          unmatched_fields: unmatchedFields,
          rank: c.rank,
        })
        .select('id')
        .single()
      if (cErr) { summary.errors.push(`candidate insert (${q.id}): ${cErr.message}`); continue }
      candidateIdByRank.set(c.rank, inserted.id)
    }

    // ② 結果を append-only で INSERT
    const best = outcome.candidates[0] ?? null
    const verdictMap: Record<string, string> = {
      AUTO_MATCH: 'confirmed',
      NEEDS_REVIEW: 'inconclusive',
      BLOCKED: 'inconclusive',
      NO_MATCH: 'not_found',
      NOT_FOUND: 'not_found',
    }
    const gapNote = outcome.gap
      ? `best=${outcome.gap.best_score} second=${outcome.gap.second_score} gap=${outcome.gap.score_gap}${outcome.gap.downgraded ? ' (gap<=5のため降格)' : ''}`
      : 'レインズ側に候補なし'

    const { error: rErr2 } = await supabase.from('reins_match_results').insert({
      queue_id: q.id,
      candidate_id: best ? candidateIdByRank.get(1) ?? null : null,
      verdict: verdictMap[outcome.finalVerdict],
      method: 'auto',
      decided_by: `system/v${SCORING_VERSION}`,
      reins_number: outcome.finalVerdict === 'AUTO_MATCH' ? best?.reins.reins_number ?? null : null,
      agent_company: null,
      note: gapNote,
    })
    if (rErr2) { summary.errors.push(`result insert (${q.id}): ${rErr2.message}`); continue }

    // ③ not_found 原因を分類して保存
    const isNotFound = ['NO_MATCH', 'NOT_FOUND'].includes(outcome.finalVerdict)
    const notFoundReason = isNotFound ? classifyNotFoundReason(outcome) : null

    // ④ キューのステータス同期
    const statusMap: Record<string, string> = {
      AUTO_MATCH: 'matched',
      NEEDS_REVIEW: 'needs_review',
      BLOCKED: 'needs_review',
      NO_MATCH: 'not_found',
      NOT_FOUND: 'not_found',
    }
    const updatePayload: Record<string, unknown> = {
      status: statusMap[outcome.finalVerdict],
      updated_at: new Date().toISOString(),
    }
    if (notFoundReason) updatePayload.not_found_reason = notFoundReason

    await supabase.from('reins_check_queue')
      .update(updatePayload)
      .eq('id', q.id)

    summary.processed++
    if (outcome.finalVerdict === 'AUTO_MATCH') summary.auto_match++
    else if (outcome.finalVerdict === 'NEEDS_REVIEW' || outcome.finalVerdict === 'BLOCKED') summary.needs_review++
    else {
      summary.not_found++
      if (notFoundReason) summary.not_found_reasons[notFoundReason] = (summary.not_found_reasons[notFoundReason] ?? 0) + 1
    }
    if (outcome.gap?.downgraded) summary.downgraded++
  }

  return NextResponse.json({ ok: true, scoring_version: SCORING_VERSION, reins_total: reinsAll.length, ...summary })
}
