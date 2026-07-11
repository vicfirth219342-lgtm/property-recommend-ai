-- seed_portal_params_suumo_tokyo_kanagawa.sql
-- SUUMO portal_area_params の補完
-- 旧portal_area_mappings移行SQL実行後に実行してください
-- 東京都市部（26市）・郡部、神奈川郡部、主要駅の station_path を追加
-- 旧マスターに存在しないエリアを対象（ON CONFLICT DO NOTHING で重複スキップ）
--
-- SUUMO 市区コード体系:
--   東京都23区: ta=13&sc=13101〜13123
--   東京都市部: ta=13&sc=13201〜
--   神奈川: ta=14&sc=14XXX
--   SUUMO 駅 station_path: tokyo/eki_ROMAJI, kanagawa/eki_ROMAJI

-- ============================================================
-- 東京都 市部・郡部（SUUMO query型）
-- ============================================================
INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param, verified, notes)
SELECT am.id, 'suumo', 'query', code, 'ta=13&sc=' || code, true, 'SUUMOシティコード（公開情報）'
FROM (VALUES
  ('八王子市', '13201'),
  ('立川市',   '13202'),
  ('武蔵野市', '13203'),
  ('三鷹市',   '13204'),
  ('青梅市',   '13205'),
  ('府中市',   '13206'),
  ('昭島市',   '13207'),
  ('調布市',   '13208'),
  ('町田市',   '13209'),
  ('小金井市', '13210'),
  ('小平市',   '13211'),
  ('日野市',   '13212'),
  ('東村山市', '13213'),
  ('国分寺市', '13214'),
  ('国立市',   '13215'),
  ('福生市',   '13218'),
  ('狛江市',   '13219'),
  ('東大和市', '13220'),
  ('清瀬市',   '13221'),
  ('東久留米市','13222'),
  ('武蔵村山市','13223'),
  ('多摩市',   '13224'),
  ('稲城市',   '13225'),
  ('羽村市',   '13228'),
  ('あきる野市','13229'),
  ('西東京市', '13230'),
  -- 東京都郡部
  ('瑞穂町',   '13303'),
  ('日の出町', '13305'),
  ('檜原村',   '13307'),
  ('奥多摩町', '13308')
) AS t(name, code)
JOIN area_masters am ON am.display_name = t.name AND am.prefecture = '東京都'
WHERE NOT EXISTS (
  SELECT 1 FROM portal_area_params p
  WHERE p.area_id = am.id AND p.portal = 'suumo'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 神奈川県 郡部（SUUMO query型）
-- ============================================================
INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param, verified, notes)
SELECT am.id, 'suumo', 'query', code, 'ta=14&sc=' || code, true, 'SUUMOシティコード（公開情報）'
FROM (VALUES
  ('葉山町',   '14301'),
  ('寒川町',   '14321'),
  ('大磯町',   '14341'),
  ('二宮町',   '14342'),
  ('中井町',   '14361'),
  ('大井町',   '14362'),
  ('松田町',   '14363'),
  ('山北町',   '14364'),
  ('開成町',   '14365'),
  ('箱根町',   '14382'),
  ('真鶴町',   '14383'),
  ('湯河原町', '14384'),
  ('愛川町',   '14401'),
  ('清川村',   '14402')
) AS t(name, code)
JOIN area_masters am ON am.display_name = t.name AND am.prefecture = '神奈川県'
WHERE NOT EXISTS (
  SELECT 1 FROM portal_area_params p
  WHERE p.area_id = am.id AND p.portal = 'suumo'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 東京都 主要新規駅（SUUMO station_path 推測URL、verified=false）
-- ============================================================
INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param, verified, notes)
SELECT am.id, 'suumo', 'station_path', NULL, 'tokyo/' || slug, false, '要確認：SUUMO駅パスの推測URL'
FROM (VALUES
  -- JR山手線・中央線等
  ('原宿',      'eki_harajuku'),
  ('代々木',    'eki_yoyogi'),
  ('新大久保',  'eki_shinokubo'),
  ('目白',      'eki_mejiro'),
  ('大塚',      'eki_otsuka'),
  ('巣鴨',      'eki_sugamo'),
  ('駒込',      'eki_komagome'),
  ('田端',      'eki_tabata'),
  ('西日暮里',  'eki_nishinippori'),
  ('日暮里',    'eki_nippori'),
  ('鶯谷',      'eki_uguisudani'),
  ('御徒町',    'eki_okachimachi'),
  ('御茶ノ水',  'eki_ochanomizu'),
  ('水道橋',    'eki_suidobashi'),
  ('信濃町',    'eki_shinanomachi'),
  ('千駄ヶ谷',  'eki_sendagaya'),
  ('武蔵境',    'eki_musashisakai'),
  ('国分寺',    'eki_kokubunji'),
  ('国立',      'eki_kunitachi'),
  ('立川',      'eki_tachikawa'),
  ('八王子',    'eki_hachioji'),
  -- JR総武線・常磐線
  ('錦糸町',    'eki_kinshicho'),
  ('亀戸',      'eki_kameido'),
  ('王子',      'eki_oji'),
  ('赤羽',      'eki_akabane'),
  ('亀有',      'eki_kameari'),
  ('金町',      'eki_kanamachi'),
  -- 東京メトロ
  ('外苑前',    'eki_gaiennmae'),
  ('虎ノ門',    'eki_toranomon'),
  ('京橋',      'eki_kyobashi'),
  ('人形町',    'eki_ningyocho'),
  ('茅場町',    'eki_kayabacho'),
  ('八丁堀',    'eki_hatchobori'),
  ('築地',      'eki_tsukiji'),
  ('東銀座',    'eki_higashiginza'),
  ('広尾',      'eki_hiroo'),
  ('中目黒',    'eki_nakameguro'),
  ('代々木上原','eki_yoyogiuehara'),
  ('代々木公園','eki_yoyogikoen'),
  ('明治神宮前','eki_meijijinguumae'),
  ('表参道',    'eki_omotesando'),
  ('乃木坂',    'eki_nogizaka'),
  ('赤坂',      'eki_akasaka'),
  ('麻布十番',  'eki_azabujuban'),
  ('六本木',    'eki_roppongi'),
  ('月島',      'eki_tsukishima'),
  ('豊洲',      'eki_toyosu'),
  ('白金台',    'eki_shiroganedai'),
  ('白金高輪',  'eki_shirokanetakanawa'),
  ('清澄白河',  'eki_kiyosumishirakawa'),
  ('門前仲町',  'eki_monzennakacho'),
  ('木場',      'eki_kiba'),
  ('住吉',      'eki_sumiyoshi'),
  ('押上',      'eki_oshiage'),
  ('神泉',      'eki_shinsen'),
  ('駒場東大前','eki_komabatodalimae'),
  ('下北沢',    'eki_shimokitazawa'),
  -- 都営大江戸線
  ('勝どき',    'eki_kachidoki'),
  ('汐留',      'eki_shiodome'),
  ('大門',      'eki_daimon'),
  ('赤羽橋',    'eki_akabanebashi'),
  ('麻布十番',  'eki_azabujuban'),
  ('青山一丁目','eki_aoyamaitchome'),
  ('国立競技場','eki_kokuritsukyogijo'),
  ('光が丘',    'eki_hikarigaoka'),
  -- りんかい線
  ('天王洲アイル','eki_tennozuairu'),
  ('東京テレポート','eki_tokyotereport'),
  ('国際展示場','eki_kokusaitenjijo'),
  -- 東急
  ('代官山',    'eki_daikanyama'),
  ('祐天寺',    'eki_yutenji'),
  ('学芸大学',  'eki_gakugeidaigaku'),
  ('都立大学',  'eki_toritsubdaigaku'),
  ('自由が丘',  'eki_jiyugaoka'),
  ('田園調布',  'eki_denenchofu'),
  ('武蔵小山',  'eki_musashikoyama'),
  ('西小山',    'eki_nishikoyama'),
  ('洗足',      'eki_senzoku'),
  ('三軒茶屋',  'eki_sangenjaya'),
  ('駒沢大学',  'eki_komazawadaigaku'),
  ('桜新町',    'eki_sakurashinmachi'),
  ('用賀',      'eki_yoga'),
  ('二子玉川',  'eki_futakotamagawa'),
  ('旗の台',    'eki_hatanodai'),
  ('大岡山',    'eki_ookurayama'),
  ('五反田',    'eki_gotanda'),
  ('戸越銀座',  'eki_togoshiginza'),
  -- 京王
  ('笹塚',      'eki_sasazuka'),
  ('明大前',    'eki_meidaimae'),
  ('下高井戸',  'eki_shimotakaido'),
  ('桜上水',    'eki_sakurajosui'),
  ('千歳烏山',  'eki_chitosekarasuyama'),
  ('調布',      'eki_chofu'),
  ('府中',      'eki_fuchu'),
  ('聖蹟桜ヶ丘','eki_seisekisakuragaoka'),
  ('永福町',    'eki_eifukucho'),
  ('久我山',    'eki_kugayama'),
  -- 小田急
  ('参宮橋',    'eki_sanguubashi'),
  ('代々木八幡','eki_yoyogihachiman'),
  ('東北沢',    'eki_higashikitazawa'),
  ('梅ヶ丘',    'eki_umegaoka'),
  ('豪徳寺',    'eki_goutokuji'),
  ('経堂',      'eki_kyodo'),
  ('千歳船橋',  'eki_chitosefunabashi'),
  ('祖師ヶ谷大蔵','eki_soshigayaokura'),
  ('成城学園前','eki_seijogakuenmae'),
  -- 西武
  ('江古田',    'eki_ekoda'),
  ('練馬',      'eki_nerima'),
  ('石神井公園','eki_shakujikoen'),
  ('大泉学園',  'eki_oizumigakuen'),
  ('野方',      'eki_nogata'),
  ('鷺ノ宮',    'eki_saginomiya')
) AS t(name, slug)
JOIN area_masters am ON am.display_name = t.name AND am.prefecture = '東京都' AND am.area_type = 'station'
WHERE NOT EXISTS (
  SELECT 1 FROM portal_area_params p
  WHERE p.area_id = am.id AND p.portal = 'suumo'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 神奈川県 主要新規駅（SUUMO station_path 推測URL、verified=false）
-- ============================================================
INSERT INTO portal_area_params (area_id, portal, param_type, portal_code, portal_url_param, verified, notes)
SELECT am.id, 'suumo', 'station_path', NULL, 'kanagawa/' || slug, false, '要確認：SUUMO駅パスの推測URL'
FROM (VALUES
  -- 東急田園都市線
  ('溝の口',      'eki_mizonokuchi'),
  ('梶が谷',      'eki_kajigaya'),
  ('宮崎台',      'eki_miyazakidai'),
  ('宮前平',      'eki_miyamaedaira'),
  ('鷺沼',        'eki_saginuma'),
  ('たまプラーザ','eki_tamaplaza'),
  ('あざみ野',    'eki_azamino'),
  ('江田',        'eki_eda'),
  ('市が尾',      'eki_ichigao'),
  ('藤が丘',      'eki_fujigaoka'),
  ('青葉台',      'eki_aobadai'),
  ('長津田',      'eki_nagatsuta'),
  ('中央林間',    'eki_chuo-rinkan'),
  -- 東急東横線
  ('武蔵小杉',    'eki_musashikosugi'),
  ('元住吉',      'eki_motosumiyoshi'),
  ('綱島',        'eki_tsunashima'),
  ('大倉山',      'eki_okurayama'),
  ('菊名',        'eki_kikuna'),
  ('妙蓮寺',      'eki_myorenji'),
  ('白楽',        'eki_hakuraku'),
  ('反町',        'eki_tammachi'),
  ('日吉',        'eki_hiyoshi'),
  -- 相鉄線
  ('二俣川',      'eki_futamatagawa'),
  ('希望ヶ丘',    'eki_kibogaoka'),
  ('三ツ境',      'eki_mitsukyou'),
  ('瀬谷',        'eki_seya'),
  ('大和',        'eki_yamato'),
  ('海老名',      'eki_ebina'),
  ('湘南台',      'eki_shonandai'),
  -- 小田急
  ('向ヶ丘遊園',  'eki_mukogaokayuen'),
  ('新百合ヶ丘',  'eki_shinyurigaoka'),
  ('鶴川',        'eki_tsurukawa'),
  ('町田',        'eki_machida'),
  ('相模大野',    'eki_sagamiono'),
  ('本厚木',      'eki_honatsuki'),
  ('海老名',      'eki_ebina'),
  ('伊勢原',      'eki_isehara'),
  ('秦野',        'eki_hadano'),
  ('新松田',      'eki_shinmatsuda'),
  -- JR
  ('川崎',        'eki_kawasaki'),
  ('新川崎',      'eki_shinkawasaki'),
  ('鶴見',        'eki_tsurumi'),
  ('横浜',        'eki_yokohama'),
  ('戸塚',        'eki_totsuka'),
  ('大船',        'eki_ofuna'),
  ('藤沢',        'eki_fujisawa'),
  ('茅ヶ崎',      'eki_chigasaki'),
  ('平塚',        'eki_hiratsuka'),
  -- みなとみらい線
  ('みなとみらい', 'eki_minatomirai'),
  ('馬車道',      'eki_bashamichi'),
  ('元町・中華街', 'eki_motomachi-chukagai'),
  ('桜木町',      'eki_sakuragicho'),
  ('関内',        'eki_kannai'),
  ('上大岡',      'eki_kamioooka'),
  -- 市営地下鉄
  ('センター北',  'eki_center-kita'),
  ('センター南',  'eki_center-minami'),
  ('あざみ野',    'eki_azamino'),
  -- 京急
  ('横浜',        'eki_yokohama'),
  ('上大岡',      'eki_kamiooka'),
  ('金沢文庫',    'eki_kanazawabunko'),
  ('金沢八景',    'eki_kanazawahakkei')
) AS t(name, slug)
JOIN area_masters am ON am.display_name = t.name AND am.prefecture = '神奈川県' AND am.area_type = 'station'
WHERE NOT EXISTS (
  SELECT 1 FROM portal_area_params p
  WHERE p.area_id = am.id AND p.portal = 'suumo'
)
ON CONFLICT DO NOTHING;
