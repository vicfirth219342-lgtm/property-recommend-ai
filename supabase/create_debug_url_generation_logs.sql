-- ================================================================
-- create_debug_url_generation_logs.sql
-- URL生成デバッグログテーブル
-- Supabase Dashboard SQL Editor で実行してください
-- ================================================================

CREATE TABLE IF NOT EXISTS debug_url_generation_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_master_id       UUID NOT NULL REFERENCES area_masters(id) ON DELETE CASCADE,
  portal               TEXT NOT NULL CHECK (portal IN ('suumo','athome','homes')),
  status               TEXT NOT NULL CHECK (status IN (
    'OK',
    'PARAM_MISSING',
    'URL_INVALID',
    'ZERO_RESULTS',
    'CRAWL_FAILED',
    'CONDITION_NOT_REFLECTED',
    'NEED_MANUAL_CHECK'
  )),
  generated_url        TEXT,
  validation_message   TEXT,
  checked_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  suggested_param_value TEXT,
  suggested_url_path   TEXT,
  verified             BOOLEAN DEFAULT false,
  notes                TEXT
);

CREATE INDEX IF NOT EXISTS idx_debug_url_logs_area_portal ON debug_url_generation_logs(area_master_id, portal);
CREATE INDEX IF NOT EXISTS idx_debug_url_logs_status      ON debug_url_generation_logs(status);
CREATE INDEX IF NOT EXISTS idx_debug_url_logs_checked_at  ON debug_url_generation_logs(checked_at DESC);
