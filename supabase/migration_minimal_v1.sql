-- ============================================================
-- migration_minimal_v1.sql
-- 最小版リニューアル: レインズ直接取込 → 全顧客横断照合
--
-- 破壊的変更なし・追加のみ。既存テーブル/データは変更しない。
-- Supabase Dashboard の SQL Editor で手動実行してください。
-- ============================================================

-- 顧客希望条件に「希望駅」「希望間取り」を追加
ALTER TABLE customer_conditions
  ADD COLUMN IF NOT EXISTS preferred_station TEXT,   -- 希望駅
  ADD COLUMN IF NOT EXISTS floor_plan        TEXT;   -- 希望間取り

-- レインズ取込物件の取引態様検索を高速化
CREATE INDEX IF NOT EXISTS idx_reins_imported_txtype
  ON reins_imported_properties(transaction_type);

COMMENT ON COLUMN customer_conditions.preferred_station IS '希望駅（横断照合のエリア/駅一致に使用）';
COMMENT ON COLUMN customer_conditions.floor_plan IS '希望間取り（例: 3LDK）';
