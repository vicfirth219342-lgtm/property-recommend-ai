export type CustomerRank = 'A' | 'B' | 'C'
export type CustomerStatus = 'active' | 'inactive'
export type SiteName = 'suumo' | 'athome' | 'homes'
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
  area: string | null
  property_type: string | null
  budget_min: number | null
  budget_max: number | null
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
  url: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  site: SiteName
  site_property_id: string | null
  name: string
  address: string | null
  price: number | null
  area_sqm: number | null
  floor_plan: string | null
  building_age: number | null
  walk_minutes: number | null
  url: string
  thumbnail_url: string | null
  room_number: string | null
  raw_hash: string | null
  dedup_key: string | null
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
  name: string
  address: string
  price: number | null
  area_sqm: number | null
  floor_plan: string | null
  building_age: number | null
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
  totalCount: number | null
  totalPages: number | null
  checkedPages: number
  fetchedCount: number
  newCount: number
  duplicateCount: number
  stoppedReason: StoppedReason
  error?: string
  htmlPath?: string
}

export interface CrawlOptions {
  mode: CrawlMode
  maxPages?: number          // 明示的に上限指定（modeより優先）
  stopOnDuplicatePages?: number  // 差分モード: N ページ連続重複で停止（デフォルト2）
}
