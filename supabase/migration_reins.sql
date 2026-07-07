-- レインズ掲載確認テーブル
CREATE TABLE IF NOT EXISTS pending_reins_checks (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_name   TEXT,
  address         TEXT,
  price_man       INTEGER,            -- 万円単位
  area_sqm        NUMERIC(8,2),
  built_year      INTEGER,
  built_month     INTEGER,
  station         TEXT,
  walk_minutes    INTEGER,
  floor_plan      TEXT,
  source_url      TEXT,
  source_type     TEXT NOT NULL DEFAULT 'manual',  -- email|csv|url|pdf|image|manual
  raw_input       TEXT,
  search_keywords JSONB DEFAULT '[]',
  reins_input     TEXT,               -- ユーザーが貼ったレインズ結果テキスト
  match_score     INTEGER,            -- 0〜100
  match_status    TEXT DEFAULT 'pending',  -- pending|confirmed|review|not_found
  matched_items   JSONB DEFAULT '[]',
  unmatched_items JSONB DEFAULT '[]',
  checked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reins_checks_status  ON pending_reins_checks(match_status);
CREATE INDEX IF NOT EXISTS idx_reins_checks_created ON pending_reins_checks(created_at DESC);
