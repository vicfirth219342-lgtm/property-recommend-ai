-- 売買/賃貸対応マイグレーション

-- properties: transaction_type + 賃貸専用カラム追加
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS transaction_type  TEXT NOT NULL DEFAULT 'sale',  -- sale | rent
  ADD COLUMN IF NOT EXISTS monthly_rent      INTEGER,       -- 賃料（円/月）
  ADD COLUMN IF NOT EXISTS management_fee    INTEGER,       -- 管理費・共益費（円/月）
  ADD COLUMN IF NOT EXISTS repair_fund       INTEGER,       -- 修繕積立金（円/月）
  ADD COLUMN IF NOT EXISTS key_money         NUMERIC(4,1),  -- 礼金（ヶ月）
  ADD COLUMN IF NOT EXISTS deposit           NUMERIC(4,1),  -- 敷金（ヶ月）
  ADD COLUMN IF NOT EXISTS guarantee_money   INTEGER,       -- 保証金（円）
  ADD COLUMN IF NOT EXISTS yield_rate        NUMERIC(5,2),  -- 利回り（%）
  ADD COLUMN IF NOT EXISTS land_area         NUMERIC(8,2),  -- 土地面積（㎡）
  ADD COLUMN IF NOT EXISTS building_area     NUMERIC(8,2),  -- 建物面積（㎡）
  ADD COLUMN IF NOT EXISTS tsubo_count       NUMERIC(8,2),  -- 坪数
  ADD COLUMN IF NOT EXISTS tsubo_price       INTEGER,       -- 坪単価（円）
  ADD COLUMN IF NOT EXISTS available_from    TEXT;          -- 入居可能時期

-- customer_conditions: transaction_type 追加
ALTER TABLE customer_conditions
  ADD COLUMN IF NOT EXISTS transaction_type  TEXT NOT NULL DEFAULT 'sale',
  ADD COLUMN IF NOT EXISTS rent_min          INTEGER,  -- 賃料下限（円/月）
  ADD COLUMN IF NOT EXISTS rent_max          INTEGER;  -- 賃料上限（円/月）

-- customer_search_urls: transaction_type 追加
ALTER TABLE customer_search_urls
  ADD COLUMN IF NOT EXISTS transaction_type  TEXT NOT NULL DEFAULT 'sale';

-- 既存データをすべて sale として確定
UPDATE properties          SET transaction_type = 'sale' WHERE transaction_type IS NULL OR transaction_type = '';
UPDATE customer_conditions SET transaction_type = 'sale' WHERE transaction_type IS NULL OR transaction_type = '';
UPDATE customer_search_urls SET transaction_type = 'sale' WHERE transaction_type IS NULL OR transaction_type = '';

-- インデックス
CREATE INDEX IF NOT EXISTS idx_properties_txtype ON properties(transaction_type);
