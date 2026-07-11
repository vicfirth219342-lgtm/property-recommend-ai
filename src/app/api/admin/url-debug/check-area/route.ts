/**
 * GET /api/admin/url-debug/check-area?name=武蔵小杉
 * 顧客登録時・エリア入力時の即時チェック（仕様10）
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { evaluatePortal, AreaMasterRow, PortalParamRow, Portal } from '@/lib/urlDebug'

const PORTALS: Portal[] = ['suumo', 'athome', 'homes']

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')?.trim()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const supabase = createServiceClient()

  // display_name 完全一致 → alias 検索 の順
  let masters: AreaMasterRow[] = []
  const { data: exact } = await supabase
    .from('area_masters')
    .select('id, area_type, display_name, prefecture, line_name, station_ward')
    .eq('display_name', name)
    .in('prefecture', ['東京都', '神奈川県'])
    .limit(5)
  if (exact?.length) {
    masters = exact as AreaMasterRow[]
  } else {
    // alias 検索
    const { data: aliases } = await supabase
      .from('area_aliases')
      .select('area_id')
      .eq('alias', name)
      .limit(5)
    if (aliases?.length) {
      const ids = aliases.map(a => a.area_id)
      const { data: byAlias } = await supabase
        .from('area_masters')
        .select('id, area_type, display_name, prefecture, line_name, station_ward')
        .in('id', ids)
      masters = (byAlias ?? []) as AreaMasterRow[]
    }
  }

  if (!masters.length) {
    return NextResponse.json({
      found: false,
      message: `「${name}」はarea_mastersに未登録です`,
      warnings: [`area_masters未登録: ${name}`],
      portals: {},
    })
  }

  // 先頭1件（station 優先で並び替えは API 側でやらず呼び元に委ねる）
  const master = masters.sort((a, b) => {
    const priority: Record<string, number> = { station: 0, ward: 1, city: 2 }
    return (priority[a.area_type] ?? 9) - (priority[b.area_type] ?? 9)
  })[0]

  const { data: params } = await supabase
    .from('portal_area_params')
    .select('area_id, portal, param_type, portal_code, portal_url_param, verified, notes')
    .eq('area_id', master.id)

  const areaParams = (params ?? []) as PortalParamRow[]
  const portalResults: Record<string, { status: string; message: string; url: string | null }> = {}
  const warnings: string[] = []

  for (const portal of PORTALS) {
    const param  = areaParams.find(p => p.portal === portal)
    const result = evaluatePortal(master, portal, param)
    portalResults[portal] = {
      status:  result.status,
      message: result.validationMessage,
      url:     result.generatedUrl,
    }
    if (result.status === 'PARAM_MISSING') {
      warnings.push(`${name} は ${portal} のURLパラメータが未登録です`)
    } else if (result.status === 'NEED_MANUAL_CHECK') {
      warnings.push(`${name} の ${portal} URLは推測値のため要確認です`)
    }
  }

  return NextResponse.json({
    found: true,
    master: {
      id: master.id,
      displayName: master.display_name,
      areaType: master.area_type,
      prefecture: master.prefecture,
    },
    portals: portalResults,
    warnings,
  })
}
