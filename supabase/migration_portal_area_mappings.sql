-- portal_area_mappings: ポータル別エリアコードマスター
-- 顧客条件の area 文字列をこのテーブルに照合して検索URLを生成する

CREATE TABLE IF NOT EXISTS portal_area_mappings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal           TEXT NOT NULL CHECK (portal IN ('suumo', 'athome', 'homes')),
  area_type        TEXT NOT NULL CHECK (area_type IN ('prefecture', 'city', 'station', 'town')),
  display_name     TEXT NOT NULL,       -- 照合キー: "港区", "武蔵小杉", "川崎市中原区"
  prefecture       TEXT,                -- 都道府県名: "東京都", "神奈川県"
  city             TEXT,                -- 市区町村名 (任意)
  station_name     TEXT,                -- 駅名 (station タイプ時)
  portal_code      TEXT,                -- ポータル内部コード (sc値・ek値・path slug等)
  portal_url_param TEXT NOT NULL,       -- URLへの付加値:
                                        --   SUUMO city:    "ta=13&sc=13103"
                                        --   SUUMO station: "ta=14&ek=XXXXXXX"
                                        --   athome/homes:  "/tokyo/minato-city"
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 同一ポータル × エリア種別 × 表示名は重複禁止
CREATE UNIQUE INDEX IF NOT EXISTS uq_portal_area
  ON portal_area_mappings(portal, area_type, display_name);

CREATE INDEX IF NOT EXISTS idx_pam_portal ON portal_area_mappings(portal);
CREATE INDEX IF NOT EXISTS idx_pam_name   ON portal_area_mappings(display_name);
CREATE INDEX IF NOT EXISTS idx_pam_type   ON portal_area_mappings(area_type);
CREATE INDEX IF NOT EXISTS idx_pam_pref   ON portal_area_mappings(prefecture);
