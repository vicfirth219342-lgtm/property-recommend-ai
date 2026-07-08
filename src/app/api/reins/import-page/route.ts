import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const MAX_PAGES_PER_SESSION = 30

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

// POST: 1ページ分のテキストをセッションに追加（照合はしない）
export async function POST(req: NextRequest) {
  const envToken = process.env.EXTENSION_TOKEN
  if (envToken) {
    if (req.headers.get('x-extension-token') !== envToken) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401, headers: corsHeaders() })
    }
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body.text !== 'string' || body.text.trim().length < 20) {
    return NextResponse.json({ error: 'text が空または短すぎます' }, { status: 400, headers: corsHeaders() })
  }

  const { text, page_url = '', session_id: clientSessionId } = body as {
    text: string
    page_url?: string
    session_id?: string
  }

  const supabase = createServiceClient()

  // セッション取得 or 新規作成
  let sessionId: string

  if (clientSessionId) {
    const { data: existing } = await supabase
      .from('reins_import_sessions')
      .select('id, status, page_count')
      .eq('id', clientSessionId)
      .single()

    if (existing && existing.status === 'collecting') {
      if (existing.page_count >= MAX_PAGES_PER_SESSION) {
        return NextResponse.json(
          { error: `1セッションに追加できるページは最大${MAX_PAGES_PER_SESSION}ページです` },
          { status: 400, headers: corsHeaders() }
        )
      }
      sessionId = existing.id
    } else {
      // セッションが無効なら新規作成
      const { data: newSession } = await supabase
        .from('reins_import_sessions')
        .insert({ status: 'collecting' })
        .select()
        .single()
      sessionId = newSession!.id
    }
  } else {
    // collecting 中のセッションがあれば再利用
    const { data: openSession } = await supabase
      .from('reins_import_sessions')
      .select('id, page_count')
      .eq('status', 'collecting')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (openSession && openSession.page_count < MAX_PAGES_PER_SESSION) {
      sessionId = openSession.id
    } else {
      const { data: newSession } = await supabase
        .from('reins_import_sessions')
        .insert({ status: 'collecting' })
        .select()
        .single()
      sessionId = newSession!.id
    }
  }

  // ページ数カウント（現在のページ順）
  const { count: currentPageCount } = await supabase
    .from('reins_import_pages')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  const pageOrder = (currentPageCount ?? 0) + 1

  // ── [DEBUG] ② API受信直後のログ ────────────────────────────
  const isTableFmt = text.includes('__TABLE_FORMAT__')
  console.log(`[DEBUG] ② API受信: 文字数=${text.length} / TABLE形式=${isTableFmt}`)
  console.log('[DEBUG] 先頭600文字:\n' + text.slice(0, 600))
  // 最初の __ROW__ 区切りを確認
  if (isTableFmt) {
    const rows = text.split('\n__ROW__\n')
    console.log(`[DEBUG] ROW数: ${rows.length}`)
    const firstRow = rows[0] ?? ''
    const cells = firstRow.split('\n__CELL__\n')
    console.log(`[DEBUG] 1行目のCELL数: ${cells.length}`)
    cells.forEach((c, i) => console.log(`[DEBUG] CELL[${i}]: ${c.slice(0, 100).replace(/\n/g, '\\n')}`))
  }
  // ────────────────────────────────────────────────────────────

  // ページを保存
  const { error: pageErr } = await supabase
    .from('reins_import_pages')
    .insert({
      session_id: sessionId,
      page_url: page_url || null,
      raw_text: text.slice(0, 50000), // 最大50KB/ページ
      page_order: pageOrder,
    })

  if (pageErr) {
    return NextResponse.json({ error: pageErr.message }, { status: 500, headers: corsHeaders() })
  }

  // セッションのpage_countを更新
  await supabase
    .from('reins_import_sessions')
    .update({ page_count: pageOrder })
    .eq('id', sessionId)

  return NextResponse.json(
    { ok: true, session_id: sessionId, page_count: pageOrder },
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
