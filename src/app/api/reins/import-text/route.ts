import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { matchFromReinsText } from '@/lib/matchReins'
import { extractFromText } from '@/lib/extractProperty'

// Chrome拡張機能からのCORSプリフライトを許可
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  })
}

export async function POST(req: NextRequest) {
  // 任意のAPI Tokenチェック（EXTENSION_TOKEN 環境変数が設定されている場合のみ検証）
  const envToken = process.env.EXTENSION_TOKEN
  if (envToken) {
    const sentToken = req.headers.get('x-extension-token')
    if (sentToken !== envToken) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401, headers: corsHeaders() })
    }
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body.text !== 'string' || !body.customer_search_url_id) {
    return NextResponse.json(
      { error: 'text と customer_search_url_id は必須です' },
      { status: 400, headers: corsHeaders() }
    )
  }

  const { text, customer_search_url_id } = body as {
    source?: string
    text: string
    customer_search_url_id: string
  }

  const supabase = createServiceClient()

  // 対象の照合レコードを取得
  const { data: original, error: fetchErr } = await supabase
    .from('pending_reins_checks')
    .select('*')
    .eq('id', customer_search_url_id)
    .single()

  if (fetchErr || !original) {
    return NextResponse.json(
      { error: '物件が見つかりません' },
      { status: 404, headers: corsHeaders() }
    )
  }

  // 既存の照合ロジックに流す（手動貼り付けと同一処理）
  const matchResult = matchFromReinsText(
    {
      property_name: original.property_name,
      address: original.address,
      price_man: original.price_man,
      area_sqm: original.area_sqm,
      floor_number: original.floor_number,
      built_year: original.built_year,
      built_month: original.built_month,
      station: original.station,
      walk_minutes: original.walk_minutes,
      floor_plan: original.floor_plan,
    },
    text
  )

  const extracted = extractFromText(text)

  const { data, error } = await supabase
    .from('pending_reins_checks')
    .update({
      reins_input: text,
      match_score: matchResult.score,
      match_status: matchResult.status,
      matched_items: matchResult.matched_items,
      unmatched_items: matchResult.unmatched_items,
      score_detail: matchResult.score_detail,
      checked_at: new Date().toISOString(),
    })
    .eq('id', customer_search_url_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })
  }

  return NextResponse.json(
    {
      ok: true,
      score: matchResult.score,
      status: matchResult.status,
      matched_items: matchResult.matched_items,
      unmatched_items: matchResult.unmatched_items,
      score_detail: matchResult.score_detail,
      _extracted: extracted,
      property_name: original.property_name,
    },
    { headers: corsHeaders() }
  )
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-extension-token',
  }
}
