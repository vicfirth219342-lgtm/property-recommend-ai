-- ============================================================
-- portal_area_mappings シードデータ
-- 顧客条件の area 文字列と照合し、各ポータルの検索URLを生成する
--
-- portal_url_param 形式:
--   SUUMO city:    "ta=13&sc=13103"   (ar はビルダー側で ta→ar マップ)
--   SUUMO station: "ta=14&ek=XXXXXX"  (未確定のものは区コードで代替)
--   athome/homes:  "/tokyo/minato-city" (パスセグメント)
-- ============================================================

-- ============================================================
-- 1. 東京23区 × SUUMO  ta=13
-- ============================================================
INSERT INTO portal_area_mappings
  (portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param)
VALUES
  ('suumo','city','千代田区','東京都','千代田区',NULL,'13101','ta=13&sc=13101'),
  ('suumo','city','中央区',  '東京都','中央区',  NULL,'13102','ta=13&sc=13102'),
  ('suumo','city','港区',    '東京都','港区',    NULL,'13103','ta=13&sc=13103'),
  ('suumo','city','新宿区',  '東京都','新宿区',  NULL,'13104','ta=13&sc=13104'),
  ('suumo','city','文京区',  '東京都','文京区',  NULL,'13105','ta=13&sc=13105'),
  ('suumo','city','台東区',  '東京都','台東区',  NULL,'13106','ta=13&sc=13106'),
  ('suumo','city','墨田区',  '東京都','墨田区',  NULL,'13107','ta=13&sc=13107'),
  ('suumo','city','江東区',  '東京都','江東区',  NULL,'13108','ta=13&sc=13108'),
  ('suumo','city','品川区',  '東京都','品川区',  NULL,'13109','ta=13&sc=13109'),
  ('suumo','city','目黒区',  '東京都','目黒区',  NULL,'13110','ta=13&sc=13110'),
  ('suumo','city','大田区',  '東京都','大田区',  NULL,'13111','ta=13&sc=13111'),
  ('suumo','city','世田谷区','東京都','世田谷区',NULL,'13112','ta=13&sc=13112'),
  ('suumo','city','渋谷区',  '東京都','渋谷区',  NULL,'13113','ta=13&sc=13113'),
  ('suumo','city','中野区',  '東京都','中野区',  NULL,'13114','ta=13&sc=13114'),
  ('suumo','city','杉並区',  '東京都','杉並区',  NULL,'13115','ta=13&sc=13115'),
  ('suumo','city','豊島区',  '東京都','豊島区',  NULL,'13116','ta=13&sc=13116'),
  ('suumo','city','北区',    '東京都','北区',    NULL,'13117','ta=13&sc=13117'),
  ('suumo','city','荒川区',  '東京都','荒川区',  NULL,'13118','ta=13&sc=13118'),
  ('suumo','city','板橋区',  '東京都','板橋区',  NULL,'13119','ta=13&sc=13119'),
  ('suumo','city','練馬区',  '東京都','練馬区',  NULL,'13120','ta=13&sc=13120'),
  ('suumo','city','足立区',  '東京都','足立区',  NULL,'13121','ta=13&sc=13121'),
  ('suumo','city','葛飾区',  '東京都','葛飾区',  NULL,'13122','ta=13&sc=13122'),
  ('suumo','city','江戸川区','東京都','江戸川区',NULL,'13123','ta=13&sc=13123')
ON CONFLICT (portal, area_type, display_name) DO NOTHING;

-- ============================================================
-- 2. 東京市部 × SUUMO
-- ============================================================
INSERT INTO portal_area_mappings
  (portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param)
VALUES
  ('suumo','city','八王子市','東京都','八王子市',NULL,'13201','ta=13&sc=13201'),
  ('suumo','city','立川市',  '東京都','立川市',  NULL,'13202','ta=13&sc=13202'),
  ('suumo','city','武蔵野市','東京都','武蔵野市',NULL,'13203','ta=13&sc=13203'),
  ('suumo','city','三鷹市',  '東京都','三鷹市',  NULL,'13204','ta=13&sc=13204'),
  ('suumo','city','青梅市',  '東京都','青梅市',  NULL,'13205','ta=13&sc=13205'),
  ('suumo','city','府中市',  '東京都','府中市',  NULL,'13206','ta=13&sc=13206'),
  ('suumo','city','昭島市',  '東京都','昭島市',  NULL,'13207','ta=13&sc=13207'),
  ('suumo','city','調布市',  '東京都','調布市',  NULL,'13208','ta=13&sc=13208'),
  ('suumo','city','町田市',  '東京都','町田市',  NULL,'13209','ta=13&sc=13209'),
  ('suumo','city','小金井市','東京都','小金井市',NULL,'13210','ta=13&sc=13210'),
  ('suumo','city','小平市',  '東京都','小平市',  NULL,'13211','ta=13&sc=13211'),
  ('suumo','city','日野市',  '東京都','日野市',  NULL,'13212','ta=13&sc=13212'),
  ('suumo','city','東村山市','東京都','東村山市',NULL,'13213','ta=13&sc=13213'),
  ('suumo','city','国分寺市','東京都','国分寺市',NULL,'13215','ta=13&sc=13215'),
  ('suumo','city','国立市',  '東京都','国立市',  NULL,'13216','ta=13&sc=13216'),
  ('suumo','city','西東京市','東京都','西東京市',NULL,'13228','ta=13&sc=13228'),
  ('suumo','city','多摩市',  '東京都','多摩市',  NULL,'13224','ta=13&sc=13224'),
  ('suumo','city','稲城市',  '東京都','稲城市',  NULL,'13225','ta=13&sc=13225'),
  ('suumo','city','狛江市',  '東京都','狛江市',  NULL,'13219','ta=13&sc=13219')
ON CONFLICT (portal, area_type, display_name) DO NOTHING;

-- ============================================================
-- 3. 神奈川県（川崎・横浜・その他）× SUUMO  ta=14
-- ============================================================
INSERT INTO portal_area_mappings
  (portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param)
VALUES
  ('suumo','city','川崎市川崎区',  '神奈川県','川崎市川崎区',  NULL,'14131','ta=14&sc=14131'),
  ('suumo','city','川崎市幸区',    '神奈川県','川崎市幸区',    NULL,'14132','ta=14&sc=14132'),
  ('suumo','city','川崎市中原区',  '神奈川県','川崎市中原区',  NULL,'14133','ta=14&sc=14133'),
  ('suumo','city','川崎市高津区',  '神奈川県','川崎市高津区',  NULL,'14134','ta=14&sc=14134'),
  ('suumo','city','川崎市多摩区',  '神奈川県','川崎市多摩区',  NULL,'14135','ta=14&sc=14135'),
  ('suumo','city','川崎市宮前区',  '神奈川県','川崎市宮前区',  NULL,'14136','ta=14&sc=14136'),
  ('suumo','city','川崎市麻生区',  '神奈川県','川崎市麻生区',  NULL,'14137','ta=14&sc=14137'),
  ('suumo','city','中原区',        '神奈川県','川崎市中原区',  NULL,'14133','ta=14&sc=14133'),
  ('suumo','city','横浜市西区',    '神奈川県','横浜市西区',    NULL,'14101','ta=14&sc=14101'),
  ('suumo','city','横浜市中区',    '神奈川県','横浜市中区',    NULL,'14102','ta=14&sc=14102'),
  ('suumo','city','横浜市南区',    '神奈川県','横浜市南区',    NULL,'14103','ta=14&sc=14103'),
  ('suumo','city','横浜市港南区',  '神奈川県','横浜市港南区',  NULL,'14104','ta=14&sc=14104'),
  ('suumo','city','横浜市保土ケ谷区','神奈川県','横浜市保土ケ谷区',NULL,'14105','ta=14&sc=14105'),
  ('suumo','city','横浜市旭区',    '神奈川県','横浜市旭区',    NULL,'14106','ta=14&sc=14106'),
  ('suumo','city','横浜市磯子区',  '神奈川県','横浜市磯子区',  NULL,'14107','ta=14&sc=14107'),
  ('suumo','city','横浜市金沢区',  '神奈川県','横浜市金沢区',  NULL,'14108','ta=14&sc=14108'),
  ('suumo','city','横浜市港北区',  '神奈川県','横浜市港北区',  NULL,'14109','ta=14&sc=14109'),
  ('suumo','city','横浜市緑区',    '神奈川県','横浜市緑区',    NULL,'14110','ta=14&sc=14110'),
  ('suumo','city','横浜市青葉区',  '神奈川県','横浜市青葉区',  NULL,'14111','ta=14&sc=14111'),
  ('suumo','city','横浜市都筑区',  '神奈川県','横浜市都筑区',  NULL,'14112','ta=14&sc=14112'),
  ('suumo','city','横浜市戸塚区',  '神奈川県','横浜市戸塚区',  NULL,'14113','ta=14&sc=14113'),
  ('suumo','city','横浜市栄区',    '神奈川県','横浜市栄区',    NULL,'14114','ta=14&sc=14114'),
  ('suumo','city','横浜市泉区',    '神奈川県','横浜市泉区',    NULL,'14115','ta=14&sc=14115'),
  ('suumo','city','横浜市瀬谷区',  '神奈川県','横浜市瀬谷区',  NULL,'14116','ta=14&sc=14116'),
  ('suumo','city','横浜市鶴見区',  '神奈川県','横浜市鶴見区',  NULL,'14117','ta=14&sc=14117'),
  ('suumo','city','横浜市神奈川区','神奈川県','横浜市神奈川区',NULL,'14118','ta=14&sc=14118'),
  ('suumo','city','相模原市中央区','神奈川県','相模原市中央区',NULL,'14152','ta=14&sc=14152'),
  ('suumo','city','相模原市南区',  '神奈川県','相模原市南区',  NULL,'14153','ta=14&sc=14153'),
  ('suumo','city','相模原市緑区',  '神奈川県','相模原市緑区',  NULL,'14151','ta=14&sc=14151'),
  ('suumo','city','横須賀市',      '神奈川県','横須賀市',      NULL,'14201','ta=14&sc=14201'),
  ('suumo','city','平塚市',        '神奈川県','平塚市',        NULL,'14203','ta=14&sc=14203'),
  ('suumo','city','鎌倉市',        '神奈川県','鎌倉市',        NULL,'14204','ta=14&sc=14204'),
  ('suumo','city','藤沢市',        '神奈川県','藤沢市',        NULL,'14205','ta=14&sc=14205'),
  ('suumo','city','小田原市',      '神奈川県','小田原市',      NULL,'14206','ta=14&sc=14206'),
  ('suumo','city','茅ヶ崎市',      '神奈川県','茅ヶ崎市',      NULL,'14207','ta=14&sc=14207'),
  ('suumo','city','逗子市',        '神奈川県','逗子市',        NULL,'14208','ta=14&sc=14208'),
  ('suumo','city','大和市',        '神奈川県','大和市',        NULL,'14213','ta=14&sc=14213'),
  ('suumo','city','厚木市',        '神奈川県','厚木市',        NULL,'14212','ta=14&sc=14212'),
  ('suumo','city','海老名市',      '神奈川県','海老名市',      NULL,'14215','ta=14&sc=14215'),
  ('suumo','city','座間市',        '神奈川県','座間市',        NULL,'14216','ta=14&sc=14216')
ON CONFLICT (portal, area_type, display_name) DO NOTHING;

-- ============================================================
-- 4. 埼玉県 × SUUMO  ta=11
-- ============================================================
INSERT INTO portal_area_mappings
  (portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param)
VALUES
  ('suumo','city','さいたま市西区', '埼玉県','さいたま市西区', NULL,'11101','ta=11&sc=11101'),
  ('suumo','city','さいたま市北区', '埼玉県','さいたま市北区', NULL,'11102','ta=11&sc=11102'),
  ('suumo','city','さいたま市大宮区','埼玉県','さいたま市大宮区',NULL,'11103','ta=11&sc=11103'),
  ('suumo','city','さいたま市中央区','埼玉県','さいたま市中央区',NULL,'11105','ta=11&sc=11105'),
  ('suumo','city','さいたま市浦和区','埼玉県','さいたま市浦和区',NULL,'11107','ta=11&sc=11107'),
  ('suumo','city','さいたま市南区', '埼玉県','さいたま市南区', NULL,'11108','ta=11&sc=11108'),
  ('suumo','city','川口市',          '埼玉県','川口市',         NULL,'11203','ta=11&sc=11203'),
  ('suumo','city','所沢市',          '埼玉県','所沢市',         NULL,'11208','ta=11&sc=11208'),
  ('suumo','city','越谷市',          '埼玉県','越谷市',         NULL,'11219','ta=11&sc=11219'),
  ('suumo','city','草加市',          '埼玉県','草加市',         NULL,'11222','ta=11&sc=11222'),
  ('suumo','city','和光市',          '埼玉県','和光市',         NULL,'11230','ta=11&sc=11230'),
  ('suumo','city','新座市',          '埼玉県','新座市',         NULL,'11231','ta=11&sc=11231'),
  ('suumo','city','朝霞市',          '埼玉県','朝霞市',         NULL,'11233','ta=11&sc=11233'),
  ('suumo','city','志木市',          '埼玉県','志木市',         NULL,'11227','ta=11&sc=11227')
ON CONFLICT (portal, area_type, display_name) DO NOTHING;

-- ============================================================
-- 5. 千葉県 × SUUMO  ta=12
-- ============================================================
INSERT INTO portal_area_mappings
  (portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param)
VALUES
  ('suumo','city','千葉市中央区',   '千葉県','千葉市中央区',   NULL,'12101','ta=12&sc=12101'),
  ('suumo','city','千葉市花見川区', '千葉県','千葉市花見川区', NULL,'12102','ta=12&sc=12102'),
  ('suumo','city','千葉市稲毛区',   '千葉県','千葉市稲毛区',   NULL,'12103','ta=12&sc=12103'),
  ('suumo','city','千葉市美浜区',   '千葉県','千葉市美浜区',   NULL,'12106','ta=12&sc=12106'),
  ('suumo','city','市川市',          '千葉県','市川市',         NULL,'12203','ta=12&sc=12203'),
  ('suumo','city','船橋市',          '千葉県','船橋市',         NULL,'12204','ta=12&sc=12204'),
  ('suumo','city','松戸市',          '千葉県','松戸市',         NULL,'12207','ta=12&sc=12207'),
  ('suumo','city','柏市',            '千葉県','柏市',           NULL,'12217','ta=12&sc=12217'),
  ('suumo','city','浦安市',          '千葉県','浦安市',         NULL,'12227','ta=12&sc=12227'),
  ('suumo','city','習志野市',        '千葉県','習志野市',       NULL,'12220','ta=12&sc=12220'),
  ('suumo','city','八千代市',        '千葉県','八千代市',       NULL,'12221','ta=12&sc=12221')
ON CONFLICT (portal, area_type, display_name) DO NOTHING;

-- ============================================================
-- 6. 大阪府 × SUUMO  ta=27
-- ============================================================
INSERT INTO portal_area_mappings
  (portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param)
VALUES
  ('suumo','city','大阪市北区',     '大阪府','大阪市北区',     NULL,'27127','ta=27&sc=27127'),
  ('suumo','city','大阪市中央区',   '大阪府','大阪市中央区',   NULL,'27128','ta=27&sc=27128'),
  ('suumo','city','大阪市西区',     '大阪府','大阪市西区',     NULL,'27106','ta=27&sc=27106'),
  ('suumo','city','大阪市天王寺区', '大阪府','大阪市天王寺区', NULL,'27109','ta=27&sc=27109'),
  ('suumo','city','大阪市阿倍野区', '大阪府','大阪市阿倍野区', NULL,'27119','ta=27&sc=27119'),
  ('suumo','city','大阪市淀川区',   '大阪府','大阪市淀川区',   NULL,'27123','ta=27&sc=27123'),
  ('suumo','city','大阪市東淀川区', '大阪府','大阪市東淀川区', NULL,'27114','ta=27&sc=27114'),
  ('suumo','city','大阪市城東区',   '大阪府','大阪市城東区',   NULL,'27118','ta=27&sc=27118'),
  ('suumo','city','大阪市住吉区',   '大阪府','大阪市住吉区',   NULL,'27120','ta=27&sc=27120'),
  ('suumo','city','大阪市平野区',   '大阪府','大阪市平野区',   NULL,'27126','ta=27&sc=27126'),
  ('suumo','city','大阪市浪速区',   '大阪府','大阪市浪速区',   NULL,'27111','ta=27&sc=27111'),
  ('suumo','city','豊中市',         '大阪府','豊中市',         NULL,'27205','ta=27&sc=27205'),
  ('suumo','city','吹田市',         '大阪府','吹田市',         NULL,'27207','ta=27&sc=27207'),
  ('suumo','city','枚方市',         '大阪府','枚方市',         NULL,'27210','ta=27&sc=27210'),
  ('suumo','city','東大阪市',       '大阪府','東大阪市',       NULL,'27227','ta=27&sc=27227'),
  ('suumo','city','堺市堺区',       '大阪府','堺市堺区',       NULL,'27141','ta=27&sc=27141'),
  ('suumo','city','堺市北区',       '大阪府','堺市北区',       NULL,'27145','ta=27&sc=27145')
ON CONFLICT (portal, area_type, display_name) DO NOTHING;

-- ============================================================
-- 7. 愛知県 × SUUMO  ta=23
-- ============================================================
INSERT INTO portal_area_mappings
  (portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param)
VALUES
  ('suumo','city','名古屋市千種区', '愛知県','名古屋市千種区', NULL,'23101','ta=23&sc=23101'),
  ('suumo','city','名古屋市東区',   '愛知県','名古屋市東区',   NULL,'23102','ta=23&sc=23102'),
  ('suumo','city','名古屋市北区',   '愛知県','名古屋市北区',   NULL,'23103','ta=23&sc=23103'),
  ('suumo','city','名古屋市西区',   '愛知県','名古屋市西区',   NULL,'23104','ta=23&sc=23104'),
  ('suumo','city','名古屋市中村区', '愛知県','名古屋市中村区', NULL,'23105','ta=23&sc=23105'),
  ('suumo','city','名古屋市中区',   '愛知県','名古屋市中区',   NULL,'23106','ta=23&sc=23106'),
  ('suumo','city','名古屋市昭和区', '愛知県','名古屋市昭和区', NULL,'23107','ta=23&sc=23107'),
  ('suumo','city','名古屋市瑞穂区', '愛知県','名古屋市瑞穂区', NULL,'23108','ta=23&sc=23108'),
  ('suumo','city','名古屋市熱田区', '愛知県','名古屋市熱田区', NULL,'23109','ta=23&sc=23109'),
  ('suumo','city','名古屋市中川区', '愛知県','名古屋市中川区', NULL,'23110','ta=23&sc=23110'),
  ('suumo','city','名古屋市港区',   '愛知県','名古屋市港区',   NULL,'23111','ta=23&sc=23111'),
  ('suumo','city','名古屋市南区',   '愛知県','名古屋市南区',   NULL,'23112','ta=23&sc=23112'),
  ('suumo','city','名古屋市守山区', '愛知県','名古屋市守山区', NULL,'23113','ta=23&sc=23113'),
  ('suumo','city','名古屋市緑区',   '愛知県','名古屋市緑区',   NULL,'23114','ta=23&sc=23114'),
  ('suumo','city','名古屋市名東区', '愛知県','名古屋市名東区', NULL,'23115','ta=23&sc=23115'),
  ('suumo','city','名古屋市天白区', '愛知県','名古屋市天白区', NULL,'23116','ta=23&sc=23116')
ON CONFLICT (portal, area_type, display_name) DO NOTHING;

-- ============================================================
-- 8. SUUMO 駅名 → 所属区/市の sc コードへのマッピング（神奈川）
-- ※ SUUMO独自のek（駅コード）は非公開のため区コードで代替
-- ============================================================
INSERT INTO portal_area_mappings
  (portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param)
VALUES
  ('suumo','station','武蔵小杉',  '神奈川県','川崎市中原区','武蔵小杉',  '14133','ta=14&sc=14133'),
  ('suumo','station','武蔵中原',  '神奈川県','川崎市中原区','武蔵中原',  '14133','ta=14&sc=14133'),
  ('suumo','station','武蔵新城',  '神奈川県','川崎市高津区','武蔵新城',  '14134','ta=14&sc=14134'),
  ('suumo','station','武蔵溝ノ口','神奈川県','川崎市高津区','武蔵溝ノ口','14134','ta=14&sc=14134'),
  ('suumo','station','溝の口',    '神奈川県','川崎市高津区','溝の口',    '14134','ta=14&sc=14134'),
  ('suumo','station','元住吉',    '神奈川県','川崎市中原区','元住吉',    '14133','ta=14&sc=14133'),
  ('suumo','station','新丸子',    '神奈川県','川崎市中原区','新丸子',    '14133','ta=14&sc=14133'),
  ('suumo','station','横浜',      '神奈川県','横浜市西区',  '横浜',      '14101','ta=14&sc=14101'),
  ('suumo','station','新横浜',    '神奈川県','横浜市港北区','新横浜',    '14109','ta=14&sc=14109'),
  ('suumo','station','みなとみらい','神奈川県','横浜市西区','みなとみらい','14101','ta=14&sc=14101'),
  ('suumo','station','桜木町',    '神奈川県','横浜市中区',  '桜木町',    '14102','ta=14&sc=14102'),
  ('suumo','station','関内',      '神奈川県','横浜市中区',  '関内',      '14102','ta=14&sc=14102'),
  ('suumo','station','藤沢',      '神奈川県','藤沢市',      '藤沢',      '14205','ta=14&sc=14205'),
  ('suumo','station','鎌倉',      '神奈川県','鎌倉市',      '鎌倉',      '14204','ta=14&sc=14204'),
  ('suumo','station','大船',      '神奈川県','鎌倉市',      '大船',      '14204','ta=14&sc=14204'),
  ('suumo','station','茅ヶ崎',    '神奈川県','茅ヶ崎市',    '茅ヶ崎',    '14207','ta=14&sc=14207'),
  ('suumo','station','川崎',      '神奈川県','川崎市川崎区','川崎',      '14131','ta=14&sc=14131'),
  ('suumo','station','海老名',    '神奈川県','海老名市',    '海老名',    '14215','ta=14&sc=14215'),
  ('suumo','station','本厚木',    '神奈川県','厚木市',      '本厚木',    '14212','ta=14&sc=14212')
ON CONFLICT (portal, area_type, display_name) DO NOTHING;

-- ============================================================
-- 9. SUUMO 駅名 → 所属区/市の sc コードへのマッピング（東京）
-- ============================================================
INSERT INTO portal_area_mappings
  (portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param)
VALUES
  ('suumo','station','渋谷',      '東京都','渋谷区',   '渋谷',      '13113','ta=13&sc=13113'),
  ('suumo','station','新宿',      '東京都','新宿区',   '新宿',      '13104','ta=13&sc=13104'),
  ('suumo','station','池袋',      '東京都','豊島区',   '池袋',      '13116','ta=13&sc=13116'),
  ('suumo','station','品川',      '東京都','品川区',   '品川',      '13109','ta=13&sc=13109'),
  ('suumo','station','目黒',      '東京都','目黒区',   '目黒',      '13110','ta=13&sc=13110'),
  ('suumo','station','恵比寿',    '東京都','渋谷区',   '恵比寿',    '13113','ta=13&sc=13113'),
  ('suumo','station','代官山',    '東京都','渋谷区',   '代官山',    '13113','ta=13&sc=13113'),
  ('suumo','station','中目黒',    '東京都','目黒区',   '中目黒',    '13110','ta=13&sc=13110'),
  ('suumo','station','自由が丘',  '東京都','目黒区',   '自由が丘',  '13110','ta=13&sc=13110'),
  ('suumo','station','二子玉川',  '東京都','世田谷区', '二子玉川',  '13112','ta=13&sc=13112'),
  ('suumo','station','三軒茶屋',  '東京都','世田谷区', '三軒茶屋',  '13112','ta=13&sc=13112'),
  ('suumo','station','下北沢',    '東京都','世田谷区', '下北沢',    '13112','ta=13&sc=13112'),
  ('suumo','station','五反田',    '東京都','品川区',   '五反田',    '13109','ta=13&sc=13109'),
  ('suumo','station','大崎',      '東京都','品川区',   '大崎',      '13109','ta=13&sc=13109'),
  ('suumo','station','麻布十番',  '東京都','港区',     '麻布十番',  '13103','ta=13&sc=13103'),
  ('suumo','station','広尾',      '東京都','港区',     '広尾',      '13103','ta=13&sc=13103'),
  ('suumo','station','白金台',    '東京都','港区',     '白金台',    '13103','ta=13&sc=13103'),
  ('suumo','station','白金高輪',  '東京都','港区',     '白金高輪',  '13103','ta=13&sc=13103'),
  ('suumo','station','六本木',    '東京都','港区',     '六本木',    '13103','ta=13&sc=13103'),
  ('suumo','station','表参道',    '東京都','港区',     '表参道',    '13103','ta=13&sc=13103'),
  ('suumo','station','青山一丁目','東京都','港区',     '青山一丁目','13103','ta=13&sc=13103'),
  ('suumo','station','赤坂',      '東京都','港区',     '赤坂',      '13103','ta=13&sc=13103'),
  ('suumo','station','新橋',      '東京都','港区',     '新橋',      '13103','ta=13&sc=13103'),
  ('suumo','station','浜松町',    '東京都','港区',     '浜松町',    '13103','ta=13&sc=13103'),
  ('suumo','station','田町',      '東京都','港区',     '田町',      '13103','ta=13&sc=13103'),
  ('suumo','station','高輪ゲートウェイ','東京都','港区','高輪ゲートウェイ','13103','ta=13&sc=13103'),
  ('suumo','station','四ツ谷',    '東京都','新宿区',   '四ツ谷',    '13104','ta=13&sc=13104'),
  ('suumo','station','市ヶ谷',    '東京都','新宿区',   '市ヶ谷',    '13104','ta=13&sc=13104'),
  ('suumo','station','飯田橋',    '東京都','文京区',   '飯田橋',    '13105','ta=13&sc=13105'),
  ('suumo','station','後楽園',    '東京都','文京区',   '後楽園',    '13105','ta=13&sc=13105'),
  ('suumo','station','上野',      '東京都','台東区',   '上野',      '13106','ta=13&sc=13106'),
  ('suumo','station','秋葉原',    '東京都','千代田区', '秋葉原',    '13101','ta=13&sc=13101'),
  ('suumo','station','東京',      '東京都','千代田区', '東京',      '13101','ta=13&sc=13101'),
  ('suumo','station','有楽町',    '東京都','千代田区', '有楽町',    '13101','ta=13&sc=13101'),
  ('suumo','station','吉祥寺',    '東京都','武蔵野市', '吉祥寺',    '13203','ta=13&sc=13203'),
  ('suumo','station','三鷹',      '東京都','三鷹市',   '三鷹',      '13204','ta=13&sc=13204'),
  ('suumo','station','荻窪',      '東京都','杉並区',   '荻窪',      '13115','ta=13&sc=13115'),
  ('suumo','station','高円寺',    '東京都','杉並区',   '高円寺',    '13115','ta=13&sc=13115'),
  ('suumo','station','中野',      '東京都','中野区',   '中野',      '13114','ta=13&sc=13114'),
  ('suumo','station','門前仲町',  '東京都','江東区',   '門前仲町',  '13108','ta=13&sc=13108'),
  ('suumo','station','錦糸町',    '東京都','墨田区',   '錦糸町',    '13107','ta=13&sc=13107'),
  ('suumo','station','北千住',    '東京都','足立区',   '北千住',    '13121','ta=13&sc=13121'),
  ('suumo','station','蒲田',      '東京都','大田区',   '蒲田',      '13111','ta=13&sc=13111')
ON CONFLICT (portal, area_type, display_name) DO NOTHING;

-- ============================================================
-- 10. SUUMO 駅名（埼玉・千葉・大阪）
-- ============================================================
INSERT INTO portal_area_mappings
  (portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param)
VALUES
  ('suumo','station','大宮',      '埼玉県','さいたま市大宮区','大宮',  '11103','ta=11&sc=11103'),
  ('suumo','station','浦和',      '埼玉県','さいたま市浦和区','浦和',  '11107','ta=11&sc=11107'),
  ('suumo','station','川口',      '埼玉県','川口市',          '川口',  '11203','ta=11&sc=11203'),
  ('suumo','station','所沢',      '埼玉県','所沢市',          '所沢',  '11208','ta=11&sc=11208'),
  ('suumo','station','千葉',      '千葉県','千葉市中央区',    '千葉',  '12101','ta=12&sc=12101'),
  ('suumo','station','市川',      '千葉県','市川市',          '市川',  '12203','ta=12&sc=12203'),
  ('suumo','station','船橋',      '千葉県','船橋市',          '船橋',  '12204','ta=12&sc=12204'),
  ('suumo','station','松戸',      '千葉県','松戸市',          '松戸',  '12207','ta=12&sc=12207'),
  ('suumo','station','柏',        '千葉県','柏市',            '柏',    '12217','ta=12&sc=12217'),
  ('suumo','station','浦安',      '千葉県','浦安市',          '浦安',  '12227','ta=12&sc=12227'),
  ('suumo','station','大阪(梅田)','大阪府','大阪市北区',      '大阪(梅田)','27127','ta=27&sc=27127'),
  ('suumo','station','梅田',      '大阪府','大阪市北区',      '梅田',  '27127','ta=27&sc=27127'),
  ('suumo','station','難波',      '大阪府','大阪市浪速区',    '難波',  '27111','ta=27&sc=27111'),
  ('suumo','station','天王寺',    '大阪府','大阪市天王寺区',  '天王寺','27109','ta=27&sc=27109'),
  ('suumo','station','心斎橋',    '大阪府','大阪市中央区',    '心斎橋','27128','ta=27&sc=27128')
ON CONFLICT (portal, area_type, display_name) DO NOTHING;

-- ============================================================
-- 11. 東京23区 × AtHome
-- ============================================================
INSERT INTO portal_area_mappings
  (portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param)
VALUES
  ('athome','city','千代田区','東京都','千代田区',NULL,'chiyoda-city',  '/tokyo/chiyoda-city'),
  ('athome','city','中央区',  '東京都','中央区',  NULL,'chuo-city',     '/tokyo/chuo-city'),
  ('athome','city','港区',    '東京都','港区',    NULL,'minato-city',   '/tokyo/minato-city'),
  ('athome','city','新宿区',  '東京都','新宿区',  NULL,'shinjuku-city', '/tokyo/shinjuku-city'),
  ('athome','city','文京区',  '東京都','文京区',  NULL,'bunkyo-city',   '/tokyo/bunkyo-city'),
  ('athome','city','台東区',  '東京都','台東区',  NULL,'taito-city',    '/tokyo/taito-city'),
  ('athome','city','墨田区',  '東京都','墨田区',  NULL,'sumida-city',   '/tokyo/sumida-city'),
  ('athome','city','江東区',  '東京都','江東区',  NULL,'koto-city',     '/tokyo/koto-city'),
  ('athome','city','品川区',  '東京都','品川区',  NULL,'shinagawa-city','/tokyo/shinagawa-city'),
  ('athome','city','目黒区',  '東京都','目黒区',  NULL,'meguro-city',   '/tokyo/meguro-city'),
  ('athome','city','大田区',  '東京都','大田区',  NULL,'ota-city',      '/tokyo/ota-city'),
  ('athome','city','世田谷区','東京都','世田谷区',NULL,'setagaya-city', '/tokyo/setagaya-city'),
  ('athome','city','渋谷区',  '東京都','渋谷区',  NULL,'shibuya-city',  '/tokyo/shibuya-city'),
  ('athome','city','中野区',  '東京都','中野区',  NULL,'nakano-city',   '/tokyo/nakano-city'),
  ('athome','city','杉並区',  '東京都','杉並区',  NULL,'suginami-city', '/tokyo/suginami-city'),
  ('athome','city','豊島区',  '東京都','豊島区',  NULL,'toshima-city',  '/tokyo/toshima-city'),
  ('athome','city','北区',    '東京都','北区',    NULL,'kita-city',     '/tokyo/kita-city'),
  ('athome','city','荒川区',  '東京都','荒川区',  NULL,'arakawa-city',  '/tokyo/arakawa-city'),
  ('athome','city','板橋区',  '東京都','板橋区',  NULL,'itabashi-city', '/tokyo/itabashi-city'),
  ('athome','city','練馬区',  '東京都','練馬区',  NULL,'nerima-city',   '/tokyo/nerima-city'),
  ('athome','city','足立区',  '東京都','足立区',  NULL,'adachi-city',   '/tokyo/adachi-city'),
  ('athome','city','葛飾区',  '東京都','葛飾区',  NULL,'katsushika-city','/tokyo/katsushika-city'),
  ('athome','city','江戸川区','東京都','江戸川区',NULL,'edogawa-city',  '/tokyo/edogawa-city')
ON CONFLICT (portal, area_type, display_name) DO NOTHING;

-- ============================================================
-- 12. 東京市部 × AtHome
-- ============================================================
INSERT INTO portal_area_mappings
  (portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param)
VALUES
  ('athome','city','八王子市','東京都','八王子市',NULL,'hachioji-city',  '/tokyo/hachioji-city'),
  ('athome','city','立川市',  '東京都','立川市',  NULL,'tachikawa-city', '/tokyo/tachikawa-city'),
  ('athome','city','武蔵野市','東京都','武蔵野市',NULL,'musashino-city', '/tokyo/musashino-city'),
  ('athome','city','三鷹市',  '東京都','三鷹市',  NULL,'mitaka-city',    '/tokyo/mitaka-city'),
  ('athome','city','府中市',  '東京都','府中市',  NULL,'fuchu-city',     '/tokyo/fuchu-city'),
  ('athome','city','調布市',  '東京都','調布市',  NULL,'chofu-city',     '/tokyo/chofu-city'),
  ('athome','city','町田市',  '東京都','町田市',  NULL,'machida-city',   '/tokyo/machida-city'),
  ('athome','city','国分寺市','東京都','国分寺市',NULL,'kokubunji-city', '/tokyo/kokubunji-city'),
  ('athome','city','国立市',  '東京都','国立市',  NULL,'kunitachi-city', '/tokyo/kunitachi-city'),
  ('athome','city','西東京市','東京都','西東京市',NULL,'nishitokyo-city','/tokyo/nishitokyo-city'),
  ('athome','city','多摩市',  '東京都','多摩市',  NULL,'tama-city',      '/tokyo/tama-city'),
  ('athome','city','稲城市',  '東京都','稲城市',  NULL,'inagi-city',     '/tokyo/inagi-city'),
  ('athome','city','狛江市',  '東京都','狛江市',  NULL,'komae-city',     '/tokyo/komae-city')
ON CONFLICT (portal, area_type, display_name) DO NOTHING;

-- ============================================================
-- 13. 神奈川県（川崎・横浜・その他）× AtHome
-- ============================================================
INSERT INTO portal_area_mappings
  (portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param)
VALUES
  ('athome','city','川崎市川崎区',  '神奈川県','川崎市川崎区',  NULL,'kawasaki-shi-kawasaki-ku', '/kanagawa/kawasaki-shi-kawasaki-ku'),
  ('athome','city','川崎市幸区',    '神奈川県','川崎市幸区',    NULL,'kawasaki-shi-saiwai-ku',   '/kanagawa/kawasaki-shi-saiwai-ku'),
  ('athome','city','川崎市中原区',  '神奈川県','川崎市中原区',  NULL,'kawasaki-shi-nakahara-ku', '/kanagawa/kawasaki-shi-nakahara-ku'),
  ('athome','city','川崎市高津区',  '神奈川県','川崎市高津区',  NULL,'kawasaki-shi-takatsu-ku',  '/kanagawa/kawasaki-shi-takatsu-ku'),
  ('athome','city','川崎市多摩区',  '神奈川県','川崎市多摩区',  NULL,'kawasaki-shi-tama-ku',     '/kanagawa/kawasaki-shi-tama-ku'),
  ('athome','city','川崎市宮前区',  '神奈川県','川崎市宮前区',  NULL,'kawasaki-shi-miyamae-ku',  '/kanagawa/kawasaki-shi-miyamae-ku'),
  ('athome','city','川崎市麻生区',  '神奈川県','川崎市麻生区',  NULL,'kawasaki-shi-asao-ku',     '/kanagawa/kawasaki-shi-asao-ku'),
  ('athome','city','中原区',        '神奈川県','川崎市中原区',  NULL,'kawasaki-shi-nakahara-ku', '/kanagawa/kawasaki-shi-nakahara-ku'),
  ('athome','city','横浜市西区',      '神奈川県','横浜市西区',      NULL,'yokohama-shi-nishi-ku',    '/kanagawa/yokohama-shi-nishi-ku'),
  ('athome','city','横浜市中区',      '神奈川県','横浜市中区',      NULL,'yokohama-shi-naka-ku',     '/kanagawa/yokohama-shi-naka-ku'),
  ('athome','city','横浜市南区',      '神奈川県','横浜市南区',      NULL,'yokohama-shi-minami-ku',   '/kanagawa/yokohama-shi-minami-ku'),
  ('athome','city','横浜市港南区',    '神奈川県','横浜市港南区',    NULL,'yokohama-shi-konan-ku',    '/kanagawa/yokohama-shi-konan-ku'),
  ('athome','city','横浜市保土ケ谷区','神奈川県','横浜市保土ケ谷区',NULL,'yokohama-shi-hodogaya-ku', '/kanagawa/yokohama-shi-hodogaya-ku'),
  ('athome','city','横浜市旭区',      '神奈川県','横浜市旭区',      NULL,'yokohama-shi-asahi-ku',    '/kanagawa/yokohama-shi-asahi-ku'),
  ('athome','city','横浜市磯子区',    '神奈川県','横浜市磯子区',    NULL,'yokohama-shi-isogo-ku',    '/kanagawa/yokohama-shi-isogo-ku'),
  ('athome','city','横浜市金沢区',    '神奈川県','横浜市金沢区',    NULL,'yokohama-shi-kanazawa-ku', '/kanagawa/yokohama-shi-kanazawa-ku'),
  ('athome','city','横浜市港北区',    '神奈川県','横浜市港北区',    NULL,'yokohama-shi-kohoku-ku',   '/kanagawa/yokohama-shi-kohoku-ku'),
  ('athome','city','横浜市緑区',      '神奈川県','横浜市緑区',      NULL,'yokohama-shi-midori-ku',   '/kanagawa/yokohama-shi-midori-ku'),
  ('athome','city','横浜市青葉区',    '神奈川県','横浜市青葉区',    NULL,'yokohama-shi-aoba-ku',     '/kanagawa/yokohama-shi-aoba-ku'),
  ('athome','city','横浜市都筑区',    '神奈川県','横浜市都筑区',    NULL,'yokohama-shi-tsuzuki-ku',  '/kanagawa/yokohama-shi-tsuzuki-ku'),
  ('athome','city','横浜市戸塚区',    '神奈川県','横浜市戸塚区',    NULL,'yokohama-shi-totsuka-ku',  '/kanagawa/yokohama-shi-totsuka-ku'),
  ('athome','city','横浜市栄区',      '神奈川県','横浜市栄区',      NULL,'yokohama-shi-sakae-ku',    '/kanagawa/yokohama-shi-sakae-ku'),
  ('athome','city','横浜市泉区',      '神奈川県','横浜市泉区',      NULL,'yokohama-shi-izumi-ku',    '/kanagawa/yokohama-shi-izumi-ku'),
  ('athome','city','横浜市瀬谷区',    '神奈川県','横浜市瀬谷区',    NULL,'yokohama-shi-seya-ku',     '/kanagawa/yokohama-shi-seya-ku'),
  ('athome','city','横浜市鶴見区',    '神奈川県','横浜市鶴見区',    NULL,'yokohama-shi-tsurumi-ku',  '/kanagawa/yokohama-shi-tsurumi-ku'),
  ('athome','city','横浜市神奈川区',  '神奈川県','横浜市神奈川区',  NULL,'yokohama-shi-kanagawa-ku', '/kanagawa/yokohama-shi-kanagawa-ku'),
  ('athome','city','相模原市中央区','神奈川県','相模原市中央区',NULL,'sagamihara-shi-chuo-ku',   '/kanagawa/sagamihara-shi-chuo-ku'),
  ('athome','city','相模原市南区',  '神奈川県','相模原市南区',  NULL,'sagamihara-shi-minami-ku', '/kanagawa/sagamihara-shi-minami-ku'),
  ('athome','city','横須賀市',      '神奈川県','横須賀市',      NULL,'yokosuka-city',            '/kanagawa/yokosuka-city'),
  ('athome','city','平塚市',        '神奈川県','平塚市',        NULL,'hiratsuka-city',           '/kanagawa/hiratsuka-city'),
  ('athome','city','鎌倉市',        '神奈川県','鎌倉市',        NULL,'kamakura-city',            '/kanagawa/kamakura-city'),
  ('athome','city','藤沢市',        '神奈川県','藤沢市',        NULL,'fujisawa-city',            '/kanagawa/fujisawa-city'),
  ('athome','city','小田原市',      '神奈川県','小田原市',      NULL,'odawara-city',             '/kanagawa/odawara-city'),
  ('athome','city','茅ヶ崎市',      '神奈川県','茅ヶ崎市',      NULL,'chigasaki-city',           '/kanagawa/chigasaki-city'),
  ('athome','city','逗子市',        '神奈川県','逗子市',        NULL,'zushi-city',               '/kanagawa/zushi-city'),
  ('athome','city','大和市',        '神奈川県','大和市',        NULL,'yamato-city',              '/kanagawa/yamato-city'),
  ('athome','city','厚木市',        '神奈川県','厚木市',        NULL,'atsugi-city',              '/kanagawa/atsugi-city'),
  ('athome','city','海老名市',      '神奈川県','海老名市',      NULL,'ebina-city',               '/kanagawa/ebina-city')
ON CONFLICT (portal, area_type, display_name) DO NOTHING;

-- ============================================================
-- 14. 埼玉・千葉・大阪・愛知 × AtHome
-- ============================================================
INSERT INTO portal_area_mappings
  (portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param)
VALUES
  ('athome','city','さいたま市大宮区','埼玉県','さいたま市大宮区',NULL,'saitama-shi-omiya-ku',  '/saitama/saitama-shi-omiya-ku'),
  ('athome','city','さいたま市浦和区','埼玉県','さいたま市浦和区',NULL,'saitama-shi-urawa-ku',  '/saitama/saitama-shi-urawa-ku'),
  ('athome','city','さいたま市南区',  '埼玉県','さいたま市南区',  NULL,'saitama-shi-minami-ku', '/saitama/saitama-shi-minami-ku'),
  ('athome','city','川口市',           '埼玉県','川口市',          NULL,'kawaguchi-city',         '/saitama/kawaguchi-city'),
  ('athome','city','所沢市',           '埼玉県','所沢市',          NULL,'tokorozawa-city',        '/saitama/tokorozawa-city'),
  ('athome','city','越谷市',           '埼玉県','越谷市',          NULL,'koshigaya-city',         '/saitama/koshigaya-city'),
  ('athome','city','草加市',           '埼玉県','草加市',          NULL,'soka-city',              '/saitama/soka-city'),
  ('athome','city','和光市',           '埼玉県','和光市',          NULL,'wako-city',              '/saitama/wako-city'),
  ('athome','city','朝霞市',           '埼玉県','朝霞市',          NULL,'asaka-city',             '/saitama/asaka-city'),
  ('athome','city','千葉市中央区','千葉県','千葉市中央区',NULL,'chiba-shi-chuo-ku',   '/chiba/chiba-shi-chuo-ku'),
  ('athome','city','千葉市美浜区','千葉県','千葉市美浜区',NULL,'chiba-shi-mihama-ku', '/chiba/chiba-shi-mihama-ku'),
  ('athome','city','市川市',      '千葉県','市川市',      NULL,'ichikawa-city',       '/chiba/ichikawa-city'),
  ('athome','city','船橋市',      '千葉県','船橋市',      NULL,'funabashi-city',      '/chiba/funabashi-city'),
  ('athome','city','松戸市',      '千葉県','松戸市',      NULL,'matsudo-city',        '/chiba/matsudo-city'),
  ('athome','city','柏市',        '千葉県','柏市',        NULL,'kashiwa-city',        '/chiba/kashiwa-city'),
  ('athome','city','浦安市',      '千葉県','浦安市',      NULL,'urayasu-city',        '/chiba/urayasu-city'),
  ('athome','city','習志野市',    '千葉県','習志野市',    NULL,'narashino-city',      '/chiba/narashino-city'),
  ('athome','city','大阪市北区',    '大阪府','大阪市北区',    NULL,'osaka-shi-kita-ku',     '/osaka/osaka-shi-kita-ku'),
  ('athome','city','大阪市中央区',  '大阪府','大阪市中央区',  NULL,'osaka-shi-chuo-ku',     '/osaka/osaka-shi-chuo-ku'),
  ('athome','city','大阪市西区',    '大阪府','大阪市西区',    NULL,'osaka-shi-nishi-ku',    '/osaka/osaka-shi-nishi-ku'),
  ('athome','city','大阪市天王寺区','大阪府','大阪市天王寺区',NULL,'osaka-shi-tennoji-ku',  '/osaka/osaka-shi-tennoji-ku'),
  ('athome','city','大阪市浪速区',  '大阪府','大阪市浪速区',  NULL,'osaka-shi-naniwa-ku',   '/osaka/osaka-shi-naniwa-ku'),
  ('athome','city','大阪市淀川区',  '大阪府','大阪市淀川区',  NULL,'osaka-shi-yodogawa-ku', '/osaka/osaka-shi-yodogawa-ku'),
  ('athome','city','大阪市城東区',  '大阪府','大阪市城東区',  NULL,'osaka-shi-joto-ku',     '/osaka/osaka-shi-joto-ku'),
  ('athome','city','豊中市',        '大阪府','豊中市',        NULL,'toyonaka-city',          '/osaka/toyonaka-city'),
  ('athome','city','吹田市',        '大阪府','吹田市',        NULL,'suita-city',             '/osaka/suita-city'),
  ('athome','city','堺市堺区',      '大阪府','堺市堺区',      NULL,'sakai-shi-sakai-ku',     '/osaka/sakai-shi-sakai-ku'),
  ('athome','city','名古屋市千種区','愛知県','名古屋市千種区',NULL,'nagoya-shi-chikusa-ku',  '/aichi/nagoya-shi-chikusa-ku'),
  ('athome','city','名古屋市東区',  '愛知県','名古屋市東区',  NULL,'nagoya-shi-higashi-ku',  '/aichi/nagoya-shi-higashi-ku'),
  ('athome','city','名古屋市中区',  '愛知県','名古屋市中区',  NULL,'nagoya-shi-naka-ku',     '/aichi/nagoya-shi-naka-ku'),
  ('athome','city','名古屋市中村区','愛知県','名古屋市中村区',NULL,'nagoya-shi-nakamura-ku', '/aichi/nagoya-shi-nakamura-ku'),
  ('athome','city','名古屋市昭和区','愛知県','名古屋市昭和区',NULL,'nagoya-shi-showa-ku',    '/aichi/nagoya-shi-showa-ku'),
  ('athome','city','名古屋市瑞穂区','愛知県','名古屋市瑞穂区',NULL,'nagoya-shi-mizuho-ku',   '/aichi/nagoya-shi-mizuho-ku'),
  ('athome','city','名古屋市緑区',  '愛知県','名古屋市緑区',  NULL,'nagoya-shi-midori-ku',   '/aichi/nagoya-shi-midori-ku'),
  ('athome','city','名古屋市名東区','愛知県','名古屋市名東区',NULL,'nagoya-shi-meito-ku',    '/aichi/nagoya-shi-meito-ku'),
  ('athome','city','名古屋市天白区','愛知県','名古屋市天白区',NULL,'nagoya-shi-tenpaku-ku',  '/aichi/nagoya-shi-tenpaku-ku')
ON CONFLICT (portal, area_type, display_name) DO NOTHING;

-- ============================================================
-- 15. 主要駅 × AtHome（神奈川）
-- ============================================================
INSERT INTO portal_area_mappings
  (portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param)
VALUES
  ('athome','station','武蔵小杉',    '神奈川県','川崎市中原区','武蔵小杉',    'musashikosugi-station',   '/kanagawa/musashikosugi-station'),
  ('athome','station','武蔵中原',    '神奈川県','川崎市中原区','武蔵中原',    'musashinakahara-station', '/kanagawa/musashinakahara-station'),
  ('athome','station','武蔵新城',    '神奈川県','川崎市高津区','武蔵新城',    'musashinakajo-station',   '/kanagawa/musashinakajo-station'),
  ('athome','station','横浜',        '神奈川県','横浜市西区',  '横浜',        'yokohama-station',        '/kanagawa/yokohama-station'),
  ('athome','station','新横浜',      '神奈川県','横浜市港北区','新横浜',      'shinyokohama-station',    '/kanagawa/shinyokohama-station'),
  ('athome','station','みなとみらい','神奈川県','横浜市西区',  'みなとみらい','minatomirai-station',     '/kanagawa/minatomirai-station'),
  ('athome','station','桜木町',      '神奈川県','横浜市中区',  '桜木町',      'sakuragicho-station',     '/kanagawa/sakuragicho-station'),
  ('athome','station','関内',        '神奈川県','横浜市中区',  '関内',        'kannai-station',          '/kanagawa/kannai-station'),
  ('athome','station','藤沢',        '神奈川県','藤沢市',      '藤沢',        'fujisawa-station',        '/kanagawa/fujisawa-station'),
  ('athome','station','茅ヶ崎',      '神奈川県','茅ヶ崎市',    '茅ヶ崎',      'chigasaki-station',       '/kanagawa/chigasaki-station'),
  ('athome','station','鎌倉',        '神奈川県','鎌倉市',      '鎌倉',        'kamakura-station',        '/kanagawa/kamakura-station'),
  ('athome','station','大船',        '神奈川県','鎌倉市',      '大船',        'ofuna-station',           '/kanagawa/ofuna-station'),
  ('athome','station','海老名',      '神奈川県','海老名市',    '海老名',      'ebina-station',           '/kanagawa/ebina-station'),
  ('athome','station','本厚木',      '神奈川県','厚木市',      '本厚木',      'honatsugi-station',       '/kanagawa/honatsugi-station'),
  ('athome','station','川崎',        '神奈川県','川崎市川崎区','川崎',        'kawasaki-station',        '/kanagawa/kawasaki-station')
ON CONFLICT (portal, area_type, display_name) DO NOTHING;

-- ============================================================
-- 16. 主要駅 × AtHome（東京）
-- ============================================================
INSERT INTO portal_area_mappings
  (portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param)
VALUES
  ('athome','station','渋谷',        '東京都','渋谷区',  '渋谷',        'shibuya-station',          '/tokyo/shibuya-station'),
  ('athome','station','新宿',        '東京都','新宿区',  '新宿',        'shinjuku-station',         '/tokyo/shinjuku-station'),
  ('athome','station','池袋',        '東京都','豊島区',  '池袋',        'ikebukuro-station',        '/tokyo/ikebukuro-station'),
  ('athome','station','品川',        '東京都','品川区',  '品川',        'shinagawa-station',        '/tokyo/shinagawa-station'),
  ('athome','station','目黒',        '東京都','目黒区',  '目黒',        'meguro-station',           '/tokyo/meguro-station'),
  ('athome','station','恵比寿',      '東京都','渋谷区',  '恵比寿',      'ebisu-station',            '/tokyo/ebisu-station'),
  ('athome','station','代官山',      '東京都','渋谷区',  '代官山',      'daikanyama-station',       '/tokyo/daikanyama-station'),
  ('athome','station','中目黒',      '東京都','目黒区',  '中目黒',      'nakameguro-station',       '/tokyo/nakameguro-station'),
  ('athome','station','自由が丘',    '東京都','目黒区',  '自由が丘',    'jiyugaoka-station',        '/tokyo/jiyugaoka-station'),
  ('athome','station','二子玉川',    '東京都','世田谷区','二子玉川',    'futakotamagawa-station',   '/tokyo/futakotamagawa-station'),
  ('athome','station','三軒茶屋',    '東京都','世田谷区','三軒茶屋',    'sangenjaya-station',       '/tokyo/sangenjaya-station'),
  ('athome','station','下北沢',      '東京都','世田谷区','下北沢',      'shimokitazawa-station',    '/tokyo/shimokitazawa-station'),
  ('athome','station','五反田',      '東京都','品川区',  '五反田',      'gotanda-station',          '/tokyo/gotanda-station'),
  ('athome','station','大崎',        '東京都','品川区',  '大崎',        'osaki-station',            '/tokyo/osaki-station'),
  ('athome','station','天王洲アイル','東京都','品川区',  '天王洲アイル','tennozu-isle-station',     '/tokyo/tennozu-isle-station'),
  ('athome','station','麻布十番',    '東京都','港区',    '麻布十番',    'azabujuban-station',       '/tokyo/azabujuban-station'),
  ('athome','station','広尾',        '東京都','港区',    '広尾',        'hiroo-station',            '/tokyo/hiroo-station'),
  ('athome','station','白金台',      '東京都','港区',    '白金台',      'shirokanedai-station',     '/tokyo/shirokanedai-station'),
  ('athome','station','白金高輪',    '東京都','港区',    '白金高輪',    'shirokanetakanawa-station','/tokyo/shirokanetakanawa-station'),
  ('athome','station','六本木',      '東京都','港区',    '六本木',      'roppongi-station',         '/tokyo/roppongi-station'),
  ('athome','station','表参道',      '東京都','港区',    '表参道',      'omotesando-station',       '/tokyo/omotesando-station'),
  ('athome','station','青山一丁目',  '東京都','港区',    '青山一丁目',  'aoyama-itchome-station',   '/tokyo/aoyama-itchome-station'),
  ('athome','station','赤坂',        '東京都','港区',    '赤坂',        'akasaka-station',          '/tokyo/akasaka-station'),
  ('athome','station','溜池山王',    '東京都','千代田区','溜池山王',    'tameikesanno-station',     '/tokyo/tameikesanno-station'),
  ('athome','station','永田町',      '東京都','千代田区','永田町',      'nagatacho-station',        '/tokyo/nagatacho-station'),
  ('athome','station','四ツ谷',      '東京都','新宿区',  '四ツ谷',      'yotsuya-station',          '/tokyo/yotsuya-station'),
  ('athome','station','市ヶ谷',      '東京都','新宿区',  '市ヶ谷',      'ichigaya-station',         '/tokyo/ichigaya-station'),
  ('athome','station','飯田橋',      '東京都','文京区',  '飯田橋',      'iidabashi-station',        '/tokyo/iidabashi-station'),
  ('athome','station','後楽園',      '東京都','文京区',  '後楽園',      'korakuen-station',         '/tokyo/korakuen-station'),
  ('athome','station','上野',        '東京都','台東区',  '上野',        'ueno-station',             '/tokyo/ueno-station'),
  ('athome','station','秋葉原',      '東京都','千代田区','秋葉原',      'akihabara-station',        '/tokyo/akihabara-station'),
  ('athome','station','神田',        '東京都','千代田区','神田',        'kanda-station',            '/tokyo/kanda-station'),
  ('athome','station','東京',        '東京都','千代田区','東京',        'tokyo-station',            '/tokyo/tokyo-station'),
  ('athome','station','有楽町',      '東京都','千代田区','有楽町',      'yurakucho-station',        '/tokyo/yurakucho-station'),
  ('athome','station','新橋',        '東京都','港区',    '新橋',        'shimbashi-station',        '/tokyo/shimbashi-station'),
  ('athome','station','浜松町',      '東京都','港区',    '浜松町',      'hamamatsucho-station',     '/tokyo/hamamatsucho-station'),
  ('athome','station','田町',        '東京都','港区',    '田町',        'tamachi-station',          '/tokyo/tamachi-station'),
  ('athome','station','高輪ゲートウェイ','東京都','港区','高輪ゲートウェイ','takanawa-gateway-station','/tokyo/takanawa-gateway-station'),
  ('athome','station','吉祥寺',      '東京都','武蔵野市','吉祥寺',      'kichijoji-station',        '/tokyo/kichijoji-station'),
  ('athome','station','三鷹',        '東京都','三鷹市',  '三鷹',        'mitaka-station',           '/tokyo/mitaka-station'),
  ('athome','station','荻窪',        '東京都','杉並区',  '荻窪',        'ogikubo-station',          '/tokyo/ogikubo-station'),
  ('athome','station','阿佐ヶ谷',    '東京都','杉並区',  '阿佐ヶ谷',    'asagaya-station',          '/tokyo/asagaya-station'),
  ('athome','station','高円寺',      '東京都','杉並区',  '高円寺',      'koenji-station',           '/tokyo/koenji-station'),
  ('athome','station','中野',        '東京都','中野区',  '中野',        'nakano-station',           '/tokyo/nakano-station'),
  ('athome','station','門前仲町',    '東京都','江東区',  '門前仲町',    'monzen-nakacho-station',   '/tokyo/monzen-nakacho-station'),
  ('athome','station','清澄白河',    '東京都','江東区',  '清澄白河',    'kiyosumishirakawa-station','/tokyo/kiyosumishirakawa-station'),
  ('athome','station','錦糸町',      '東京都','墨田区',  '錦糸町',      'kinshicho-station',        '/tokyo/kinshicho-station'),
  ('athome','station','押上',        '東京都','墨田区',  '押上',        'oshiage-station',          '/tokyo/oshiage-station'),
  ('athome','station','北千住',      '東京都','足立区',  '北千住',      'kitasenju-station',        '/tokyo/kitasenju-station'),
  ('athome','station','蒲田',        '東京都','大田区',  '蒲田',        'kamata-station',           '/tokyo/kamata-station'),
  ('athome','station','大森',        '東京都','大田区',  '大森',        'omori-station',            '/tokyo/omori-station')
ON CONFLICT (portal, area_type, display_name) DO NOTHING;

-- ============================================================
-- 17. 主要駅 × AtHome（埼玉・千葉・大阪・兵庫）
-- ============================================================
INSERT INTO portal_area_mappings
  (portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param)
VALUES
  ('athome','station','大宮',      '埼玉県','さいたま市大宮区','大宮',      'omiya-station',      '/saitama/omiya-station'),
  ('athome','station','浦和',      '埼玉県','さいたま市浦和区','浦和',      'urawa-station',      '/saitama/urawa-station'),
  ('athome','station','川口',      '埼玉県','川口市',          '川口',      'kawaguchi-station',  '/saitama/kawaguchi-station'),
  ('athome','station','川越',      '埼玉県','川越市',          '川越',      'kawagoe-station',    '/saitama/kawagoe-station'),
  ('athome','station','所沢',      '埼玉県','所沢市',          '所沢',      'tokorozawa-station', '/saitama/tokorozawa-station'),
  ('athome','station','千葉',      '千葉県','千葉市中央区',    '千葉',      'chiba-station',      '/chiba/chiba-station'),
  ('athome','station','市川',      '千葉県','市川市',          '市川',      'ichikawa-station',   '/chiba/ichikawa-station'),
  ('athome','station','船橋',      '千葉県','船橋市',          '船橋',      'funabashi-station',  '/chiba/funabashi-station'),
  ('athome','station','松戸',      '千葉県','松戸市',          '松戸',      'matsudo-station',    '/chiba/matsudo-station'),
  ('athome','station','柏',        '千葉県','柏市',            '柏',        'kashiwa-station',    '/chiba/kashiwa-station'),
  ('athome','station','浦安',      '千葉県','浦安市',          '浦安',      'urayasu-station',    '/chiba/urayasu-station'),
  ('athome','station','大阪(梅田)','大阪府','大阪市北区',      '大阪(梅田)','osaka-station',      '/osaka/osaka-station'),
  ('athome','station','梅田',      '大阪府','大阪市北区',      '梅田',      'umeda-station',      '/osaka/umeda-station'),
  ('athome','station','難波',      '大阪府','大阪市浪速区',    '難波',      'namba-station',      '/osaka/namba-station'),
  ('athome','station','天王寺',    '大阪府','大阪市天王寺区',  '天王寺',    'tennoji-station',    '/osaka/tennoji-station'),
  ('athome','station','心斎橋',    '大阪府','大阪市中央区',    '心斎橋',    'shinsaibashi-station','/osaka/shinsaibashi-station'),
  ('athome','station','三ノ宮',    '兵庫県','神戸市中央区',    '三ノ宮',    'sannomiya-station',  '/hyogo/sannomiya-station')
ON CONFLICT (portal, area_type, display_name) DO NOTHING;

-- ============================================================
-- 18. 東京23区 × HOME'S
-- ============================================================
INSERT INTO portal_area_mappings
  (portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param)
VALUES
  ('homes','city','千代田区','東京都','千代田区',NULL,'chiyoda-city',  '/tokyo/chiyoda-city'),
  ('homes','city','中央区',  '東京都','中央区',  NULL,'chuo-city',     '/tokyo/chuo-city'),
  ('homes','city','港区',    '東京都','港区',    NULL,'minato-city',   '/tokyo/minato-city'),
  ('homes','city','新宿区',  '東京都','新宿区',  NULL,'shinjuku-city', '/tokyo/shinjuku-city'),
  ('homes','city','文京区',  '東京都','文京区',  NULL,'bunkyo-city',   '/tokyo/bunkyo-city'),
  ('homes','city','台東区',  '東京都','台東区',  NULL,'taito-city',    '/tokyo/taito-city'),
  ('homes','city','墨田区',  '東京都','墨田区',  NULL,'sumida-city',   '/tokyo/sumida-city'),
  ('homes','city','江東区',  '東京都','江東区',  NULL,'koto-city',     '/tokyo/koto-city'),
  ('homes','city','品川区',  '東京都','品川区',  NULL,'shinagawa-city','/tokyo/shinagawa-city'),
  ('homes','city','目黒区',  '東京都','目黒区',  NULL,'meguro-city',   '/tokyo/meguro-city'),
  ('homes','city','大田区',  '東京都','大田区',  NULL,'ota-city',      '/tokyo/ota-city'),
  ('homes','city','世田谷区','東京都','世田谷区',NULL,'setagaya-city', '/tokyo/setagaya-city'),
  ('homes','city','渋谷区',  '東京都','渋谷区',  NULL,'shibuya-city',  '/tokyo/shibuya-city'),
  ('homes','city','中野区',  '東京都','中野区',  NULL,'nakano-city',   '/tokyo/nakano-city'),
  ('homes','city','杉並区',  '東京都','杉並区',  NULL,'suginami-city', '/tokyo/suginami-city'),
  ('homes','city','豊島区',  '東京都','豊島区',  NULL,'toshima-city',  '/tokyo/toshima-city'),
  ('homes','city','北区',    '東京都','北区',    NULL,'kita-city',     '/tokyo/kita-city'),
  ('homes','city','荒川区',  '東京都','荒川区',  NULL,'arakawa-city',  '/tokyo/arakawa-city'),
  ('homes','city','板橋区',  '東京都','板橋区',  NULL,'itabashi-city', '/tokyo/itabashi-city'),
  ('homes','city','練馬区',  '東京都','練馬区',  NULL,'nerima-city',   '/tokyo/nerima-city'),
  ('homes','city','足立区',  '東京都','足立区',  NULL,'adachi-city',   '/tokyo/adachi-city'),
  ('homes','city','葛飾区',  '東京都','葛飾区',  NULL,'katsushika-city','/tokyo/katsushika-city'),
  ('homes','city','江戸川区','東京都','江戸川区',NULL,'edogawa-city',  '/tokyo/edogawa-city')
ON CONFLICT (portal, area_type, display_name) DO NOTHING;

-- ============================================================
-- 19. 神奈川・埼玉・千葉・大阪 × HOME'S
-- ============================================================
INSERT INTO portal_area_mappings
  (portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param)
VALUES
  ('homes','city','川崎市中原区',  '神奈川県','川崎市中原区',  NULL,'kawasaki-shi-nakahara-ku','/kanagawa/kawasaki-shi-nakahara-ku'),
  ('homes','city','中原区',        '神奈川県','川崎市中原区',  NULL,'kawasaki-shi-nakahara-ku','/kanagawa/kawasaki-shi-nakahara-ku'),
  ('homes','city','川崎市高津区',  '神奈川県','川崎市高津区',  NULL,'kawasaki-shi-takatsu-ku', '/kanagawa/kawasaki-shi-takatsu-ku'),
  ('homes','city','川崎市多摩区',  '神奈川県','川崎市多摩区',  NULL,'kawasaki-shi-tama-ku',    '/kanagawa/kawasaki-shi-tama-ku'),
  ('homes','city','川崎市宮前区',  '神奈川県','川崎市宮前区',  NULL,'kawasaki-shi-miyamae-ku', '/kanagawa/kawasaki-shi-miyamae-ku'),
  ('homes','city','川崎市麻生区',  '神奈川県','川崎市麻生区',  NULL,'kawasaki-shi-asao-ku',    '/kanagawa/kawasaki-shi-asao-ku'),
  ('homes','city','横浜市青葉区',  '神奈川県','横浜市青葉区',  NULL,'yokohama-shi-aoba-ku',    '/kanagawa/yokohama-shi-aoba-ku'),
  ('homes','city','横浜市港北区',  '神奈川県','横浜市港北区',  NULL,'yokohama-shi-kohoku-ku',  '/kanagawa/yokohama-shi-kohoku-ku'),
  ('homes','city','横浜市都筑区',  '神奈川県','横浜市都筑区',  NULL,'yokohama-shi-tsuzuki-ku', '/kanagawa/yokohama-shi-tsuzuki-ku'),
  ('homes','city','横浜市中区',    '神奈川県','横浜市中区',    NULL,'yokohama-shi-naka-ku',    '/kanagawa/yokohama-shi-naka-ku'),
  ('homes','city','横浜市西区',    '神奈川県','横浜市西区',    NULL,'yokohama-shi-nishi-ku',   '/kanagawa/yokohama-shi-nishi-ku'),
  ('homes','city','鎌倉市',        '神奈川県','鎌倉市',        NULL,'kamakura-city',           '/kanagawa/kamakura-city'),
  ('homes','city','藤沢市',        '神奈川県','藤沢市',        NULL,'fujisawa-city',           '/kanagawa/fujisawa-city'),
  ('homes','city','茅ヶ崎市',      '神奈川県','茅ヶ崎市',      NULL,'chigasaki-city',          '/kanagawa/chigasaki-city'),
  ('homes','city','逗子市',        '神奈川県','逗子市',        NULL,'zushi-city',              '/kanagawa/zushi-city'),
  ('homes','city','さいたま市大宮区','埼玉県','さいたま市大宮区',NULL,'saitama-shi-omiya-ku',  '/saitama/saitama-shi-omiya-ku'),
  ('homes','city','さいたま市浦和区','埼玉県','さいたま市浦和区',NULL,'saitama-shi-urawa-ku',  '/saitama/saitama-shi-urawa-ku'),
  ('homes','city','川口市',          '埼玉県','川口市',          NULL,'kawaguchi-city',         '/saitama/kawaguchi-city'),
  ('homes','city','所沢市',          '埼玉県','所沢市',          NULL,'tokorozawa-city',        '/saitama/tokorozawa-city'),
  ('homes','city','越谷市',          '埼玉県','越谷市',          NULL,'koshigaya-city',         '/saitama/koshigaya-city'),
  ('homes','city','市川市',  '千葉県','市川市',  NULL,'ichikawa-city', '/chiba/ichikawa-city'),
  ('homes','city','船橋市',  '千葉県','船橋市',  NULL,'funabashi-city','/chiba/funabashi-city'),
  ('homes','city','松戸市',  '千葉県','松戸市',  NULL,'matsudo-city',  '/chiba/matsudo-city'),
  ('homes','city','柏市',    '千葉県','柏市',    NULL,'kashiwa-city',  '/chiba/kashiwa-city'),
  ('homes','city','浦安市',  '千葉県','浦安市',  NULL,'urayasu-city',  '/chiba/urayasu-city'),
  ('homes','city','大阪市北区',    '大阪府','大阪市北区',    NULL,'osaka-shi-kita-ku',   '/osaka/osaka-shi-kita-ku'),
  ('homes','city','大阪市中央区',  '大阪府','大阪市中央区',  NULL,'osaka-shi-chuo-ku',   '/osaka/osaka-shi-chuo-ku'),
  ('homes','city','大阪市西区',    '大阪府','大阪市西区',    NULL,'osaka-shi-nishi-ku',  '/osaka/osaka-shi-nishi-ku'),
  ('homes','city','大阪市天王寺区','大阪府','大阪市天王寺区',NULL,'osaka-shi-tennoji-ku','/osaka/osaka-shi-tennoji-ku'),
  ('homes','city','豊中市',        '大阪府','豊中市',        NULL,'toyonaka-city',       '/osaka/toyonaka-city'),
  ('homes','city','吹田市',        '大阪府','吹田市',        NULL,'suita-city',          '/osaka/suita-city')
ON CONFLICT (portal, area_type, display_name) DO NOTHING;

-- ============================================================
-- 20. 主要駅 × HOME'S
-- ============================================================
INSERT INTO portal_area_mappings
  (portal, area_type, display_name, prefecture, city, station_name, portal_code, portal_url_param)
VALUES
  ('homes','station','武蔵小杉',  '神奈川県','川崎市中原区','武蔵小杉',  'musashikosugi-station',  '/kanagawa/musashikosugi-station'),
  ('homes','station','武蔵中原',  '神奈川県','川崎市中原区','武蔵中原',  'musashinakahara-station','/kanagawa/musashinakahara-station'),
  ('homes','station','横浜',      '神奈川県','横浜市西区',  '横浜',      'yokohama-station',       '/kanagawa/yokohama-station'),
  ('homes','station','新横浜',    '神奈川県','横浜市港北区','新横浜',    'shinyokohama-station',   '/kanagawa/shinyokohama-station'),
  ('homes','station','藤沢',      '神奈川県','藤沢市',      '藤沢',      'fujisawa-station',       '/kanagawa/fujisawa-station'),
  ('homes','station','鎌倉',      '神奈川県','鎌倉市',      '鎌倉',      'kamakura-station',       '/kanagawa/kamakura-station'),
  ('homes','station','川崎',      '神奈川県','川崎市川崎区','川崎',      'kawasaki-station',       '/kanagawa/kawasaki-station'),
  ('homes','station','渋谷',      '東京都','渋谷区',  '渋谷',      'shibuya-station',        '/tokyo/shibuya-station'),
  ('homes','station','新宿',      '東京都','新宿区',  '新宿',      'shinjuku-station',       '/tokyo/shinjuku-station'),
  ('homes','station','池袋',      '東京都','豊島区',  '池袋',      'ikebukuro-station',      '/tokyo/ikebukuro-station'),
  ('homes','station','品川',      '東京都','品川区',  '品川',      'shinagawa-station',      '/tokyo/shinagawa-station'),
  ('homes','station','目黒',      '東京都','目黒区',  '目黒',      'meguro-station',         '/tokyo/meguro-station'),
  ('homes','station','恵比寿',    '東京都','渋谷区',  '恵比寿',    'ebisu-station',          '/tokyo/ebisu-station'),
  ('homes','station','中目黒',    '東京都','目黒区',  '中目黒',    'nakameguro-station',     '/tokyo/nakameguro-station'),
  ('homes','station','自由が丘',  '東京都','目黒区',  '自由が丘',  'jiyugaoka-station',      '/tokyo/jiyugaoka-station'),
  ('homes','station','二子玉川',  '東京都','世田谷区','二子玉川',  'futakotamagawa-station', '/tokyo/futakotamagawa-station'),
  ('homes','station','三軒茶屋',  '東京都','世田谷区','三軒茶屋',  'sangenjaya-station',     '/tokyo/sangenjaya-station'),
  ('homes','station','五反田',    '東京都','品川区',  '五反田',    'gotanda-station',        '/tokyo/gotanda-station'),
  ('homes','station','麻布十番',  '東京都','港区',    '麻布十番',  'azabujuban-station',     '/tokyo/azabujuban-station'),
  ('homes','station','広尾',      '東京都','港区',    '広尾',      'hiroo-station',          '/tokyo/hiroo-station'),
  ('homes','station','白金台',    '東京都','港区',    '白金台',    'shirokanedai-station',   '/tokyo/shirokanedai-station'),
  ('homes','station','白金高輪',  '東京都','港区',    '白金高輪',  'shirokanetakanawa-station','/tokyo/shirokanetakanawa-station'),
  ('homes','station','六本木',    '東京都','港区',    '六本木',    'roppongi-station',       '/tokyo/roppongi-station'),
  ('homes','station','表参道',    '東京都','港区',    '表参道',    'omotesando-station',     '/tokyo/omotesando-station'),
  ('homes','station','新橋',      '東京都','港区',    '新橋',      'shimbashi-station',      '/tokyo/shimbashi-station'),
  ('homes','station','田町',      '東京都','港区',    '田町',      'tamachi-station',        '/tokyo/tamachi-station'),
  ('homes','station','吉祥寺',    '東京都','武蔵野市','吉祥寺',    'kichijoji-station',      '/tokyo/kichijoji-station'),
  ('homes','station','東京',      '東京都','千代田区','東京',      'tokyo-station',          '/tokyo/tokyo-station'),
  ('homes','station','上野',      '東京都','台東区',  '上野',      'ueno-station',           '/tokyo/ueno-station'),
  ('homes','station','秋葉原',    '東京都','千代田区','秋葉原',    'akihabara-station',      '/tokyo/akihabara-station'),
  ('homes','station','錦糸町',    '東京都','墨田区',  '錦糸町',    'kinshicho-station',      '/tokyo/kinshicho-station'),
  ('homes','station','北千住',    '東京都','足立区',  '北千住',    'kitasenju-station',      '/tokyo/kitasenju-station'),
  ('homes','station','大宮',      '埼玉県','さいたま市大宮区','大宮','omiya-station',         '/saitama/omiya-station'),
  ('homes','station','浦和',      '埼玉県','さいたま市浦和区','浦和','urawa-station',         '/saitama/urawa-station'),
  ('homes','station','千葉',      '千葉県','千葉市中央区',   '千葉','chiba-station',          '/chiba/chiba-station'),
  ('homes','station','浦安',      '千葉県','浦安市',         '浦安','urayasu-station',        '/chiba/urayasu-station'),
  ('homes','station','難波',      '大阪府','大阪市浪速区',   '難波','namba-station',          '/osaka/namba-station'),
  ('homes','station','天王寺',    '大阪府','大阪市天王寺区', '天王寺','tennoji-station',      '/osaka/tennoji-station')
ON CONFLICT (portal, area_type, display_name) DO NOTHING;
