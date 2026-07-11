-- migration_portal_params_notes_v1.sql
-- portal_area_params に verified / notes カラムを追加
-- verified: false = 未確認URL（要実URL検証）/ true = 確認済み（旧マスター移行・SUUMO公式コード等）
-- notes:    備考（「旧portal_area_mappingsから移行」「要確認」等）

ALTER TABLE portal_area_params
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE portal_area_params
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 既存の SUUMO クエリパラメータ（sc=XXXXX）は検証済みとみなす
UPDATE portal_area_params
SET verified = true, notes = '旧マスターまたはv1 seed登録'
WHERE notes IS NULL;
