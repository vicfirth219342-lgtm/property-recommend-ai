-- ============================================================
-- migration_reins_v5.sql
-- レインズ照合精度改善: カラム追加 + インデックス整備
-- ============================================================

-- pending_reins_checks: 以前のマイグレーションで追加済みのカラムを IF NOT EXISTS で保証
ALTER TABLE pending_reins_checks
  ADD COLUMN IF NOT EXISTS floor_number    INTEGER,
  ADD COLUMN IF NOT EXISTS management_fee  INTEGER,
  ADD COLUMN IF NOT EXISTS repair_fund     INTEGER,
  ADD COLUMN IF NOT EXISTS score_detail    JSONB,
  ADD COLUMN IF NOT EXISTS matched_reins_id UUID,
  ADD COLUMN IF NOT EXISTS reins_number    TEXT,
  ADD COLUMN IF NOT EXISTS agent_company   TEXT,
  ADD COLUMN IF NOT EXISTS reins_page_url  TEXT,
  ADD COLUMN IF NOT EXISTS portal_url      TEXT;

-- reins_imported_properties: session_id を保証
ALTER TABLE reins_imported_properties
  ADD COLUMN IF NOT EXISTS session_id UUID;

-- インデックス（既存のものも IF NOT EXISTS で）
CREATE INDEX IF NOT EXISTS idx_reins_checks_status    ON pending_reins_checks(match_status);
CREATE INDEX IF NOT EXISTS idx_reins_checks_created   ON pending_reins_checks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reins_checks_portal_url ON pending_reins_checks(portal_url);
CREATE INDEX IF NOT EXISTS idx_reins_imported_session  ON reins_imported_properties(session_id);
CREATE INDEX IF NOT EXISTS idx_reins_imported_number   ON reins_imported_properties(reins_number);

COMMENT ON COLUMN pending_reins_checks.score_detail IS 'スコア内訳JSONB（各項目のeaned/max/reason）';
COMMENT ON COLUMN pending_reins_checks.matched_reins_id IS 'reins_imported_propertiesのUUID';
COMMENT ON COLUMN pending_reins_checks.agent_company IS 'レインズから取得した元付会社名';
COMMENT ON COLUMN pending_reins_checks.portal_url IS '物件個別ページURL（重複除外キー）';
