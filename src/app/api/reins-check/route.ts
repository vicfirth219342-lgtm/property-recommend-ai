import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { extractFromText, extractFromCsvRows, buildSearchKeywords, ExtractedProperty } from '@/lib/extractProperty'

// GET: 一覧取得
export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('pending_reins_checks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST: 物件を登録（抽出後の確定データ）
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()

  const {
    source_type = 'manual',
    raw_input,
    properties,  // ExtractedProperty[]（クライアント側で抽出済み）
  } = body

  if (!properties?.length) {
    return NextResponse.json({ error: 'properties が空です' }, { status: 400 })
  }

  const rows = (properties as ExtractedProperty[]).map(p => ({
    ...p,
    source_type,
    raw_input: raw_input ?? null,
    search_keywords: buildSearchKeywords(p),
  }))

  const { data, error } = await supabase
    .from('pending_reins_checks')
    .insert(rows)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// テキスト・CSV から抽出して返す（DBには保存しない）
export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { type, content, headers, rows } = body

  let extracted: ExtractedProperty[] = []

  if (type === 'csv' && headers && rows) {
    extracted = extractFromCsvRows(headers as string[], rows as string[][])
  } else if (type === 'email' || type === 'text' || type === 'url_text') {
    const prop = extractFromText(content as string)
    if (Object.values(prop).some(Boolean)) extracted = [prop]
  } else {
    return NextResponse.json({ error: '不明な type です' }, { status: 400 })
  }

  const withKeywords = extracted.map(p => ({
    ...p,
    search_keywords: buildSearchKeywords(p),
  }))

  return NextResponse.json(withKeywords)
}
