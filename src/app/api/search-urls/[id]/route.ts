import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 検索URLの有効/無効切り替え（削除はしない。広域・条件未指定URL等を安全に外すため）
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = createServiceClient()
  const body = await req.json().catch(() => ({}))
  const { is_active } = body as { is_active?: boolean }

  if (typeof is_active !== 'boolean') {
    return NextResponse.json({ error: 'is_active(boolean) is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('customer_search_urls')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
