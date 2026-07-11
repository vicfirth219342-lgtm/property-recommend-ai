/**
 * GET /api/admin/url-debug/export
 * デバッグ結果を CSV でエクスポート
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import {
  evaluatePortal,
  generateInsertSql,
  AreaMasterRow,
  PortalParamRow,
  Portal,
} from '@/lib/urlDebug'

const PORTALS: Portal[] = ['suumo', 'athome', 'homes']

function csvEscape(v: string | null | undefined): string {
  if (v == null) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET(_req: NextRequest) {
  const supabase = createServiceClient()

  const { data: masters } = await supabase
    .from('area_masters')
    .select('id, area_type, display_name, prefecture, line_name, station_ward')
    .in('prefecture', ['東京都', '神奈川県'])
    .order('prefecture').order('area_type').order('display_name')

  if (!masters?.length) {
    return new NextResponse('No data', { status: 204 })
  }

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

  const header = [
    'area_name', 'area_type', 'prefecture',
    'portal', 'status', 'param_type', 'param_value', 'verified',
    'generated_url', 'validation_message', 'suggested_sql',
  ]
  const rows: string[] = [header.join(',')]

  for (const master of masters as AreaMasterRow[]) {
    const areaParams = paramMap.get(master.id) ?? []
    for (const portal of PORTALS) {
      const param  = areaParams.find(p => p.portal === portal)
      const result = evaluatePortal(master, portal, param)
      const sql    = result.status === 'PARAM_MISSING'
        ? generateInsertSql(master, portal, result)
        : ''
      rows.push([
        master.display_name,
        master.area_type,
        master.prefecture ?? '',
        portal,
        result.status,
        result.paramType ?? '',
        result.paramValue ?? '',
        String(result.verified),
        result.generatedUrl ?? '',
        result.validationMessage,
        sql,
      ].map(csvEscape).join(','))
    }
  }

  const csv = rows.join('\n')
  return new NextResponse('﻿' + csv, {   // BOM for Excel
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="url_debug_${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
