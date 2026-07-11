/**
 * GET /api/admin/url-debug
 * area_masters 全件 × 3ポータルの URL生成デバッグチェック
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import {
  evaluatePortal,
  generateInsertSql,
  AreaMasterRow,
  PortalParamRow,
  Portal,
  AreaDebugResult,
  TransactionType,
} from '@/lib/urlDebug'

const PORTALS: Portal[] = ['suumo', 'athome', 'homes']

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const onlyMissing = searchParams.get('onlyMissing') === 'true'
  const pref        = searchParams.get('prefecture') ?? ''
  const areaType    = searchParams.get('areaType') ?? ''
  const txType      = (searchParams.get('txType') ?? 'sale') as TransactionType

  // area_masters 全件取得（東京都・神奈川県）
  let query = supabase
    .from('area_masters')
    .select('id, area_type, display_name, prefecture, line_name, station_ward')
    .in('prefecture', ['東京都', '神奈川県'])
    .order('prefecture')
    .order('area_type')
    .order('display_name')

  if (pref)     query = query.eq('prefecture', pref)
  if (areaType) query = query.eq('area_type', areaType)

  const { data: masters, error: mErr } = await query
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })
  if (!masters?.length) return NextResponse.json([])

  // portal_area_params をページネーションで全件取得（Supabase上限1000件対策）
  const ids = masters.map(m => m.id)
  const allParams: PortalParamRow[] = []
  const PAGE = 1000
  for (let offset = 0; ; offset += PAGE) {
    const { data: page, error: pErr } = await supabase
      .from('portal_area_params')
      .select('area_id, portal, param_type, portal_code, portal_url_param, verified, notes')
      .in('area_id', ids)
      .range(offset, offset + PAGE - 1)
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
    if (!page?.length) break
    allParams.push(...(page as PortalParamRow[]))
    if (page.length < PAGE) break
  }
  const params = allParams

  // area_id → params[] のマップ
  const paramMap = new Map<string, PortalParamRow[]>()
  for (const p of params ?? []) {
    const areaId = (p as unknown as Record<string, string>).area_id
    if (!areaId) continue
    const list = paramMap.get(areaId) ?? []
    list.push(p as PortalParamRow)
    paramMap.set(areaId, list)
  }

  // 各エリア × 各ポータルを評価
  const results: AreaDebugResult[] = []
  for (const master of masters as AreaMasterRow[]) {
    const areaParams = paramMap.get(master.id) ?? []
    const portalResults = PORTALS.map(portal => {
      const param = areaParams.find(p => p.portal === portal)
      return evaluatePortal(master, portal, param, txType)
    })

    const missingCount    = portalResults.filter(r => r.status === 'PARAM_MISSING').length
    const unverifiedCount = portalResults.filter(r => r.status === 'NEED_MANUAL_CHECK').length

    if (onlyMissing && missingCount === 0 && unverifiedCount === 0) continue

    results.push({ master, results: portalResults, missingCount, unverifiedCount })
  }

  return NextResponse.json(results)
}
