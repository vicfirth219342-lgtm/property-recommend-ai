-- migration_portal_area_mappings_to_masters.sql
-- 旧 portal_area_mappings (502件) から area_masters / area_aliases / portal_area_params に移行
-- 対象: 東京都・神奈川県のエリアのみ
-- 重複は ON CONFLICT DO NOTHING でスキップ

BEGIN;

-- ============================================================
-- Step 1: area_masters に未登録エリアを追加
--   旧マスターは area_type が 'city' に統一されているため
--   display_name で区/市を判別して ward / city / station に振り分ける
-- ============================================================
INSERT INTO area_masters (
  area_type, display_name, prefecture, city, ward, station_name, line_name, station_ward, yomi
)
SELECT DISTINCT ON (
  CASE
    WHEN pm.area_type = 'station' THEN 'station'
    WHEN pm.display_name ~ '[区]$' AND pm.area_type != 'station' THEN 'ward'
    ELSE 'city'
  END,
  pm.display_name,
  COALESCE(pm.prefecture, '')
)
  CASE
    WHEN pm.area_type = 'station' THEN 'station'
    WHEN pm.display_name ~ '[区]$' AND pm.area_type != 'station' THEN 'ward'
    ELSE 'city'
  END                    AS area_type,
  pm.display_name,
  pm.prefecture,
  pm.city,
  NULL                   AS ward,
  pm.station_name,
  NULL                   AS line_name,
  NULL                   AS station_ward,
  NULL                   AS yomi
FROM portal_area_mappings pm
WHERE pm.prefecture IN ('東京都', '神奈川県')
  AND NOT EXISTS (
    SELECT 1 FROM area_masters am
    WHERE am.display_name = pm.display_name
      AND COALESCE(am.prefecture, '') = COALESCE(pm.prefecture, '')
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- Step 2: portal_area_params に未登録パラメータを追加
--   旧マスターに記録された verified URL をそのまま移行
-- ============================================================
INSERT INTO portal_area_params (
  area_id, portal, param_type, portal_code, portal_url_param, verified, notes
)
SELECT
  am.id,
  pm.portal,
  CASE
    WHEN pm.portal = 'suumo' AND pm.portal_url_param LIKE 'ta=%' THEN 'query'
    WHEN pm.portal = 'suumo' THEN 'station_path'
    ELSE 'station_path'
  END             AS param_type,
  pm.portal_code,
  pm.portal_url_param,
  TRUE            AS verified,
  '旧portal_area_mappingsから移行' AS notes
FROM portal_area_mappings pm
JOIN area_masters am
  ON am.display_name = pm.display_name
 AND COALESCE(am.prefecture, '') = COALESCE(pm.prefecture, '')
WHERE pm.prefecture IN ('東京都', '神奈川県')
  AND NOT EXISTS (
    SELECT 1 FROM portal_area_params pap
    WHERE pap.area_id = am.id
      AND pap.portal  = pm.portal
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- Step 3: 駅名エイリアス「XX駅」を一括追加
-- ============================================================
INSERT INTO area_aliases (area_id, alias)
SELECT am.id, am.display_name || '駅'
FROM area_masters am
WHERE am.area_type = 'station'
  AND am.prefecture IN ('東京都', '神奈川県')
  AND NOT EXISTS (
    SELECT 1 FROM area_aliases al
    WHERE al.area_id = am.id
      AND al.alias = am.display_name || '駅'
  )
ON CONFLICT DO NOTHING;

COMMIT;
