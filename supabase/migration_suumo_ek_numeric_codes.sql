-- ============================================================
-- migration_suumo_ek_numeric_codes.sql
-- SUUMO 駅検索URLを eki_xxx（廃止・404）から
-- ek_XXXXX（数値コード・現行）形式へ一括更新
--
-- 背景:
--   migration_suumo_station_urls.sql で設定した eki_xxx 形式は
--   portalUrlBuilder.ts の isSuumoStationPath() に弾かれるため
--   駅ベースURL（ekk=徒歩分フィルター付き）が生成されない。
--   ek_XXXXX 数値コードへ更新することで正しい駅検索URLが生成される。
-- ============================================================

-- ============================================================
-- 神奈川県 駅
-- ============================================================
UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/ek_38720'
  WHERE portal='suumo' AND area_type='station' AND display_name='武蔵小杉';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/ek_38800'
  WHERE portal='suumo' AND area_type='station' AND display_name='武蔵中原';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/ek_38760'
  WHERE portal='suumo' AND area_type='station' AND display_name='武蔵新城';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/ek_38860'
  WHERE portal='suumo' AND area_type='station' AND display_name='武蔵溝ノ口';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/ek_36850'
  WHERE portal='suumo' AND area_type='station' AND display_name='溝の口';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/ek_39270'
  WHERE portal='suumo' AND area_type='station' AND display_name='元住吉';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/ek_20280'
  WHERE portal='suumo' AND area_type='station' AND display_name='新丸子';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/ek_40940'
  WHERE portal='suumo' AND area_type='station' AND display_name='横浜';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/ek_20390'
  WHERE portal='suumo' AND area_type='station' AND display_name='新横浜';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/ek_54020'
  WHERE portal='suumo' AND area_type='station' AND display_name='みなとみらい';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/ek_16100'
  WHERE portal='suumo' AND area_type='station' AND display_name='桜木町';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/ek_10300'
  WHERE portal='suumo' AND area_type='station' AND display_name='関内';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/ek_33900'
  WHERE portal='suumo' AND area_type='station' AND display_name='藤沢';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/ek_08890'
  WHERE portal='suumo' AND area_type='station' AND display_name='鎌倉';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/ek_06240'
  WHERE portal='suumo' AND area_type='station' AND display_name='大船';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/ek_23840'
  WHERE portal='suumo' AND area_type='station' AND display_name='茅ヶ崎';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/ek_09920'
  WHERE portal='suumo' AND area_type='station' AND display_name='川崎';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/ek_05090'
  WHERE portal='suumo' AND area_type='station' AND display_name='海老名';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/ek_35270'
  WHERE portal='suumo' AND area_type='station' AND display_name='本厚木';

-- ============================================================
-- 東京都 駅
-- ============================================================
UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_17640'
  WHERE portal='suumo' AND area_type='station' AND display_name='渋谷';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_19670'
  WHERE portal='suumo' AND area_type='station' AND display_name='新宿';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_02060'
  WHERE portal='suumo' AND area_type='station' AND display_name='池袋';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_17460'
  WHERE portal='suumo' AND area_type='station' AND display_name='品川';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_39110'
  WHERE portal='suumo' AND area_type='station' AND display_name='目黒';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_05050'
  WHERE portal='suumo' AND area_type='station' AND display_name='恵比寿';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_21850'
  WHERE portal='suumo' AND area_type='station' AND display_name='代官山';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_27580'
  WHERE portal='suumo' AND area_type='station' AND display_name='中目黒';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_18410'
  WHERE portal='suumo' AND area_type='station' AND display_name='自由が丘';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_34230'
  WHERE portal='suumo' AND area_type='station' AND display_name='二子玉川';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_16720'
  WHERE portal='suumo' AND area_type='station' AND display_name='三軒茶屋';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_18010'
  WHERE portal='suumo' AND area_type='station' AND display_name='下北沢';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_14970'
  WHERE portal='suumo' AND area_type='station' AND display_name='五反田';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_05780'
  WHERE portal='suumo' AND area_type='station' AND display_name='大崎';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_00800'
  WHERE portal='suumo' AND area_type='station' AND display_name='麻布十番';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_33410'
  WHERE portal='suumo' AND area_type='station' AND display_name='広尾';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_18930'
  WHERE portal='suumo' AND area_type='station' AND display_name='白金台';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_18940'
  WHERE portal='suumo' AND area_type='station' AND display_name='白金高輪';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_41560'
  WHERE portal='suumo' AND area_type='station' AND display_name='六本木';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_07240'
  WHERE portal='suumo' AND area_type='station' AND display_name='表参道';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_00250'
  WHERE portal='suumo' AND area_type='station' AND display_name='青山一丁目';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_00300'
  WHERE portal='suumo' AND area_type='station' AND display_name='赤坂';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_20110'
  WHERE portal='suumo' AND area_type='station' AND display_name='新橋';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_31160'
  WHERE portal='suumo' AND area_type='station' AND display_name='浜松町';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_23500'
  WHERE portal='suumo' AND area_type='station' AND display_name='田町';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_84570'
  WHERE portal='suumo' AND area_type='station' AND display_name='高輪ゲートウェイ';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_41160'
  WHERE portal='suumo' AND area_type='station' AND display_name='四ツ谷';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_02980'
  WHERE portal='suumo' AND area_type='station' AND display_name='市ヶ谷';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_01820'
  WHERE portal='suumo' AND area_type='station' AND display_name='飯田橋';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_14430'
  WHERE portal='suumo' AND area_type='station' AND display_name='後楽園';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_04030'
  WHERE portal='suumo' AND area_type='station' AND display_name='上野';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_00480'
  WHERE portal='suumo' AND area_type='station' AND display_name='秋葉原';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_25620'
  WHERE portal='suumo' AND area_type='station' AND display_name='東京';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_40650'
  WHERE portal='suumo' AND area_type='station' AND display_name='有楽町';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_11640'
  WHERE portal='suumo' AND area_type='station' AND display_name='吉祥寺';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_36880'
  WHERE portal='suumo' AND area_type='station' AND display_name='三鷹';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_06640'
  WHERE portal='suumo' AND area_type='station' AND display_name='荻窪';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_13930'
  WHERE portal='suumo' AND area_type='station' AND display_name='高円寺';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_27280'
  WHERE portal='suumo' AND area_type='station' AND display_name='中野';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_39600'
  WHERE portal='suumo' AND area_type='station' AND display_name='門前仲町';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_53960'
  WHERE portal='suumo' AND area_type='station' AND display_name='錦糸町';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_11310'
  WHERE portal='suumo' AND area_type='station' AND display_name='北千住';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/ek_08940'
  WHERE portal='suumo' AND area_type='station' AND display_name='蒲田';

-- ============================================================
-- 埼玉・千葉 駅
-- ============================================================
UPDATE portal_area_mappings SET portal_url_param = 'saitama/ek_06310'
  WHERE portal='suumo' AND area_type='station' AND display_name='大宮';

UPDATE portal_area_mappings SET portal_url_param = 'saitama/ek_04710'
  WHERE portal='suumo' AND area_type='station' AND display_name='浦和';

UPDATE portal_area_mappings SET portal_url_param = 'saitama/ek_09870'
  WHERE portal='suumo' AND area_type='station' AND display_name='川口';

UPDATE portal_area_mappings SET portal_url_param = 'saitama/ek_26120'
  WHERE portal='suumo' AND area_type='station' AND display_name='所沢';

UPDATE portal_area_mappings SET portal_url_param = 'chiba/ek_24180'
  WHERE portal='suumo' AND area_type='station' AND display_name='千葉';

UPDATE portal_area_mappings SET portal_url_param = 'chiba/ek_02990'
  WHERE portal='suumo' AND area_type='station' AND display_name='市川';

UPDATE portal_area_mappings SET portal_url_param = 'chiba/ek_34480'
  WHERE portal='suumo' AND area_type='station' AND display_name='船橋';

UPDATE portal_area_mappings SET portal_url_param = 'chiba/ek_35990'
  WHERE portal='suumo' AND area_type='station' AND display_name='松戸';

UPDATE portal_area_mappings SET portal_url_param = 'chiba/ek_07970'
  WHERE portal='suumo' AND area_type='station' AND display_name='柏';

UPDATE portal_area_mappings SET portal_url_param = 'chiba/ek_04690'
  WHERE portal='suumo' AND area_type='station' AND display_name='浦安';

-- ============================================================
-- 大阪 駅
-- ============================================================
UPDATE portal_area_mappings SET portal_url_param = 'osaka/ek_05680'
  WHERE portal='suumo' AND area_type='station' AND display_name='大阪(梅田)';

UPDATE portal_area_mappings SET portal_url_param = 'osaka/ek_04640'
  WHERE portal='suumo' AND area_type='station' AND display_name='梅田';

UPDATE portal_area_mappings SET portal_url_param = 'osaka/ek_28172'
  WHERE portal='suumo' AND area_type='station' AND display_name='難波';

UPDATE portal_area_mappings SET portal_url_param = 'osaka/ek_25420'
  WHERE portal='suumo' AND area_type='station' AND display_name='天王寺';

-- ============================================================
-- 確認クエリ（実行後に目視チェック用）
-- SELECT display_name, portal_url_param
--   FROM portal_area_mappings
--  WHERE portal='suumo' AND area_type='station'
--  ORDER BY prefecture, display_name;
-- ============================================================
