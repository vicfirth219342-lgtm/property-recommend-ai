import type { SiteName, TransactionType, ScrapedProperty } from '@/types'
import { withSandboxedHtmlPage } from './sandboxedPage'
import { detectPortalFromHtml } from './portalDetect'
import { buildDedupKey } from '@/lib/dedup'

export interface ParsedCandidate {
  portal: SiteName
  property_name: string
  price: number | null       // 円
  monthly_rent: number | null
  area_sqm: number | null
  layout: string | null
  built_year: number | null
  walk_minutes: number | null
  detail_url: string
  portal_property_id: string | null
  dedup_key: string
  needs_manual_check: boolean
  missing_fields: string[]
  raw: ScrapedProperty
}

export interface ParseHtmlResult {
  ok: boolean
  portalMismatch: boolean
  detectedPortal: SiteName | null
  candidates: ParsedCandidate[]
  isEmpty: boolean
  pageNumber: number | null
  error?: string
}

function extractPortalPropertyId(portal: SiteName, url: string): string | null {
  if (portal === 'suumo') return url.match(/\/(nc_\d+|bc_\d+)\//)?.[1] ?? null
  if (portal === 'athome') return url.match(/\/(\d{8,})\//)?.[1] ?? null
  if (portal === 'homes') return url.match(/\/(b-\d+)\//)?.[1] ?? null
  return null
}

// SUUMO/HOME'S一覧URLやファイル名から page=N を推定する（取れなければ null）
export function extractPageNumber(fileName: string, sourceUrl: string | null): number | null {
  const fromUrl = sourceUrl?.match(/[?&]page=(\d+)/)?.[1]
  if (fromUrl) return parseInt(fromUrl)
  const fromName = fileName.match(/(?:page|p)[-_]?(\d+)/i)?.[1]
  if (fromName) return parseInt(fromName)
  return null
}

// athomeのみ: 物件名・価格・詳細URLの3点を必須とする（.bukken-item誤マッチ対策）
function athomeRequiredFieldsOk(p: ScrapedProperty): boolean {
  return !!(p.name && p.name.trim() && (p.price || p.monthly_rent) && p.url)
}

export async function parseUploadedHtml(
  html: string,
  expectedPortal: SiteName,
  transactionType: TransactionType,
): Promise<ParseHtmlResult> {
  if (!html || html.trim().length < 50) {
    return { ok: false, portalMismatch: false, detectedPortal: null, candidates: [], isEmpty: true, pageNumber: null, error: 'empty_html' }
  }

  const detected = detectPortalFromHtml(html)
  if (detected && detected !== expectedPortal) {
    return { ok: false, portalMismatch: true, detectedPortal: detected, candidates: [], isEmpty: false, pageNumber: null, error: 'invalid_portal' }
  }

  const portalOrigin: Record<SiteName, string> = {
    suumo: 'https://suumo.jp/',
    homes: 'https://www.homes.co.jp/',
    athome: 'https://www.athome.co.jp/',
  }

  try {
    const { data: rawProps, requestsAttempted } = await withSandboxedHtmlPage(html, async (page) => {
      if (expectedPortal === 'suumo') {
        const { scrapeOnePage } = await import('@/crawlers/suumo')
        return scrapeOnePage(page, transactionType)
      }
      if (expectedPortal === 'homes') {
        const { scrapeOnePage } = await import('@/crawlers/homes')
        return scrapeOnePage(page, transactionType)
      }
      const { scrapeOnePage } = await import('@/crawlers/athome')
      return scrapeOnePage(page, transactionType)
    }, portalOrigin[expectedPortal])

    if (requestsAttempted.length > 0) {
      console.warn(`[manualImport] sandboxed page attempted ${requestsAttempted.length} network requests (blocked):`, requestsAttempted.slice(0, 5))
    }

    if (rawProps.length === 0) {
      return { ok: true, portalMismatch: false, detectedPortal: detected, candidates: [], isEmpty: false, pageNumber: null, error: 'no_results' }
    }

    const candidates: ParsedCandidate[] = []
    for (const p of rawProps) {
      const missing: string[] = []
      let needsManualCheck = false

      if (expectedPortal === 'athome' && !athomeRequiredFieldsOk(p)) {
        needsManualCheck = true
        if (!p.name) missing.push('property_name')
        if (!p.price && !p.monthly_rent) missing.push('price')
        if (!p.url) missing.push('detail_url')
      }

      candidates.push({
        portal: expectedPortal,
        property_name: p.name,
        price: transactionType === 'sale' ? p.price : null,
        monthly_rent: transactionType === 'rent' ? p.monthly_rent : null,
        area_sqm: p.area_sqm,
        layout: p.floor_plan,
        built_year: p.built_year,
        walk_minutes: p.walk_minutes,
        detail_url: p.url,
        portal_property_id: extractPortalPropertyId(expectedPortal, p.url),
        dedup_key: buildDedupKey(p),
        needs_manual_check: needsManualCheck,
        missing_fields: missing,
        raw: p,
      })
    }

    return { ok: true, portalMismatch: false, detectedPortal: detected, candidates, isEmpty: false, pageNumber: null }
  } catch (e) {
    return { ok: false, portalMismatch: false, detectedPortal: detected, candidates: [], isEmpty: false, pageNumber: null, error: e instanceof Error ? e.message : String(e) }
  }
}
