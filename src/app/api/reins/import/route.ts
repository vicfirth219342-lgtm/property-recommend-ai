// ============================================================
// POST /api/reins/import
// Chrome拡張「このページを追加」から呼ばれる新・取込エンドポイント。
//   1. レインズ検索結果テキストを受信
//   2. extractMultipleFromReinsText で物件を抽出
//   3. reins_imported_properties に保存（reins_number 重複は更新）
//   4. 照合はしない（物件/顧客画面で都度計算する）
// 取得できない項目は空欄で保存し、エラーで全体を止めない。
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { extractMultipleFromReinsText } from '@/lib/extractProperty'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

export async function POST(req: NextRequest) {
  // 任意APIトークン認証（設定時のみ）
  const envToken = process.env.EXTENSION_TOKEN
  if (envToken && req.headers.get('x-extension-token') !== envToken) {
    return NextResponse.json({ error: '認証エラー' }, { status: 401, headers: corsHeaders() })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body.text !== 'string' || body.text.trim().length < 20) {
    return NextResponse.json({ error: 'text が空または短すぎます' }, { status: 400, headers: corsHeaders() })
  }

  const { text, page_url = '' } = body as { text: string; page_url?: string }

  // ① 抽出
  const props = extractMultipleFromReinsText(text)
  if (props.length === 0) {
    return NextResponse.json(
      { error: 'レインズ物件を抽出できませんでした。テキストを確認してください。', imported_count: 0 },
      { status: 422, headers: corsHeaders() }
    )
  }

  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // ② reins_number 有無で分岐
  //    - reins_number あり: upsert（重複は最新情報で更新）
  //    - reins_number なし: そのまま insert
  const withNumber = props
    .filter(p => p.reins_number)
    .map(p => ({ ...p, page_url: page_url || p.page_url || null, imported_at: now }))
  const withoutNumber = props
    .filter(p => !p.reins_number)
    .map(p => ({ ...p, page_url: page_url || p.page_url || null, imported_at: now }))

  let importedCount = 0
  const errors: string[] = []

  // reins_number は UNIQUE 制約が無いため手動 upsert（既存を更新・無ければ挿入）
  if (withNumber.length > 0) {
    const numbers = withNumber.map(p => p.reins_number as string)
    const { data: existing } = await supabase
      .from('reins_imported_properties')
      .select('id, reins_number')
      .in('reins_number', numbers)
    const idByNumber = new Map((existing ?? []).map(r => [r.reins_number, r.id]))

    for (const row of withNumber) {
      const existingId = idByNumber.get(row.reins_number as string)
      if (existingId) {
        const { error } = await supabase
          .from('reins_imported_properties')
          .update(row)
          .eq('id', existingId)
        if (error) errors.push(error.message); else importedCount++
      } else {
        const { error } = await supabase
          .from('reins_imported_properties')
          .insert(row)
        if (error) errors.push(error.message); else importedCount++
      }
    }
  }

  if (withoutNumber.length > 0) {
    const { data, error } = await supabase
      .from('reins_imported_properties')
      .insert(withoutNumber)
      .select('id')
    if (error) errors.push(error.message)
    else importedCount += data?.length ?? 0
  }

  if (errors.length > 0 && importedCount === 0) {
    return NextResponse.json({ error: errors.join(' / '), imported_count: 0 }, { status: 500, headers: corsHeaders() })
  }

  return NextResponse.json(
    { ok: true, extracted_count: props.length, imported_count: importedCount, warnings: errors },
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
