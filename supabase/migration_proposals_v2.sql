-- 顧客ごとのレインズ物件提案テーブル
-- レインズ取込物件を削除しても提案データは残る（物件情報をコピー保存）
CREATE TABLE IF NOT EXISTS customer_reins_proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id),
  reins_property_id UUID,  -- 元のreins_imported_properties.id（削除後はNULLになりうる）
  reins_number TEXT,
  property_name TEXT,
  address TEXT,
  price_man INTEGER,
  area_sqm NUMERIC(10,2),
  floor_plan TEXT,
  floor_number INTEGER,
  built_year INTEGER,
  built_month INTEGER,
  station TEXT,
  walk_minutes INTEGER,
  transaction_type TEXT,
  agent_company TEXT,
  proposed_at TIMESTAMPTZ DEFAULT now(),
  memo TEXT
);

CREATE INDEX IF NOT EXISTS idx_crp_customer ON customer_reins_proposals(customer_id);
CREATE INDEX IF NOT EXISTS idx_crp_reins_prop ON customer_reins_proposals(reins_property_id);
