import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { extractMultipleFromReinsText, ReinsImportedProperty } from '@/lib/extractProperty'
import { findBestReinsMatch } from '@/lib/matchReins'

const PROPERTY_LIMIT = 300

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const supabase = createServiceClient()

  // ① セッション検証
  const { data: session } = await supabase
    .from('reins_import_sessions')
    .select('id, status, page_count')
    .eq('id', sessionId)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'セッションが見つかりません' }, { status: 404 })
  }

  // ② セッションの全ページテキストを取得
  const { data: pages, error: pagesErr } = await supabase
    .from('reins_import_pages')
    .select('raw_text, page_order, page_url')
    .eq('session_id', sessionId)
    .order('page_order', { ascending: true })

  if (pagesErr || !pages || pages.length === 0) {
    return NextResponse.json({ error: 'ページデータがありません' }, { status: 422 })
  }

  // ③ 全ページから物件を抽出
  const allProps: ReinsImportedProperty[] = []
  for (const page of pages) {
    const extracted = extractMultipleFromReinsText(page.raw_text)
    for (const p of extracted) {
      allProps.push({ ...p, page_url: page.page_url ?? p.page_url })
    }
  }

  if (allProps.length === 0) {
    return NextResponse.json(
      { error: 'レインズ物件を抽出できませんでした。テキストを確認してください。', extracted_count: 0 },
      { status: 422 }
    )
  }

  // 300件超の警告
  const overLimit = allProps.length > PROPERTY_LIMIT
  const props = overLimit ? allProps.slice(0, PROPERTY_LIMIT) : allProps

  // ④ 重複除外（物件番号優先、なければ物件名+価格+面積+階数）
  const seen = new Map<string, ReinsImportedProperty>()
  for (const p of props) {
    let key: string
    if (p.reins_number) {
      key = `no:${p.reins_number}`
    } else {
      key = `name:${p.property_name ?? ''}|price:${p.price_man ?? ''}|area:${p.area_sqm ?? ''}|floor:${p.floor_number ?? ''}`
    }
    if (!seen.has(key)) seen.set(key, p)
  }
  const deduped = Array.from(seen.values())

  // ⑤ reins_imported_properties に保存（session_id付き）
  const rows = deduped.map(p => ({ ...p, session_id: sessionId }))
  const { data: inserted, error: insertErr } = await supabase
    .from('reins_imported_properties')
    .insert(rows)
    .select()

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // ⑥ 未確認の照合候補を全件取得
  const { data: pendingChecks } = await supabase
    .from('pending_reins_checks')
    .select('*')
    .in('match_status', ['pending', 'not_found', 'review'])

  // ⑦ 一括照合
  let updatedCount = 0
  for (const portal of (pendingChecks ?? [])) {
    const { bestReins, result } = findBestReinsMatch(
      {
        property_name: portal.property_name,
        address:       portal.address,
        price_man:     portal.price_man,
        area_sqm:      portal.area_sqm,
        floor_number:  portal.floor_number,
        floor_plan:    portal.floor_plan,
        built_year:    portal.built_year,
        built_month:   portal.built_month,
        reins_number:  portal.reins_number,
      },
      inserted ?? []
    )

    const currentScore = portal.match_score ?? -1
    if (result.score > currentScore) {
      const { error: updErr } = await supabase
        .from('pending_reins_checks')
        .update({
          id:              portal.id,
          match_score:     result.score,
          match_status:    result.status,
          matched_items:   result.matched_items,
          unmatched_items: result.unmatched_items,
          score_detail:    result.score_detail,
          reins_number:    bestReins?.reins_number ?? null,
          agent_company:   bestReins?.agent_company ?? null,
          matched_reins_id: bestReins
            ? (inserted?.find(r => r.reins_number === bestReins.reins_number)?.id ?? null)
            : null,
          checked_at: new Date().toISOString(),
        })
        .eq('id', portal.id)

      if (!updErr) updatedCount++
    }
  }

  // ⑧ セッションを completed に更新
  await supabase
    .from('reins_import_sessions')
    .update({
      status: 'completed',
      property_count: deduped.length,
      completed_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  return NextResponse.json({
    ok: true,
    session_id: sessionId,
    pages_processed: pages.length,
    extracted_count: allProps.length,
    after_dedup: deduped.length,
    over_limit: overLimit,
    matched_portals: updatedCount,
    total_portals: pendingChecks?.length ?? 0,
    reins_properties: deduped.map(p => ({
      reins_number:  p.reins_number,
      property_name: p.property_name,
      address:       p.address,
      price_man:     p.price_man,
      floor_plan:    p.floor_plan,
      agent_company: p.agent_company,
    })),
  })
}
