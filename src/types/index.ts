export type CustomerRank = 'A' | 'B' | 'C'
export type CustomerStatus = 'active' | 'inactive'
export type SiteName = 'suumo' | 'athome' | 'homes'
export type PortalType = 'public' | 'login'
export type TransactionType = 'sale' | 'rent'

export const TRANSACTION_LABELS: Record<TransactionType, string> = {
  sale: '売買',
  rent: '賃貸',
}

export interface PortalPreset {
  name: string
  type: PortalType
  domain: string
  site?: SiteName
}
export type CrawlStatus = 'success' | 'failure' | 'partial'

export interface Customer {
  id: string
  customer_no: string
  name: string
  email: string | null
  phone: string | null
  rank: CustomerRank
  status: CustomerStatus
  sales_memo: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CustomerCondition {
  id: string
  customer_id: string
  transaction_type: TransactionType
  area: string | null
  property_type: string | null
  // 売買
  budget_min: number | null
  budget_max: number | null
  // 賃貸
  rent_min: number | null
  rent_max: number | null
  // 共通
  area_sqm_min: number | null
  area_sqm_max: number | null
  walk_minutes_max: number | null
  building_age_max: number | null
  other_conditions: string | null
  created_at: string
  updated_at: string
}

export interface CustomerSearchUrl {
  id: string
  customer_id: string
  site: SiteName
  transaction_type: TransactionType
  url: string
  is_active: boolean
  last_crawled_at: string | null
  max_pages_full: number | null
  max_pages_normal: number | null
  max_pages_manual: number | null
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  site: SiteName
  transaction_type: TransactionType
  site_property_id: string | null
  name: string
  address: string | null
  // 売買
  price: number | null
  current_price: number | null
  last_price: number | null
  management_fee: number | null
  repair_fund: number | null
  yield_rate: number | null
  land_area: number | null
  building_area: number | null
  // 賃貸
  monthly_rent: number | null
  key_money: number | null
  deposit: number | null
  guarantee_money: number | null
  tsubo_count: number | null
  tsubo_price: number | null
  available_from: string | null
  // 共通
  area_sqm: number | null
  floor_plan: string | null
  building_age: number | null
  built_year: number | null
  built_month: number | null
  walk_minutes: number | null
  url: string
  thumbnail_url: string | null
  room_number: string | null
  raw_hash: string | null
  dedup_key: string | null
  first_seen_at: string | null
  last_seen_at: string | null
  fetched_at: string
  created_at: string
}

export interface Proposal {
  id: string
  customer_id: string
  property_id: string
  proposed_at: string
  batch_id: string | null
}

export interface CrawlLog {
  id: string
  customer_id: string | null
  site: string
  url: string | null
  status: CrawlStatus
  properties_found: number
  error_message: string | null
  html_snapshot: string | null
  screenshot_url: string | null
  started_at: string
  finished_at: string | null
  duration_ms: number | null
}

export interface CustomerWithCondition extends Customer {
  customer_conditions: CustomerCondition[]
  customer_search_urls: CustomerSearchUrl[]
}

export interface ScrapedProperty {
  site: SiteName
  transaction_type: TransactionType
  name: string
  address: string
  // 売買
  price: number | null
  management_fee: number | null
  repair_fund: number | null
  yield_rate: number | null
  land_area: number | null
  building_area: number | null
  // 賃貸
  monthly_rent: number | null
  key_money: number | null
  deposit: number | null
  guarantee_money: number | null
  tsubo_count: number | null
  tsubo_price: number | null
  available_from: string | null
  // 共通
  area_sqm: number | null
  floor_plan: string | null
  building_age: number | null
  built_year: number | null
  built_month: number | null
  walk_minutes: number | null
  url: string
  thumbnail_url: string | null
  room_number: string | null
}

export type CrawlMode = 'full' | 'diff' | 'manual' | 'debug'

export type StoppedReason =
  | 'reached_last_page'
  | 'reached_page_limit'
  | 'duplicate_sequence_detected'
  | 'fetch_error'
  | 'no_results'

export interface PageCrawlResult {
  properties: ScrapedProperty[]
  seenProperties: ScrapedProperty[]
  totalCount: number | null
  totalPages: number | null
  checkedPages: number
  fetchedCount: number
  newCount: number
  duplicateCount: number
  stoppedReason: StoppedReason
  isInitialCrawl?: boolean
  error?: string
  htmlPath?: string
}

export interface ConditionMatchItem {
  label: string
  required: string
  actual: string | null
  match: 'ok' | 'ng' | 'unknown'
}

export interface PropertyWithMatch extends ScrapedProperty {
  propertyId?: string
  isNew: boolean
  isDuplicate: boolean
  matchScore: number
  matchItems: ConditionMatchItem[]
}

export interface ManualCrawlResult {
  site: string
  portalName: string
  portalType: PortalType
  totalCount: number | null
  totalPages: number | null
  checkedPages: number
  fetchedCount: number
  newCount: number
  duplicateCount: number
  stoppedReason: string
  properties: PropertyWithMatch[]
  error?: string
}

export interface CrawlOptions {
  mode: CrawlMode
  maxPages?: number
  stopOnDuplicateCount?: number
}
