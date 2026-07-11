-- customer_property_sources テーブル
-- 「どの顧客向けのどのエリア検索から取得した物件か」を記録する中間テーブル。
-- properties 本体に customer_id を持たせず、N:N 関係を正規化する。
CREATE TABLE IF NOT EXISTS customer_property_sources (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL REFERENCES customers(id)     ON DELETE CASCADE,
  property_id  UUID NOT NULL REFERENCES properties(id)    ON DELETE CASCADE,
  area_id      UUID             REFERENCES area_masters(id),
  portal       TEXT NOT NULL,
  search_url   TEXT,
  crawled_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, property_id, portal)
);

CREATE INDEX IF NOT EXISTS idx_cps_customer_id  ON customer_property_sources(customer_id);
CREATE INDEX IF NOT EXISTS idx_cps_property_id  ON customer_property_sources(property_id);
CREATE INDEX IF NOT EXISTS idx_cps_area_id      ON customer_property_sources(area_id);
