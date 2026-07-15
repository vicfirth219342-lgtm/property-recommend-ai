import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { generateAndSaveUrls } from '@/lib/urlGenerationService'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'active'

  const query = supabase
    .from('customers')
    .select(`
      *,
      customer_conditions(*),
      customer_search_urls(*)
    `)
    .is('deleted_at', null)
    .order('customer_no')

  if (status !== 'all') {
    query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()

  const {
    customer_no: rawCustomerNo, name, email, phone, rank, sales_memo, status,
    // condition fields
    transaction_type,
    area, property_type,
    budget_min, budget_max,
    rent_min, rent_max,
    area_sqm_min, area_sqm_max, walk_minutes_max, building_age_max, other_conditions,
  } = body

  // customer_no をサーバー側で決定（フロントから渡された値 or 自動採番）
  // 重複時はリトライして次の番号を使う
  async function resolveCustomerNo(hint?: string): Promise<string> {
    if (hint && hint.trim()) {
      // フロントから渡された番号を使うが、重複チェックしない（INSERT 結果で判断）
      return hint.trim()
    }
    // 自動採番: 削除済み含む全顧客から最大番号を取得して +1
    // （unique制約は削除済みレコードにも適用されるため除外してはいけない）
    const { data } = await supabase
      .from('customers')
      .select('customer_no')
      .order('created_at', { ascending: false })
      .limit(500)
    let maxNum = 0
    for (const row of data ?? []) {
      const m = row.customer_no?.match(/^C?(\d+)$/)
      if (m) { const n = parseInt(m[1]); if (n > maxNum) maxNum = n }
    }
    return `C${String(maxNum + 1).padStart(3, '0')}`
  }

  // 顧客作成（重複時はリトライ）
  let customer = null
  let custErr = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const customer_no = attempt === 0
      ? await resolveCustomerNo(rawCustomerNo)
      : await resolveCustomerNo() // 2回目以降は必ず再採番

    const res = await supabase
      .from('customers')
      .insert({ customer_no, name, email, phone, rank, sales_memo, status: status ?? 'active' })
      .select()
      .single()

    if (!res.error) { customer = res.data; custErr = null; break }
    // unique 制約違反なら再試行、それ以外は即エラー
    if (!res.error.message.includes('unique constraint')) { custErr = res.error; break }
    custErr = res.error
  }

  if (custErr || !customer) return NextResponse.json({ error: custErr?.message ?? '顧客の作成に失敗しました' }, { status: 500 })

  // 条件作成
  await supabase.from('customer_conditions').insert({
    customer_id: customer.id,
    transaction_type: transaction_type ?? 'sale',
    area, property_type,
    budget_min, budget_max,
    rent_min, rent_max,
    area_sqm_min, area_sqm_max, walk_minutes_max, building_age_max, other_conditions,
  })

  // 変更ログ
  await supabase.from('customer_change_logs').insert({
    customer_id: customer.id,
    action: 'create',
    after_data: customer,
  })

  // 検索URLを自動生成 (fire-and-forget)
  if (area || property_type || budget_min || budget_max || rent_min || rent_max) {
    const condForGen = {
      customer_id:      customer.id,
      transaction_type: transaction_type ?? 'sale',
      area, property_type,
      budget_min, budget_max,
      rent_min, rent_max,
      area_sqm_min, area_sqm_max, walk_minutes_max, building_age_max,
      other_conditions: body.other_conditions ?? null,
    }
    generateAndSaveUrls(customer.id, condForGen as Parameters<typeof generateAndSaveUrls>[1], supabase)
      .catch(err => console.error('[POST /customers] URL generation failed:', err))
  }

  return NextResponse.json(customer, { status: 201 })
}
