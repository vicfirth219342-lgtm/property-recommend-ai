-- crawl_jobs: manual-crawl のジョブ管理テーブル
CREATE TABLE IF NOT EXISTS crawl_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID,
  url             TEXT NOT NULL,
  site            TEXT,
  portal_name     TEXT,
  max_pages       INTEGER DEFAULT 3,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | running | completed | failed
  properties_found INTEGER,
  new_count       INTEGER,
  result          JSONB,
  error_message   TEXT,
  github_run_id   BIGINT,
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_customer ON crawl_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status   ON crawl_jobs(status);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_created  ON crawl_jobs(created_at DESC);
