-- ============================================================
-- migration_portal_search.sql
-- 全ポータル一括検索機能
--   1. portal_search_jobs         一括検索1回のジョブ
--   2. portal_search_job_results  ポータル単位の実行結果
--   3. property_portal_listings   ポータル横断の掲載元管理
--   4. duplicate_reviews          曖昧な重複の手動確認キュー
-- ============================================================

-- 1. 一括検索ジョブ
CREATE TABLE IF NOT EXISTS portal_search_jobs (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id        UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  transaction_type   TEXT        NOT NULL DEFAULT 'sale',
  status             TEXT        NOT NULL DEFAULT 'queued',
    -- queued | running | completed | partial_failed | failed
  target_portals     TEXT[]      NOT NULL DEFAULT '{}',
  started_at         TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ,
  total_fetched      INTEGER     NOT NULL DEFAULT 0,
  total_saved        INTEGER     NOT NULL DEFAULT 0,
  total_new          INTEGER     NOT NULL DEFAULT 0,
  total_duplicates   INTEGER     NOT NULL DEFAULT 0,
  total_matched      INTEGER     NOT NULL DEFAULT 0,
  total_manual_check INTEGER     NOT NULL DEFAULT 0,
  total_no_match     INTEGER     NOT NULL DEFAULT 0,
  cross_portal_dups  INTEGER     NOT NULL DEFAULT 0,
  error_summary      TEXT,
  created_by         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_search_jobs_customer ON portal_search_jobs(customer_id, created_at DESC);

-- 2. ポータル単位の実行結果
CREATE TABLE IF NOT EXISTS portal_search_job_results (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID        NOT NULL REFERENCES portal_search_jobs(id) ON DELETE CASCADE,
  portal          TEXT        NOT NULL,
  search_url_id   UUID        REFERENCES customer_search_urls(id) ON DELETE SET NULL,
  search_url      TEXT,
  status          TEXT        NOT NULL DEFAULT 'queued',
    -- queued | running | completed | no_results | url_missing | fetch_error | save_error | timeout
  fetched_count   INTEGER     NOT NULL DEFAULT 0,
  saved_count     INTEGER     NOT NULL DEFAULT 0,
  new_count       INTEGER     NOT NULL DEFAULT 0,
  duplicate_count INTEGER     NOT NULL DEFAULT 0,
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_search_job_results_job ON portal_search_job_results(job_id);

-- 3. ポータル横断掲載元（1物件が複数ポータルに掲載される場合の中間テーブル）
CREATE TABLE IF NOT EXISTS property_portal_listings (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id            UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  portal                 TEXT        NOT NULL,
  portal_property_id     TEXT,
  source_url             TEXT        NOT NULL,
  listed_price           BIGINT,       -- 売買: 万円（properties.current_price と同じ単位）
  listed_rent            BIGINT,       -- 賃貸: 円/月（properties.monthly_rent と同じ単位）
  fetched_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consecutive_miss_count INTEGER     NOT NULL DEFAULT 0,  -- 連続未取得回数（掲載終了判定用）
  is_active              BOOLEAN     NOT NULL DEFAULT TRUE,
  UNIQUE (property_id, portal)
);
CREATE INDEX IF NOT EXISTS idx_property_portal_listings_property ON property_portal_listings(property_id);
CREATE INDEX IF NOT EXISTS idx_property_portal_listings_portal   ON property_portal_listings(portal, is_active);

-- 4. 曖昧な重複の手動確認キュー（自動統合しない）
CREATE TABLE IF NOT EXISTS duplicate_reviews (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id_a        UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  property_id_b        UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  reason               TEXT        NOT NULL,   -- 判定が曖昧な理由
  similarity_note      JSONB,                  -- 比較した項目の詳細
  status               TEXT        NOT NULL DEFAULT 'pending',  -- pending | merged | not_duplicate
  reviewed_by          TEXT,
  reviewed_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (property_id_a, property_id_b)
);

-- 既存 properties のバックフィル:
-- 既存物件それぞれについて自ポータルの掲載元レコードを作成
INSERT INTO property_portal_listings (property_id, portal, source_url, listed_price, listed_rent, fetched_at, last_seen_at)
SELECT p.id, p.site, p.url, p.current_price, p.monthly_rent,
       COALESCE(p.first_seen_at, p.created_at), COALESCE(p.last_seen_at, p.created_at)
FROM properties p
ON CONFLICT (property_id, portal) DO NOTHING;
