// 開発用: DBマイグレーションをサーバー側で実行するエンドポイント
// 使用後は削除するか MIGRATION_DONE 環境変数でガード
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS reins_search_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  transaction_type  TEXT NOT NULL DEFAULT 'sale',
  property_type     TEXT,
  area              TEXT,
  budget_min        INTEGER,
  budget_max        INTEGER,
  rent_min          INTEGER,
  rent_max          INTEGER,
  area_sqm_min      NUMERIC,
  walk_minutes_max  INTEGER,
  building_age_max  INTEGER,
  other_conditions  TEXT,
  status       TEXT NOT NULL DEFAULT 'pending',
  fetched_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reins_search_tasks_customer
  ON reins_search_tasks(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reins_properties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reins_number    TEXT UNIQUE NOT NULL,
  property_name   TEXT,
  address         TEXT,
  price_man       INTEGER,
  management_fee  INTEGER,
  area_sqm        NUMERIC,
  floor_plan      TEXT,
  floor_number    INTEGER,
  total_floors    INTEGER,
  built_year      INTEGER,
  built_month     INTEGER,
  station         TEXT,
  line_name       TEXT,
  walk_minutes    INTEGER,
  transaction_type TEXT NOT NULL DEFAULT 'sale',
  mediation_type  TEXT,
  agent_company   TEXT,
  agent_phone     TEXT,
  detail_url      TEXT,
  source_page_url TEXT,
  reins_registered_at  DATE,
  reins_updated_at     DATE,
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reins_properties_built
  ON reins_properties(built_year, built_month);
CREATE INDEX IF NOT EXISTS idx_reins_properties_price
  ON reins_properties(price_man);

CREATE TABLE IF NOT EXISTS reins_property_matches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reins_property_id   UUID NOT NULL REFERENCES reins_properties(id) ON DELETE CASCADE,
  search_task_id      UUID REFERENCES reins_search_tasks(id) ON DELETE SET NULL,
  match_status        TEXT NOT NULL DEFAULT 'match',
  match_reasons       JSONB,
  unmatch_reasons     JSONB,
  proposal_candidate_id UUID,
  added_to_candidate_at TIMESTAMPTZ,
  memo                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, reins_property_id)
);

CREATE INDEX IF NOT EXISTS idx_reins_property_matches_customer
  ON reins_property_matches(customer_id, match_status);
`

export async function POST(req: NextRequest) {
  // セキュリティ: CRON_SECRET で保護
  const secret = req.headers.get('x-migration-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Supabase JS クライアントは DDL を直接実行できないため、
  // 各テーブルの存在確認だけ行い、なければ SQL を返す
  const checks = await Promise.all([
    supabase.from('reins_search_tasks').select('id').limit(1),
    supabase.from('reins_properties').select('id').limit(1),
    supabase.from('reins_property_matches').select('id').limit(1),
  ])

  const missing = ['reins_search_tasks', 'reins_properties', 'reins_property_matches']
    .filter((_, i) => checks[i].error?.code === 'PGRST205')

  if (missing.length === 0) {
    return NextResponse.json({ ok: true, message: '全テーブル確認済み。マイグレーション不要です。' })
  }

  return NextResponse.json({
    ok: false,
    missing,
    message: '以下のテーブルが存在しません。Supabase Dashboard の SQL Editor で下記SQLを実行してください。',
    sql: MIGRATION_SQL,
  })
}
