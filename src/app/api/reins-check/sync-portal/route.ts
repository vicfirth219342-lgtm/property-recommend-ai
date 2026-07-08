import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { buildSearchKeywords } from '@/lib/extractProperty'

// POST: ポータル物件（propertiesテーブル）からpending_reins_checksへ一括登録
// 重複判定: portal_url が同じ → スキップ
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json().catch(() => ({}))
  const { customer_id, property_ids } = body as {
    customer_id?: string
    property_ids?: string[]
  }

  // 特定物件IDリストが渡された場合はそれを使用
  let portalProperties: Record<string, unknown>[] = []

  if (property_ids && property_ids.length > 0) {
    const { data, error } = await supabase
      .from('properties')
      .select('id, site, name, address, current_price, area_sqm, floor_plan, floor_number, built_year, built_month, walk_minutes, url')
      .in('id', property_ids)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    portalProperties = data ?? []
  } else if (customer_id) {
    // 顧客条件に合うポータル物件を取得
    const { data: customer } = await supabase
      .from('customers')
      .select('*, customer_conditions(*), customer_search_urls(*)')
      .eq('id', customer_id)
      .is('deleted_at', null)
      .single()

    if (!customer) return NextResponse.json({ error: '顧客が見つかりません' }, { status: 404 })

    const cond = customer.customer_conditions?.[0] ?? null
    const activeSites = (customer.customer_search_urls ?? [])
      .filter((u: { is_active: boolean }) => u.is_active)
      .map((u: { site: string }) => u.site)

    let query = supabase
      .from('properties')
      .select('id, site, name, address, current_price, area_sqm, floor_plan, floor_number, built_year, built_month, walk_minutes, url')
      .order('first_seen_at', { ascending: false })
      .limit(500)

    if (activeSites.length > 0) query = query.in('site', activeSites)

    const txType = cond?.transaction_type ?? 'sale'
    query = query.eq('transaction_type', txType)

    if (txType === 'sale') {
      if (cond?.budget_min) query = query.gte('current_price', cond.budget_min * 10000)
      if (cond?.budget_max) query = query.lte('current_price', cond.budget_max * 10000)
    }
    if (cond?.area_sqm_min) query = query.gte('area_sqm', cond.area_sqm_min)
    if (cond?.area_sqm_max) query = query.lte('area_sqm', cond.area_sqm_max)
    if (cond?.area) query = query.ilike('address', `%${cond.area}%`)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    portalProperties = data ?? []
  } else {
    return NextResponse.json({ error: 'customer_id または property_ids が必要です' }, { status: 400 })
  }

  if (portalProperties.length === 0) {
    return NextResponse.json({ ok: true, registered: 0, skipped: 0, message: '対象物件がありません' })
  }

  // 既存の portal_url を一括取得（重複除外用）
  const portalUrls = portalProperties.map(p => p.url as string).filter(Boolean)
  const { data: existingByUrl } = await supabase
    .from('pending_reins_checks')
    .select('portal_url')
    .in('portal_url', portalUrls)

  const existingUrlSet = new Set((existingByUrl ?? []).map(e => e.portal_url).filter(Boolean))

  // 新規登録対象
  const toInsert = portalProperties.filter(p => !existingUrlSet.has(p.url as string))

  if (toInsert.length === 0) {
    return NextResponse.json({
      ok: true,
      registered: 0,
      skipped: portalProperties.length,
      message: '全件登録済みです',
    })
  }

  const rows = toInsert.map(p => ({
    source_type:   p.site as string,
    portal_url:    p.url as string,
    property_name: (p.name as string) || null,
    address:       (p.address as string) || null,
    price_man:     p.current_price != null ? Math.round((p.current_price as number) / 10000) : null,
    area_sqm:      (p.area_sqm as number) || null,
    floor_plan:    (p.floor_plan as string) || null,
    floor_number:  (p.floor_number as number) || null,
    built_year:    (p.built_year as number) || null,
    built_month:   (p.built_month as number) || null,
    walk_minutes:  (p.walk_minutes as number) || null,
    match_status: 'pending',
    search_keywords: buildSearchKeywords({
      property_name: p.name as string,
      address: p.address as string ?? undefined,
      price_man: p.current_price != null ? Math.round((p.current_price as number) / 10000) : undefined,
      area_sqm: p.area_sqm as number ?? undefined,
      floor_plan: p.floor_plan as string ?? undefined,
    }),
  }))

  const { data: inserted, error: insertErr } = await supabase
    .from('pending_reins_checks')
    .insert(rows)
    .select('id')

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  console.log(`[sync-portal] 登録: ${inserted?.length ?? 0}件 / スキップ: ${existingUrlSet.size}件`)

  return NextResponse.json({
    ok: true,
    registered: inserted?.length ?? 0,
    skipped: portalProperties.length - toInsert.length,
    total_fetched: portalProperties.length,
  })
}
