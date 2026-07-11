-- ============================================================
-- migration_reins_audit.sql
-- 1. reins_check_queue に not_found_reason カラム追加
-- 2. property_corrections テーブル（ポータルデータ修正履歴）
-- 3. reins_audit_logs テーブル（操作監査ログ）
-- ============================================================

-- 1. not_found_reason
ALTER TABLE reins_check_queue
  ADD COLUMN IF NOT EXISTS not_found_reason TEXT;

-- 有効値: no_candidates / below_threshold / all_candidates_blocked / fetch_error / manually_not_found / unknown
COMMENT ON COLUMN reins_check_queue.not_found_reason IS
  'not_found 時の原因: no_candidates | below_threshold | all_candidates_blocked | fetch_error | manually_not_found | unknown';

-- 2. property_corrections（append-only 修正履歴）
CREATE TABLE IF NOT EXISTS property_corrections (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  queue_id        UUID        REFERENCES reins_check_queue(id) ON DELETE SET NULL,
  corrected_by    TEXT        NOT NULL,
  reason          TEXT,
  field_name      TEXT        NOT NULL,   -- 修正したフィールド名
  before_value    TEXT,                   -- 修正前
  after_value     TEXT,                   -- 修正後
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_corrections_property_id ON property_corrections(property_id);
CREATE INDEX IF NOT EXISTS idx_property_corrections_queue_id   ON property_corrections(queue_id);

-- 3. reins_audit_logs（操作監査ログ）
CREATE TABLE IF NOT EXISTS reins_audit_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id     UUID        REFERENCES reins_check_queue(id) ON DELETE SET NULL,
  property_id  UUID        REFERENCES properties(id) ON DELETE SET NULL,
  operation    TEXT        NOT NULL,  -- manual_confirm / candidate_reject / not_found / back_to_review / data_correction / rematch
  operator     TEXT        NOT NULL,
  operated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  before_value JSONB,
  after_value  JSONB,
  note         TEXT
);

CREATE INDEX IF NOT EXISTS idx_reins_audit_logs_queue_id    ON reins_audit_logs(queue_id);
CREATE INDEX IF NOT EXISTS idx_reins_audit_logs_property_id ON reins_audit_logs(property_id);
CREATE INDEX IF NOT EXISTS idx_reins_audit_logs_operated_at ON reins_audit_logs(operated_at DESC);
