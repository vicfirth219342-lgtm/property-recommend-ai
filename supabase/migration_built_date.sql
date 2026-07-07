-- built_year / built_month カラムを追加
-- building_age は既存カラムを引き続き使用（クロール時に再計算して上書き）

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS built_year  integer,
  ADD COLUMN IF NOT EXISTS built_month integer;

-- 既存データの backfill:
-- building_age が入っていれば builtYear を概算で埋める
UPDATE properties
SET built_year = EXTRACT(YEAR FROM NOW())::integer - building_age
WHERE built_year IS NULL
  AND building_age IS NOT NULL
  AND building_age > 0;
