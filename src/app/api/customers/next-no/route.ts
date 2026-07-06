import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 最新の顧客Noを取得して次の番号を返す
// 形式: C001, C002 ... C999, C1000 ...
export async function GET() {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('customers')
    .select('customer_no')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  // 既存のCxxxパターンから最大番号を抽出
  let maxNum = 0
  for (const row of data ?? []) {
    const match = row.customer_no?.match(/^C?(\d+)$/)
    if (match) {
      const n = parseInt(match[1])
      if (n > maxNum) maxNum = n
    }
  }

  const nextNum = maxNum + 1
  const nextNo = `C${String(nextNum).padStart(3, '0')}`

  return NextResponse.json({ next_no: nextNo, next_num: nextNum })
}
