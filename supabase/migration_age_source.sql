-- 築年月補完・確定/推定区別用カラムを追加
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS age_source           TEXT,         -- 'list_page' | 'age_text_estimate' | 'detail_page' | null
  ADD COLUMN IF NOT EXISTS built_year_estimated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS detail_fetched_at    TIMESTAMPTZ;  -- 詳細ページ取得日時（重複取得防止）

COMMENT ON COLUMN properties.age_source IS 'list_page=一覧から取得, age_text_estimate=築X年から逆算(推定), detail_page=詳細ページから取得';
COMMENT ON COLUMN properties.built_year_estimated IS 'true=推定値(築X年逆算), false=確定値(YYYY年MM月)';
COMMENT ON COLUMN properties.detail_fetched_at IS '詳細ページをクロールした日時。NULLは未取得';
