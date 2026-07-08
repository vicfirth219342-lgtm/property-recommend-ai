-- ============================================================
-- migration_reins_v3.sql
-- レインズ一括取り込み対応
-- ============================================================

-- レインズから取り込んだ物件一覧テーブル
CREATE TABLE IF NOT EXISTS reins_imported_properties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reins_number    TEXT,             -- 物件番号（12桁）
  property_name   TEXT,             -- 建物名
  address         TEXT,             -- 所在地
  price_man       INTEGER,          -- 価格（万円）
  area_sqm        DECIMAL(8,2),     -- 専有面積（㎡）
  floor_plan      TEXT,             -- 間取り
  floor_number    INTEGER,          -- 所在階
  built_year      INTEGER,
  built_month     INTEGER,
  management_fee  INTEGER,          -- 管理費（円）
  transaction_type TEXT,            -- 取引態様（売主/専任/一般）
  agent_company   TEXT,             -- 元付会社
  station         TEXT,
  walk_minutes    INTEGER,
  page_url        TEXT,             -- 取得元レインズ検索URL
  raw_block       TEXT,             -- 抽出元テキスト（デバッグ用）
  imported_at     TIMESTAMPTZ DEFAULT now()
);

-- pending_reins_checks にレインズ照合結果リンク用カラムを追加
ALTER TABLE pending_reins_checks
  ADD COLUMN IF NOT EXISTS matched_reins_id  UUID,
  ADD COLUMN IF NOT EXISTS reins_number      TEXT,
  ADD COLUMN IF NOT EXISTS agent_company     TEXT,
  ADD COLUMN IF NOT EXISTS reins_page_url    TEXT;

-- スコア閾値変更（80点/50点に引き上げ）
UPDATE pending_reins_checks
SET match_status = CASE
  WHEN match_score >= 80 THEN 'confirmed'
  WHEN match_score >= 50 THEN 'review'
  ELSE 'not_found'
END
WHERE match_score IS NOT NULL
  AND match_status != 'pending';
