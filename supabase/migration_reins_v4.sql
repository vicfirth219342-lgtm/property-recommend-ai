-- =============================================
-- Reins v4: セッション方式マルチページ取り込み
-- =============================================

-- セッション管理テーブル
CREATE TABLE IF NOT EXISTS reins_import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'collecting', -- collecting | completed | cleared
  page_count INTEGER DEFAULT 0,
  property_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- セッションごとのページ保存テーブル
CREATE TABLE IF NOT EXISTS reins_import_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES reins_import_sessions(id) ON DELETE CASCADE,
  page_url TEXT,
  raw_text TEXT NOT NULL,
  page_order INTEGER DEFAULT 1,
  imported_at TIMESTAMPTZ DEFAULT now()
);

-- reins_imported_properties にセッションIDを追加
ALTER TABLE reins_imported_properties
  ADD COLUMN IF NOT EXISTS session_id UUID;

-- pending_reins_checks に portal_url（物件個別URL）を追加
-- source_url はすでに存在する可能性があるのでIF NOT EXISTS
ALTER TABLE pending_reins_checks
  ADD COLUMN IF NOT EXISTS portal_url TEXT;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_reins_import_pages_session_id
  ON reins_import_pages(session_id);
CREATE INDEX IF NOT EXISTS idx_reins_imported_properties_session_id
  ON reins_imported_properties(session_id);
CREATE INDEX IF NOT EXISTS idx_pending_reins_checks_portal_url
  ON pending_reins_checks(portal_url);

COMMENT ON TABLE reins_import_sessions IS 'Chrome拡張からのページ取り込みセッション管理';
COMMENT ON TABLE reins_import_pages IS 'セッションごとの各ページテキスト';
