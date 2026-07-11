// 全ポータル一括検索用の共通クローラーインターフェース。
// サイト別のHTML構造は src/crawlers/{suumo,athome,homes}.ts に閉じており、
// ここでは共通の呼び出し口と結果の正規化のみを行う。
import type { SiteName, TransactionType, ScrapedProperty, PageCrawlResult, CrawlOptions } from '@/types'

export interface PortalCrawlParams {
  searchUrl: string
  customerId: string
  transactionType: TransactionType
  maxPages?: number
  knownDedupKeys: Set<string>
}

// 共通物件形式（取得できない項目は null。推測しない）
export interface NormalizedProperty {
  portal: SiteName
  portal_property_id: string | null
  property_name: string
  price: number | null            // 売買: 円
  monthly_rent: number | null     // 賃貸: 円/月
  management_fee: number | null
  area_sqm: number | null
  address: string | null
  nearest_station: string | null
  station_line: string | null
  walk_minutes: number | null
  built_year: number | null
  built_month: number | null
  floor_number: number | null
  room_number: string | null
  source_url: string
  image_urls: string[]
  fetched_at: string
  // 保存用に元データも保持
  raw: ScrapedProperty
}

export interface PortalCrawlResult {
  portal: SiteName
  // 'ok' は0件取得を含む正常終了。エラーとは区別する
  status: 'ok' | 'fetch_error'
  properties: NormalizedProperty[]       // 新規物件
  seenProperties: NormalizedProperty[]   // 既知物件（掲載継続・価格変更検知用）
  totalCount: number | null
  checkedPages: number
  fetchedCount: number
  duplicateCount: number
  stoppedReason: string
  error: string | null
}

export interface PortalCrawler {
  portal: SiteName
  crawl(params: PortalCrawlParams): Promise<PortalCrawlResult>
}

// ポータルURLから物件ID相当を抽出（取れなければ null）
function extractPortalPropertyId(portal: SiteName, url: string): string | null {
  try {
    if (portal === 'suumo') {
      // 例: https://suumo.jp/ms/chuko/.../nc_12345678/
      const m = url.match(/\/(nc_\d+|bc_\d+)\//)
      return m ? m[1] : null
    }
    if (portal === 'athome') {
      // 例: https://www.athome.co.jp/mansion/1234567890/
      const m = url.match(/\/(\d{8,})\//)
      return m ? m[1] : null
    }
    if (portal === 'homes') {
      // 例: https://www.homes.co.jp/mansion/b-1234567890123/
      const m = url.match(/\/(b-\d+)\//)
      return m ? m[1] : null
    }
  } catch { /* fallthrough */ }
  return null
}

function normalize(portal: SiteName, prop: ScrapedProperty, fetchedAt: string): NormalizedProperty {
  return {
    portal,
    portal_property_id: extractPortalPropertyId(portal, prop.url),
    property_name: prop.name,
    price: prop.price,
    monthly_rent: prop.monthly_rent,
    management_fee: prop.management_fee,
    area_sqm: prop.area_sqm,
    address: prop.address || null,
    nearest_station: null,       // 一覧ページからは駅名単体を確実に分離できないため null
    station_line: null,
    walk_minutes: prop.walk_minutes,
    built_year: prop.built_year,
    built_month: prop.built_month,
    floor_number: null,          // 一覧ページに所在階がないポータルが多いため null
    room_number: prop.room_number,
    source_url: prop.url,
    image_urls: prop.thumbnail_url ? [prop.thumbnail_url] : [],
    fetched_at: fetchedAt,
    raw: prop,
  }
}

type RawCrawlerFn = (
  baseUrl: string,
  customerId: string,
  options: CrawlOptions,
  knownDedupKeys: Set<string>,
  transactionType?: TransactionType,
) => Promise<PageCrawlResult>

function wrapCrawler(portal: SiteName, loadFn: () => Promise<RawCrawlerFn>): PortalCrawler {
  return {
    portal,
    async crawl(params: PortalCrawlParams): Promise<PortalCrawlResult> {
      const fetchedAt = new Date().toISOString()
      try {
        const fn = await loadFn()
        const result = await fn(
          params.searchUrl,
          params.customerId,
          { mode: 'manual', maxPages: params.maxPages ?? 5, stopOnDuplicateCount: 999 },
          params.knownDedupKeys,
          params.transactionType,
        )
        return {
          portal,
          status: result.stoppedReason === 'fetch_error' ? 'fetch_error' : 'ok',
          properties: result.properties.map(p => normalize(portal, p, fetchedAt)),
          seenProperties: result.seenProperties.map(p => normalize(portal, p, fetchedAt)),
          totalCount: result.totalCount,
          checkedPages: result.checkedPages,
          fetchedCount: result.fetchedCount,
          duplicateCount: result.duplicateCount,
          stoppedReason: result.stoppedReason,
          error: result.error ?? null,
        }
      } catch (e) {
        return {
          portal,
          status: 'fetch_error',
          properties: [],
          seenProperties: [],
          totalCount: null,
          checkedPages: 0,
          fetchedCount: 0,
          duplicateCount: 0,
          stoppedReason: 'fetch_error',
          error: e instanceof Error ? e.message : String(e),
        }
      }
    },
  }
}

// playwright を含むため動的インポート（Vercel等では起動時に読み込まない）
export const PORTAL_CRAWLERS: Record<SiteName, PortalCrawler> = {
  suumo:  wrapCrawler('suumo',  async () => (await import('@/crawlers/suumo')).crawlSuumo),
  athome: wrapCrawler('athome', async () => (await import('@/crawlers/athome')).crawlAthome),
  homes:  wrapCrawler('homes',  async () => (await import('@/crawlers/homes')).crawlHomes),
}

export const ALL_PORTALS: SiteName[] = ['suumo', 'athome', 'homes']
