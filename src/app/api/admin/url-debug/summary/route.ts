/**
 * GET /api/admin/url-debug/summary
 * ダッシュボード警告用の集計サマリー
 */
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { evaluatePortal, AreaMasterRow, PortalParamRow, Portal } from '@/lib/urlDebug'

const PORTALS: Portal[] = ['suumo', 'athome', 'homes']

export async function GET() {
  const supabase = createServiceClient()

  const { data: masters } = await supabase
    .from('area_masters')
    .select('id, area_type, display_name, prefecture, line_name, station_ward')
    .in('prefecture', ['東京都', '神奈川県'])

  if (!masters?.length) return NextResponse.json({ total: 0, missing: 0, byPortal: {} })

  const ids = masters.map(m => m.id)
  const { data: params } = await supabase
    .from('portal_area_params')
    .select('area_id, portal, param_type, portal_code, portal_url_param, verified, notes')
    .in('area_id', ids)

  const paramMap = new Map<string, PortalParamRow[]>()
  for (const p of params ?? []) {
    const list = paramMap.get(p.area_id) ?? []
    list.push(p as PortalParamRow)
    paramMap.set(p.area_id, list)
  }

  const byPortal: Record<Portal, { missing: number; unverified: number }> = {
    suumo:  { missing: 0, unverified: 0 },
    athome: { missing: 0, unverified: 0 },
    homes:  { missing: 0, unverified: 0 },
  }
  let totalMissing = 0

  for (const master of masters as AreaMasterRow[]) {
    const areaParams = paramMap.get(master.id) ?? []
    for (const portal of PORTALS) {
      const param  = areaParams.find(p => p.portal === portal)
      const result = evaluatePortal(master, portal, param)
      if (result.status === 'PARAM_MISSING') {
        byPortal[portal].missing++
        totalMissing++
      } else if (result.status === 'NEED_MANUAL_CHECK') {
        byPortal[portal].unverified++
      }
    }
  }

  return NextResponse.json({
    total: masters.length,
    totalMissing,
    byPortal,
  })
}
