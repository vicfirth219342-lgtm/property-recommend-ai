import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// Chrome拡張からのリクエストにはCORSヘッダーが必要
function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-extension-token',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

// POST /api/reins/search-task
// Webアプリ側から顧客条件を保存。既存のpending/fetchedタスクがあれば上書き。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.customer_id) {
    return NextResponse.json({ error: 'customer_id は必須です' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // 顧客情報を取得
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, customer_conditions(*)')
    .eq('id', body.customer_id)
    .is('deleted_at', null)
    .single()

  if (!customer) {
    return NextResponse.json({ error: '顧客が見つかりません' }, { status: 404 })
  }

  const cond = customer.customer_conditions?.[0] ?? {}

  // 既存のpending/fetchedタスクを削除して新規作成（常に最新条件を渡す）
  await supabase
    .from('reins_search_tasks')
    .delete()
    .eq('customer_id', customer.id)
    .in('status', ['pending', 'fetched'])

  const { data: task, error } = await supabase
    .from('reins_search_tasks')
    .insert({
      customer_id:      customer.id,
      customer_name:    customer.name,
      transaction_type: cond.transaction_type ?? 'sale',
      property_type:    cond.property_type    ?? null,
      area:             cond.area             ?? null,
      budget_min:       cond.budget_min       ?? null,
      budget_max:       cond.budget_max       ?? null,
      rent_min:         cond.rent_min         ?? null,
      rent_max:         cond.rent_max         ?? null,
      area_sqm_min:     cond.area_sqm_min     ?? null,
      walk_minutes_max: cond.walk_minutes_max  ?? null,
      building_age_max: cond.building_age_max  ?? null,
      other_conditions: cond.other_conditions  ?? null,
      status:           'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, task_id: task.id, task })
}

// GET /api/reins/search-task?customer_id=xxx
// Chrome拡張がポーリングして条件を受け取る。取得後は status を fetched に更新。
export async function GET(req: NextRequest) {
  const envToken = process.env.EXTENSION_TOKEN
  if (envToken && req.headers.get('x-extension-token') !== envToken) {
    return NextResponse.json({ error: '認証エラー' }, { status: 401, headers: corsHeaders() })
  }

  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customer_id')
  const taskId = searchParams.get('task_id')

  const supabase = createServiceClient()

  let query = supabase
    .from('reins_search_tasks')
    .select('*')
    .in('status', ['pending', 'fetched'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (taskId) {
    query = supabase
      .from('reins_search_tasks')
      .select('*')
      .eq('id', taskId)
      .limit(1)
  } else if (customerId) {
    query = supabase
      .from('reins_search_tasks')
      .select('*')
      .eq('customer_id', customerId)
      .in('status', ['pending', 'fetched'])
      .order('created_at', { ascending: false })
      .limit(1)
  }

  const { data: tasks } = await query
  const task = tasks?.[0] ?? null

  if (!task) {
    return NextResponse.json({ task: null }, { headers: corsHeaders() })
  }

  // pending → fetched へ遷移（初回取得時のみ）
  if (task.status === 'pending') {
    await supabase
      .from('reins_search_tasks')
      .update({ status: 'fetched', fetched_at: new Date().toISOString() })
      .eq('id', task.id)
  }

  return NextResponse.json({ task }, { headers: corsHeaders() })
}

// DELETE /api/reins/search-task?task_id=xxx
// タスクをキャンセル
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('task_id')
  if (!taskId) return NextResponse.json({ error: 'task_id は必須です' }, { status: 400 })

  const supabase = createServiceClient()
  await supabase.from('reins_search_tasks').delete().eq('id', taskId)

  return NextResponse.json({ ok: true })
}
