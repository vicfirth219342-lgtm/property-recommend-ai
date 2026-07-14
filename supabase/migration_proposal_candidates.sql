-- proposal_candidates: 提案前の候補管理テーブル
-- proposals（提案済み履歴）とは役割を分け、ステータス管理・追加日・メモを持つ

CREATE TABLE IF NOT EXISTS proposal_candidates (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  property_id      UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  added_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by         TEXT,
  source           TEXT        DEFAULT 'manual_crawl',
  -- reins_status は追加時点のスナップショット。候補一覧では reins_check_queue の最新値を優先表示する
  reins_status     TEXT        DEFAULT 'unchecked',
  proposal_status  TEXT        NOT NULL DEFAULT 'pending',
  -- pending / preparing / proposed / considering / rejected / contracted
  memo             TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, property_id)
);

-- RLS は既存テーブルに合わせて無効（サービスロールキーで操作）
ALTER TABLE proposal_candidates DISABLE ROW LEVEL SECURITY;
