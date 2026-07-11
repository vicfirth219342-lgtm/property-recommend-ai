-- seed_portal_params_homes_tokyo_kanagawa.sql
-- HOME'S portal_area_params の補完
-- 旧portal_area_mappings移行SQL実行後に実行してください
-- HOME'S の URL パターンは athome と類似
--   市区: /tokyo/XXX-city, /kanagawa/XXX-city
--   駅:   /tokyo/XXX-station, /kanagawa/XXX-station
-- ほぼ athome と同じスラッグを使用（verified=false で推測）

-- ============================================================
-- 東京都 市部・郡部（homes city path）
-- ============================================================
INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param, verified, notes)
SELECT am.id, 'homes', 'city_path', slug, '/tokyo/' || slug, false, '要確認：HOMESシティパスの推測URL'
FROM (VALUES
  ('八王子市',   'hachioji-city'),
  ('立川市',     'tachikawa-city'),
  ('武蔵野市',   'musashino-city'),
  ('三鷹市',     'mitaka-city'),
  ('青梅市',     'ome-city'),
  ('府中市',     'fuchu-city'),
  ('昭島市',     'akishima-city'),
  ('調布市',     'chofu-city'),
  ('町田市',     'machida-city'),
  ('小金井市',   'koganei-city'),
  ('小平市',     'kodaira-city'),
  ('日野市',     'hino-city'),
  ('東村山市',   'higashimurayama-city'),
  ('国分寺市',   'kokubunji-city'),
  ('国立市',     'kunitachi-city'),
  ('福生市',     'fussa-city'),
  ('狛江市',     'komae-city'),
  ('東大和市',   'higashiyamato-city'),
  ('清瀬市',     'kiyose-city'),
  ('東久留米市', 'higashikurume-city'),
  ('武蔵村山市', 'musashimurayama-city'),
  ('多摩市',     'tama-city'),
  ('稲城市',     'inagi-city'),
  ('羽村市',     'hamura-city'),
  ('あきる野市', 'akiruno-city'),
  ('西東京市',   'nishitokyo-city'),
  -- 郡部
  ('瑞穂町',     'mizuho-city'),
  ('日の出町',   'hinode-city'),
  ('檜原村',     'hinohara-city'),
  ('奥多摩町',   'okutama-city')
) AS t(name, slug)
JOIN area_masters am ON am.display_name = t.name AND am.prefecture = '東京都'
WHERE NOT EXISTS (
  SELECT 1 FROM portal_area_params p
  WHERE p.area_id = am.id AND p.portal = 'homes'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 神奈川県 郡部（homes city path）
-- ============================================================
INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param, verified, notes)
SELECT am.id, 'homes', 'city_path', slug, '/kanagawa/' || slug, false, '要確認：HOMES郡部シティパスの推測URL'
FROM (VALUES
  ('葉山町',   'hayama-city'),
  ('寒川町',   'samukawa-city'),
  ('大磯町',   'oiso-city'),
  ('二宮町',   'ninomiya-city'),
  ('中井町',   'nakai-city'),
  ('大井町',   'oi-city'),
  ('松田町',   'matsuda-city'),
  ('山北町',   'yamakita-city'),
  ('開成町',   'kaisei-city'),
  ('箱根町',   'hakone-city'),
  ('真鶴町',   'manazuru-city'),
  ('湯河原町', 'yugawara-city'),
  ('愛川町',   'aikawa-city'),
  ('清川村',   'kiyokawa-city')
) AS t(name, slug)
JOIN area_masters am ON am.display_name = t.name AND am.prefecture = '神奈川県'
WHERE NOT EXISTS (
  SELECT 1 FROM portal_area_params p
  WHERE p.area_id = am.id AND p.portal = 'homes'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 東京都 主要新規駅（homes station_path 推測URL、verified=false）
-- ============================================================
INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param, verified, notes)
SELECT am.id, 'homes', 'station_path', slug, '/tokyo/' || slug, false, '要確認：HOMES駅パスの推測URL'
FROM (VALUES
  ('原宿',       'harajuku-station'),
  ('代々木',     'yoyogi-station'),
  ('新大久保',   'shin-okubo-station'),
  ('目白',       'mejiro-station'),
  ('大塚',       'otsuka-station'),
  ('巣鴨',       'sugamo-station'),
  ('駒込',       'komagome-station'),
  ('田端',       'tabata-station'),
  ('西日暮里',   'nishi-nippori-station'),
  ('日暮里',     'nippori-station'),
  ('鶯谷',       'uguisudani-station'),
  ('御徒町',     'okachimachi-station'),
  ('御茶ノ水',   'ochanomizu-station'),
  ('水道橋',     'suidobashi-station'),
  ('信濃町',     'shinanomachi-station'),
  ('千駄ヶ谷',   'sendagaya-station'),
  ('武蔵境',     'musashi-sakai-station'),
  ('国分寺',     'kokubunji-station'),
  ('国立',       'kunitachi-station'),
  ('立川',       'tachikawa-station'),
  ('八王子',     'hachioji-station'),
  ('錦糸町',     'kinshicho-station'),
  ('亀戸',       'kameido-station'),
  ('王子',       'oji-station'),
  ('赤羽',       'akabane-station'),
  ('亀有',       'kameari-station'),
  ('外苑前',     'gaiennmae-station'),
  ('虎ノ門',     'toranomon-station'),
  ('人形町',     'ningyocho-station'),
  ('茅場町',     'kayabacho-station'),
  ('八丁堀',     'hatchobori-station'),
  ('築地',       'tsukiji-station'),
  ('東銀座',     'higashi-ginza-station'),
  ('広尾',       'hiroo-station'),
  ('中目黒',     'nakameguro-station'),
  ('代々木上原', 'yoyogi-uehara-station'),
  ('代々木公園', 'yoyogi-koen-station'),
  ('明治神宮前', 'meijijinguumae-station'),
  ('表参道',     'omotesando-station'),
  ('乃木坂',     'nogizaka-station'),
  ('赤坂',       'akasaka-station'),
  ('麻布十番',   'azabu-juban-station'),
  ('六本木',     'roppongi-station'),
  ('月島',       'tsukishima-station'),
  ('豊洲',       'toyosu-station'),
  ('白金台',     'shiroganedai-station'),
  ('白金高輪',   'shirokanetakanawa-station'),
  ('清澄白河',   'kiyosumishirakawa-station'),
  ('門前仲町',   'monzennakacho-station'),
  ('木場',       'kiba-station'),
  ('住吉',       'sumiyoshi-station'),
  ('押上',       'oshiage-station'),
  ('神泉',       'shinsen-station'),
  ('下北沢',     'shimokitazawa-station'),
  ('勝どき',     'kachidoki-station'),
  ('汐留',       'shiodome-station'),
  ('大門',       'daimon-station'),
  ('赤羽橋',     'akabane-bashi-station'),
  ('青山一丁目', 'aoyama-itchome-station'),
  ('光が丘',     'hikari-ga-oka-station'),
  ('天王洲アイル','tennoz-isle-station'),
  ('東京テレポート','tokyo-teleport-station'),
  ('国際展示場', 'kokusai-tenjijo-station'),
  ('代官山',     'daikanyama-station'),
  ('祐天寺',     'yutenji-station'),
  ('学芸大学',   'gakugeidaigaku-station'),
  ('都立大学',   'toritsu-daigaku-station'),
  ('自由が丘',   'jiyugaoka-station'),
  ('田園調布',   'denenchofu-station'),
  ('武蔵小山',   'musashi-koyama-station'),
  ('西小山',     'nishi-koyama-station'),
  ('三軒茶屋',   'sangenjaya-station'),
  ('駒沢大学',   'komazawa-daigaku-station'),
  ('桜新町',     'sakura-shinmachi-station'),
  ('用賀',       'yoga-station'),
  ('二子玉川',   'futako-tamagawa-station'),
  ('旗の台',     'hatanodai-station'),
  ('大岡山',     'ookayama-station'),
  ('五反田',     'gotanda-station'),
  ('戸越銀座',   'togoshi-ginza-station'),
  ('笹塚',       'sasazuka-station'),
  ('明大前',     'meidaimae-station'),
  ('下高井戸',   'shimo-takaido-station'),
  ('桜上水',     'sakurajosui-station'),
  ('千歳烏山',   'chitose-karasuyama-station'),
  ('調布',       'chofu-station'),
  ('府中',       'fuchu-station'),
  ('聖蹟桜ヶ丘', 'seiseki-sakuragaoka-station'),
  ('永福町',     'eifukucho-station'),
  ('久我山',     'kugayama-station'),
  ('参宮橋',     'sangubashi-station'),
  ('代々木八幡', 'yoyogi-hachiman-station'),
  ('東北沢',     'higashi-kitazawa-station'),
  ('梅ヶ丘',     'umegaoka-station'),
  ('豪徳寺',     'gotokuji-station'),
  ('経堂',       'kyodo-station'),
  ('千歳船橋',   'chitose-funabashi-station'),
  ('祖師ヶ谷大蔵','soshigaya-okura-station'),
  ('成城学園前', 'seijo-gakuenmae-station'),
  ('江古田',     'ekoda-station'),
  ('練馬',       'nerima-station'),
  ('石神井公園', 'shakujii-koen-station'),
  ('大泉学園',   'oizumi-gakuen-station'),
  ('野方',       'nogata-station'),
  ('鷺ノ宮',     'saginomiya-station')
) AS t(name, slug)
JOIN area_masters am ON am.display_name = t.name AND am.prefecture = '東京都' AND am.area_type = 'station'
WHERE NOT EXISTS (
  SELECT 1 FROM portal_area_params p
  WHERE p.area_id = am.id AND p.portal = 'homes'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 神奈川県 主要新規駅（homes station_path 推測URL、verified=false）
-- ============================================================
INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param, verified, notes)
SELECT am.id, 'homes', 'station_path', slug, '/kanagawa/' || slug, false, '要確認：HOMES駅パスの推測URL'
FROM (VALUES
  ('溝の口',     'mizonokuchi-station'),
  ('梶が谷',     'kajigaya-station'),
  ('宮崎台',     'miyazakidai-station'),
  ('宮前平',     'miyamaedaira-station'),
  ('鷺沼',       'saginuma-station'),
  ('たまプラーザ','tamaplaaza-station'),
  ('あざみ野',   'azamino-station'),
  ('江田',       'eda-station'),
  ('市が尾',     'ichigao-station'),
  ('藤が丘',     'fujigaoka-station'),
  ('青葉台',     'aobadai-station'),
  ('長津田',     'nagatsuta-station'),
  ('中央林間',   'chuo-rinkan-station'),
  ('武蔵小杉',   'musashi-kosugi-station'),
  ('元住吉',     'motosumiyoshi-station'),
  ('綱島',       'tsunashima-station'),
  ('大倉山',     'okurayama-station'),
  ('菊名',       'kikuna-station'),
  ('妙蓮寺',     'myorenji-station'),
  ('白楽',       'hakuraku-station'),
  ('日吉',       'hiyoshi-station'),
  ('二俣川',     'futamatagawa-station'),
  ('希望ヶ丘',   'kibogaoka-station'),
  ('三ツ境',     'mitsukyou-station'),
  ('瀬谷',       'seya-station'),
  ('大和',       'yamato-station'),
  ('海老名',     'ebina-station'),
  ('湘南台',     'shonandai-station'),
  ('向ヶ丘遊園', 'mukogaokayuen-station'),
  ('新百合ヶ丘', 'shin-yurigaoka-station'),
  ('鶴川',       'tsurukawa-station'),
  ('町田',       'machida-station'),
  ('相模大野',   'sagamiono-station'),
  ('本厚木',     'hon-atsugi-station'),
  ('伊勢原',     'isehara-station'),
  ('秦野',       'hadano-station'),
  ('川崎',       'kawasaki-station'),
  ('新川崎',     'shin-kawasaki-station'),
  ('鶴見',       'tsurumi-station'),
  ('横浜',       'yokohama-station'),
  ('戸塚',       'totsuka-station'),
  ('大船',       'ofuna-station'),
  ('藤沢',       'fujisawa-station'),
  ('茅ヶ崎',     'chigasaki-station'),
  ('平塚',       'hiratsuka-station'),
  ('みなとみらい','minatomirai-station'),
  ('馬車道',     'bashamichi-station'),
  ('元町・中華街','motomachi-chukagai-station'),
  ('桜木町',     'sakuragicho-station'),
  ('関内',       'kannai-station'),
  ('上大岡',     'kamiooka-station'),
  ('センター北', 'center-kita-station'),
  ('センター南', 'center-minami-station'),
  ('金沢文庫',   'kanazawa-bunko-station'),
  ('金沢八景',   'kanazawa-hakkei-station'),
  ('逗子',       'zushi-station'),
  ('横須賀',     'yokosuka-station')
) AS t(name, slug)
JOIN area_masters am ON am.display_name = t.name AND am.prefecture = '神奈川県' AND am.area_type = 'station'
WHERE NOT EXISTS (
  SELECT 1 FROM portal_area_params p
  WHERE p.area_id = am.id AND p.portal = 'homes'
)
ON CONFLICT DO NOTHING;
