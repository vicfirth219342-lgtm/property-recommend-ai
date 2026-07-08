import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { extractMultipleFromReinsText } from '@/lib/extractProperty'
import { findBestReinsMatch } from '@/lib/matchReins'

// Chrome拡張機能からのCORSプリフライト
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

// GET: 取り込み履歴サマリー
export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('reins_imported_properties')
    .select('id, imported_at, page_url')
    .order('imported_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })
  return NextResponse.json(data, { headers: corsHeaders() })
}

// POST: Chrome拡張からレインズ検索結果を受信 → 抽出 → 一括照合
export async function POST(req: NextRequest) {
  // 任意APIトークン認証
  const envToken = process.env.EXTENSION_TOKEN
  if (envToken) {
    const sentToken = req.headers.get('x-extension-token')
    if (sentToken !== envToken) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401, headers: corsHeaders() })
    }
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body.text !== 'string' || body.text.trim().length < 20) {
    return NextResponse.json({ error: 'text が空または短すぎます' }, { status: 400, headers: corsHeaders() })
  }

  const { text, page_url = '' } = body as { source?: string; text: string; page_url?: string }

  const supabase = createServiceClient()

  // ① レインズテキストから複数物件を抽出
  const reinsProps = extractMultipleFromReinsText(text)
  if (reinsProps.length === 0) {
    return NextResponse.json(
      { error: 'レインズ物件を抽出できませんでした。テキストを確認してください。', extracted_count: 0 },
      { status: 422, headers: corsHeaders() }
    )
  }

  // ② reins_imported_properties に保存
  const rows = reinsProps.map(p => ({ ...p, page_url }))
  const { data: inserted, error: insertErr } = await supabase
    .from('reins_imported_properties')
    .insert(rows)
    .select()

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500, headers: corsHeaders() })
  }

  // ③ 未確認のポータル候補物件を全件取得
  const { data: pendingChecks, error: fetchErr } = await supabase
    .from('pending_reins_checks')
    .select('*')
    .in('match_status', ['pending', 'not_found', 'review'])  // 掲載確定以外を対象

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500, headers: corsHeaders() })
  }

  // ④ 一括照合（各ポータル物件 × 今回取り込んだレインズ物件）
  const matchUpdates: Array<{
    id: string
    match_score: number
    match_status: string
    matched_items: string[]
    unmatched_items: string[]
    score_detail: unknown
    reins_number: string | null
    agent_company: string | null
    reins_page_url: string
    matched_reins_id: string | null
    checked_at: string
  }> = []

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
        station:       portal.station,
        walk_minutes:  portal.walk_minutes,
      },
      inserted ?? []
    )

    // 今回の照合スコアが既存スコアより高い場合のみ更新
    const currentScore = portal.match_score ?? -1
    if (result.score > currentScore) {
      matchUpdates.push({
        id:              portal.id,
        match_score:     result.score,
        match_status:    result.status,
        matched_items:   result.matched_items,
        unmatched_items: result.unmatched_items,
        score_detail:    result.score_detail,
        reins_number:    bestReins?.reins_number ?? null,
        agent_company:   bestReins?.agent_company ?? null,
        reins_page_url:  page_url,
        matched_reins_id: bestReins
          ? (inserted?.find(r => r.reins_number === bestReins.reins_number)?.id ?? null)
          : null,
        checked_at:      new Date().toISOString(),
      })
    }
  }

  // ⑤ 照合結果を一括更新
  let updatedCount = 0
  for (const upd of matchUpdates) {
    const { error: updErr } = await supabase
      .from('pending_reins_checks')
      .update(upd)
      .eq('id', upd.id)
    if (!updErr) updatedCount++
  }

  return NextResponse.json(
    {
      ok: true,
      extracted_count:   reinsProps.length,
      matched_portals:   updatedCount,
      total_portals:     pendingChecks?.length ?? 0,
      reins_properties:  inserted?.map(r => ({
        reins_number:     r.reins_number,
        property_name:    r.property_name,
        address:          r.address,
        price_man:        r.price_man,
        floor_plan:       r.floor_plan,
        floor_number:     r.floor_number,
      })),
    },
    { headers: corsHeaders() }
  )
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-extension-token',
  }
}
