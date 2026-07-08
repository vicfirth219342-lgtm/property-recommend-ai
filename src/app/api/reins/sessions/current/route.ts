import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

// GET: 現在進行中のセッション情報を返す
export async function GET() {
  const supabase = createServiceClient()

  const { data: session } = await supabase
    .from('reins_import_sessions')
    .select('id, status, page_count, property_count, created_at')
    .eq('status', 'collecting')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!session) {
    return NextResponse.json({ session: null }, { headers: corsHeaders() })
  }

  // ページ一覧を取得
  const { data: pages } = await supabase
    .from('reins_import_pages')
    .select('id, page_url, page_order, imported_at')
    .eq('session_id', session.id)
    .order('page_order', { ascending: true })

  return NextResponse.json(
    { session: { ...session, pages: pages ?? [] } },
    { headers: corsHeaders() }
  )
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-extension-token',
  }
}
