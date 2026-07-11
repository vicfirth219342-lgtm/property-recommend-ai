-- ============================================================
-- migration_unresolved_area_v1.sql
-- URL生成時の未解決エリアを蓄積するテーブル
-- ============================================================

CREATE TABLE IF NOT EXISTS unresolved_area_mappings (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  portal                TEXT        NOT NULL,
  raw_area_name         TEXT        NOT NULL,
  normalized_area_name  TEXT,
  prefecture            TEXT,
  customer_condition_id UUID,
  occurrence_count      INTEGER     NOT NULL DEFAULT 1,
  last_seen_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_area_id      UUID        REFERENCES area_masters (id) ON DELETE SET NULL,
  status                TEXT        NOT NULL DEFAULT 'unresolved'
    CHECK (status IN ('unresolved', 'resolved', 'ignored')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- COALESCE はインデックス式で使用（PostgreSQL expression index）
CREATE UNIQUE INDEX IF NOT EXISTS uq_unresolved_area_mappings
  ON unresolved_area_mappings (portal, raw_area_name, COALESCE(prefecture, ''));

CREATE INDEX IF NOT EXISTS idx_unresolved_area_status   ON unresolved_area_mappings (status);
CREATE INDEX IF NOT EXISTS idx_unresolved_area_portal   ON unresolved_area_mappings (portal);
CREATE INDEX IF NOT EXISTS idx_unresolved_area_last_seen ON unresolved_area_mappings (last_seen_at DESC);

CREATE OR REPLACE TRIGGER trg_unresolved_area_updated_at
  BEFORE UPDATE ON unresolved_area_mappings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE unresolved_area_mappings IS 'URL生成時に解決できなかったエリア名を蓄積。管理画面で確認・登録する。';
COMMENT ON COLUMN unresolved_area_mappings.raw_area_name IS '顧客条件から取り出した元の文字列';
COMMENT ON COLUMN unresolved_area_mappings.normalized_area_name IS '正規化後の文字列（スペース除去・重複排除後）';
COMMENT ON COLUMN unresolved_area_mappings.occurrence_count IS '同じエリア名が未解決だった回数';
COMMENT ON COLUMN unresolved_area_mappings.resolved_area_id IS '解決後に紐付けたarea_masters.id';
COMMENT ON COLUMN unresolved_area_mappings.status IS 'unresolved=未解決 / resolved=解決済み / ignored=無視';
