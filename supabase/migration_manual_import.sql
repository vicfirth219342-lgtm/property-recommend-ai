-- ============================================================
-- migration_manual_import.sql
-- 手動HTMLアップロード取込機能
--   1. manual_import_jobs       取込ジョブ（バッチ進捗管理）
--   2. manual_import_files      アップロードファイル単位の解析状態・重複判定
--   3. manual_import_candidates 解析済み候補物件（プレビュー・部分確定用）
--   4. customer_property_sources に取得経路追跡カラムを追加
-- ============================================================

-- 1. 取込ジョブ
CREATE TABLE IF NOT EXISTS manual_import_jobs (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id        UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  portal             TEXT        NOT NULL,
  transaction_type   TEXT        NOT NULL DEFAULT 'sale',
  status             TEXT        NOT NULL DEFAULT 'pending',
    -- pending | parsing | previewed | confirming | completed | partial_failed | failed
  file_count         INTEGER     NOT NULL DEFAULT 0,
  files_parsed       INTEGER     NOT NULL DEFAULT 0,
  detected_count     INTEGER     NOT NULL DEFAULT 0,
  new_count          INTEGER     NOT NULL DEFAULT 0,
  duplicate_count    INTEGER     NOT NULL DEFAULT 0,
  parse_error_count  INTEGER     NOT NULL DEFAULT 0,
  needs_manual_check_count INTEGER NOT NULL DEFAULT 0,
  missing_pages      INTEGER[]   NOT NULL DEFAULT '{}',
  zip_limits         JSONB,
  error_summary      TEXT,
  created_by         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_manual_import_jobs_customer ON manual_import_jobs(customer_id, created_at DESC);

-- 2. アップロードファイル（重複判定は customer_id + portal + html_hash 単位）
CREATE TABLE IF NOT EXISTS manual_import_files (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID        NOT NULL REFERENCES manual_import_jobs(id) ON DELETE CASCADE,
  customer_id    UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  portal         TEXT        NOT NULL,
  file_name      TEXT,
  page_number    INTEGER,
  html_hash      TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'queued',
    -- queued | parsed | duplicate_import | parse_error | empty_html | invalid_portal | no_results
  detected_count INTEGER     NOT NULL DEFAULT 0,
  reused_from_file_id UUID REFERENCES manual_import_files(id),  -- 別顧客の既存解析結果を再利用した場合
  raw_html       TEXT,       -- batch解析までの一時保持。解析完了後にNULLへクリアする
  error_message  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_manual_import_files_job ON manual_import_files(job_id);
-- 同一顧客・同一ポータルへの同一HTML再取込検出用（duplicate_importはアプリ層で判定・ジョブごとに1行保存するため非一意）
CREATE INDEX IF NOT EXISTS idx_manual_import_files_customer_portal_hash
  ON manual_import_files(customer_id, portal, html_hash);
-- 別顧客での再利用検索用（ポータル+ハッシュで既存解析結果を検索）
CREATE INDEX IF NOT EXISTS idx_manual_import_files_portal_hash ON manual_import_files(portal, html_hash);

-- 3. 解析済み候補物件（プレビュー・部分確定・除外用）
CREATE TABLE IF NOT EXISTS manual_import_candidates (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            UUID        NOT NULL REFERENCES manual_import_jobs(id) ON DELETE CASCADE,
  file_id           UUID        NOT NULL REFERENCES manual_import_files(id) ON DELETE CASCADE,
  portal            TEXT        NOT NULL,
  property_name     TEXT,
  price             BIGINT,       -- 円
  area_sqm          NUMERIC,
  layout            TEXT,
  built_year        INTEGER,
  walk_minutes      INTEGER,
  detail_url        TEXT,
  portal_property_id TEXT,
  dedup_key         TEXT,
  parse_status      TEXT        NOT NULL DEFAULT 'ok',
    -- ok | parse_error | needs_manual_check
  duplicate_status  TEXT        NOT NULL DEFAULT 'new',
    -- new | duplicate_in_file | duplicate_in_batch | duplicate_existing_db | cross_portal_review
  condition_status  TEXT,
    -- MATCH | NO_MATCH | NEED_MANUAL_CHECK（confirm後に設定）
  is_selected       BOOLEAN     NOT NULL DEFAULT TRUE,
  missing_fields    TEXT[]      NOT NULL DEFAULT '{}',
  saved_property_id UUID        REFERENCES properties(id),
  raw_data          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_manual_import_candidates_job ON manual_import_candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_manual_import_candidates_file ON manual_import_candidates(file_id);

-- 4. customer_property_sources に取得経路追跡カラムを追加
ALTER TABLE customer_property_sources
  ADD COLUMN IF NOT EXISTS ingestion_method TEXT DEFAULT 'auto_crawl',
  ADD COLUMN IF NOT EXISTS manual_import_job_id UUID REFERENCES manual_import_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manual_import_file_id UUID REFERENCES manual_import_files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_file_name TEXT,
  ADD COLUMN IF NOT EXISTS source_page_number INTEGER;

-- property_portal_listings 側にも ingestion_method を維持（掲載単位の最終取得経路）
ALTER TABLE property_portal_listings
  ADD COLUMN IF NOT EXISTS ingestion_method TEXT DEFAULT 'auto_crawl';
