-- ============================================================
-- seed_area_masters_tokyo_kanagawa_v1.sql
-- 東京都・神奈川県 エリアマスター初期データ
--
-- 前提: migration_area_master_v1.sql 実行済み
-- 方針: ON CONFLICT DO UPDATE で冪等実行可能
-- ============================================================

-- ============================================================
-- HELPER: area_masters → area_aliases → portal_area_params を
--         1ブロックで INSERT する共通パターン
-- ============================================================

-- ============================================================
-- 1. 東京都 23区（ward）
-- ============================================================

INSERT INTO area_masters (area_type, display_name, yomi, prefecture, city)
VALUES
  ('ward', '千代田区',  'ちよだく',    '東京都', '千代田区'),
  ('ward', '中央区',    'ちゅうおうく','東京都', '中央区'),
  ('ward', '港区',      'みなとく',    '東京都', '港区'),
  ('ward', '新宿区',    'しんじゅくく','東京都', '新宿区'),
  ('ward', '文京区',    'ぶんきょうく','東京都', '文京区'),
  ('ward', '台東区',    'たいとうく',  '東京都', '台東区'),
  ('ward', '墨田区',    'すみだく',    '東京都', '墨田区'),
  ('ward', '江東区',    'こうとうく',  '東京都', '江東区'),
  ('ward', '品川区',    'しながわく',  '東京都', '品川区'),
  ('ward', '目黒区',    'めぐろく',    '東京都', '目黒区'),
  ('ward', '大田区',    'おおたく',    '東京都', '大田区'),
  ('ward', '世田谷区',  'せたがやく',  '東京都', '世田谷区'),
  ('ward', '渋谷区',    'しぶやく',    '東京都', '渋谷区'),
  ('ward', '中野区',    'なかのく',    '東京都', '中野区'),
  ('ward', '杉並区',    'すぎなみく',  '東京都', '杉並区'),
  ('ward', '豊島区',    'としまく',    '東京都', '豊島区'),
  ('ward', '北区',      'きたく',      '東京都', '北区'),
  ('ward', '荒川区',    'あらかわく',  '東京都', '荒川区'),
  ('ward', '板橋区',    'いたばしく',  '東京都', '板橋区'),
  ('ward', '練馬区',    'ねりまく',    '東京都', '練馬区'),
  ('ward', '足立区',    'あだちく',    '東京都', '足立区'),
  ('ward', '葛飾区',    'かつしかく',  '東京都', '葛飾区'),
  ('ward', '江戸川区',  'えどがわく',  '東京都', '江戸川区')
ON CONFLICT (area_type, display_name, COALESCE(prefecture, '')) DO UPDATE
  SET yomi = EXCLUDED.yomi, city = EXCLUDED.city, updated_at = now();

-- ============================================================
-- 2. 東京都 23区 portal_area_params (SUUMO query)
--    JIS市区町村コード: 13101〜13123
-- ============================================================

INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param)
SELECT m.id, 'suumo', 'query', v.code, 'ta=13&sc=' || v.code
FROM area_masters m
JOIN (VALUES
  ('千代田区',  '13101'),
  ('中央区',    '13102'),
  ('港区',      '13103'),
  ('新宿区',    '13104'),
  ('文京区',    '13105'),
  ('台東区',    '13106'),
  ('墨田区',    '13107'),
  ('江東区',    '13108'),
  ('品川区',    '13109'),
  ('目黒区',    '13110'),
  ('大田区',    '13111'),
  ('世田谷区',  '13112'),
  ('渋谷区',    '13113'),
  ('中野区',    '13114'),
  ('杉並区',    '13115'),
  ('豊島区',    '13116'),
  ('北区',      '13117'),
  ('荒川区',    '13118'),
  ('板橋区',    '13119'),
  ('練馬区',    '13120'),
  ('足立区',    '13121'),
  ('葛飾区',    '13122'),
  ('江戸川区',  '13123')
) AS v(name, code) ON m.display_name = v.name AND m.area_type = 'ward' AND m.prefecture = '東京都'
ON CONFLICT (area_id, portal) DO UPDATE
  SET portal_code = EXCLUDED.portal_code,
      portal_url_param = EXCLUDED.portal_url_param,
      updated_at = now();

-- ============================================================
-- 3. 神奈川県 主要区・市（ward / city）
-- ============================================================

INSERT INTO area_masters (area_type, display_name, yomi, prefecture, city, ward)
VALUES
  -- 横浜市各区
  ('ward', '横浜市鶴見区',    'よこはましつるみく',     '神奈川県', '横浜市', '鶴見区'),
  ('ward', '横浜市神奈川区',  'よこはましかながわく',   '神奈川県', '横浜市', '神奈川区'),
  ('ward', '横浜市西区',      'よこはましにしく',       '神奈川県', '横浜市', '西区'),
  ('ward', '横浜市中区',      'よこはましなかく',       '神奈川県', '横浜市', '中区'),
  ('ward', '横浜市南区',      'よこはましみなみく',     '神奈川県', '横浜市', '南区'),
  ('ward', '横浜市港南区',    'よこはましこうなんく',   '神奈川県', '横浜市', '港南区'),
  ('ward', '横浜市保土ケ谷区','よこはましほどがやく',   '神奈川県', '横浜市', '保土ケ谷区'),
  ('ward', '横浜市旭区',      'よこはましあさひく',     '神奈川県', '横浜市', '旭区'),
  ('ward', '横浜市磯子区',    'よこはましいそごく',     '神奈川県', '横浜市', '磯子区'),
  ('ward', '横浜市金沢区',    'よこはましかなざわく',   '神奈川県', '横浜市', '金沢区'),
  ('ward', '横浜市港北区',    'よこはましこうほくく',   '神奈川県', '横浜市', '港北区'),
  ('ward', '横浜市緑区',      'よこはましみどりく',     '神奈川県', '横浜市', '緑区'),
  ('ward', '横浜市青葉区',    'よこはましあおばく',     '神奈川県', '横浜市', '青葉区'),
  ('ward', '横浜市都筑区',    'よこはましつづきく',     '神奈川県', '横浜市', '都筑区'),
  ('ward', '横浜市戸塚区',    'よこはましとつかく',     '神奈川県', '横浜市', '戸塚区'),
  ('ward', '横浜市栄区',      'よこはましさかえく',     '神奈川県', '横浜市', '栄区'),
  ('ward', '横浜市泉区',      'よこはましいずみく',     '神奈川県', '横浜市', '泉区'),
  ('ward', '横浜市瀬谷区',    'よこはましせやく',       '神奈川県', '横浜市', '瀬谷区'),
  -- 川崎市各区
  ('ward', '川崎市川崎区',    'かわさきしかわさきく',   '神奈川県', '川崎市', '川崎区'),
  ('ward', '川崎市幸区',      'かわさきしさいわいく',   '神奈川県', '川崎市', '幸区'),
  ('ward', '川崎市中原区',    'かわさきしなかはらく',   '神奈川県', '川崎市', '中原区'),
  ('ward', '川崎市高津区',    'かわさきしたかつく',     '神奈川県', '川崎市', '高津区'),
  ('ward', '川崎市宮前区',    'かわさきしみやまえく',   '神奈川県', '川崎市', '宮前区'),
  ('ward', '川崎市多摩区',    'かわさきしたまく',       '神奈川県', '川崎市', '多摩区'),
  ('ward', '川崎市麻生区',    'かわさきしあさおく',     '神奈川県', '川崎市', '麻生区'),
  -- 相模原市各区
  ('ward', '相模原市緑区',    'さがみはらしみどりく',   '神奈川県', '相模原市', '緑区'),
  ('ward', '相模原市中央区',  'さがみはらしちゅうおうく','神奈川県', '相模原市', '中央区'),
  ('ward', '相模原市南区',    'さがみはらしみなみく',   '神奈川県', '相模原市', '南区')
ON CONFLICT (area_type, display_name, COALESCE(prefecture, '')) DO UPDATE
  SET yomi = EXCLUDED.yomi, ward = EXCLUDED.ward, updated_at = now();

-- 神奈川県 市（city）
INSERT INTO area_masters (area_type, display_name, yomi, prefecture, city)
VALUES
  ('city', '横浜市',    'よこはまし',   '神奈川県', '横浜市'),
  ('city', '川崎市',    'かわさきし',   '神奈川県', '川崎市'),
  ('city', '相模原市',  'さがみはらし', '神奈川県', '相模原市'),
  ('city', '横須賀市',  'よこすかし',   '神奈川県', '横須賀市'),
  ('city', '平塚市',    'ひらつかし',   '神奈川県', '平塚市'),
  ('city', '鎌倉市',    'かまくらし',   '神奈川県', '鎌倉市'),
  ('city', '藤沢市',    'ふじさわし',   '神奈川県', '藤沢市'),
  ('city', '小田原市',  'おだわらし',   '神奈川県', '小田原市'),
  ('city', '茅ヶ崎市',  'ちがさきし',   '神奈川県', '茅ヶ崎市'),
  ('city', '逗子市',    'ずしし',       '神奈川県', '逗子市'),
  ('city', '三浦市',    'みうらし',     '神奈川県', '三浦市'),
  ('city', '秦野市',    'はだのし',     '神奈川県', '秦野市'),
  ('city', '厚木市',    'あつぎし',     '神奈川県', '厚木市'),
  ('city', '大和市',    'やまとし',     '神奈川県', '大和市'),
  ('city', '伊勢原市',  'いせはらし',   '神奈川県', '伊勢原市'),
  ('city', '海老名市',  'えびなし',     '神奈川県', '海老名市'),
  ('city', '座間市',    'ざまし',       '神奈川県', '座間市'),
  ('city', '南足柄市',  'みなみあしがらし','神奈川県','南足柄市'),
  ('city', '綾瀬市',    'あやせし',     '神奈川県', '綾瀬市')
ON CONFLICT (area_type, display_name, COALESCE(prefecture, '')) DO UPDATE
  SET yomi = EXCLUDED.yomi, updated_at = now();

-- SUUMO 神奈川県 区・市 params
INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param)
SELECT m.id, 'suumo', 'query', v.code, 'ta=14&sc=' || v.code
FROM area_masters m
JOIN (VALUES
  -- 横浜市各区
  ('横浜市鶴見区',    '14101'),
  ('横浜市神奈川区',  '14102'),
  ('横浜市西区',      '14103'),
  ('横浜市中区',      '14104'),
  ('横浜市南区',      '14105'),
  ('横浜市港南区',    '14106'),
  ('横浜市保土ケ谷区','14107'),
  ('横浜市旭区',      '14108'),
  ('横浜市磯子区',    '14109'),
  ('横浜市金沢区',    '14110'),
  ('横浜市港北区',    '14111'),
  ('横浜市緑区',      '14112'),
  ('横浜市青葉区',    '14113'),
  ('横浜市都筑区',    '14114'),
  ('横浜市戸塚区',    '14115'),
  ('横浜市栄区',      '14116'),
  ('横浜市泉区',      '14117'),
  ('横浜市瀬谷区',    '14118'),
  -- 川崎市各区
  ('川崎市川崎区',    '14131'),
  ('川崎市幸区',      '14132'),
  ('川崎市中原区',    '14133'),
  ('川崎市高津区',    '14134'),
  ('川崎市宮前区',    '14135'),
  ('川崎市多摩区',    '14136'),
  ('川崎市麻生区',    '14137'),
  -- 相模原市各区
  ('相模原市緑区',    '14151'),
  ('相模原市中央区',  '14152'),
  ('相模原市南区',    '14153')
) AS v(name, code) ON m.display_name = v.name AND m.area_type = 'ward' AND m.prefecture = '神奈川県'
ON CONFLICT (area_id, portal) DO UPDATE
  SET portal_code = EXCLUDED.portal_code,
      portal_url_param = EXCLUDED.portal_url_param,
      updated_at = now();

INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param)
SELECT m.id, 'suumo', 'query', v.code, 'ta=14&sc=' || v.code
FROM area_masters m
JOIN (VALUES
  ('横浜市',   '14100'),
  ('川崎市',   '14130'),
  ('相模原市', '14150'),
  ('横須賀市', '14201'),
  ('平塚市',   '14203'),
  ('鎌倉市',   '14204'),
  ('藤沢市',   '14205'),
  ('小田原市', '14206'),
  ('茅ヶ崎市', '14207'),
  ('逗子市',   '14208'),
  ('三浦市',   '14210'),
  ('秦野市',   '14211'),
  ('厚木市',   '14212'),
  ('大和市',   '14213'),
  ('伊勢原市', '14214'),
  ('海老名市', '14215'),
  ('座間市',   '14216'),
  ('南足柄市', '14217'),
  ('綾瀬市',   '14218')
) AS v(name, code) ON m.display_name = v.name AND m.area_type = 'city' AND m.prefecture = '神奈川県'
ON CONFLICT (area_id, portal) DO UPDATE
  SET portal_code = EXCLUDED.portal_code,
      portal_url_param = EXCLUDED.portal_url_param,
      updated_at = now();

-- ============================================================
-- 4. 東京都 主要駅（station）
--    ※ 初台駅を必ず含む
-- ============================================================

INSERT INTO area_masters (area_type, display_name, yomi, prefecture, station_name, line_name, station_ward)
VALUES
  -- 渋谷区
  ('station', '初台',      'はつだい',    '東京都', '初台',      '京王新線',     '渋谷区'),
  ('station', '幡ヶ谷',    'はたがや',    '東京都', '幡ヶ谷',    '京王新線',     '渋谷区'),
  ('station', '笹塚',      'ささづか',    '東京都', '笹塚',      '京王線',       '渋谷区'),
  ('station', '渋谷',      'しぶや',      '東京都', '渋谷',      '各線',         '渋谷区'),
  ('station', '代々木上原','よよぎうえはら','東京都','代々木上原','小田急線',     '渋谷区'),
  ('station', '代々木公園','よよぎこうえん','東京都','代々木公園','東京メトロ千代田線','渋谷区'),
  ('station', '神泉',      'かみいずみ',  '東京都', '神泉',      '東急東横線',   '渋谷区'),
  -- 港区
  ('station', '白金高輪',  'しろかねたかなわ','東京都','白金高輪','都営三田線',  '港区'),
  ('station', '白金台',    'しろかねだい','東京都', '白金台',    '都営三田線',   '港区'),
  ('station', '麻布十番',  'あざぶじゅうばん','東京都','麻布十番','都営大江戸線','港区'),
  ('station', '六本木',    'ろっぽんぎ',  '東京都', '六本木',    '都営大江戸線', '港区'),
  ('station', '赤羽橋',    'あかばねばし','東京都', '赤羽橋',    '都営大江戸線', '港区'),
  ('station', '田町',      'たまち',      '東京都', '田町',      'JR山手線',     '港区'),
  ('station', '三田',      'みた',        '東京都', '三田',      '都営三田線',   '港区'),
  ('station', '高輪ゲートウェイ','たかなわゲートウェイ','東京都','高輪ゲートウェイ','JR山手線','港区'),
  ('station', '品川',      'しながわ',    '東京都', '品川',      'JR山手線',     '港区'),
  ('station', '泉岳寺',    'せんがくじ',  '東京都', '泉岳寺',    '都営浅草線',   '港区'),
  ('station', '神谷町',    'かみやちょう','東京都', '神谷町',    '東京メトロ日比谷線','港区'),
  ('station', '六本木一丁目','ろっぽんぎいちょうめ','東京都','六本木一丁目','東京メトロ南北線','港区'),
  ('station', '溜池山王',  'ためいけさんのう','東京都','溜池山王','東京メトロ銀座線','港区'),
  -- 新宿区
  ('station', '新宿',      'しんじゅく',  '東京都', '新宿',      '各線',         '新宿区'),
  ('station', '新宿三丁目','しんじゅくさんちょうめ','東京都','新宿三丁目','東京メトロ丸ノ内線','新宿区'),
  ('station', '若松河田',  'わかまつかわだ','東京都','若松河田',  '都営大江戸線', '新宿区'),
  ('station', '牛込神楽坂','うしごめかぐらざか','東京都','牛込神楽坂','都営大江戸線','新宿区'),
  ('station', '市ヶ谷',    'いちがや',    '東京都', '市ヶ谷',    '各線',         '新宿区'),
  -- 千代田区
  ('station', '永田町',    'ながたちょう','東京都', '永田町',    '東京メトロ半蔵門線','千代田区'),
  ('station', '霞ヶ関',    'かすみがせき','東京都', '霞ヶ関',    '東京メトロ丸ノ内線','千代田区'),
  ('station', '有楽町',    'ゆうらくちょう','東京都','有楽町',   'JR山手線',     '千代田区'),
  ('station', '東京',      'とうきょう',  '東京都', '東京',      'JR各線',       '千代田区'),
  ('station', '二重橋前',  'にじゅうばしまえ','東京都','二重橋前','東京メトロ千代田線','千代田区'),
  -- 中央区
  ('station', '銀座',      'ぎんざ',      '東京都', '銀座',      '東京メトロ銀座線','中央区'),
  ('station', '築地',      'つきじ',      '東京都', '築地',      '東京メトロ日比谷線','中央区'),
  ('station', '月島',      'つきしま',    '東京都', '月島',      '都営大江戸線', '中央区'),
  ('station', '勝どき',    'かちどき',    '東京都', '勝どき',    '都営大江戸線', '中央区'),
  -- 目黒区
  ('station', '目黒',      'めぐろ',      '東京都', '目黒',      '各線',         '目黒区'),
  ('station', '中目黒',    'なかめぐろ',  '東京都', '中目黒',    '東急東横線',   '目黒区'),
  ('station', '祐天寺',    'ゆうてんじ',  '東京都', '祐天寺',    '東急東横線',   '目黒区'),
  ('station', '学芸大学',  'がくげいだいがく','東京都','学芸大学','東急東横線',  '目黒区'),
  ('station', '都立大学',  'とりつだいがく','東京都','都立大学',  '東急東横線',  '目黒区'),
  ('station', '武蔵小山',  'むさしこやま','東京都', '武蔵小山',  '東急目黒線',   '目黒区'),
  ('station', '西小山',    'にしこやま',  '東京都', '西小山',    '東急目黒線',   '目黒区'),
  ('station', '洗足',      'せんぞく',    '東京都', '洗足',      '東急目黒線',   '目黒区'),
  -- 品川区
  ('station', '大崎',      'おおさき',    '東京都', '大崎',      'JR山手線',     '品川区'),
  ('station', '五反田',    'ごたんだ',    '東京都', '五反田',    'JR山手線',     '品川区'),
  ('station', '戸越銀座',  'とごしぎんざ','東京都', '戸越銀座',  '東急大井町線', '品川区'),
  -- 世田谷区
  ('station', '三軒茶屋',  'さんげんじゃや','東京都','三軒茶屋', '東急田園都市線','世田谷区'),
  ('station', '下北沢',    'しもきたざわ','東京都', '下北沢',    '小田急線',     '世田谷区'),
  ('station', '駒沢大学',  'こまざわだいがく','東京都','駒沢大学','東急田園都市線','世田谷区'),
  ('station', '桜新町',    'さくらしんまち','東京都','桜新町',   '東急田園都市線','世田谷区'),
  ('station', '用賀',      'ようが',      '東京都', '用賀',      '東急田園都市線','世田谷区'),
  ('station', '二子玉川',  'ふたこたまがわ','東京都','二子玉川', '東急田園都市線','世田谷区'),
  -- 大田区
  ('station', '蒲田',      'かまた',      '東京都', '蒲田',      'JR京浜東北線', '大田区'),
  ('station', '大森',      'おおもり',    '東京都', '大森',      'JR京浜東北線', '大田区'),
  -- 文京区
  ('station', '本郷三丁目','ほんごうさんちょうめ','東京都','本郷三丁目','東京メトロ丸ノ内線','文京区'),
  ('station', '後楽園',    'こうらくえん','東京都', '後楽園',    '東京メトロ丸ノ内線','文京区'),
  ('station', '茗荷谷',    'みょうがだに','東京都', '茗荷谷',    '東京メトロ丸ノ内線','文京区'),
  -- 豊島区
  ('station', '池袋',      'いけぶくろ',  '東京都', '池袋',      '各線',         '豊島区'),
  ('station', '東池袋',    'ひがしいけぶくろ','東京都','東池袋',  '東京メトロ有楽町線','豊島区'),
  -- 中野区
  ('station', '中野',      'なかの',      '東京都', '中野',      'JR中央線',     '中野区'),
  ('station', '野方',      'のがた',      '東京都', '野方',      '西武新宿線',   '中野区'),
  -- 杉並区
  ('station', '高円寺',    'こうえんじ',  '東京都', '高円寺',    'JR中央線',     '杉並区'),
  ('station', '阿佐ヶ谷',  'あさがや',    '東京都', '阿佐ヶ谷',  'JR中央線',     '杉並区'),
  ('station', '荻窪',      'おぎくぼ',    '東京都', '荻窪',      'JR中央線',     '杉並区'),
  ('station', '西荻窪',    'にしおぎくぼ','東京都', '西荻窪',    'JR中央線',     '杉並区'),
  ('station', '吉祥寺',    'きちじょうじ','東京都', '吉祥寺',    'JR中央線',     '武蔵野市'),
  ('station', '三鷹',      'みたか',      '東京都', '三鷹',      'JR中央線',     '三鷹市')
ON CONFLICT (area_type, display_name, COALESCE(prefecture, '')) DO UPDATE
  SET yomi         = EXCLUDED.yomi,
      station_name = EXCLUDED.station_name,
      line_name    = EXCLUDED.line_name,
      station_ward = EXCLUDED.station_ward,
      updated_at   = now();

-- ============================================================
-- 5. 神奈川県 主要駅（station）
-- ============================================================

INSERT INTO area_masters (area_type, display_name, yomi, prefecture, station_name, line_name, station_ward)
VALUES
  ('station', '武蔵小杉',  'むさしこすぎ','神奈川県', '武蔵小杉',  '東急東横線',  '川崎市中原区'),
  ('station', '元住吉',    'もとすみよし','神奈川県', '元住吉',    '東急東横線',  '川崎市中原区'),
  ('station', '日吉',      'ひよし',      '神奈川県', '日吉',      '東急東横線',  '横浜市港北区'),
  ('station', '綱島',      'つなしま',    '神奈川県', '綱島',      '東急東横線',  '横浜市港北区'),
  ('station', '大倉山',    'おおくらやま','神奈川県', '大倉山',    '東急東横線',  '横浜市港北区'),
  ('station', '菊名',      'きくな',      '神奈川県', '菊名',      '東急東横線',  '横浜市港北区'),
  ('station', '横浜',      'よこはま',    '神奈川県', '横浜',      '各線',        '横浜市西区'),
  ('station', '桜木町',    'さくらぎちょう','神奈川県','桜木町',   'JR根岸線',   '横浜市中区'),
  ('station', '関内',      'かんない',    '神奈川県', '関内',      'JR根岸線',    '横浜市中区'),
  ('station', '川崎',      'かわさき',    '神奈川県', '川崎',      'JR京浜東北線','川崎市川崎区'),
  ('station', '溝の口',    'みぞのくち',  '神奈川県', '溝の口',    '東急田園都市線','川崎市高津区'),
  ('station', '鷺沼',      'さぎぬま',    '神奈川県', '鷺沼',      '東急田園都市線','川崎市宮前区'),
  ('station', 'たまプラーザ','たまぷらーざ','神奈川県','たまプラーザ','東急田園都市線','横浜市青葉区'),
  ('station', 'あざみ野',  'あざみの',    '神奈川県', 'あざみ野',  '東急田園都市線','横浜市青葉区'),
  ('station', '新百合ヶ丘','しんゆりがおか','神奈川県','新百合ヶ丘','小田急線',  '川崎市麻生区'),
  ('station', '海老名',    'えびな',      '神奈川県', '海老名',    '小田急線',    '海老名市'),
  ('station', '本厚木',    'ほんあつぎ',  '神奈川県', '本厚木',    '小田急線',    '厚木市'),
  ('station', '藤沢',      'ふじさわ',    '神奈川県', '藤沢',      'JR東海道線',  '藤沢市'),
  ('station', '大船',      'おおふな',    '神奈川県', '大船',      'JR東海道線',  '鎌倉市'),
  ('station', '鎌倉',      'かまくら',    '神奈川県', '鎌倉',      'JR横須賀線',  '鎌倉市'),
  ('station', '小田原',    'おだわら',    '神奈川県', '小田原',    '各線',        '小田原市')
ON CONFLICT (area_type, display_name, COALESCE(prefecture, '')) DO UPDATE
  SET yomi         = EXCLUDED.yomi,
      station_name = EXCLUDED.station_name,
      line_name    = EXCLUDED.line_name,
      station_ward = EXCLUDED.station_ward,
      updated_at   = now();

-- ============================================================
-- 6. SUUMO 駅パラメータ（station_path 形式）
--    URL例: https://suumo.jp/jj/bukken/ichiran/JJ012FJ001/?ar=030&bs=011&ta=13&ek=XXXXXX
--         or https://suumo.jp/ms/chuko/tokyo/eki_hatsudai/
-- ============================================================

INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param)
SELECT m.id, 'suumo', 'station_path', v.slug, v.slug
FROM area_masters m
JOIN (VALUES
  -- 東京都
  ('初台',      'tokyo/eki_hatsudai'),
  ('幡ヶ谷',    'tokyo/eki_hatagaya'),
  ('笹塚',      'tokyo/eki_sasazuka'),
  ('渋谷',      'tokyo/eki_shibuya'),
  ('代々木上原','tokyo/eki_yoyogiuehara'),
  ('白金高輪',  'tokyo/eki_shirokanetakanawa'),
  ('白金台',    'tokyo/eki_shirokanedai'),
  ('麻布十番',  'tokyo/eki_azabujuban'),
  ('六本木',    'tokyo/eki_roppongi'),
  ('田町',      'tokyo/eki_tamachi'),
  ('三田',      'tokyo/eki_mita'),
  ('品川',      'tokyo/eki_shinagawa'),
  ('高輪ゲートウェイ','tokyo/eki_takanawagatewayst'),
  ('新宿',      'tokyo/eki_shinjuku'),
  ('目黒',      'tokyo/eki_meguro'),
  ('中目黒',    'tokyo/eki_nakameguro'),
  ('大崎',      'tokyo/eki_osaki'),
  ('五反田',    'tokyo/eki_gotanda'),
  ('三軒茶屋',  'tokyo/eki_sangenjaya'),
  ('下北沢',    'tokyo/eki_shimokitazawa'),
  ('二子玉川',  'tokyo/eki_futakotamagawa'),
  ('蒲田',      'tokyo/eki_kamata'),
  ('大森',      'tokyo/eki_omori'),
  ('池袋',      'tokyo/eki_ikebukuro'),
  ('中野',      'tokyo/eki_nakano'),
  ('高円寺',    'tokyo/eki_koenji'),
  ('阿佐ヶ谷',  'tokyo/eki_asagaya'),
  ('荻窪',      'tokyo/eki_ogikubo'),
  ('吉祥寺',    'tokyo/eki_kichijoji'),
  ('三鷹',      'tokyo/eki_mitaka'),
  ('銀座',      'tokyo/eki_ginza'),
  ('東京',      'tokyo/eki_tokyo'),
  -- 神奈川県
  ('武蔵小杉',  'kanagawa/eki_musashikosugi'),
  ('日吉',      'kanagawa/eki_hiyoshi'),
  ('横浜',      'kanagawa/eki_yokohama'),
  ('桜木町',    'kanagawa/eki_sakuragicho'),
  ('川崎',      'kanagawa/eki_kawasaki'),
  ('溝の口',    'kanagawa/eki_mizonokuchi'),
  ('たまプラーザ','kanagawa/eki_tamapalaza'),
  ('新百合ヶ丘','kanagawa/eki_shinyurigaoka'),
  ('藤沢',      'kanagawa/eki_fujisawa'),
  ('鎌倉',      'kanagawa/eki_kamakura')
) AS v(name, slug) ON m.display_name = v.name AND m.area_type = 'station'
ON CONFLICT (area_id, portal) DO UPDATE
  SET portal_code      = EXCLUDED.portal_code,
      portal_url_param = EXCLUDED.portal_url_param,
      updated_at       = now();

-- ============================================================
-- 7. エリアエイリアス（area_aliases）
--    「初台駅」→ 初台 など「駅」付き・略称・別表記を登録
-- ============================================================

INSERT INTO area_aliases (area_id, alias)
SELECT m.id, v.alias
FROM area_masters m
JOIN (VALUES
  -- 東京都 駅（駅名 + 「駅」付きエイリアス）
  ('初台',      '初台駅'),
  ('幡ヶ谷',    '幡ヶ谷駅'),
  ('笹塚',      '笹塚駅'),
  ('渋谷',      '渋谷駅'),
  ('代々木上原','代々木上原駅'),
  ('白金高輪',  '白金高輪駅'),
  ('白金台',    '白金台駅'),
  ('麻布十番',  '麻布十番駅'),
  ('六本木',    '六本木駅'),
  ('赤羽橋',    '赤羽橋駅'),
  ('田町',      '田町駅'),
  ('三田',      '三田駅'),
  ('品川',      '品川駅'),
  ('高輪ゲートウェイ','高輪ゲートウェイ駅'),
  ('新宿',      '新宿駅'),
  ('目黒',      '目黒駅'),
  ('中目黒',    '中目黒駅'),
  ('大崎',      '大崎駅'),
  ('五反田',    '五反田駅'),
  ('三軒茶屋',  '三軒茶屋駅'),
  ('下北沢',    '下北沢駅'),
  ('二子玉川',  '二子玉川駅'),
  ('蒲田',      '蒲田駅'),
  ('大森',      '大森駅'),
  ('池袋',      '池袋駅'),
  ('中野',      '中野駅'),
  ('高円寺',    '高円寺駅'),
  ('阿佐ヶ谷',  '阿佐ヶ谷駅'),
  ('荻窪',      '荻窪駅'),
  ('吉祥寺',    '吉祥寺駅'),
  ('三鷹',      '三鷹駅'),
  ('銀座',      '銀座駅'),
  ('東京',      '東京駅'),
  -- 神奈川県 駅
  ('武蔵小杉',  '武蔵小杉駅'),
  ('日吉',      '日吉駅'),
  ('横浜',      '横浜駅'),
  ('桜木町',    '桜木町駅'),
  ('川崎',      '川崎駅'),
  ('溝の口',    '溝の口駅'),
  ('たまプラーザ','たまプラーザ駅'),
  ('新百合ヶ丘','新百合ヶ丘駅'),
  ('藤沢',      '藤沢駅'),
  ('鎌倉',      '鎌倉駅'),
  -- 東京都 区（「区」付きはdisplay_nameそのものだが、念のため別読み登録）
  -- 港区系エイリアス
  ('港区',      'みなと区'),
  -- 世田谷区系
  ('世田谷区',  '世田谷'),
  -- 川崎市中原区（武蔵小杉の所在区として検索される）
  ('川崎市中原区','中原区')
) AS v(display_name, alias) ON m.display_name = v.display_name
ON CONFLICT (alias) DO NOTHING;  -- 同一エイリアスが既にある場合はスキップ

-- ============================================================
-- 8. 確認SQL
-- ============================================================

-- ① 初台駅 が area_aliases → area_masters → portal_area_params に繋がるか確認
SELECT
  aa.alias,
  am.display_name,
  am.area_type,
  am.station_ward,
  pap.portal,
  pap.param_type,
  pap.portal_url_param
FROM area_aliases aa
JOIN area_masters am ON am.id = aa.area_id
LEFT JOIN portal_area_params pap ON pap.area_id = am.id
WHERE aa.alias = '初台駅';

-- ② 港区の SUUMO パラメータ確認
SELECT am.display_name, pap.portal_url_param
FROM area_masters am
JOIN portal_area_params pap ON pap.area_id = am.id
WHERE am.display_name = '港区' AND pap.portal = 'suumo';

-- ③ 登録件数サマリ
SELECT
  area_type,
  prefecture,
  COUNT(*) AS cnt
FROM area_masters
GROUP BY area_type, prefecture
ORDER BY prefecture, area_type;

-- ④ エイリアス登録件数
SELECT COUNT(*) AS alias_count FROM area_aliases;

-- ⑤ portal_area_params 件数
SELECT portal, param_type, COUNT(*) AS cnt
FROM portal_area_params
GROUP BY portal, param_type
ORDER BY portal, param_type;
