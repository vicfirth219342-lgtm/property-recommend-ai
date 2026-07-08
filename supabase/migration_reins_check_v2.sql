-- ============================================================
-- migration_reins_check_v2.sql
-- レインズ照合強化: floor_number・management_fee・repair_fund 追加
-- ============================================================

-- pending_reins_checks に階数・管理費・修繕積立金を追加
ALTER TABLE pending_reins_checks
  ADD COLUMN IF NOT EXISTS floor_number   INTEGER,
  ADD COLUMN IF NOT EXISTS management_fee INTEGER,
  ADD COLUMN IF NOT EXISTS repair_fund    INTEGER,
  ADD COLUMN IF NOT EXISTS score_detail   JSONB;

-- スコア閾値変更に伴い既存レコードを再判定
-- confirmed: score >= 70, review: score >= 40, not_found: score < 40
UPDATE pending_reins_checks
SET match_status = CASE
  WHEN match_score >= 70 THEN 'confirmed'
  WHEN match_score >= 40 THEN 'review'
  ELSE 'not_found'
END
WHERE match_score IS NOT NULL
  AND match_status != 'pending';
