-- ============================================================
-- migration_area_master_v1.sql
-- portal_area_mappings 設計見直し
--
-- 設計方針:
--   エリア定義（area_masters）とポータル別URLパラメータ（portal_area_params）を分離。
--   エリアを1回登録すれば、3ポータル分のパラメータを個別に追加できる。
--   エイリアスで「初台駅」「初台」など複数の入力表記を1エリアに集約する。
-- ============================================================

-- ============================================================
-- 1. area_masters
--    エリアのマスターテーブル（ポータル非依存）
-- ============================================================
CREATE TABLE IF NOT EXISTS area_masters (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- エリア種別
  area_type    TEXT        NOT NULL
    CHECK (area_type IN ('prefecture', 'city', 'ward', 'town', 'station')),
  --   prefecture : 都道府県（東京都、神奈川県）
  --   city       : 政令市（川崎市、横浜市）
  --   ward       : 区（港区、新宿区、川崎市中原区）
  --   town       : 町丁（白金1丁目）
  --   station    : 駅（初台、武蔵小杉）

  -- 標準表示名（検索マッチングの基準）
  display_name TEXT        NOT NULL,   -- 例: 初台、港区、川崎市中原区
  yomi         TEXT,                   -- 読み仮名（例: はつだい）

  -- 行政区分
  prefecture   TEXT,                   -- 都道府県名（例: 東京都）
  city         TEXT,                   -- 市区町村名（政令市 or 区）
  ward         TEXT,                   -- 区名（政令市の場合: 中原区）

  -- 駅情報（area_type = 'station' のみ使用）
  station_name TEXT,                   -- 正式駅名（例: 初台）
  line_name    TEXT,                   -- 路線名（例: 京王新線）
  -- 駅が属する行政区（station→ward/city の逆引き用）
  station_ward TEXT,                   -- 例: 渋谷区（初台駅の所在地）

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- エリア種別 × 表示名 × 都道府県 でユニーク
-- （同じ名前の駅が別県にある場合を考慮して prefecture も含める）
CREATE UNIQUE INDEX IF NOT EXISTS uq_area_masters_type_name_pref
  ON area_masters (area_type, display_name, COALESCE(prefecture, ''));

-- 検索用インデックス
CREATE INDEX IF NOT EXISTS idx_area_masters_display_name ON area_masters (display_name);
CREATE INDEX IF NOT EXISTS idx_area_masters_area_type    ON area_masters (area_type);
CREATE INDEX IF NOT EXISTS idx_area_masters_prefecture   ON area_masters (prefecture);
CREATE INDEX IF NOT EXISTS idx_area_masters_station_ward ON area_masters (station_ward);

-- ============================================================
-- 2. area_aliases
--    エリアの別名テーブル
--    「初台駅」「初台」「ハツダイ」など複数の入力表記を1エリアに集約
-- ============================================================
CREATE TABLE IF NOT EXISTS area_aliases (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id  UUID NOT NULL REFERENCES area_masters (id) ON DELETE CASCADE,
  alias    TEXT NOT NULL,  -- 別名（例: 初台駅、ハツダイ、初台周辺）

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- alias 自体はグローバルユニーク（1つの別名が複数エリアに紐つかないように）
CREATE UNIQUE INDEX IF NOT EXISTS uq_area_aliases_alias ON area_aliases (alias);
CREATE        INDEX IF NOT EXISTS idx_area_aliases_area_id ON area_aliases (area_id);

-- ============================================================
-- 3. portal_area_params
--    ポータル別URLパラメータテーブル
--    1エリア × 1ポータル = 1行
-- ============================================================
CREATE TABLE IF NOT EXISTS portal_area_params (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id        UUID NOT NULL REFERENCES area_masters (id) ON DELETE CASCADE,

  portal         TEXT NOT NULL
    CHECK (portal IN ('suumo', 'athome', 'homes')),

  -- URLパラメータ種別
  param_type     TEXT NOT NULL
    CHECK (param_type IN ('query', 'path', 'station_path')),
  --   query        : クエリ文字列形式  例: ta=13&sc=13104
  --   path         : パスセグメント形式 例: /tokyo/minato-city
  --   station_path : SUUMO駅パス形式   例: tokyo/eki_hatsudai

  -- ポータル固有コード（管理用）
  portal_code    TEXT,
  --   SUUMO city:    JISコード（例: 13113）
  --   SUUMO station: SUUMO独自駅コード
  --   athome/homes:  スラッグ（例: hatsudai-station）

  -- URLパラメータ本体
  portal_url_param TEXT NOT NULL,
  --   query        : "ta=13&sc=13104"
  --   path         : "/tokyo/shinjuku-ku"
  --   station_path : "tokyo/eki_hatsudai"

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 1エリア × 1ポータル = 1行（重複禁止）
  UNIQUE (area_id, portal)
);

CREATE INDEX IF NOT EXISTS idx_portal_area_params_area_id ON portal_area_params (area_id);
CREATE INDEX IF NOT EXISTS idx_portal_area_params_portal  ON portal_area_params (portal);
-- ポータルコードからの逆引き用
CREATE INDEX IF NOT EXISTS idx_portal_area_params_code    ON portal_area_params (portal, portal_code);

-- ============================================================
-- 4. updated_at 自動更新トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_area_masters_updated_at
  BEFORE UPDATE ON area_masters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_portal_area_params_updated_at
  BEFORE UPDATE ON portal_area_params
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 5. コメント
-- ============================================================
COMMENT ON TABLE area_masters IS 'エリアマスター（ポータル非依存）。駅・区・市・都道府県を管理する';
COMMENT ON TABLE area_aliases  IS 'エリア別名。「初台駅」「初台」など複数入力表記を1エリアに集約する';
COMMENT ON TABLE portal_area_params IS 'ポータル別URLパラメータ。1エリア×1ポータルで1行';

COMMENT ON COLUMN area_masters.area_type    IS 'prefecture/city/ward/town/station';
COMMENT ON COLUMN area_masters.station_ward IS '駅が属する区名（station→ward逆引き用）。例: 初台駅→渋谷区';
COMMENT ON COLUMN portal_area_params.param_type IS 'query=クエリ文字列 / path=パスセグメント / station_path=SUUMO駅パス';
COMMENT ON COLUMN portal_area_params.portal_url_param IS 'SUUMO query: "ta=13&sc=13104" / athome path: "/tokyo/hatsudai-station" / SUUMO station_path: "tokyo/eki_hatsudai"';
