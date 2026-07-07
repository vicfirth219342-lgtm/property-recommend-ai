-- 価格追跡・初回/最終確認日時カラムを追加
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_price    BIGINT,
  ADD COLUMN IF NOT EXISTS current_price BIGINT;

-- 既存レコードの初期値をセット（created_at を初回取得日として扱う）
UPDATE properties SET
  first_seen_at = created_at,
  last_seen_at  = created_at,
  current_price = price
WHERE first_seen_at IS NULL;
