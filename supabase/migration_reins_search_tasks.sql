-- ============================================================
-- migration_reins_search_tasks.sql
-- レインズ物件探索タスク・物件テーブル
--
-- reins_search_tasks : WebアプリからChrome拡張へ渡す顧客条件の一時保存
-- reins_properties   : レインズから取得した物件情報（物件番号が主キー）
-- reins_property_matches : 顧客×レインズ物件の照合結果
-- ============================================================

-- ── 1. 検索タスク（条件の一時保存） ──────────────────────────
CREATE TABLE IF NOT EXISTS reins_search_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  -- 顧客名（拡張機能表示用のスナップショット）
  customer_name TEXT NOT NULL,
  -- 顧客条件スナップショット
  transaction_type  TEXT NOT NULL DEFAULT 'sale',
  property_type     TEXT,
  area              TEXT,
  budget_min        INTEGER,
  budget_max        INTEGER,
  rent_min          INTEGER,
  rent_max          INTEGER,
  area_sqm_min      NUMERIC,
  walk_minutes_max  INTEGER,
  building_age_max  INTEGER,
  other_conditions  TEXT,
  -- タスクの状態
  -- pending: Chrome拡張が未取得
  -- fetched: Chrome拡張が条件を取得済み
  -- completed: 検索結果を受け取り済み
  status       TEXT NOT NULL DEFAULT 'pending',
  fetched_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chrome拡張が customer_id ベースで最新タスクを取得するためのインデックス
CREATE INDEX IF NOT EXISTS idx_reins_search_tasks_customer
  ON reins_search_tasks(customer_id, created_at DESC);

-- ── 2. レインズ物件テーブル ───────────────────────────────────
CREATE TABLE IF NOT EXISTS reins_properties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- レインズ物件番号（一意キー）
  reins_number    TEXT UNIQUE NOT NULL,
  -- 物件基本情報
  property_name   TEXT,
  address         TEXT,
  price_man       INTEGER,        -- 価格（万円）
  management_fee  INTEGER,        -- 管理費（円）
  area_sqm        NUMERIC,        -- 専有面積
  floor_plan      TEXT,           -- 間取り
  floor_number    INTEGER,        -- 階数
  total_floors    INTEGER,        -- 総階数
  built_year      INTEGER,
  built_month     INTEGER,
  -- 交通
  station         TEXT,           -- 最寄駅名
  line_name       TEXT,           -- 路線名
  walk_minutes    INTEGER,
  -- 取引情報
  transaction_type TEXT NOT NULL DEFAULT 'sale',
  mediation_type  TEXT,           -- 媒介種別（専属専任・専任・一般）
  agent_company   TEXT,           -- 元付会社
  agent_phone     TEXT,           -- 元付会社電話
  -- URL・識別情報
  detail_url      TEXT,
  source_page_url TEXT,           -- 取得元レインズページURL
  -- タイムスタンプ
  reins_registered_at  DATE,      -- レインズ登録日
  reins_updated_at     DATE,      -- レインズ更新日
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reins_properties_built
  ON reins_properties(built_year, built_month);
CREATE INDEX IF NOT EXISTS idx_reins_properties_price
  ON reins_properties(price_man);

-- ── 3. 顧客×レインズ物件 照合結果 ────────────────────────────
CREATE TABLE IF NOT EXISTS reins_property_matches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reins_property_id   UUID NOT NULL REFERENCES reins_properties(id) ON DELETE CASCADE,
  search_task_id      UUID REFERENCES reins_search_tasks(id) ON DELETE SET NULL,
  -- 照合結果
  -- match: 全条件一致
  -- partial: 一部条件超過
  -- no_match: 条件外
  -- excluded: ユーザーが除外
  -- checked: 詳細確認済み
  -- proposed: 提案候補に追加済み
  match_status        TEXT NOT NULL DEFAULT 'match',
  match_reasons       JSONB,       -- 一致した条件の詳細
  unmatch_reasons     JSONB,       -- 不一致の理由
  -- 提案候補への追加状態
  proposal_candidate_id UUID,      -- proposal_candidates.id（追加後にセット）
  added_to_candidate_at TIMESTAMPTZ,
  -- メモ
  memo                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, reins_property_id)
);

CREATE INDEX IF NOT EXISTS idx_reins_property_matches_customer
  ON reins_property_matches(customer_id, match_status);

-- ── 更新日時自動更新トリガー ──────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reins_search_tasks_updated_at') THEN
    CREATE TRIGGER trg_reins_search_tasks_updated_at
      BEFORE UPDATE ON reins_search_tasks
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reins_properties_updated_at') THEN
    CREATE TRIGGER trg_reins_properties_updated_at
      BEFORE UPDATE ON reins_properties
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reins_property_matches_updated_at') THEN
    CREATE TRIGGER trg_reins_property_matches_updated_at
      BEFORE UPDATE ON reins_property_matches
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
