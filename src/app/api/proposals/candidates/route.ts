import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customer_id')
  const limitParam = parseInt(searchParams.get('limit') ?? '100')

  if (!customerId) return NextResponse.json({ error: 'customer_id required' }, { status: 400 })

  // 顧客情報・条件・検索URLを一括取得
  const { data: customer } = await supabase
    .from('customers')
    .select('*, customer_conditions(*), customer_search_urls(*)')
    .eq('id', customerId)
    .is('deleted_at', null)
    .single()

  if (!customer) return NextResponse.json({ error: '顧客が見つかりません' }, { status: 404 })

  const cond = customer.customer_conditions?.[0] ?? null
  const activeSites = (customer.customer_search_urls ?? [])
    .filter((u: { is_active: boolean }) => u.is_active)
    .map((u: { site: string }) => u.site)

  // 提案済み物件IDを取得
  const { data: proposed } = await supabase
    .from('proposals')
    .select('property_id')
    .eq('customer_id', customerId)

  const proposedIds = proposed?.map((p) => p.property_id) ?? []

  // 物件クエリ構築（条件フィルタ適用）
  let query = supabase
    .from('properties')
    .select('*')
    .order('first_seen_at', { ascending: false })
    .limit(limitParam)

  // 登録サイトでフィルタ
  if (activeSites.length > 0) {
    query = query.in('site', activeSites)
  }

  // 提案済み除外はJS側フィルタで処理（下の proposedSet.has(p.id) を参照）

  // 予算フィルタ（条件は万円単位、propertiesは円単位）
  if (cond?.budget_min) {
    query = query.gte('current_price', cond.budget_min * 10000)
  }
  if (cond?.budget_max) {
    query = query.lte('current_price', cond.budget_max * 10000)
  }

  // 面積フィルタ
  if (cond?.area_sqm_min) {
    query = query.gte('area_sqm', cond.area_sqm_min)
  }
  if (cond?.area_sqm_max) {
    query = query.lte('area_sqm', cond.area_sqm_max)
  }

  // 徒歩フィルタ
  if (cond?.walk_minutes_max) {
    query = query.lte('walk_minutes', cond.walk_minutes_max)
  }

  // 築年数フィルタ: building_age が NULL の物件は「不明」として通す（除外しない）
  if (cond?.building_age_max) {
    query = query.or(`building_age.lte.${cond.building_age_max},building_age.is.null`)
  }

  // エリア（住所テキストの部分一致）
  if (cond?.area) {
    query = query.ilike('address', `%${cond.area}%`)
  }

  const { data: properties, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 提案済みIDを除外（Supabase .not().in() の代わりに JS側でフィルタ）
  const proposedSet = new Set(proposedIds)
  const candidates = (properties ?? []).filter((p) => !proposedSet.has(p.id))

  // 価格変動情報を付与
  const enriched = candidates.map((p) => {
    let priceChange: { diff: number; diffMan: number; label: string } | null = null
    if (p.last_price !== null && p.current_price !== null && p.last_price !== p.current_price) {
      const diff = p.current_price - p.last_price
      const diffMan = Math.round(diff / 10000)
      priceChange = {
        diff,
        diffMan,
        label: diffMan < 0 ? `${Math.abs(diffMan)}万円値下げ` : `${diffMan}万円値上げ`,
      }
    }

    // 新着判定（初回確認から7日以内）
    const isNew = p.first_seen_at
      ? Date.now() - new Date(p.first_seen_at).getTime() < 7 * 24 * 60 * 60 * 1000
      : false

    return { ...p, priceChange, isNew }
  })

  // サマリー集計
  const priceChangedCount = enriched.filter((p) => p.priceChange !== null).length
  const newCount = enriched.filter((p) => p.isNew).length

  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      customer_no: customer.customer_no,
      rank: customer.rank,
    },
    conditions: cond,
    candidates: enriched,
    total: enriched.length,
    priceChangedCount,
    newCount,
  })
}
