import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const revalidate = 3600  // 1時間キャッシュ

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('portal_area_mappings')
    .select('id, portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param')
    .order('area_type')
    .order('display_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
