import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { generateSearchUrls } from '@/lib/url-generator'

// 検索URL保存
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()
  const { customer_id, site, url } = body

  const { data, error } = await supabase
    .from('customer_search_urls')
    .upsert({ customer_id, site, url, is_active: true }, { onConflict: 'customer_id,site' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// 検索URL自動生成（保存はしない）
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customer_id')

  if (!customerId) return NextResponse.json({ error: 'customer_id required' }, { status: 400 })

  const { data: condition, error } = await supabase
    .from('customer_conditions')
    .select('*')
    .eq('customer_id', customerId)
    .single()

  if (error || !condition) return NextResponse.json({ error: 'condition not found' }, { status: 404 })

  const urls = generateSearchUrls(condition)
  return NextResponse.json(urls)
}
