-- =====================================================
-- property-recommend-ai Supabase Schema
-- =====================================================

-- customers テーブル
CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_no     TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  rank            TEXT NOT NULL DEFAULT 'C' CHECK (rank IN ('A','B','C')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  sales_memo      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

-- customer_conditions テーブル
CREATE TABLE IF NOT EXISTS customer_conditions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  area              TEXT,
  property_type     TEXT,
  budget_min        INTEGER,
  budget_max        INTEGER,
  area_sqm_min      NUMERIC(8,2),
  area_sqm_max      NUMERIC(8,2),
  walk_minutes_max  INTEGER,
  building_age_max  INTEGER,
  other_conditions  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- customer_search_urls テーブル
CREATE TABLE IF NOT EXISTS customer_search_urls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  site        TEXT NOT NULL CHECK (site IN ('suumo','athome','homes')),
  url         TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, site)
);

-- properties テーブル
CREATE TABLE IF NOT EXISTS properties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site            TEXT NOT NULL CHECK (site IN ('suumo','athome','homes')),
  site_property_id TEXT,
  name            TEXT NOT NULL,
  address         TEXT,
  price           BIGINT,
  area_sqm        NUMERIC(8,2),
  floor_plan      TEXT,
  building_age    INTEGER,
  walk_minutes    INTEGER,
  url             TEXT NOT NULL,
  thumbnail_url   TEXT,
  room_number     TEXT,
  raw_hash        TEXT,
  dedup_key       TEXT,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_dedup_key ON properties(dedup_key);
CREATE INDEX IF NOT EXISTS idx_properties_site ON properties(site);
CREATE INDEX IF NOT EXISTS idx_properties_fetched_at ON properties(fetched_at);

-- proposals テーブル（提案履歴）
CREATE TABLE IF NOT EXISTS proposals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  proposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  batch_id    UUID,
  UNIQUE(customer_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_proposals_customer_id ON proposals(customer_id);
CREATE INDEX IF NOT EXISTS idx_proposals_property_id ON proposals(property_id);

-- crawl_logs テーブル
CREATE TABLE IF NOT EXISTS crawl_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  site            TEXT NOT NULL,
  url             TEXT,
  status          TEXT NOT NULL CHECK (status IN ('success','failure','partial')),
  properties_found INTEGER DEFAULT 0,
  error_message   TEXT,
  html_snapshot   TEXT,
  screenshot_url  TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ,
  duration_ms     INTEGER
);

CREATE INDEX IF NOT EXISTS idx_crawl_logs_customer_site ON crawl_logs(customer_id, site);
CREATE INDEX IF NOT EXISTS idx_crawl_logs_started_at ON crawl_logs(started_at);

-- email_batches テーブル
CREATE TABLE IF NOT EXISTS email_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient       TEXT NOT NULL,
  subject         TEXT NOT NULL,
  customers_count INTEGER DEFAULT 0,
  properties_count INTEGER DEFAULT 0,
  status          TEXT NOT NULL CHECK (status IN ('sent','failed')),
  error_message   TEXT
);

-- customer_change_logs テーブル
CREATE TABLE IF NOT EXISTS customer_change_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK (action IN ('create','update','delete')),
  changed_by  TEXT,
  before_data JSONB,
  after_data  JSONB,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_customer_conditions_updated_at
  BEFORE UPDATE ON customer_conditions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_customer_search_urls_updated_at
  BEFORE UPDATE ON customer_search_urls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS 無効（サービスロールキーで管理）
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_search_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_change_logs ENABLE ROW LEVEL SECURITY;

-- サービスロールはRLSをバイパスするため追加ポリシー不要
-- アノンキーからのアクセスはブロック（管理画面はservice_roleキーを使用）
