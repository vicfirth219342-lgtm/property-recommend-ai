import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

// DELETE: セッションをクリア
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('reins_import_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })
  return NextResponse.json({ ok: true }, { headers: corsHeaders() })
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-extension-token',
  }
}
