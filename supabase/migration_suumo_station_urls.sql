-- ============================================================
-- migration_suumo_station_urls.sql
-- SUUMO 駅検索URL を sc=（市区町村コード）から
-- SUUMO駅パス形式（prefecture/eki_slug）に更新する
--
-- 背景:
--   sc= は市区町村コードのため、駅徒歩分フィルター(ekk=)が機能しない。
--   /ms/chuko/kanagawa/eki_musashikosugi/ 形式のURLは
--   駅を起点とした ekk= フィルターが正しく動作する。
-- ============================================================

-- ============================================================
-- 神奈川県 駅
-- ============================================================
UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/eki_musashikosugi'
  WHERE portal='suumo' AND area_type='station' AND display_name='武蔵小杉';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/eki_musashinakahara'
  WHERE portal='suumo' AND area_type='station' AND display_name='武蔵中原';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/eki_musashishinjyo'
  WHERE portal='suumo' AND area_type='station' AND display_name='武蔵新城';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/eki_musashimizonokuchi'
  WHERE portal='suumo' AND area_type='station' AND display_name='武蔵溝ノ口';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/eki_mizonokuchi'
  WHERE portal='suumo' AND area_type='station' AND display_name='溝の口';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/eki_motosumiyoshi'
  WHERE portal='suumo' AND area_type='station' AND display_name='元住吉';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/eki_shinmaruko'
  WHERE portal='suumo' AND area_type='station' AND display_name='新丸子';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/eki_yokohama'
  WHERE portal='suumo' AND area_type='station' AND display_name='横浜';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/eki_shinyokohama'
  WHERE portal='suumo' AND area_type='station' AND display_name='新横浜';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/eki_minatomirai'
  WHERE portal='suumo' AND area_type='station' AND display_name='みなとみらい';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/eki_sakuragicho'
  WHERE portal='suumo' AND area_type='station' AND display_name='桜木町';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/eki_kannai'
  WHERE portal='suumo' AND area_type='station' AND display_name='関内';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/eki_fujisawa'
  WHERE portal='suumo' AND area_type='station' AND display_name='藤沢';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/eki_kamakura'
  WHERE portal='suumo' AND area_type='station' AND display_name='鎌倉';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/eki_ofuna'
  WHERE portal='suumo' AND area_type='station' AND display_name='大船';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/eki_chigasaki'
  WHERE portal='suumo' AND area_type='station' AND display_name='茅ヶ崎';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/eki_kawasaki'
  WHERE portal='suumo' AND area_type='station' AND display_name='川崎';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/eki_ebina'
  WHERE portal='suumo' AND area_type='station' AND display_name='海老名';

UPDATE portal_area_mappings SET portal_url_param = 'kanagawa/eki_honatsugi'
  WHERE portal='suumo' AND area_type='station' AND display_name='本厚木';

-- ============================================================
-- 東京都 駅
-- ============================================================
UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_shibuya'
  WHERE portal='suumo' AND area_type='station' AND display_name='渋谷';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_shinjuku'
  WHERE portal='suumo' AND area_type='station' AND display_name='新宿';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_ikebukuro'
  WHERE portal='suumo' AND area_type='station' AND display_name='池袋';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_shinagawa'
  WHERE portal='suumo' AND area_type='station' AND display_name='品川';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_meguro'
  WHERE portal='suumo' AND area_type='station' AND display_name='目黒';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_ebisu'
  WHERE portal='suumo' AND area_type='station' AND display_name='恵比寿';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_daikanyama'
  WHERE portal='suumo' AND area_type='station' AND display_name='代官山';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_nakameguro'
  WHERE portal='suumo' AND area_type='station' AND display_name='中目黒';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_jiyugaoka'
  WHERE portal='suumo' AND area_type='station' AND display_name='自由が丘';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_futakotamagawa'
  WHERE portal='suumo' AND area_type='station' AND display_name='二子玉川';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_sangenjaya'
  WHERE portal='suumo' AND area_type='station' AND display_name='三軒茶屋';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_shimokitazawa'
  WHERE portal='suumo' AND area_type='station' AND display_name='下北沢';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_gotanda'
  WHERE portal='suumo' AND area_type='station' AND display_name='五反田';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_osaki'
  WHERE portal='suumo' AND area_type='station' AND display_name='大崎';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_azabujuban'
  WHERE portal='suumo' AND area_type='station' AND display_name='麻布十番';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_hiroo'
  WHERE portal='suumo' AND area_type='station' AND display_name='広尾';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_shirokanedai'
  WHERE portal='suumo' AND area_type='station' AND display_name='白金台';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_shirokanetakanawa'
  WHERE portal='suumo' AND area_type='station' AND display_name='白金高輪';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_roppongi'
  WHERE portal='suumo' AND area_type='station' AND display_name='六本木';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_omotesando'
  WHERE portal='suumo' AND area_type='station' AND display_name='表参道';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_aoyamaichome'
  WHERE portal='suumo' AND area_type='station' AND display_name='青山一丁目';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_akasaka'
  WHERE portal='suumo' AND area_type='station' AND display_name='赤坂';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_shimbashi'
  WHERE portal='suumo' AND area_type='station' AND display_name='新橋';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_hamamatsucho'
  WHERE portal='suumo' AND area_type='station' AND display_name='浜松町';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_tamachi'
  WHERE portal='suumo' AND area_type='station' AND display_name='田町';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_takanawagatewaythis'
  WHERE portal='suumo' AND area_type='station' AND display_name='高輪ゲートウェイ';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_yotsuya'
  WHERE portal='suumo' AND area_type='station' AND display_name='四ツ谷';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_ichigaya'
  WHERE portal='suumo' AND area_type='station' AND display_name='市ヶ谷';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_iidabashi'
  WHERE portal='suumo' AND area_type='station' AND display_name='飯田橋';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_korakuen'
  WHERE portal='suumo' AND area_type='station' AND display_name='後楽園';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_ueno'
  WHERE portal='suumo' AND area_type='station' AND display_name='上野';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_akihabara'
  WHERE portal='suumo' AND area_type='station' AND display_name='秋葉原';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_tokyo'
  WHERE portal='suumo' AND area_type='station' AND display_name='東京';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_yurakucho'
  WHERE portal='suumo' AND area_type='station' AND display_name='有楽町';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_kichijoji'
  WHERE portal='suumo' AND area_type='station' AND display_name='吉祥寺';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_mitaka'
  WHERE portal='suumo' AND area_type='station' AND display_name='三鷹';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_ogikubo'
  WHERE portal='suumo' AND area_type='station' AND display_name='荻窪';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_koenji'
  WHERE portal='suumo' AND area_type='station' AND display_name='高円寺';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_nakano'
  WHERE portal='suumo' AND area_type='station' AND display_name='中野';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_monzennakacho'
  WHERE portal='suumo' AND area_type='station' AND display_name='門前仲町';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_kinshicho'
  WHERE portal='suumo' AND area_type='station' AND display_name='錦糸町';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_kitasenju'
  WHERE portal='suumo' AND area_type='station' AND display_name='北千住';

UPDATE portal_area_mappings SET portal_url_param = 'tokyo/eki_kamata'
  WHERE portal='suumo' AND area_type='station' AND display_name='蒲田';

-- ============================================================
-- 埼玉・千葉・大阪 駅
-- ============================================================
UPDATE portal_area_mappings SET portal_url_param = 'saitama/eki_omiya'
  WHERE portal='suumo' AND area_type='station' AND display_name='大宮';

UPDATE portal_area_mappings SET portal_url_param = 'saitama/eki_urawa'
  WHERE portal='suumo' AND area_type='station' AND display_name='浦和';

UPDATE portal_area_mappings SET portal_url_param = 'saitama/eki_kawaguchi'
  WHERE portal='suumo' AND area_type='station' AND display_name='川口';

UPDATE portal_area_mappings SET portal_url_param = 'saitama/eki_tokorozawa'
  WHERE portal='suumo' AND area_type='station' AND display_name='所沢';

UPDATE portal_area_mappings SET portal_url_param = 'chiba/eki_chiba'
  WHERE portal='suumo' AND area_type='station' AND display_name='千葉';

UPDATE portal_area_mappings SET portal_url_param = 'chiba/eki_ichikawa'
  WHERE portal='suumo' AND area_type='station' AND display_name='市川';

UPDATE portal_area_mappings SET portal_url_param = 'chiba/eki_funabashi'
  WHERE portal='suumo' AND area_type='station' AND display_name='船橋';

UPDATE portal_area_mappings SET portal_url_param = 'chiba/eki_matsudo'
  WHERE portal='suumo' AND area_type='station' AND display_name='松戸';

UPDATE portal_area_mappings SET portal_url_param = 'chiba/eki_kashiwa'
  WHERE portal='suumo' AND area_type='station' AND display_name='柏';

UPDATE portal_area_mappings SET portal_url_param = 'chiba/eki_urayasu'
  WHERE portal='suumo' AND area_type='station' AND display_name='浦安';

UPDATE portal_area_mappings SET portal_url_param = 'osaka/eki_osaka'
  WHERE portal='suumo' AND area_type='station' AND display_name='大阪(梅田)';

UPDATE portal_area_mappings SET portal_url_param = 'osaka/eki_umeda'
  WHERE portal='suumo' AND area_type='station' AND display_name='梅田';

UPDATE portal_area_mappings SET portal_url_param = 'osaka/eki_namba'
  WHERE portal='suumo' AND area_type='station' AND display_name='難波';

UPDATE portal_area_mappings SET portal_url_param = 'osaka/eki_tennoji'
  WHERE portal='suumo' AND area_type='station' AND display_name='天王寺';

-- ============================================================
-- 更新確認クエリ（実行後に目視チェック用）
-- SELECT display_name, portal_url_param
--   FROM portal_area_mappings
--  WHERE portal='suumo' AND area_type='station'
--  ORDER BY prefecture, display_name;
-- ============================================================
