-- price / current_price の単位混在を修正（円 → 万円）
-- 対象: 初期クロール分（suumo等）の売買物件で円単位で保存された行
-- 判定基準: transaction_type = 'sale' かつ current_price > 1,000,000（100万万円 = 100億円超はあり得ないため円とみなす）
-- 実行前に必ず below の SELECT で対象行を確認すること

-- 1. 対象行の確認
SELECT id, site, name, transaction_type, price, current_price, last_price
FROM properties
WHERE transaction_type = 'sale'
  AND current_price > 1000000;

-- 2. 変換（price / current_price / last_price を万円に）
BEGIN;

UPDATE properties
SET
  price         = ROUND(price / 10000.0),
  current_price = ROUND(current_price / 10000.0),
  last_price    = CASE WHEN last_price > 1000000 THEN ROUND(last_price / 10000.0) ELSE last_price END
WHERE transaction_type = 'sale'
  AND current_price > 1000000;

-- 3. 変換結果の確認（この時点で current_price > 1000000 の sale 行が 0 件になること）
SELECT COUNT(*) AS remaining_yen_rows
FROM properties
WHERE transaction_type = 'sale'
  AND current_price > 1000000;

COMMIT;
