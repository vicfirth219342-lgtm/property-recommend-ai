-- =====================================================
-- migration: ページネーション対応
-- =====================================================

-- crawl_logs にページ巡回情報カラムを追加
ALTER TABLE crawl_logs
  ADD COLUMN IF NOT EXISTS total_count      INTEGER,
  ADD COLUMN IF NOT EXISTS total_pages      INTEGER,
  ADD COLUMN IF NOT EXISTS checked_pages    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fetched_count    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_count        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duplicate_count  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stopped_reason   TEXT,
  ADD COLUMN IF NOT EXISTS crawl_mode       TEXT DEFAULT 'diff';

-- customer_search_urls にページ上限設定カラムを追加
ALTER TABLE customer_search_urls
  ADD COLUMN IF NOT EXISTS max_pages_full    INTEGER DEFAULT NULL,  -- NULL = 全ページ
  ADD COLUMN IF NOT EXISTS max_pages_normal  INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS max_pages_manual  INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS last_crawled_at   TIMESTAMPTZ;
