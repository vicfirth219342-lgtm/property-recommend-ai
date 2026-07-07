-- ============================================================
-- migration_url_generation_v2.sql
-- 顧客条件からの自動URL生成に必要なスキーマ変更
-- ============================================================

-- --------------------------------------------------------
-- 1. customer_search_urls にカラム追加
-- --------------------------------------------------------

-- url_label: ポータルが生成したURL用ラベル ("SUUMO 港区 売買" 等)
ALTER TABLE customer_search_urls
  ADD COLUMN IF NOT EXISTS url_label TEXT;

-- generated_by: 'auto' = 条件から自動生成, 'manual' = 管理者手動登録
ALTER TABLE customer_search_urls
  ADD COLUMN IF NOT EXISTS generated_by TEXT NOT NULL DEFAULT 'manual';

-- condition_hash: 生成時の顧客条件ハッシュ (条件変更検知用)
ALTER TABLE customer_search_urls
  ADD COLUMN IF NOT EXISTS condition_hash TEXT;

-- generation_log: 生成時の診断情報 JSON
ALTER TABLE customer_search_urls
  ADD COLUMN IF NOT EXISTS generation_log JSONB;

-- --------------------------------------------------------
-- 2. UNIQUE 制約の変更
-- (customer_id, site) の1件制限を廃止し、URL単位で重複防止
-- SUUMO で複数都道府県にまたがる場合に複数URL格納できるようにする
-- --------------------------------------------------------

ALTER TABLE customer_search_urls
  DROP CONSTRAINT IF EXISTS customer_search_urls_customer_id_site_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_csu_customer_site_url
  ON customer_search_urls(customer_id, site, url);

-- --------------------------------------------------------
-- 3. portal_property_type_mappings テーブル作成
-- ポータル別・物件種別コードのマスターテーブル
-- (現在は参照用。将来的に portalUrlBuilder がここを参照する)
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS portal_property_type_mappings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal           TEXT NOT NULL CHECK (portal IN ('suumo', 'athome', 'homes')),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'rent', 'both')),
  -- 顧客条件の property_type フィールドと照合するパターン (部分一致)
  input_pattern    TEXT NOT NULL,
  -- 画面表示用の名称
  display_name     TEXT NOT NULL,
  -- ポータル内部コード (SUUMOのtc値等)
  portal_code      TEXT,
  -- URLへの付加値 (SUUMO: "tc=0300101", AtHome/Homes: "/mansion/chuko")
  portal_url_param TEXT NOT NULL,
  -- 物件種別未指定時のデフォルト
  is_default       BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order       INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pptm_portal_type_pattern
  ON portal_property_type_mappings(portal, transaction_type, input_pattern);

CREATE INDEX IF NOT EXISTS idx_pptm_portal ON portal_property_type_mappings(portal);
CREATE INDEX IF NOT EXISTS idx_pptm_default ON portal_property_type_mappings(portal, transaction_type, is_default);

-- --------------------------------------------------------
-- 4. portal_route_mappings テーブル作成 (路線・沿線検索用)
-- 将来的に「〇〇線沿線」条件からURL生成するためのマスター
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS portal_route_mappings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal           TEXT NOT NULL CHECK (portal IN ('suumo', 'athome', 'homes')),
  display_name     TEXT NOT NULL,     -- 照合キー: "東急東横線", "田園都市線"
  route_name       TEXT,              -- 正式路線名
  prefecture       TEXT,              -- 主な都道府県
  portal_code      TEXT,              -- ポータル内部コード
  portal_url_param TEXT NOT NULL,     -- URLへの付加値
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_prm_portal_route
  ON portal_route_mappings(portal, display_name);
