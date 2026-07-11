-- ================================================================
-- run_all_area_master_v2.sql
-- 東京都・神奈川県 エリアマスター 全件登録スクリプト
-- ================================================================
-- 実行手順:
--   1. Supabase Dashboard → SQL Editor を開く
--      https://supabase.com/dashboard/project/dhlwthogurcsrfnwfmbm/sql/new
--   2. このファイルの内容を全てペーストして「Run」を押す
--   3. 実行後 scripts/audit_area_masters.mjs でレポートを確認する
--
-- 実行順序 (全てこのファイル内で完結・冪等):
--   [1] portal_area_params に verified/notes カラム追加
--   [2] 東京都市部26市・郡部 → area_masters
--   [3] 神奈川県郡部14件     → area_masters
--   [4] 東京都主要駅補完     → area_masters
--   [5] 神奈川県主要駅補完   → area_masters
--   [6] 旧portal_area_mappings 502件 → 新マスターへ移行
--   [7] SUUMO URLパラメータ補完
--   [8] athome URLパラメータ補完
--   [9] HOME'S URLパラメータ補完
-- ================================================================

BEGIN;

-- ================================================================
-- [1] portal_area_params に verified / notes カラムを追加
-- ================================================================
ALTER TABLE portal_area_params
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE portal_area_params
  ADD COLUMN IF NOT EXISTS notes TEXT;

UPDATE portal_area_params
SET verified = true, notes = '旧マスターまたはv1 seed登録'
WHERE notes IS NULL;

-- ================================================================
-- [2] 東京都 市部(26市)・郡部 → area_masters
-- ================================================================
INSERT INTO area_masters (area_type, display_name, prefecture, city, ward, station_name, line_name, station_ward, yomi)
VALUES
  ('city','八王子市', '東京都',NULL,NULL,NULL,NULL,NULL,'はちおうじし'),
  ('city','立川市',   '東京都',NULL,NULL,NULL,NULL,NULL,'たちかわし'),
  ('city','武蔵野市', '東京都',NULL,NULL,NULL,NULL,NULL,'むさしのし'),
  ('city','三鷹市',   '東京都',NULL,NULL,NULL,NULL,NULL,'みたかし'),
  ('city','青梅市',   '東京都',NULL,NULL,NULL,NULL,NULL,'おうめし'),
  ('city','府中市',   '東京都',NULL,NULL,NULL,NULL,NULL,'ふちゅうし'),
  ('city','昭島市',   '東京都',NULL,NULL,NULL,NULL,NULL,'あきしまし'),
  ('city','調布市',   '東京都',NULL,NULL,NULL,NULL,NULL,'ちょうふし'),
  ('city','町田市',   '東京都',NULL,NULL,NULL,NULL,NULL,'まちだし'),
  ('city','小金井市', '東京都',NULL,NULL,NULL,NULL,NULL,'こがねいし'),
  ('city','小平市',   '東京都',NULL,NULL,NULL,NULL,NULL,'こだいらし'),
  ('city','日野市',   '東京都',NULL,NULL,NULL,NULL,NULL,'ひのし'),
  ('city','東村山市', '東京都',NULL,NULL,NULL,NULL,NULL,'ひがしむらやまし'),
  ('city','国分寺市', '東京都',NULL,NULL,NULL,NULL,NULL,'こくぶんじし'),
  ('city','国立市',   '東京都',NULL,NULL,NULL,NULL,NULL,'くにたちし'),
  ('city','福生市',   '東京都',NULL,NULL,NULL,NULL,NULL,'ふっさし'),
  ('city','狛江市',   '東京都',NULL,NULL,NULL,NULL,NULL,'こまえし'),
  ('city','東大和市', '東京都',NULL,NULL,NULL,NULL,NULL,'ひがしやまとし'),
  ('city','清瀬市',   '東京都',NULL,NULL,NULL,NULL,NULL,'きよせし'),
  ('city','東久留米市','東京都',NULL,NULL,NULL,NULL,NULL,'ひがしくるめし'),
  ('city','武蔵村山市','東京都',NULL,NULL,NULL,NULL,NULL,'むさしむらやまし'),
  ('city','多摩市',   '東京都',NULL,NULL,NULL,NULL,NULL,'たまし'),
  ('city','稲城市',   '東京都',NULL,NULL,NULL,NULL,NULL,'いなぎし'),
  ('city','羽村市',   '東京都',NULL,NULL,NULL,NULL,NULL,'はむらし'),
  ('city','あきる野市','東京都',NULL,NULL,NULL,NULL,NULL,'あきるのし'),
  ('city','西東京市', '東京都',NULL,NULL,NULL,NULL,NULL,'にしとうきょうし'),
  ('city','瑞穂町',   '東京都',NULL,NULL,NULL,NULL,NULL,'みずほまち'),
  ('city','日の出町', '東京都',NULL,NULL,NULL,NULL,NULL,'ひのでまち'),
  ('city','檜原村',   '東京都',NULL,NULL,NULL,NULL,NULL,'ひのはらむら'),
  ('city','奥多摩町', '東京都',NULL,NULL,NULL,NULL,NULL,'おくたままち')
ON CONFLICT DO NOTHING;

INSERT INTO area_aliases (area_id, alias)
SELECT am.id, replace(replace(am.display_name,'市',''),'町','')
FROM area_masters am
WHERE am.area_type = 'city' AND am.prefecture = '東京都'
  AND am.display_name NOT LIKE '%区%' AND length(am.display_name) > 3
  AND NOT EXISTS (SELECT 1 FROM area_aliases al WHERE al.area_id=am.id
    AND al.alias=replace(replace(am.display_name,'市',''),'町',''))
ON CONFLICT DO NOTHING;

-- ================================================================
-- [3] 神奈川県 郡部 → area_masters
-- ================================================================
INSERT INTO area_masters (area_type, display_name, prefecture, city, ward, station_name, line_name, station_ward, yomi)
VALUES
  ('city','葉山町',   '神奈川県',NULL,NULL,NULL,NULL,NULL,'はやままち'),
  ('city','寒川町',   '神奈川県',NULL,NULL,NULL,NULL,NULL,'さむかわまち'),
  ('city','大磯町',   '神奈川県',NULL,NULL,NULL,NULL,NULL,'おおいそまち'),
  ('city','二宮町',   '神奈川県',NULL,NULL,NULL,NULL,NULL,'にのみやまち'),
  ('city','中井町',   '神奈川県',NULL,NULL,NULL,NULL,NULL,'なかいまち'),
  ('city','大井町',   '神奈川県',NULL,NULL,NULL,NULL,NULL,'おおいまち'),
  ('city','松田町',   '神奈川県',NULL,NULL,NULL,NULL,NULL,'まつだまち'),
  ('city','山北町',   '神奈川県',NULL,NULL,NULL,NULL,NULL,'やまきたまち'),
  ('city','開成町',   '神奈川県',NULL,NULL,NULL,NULL,NULL,'かいせいまち'),
  ('city','箱根町',   '神奈川県',NULL,NULL,NULL,NULL,NULL,'はこねまち'),
  ('city','真鶴町',   '神奈川県',NULL,NULL,NULL,NULL,NULL,'まなづるまち'),
  ('city','湯河原町', '神奈川県',NULL,NULL,NULL,NULL,NULL,'ゆがわらまち'),
  ('city','愛川町',   '神奈川県',NULL,NULL,NULL,NULL,NULL,'あいかわまち'),
  ('city','清川村',   '神奈川県',NULL,NULL,NULL,NULL,NULL,'きよかわむら')
ON CONFLICT DO NOTHING;

-- ================================================================
-- [4] 東京都 主要駅補完（旧マスター未登録分）
-- ================================================================
INSERT INTO area_masters (area_type, display_name, prefecture, city, ward, station_name, line_name, station_ward, yomi)
VALUES
  ('station','原宿',       '東京都',NULL,NULL,'原宿',       'JR山手線',           '渋谷区',   'はらじゅく'),
  ('station','代々木',     '東京都',NULL,NULL,'代々木',     'JR山手線',           '渋谷区',   'よよぎ'),
  ('station','新大久保',   '東京都',NULL,NULL,'新大久保',   'JR山手線',           '新宿区',   'しんおおくぼ'),
  ('station','高田馬場',   '東京都',NULL,NULL,'高田馬場',   'JR山手線',           '新宿区',   'たかだのばば'),
  ('station','目白',       '東京都',NULL,NULL,'目白',       'JR山手線',           '豊島区',   'めじろ'),
  ('station','大塚',       '東京都',NULL,NULL,'大塚',       'JR山手線',           '豊島区',   'おおつか'),
  ('station','巣鴨',       '東京都',NULL,NULL,'巣鴨',       'JR山手線',           '豊島区',   'すがも'),
  ('station','駒込',       '東京都',NULL,NULL,'駒込',       'JR山手線',           '北区',     'こまごめ'),
  ('station','田端',       '東京都',NULL,NULL,'田端',       'JR山手線',           '北区',     'たばた'),
  ('station','西日暮里',   '東京都',NULL,NULL,'西日暮里',   'JR山手線',           '荒川区',   'にしにっぽり'),
  ('station','日暮里',     '東京都',NULL,NULL,'日暮里',     'JR山手線',           '荒川区',   'にっぽり'),
  ('station','鶯谷',       '東京都',NULL,NULL,'鶯谷',       'JR山手線',           '台東区',   'うぐいすだに'),
  ('station','御徒町',     '東京都',NULL,NULL,'御徒町',     'JR山手線',           '台東区',   'おかちまち'),
  ('station','御茶ノ水',   '東京都',NULL,NULL,'御茶ノ水',   'JR中央線',           '千代田区', 'おちゃのみず'),
  ('station','水道橋',     '東京都',NULL,NULL,'水道橋',     'JR中央線',           '文京区',   'すいどうばし'),
  ('station','信濃町',     '東京都',NULL,NULL,'信濃町',     'JR中央線',           '新宿区',   'しなのまち'),
  ('station','千駄ヶ谷',   '東京都',NULL,NULL,'千駄ヶ谷',   'JR中央線',           '渋谷区',   'せんだがや'),
  ('station','武蔵境',     '東京都',NULL,NULL,'武蔵境',     'JR中央線',           '武蔵野市', 'むさしさかい'),
  ('station','国分寺',     '東京都',NULL,NULL,'国分寺',     'JR中央線',           '国分寺市', 'こくぶんじ'),
  ('station','国立',       '東京都',NULL,NULL,'国立',       'JR中央線',           '国立市',   'くにたち'),
  ('station','立川',       '東京都',NULL,NULL,'立川',       'JR中央線',           '立川市',   'たちかわ'),
  ('station','八王子',     '東京都',NULL,NULL,'八王子',     'JR中央線',           '八王子市', 'はちおうじ'),
  ('station','錦糸町',     '東京都',NULL,NULL,'錦糸町',     'JR総武線',           '墨田区',   'きんしちょう'),
  ('station','亀戸',       '東京都',NULL,NULL,'亀戸',       'JR総武線',           '江東区',   'かめいど'),
  ('station','王子',       '東京都',NULL,NULL,'王子',       'JR京浜東北線',       '北区',     'おうじ'),
  ('station','赤羽',       '東京都',NULL,NULL,'赤羽',       'JR京浜東北線',       '北区',     'あかばね'),
  ('station','亀有',       '東京都',NULL,NULL,'亀有',       'JR常磐線',           '葛飾区',   'かめあり'),
  ('station','金町',       '東京都',NULL,NULL,'金町',       'JR常磐線',           '葛飾区',   'かなまち'),
  ('station','大井町',     '東京都',NULL,NULL,'大井町',     'JR京浜東北線',       '品川区',   'おおいまち'),
  ('station','代々木上原', '東京都',NULL,NULL,'代々木上原', '東京メトロ千代田線', '渋谷区',   'よよぎうえはら'),
  ('station','代々木公園', '東京都',NULL,NULL,'代々木公園', '東京メトロ千代田線', '渋谷区',   'よよぎこうえん'),
  ('station','明治神宮前', '東京都',NULL,NULL,'明治神宮前', '東京メトロ千代田線', '渋谷区',   'めいじじんぐうまえ'),
  ('station','表参道',     '東京都',NULL,NULL,'表参道',     '東京メトロ千代田線', '港区',     'おもてさんどう'),
  ('station','乃木坂',     '東京都',NULL,NULL,'乃木坂',     '東京メトロ千代田線', '港区',     'のぎざか'),
  ('station','赤坂',       '東京都',NULL,NULL,'赤坂',       '東京メトロ千代田線', '港区',     'あかさか'),
  ('station','湯島',       '東京都',NULL,NULL,'湯島',       '東京メトロ千代田線', '文京区',   'ゆしま'),
  ('station','根津',       '東京都',NULL,NULL,'根津',       '東京メトロ千代田線', '文京区',   'ねず'),
  ('station','千駄木',     '東京都',NULL,NULL,'千駄木',     '東京メトロ千代田線', '文京区',   'せんだぎ'),
  ('station','町屋',       '東京都',NULL,NULL,'町屋',       '東京メトロ千代田線', '荒川区',   'まちや'),
  ('station','北千住',     '東京都',NULL,NULL,'北千住',     '東京メトロ千代田線', '足立区',   'きたせんじゅ'),
  ('station','外苑前',     '東京都',NULL,NULL,'外苑前',     '東京メトロ銀座線',   '港区',     'がいえんまえ'),
  ('station','虎ノ門',     '東京都',NULL,NULL,'虎ノ門',     '東京メトロ銀座線',   '港区',     'とらのもん'),
  ('station','京橋',       '東京都',NULL,NULL,'京橋',       '東京メトロ銀座線',   '中央区',   'きょうばし'),
  ('station','人形町',     '東京都',NULL,NULL,'人形町',     '東京メトロ銀座線',   '中央区',   'にんぎょうちょう'),
  ('station','浅草',       '東京都',NULL,NULL,'浅草',       '東京メトロ銀座線',   '台東区',   'あさくさ'),
  ('station','八丁堀',     '東京都',NULL,NULL,'八丁堀',     '東京メトロ日比谷線', '中央区',   'はっちょうぼり'),
  ('station','築地',       '東京都',NULL,NULL,'築地',       '東京メトロ日比谷線', '中央区',   'つきじ'),
  ('station','東銀座',     '東京都',NULL,NULL,'東銀座',     '東京メトロ日比谷線', '中央区',   'ひがしぎんざ'),
  ('station','茅場町',     '東京都',NULL,NULL,'茅場町',     '東京メトロ日比谷線', '中央区',   'かやばちょう'),
  ('station','日比谷',     '東京都',NULL,NULL,'日比谷',     '東京メトロ日比谷線', '千代田区', 'ひびや'),
  ('station','神谷町',     '東京都',NULL,NULL,'神谷町',     '東京メトロ日比谷線', '港区',     'かみやちょう'),
  ('station','広尾',       '東京都',NULL,NULL,'広尾',       '東京メトロ日比谷線', '渋谷区',   'ひろお'),
  ('station','中目黒',     '東京都',NULL,NULL,'中目黒',     '東京メトロ日比谷線', '目黒区',   'なかめぐろ'),
  ('station','門前仲町',   '東京都',NULL,NULL,'門前仲町',   '東京メトロ東西線',   '江東区',   'もんぜんなかちょう'),
  ('station','木場',       '東京都',NULL,NULL,'木場',       '東京メトロ東西線',   '江東区',   'きば'),
  ('station','早稲田',     '東京都',NULL,NULL,'早稲田',     '東京メトロ東西線',   '新宿区',   'わせだ'),
  ('station','神楽坂',     '東京都',NULL,NULL,'神楽坂',     '東京メトロ東西線',   '新宿区',   'かぐらざか'),
  ('station','飯田橋',     '東京都',NULL,NULL,'飯田橋',     '東京メトロ東西線',   '千代田区', 'いいだばし'),
  ('station','九段下',     '東京都',NULL,NULL,'九段下',     '東京メトロ東西線',   '千代田区', 'くだんした'),
  ('station','清澄白河',   '東京都',NULL,NULL,'清澄白河',   '東京メトロ半蔵門線', '江東区',   'きよすみしらかわ'),
  ('station','住吉',       '東京都',NULL,NULL,'住吉',       '東京メトロ半蔵門線', '江東区',   'すみよし'),
  ('station','押上',       '東京都',NULL,NULL,'押上',       '東京メトロ半蔵門線', '墨田区',   'おしあげ'),
  ('station','水天宮前',   '東京都',NULL,NULL,'水天宮前',   '東京メトロ半蔵門線', '中央区',   'すいてんぐうまえ'),
  ('station','永田町',     '東京都',NULL,NULL,'永田町',     '東京メトロ半蔵門線', '千代田区', 'ながたちょう'),
  ('station','半蔵門',     '東京都',NULL,NULL,'半蔵門',     '東京メトロ半蔵門線', '千代田区', 'はんぞうもん'),
  ('station','神保町',     '東京都',NULL,NULL,'神保町',     '東京メトロ半蔵門線', '千代田区', 'じんぼうちょう'),
  ('station','青山一丁目', '東京都',NULL,NULL,'青山一丁目', '東京メトロ半蔵門線', '港区',     'あおやまいっちょうめ'),
  ('station','溜池山王',   '東京都',NULL,NULL,'溜池山王',   '東京メトロ半蔵門線', '港区',     'ためいけさんのう'),
  ('station','白金台',     '東京都',NULL,NULL,'白金台',     '東京メトロ南北線',   '港区',     'しろかねだい'),
  ('station','白金高輪',   '東京都',NULL,NULL,'白金高輪',   '東京メトロ南北線',   '港区',     'しろかねたかなわ'),
  ('station','麻布十番',   '東京都',NULL,NULL,'麻布十番',   '東京メトロ南北線',   '港区',     'あざぶじゅうばん'),
  ('station','六本木一丁目','東京都',NULL,NULL,'六本木一丁目','東京メトロ南北線',  '港区',     'ろっぽんぎいっちょうめ'),
  ('station','後楽園',     '東京都',NULL,NULL,'後楽園',     '東京メトロ南北線',   '文京区',   'こうらくえん'),
  ('station','本駒込',     '東京都',NULL,NULL,'本駒込',     '東京メトロ南北線',   '文京区',   'ほんこまごめ'),
  ('station','西ヶ原',     '東京都',NULL,NULL,'西ヶ原',     '東京メトロ南北線',   '北区',     'にしがはら'),
  ('station','赤羽岩淵',   '東京都',NULL,NULL,'赤羽岩淵',   '東京メトロ南北線',   '北区',     'あかばねいわぶち'),
  ('station','月島',       '東京都',NULL,NULL,'月島',       '東京メトロ有楽町線', '中央区',   'つきしま'),
  ('station','豊洲',       '東京都',NULL,NULL,'豊洲',       '東京メトロ有楽町線', '江東区',   'とよす'),
  ('station','大門',       '東京都',NULL,NULL,'大門',       '都営浅草線',         '港区',     'だいもん'),
  ('station','三田',       '東京都',NULL,NULL,'三田',       '都営三田線',         '港区',     'みた'),
  ('station','芝公園',     '東京都',NULL,NULL,'芝公園',     '都営三田線',         '港区',     'しばこうえん'),
  ('station','御成門',     '東京都',NULL,NULL,'御成門',     '都営三田線',         '港区',     'おなりもん'),
  ('station','春日',       '東京都',NULL,NULL,'春日',       '都営三田線',         '文京区',   'かすが'),
  ('station','千石',       '東京都',NULL,NULL,'千石',       '都営三田線',         '文京区',   'せんごく'),
  ('station','西巣鴨',     '東京都',NULL,NULL,'西巣鴨',     '都営三田線',         '豊島区',   'にしすがも'),
  ('station','高島平',     '東京都',NULL,NULL,'高島平',     '都営三田線',         '板橋区',   'たかしまだいら'),
  ('station','初台',       '東京都',NULL,NULL,'初台',       '都営新宿線',         '渋谷区',   'はつだい'),
  ('station','幡ヶ谷',     '東京都',NULL,NULL,'幡ヶ谷',     '都営新宿線',         '渋谷区',   'はたがや'),
  ('station','笹塚',       '東京都',NULL,NULL,'笹塚',       '都営新宿線',         '渋谷区',   'ささづか'),
  ('station','森下',       '東京都',NULL,NULL,'森下',       '都営新宿線',         '江東区',   'もりした'),
  ('station','菊川',       '東京都',NULL,NULL,'菊川',       '都営新宿線',         '墨田区',   'きくかわ'),
  ('station','馬喰横山',   '東京都',NULL,NULL,'馬喰横山',   '都営新宿線',         '中央区',   'ばくろよこやま'),
  ('station','岩本町',     '東京都',NULL,NULL,'岩本町',     '都営新宿線',         '千代田区', 'いわもとちょう'),
  ('station','市ヶ谷',     '東京都',NULL,NULL,'市ヶ谷',     '都営新宿線',         '新宿区',   'いちがや'),
  ('station','曙橋',       '東京都',NULL,NULL,'曙橋',       '都営新宿線',         '新宿区',   'あけぼのばし'),
  ('station','新宿三丁目', '東京都',NULL,NULL,'新宿三丁目', '都営新宿線',         '新宿区',   'しんじゅくさんちょうめ'),
  ('station','代田橋',     '東京都',NULL,NULL,'代田橋',     '都営新宿線',         '世田谷区', 'だいたばし'),
  ('station','明大前',     '東京都',NULL,NULL,'明大前',     '都営新宿線',         '世田谷区', 'めいだいまえ'),
  ('station','下高井戸',   '東京都',NULL,NULL,'下高井戸',   '都営新宿線',         '世田谷区', 'しもたかいど'),
  ('station','桜上水',     '東京都',NULL,NULL,'桜上水',     '都営新宿線',         '世田谷区', 'さくらじょうすい'),
  ('station','千歳烏山',   '東京都',NULL,NULL,'千歳烏山',   '都営新宿線',         '世田谷区', 'ちとせからすやま'),
  ('station','六本木',     '東京都',NULL,NULL,'六本木',     '都営大江戸線',       '港区',     'ろっぽんぎ'),
  ('station','赤羽橋',     '東京都',NULL,NULL,'赤羽橋',     '都営大江戸線',       '港区',     'あかばねばし'),
  ('station','勝どき',     '東京都',NULL,NULL,'勝どき',     '都営大江戸線',       '中央区',   'かちどき'),
  ('station','汐留',       '東京都',NULL,NULL,'汐留',       '都営大江戸線',       '港区',     'しおどめ'),
  ('station','両国',       '東京都',NULL,NULL,'両国',       '都営大江戸線',       '墨田区',   'りょうごく'),
  ('station','光が丘',     '東京都',NULL,NULL,'光が丘',     '都営大江戸線',       '練馬区',   'ひかりがおか'),
  ('station','練馬',       '東京都',NULL,NULL,'練馬',       '都営大江戸線',       '練馬区',   'ねりま'),
  ('station','天王洲アイル','東京都',NULL,NULL,'天王洲アイル','りんかい線',        '品川区',   'てんのうずあいる'),
  ('station','東京テレポート','東京都',NULL,NULL,'東京テレポート','りんかい線',     '江東区',   'とうきょうてれぽーと'),
  ('station','国際展示場', '東京都',NULL,NULL,'国際展示場', 'りんかい線',         '江東区',   'こくさいてんじじょう'),
  ('station','新木場',     '東京都',NULL,NULL,'新木場',     'りんかい線',         '江東区',   'しんきば'),
  ('station','代官山',     '東京都',NULL,NULL,'代官山',     '東急東横線',         '渋谷区',   'だいかんやま'),
  ('station','祐天寺',     '東京都',NULL,NULL,'祐天寺',     '東急東横線',         '目黒区',   'ゆうてんじ'),
  ('station','学芸大学',   '東京都',NULL,NULL,'学芸大学',   '東急東横線',         '目黒区',   'がくげいだいがく'),
  ('station','都立大学',   '東京都',NULL,NULL,'都立大学',   '東急東横線',         '目黒区',   'とりつだいがく'),
  ('station','自由が丘',   '東京都',NULL,NULL,'自由が丘',   '東急東横線',         '目黒区',   'じゆうがおか'),
  ('station','田園調布',   '東京都',NULL,NULL,'田園調布',   '東急東横線',         '大田区',   'でんえんちょうふ'),
  ('station','武蔵小山',   '東京都',NULL,NULL,'武蔵小山',   '東急目黒線',         '品川区',   'むさしこやま'),
  ('station','西小山',     '東京都',NULL,NULL,'西小山',     '東急目黒線',         '品川区',   'にしこやま'),
  ('station','三軒茶屋',   '東京都',NULL,NULL,'三軒茶屋',   '東急田園都市線',     '世田谷区', 'さんげんちゃや'),
  ('station','駒沢大学',   '東京都',NULL,NULL,'駒沢大学',   '東急田園都市線',     '世田谷区', 'こまざわだいがく'),
  ('station','桜新町',     '東京都',NULL,NULL,'桜新町',     '東急田園都市線',     '世田谷区', 'さくらしんまち'),
  ('station','用賀',       '東京都',NULL,NULL,'用賀',       '東急田園都市線',     '世田谷区', 'ようが'),
  ('station','二子玉川',   '東京都',NULL,NULL,'二子玉川',   '東急田園都市線',     '世田谷区', 'ふたこたまがわ'),
  ('station','旗の台',     '東京都',NULL,NULL,'旗の台',     '東急大井町線',       '品川区',   'はたのだい'),
  ('station','大岡山',     '東京都',NULL,NULL,'大岡山',     '東急大井町線',       '目黒区',   'おおおかやま'),
  ('station','五反田',     '東京都',NULL,NULL,'五反田',     '東急池上線',         '品川区',   'ごたんだ'),
  ('station','戸越銀座',   '東京都',NULL,NULL,'戸越銀座',   '東急池上線',         '品川区',   'とごしぎんざ'),
  ('station','笹塚',       '東京都',NULL,NULL,'笹塚',       '京王線',             '渋谷区',   'ささづか'),
  ('station','明大前',     '東京都',NULL,NULL,'明大前',     '京王線',             '世田谷区', 'めいだいまえ'),
  ('station','千歳烏山',   '東京都',NULL,NULL,'千歳烏山',   '京王線',             '世田谷区', 'ちとせからすやま'),
  ('station','調布',       '東京都',NULL,NULL,'調布',       '京王線',             '調布市',   'ちょうふ'),
  ('station','府中',       '東京都',NULL,NULL,'府中',       '京王線',             '府中市',   'ふちゅう'),
  ('station','聖蹟桜ヶ丘', '東京都',NULL,NULL,'聖蹟桜ヶ丘', '京王線',             '多摩市',   'せいせきさくらがおか'),
  ('station','神泉',       '東京都',NULL,NULL,'神泉',       '京王井の頭線',       '渋谷区',   'しんせん'),
  ('station','駒場東大前', '東京都',NULL,NULL,'駒場東大前', '京王井の頭線',       '目黒区',   'こまばとうだいまえ'),
  ('station','下北沢',     '東京都',NULL,NULL,'下北沢',     '京王井の頭線',       '世田谷区', 'しもきたざわ'),
  ('station','永福町',     '東京都',NULL,NULL,'永福町',     '京王井の頭線',       '杉並区',   'えいふくちょう'),
  ('station','久我山',     '東京都',NULL,NULL,'久我山',     '京王井の頭線',       '杉並区',   'くがやま'),
  ('station','参宮橋',     '東京都',NULL,NULL,'参宮橋',     '小田急線',           '渋谷区',   'さんぐうばし'),
  ('station','代々木八幡', '東京都',NULL,NULL,'代々木八幡', '小田急線',           '渋谷区',   'よよぎはちまん'),
  ('station','東北沢',     '東京都',NULL,NULL,'東北沢',     '小田急線',           '世田谷区', 'ひがしきたざわ'),
  ('station','梅ヶ丘',     '東京都',NULL,NULL,'梅ヶ丘',     '小田急線',           '世田谷区', 'うめがおか'),
  ('station','豪徳寺',     '東京都',NULL,NULL,'豪徳寺',     '小田急線',           '世田谷区', 'ごうとくじ'),
  ('station','経堂',       '東京都',NULL,NULL,'経堂',       '小田急線',           '世田谷区', 'きょうどう'),
  ('station','千歳船橋',   '東京都',NULL,NULL,'千歳船橋',   '小田急線',           '世田谷区', 'ちとせふなばし'),
  ('station','祖師ヶ谷大蔵','東京都',NULL,NULL,'祖師ヶ谷大蔵','小田急線',         '世田谷区', 'そしがやおおくら'),
  ('station','成城学園前', '東京都',NULL,NULL,'成城学園前', '小田急線',           '世田谷区', 'せいじょうがくえんまえ'),
  ('station','狛江',       '東京都',NULL,NULL,'狛江',       '小田急線',           '狛江市',   'こまえ'),
  ('station','江古田',     '東京都',NULL,NULL,'江古田',     '西武池袋線',         '練馬区',   'えごた'),
  ('station','石神井公園', '東京都',NULL,NULL,'石神井公園', '西武池袋線',         '練馬区',   'しゃくじいこうえん'),
  ('station','大泉学園',   '東京都',NULL,NULL,'大泉学園',   '西武池袋線',         '練馬区',   'おおいずみがくえん'),
  ('station','野方',       '東京都',NULL,NULL,'野方',       '西武新宿線',         '中野区',   'のがた'),
  ('station','鷺ノ宮',     '東京都',NULL,NULL,'鷺ノ宮',     '西武新宿線',         '中野区',   'さぎのみや'),
  ('station','立川北',     '東京都',NULL,NULL,'立川北',     '多摩モノレール',     '立川市',   'たちかわきた'),
  ('station','立川南',     '東京都',NULL,NULL,'立川南',     '多摩モノレール',     '立川市',   'たちかわみなみ'),
  ('station','高幡不動',   '東京都',NULL,NULL,'高幡不動',   '多摩モノレール',     '日野市',   'たかはたふどう'),
  ('station','多摩センター','東京都',NULL,NULL,'多摩センター','多摩モノレール',    '多摩市',   'たませんたー')
ON CONFLICT DO NOTHING;

-- ================================================================
-- [5] 神奈川県 主要駅補完
-- ================================================================
INSERT INTO area_masters (area_type, display_name, prefecture, city, ward, station_name, line_name, station_ward, yomi)
VALUES
  ('station','溝の口',       '神奈川県',NULL,NULL,'溝の口',       '東急田園都市線',         NULL,'みぞのくち'),
  ('station','梶が谷',       '神奈川県',NULL,NULL,'梶が谷',       '東急田園都市線',         NULL,'かじがや'),
  ('station','宮崎台',       '神奈川県',NULL,NULL,'宮崎台',       '東急田園都市線',         NULL,'みやざきだい'),
  ('station','宮前平',       '神奈川県',NULL,NULL,'宮前平',       '東急田園都市線',         NULL,'みやまえだいら'),
  ('station','鷺沼',         '神奈川県',NULL,NULL,'鷺沼',         '東急田園都市線',         NULL,'さぎぬま'),
  ('station','たまプラーザ', '神奈川県',NULL,NULL,'たまプラーザ', '東急田園都市線',         NULL,'たまぷらーざ'),
  ('station','あざみ野',     '神奈川県',NULL,NULL,'あざみ野',     '東急田園都市線',         NULL,'あざみの'),
  ('station','江田',         '神奈川県',NULL,NULL,'江田',         '東急田園都市線',         NULL,'えだ'),
  ('station','市が尾',       '神奈川県',NULL,NULL,'市が尾',       '東急田園都市線',         NULL,'いちがお'),
  ('station','藤が丘',       '神奈川県',NULL,NULL,'藤が丘',       '東急田園都市線',         NULL,'ふじがおか'),
  ('station','青葉台',       '神奈川県',NULL,NULL,'青葉台',       '東急田園都市線',         NULL,'あおばだい'),
  ('station','長津田',       '神奈川県',NULL,NULL,'長津田',       '東急田園都市線',         NULL,'ながつた'),
  ('station','中央林間',     '神奈川県',NULL,NULL,'中央林間',     '東急田園都市線',         NULL,'ちゅうおうりんかん'),
  ('station','武蔵小杉',     '神奈川県',NULL,NULL,'武蔵小杉',     '東急東横線',             NULL,'むさしこすぎ'),
  ('station','元住吉',       '神奈川県',NULL,NULL,'元住吉',       '東急東横線',             NULL,'もとすみよし'),
  ('station','綱島',         '神奈川県',NULL,NULL,'綱島',         '東急東横線',             NULL,'つなしま'),
  ('station','大倉山',       '神奈川県',NULL,NULL,'大倉山',       '東急東横線',             NULL,'おおくらやま'),
  ('station','菊名',         '神奈川県',NULL,NULL,'菊名',         '東急東横線',             NULL,'きくな'),
  ('station','妙蓮寺',       '神奈川県',NULL,NULL,'妙蓮寺',       '東急東横線',             NULL,'みょうれんじ'),
  ('station','白楽',         '神奈川県',NULL,NULL,'白楽',         '東急東横線',             NULL,'はくらく'),
  ('station','反町',         '神奈川県',NULL,NULL,'反町',         '東急東横線',             NULL,'たんまち'),
  ('station','日吉',         '神奈川県',NULL,NULL,'日吉',         '東急東横線',             NULL,'ひよし'),
  ('station','二俣川',       '神奈川県',NULL,NULL,'二俣川',       '相鉄本線',               NULL,'ふたまたがわ'),
  ('station','希望ヶ丘',     '神奈川県',NULL,NULL,'希望ヶ丘',     '相鉄本線',               NULL,'きぼうがおか'),
  ('station','三ツ境',       '神奈川県',NULL,NULL,'三ツ境',       '相鉄本線',               NULL,'みつきょう'),
  ('station','瀬谷',         '神奈川県',NULL,NULL,'瀬谷',         '相鉄本線',               NULL,'せや'),
  ('station','大和',         '神奈川県',NULL,NULL,'大和',         '相鉄本線',               NULL,'やまと'),
  ('station','海老名',       '神奈川県',NULL,NULL,'海老名',       '相鉄本線',               NULL,'えびな'),
  ('station','湘南台',       '神奈川県',NULL,NULL,'湘南台',       '相鉄いずみ野線',         NULL,'しょうなんだい'),
  ('station','向ヶ丘遊園',   '神奈川県',NULL,NULL,'向ヶ丘遊園',   '小田急線',               NULL,'むこうがおかゆうえん'),
  ('station','新百合ヶ丘',   '神奈川県',NULL,NULL,'新百合ヶ丘',   '小田急線',               NULL,'しんゆりがおか'),
  ('station','鶴川',         '神奈川県',NULL,NULL,'鶴川',         '小田急線',               NULL,'つるかわ'),
  ('station','町田',         '神奈川県',NULL,NULL,'町田',         '小田急線',               NULL,'まちだ'),
  ('station','相模大野',     '神奈川県',NULL,NULL,'相模大野',     '小田急線',               NULL,'さがみおおの'),
  ('station','本厚木',       '神奈川県',NULL,NULL,'本厚木',       '小田急線',               NULL,'ほんあつぎ'),
  ('station','伊勢原',       '神奈川県',NULL,NULL,'伊勢原',       '小田急線',               NULL,'いせはら'),
  ('station','秦野',         '神奈川県',NULL,NULL,'秦野',         '小田急線',               NULL,'はだの'),
  ('station','新松田',       '神奈川県',NULL,NULL,'新松田',       '小田急線',               NULL,'しんまつだ'),
  ('station','小田原',       '神奈川県',NULL,NULL,'小田原',       '小田急線',               NULL,'おだわら'),
  ('station','川崎',         '神奈川県',NULL,NULL,'川崎',         'JR東海道線',             NULL,'かわさき'),
  ('station','鶴見',         '神奈川県',NULL,NULL,'鶴見',         'JR京浜東北線',           NULL,'つるみ'),
  ('station','戸塚',         '神奈川県',NULL,NULL,'戸塚',         'JR東海道線',             NULL,'とつか'),
  ('station','大船',         '神奈川県',NULL,NULL,'大船',         'JR東海道線',             NULL,'おおふな'),
  ('station','藤沢',         '神奈川県',NULL,NULL,'藤沢',         'JR東海道線',             NULL,'ふじさわ'),
  ('station','茅ヶ崎',       '神奈川県',NULL,NULL,'茅ヶ崎',       'JR東海道線',             NULL,'ちがさき'),
  ('station','平塚',         '神奈川県',NULL,NULL,'平塚',         'JR東海道線',             NULL,'ひらつか'),
  ('station','新川崎',       '神奈川県',NULL,NULL,'新川崎',       'JR横須賀線',             NULL,'しんかわさき'),
  ('station','みなとみらい', '神奈川県',NULL,NULL,'みなとみらい', 'みなとみらい線',         NULL,'みなとみらい'),
  ('station','馬車道',       '神奈川県',NULL,NULL,'馬車道',       'みなとみらい線',         NULL,'ばしゃみち'),
  ('station','元町・中華街', '神奈川県',NULL,NULL,'元町・中華街', 'みなとみらい線',         NULL,'もとまちちゅうかがい'),
  ('station','センター北',   '神奈川県',NULL,NULL,'センター北',   '横浜市営地下鉄ブルーライン',NULL,'せんたーきた'),
  ('station','センター南',   '神奈川県',NULL,NULL,'センター南',   '横浜市営地下鉄ブルーライン',NULL,'せんたーみなみ'),
  ('station','上大岡',       '神奈川県',NULL,NULL,'上大岡',       '横浜市営地下鉄ブルーライン',NULL,'かみおおおか'),
  ('station','あざみ野',     '神奈川県',NULL,NULL,'あざみ野',     '横浜市営地下鉄ブルーライン',NULL,'あざみの'),
  ('station','京急川崎',     '神奈川県',NULL,NULL,'京急川崎',     '京急本線',               NULL,'けいきゅうかわさき'),
  ('station','上大岡',       '神奈川県',NULL,NULL,'上大岡',       '京急本線',               NULL,'かみおおおか'),
  ('station','金沢文庫',     '神奈川県',NULL,NULL,'金沢文庫',     '京急本線',               NULL,'かなざわぶんこ'),
  ('station','金沢八景',     '神奈川県',NULL,NULL,'金沢八景',     '京急本線',               NULL,'かなざわはっけい'),
  ('station','横須賀中央',   '神奈川県',NULL,NULL,'横須賀中央',   '京急本線',               NULL,'よこすかちゅうおう'),
  ('station','鎌倉',         '神奈川県',NULL,NULL,'鎌倉',         '江ノ島電鉄',             NULL,'かまくら'),
  ('station','江ノ島',       '神奈川県',NULL,NULL,'江ノ島',       '江ノ島電鉄',             NULL,'えのしま'),
  ('station','逗子',         '神奈川県',NULL,NULL,'逗子',         'JR横須賀線',             NULL,'ずし')
ON CONFLICT DO NOTHING;

-- 全駅のエイリアス「XX駅」を一括追加
INSERT INTO area_aliases (area_id, alias)
SELECT am.id, am.display_name||'駅'
FROM area_masters am
WHERE am.area_type='station' AND am.prefecture IN ('東京都','神奈川県')
  AND NOT EXISTS (SELECT 1 FROM area_aliases al
    WHERE al.area_id=am.id AND al.alias=am.display_name||'駅')
ON CONFLICT DO NOTHING;

-- ================================================================
-- [6] 旧 portal_area_mappings (502件) → 新マスターへ移行
-- ================================================================
INSERT INTO area_masters (
  area_type, display_name, prefecture, city, ward, station_name, line_name, station_ward, yomi
)
SELECT DISTINCT ON (
  CASE WHEN pm.area_type='station' THEN 'station'
       WHEN pm.display_name ~ '[区]$' AND pm.area_type!='station' THEN 'ward'
       ELSE 'city' END,
  pm.display_name, COALESCE(pm.prefecture,'')
)
  CASE WHEN pm.area_type='station' THEN 'station'
       WHEN pm.display_name ~ '[区]$' AND pm.area_type!='station' THEN 'ward'
       ELSE 'city' END AS area_type,
  pm.display_name, pm.prefecture, pm.city,
  NULL, pm.station_name, NULL, NULL, NULL
FROM portal_area_mappings pm
WHERE pm.prefecture IN ('東京都','神奈川県')
  AND NOT EXISTS (
    SELECT 1 FROM area_masters am
    WHERE am.display_name=pm.display_name
      AND COALESCE(am.prefecture,'')=COALESCE(pm.prefecture,'')
  )
ON CONFLICT DO NOTHING;

INSERT INTO portal_area_params (
  area_id, portal, param_type, portal_code, portal_url_param, verified, notes
)
SELECT
  am.id, pm.portal,
  CASE WHEN pm.portal='suumo' AND pm.portal_url_param LIKE 'ta=%' THEN 'query'
       WHEN pm.portal='suumo' THEN 'station_path' ELSE 'station_path' END,
  pm.portal_code, pm.portal_url_param,
  TRUE, '旧portal_area_mappingsから移行'
FROM portal_area_mappings pm
JOIN area_masters am
  ON am.display_name=pm.display_name
 AND COALESCE(am.prefecture,'')=COALESCE(pm.prefecture,'')
WHERE pm.prefecture IN ('東京都','神奈川県')
  AND NOT EXISTS (
    SELECT 1 FROM portal_area_params pap
    WHERE pap.area_id=am.id AND pap.portal=pm.portal
  )
ON CONFLICT DO NOTHING;

INSERT INTO area_aliases (area_id, alias)
SELECT am.id, am.display_name||'駅'
FROM area_masters am
WHERE am.area_type='station' AND am.prefecture IN ('東京都','神奈川県')
  AND NOT EXISTS (
    SELECT 1 FROM area_aliases al
    WHERE al.area_id=am.id AND al.alias=am.display_name||'駅'
  )
ON CONFLICT DO NOTHING;

-- ================================================================
-- [7] SUUMO portal_area_params 補完
-- ================================================================
INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param, verified, notes)
SELECT am.id, 'suumo', 'query', code, 'ta=13&sc='||code, true, 'SUUMOシティコード（公開情報）'
FROM (VALUES
  ('八王子市','13201'),('立川市','13202'),('武蔵野市','13203'),('三鷹市','13204'),
  ('青梅市','13205'),('府中市','13206'),('昭島市','13207'),('調布市','13208'),
  ('町田市','13209'),('小金井市','13210'),('小平市','13211'),('日野市','13212'),
  ('東村山市','13213'),('国分寺市','13214'),('国立市','13215'),('福生市','13218'),
  ('狛江市','13219'),('東大和市','13220'),('清瀬市','13221'),('東久留米市','13222'),
  ('武蔵村山市','13223'),('多摩市','13224'),('稲城市','13225'),('羽村市','13228'),
  ('あきる野市','13229'),('西東京市','13230'),
  ('瑞穂町','13303'),('日の出町','13305'),('檜原村','13307'),('奥多摩町','13308')
) AS t(name,code)
JOIN area_masters am ON am.display_name=t.name AND am.prefecture='東京都'
WHERE NOT EXISTS (SELECT 1 FROM portal_area_params p WHERE p.area_id=am.id AND p.portal='suumo')
ON CONFLICT DO NOTHING;

INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param, verified, notes)
SELECT am.id, 'suumo', 'query', code, 'ta=14&sc='||code, true, 'SUUMOシティコード（公開情報）'
FROM (VALUES
  ('葉山町','14301'),('寒川町','14321'),('大磯町','14341'),('二宮町','14342'),
  ('中井町','14361'),('大井町','14362'),('松田町','14363'),('山北町','14364'),
  ('開成町','14365'),('箱根町','14382'),('真鶴町','14383'),('湯河原町','14384'),
  ('愛川町','14401'),('清川村','14402')
) AS t(name,code)
JOIN area_masters am ON am.display_name=t.name AND am.prefecture='神奈川県'
WHERE NOT EXISTS (SELECT 1 FROM portal_area_params p WHERE p.area_id=am.id AND p.portal='suumo')
ON CONFLICT DO NOTHING;

INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param, verified, notes)
SELECT am.id, 'suumo', 'station_path', NULL, 'tokyo/'||slug, false, '要確認：SUUMO駅パスの推測URL'
FROM (VALUES
  ('原宿','eki_harajuku'),('代々木','eki_yoyogi'),('新大久保','eki_shinokubo'),
  ('高田馬場','eki_takadanobaba'),('目白','eki_mejiro'),('大塚','eki_otsuka'),
  ('巣鴨','eki_sugamo'),('駒込','eki_komagome'),('田端','eki_tabata'),
  ('西日暮里','eki_nishinippori'),('日暮里','eki_nippori'),('鶯谷','eki_uguisudani'),
  ('御徒町','eki_okachimachi'),('御茶ノ水','eki_ochanomizu'),('水道橋','eki_suidobashi'),
  ('信濃町','eki_shinanomachi'),('千駄ヶ谷','eki_sendagaya'),('武蔵境','eki_musashisakai'),
  ('国分寺','eki_kokubunji'),('国立','eki_kunitachi'),('立川','eki_tachikawa'),
  ('八王子','eki_hachioji'),('錦糸町','eki_kinshicho'),('亀戸','eki_kameido'),
  ('王子','eki_oji'),('赤羽','eki_akabane'),('亀有','eki_kameari'),('金町','eki_kanamachi'),
  ('外苑前','eki_gaiennmae'),('虎ノ門','eki_toranomon'),('人形町','eki_ningyocho'),
  ('茅場町','eki_kayabacho'),('八丁堀','eki_hatchobori'),('築地','eki_tsukiji'),
  ('東銀座','eki_higashiginza'),('広尾','eki_hiroo'),('中目黒','eki_nakameguro'),
  ('代々木上原','eki_yoyogiuehara'),('表参道','eki_omotesando'),('乃木坂','eki_nogizaka'),
  ('赤坂','eki_akasaka'),('麻布十番','eki_azabujuban'),('白金台','eki_shiroganedai'),
  ('白金高輪','eki_shirokanetakanawa'),('清澄白河','eki_kiyosumishirakawa'),
  ('門前仲町','eki_monzennakacho'),('木場','eki_kiba'),('住吉','eki_sumiyoshi'),
  ('押上','eki_oshiage'),('月島','eki_tsukishima'),('豊洲','eki_toyosu'),
  ('勝どき','eki_kachidoki'),('汐留','eki_shiodome'),('天王洲アイル','eki_tennozuairu'),
  ('東京テレポート','eki_tokyoteleport'),('国際展示場','eki_kokusaitenjijo'),
  ('代官山','eki_daikanyama'),('祐天寺','eki_yutenji'),('学芸大学','eki_gakugeidaigaku'),
  ('都立大学','eki_toritsubdaigaku'),('自由が丘','eki_jiyugaoka'),('田園調布','eki_denenchofu'),
  ('武蔵小山','eki_musashikoyama'),('西小山','eki_nishikoyama'),
  ('三軒茶屋','eki_sangenjaya'),('駒沢大学','eki_komazawadaigaku'),
  ('桜新町','eki_sakurashinmachi'),('用賀','eki_yoga'),('二子玉川','eki_futakotamagawa'),
  ('旗の台','eki_hatanodai'),('大岡山','eki_okurayama'),('五反田','eki_gotanda'),
  ('戸越銀座','eki_togoshiginza'),('笹塚','eki_sasazuka'),('明大前','eki_meidaimae'),
  ('下高井戸','eki_shimotakaido'),('千歳烏山','eki_chitosekarasuyama'),
  ('調布','eki_chofu'),('府中','eki_fuchu'),('聖蹟桜ヶ丘','eki_seisekisakuragaoka'),
  ('神泉','eki_shinsen'),('下北沢','eki_shimokitazawa'),('永福町','eki_eifukucho'),
  ('久我山','eki_kugayama'),('参宮橋','eki_sanguubashi'),('代々木八幡','eki_yoyogihachiman'),
  ('東北沢','eki_higashikitazawa'),('梅ヶ丘','eki_umegaoka'),('豪徳寺','eki_goutokuji'),
  ('経堂','eki_kyodo'),('千歳船橋','eki_chitosefunabashi'),
  ('祖師ヶ谷大蔵','eki_soshigayaokura'),('成城学園前','eki_seijogakuenmae'),
  ('江古田','eki_ekoda'),('練馬','eki_nerima'),('石神井公園','eki_shakujikoen'),
  ('大泉学園','eki_oizumigakuen'),('野方','eki_nogata'),('鷺ノ宮','eki_saginomiya'),
  ('六本木','eki_roppongi'),('光が丘','eki_hikarigaoka'),
  ('初台','eki_hatsudai'),('幡ヶ谷','eki_hatagaya')
) AS t(name,slug)
JOIN area_masters am ON am.display_name=t.name AND am.prefecture='東京都' AND am.area_type='station'
WHERE NOT EXISTS (SELECT 1 FROM portal_area_params p WHERE p.area_id=am.id AND p.portal='suumo')
ON CONFLICT DO NOTHING;

INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param, verified, notes)
SELECT am.id, 'suumo', 'station_path', NULL, 'kanagawa/'||slug, false, '要確認：SUUMO駅パスの推測URL'
FROM (VALUES
  ('溝の口','eki_mizonokuchi'),('梶が谷','eki_kajigaya'),('宮崎台','eki_miyazakidai'),
  ('宮前平','eki_miyamaedaira'),('鷺沼','eki_saginuma'),('たまプラーザ','eki_tamaplaza'),
  ('あざみ野','eki_azamino'),('江田','eki_eda'),('市が尾','eki_ichigao'),
  ('藤が丘','eki_fujigaoka'),('青葉台','eki_aobadai'),('長津田','eki_nagatsuta'),
  ('中央林間','eki_chuo-rinkan'),('武蔵小杉','eki_musashikosugi'),
  ('元住吉','eki_motosumiyoshi'),('綱島','eki_tsunashima'),('大倉山','eki_okurayama'),
  ('菊名','eki_kikuna'),('妙蓮寺','eki_myorenji'),('白楽','eki_hakuraku'),
  ('反町','eki_tammachi'),('日吉','eki_hiyoshi'),('二俣川','eki_futamatagawa'),
  ('希望ヶ丘','eki_kibogaoka'),('三ツ境','eki_mitsukyou'),('瀬谷','eki_seya'),
  ('大和','eki_yamato'),('海老名','eki_ebina'),('湘南台','eki_shonandai'),
  ('向ヶ丘遊園','eki_mukogaokayuen'),('新百合ヶ丘','eki_shinyurigaoka'),
  ('鶴川','eki_tsurukawa'),('町田','eki_machida'),('相模大野','eki_sagamiono'),
  ('本厚木','eki_honatsuki'),('伊勢原','eki_isehara'),('秦野','eki_hadano'),
  ('川崎','eki_kawasaki'),('新川崎','eki_shinkawasaki'),('鶴見','eki_tsurumi'),
  ('戸塚','eki_totsuka'),('大船','eki_ofuna'),('藤沢','eki_fujisawa'),
  ('茅ヶ崎','eki_chigasaki'),('平塚','eki_hiratsuka'),
  ('みなとみらい','eki_minatomirai'),('馬車道','eki_bashamichi'),
  ('桜木町','eki_sakuragicho'),('関内','eki_kannai'),('上大岡','eki_kamiooka'),
  ('センター北','eki_center-kita'),('センター南','eki_center-minami'),
  ('金沢文庫','eki_kanazawabunko'),('金沢八景','eki_kanazawahakkei'),
  ('横須賀中央','eki_yokosukachuo'),('逗子','eki_zushi'),('鎌倉','eki_kamakura')
) AS t(name,slug)
JOIN area_masters am ON am.display_name=t.name AND am.prefecture='神奈川県' AND am.area_type='station'
WHERE NOT EXISTS (SELECT 1 FROM portal_area_params p WHERE p.area_id=am.id AND p.portal='suumo')
ON CONFLICT DO NOTHING;

-- ================================================================
-- [8] athome portal_area_params 補完
-- ================================================================
INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param, verified, notes)
SELECT am.id, 'athome', 'city_path', slug, '/tokyo/'||slug, false, '要確認：athomeシティパスの推測URL'
FROM (VALUES
  ('八王子市','hachioji-city'),('立川市','tachikawa-city'),('武蔵野市','musashino-city'),
  ('三鷹市','mitaka-city'),('青梅市','ome-city'),('府中市','fuchu-city'),
  ('昭島市','akishima-city'),('調布市','chofu-city'),('町田市','machida-city'),
  ('小金井市','koganei-city'),('小平市','kodaira-city'),('日野市','hino-city'),
  ('東村山市','higashimurayama-city'),('国分寺市','kokubunji-city'),('国立市','kunitachi-city'),
  ('福生市','fussa-city'),('狛江市','komae-city'),('東大和市','higashiyamato-city'),
  ('清瀬市','kiyose-city'),('東久留米市','higashikurume-city'),
  ('武蔵村山市','musashimurayama-city'),('多摩市','tama-city'),('稲城市','inagi-city'),
  ('羽村市','hamura-city'),('あきる野市','akiruno-city'),('西東京市','nishitokyo-city'),
  ('瑞穂町','mizuho-city'),('日の出町','hinode-city'),('奥多摩町','okutama-city')
) AS t(name,slug)
JOIN area_masters am ON am.display_name=t.name AND am.prefecture='東京都'
WHERE NOT EXISTS (SELECT 1 FROM portal_area_params p WHERE p.area_id=am.id AND p.portal='athome')
ON CONFLICT DO NOTHING;

INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param, verified, notes)
SELECT am.id, 'athome', 'city_path', slug, '/kanagawa/'||slug, false, '要確認：athome郡部シティパスの推測URL'
FROM (VALUES
  ('葉山町','hayama-city'),('寒川町','samukawa-city'),('大磯町','oiso-city'),
  ('二宮町','ninomiya-city'),('中井町','nakai-city'),('大井町','oi-city'),
  ('松田町','matsuda-city'),('山北町','yamakita-city'),('開成町','kaisei-city'),
  ('箱根町','hakone-city'),('真鶴町','manazuru-city'),('湯河原町','yugawara-city'),
  ('愛川町','aikawa-city'),('清川村','kiyokawa-city')
) AS t(name,slug)
JOIN area_masters am ON am.display_name=t.name AND am.prefecture='神奈川県'
WHERE NOT EXISTS (SELECT 1 FROM portal_area_params p WHERE p.area_id=am.id AND p.portal='athome')
ON CONFLICT DO NOTHING;

INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param, verified, notes)
SELECT am.id, 'athome', 'station_path', slug, '/tokyo/'||slug, false, '要確認：athome駅パスの推測URL'
FROM (VALUES
  ('原宿','harajuku-station'),('代々木','yoyogi-station'),('新大久保','shin-okubo-station'),
  ('目白','mejiro-station'),('大塚','otsuka-station'),('巣鴨','sugamo-station'),
  ('駒込','komagome-station'),('田端','tabata-station'),('西日暮里','nishi-nippori-station'),
  ('日暮里','nippori-station'),('鶯谷','uguisudani-station'),('御徒町','okachimachi-station'),
  ('御茶ノ水','ochanomizu-station'),('水道橋','suidobashi-station'),
  ('信濃町','shinanomachi-station'),('千駄ヶ谷','sendagaya-station'),
  ('外苑前','gaiennmae-station'),('虎ノ門','toranomon-station'),('人形町','ningyocho-station'),
  ('茅場町','kayabacho-station'),('八丁堀','hatchobori-station'),('築地','tsukiji-station'),
  ('東銀座','higashi-ginza-station'),('広尾','hiroo-station'),('中目黒','nakameguro-station'),
  ('代々木上原','yoyogi-uehara-station'),('表参道','omotesando-station'),
  ('乃木坂','nogizaka-station'),('赤坂','akasaka-station'),('麻布十番','azabu-juban-station'),
  ('白金台','shiroganedai-station'),('白金高輪','shirokanetakanawa-station'),
  ('清澄白河','kiyosumishirakawa-station'),('門前仲町','monzennakacho-station'),
  ('木場','kiba-station'),('住吉','sumiyoshi-station'),('押上','oshiage-station'),
  ('月島','tsukishima-station'),('豊洲','toyosu-station'),('勝どき','kachidoki-station'),
  ('汐留','shiodome-station'),('天王洲アイル','tennoz-isle-station'),
  ('東京テレポート','tokyo-teleport-station'),('国際展示場','kokusai-tenjijo-station'),
  ('代官山','daikanyama-station'),('祐天寺','yutenji-station'),
  ('学芸大学','gakugeidaigaku-station'),('都立大学','toritsu-daigaku-station'),
  ('自由が丘','jiyugaoka-station'),('田園調布','denenchofu-station'),
  ('武蔵小山','musashi-koyama-station'),('西小山','nishi-koyama-station'),
  ('三軒茶屋','sangenjaya-station'),('駒沢大学','komazawa-daigaku-station'),
  ('桜新町','sakura-shinmachi-station'),('用賀','yoga-station'),
  ('二子玉川','futako-tamagawa-station'),('旗の台','hatanodai-station'),
  ('大岡山','ookayama-station'),('五反田','gotanda-station'),
  ('戸越銀座','togoshi-ginza-station'),('笹塚','sasazuka-station'),
  ('明大前','meidaimae-station'),('下高井戸','shimo-takaido-station'),
  ('千歳烏山','chitose-karasuyama-station'),('調布','chofu-station'),('府中','fuchu-station'),
  ('聖蹟桜ヶ丘','seiseki-sakuragaoka-station'),('神泉','shinsen-station'),
  ('下北沢','shimokitazawa-station'),('永福町','eifukucho-station'),
  ('久我山','kugayama-station'),('参宮橋','sangubashi-station'),
  ('代々木八幡','yoyogi-hachiman-station'),('東北沢','higashi-kitazawa-station'),
  ('梅ヶ丘','umegaoka-station'),('豪徳寺','gotokuji-station'),('経堂','kyodo-station'),
  ('千歳船橋','chitose-funabashi-station'),('祖師ヶ谷大蔵','soshigaya-okura-station'),
  ('成城学園前','seijo-gakuenmae-station'),('江古田','ekoda-station'),
  ('練馬','nerima-station'),('石神井公園','shakujii-koen-station'),
  ('大泉学園','oizumi-gakuen-station'),('野方','nogata-station'),
  ('鷺ノ宮','saginomiya-station'),('六本木','roppongi-station'),
  ('光が丘','hikari-ga-oka-station'),('初台','hatsudai-station'),('幡ヶ谷','hatagaya-station')
) AS t(name,slug)
JOIN area_masters am ON am.display_name=t.name AND am.prefecture='東京都' AND am.area_type='station'
WHERE NOT EXISTS (SELECT 1 FROM portal_area_params p WHERE p.area_id=am.id AND p.portal='athome')
ON CONFLICT DO NOTHING;

INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param, verified, notes)
SELECT am.id, 'athome', 'station_path', slug, '/kanagawa/'||slug, false, '要確認：athome駅パスの推測URL'
FROM (VALUES
  ('溝の口','mizonokuchi-station'),('梶が谷','kajigaya-station'),
  ('宮崎台','miyazakidai-station'),('宮前平','miyamaedaira-station'),
  ('鷺沼','saginuma-station'),('たまプラーザ','tamaplaaza-station'),
  ('あざみ野','azamino-station'),('江田','eda-station'),('市が尾','ichigao-station'),
  ('藤が丘','fujigaoka-station'),('青葉台','aobadai-station'),('長津田','nagatsuta-station'),
  ('中央林間','chuo-rinkan-station'),('武蔵小杉','musashi-kosugi-station'),
  ('元住吉','motosumiyoshi-station'),('綱島','tsunashima-station'),
  ('大倉山','okurayama-station'),('菊名','kikuna-station'),('妙蓮寺','myorenji-station'),
  ('白楽','hakuraku-station'),('反町','tammachi-station'),('日吉','hiyoshi-station'),
  ('二俣川','futamatagawa-station'),('希望ヶ丘','kibogaoka-station'),
  ('三ツ境','mitsukyou-station'),('瀬谷','seya-station'),('大和','yamato-station'),
  ('海老名','ebina-station'),('湘南台','shonandai-station'),
  ('向ヶ丘遊園','mukogaokayuen-station'),('新百合ヶ丘','shin-yurigaoka-station'),
  ('鶴川','tsurukawa-station'),('町田','machida-station'),('相模大野','sagamiono-station'),
  ('本厚木','hon-atsugi-station'),('伊勢原','isehara-station'),('秦野','hadano-station'),
  ('川崎','kawasaki-station'),('新川崎','shin-kawasaki-station'),('鶴見','tsurumi-station'),
  ('戸塚','totsuka-station'),('大船','ofuna-station'),('藤沢','fujisawa-station'),
  ('茅ヶ崎','chigasaki-station'),('平塚','hiratsuka-station'),
  ('みなとみらい','minatomirai-station'),('馬車道','bashamichi-station'),
  ('元町・中華街','motomachi-chukagai-station'),('桜木町','sakuragicho-station'),
  ('関内','kannai-station'),('上大岡','kamiooka-station'),
  ('センター北','center-kita-station'),('センター南','center-minami-station'),
  ('金沢文庫','kanazawa-bunko-station'),('金沢八景','kanazawa-hakkei-station'),
  ('横須賀中央','yokosuka-chuo-station'),('逗子','zushi-station'),('鎌倉','kamakura-station')
) AS t(name,slug)
JOIN area_masters am ON am.display_name=t.name AND am.prefecture='神奈川県' AND am.area_type='station'
WHERE NOT EXISTS (SELECT 1 FROM portal_area_params p WHERE p.area_id=am.id AND p.portal='athome')
ON CONFLICT DO NOTHING;

-- ================================================================
-- [9] HOME'S portal_area_params 補完（athome と同一スラッグ）
-- ================================================================
INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param, verified, notes)
SELECT am.id, 'homes', 'city_path', slug, '/tokyo/'||slug, false, '要確認：HOMESシティパスの推測URL'
FROM (VALUES
  ('八王子市','hachioji-city'),('立川市','tachikawa-city'),('武蔵野市','musashino-city'),
  ('三鷹市','mitaka-city'),('青梅市','ome-city'),('府中市','fuchu-city'),
  ('昭島市','akishima-city'),('調布市','chofu-city'),('町田市','machida-city'),
  ('小金井市','koganei-city'),('小平市','kodaira-city'),('日野市','hino-city'),
  ('東村山市','higashimurayama-city'),('国分寺市','kokubunji-city'),('国立市','kunitachi-city'),
  ('福生市','fussa-city'),('狛江市','komae-city'),('東大和市','higashiyamato-city'),
  ('清瀬市','kiyose-city'),('東久留米市','higashikurume-city'),
  ('武蔵村山市','musashimurayama-city'),('多摩市','tama-city'),('稲城市','inagi-city'),
  ('羽村市','hamura-city'),('あきる野市','akiruno-city'),('西東京市','nishitokyo-city'),
  ('瑞穂町','mizuho-city'),('日の出町','hinode-city'),('奥多摩町','okutama-city')
) AS t(name,slug)
JOIN area_masters am ON am.display_name=t.name AND am.prefecture='東京都'
WHERE NOT EXISTS (SELECT 1 FROM portal_area_params p WHERE p.area_id=am.id AND p.portal='homes')
ON CONFLICT DO NOTHING;

INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param, verified, notes)
SELECT am.id, 'homes', 'city_path', slug, '/kanagawa/'||slug, false, '要確認：HOMES郡部シティパスの推測URL'
FROM (VALUES
  ('葉山町','hayama-city'),('寒川町','samukawa-city'),('大磯町','oiso-city'),
  ('二宮町','ninomiya-city'),('中井町','nakai-city'),('大井町','oi-city'),
  ('松田町','matsuda-city'),('山北町','yamakita-city'),('開成町','kaisei-city'),
  ('箱根町','hakone-city'),('真鶴町','manazuru-city'),('湯河原町','yugawara-city'),
  ('愛川町','aikawa-city'),('清川村','kiyokawa-city')
) AS t(name,slug)
JOIN area_masters am ON am.display_name=t.name AND am.prefecture='神奈川県'
WHERE NOT EXISTS (SELECT 1 FROM portal_area_params p WHERE p.area_id=am.id AND p.portal='homes')
ON CONFLICT DO NOTHING;

INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param, verified, notes)
SELECT am.id, 'homes', 'station_path', slug, '/tokyo/'||slug, false, '要確認：HOMES駅パスの推測URL'
FROM (VALUES
  ('原宿','harajuku-station'),('代々木','yoyogi-station'),('新大久保','shin-okubo-station'),
  ('目白','mejiro-station'),('大塚','otsuka-station'),('巣鴨','sugamo-station'),
  ('駒込','komagome-station'),('田端','tabata-station'),('西日暮里','nishi-nippori-station'),
  ('日暮里','nippori-station'),('鶯谷','uguisudani-station'),('御徒町','okachimachi-station'),
  ('御茶ノ水','ochanomizu-station'),('水道橋','suidobashi-station'),
  ('信濃町','shinanomachi-station'),('千駄ヶ谷','sendagaya-station'),
  ('外苑前','gaiennmae-station'),('虎ノ門','toranomon-station'),('人形町','ningyocho-station'),
  ('茅場町','kayabacho-station'),('八丁堀','hatchobori-station'),('築地','tsukiji-station'),
  ('東銀座','higashi-ginza-station'),('広尾','hiroo-station'),('中目黒','nakameguro-station'),
  ('代々木上原','yoyogi-uehara-station'),('表参道','omotesando-station'),
  ('乃木坂','nogizaka-station'),('赤坂','akasaka-station'),('麻布十番','azabu-juban-station'),
  ('白金台','shiroganedai-station'),('白金高輪','shirokanetakanawa-station'),
  ('清澄白河','kiyosumishirakawa-station'),('門前仲町','monzennakacho-station'),
  ('木場','kiba-station'),('住吉','sumiyoshi-station'),('押上','oshiage-station'),
  ('月島','tsukishima-station'),('豊洲','toyosu-station'),('勝どき','kachidoki-station'),
  ('汐留','shiodome-station'),('天王洲アイル','tennoz-isle-station'),
  ('東京テレポート','tokyo-teleport-station'),('国際展示場','kokusai-tenjijo-station'),
  ('代官山','daikanyama-station'),('祐天寺','yutenji-station'),
  ('学芸大学','gakugeidaigaku-station'),('都立大学','toritsu-daigaku-station'),
  ('自由が丘','jiyugaoka-station'),('田園調布','denenchofu-station'),
  ('武蔵小山','musashi-koyama-station'),('西小山','nishi-koyama-station'),
  ('三軒茶屋','sangenjaya-station'),('駒沢大学','komazawa-daigaku-station'),
  ('桜新町','sakura-shinmachi-station'),('用賀','yoga-station'),
  ('二子玉川','futako-tamagawa-station'),('旗の台','hatanodai-station'),
  ('大岡山','ookayama-station'),('五反田','gotanda-station'),
  ('戸越銀座','togoshi-ginza-station'),('笹塚','sasazuka-station'),
  ('明大前','meidaimae-station'),('下高井戸','shimo-takaido-station'),
  ('千歳烏山','chitose-karasuyama-station'),('調布','chofu-station'),('府中','fuchu-station'),
  ('聖蹟桜ヶ丘','seiseki-sakuragaoka-station'),('神泉','shinsen-station'),
  ('下北沢','shimokitazawa-station'),('永福町','eifukucho-station'),
  ('久我山','kugayama-station'),('参宮橋','sangubashi-station'),
  ('代々木八幡','yoyogi-hachiman-station'),('東北沢','higashi-kitazawa-station'),
  ('梅ヶ丘','umegaoka-station'),('豪徳寺','gotokuji-station'),('経堂','kyodo-station'),
  ('千歳船橋','chitose-funabashi-station'),('祖師ヶ谷大蔵','soshigaya-okura-station'),
  ('成城学園前','seijo-gakuenmae-station'),('江古田','ekoda-station'),
  ('練馬','nerima-station'),('石神井公園','shakujii-koen-station'),
  ('大泉学園','oizumi-gakuen-station'),('野方','nogata-station'),
  ('鷺ノ宮','saginomiya-station'),('六本木','roppongi-station'),
  ('光が丘','hikari-ga-oka-station'),('初台','hatsudai-station'),('幡ヶ谷','hatagaya-station')
) AS t(name,slug)
JOIN area_masters am ON am.display_name=t.name AND am.prefecture='東京都' AND am.area_type='station'
WHERE NOT EXISTS (SELECT 1 FROM portal_area_params p WHERE p.area_id=am.id AND p.portal='homes')
ON CONFLICT DO NOTHING;

INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param, verified, notes)
SELECT am.id, 'homes', 'station_path', slug, '/kanagawa/'||slug, false, '要確認：HOMES駅パスの推測URL'
FROM (VALUES
  ('溝の口','mizonokuchi-station'),('梶が谷','kajigaya-station'),
  ('宮崎台','miyazakidai-station'),('宮前平','miyamaedaira-station'),
  ('鷺沼','saginuma-station'),('たまプラーザ','tamaplaaza-station'),
  ('あざみ野','azamino-station'),('江田','eda-station'),('市が尾','ichigao-station'),
  ('藤が丘','fujigaoka-station'),('青葉台','aobadai-station'),('長津田','nagatsuta-station'),
  ('中央林間','chuo-rinkan-station'),('武蔵小杉','musashi-kosugi-station'),
  ('元住吉','motosumiyoshi-station'),('綱島','tsunashima-station'),
  ('大倉山','okurayama-station'),('菊名','kikuna-station'),('妙蓮寺','myorenji-station'),
  ('白楽','hakuraku-station'),('反町','tammachi-station'),('日吉','hiyoshi-station'),
  ('二俣川','futamatagawa-station'),('希望ヶ丘','kibogaoka-station'),
  ('三ツ境','mitsukyou-station'),('瀬谷','seya-station'),('大和','yamato-station'),
  ('海老名','ebina-station'),('湘南台','shonandai-station'),
  ('向ヶ丘遊園','mukogaokayuen-station'),('新百合ヶ丘','shin-yurigaoka-station'),
  ('鶴川','tsurukawa-station'),('町田','machida-station'),('相模大野','sagamiono-station'),
  ('本厚木','hon-atsugi-station'),('伊勢原','isehara-station'),('秦野','hadano-station'),
  ('川崎','kawasaki-station'),('新川崎','shin-kawasaki-station'),('鶴見','tsurumi-station'),
  ('戸塚','totsuka-station'),('大船','ofuna-station'),('藤沢','fujisawa-station'),
  ('茅ヶ崎','chigasaki-station'),('平塚','hiratsuka-station'),
  ('みなとみらい','minatomirai-station'),('馬車道','bashamichi-station'),
  ('元町・中華街','motomachi-chukagai-station'),('桜木町','sakuragicho-station'),
  ('関内','kannai-station'),('上大岡','kamiooka-station'),
  ('センター北','center-kita-station'),('センター南','center-minami-station'),
  ('金沢文庫','kanazawa-bunko-station'),('金沢八景','kanazawa-hakkei-station'),
  ('横須賀中央','yokosuka-chuo-station'),('逗子','zushi-station'),('鎌倉','kamakura-station')
) AS t(name,slug)
JOIN area_masters am ON am.display_name=t.name AND am.prefecture='神奈川県' AND am.area_type='station'
WHERE NOT EXISTS (SELECT 1 FROM portal_area_params p WHERE p.area_id=am.id AND p.portal='homes')
ON CONFLICT DO NOTHING;

COMMIT;

-- ================================================================
-- 登録完了確認クエリ（実行後にこの結果を確認する）
-- ================================================================
SELECT '=== area_masters 登録数 ===' AS info;
SELECT prefecture, area_type, count(*) AS 件数
FROM area_masters
WHERE prefecture IN ('東京都','神奈川県')
GROUP BY prefecture, area_type ORDER BY prefecture, area_type;

SELECT '=== portal_area_params 登録数 ===' AS info;
SELECT portal,
  count(*) AS 総件数,
  sum(CASE WHEN verified=false THEN 1 ELSE 0 END) AS 未確認件数,
  sum(CASE WHEN verified=true THEN 1 ELSE 0 END) AS 確認済み件数
FROM portal_area_params
GROUP BY portal ORDER BY portal;

SELECT '=== area_aliases 登録数 ===' AS info;
SELECT count(*) AS 総件数 FROM area_aliases;
