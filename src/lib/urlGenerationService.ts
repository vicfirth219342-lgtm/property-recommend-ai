/**
 * urlGenerationService.ts
 *
 * 顧客条件から各ポータルの検索URLを生成し、customer_search_urls テーブルに保存する。
 * API ルートで条件が更新されるたびに呼び出される。
 *
 * 設計方針:
 * - エリアコードは portal_area_mappings テーブル (Single Source of Truth)
 * - URL 生成ロジックは portalUrlBuilder.ts (ポータルごとの URL 構造)
 * - 生成結果と診断ログを customer_search_urls.generation_log に保存
 * - 手動登録 URL (generated_by='manual') は上書きしない
 */

import { createServiceClient } from '@/lib/supabase'
import { CustomerCondition } from '@/types'
import {
  buildPortalUrlV2,
  PortalAreaMapping,
  NewMasterData,
  SiteKey,
  makeUrlLog,
} from './portalUrlBuilder'

type SupabaseClient = ReturnType<typeof createServiceClient>

const PORTALS: SiteKey[] = ['suumo', 'athome', 'homes']

// -------------------------------------------------------
// 条件ハッシュ（変更検知用・簡易版）
// -------------------------------------------------------
function conditionHash(cond: CustomerCondition): string {
  const key = [
    cond.transaction_type ?? '',
    cond.area ?? '',
    cond.property_type ?? '',
    String(cond.budget_min ?? ''),
    String(cond.budget_max ?? ''),
    String(cond.rent_min ?? ''),
    String(cond.rent_max ?? ''),
    String(cond.area_sqm_min ?? ''),
    String(cond.area_sqm_max ?? ''),
    String(cond.walk_minutes_max ?? ''),
    String(cond.building_age_max ?? ''),
  ].join('|')

  let hash = 5381
  for (let i = 0; i < key.length; i++) {
    hash = (((hash << 5) + hash) ^ key.charCodeAt(i)) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

// -------------------------------------------------------
// メイン: URL生成 → DB保存
// -------------------------------------------------------
export interface GenerationSummary {
  portal: SiteKey
  urlCount: number
  resolvedAreas: string[]
  unresolvedAreas: string[]
  warnings: string[]
  canGenerate: boolean
  error?: string
}

export async function generateAndSaveUrls(
  customerId: string,
  condition: CustomerCondition,
  supabase?: SupabaseClient,
): Promise<GenerationSummary[]> {
  const db = supabase ?? createServiceClient()
  const summaries: GenerationSummary[] = []

  // ── 新マスター取得（area_masters / area_aliases / portal_area_params）──
  const [mastersRes, aliasesRes, paramsRes, oldMappingsRes] = await Promise.all([
    db.from('area_masters').select('id, area_type, display_name, prefecture, city, ward, station_name, line_name, station_ward'),
    db.from('area_aliases').select('alias, area_id'),
    db.from('portal_area_params').select('area_id, portal, param_type, portal_code, portal_url_param'),
    db.from('portal_area_mappings').select('id, portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param'),
  ])

  if (mastersRes.error) console.error('[urlGenerationService] area_masters fetch error:', mastersRes.error.message)
  if (aliasesRes.error) console.error('[urlGenerationService] area_aliases fetch error:', aliasesRes.error.message)
  if (paramsRes.error)  console.error('[urlGenerationService] portal_area_params fetch error:', paramsRes.error.message)
  if (oldMappingsRes.error) console.error('[urlGenerationService] portal_area_mappings fetch error:', oldMappingsRes.error.message)

  const newMaster: NewMasterData = {
    masters: (mastersRes.data ?? []) as NewMasterData['masters'],
    aliases: (aliasesRes.data ?? []) as NewMasterData['aliases'],
    params:  (paramsRes.data ?? [])  as NewMasterData['params'],
  }
  const oldMappings = (oldMappingsRes.data ?? []) as PortalAreaMapping[]

  const debugLines: string[] = []
  const debugLog = (msg: string) => {
    debugLines.push(msg)
    console.log(msg)
  }

  debugLog(`[urlGen] 顧客条件 area="${condition.area ?? ''}"`)
  debugLog(`[urlGen] 新マスター: masters=${newMaster.masters.length} aliases=${newMaster.aliases.length} params=${newMaster.params.length}`)
  debugLog(`[urlGen] 旧マスター: ${oldMappings.length}件`)

  const hash = conditionHash(condition)

  for (const portal of PORTALS) {
    try {
      const result = buildPortalUrlV2(portal, condition, newMaster, oldMappings, debugLog)

      const log = {
        ...makeUrlLog(portal, result, condition),
        condition_hash: hash,
        debug: debugLines,
      }

      // 既存の自動生成 URL を削除 (手動登録分は残す)
      await db
        .from('customer_search_urls')
        .delete()
        .eq('customer_id', customerId)
        .eq('site', portal)
        .eq('transaction_type', condition.transaction_type ?? 'sale')
        .eq('generated_by', 'auto')

      // 新しい URL を挿入
      if (result.urls.length > 0) {
        const rows = result.urls.map(u => ({
          customer_id:     customerId,
          site:            portal,
          transaction_type: condition.transaction_type ?? 'sale',
          url:             u.url,
          url_label:       u.label,
          generated_by:    'auto',
          condition_hash:  hash,
          generation_log:  log,
          is_active:       true,
        }))

        const { error: insErr } = await db
          .from('customer_search_urls')
          .upsert(rows, { onConflict: 'customer_id,site,url', ignoreDuplicates: true })

        if (insErr) {
          console.error(`[urlGenerationService] upsert error (${portal}):`, insErr.message)
        }
      }

      summaries.push({
        portal,
        urlCount:       result.urls.length,
        resolvedAreas:  result.resolvedAreas,
        unresolvedAreas: result.unresolvedAreas,
        warnings:       result.warnings,
        canGenerate:    result.canGenerate,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[urlGenerationService] build error (${portal}):`, msg)
      summaries.push({
        portal,
        urlCount: 0,
        resolvedAreas: [],
        unresolvedAreas: [],
        warnings: [],
        canGenerate: false,
        error: msg,
      })
    }
  }

  return summaries
}

// -------------------------------------------------------
// 顧客の最新条件を取得してURLを再生成する
// -------------------------------------------------------
export async function regenerateUrlsForCustomer(
  customerId: string,
  supabase?: SupabaseClient,
): Promise<GenerationSummary[]> {
  const db = supabase ?? createServiceClient()

  const { data: cond, error } = await db
    .from('customer_conditions')
    .select('*')
    .eq('customer_id', customerId)
    .single()

  if (error || !cond) {
    throw new Error(`顧客条件が見つかりません: ${error?.message ?? 'not found'}`)
  }

  return generateAndSaveUrls(customerId, cond as CustomerCondition, db)
}
