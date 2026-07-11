import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET: area_masters 一覧（aliases・params込み）
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (!q) {
    // 検索なし: 全件取得
    const { data, error } = await supabase
      .from('area_masters')
      .select('*, area_aliases(id, alias), portal_area_params(id, portal, param_type, portal_code, portal_url_param)')
      .order('area_type')
      .order('display_name')
      .limit(200)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  // 検索あり:
  // ① area_masters 直接フィールドで検索
  // ② area_aliases でエイリアス検索 → area_id を取得
  // ③ portal_area_params で portal_url_param 検索 → area_id を取得
  // → 3つの area_id セットを合算して area_masters を取得

  const lower = `%${q}%`

  const [mastersRes, aliasRes, paramRes] = await Promise.all([
    supabase
      .from('area_masters')
      .select('id')
      .or(`display_name.ilike.${lower},prefecture.ilike.${lower},city.ilike.${lower},ward.ilike.${lower},station_ward.ilike.${lower},station_name.ilike.${lower},line_name.ilike.${lower}`)
      .limit(200),
    supabase
      .from('area_aliases')
      .select('area_id')
      .ilike('alias', lower)
      .limit(200),
    supabase
      .from('portal_area_params')
      .select('area_id')
      .ilike('portal_url_param', lower)
      .limit(200),
  ])

  // area_id の合算（重複排除）
  const idSet = new Set<string>()
  for (const r of mastersRes.data ?? []) idSet.add(r.id)
  for (const r of aliasRes.data ?? [])   idSet.add(r.area_id)
  for (const r of paramRes.data ?? [])   idSet.add(r.area_id)

  if (idSet.size === 0) return NextResponse.json([])

  const { data, error } = await supabase
    .from('area_masters')
    .select('*, area_aliases(id, alias), portal_area_params(id, portal, param_type, portal_code, portal_url_param)')
    .in('id', Array.from(idSet))
    .order('area_type')
    .order('display_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST: area_master 新規作成（alias・param も同時登録）
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()

  const {
    display_name, area_type, prefecture, city, ward,
    station_name, station_ward, line_name, yomi,
    alias,
    portal, param_type, portal_code, portal_url_param,
  } = body as Record<string, string>

  if (!display_name || !area_type) {
    return NextResponse.json({ error: 'display_name と area_type は必須です' }, { status: 400 })
  }

  // 1. area_masters 登録
  const { data: master, error: masterErr } = await supabase
    .from('area_masters')
    .insert({ display_name, area_type, prefecture, city, ward, station_name, station_ward, line_name, yomi })
    .select('id')
    .single()

  if (masterErr) return NextResponse.json({ error: masterErr.message }, { status: 500 })
  const area_id = master.id

  // 2. area_aliases 登録（入力あれば）
  if (alias?.trim()) {
    const { error: aliasErr } = await supabase
      .from('area_aliases')
      .insert({ area_id, alias: alias.trim() })
    if (aliasErr) return NextResponse.json({ error: aliasErr.message }, { status: 500 })
  }

  // 3. portal_area_params 登録（portal + portal_url_param があれば）
  if (portal && portal_url_param?.trim()) {
    const { error: paramErr } = await supabase
      .from('portal_area_params')
      .insert({ area_id, portal, param_type: param_type || 'query', portal_code: portal_code || null, portal_url_param })
    if (paramErr) return NextResponse.json({ error: paramErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, area_id })
}
