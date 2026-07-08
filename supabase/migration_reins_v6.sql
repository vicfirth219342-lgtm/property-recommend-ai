-- ============================================================
-- migration_reins_v6.sql
-- pending_reins_checks の property_name 補完
-- properties テーブルの name を portal_url 経由で JOIN して補完
-- ============================================================

-- pending_reins_checks に floor_number カラムがなければ追加
ALTER TABLE pending_reins_checks
  ADD COLUMN IF NOT EXISTS floor_number INTEGER;

-- portal_url が一致する properties.name を使って property_name を補完
-- （すでに property_name がある行はスキップ）
UPDATE pending_reins_checks prc
SET property_name = p.name
FROM properties p
WHERE prc.portal_url = p.url
  AND (prc.property_name IS NULL OR prc.property_name = '')
  AND p.name IS NOT NULL
  AND p.name != '';

-- floor_number は properties テーブルに存在しないため補完不要（スキップ）
