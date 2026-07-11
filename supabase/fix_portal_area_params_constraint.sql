-- ================================================================
-- fix_portal_area_params_constraint.sql
-- portal_area_params の param_type CHECK制約を拡張する
-- ================================================================
-- 問題:
--   既存制約: CHECK (param_type IN ('query', 'path', 'station_path'))
--   run_all_area_master_v2.sql が使う: 'city_path', 'city_code', 'station_code'
--   → これらが制約違反でINSERTエラーになる
--
-- 解決:
--   制約を DROP → 新しい値を含む制約を ADD
--
-- 実行手順:
--   Supabase Dashboard → SQL Editor → このファイルの内容を貼り付けて Run
--   https://supabase.com/dashboard/project/dhlwthogurcsrfnwfmbm/sql/new
-- ================================================================

BEGIN;

-- [1] 既存の CHECK制約を削除
ALTER TABLE portal_area_params
  DROP CONSTRAINT IF EXISTS portal_area_params_param_type_check;

-- [2] 拡張した値セットで再作成
--   旧: 'query', 'path', 'station_path'
--   新: 'query', 'path', 'station_path', 'city_path', 'city_code', 'station_code'
ALTER TABLE portal_area_params
  ADD CONSTRAINT portal_area_params_param_type_check
  CHECK (param_type IN (
    'query',        -- SUUMO: ta=13&sc=13101 形式
    'path',         -- 旧マスター互換（汎用パス）
    'station_path', -- 駅パス: tokyo/eki_harajuku 形式
    'city_path',    -- 市区パス: /tokyo/hachioji-city 形式
    'city_code',    -- 市区コード（数値）
    'station_code'  -- 駅コード（数値）
  ));

COMMIT;

-- 確認クエリ
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'portal_area_params'::regclass
  AND contype = 'c';
