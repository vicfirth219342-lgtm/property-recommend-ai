-- ============================================================
-- fix_missing_portal_params.sql
-- 生成日時: 2026-07-09T11:47:21.789Z
-- 未登録: 274 件のINSERT (スラグ推測可能分のみ)
-- スラグ不明のため除外: 0 件
-- ⚠️  verified=false で登録。URLを目視確認後 verified=true に更新してください
-- INSERT専用版（ON CONFLICT / ALTER TABLE なし）
-- 欠落分のみ対象のため重複は発生しません
-- ============================================================

-- ── SUUMO (63件) ─────────────────────────────────────
INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('4ef817e1-ba6f-4894-a56e-7f45f7c462d5', 'suumo', 'station_path', 'tokyo/eki_oimachi', false, '要確認：自動生成 2026-07-09');  -- 大井町 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('077eb4a4-80b3-403d-b7b8-abd8850bb48c', 'suumo', 'station_path', 'tokyo/eki_meijijingumae', false, '要確認：自動生成 2026-07-09');  -- 明治神宮前 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('4613ccf0-bf5d-419f-89ea-2b192aaf6ead', 'suumo', 'station_path', 'tokyo/eki_yushima', false, '要確認：自動生成 2026-07-09');  -- 湯島 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('b0749096-ddb2-4198-946f-b211c90fd866', 'suumo', 'station_path', 'tokyo/eki_nezu', false, '要確認：自動生成 2026-07-09');  -- 根津 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('e79c2dc3-66bf-4063-a95a-bc345c1dfebb', 'suumo', 'station_path', 'tokyo/eki_sendagi', false, '要確認：自動生成 2026-07-09');  -- 千駄木 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('bede82e2-3cc8-4dd2-b6c6-30b907be1413', 'suumo', 'station_path', 'tokyo/eki_machiya', false, '要確認：自動生成 2026-07-09');  -- 町屋 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('ab6ed659-bf7d-412d-bfb4-78c78f7ff6ce', 'suumo', 'station_path', 'tokyo/eki_kyobashi', false, '要確認：自動生成 2026-07-09');  -- 京橋 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('dff43dc4-48f2-4f63-8f04-288c874c56b1', 'suumo', 'station_path', 'tokyo/eki_asakusa', false, '要確認：自動生成 2026-07-09');  -- 浅草 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('5171c395-02c8-414c-be35-0c0a371799fa', 'suumo', 'station_path', 'tokyo/eki_hibiya', false, '要確認：自動生成 2026-07-09');  -- 日比谷 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('738b4406-f0ce-47bf-950c-d6ad55e081f0', 'suumo', 'station_path', 'tokyo/eki_waseda', false, '要確認：自動生成 2026-07-09');  -- 早稲田 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('d310cd93-9654-4a42-86d3-e448a0352f76', 'suumo', 'station_path', 'tokyo/eki_kagurazaka', false, '要確認：自動生成 2026-07-09');  -- 神楽坂 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('2751079e-871e-47a1-806c-c1d2da7ff168', 'suumo', 'station_path', 'tokyo/eki_kudanshita', false, '要確認：自動生成 2026-07-09');  -- 九段下 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('c33f9860-ffaa-4f81-8474-e96026a93f7c', 'suumo', 'station_path', 'tokyo/eki_suitengumae', false, '要確認：自動生成 2026-07-09');  -- 水天宮前 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('6b3d9b82-051b-4aba-85ee-2744f1a55f54', 'suumo', 'station_path', 'tokyo/eki_hanzomon', false, '要確認：自動生成 2026-07-09');  -- 半蔵門 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('85d28497-d73f-4aaf-bad0-ae043b0c0ca9', 'suumo', 'station_path', 'tokyo/eki_jimbocho', false, '要確認：自動生成 2026-07-09');  -- 神保町 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('2bed4e13-4af1-46ea-96a1-b4809a2033e9', 'suumo', 'station_path', 'tokyo/eki_honkomagome', false, '要確認：自動生成 2026-07-09');  -- 本駒込 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('78ee2810-191a-4ac9-adc8-9db6bd923c11', 'suumo', 'station_path', 'tokyo/eki_nishigahara', false, '要確認：自動生成 2026-07-09');  -- 西ヶ原 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('d61a7e9d-3be6-4d09-889b-f99600b2cb62', 'suumo', 'station_path', 'tokyo/eki_akabaneiwabuchi', false, '要確認：自動生成 2026-07-09');  -- 赤羽岩淵 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('800ff462-52de-4c6d-b442-afa087c025e3', 'suumo', 'station_path', 'tokyo/eki_daimon', false, '要確認：自動生成 2026-07-09');  -- 大門 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('6b206586-5061-482f-b560-efc703500653', 'suumo', 'station_path', 'tokyo/eki_shibakoen', false, '要確認：自動生成 2026-07-09');  -- 芝公園 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('9ded7be6-3c02-448b-8a72-ddb958a44b5f', 'suumo', 'station_path', 'tokyo/eki_onarimon', false, '要確認：自動生成 2026-07-09');  -- 御成門 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('924548d9-8af1-4a75-9a3e-a998d435aa89', 'suumo', 'station_path', 'tokyo/eki_kasuga', false, '要確認：自動生成 2026-07-09');  -- 春日 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('b65458f7-54a6-4590-a344-a1e4087dcbcd', 'suumo', 'station_path', 'tokyo/eki_sengoku', false, '要確認：自動生成 2026-07-09');  -- 千石 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('210d4216-eac8-45d7-b733-37da814912ea', 'suumo', 'station_path', 'tokyo/eki_nishisugamo', false, '要確認：自動生成 2026-07-09');  -- 西巣鴨 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('bff334ad-28c9-4657-80f9-1b3704f58522', 'suumo', 'station_path', 'tokyo/eki_takashimadaira', false, '要確認：自動生成 2026-07-09');  -- 高島平 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('dbcbaba1-0fc9-41e0-86ad-bc1dce4be3ce', 'suumo', 'station_path', 'tokyo/eki_morishita', false, '要確認：自動生成 2026-07-09');  -- 森下 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('01418c95-0c40-4cbb-8dba-b1194981dcaa', 'suumo', 'station_path', 'tokyo/eki_kikukawa', false, '要確認：自動生成 2026-07-09');  -- 菊川 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('1ff032d0-0387-4a14-be4a-6ee6e91025bd', 'suumo', 'station_path', 'tokyo/eki_bakuroyokoyama', false, '要確認：自動生成 2026-07-09');  -- 馬喰横山 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('bcc99d36-c0f5-4c8c-8bb1-09900d1cc29e', 'suumo', 'station_path', 'tokyo/eki_iwamotocho', false, '要確認：自動生成 2026-07-09');  -- 岩本町 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('fbc4632f-4c7b-45f9-97d3-a5f2be6ae029', 'suumo', 'station_path', 'tokyo/eki_akebonobashi', false, '要確認：自動生成 2026-07-09');  -- 曙橋 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('4d71ce2a-bbfc-40ab-a40c-1c850d374413', 'suumo', 'station_path', 'tokyo/eki_daitabashi', false, '要確認：自動生成 2026-07-09');  -- 代田橋 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('d0792046-97f6-4cfe-8414-0c6b26fac687', 'suumo', 'station_path', 'tokyo/eki_sakurajosui', false, '要確認：自動生成 2026-07-09');  -- 桜上水 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('fbb045af-1a8f-4c28-a54c-4f27c4b71432', 'suumo', 'station_path', 'tokyo/eki_ryogoku', false, '要確認：自動生成 2026-07-09');  -- 両国 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('d6b74e88-d812-453b-83ef-f4de2fecfff7', 'suumo', 'station_path', 'tokyo/eki_shinkiba', false, '要確認：自動生成 2026-07-09');  -- 新木場 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('e7e05da7-c805-4d58-85c4-f1257b9a8f1a', 'suumo', 'station_path', 'tokyo/eki_komabatoddaimae', false, '要確認：自動生成 2026-07-09');  -- 駒場東大前 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('e29987c8-58ed-455c-bfe6-d76e98040575', 'suumo', 'station_path', 'tokyo/eki_komae', false, '要確認：自動生成 2026-07-09');  -- 狛江 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('3fcee996-bb49-440e-9bc0-252eec0b5a02', 'suumo', 'station_path', 'tokyo/eki_tachikawakit', false, '要確認：自動生成 2026-07-09');  -- 立川北 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('62d6ff7a-3060-44ad-8383-b9577d74ab56', 'suumo', 'station_path', 'tokyo/eki_yoyogikouen', false, '要確認：自動生成 2026-07-09');  -- 代々木公園 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('f281ada7-d5a9-4b43-b6fc-eea62224e07f', 'suumo', 'station_path', 'tokyo/eki_akabanebashi', false, '要確認：自動生成 2026-07-09');  -- 赤羽橋 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('02c830e1-5856-44bc-b611-5492cd640705', 'suumo', 'station_path', 'tokyo/eki_sengakuji', false, '要確認：自動生成 2026-07-09');  -- 泉岳寺 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('5dbab126-042f-4d3e-a375-b3e6786f2c47', 'suumo', 'station_path', 'tokyo/eki_kamiyacho', false, '要確認：自動生成 2026-07-09');  -- 神谷町 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('e4c2791a-c4b2-4c20-812f-ed58ce10c12c', 'suumo', 'station_path', 'tokyo/eki_roppongiiichome', false, '要確認：自動生成 2026-07-09');  -- 六本木一丁目 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('0706c05a-a085-4878-9e6b-9f020497c4b9', 'suumo', 'station_path', 'tokyo/eki_tameikesanno', false, '要確認：自動生成 2026-07-09');  -- 溜池山王 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('a77c394b-bfc7-4f3f-add3-db5c7a35f57c', 'suumo', 'station_path', 'tokyo/eki_shinjukusanchome', false, '要確認：自動生成 2026-07-09');  -- 新宿三丁目 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('672e08b2-939d-417c-924e-bae2109bddc6', 'suumo', 'station_path', 'tokyo/eki_wakamatsu-kawada', false, '要確認：自動生成 2026-07-09');  -- 若松河田 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('398fcf39-303d-4cdc-a0a1-0fb1c631af5b', 'suumo', 'station_path', 'tokyo/eki_ushigome-kagurazaka', false, '要確認：自動生成 2026-07-09');  -- 牛込神楽坂 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('b876486b-613e-487a-a0d6-ae3263b257c8', 'suumo', 'station_path', 'tokyo/eki_nagatacho', false, '要確認：自動生成 2026-07-09');  -- 永田町 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('cbd1abd6-076e-453b-85e8-bebfdb6924ff', 'suumo', 'station_path', 'tokyo/eki_kasumigaseki', false, '要確認：自動生成 2026-07-09');  -- 霞ヶ関 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('c9b4f9e7-96bc-45bb-acaa-2e2bec76c1f5', 'suumo', 'station_path', 'tokyo/eki_nijubashimae', false, '要確認：自動生成 2026-07-09');  -- 二重橋前 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('c57b3220-1572-4db2-8c4a-129eca3dd503', 'suumo', 'station_path', 'tokyo/eki_senzoku', false, '要確認：自動生成 2026-07-09');  -- 洗足 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('aa167ca2-f409-44af-8d9b-cf9e877ee332', 'suumo', 'station_path', 'tokyo/eki_hongosanchome', false, '要確認：自動生成 2026-07-09');  -- 本郷三丁目 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('2d1d1826-a2b7-40f7-a631-17fd4b156f9c', 'suumo', 'station_path', 'tokyo/eki_myogadani', false, '要確認：自動生成 2026-07-09');  -- 茗荷谷 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('c134e746-89df-4d89-ad41-6f1102dbe5ca', 'suumo', 'station_path', 'tokyo/eki_higashiikebukuro', false, '要確認：自動生成 2026-07-09');  -- 東池袋 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('5a258dd6-1ace-43b2-9a85-a9e9e733a183', 'suumo', 'station_path', 'tokyo/eki_nishiogikubo', false, '要確認：自動生成 2026-07-09');  -- 西荻窪 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('b4166442-7c20-4e85-9f2c-827c3f765912', 'suumo', 'station_path', 'kanagawa/eki_odawara', false, '要確認：自動生成 2026-07-09');  -- 小田原 (station/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('1654ab41-7259-4109-8c51-be0b52017898', 'suumo', 'station_path', 'tokyo/eki_tachikawamina', false, '要確認：自動生成 2026-07-09');  -- 立川南 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('8dc3edf3-edfa-4eee-9686-1d59ee73d290', 'suumo', 'station_path', 'tokyo/eki_takahatafudo', false, '要確認：自動生成 2026-07-09');  -- 高幡不動 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('b7f47fef-2ca3-4bd7-918a-4d561cf06163', 'suumo', 'station_path', 'tokyo/eki_tamacenter', false, '要確認：自動生成 2026-07-09');  -- 多摩センター (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('82da38f9-d731-4a0f-aac7-e9786624337b', 'suumo', 'station_path', 'kanagawa/eki_shinmatsuda', false, '要確認：自動生成 2026-07-09');  -- 新松田 (station/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('5924bb81-38bc-41c7-8591-11cdf6487d97', 'suumo', 'station_path', 'kanagawa/eki_motomachichuukagai', false, '要確認：自動生成 2026-07-09');  -- 元町・中華街 (station/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('2f59ee8b-b19b-45b6-beaf-cb108645ffab', 'suumo', 'station_path', 'kanagawa/eki_keikyu-kawasaki', false, '要確認：自動生成 2026-07-09');  -- 京急川崎 (station/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('01e798b2-3cb9-4d50-bc6f-3c5d538522cf', 'suumo', 'station_path', 'kanagawa/eki_enoshima', false, '要確認：自動生成 2026-07-09');  -- 江ノ島 (station/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('613cd2da-20a5-4400-883e-72f4938d565d', 'suumo', 'station_path', 'tokyo/eki_kanda', false, '要確認：自動生成 2026-07-09');  -- 神田 (station/東京都)

-- ── ATHOME (84件) ─────────────────────────────────────
INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('cd4d8df0-7e3e-41a7-9877-b68a948d0aae', 'athome', 'city_path', '/tokyo/hinohara-city', false, '要確認：自動生成 2026-07-09');  -- 檜原村 (city/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('13a329dd-a82f-410a-94df-bb028aa8d4de', 'athome', 'station_path', '/tokyo/takadanobaba-station', false, '要確認：自動生成 2026-07-09');  -- 高田馬場 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('b1b801cd-95db-4cf0-8922-e0ce07e80602', 'athome', 'station_path', '/tokyo/musashisakai-station', false, '要確認：自動生成 2026-07-09');  -- 武蔵境 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('ab6c6186-7ca4-47d3-bd04-400950aae813', 'athome', 'station_path', '/tokyo/kokubunji-station', false, '要確認：自動生成 2026-07-09');  -- 国分寺 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('b52dfa8e-d800-4076-84e1-66e15dce3bb8', 'athome', 'station_path', '/tokyo/kunitachi-station', false, '要確認：自動生成 2026-07-09');  -- 国立 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('0f5a2b5b-1405-4ae8-a5d9-fc788267786c', 'athome', 'station_path', '/tokyo/tachikawa-station', false, '要確認：自動生成 2026-07-09');  -- 立川 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('28bcfaf5-9361-4de3-bb93-2729f6b8a94d', 'athome', 'station_path', '/tokyo/hachioji-station', false, '要確認：自動生成 2026-07-09');  -- 八王子 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('1324b14f-b140-405d-9e86-bea260a3196b', 'athome', 'station_path', '/tokyo/kameido-station', false, '要確認：自動生成 2026-07-09');  -- 亀戸 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('8b7372e9-d110-48a2-ba48-5455d03d4ae3', 'athome', 'station_path', '/tokyo/oji-station', false, '要確認：自動生成 2026-07-09');  -- 王子 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('4d5e6fb4-21db-48b6-8df5-197f35860c66', 'athome', 'station_path', '/tokyo/akabane-station', false, '要確認：自動生成 2026-07-09');  -- 赤羽 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('713925f4-03bf-45c5-bc60-01ca30fca8f1', 'athome', 'station_path', '/tokyo/kameari-station', false, '要確認：自動生成 2026-07-09');  -- 亀有 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('303b096e-a8b4-49e2-b8a4-74c7d256dc6b', 'athome', 'station_path', '/tokyo/kanamachi-station', false, '要確認：自動生成 2026-07-09');  -- 金町 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('4ef817e1-ba6f-4894-a56e-7f45f7c462d5', 'athome', 'station_path', '/tokyo/oimachi-station', false, '要確認：自動生成 2026-07-09');  -- 大井町 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('077eb4a4-80b3-403d-b7b8-abd8850bb48c', 'athome', 'station_path', '/tokyo/meijijingumae-station', false, '要確認：自動生成 2026-07-09');  -- 明治神宮前 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('4613ccf0-bf5d-419f-89ea-2b192aaf6ead', 'athome', 'station_path', '/tokyo/yushima-station', false, '要確認：自動生成 2026-07-09');  -- 湯島 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('b0749096-ddb2-4198-946f-b211c90fd866', 'athome', 'station_path', '/tokyo/nezu-station', false, '要確認：自動生成 2026-07-09');  -- 根津 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('e79c2dc3-66bf-4063-a95a-bc345c1dfebb', 'athome', 'station_path', '/tokyo/sendagi-station', false, '要確認：自動生成 2026-07-09');  -- 千駄木 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('bede82e2-3cc8-4dd2-b6c6-30b907be1413', 'athome', 'station_path', '/tokyo/machiya-station', false, '要確認：自動生成 2026-07-09');  -- 町屋 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('ab6ed659-bf7d-412d-bfb4-78c78f7ff6ce', 'athome', 'station_path', '/tokyo/kyobashi-station', false, '要確認：自動生成 2026-07-09');  -- 京橋 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('dff43dc4-48f2-4f63-8f04-288c874c56b1', 'athome', 'station_path', '/tokyo/asakusa-station', false, '要確認：自動生成 2026-07-09');  -- 浅草 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('5171c395-02c8-414c-be35-0c0a371799fa', 'athome', 'station_path', '/tokyo/hibiya-station', false, '要確認：自動生成 2026-07-09');  -- 日比谷 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('738b4406-f0ce-47bf-950c-d6ad55e081f0', 'athome', 'station_path', '/tokyo/waseda-station', false, '要確認：自動生成 2026-07-09');  -- 早稲田 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('d310cd93-9654-4a42-86d3-e448a0352f76', 'athome', 'station_path', '/tokyo/kagurazaka-station', false, '要確認：自動生成 2026-07-09');  -- 神楽坂 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('2751079e-871e-47a1-806c-c1d2da7ff168', 'athome', 'station_path', '/tokyo/kudanshita-station', false, '要確認：自動生成 2026-07-09');  -- 九段下 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('c33f9860-ffaa-4f81-8474-e96026a93f7c', 'athome', 'station_path', '/tokyo/suitengumae-station', false, '要確認：自動生成 2026-07-09');  -- 水天宮前 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('6b3d9b82-051b-4aba-85ee-2744f1a55f54', 'athome', 'station_path', '/tokyo/hanzomon-station', false, '要確認：自動生成 2026-07-09');  -- 半蔵門 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('85d28497-d73f-4aaf-bad0-ae043b0c0ca9', 'athome', 'station_path', '/tokyo/jimbocho-station', false, '要確認：自動生成 2026-07-09');  -- 神保町 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('2bed4e13-4af1-46ea-96a1-b4809a2033e9', 'athome', 'station_path', '/tokyo/honkomagome-station', false, '要確認：自動生成 2026-07-09');  -- 本駒込 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('78ee2810-191a-4ac9-adc8-9db6bd923c11', 'athome', 'station_path', '/tokyo/nishigahara-station', false, '要確認：自動生成 2026-07-09');  -- 西ヶ原 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('d61a7e9d-3be6-4d09-889b-f99600b2cb62', 'athome', 'station_path', '/tokyo/akabaneiwabuchi-station', false, '要確認：自動生成 2026-07-09');  -- 赤羽岩淵 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('800ff462-52de-4c6d-b442-afa087c025e3', 'athome', 'station_path', '/tokyo/daimon-station', false, '要確認：自動生成 2026-07-09');  -- 大門 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('6b206586-5061-482f-b560-efc703500653', 'athome', 'station_path', '/tokyo/shibakoen-station', false, '要確認：自動生成 2026-07-09');  -- 芝公園 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('9ded7be6-3c02-448b-8a72-ddb958a44b5f', 'athome', 'station_path', '/tokyo/onarimon-station', false, '要確認：自動生成 2026-07-09');  -- 御成門 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('924548d9-8af1-4a75-9a3e-a998d435aa89', 'athome', 'station_path', '/tokyo/kasuga-station', false, '要確認：自動生成 2026-07-09');  -- 春日 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('b65458f7-54a6-4590-a344-a1e4087dcbcd', 'athome', 'station_path', '/tokyo/sengoku-station', false, '要確認：自動生成 2026-07-09');  -- 千石 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('210d4216-eac8-45d7-b733-37da814912ea', 'athome', 'station_path', '/tokyo/nishisugamo-station', false, '要確認：自動生成 2026-07-09');  -- 西巣鴨 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('bff334ad-28c9-4657-80f9-1b3704f58522', 'athome', 'station_path', '/tokyo/takashimadaira-station', false, '要確認：自動生成 2026-07-09');  -- 高島平 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('dbcbaba1-0fc9-41e0-86ad-bc1dce4be3ce', 'athome', 'station_path', '/tokyo/morishita-station', false, '要確認：自動生成 2026-07-09');  -- 森下 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('01418c95-0c40-4cbb-8dba-b1194981dcaa', 'athome', 'station_path', '/tokyo/kikukawa-station', false, '要確認：自動生成 2026-07-09');  -- 菊川 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('1ff032d0-0387-4a14-be4a-6ee6e91025bd', 'athome', 'station_path', '/tokyo/bakuroyokoyama-station', false, '要確認：自動生成 2026-07-09');  -- 馬喰横山 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('bcc99d36-c0f5-4c8c-8bb1-09900d1cc29e', 'athome', 'station_path', '/tokyo/iwamotocho-station', false, '要確認：自動生成 2026-07-09');  -- 岩本町 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('fbc4632f-4c7b-45f9-97d3-a5f2be6ae029', 'athome', 'station_path', '/tokyo/akebonobashi-station', false, '要確認：自動生成 2026-07-09');  -- 曙橋 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('4d71ce2a-bbfc-40ab-a40c-1c850d374413', 'athome', 'station_path', '/tokyo/daitabashi-station', false, '要確認：自動生成 2026-07-09');  -- 代田橋 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('d0792046-97f6-4cfe-8414-0c6b26fac687', 'athome', 'station_path', '/tokyo/sakurajosui-station', false, '要確認：自動生成 2026-07-09');  -- 桜上水 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('fbb045af-1a8f-4c28-a54c-4f27c4b71432', 'athome', 'station_path', '/tokyo/ryogoku-station', false, '要確認：自動生成 2026-07-09');  -- 両国 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('d6b74e88-d812-453b-83ef-f4de2fecfff7', 'athome', 'station_path', '/tokyo/shinkiba-station', false, '要確認：自動生成 2026-07-09');  -- 新木場 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('e7e05da7-c805-4d58-85c4-f1257b9a8f1a', 'athome', 'station_path', '/tokyo/komabatoddaimae-station', false, '要確認：自動生成 2026-07-09');  -- 駒場東大前 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('e29987c8-58ed-455c-bfe6-d76e98040575', 'athome', 'station_path', '/tokyo/komae-station', false, '要確認：自動生成 2026-07-09');  -- 狛江 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('3fcee996-bb49-440e-9bc0-252eec0b5a02', 'athome', 'station_path', '/tokyo/tachikawakit-station', false, '要確認：自動生成 2026-07-09');  -- 立川北 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('82590158-8351-4c99-83d0-27e950b7a551', 'athome', 'city_path', '/kanagawa/sagamihara-midori-ku-city', false, '要確認：自動生成 2026-07-09');  -- 相模原市緑区 (ward/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('655af4b2-e87c-4f2f-a8de-fde5e057da3c', 'athome', 'city_path', '/kanagawa/yokohama-city', false, '要確認：自動生成 2026-07-09');  -- 横浜市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('769c769d-29c2-4081-b75f-aeca3f7f919d', 'athome', 'city_path', '/kanagawa/kawasaki-city', false, '要確認：自動生成 2026-07-09');  -- 川崎市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('90974d77-86e6-4d25-90a3-ec9cb72c3177', 'athome', 'city_path', '/kanagawa/sagamihara-city', false, '要確認：自動生成 2026-07-09');  -- 相模原市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('1fcc6216-b1e0-422a-a504-72f0a85961f4', 'athome', 'city_path', '/kanagawa/miura-city', false, '要確認：自動生成 2026-07-09');  -- 三浦市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('7bb5837b-51fb-45eb-9692-4b7b2aa0b402', 'athome', 'city_path', '/kanagawa/hadano-city', false, '要確認：自動生成 2026-07-09');  -- 秦野市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('0eea26c9-dac2-407f-8ae9-1555e7d06b0c', 'athome', 'city_path', '/kanagawa/isehara-city', false, '要確認：自動生成 2026-07-09');  -- 伊勢原市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('08f386c4-3c5a-401b-a43a-ff7ed358e3a0', 'athome', 'city_path', '/kanagawa/zama-city', false, '要確認：自動生成 2026-07-09');  -- 座間市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('8670680c-f05c-4af6-bf0d-4d815b5cc703', 'athome', 'city_path', '/kanagawa/minamiashigara-city', false, '要確認：自動生成 2026-07-09');  -- 南足柄市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('bc86581d-437d-4df9-a360-d8ffd8f92ac6', 'athome', 'city_path', '/kanagawa/ayase-city', false, '要確認：自動生成 2026-07-09');  -- 綾瀬市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('62d6ff7a-3060-44ad-8383-b9577d74ab56', 'athome', 'station_path', '/tokyo/yoyogikouen-station', false, '要確認：自動生成 2026-07-09');  -- 代々木公園 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('f281ada7-d5a9-4b43-b6fc-eea62224e07f', 'athome', 'station_path', '/tokyo/akabanebashi-station', false, '要確認：自動生成 2026-07-09');  -- 赤羽橋 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('7fd89532-e020-4c3c-b404-e742a313c5a8', 'athome', 'station_path', '/tokyo/mita-station', false, '要確認：自動生成 2026-07-09');  -- 三田 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('02c830e1-5856-44bc-b611-5492cd640705', 'athome', 'station_path', '/tokyo/sengakuji-station', false, '要確認：自動生成 2026-07-09');  -- 泉岳寺 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('5dbab126-042f-4d3e-a375-b3e6786f2c47', 'athome', 'station_path', '/tokyo/kamiyacho-station', false, '要確認：自動生成 2026-07-09');  -- 神谷町 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('e4c2791a-c4b2-4c20-812f-ed58ce10c12c', 'athome', 'station_path', '/tokyo/roppongiiichome-station', false, '要確認：自動生成 2026-07-09');  -- 六本木一丁目 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('a77c394b-bfc7-4f3f-add3-db5c7a35f57c', 'athome', 'station_path', '/tokyo/shinjukusanchome-station', false, '要確認：自動生成 2026-07-09');  -- 新宿三丁目 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('672e08b2-939d-417c-924e-bae2109bddc6', 'athome', 'station_path', '/tokyo/wakamatsu-kawada-station', false, '要確認：自動生成 2026-07-09');  -- 若松河田 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('398fcf39-303d-4cdc-a0a1-0fb1c631af5b', 'athome', 'station_path', '/tokyo/ushigome-kagurazaka-station', false, '要確認：自動生成 2026-07-09');  -- 牛込神楽坂 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('cbd1abd6-076e-453b-85e8-bebfdb6924ff', 'athome', 'station_path', '/tokyo/kasumigaseki-station', false, '要確認：自動生成 2026-07-09');  -- 霞ヶ関 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('c9b4f9e7-96bc-45bb-acaa-2e2bec76c1f5', 'athome', 'station_path', '/tokyo/nijubashimae-station', false, '要確認：自動生成 2026-07-09');  -- 二重橋前 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('e0a5b9c2-f338-4a30-acfd-f4d886ee8332', 'athome', 'station_path', '/tokyo/ginza-station', false, '要確認：自動生成 2026-07-09');  -- 銀座 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('c57b3220-1572-4db2-8c4a-129eca3dd503', 'athome', 'station_path', '/tokyo/senzoku-station', false, '要確認：自動生成 2026-07-09');  -- 洗足 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('aa167ca2-f409-44af-8d9b-cf9e877ee332', 'athome', 'station_path', '/tokyo/hongosanchome-station', false, '要確認：自動生成 2026-07-09');  -- 本郷三丁目 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('2d1d1826-a2b7-40f7-a631-17fd4b156f9c', 'athome', 'station_path', '/tokyo/myogadani-station', false, '要確認：自動生成 2026-07-09');  -- 茗荷谷 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('c134e746-89df-4d89-ad41-6f1102dbe5ca', 'athome', 'station_path', '/tokyo/higashiikebukuro-station', false, '要確認：自動生成 2026-07-09');  -- 東池袋 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('5a258dd6-1ace-43b2-9a85-a9e9e733a183', 'athome', 'station_path', '/tokyo/nishiogikubo-station', false, '要確認：自動生成 2026-07-09');  -- 西荻窪 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('b4166442-7c20-4e85-9f2c-827c3f765912', 'athome', 'station_path', '/kanagawa/odawara-station', false, '要確認：自動生成 2026-07-09');  -- 小田原 (station/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('1654ab41-7259-4109-8c51-be0b52017898', 'athome', 'station_path', '/tokyo/tachikawamina-station', false, '要確認：自動生成 2026-07-09');  -- 立川南 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('8dc3edf3-edfa-4eee-9686-1d59ee73d290', 'athome', 'station_path', '/tokyo/takahatafudo-station', false, '要確認：自動生成 2026-07-09');  -- 高幡不動 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('b7f47fef-2ca3-4bd7-918a-4d561cf06163', 'athome', 'station_path', '/tokyo/tamacenter-station', false, '要確認：自動生成 2026-07-09');  -- 多摩センター (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('82da38f9-d731-4a0f-aac7-e9786624337b', 'athome', 'station_path', '/kanagawa/shinmatsuda-station', false, '要確認：自動生成 2026-07-09');  -- 新松田 (station/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('2f59ee8b-b19b-45b6-beaf-cb108645ffab', 'athome', 'station_path', '/kanagawa/keikyu-kawasaki-station', false, '要確認：自動生成 2026-07-09');  -- 京急川崎 (station/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('01e798b2-3cb9-4d50-bc6f-3c5d538522cf', 'athome', 'station_path', '/kanagawa/enoshima-station', false, '要確認：自動生成 2026-07-09');  -- 江ノ島 (station/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('9ef267c9-b7dc-4152-99a4-61ed5761d99d', 'athome', 'station_path', '/kanagawa/musashimizonokuchi-station', false, '要確認：自動生成 2026-07-09');  -- 武蔵溝ノ口 (station/神奈川県)

-- ── HOMES (127件) ─────────────────────────────────────
INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('cd4d8df0-7e3e-41a7-9877-b68a948d0aae', 'homes', 'city_path', '/tokyo/hinohara-city', false, '要確認：自動生成 2026-07-09');  -- 檜原村 (city/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('13a329dd-a82f-410a-94df-bb028aa8d4de', 'homes', 'station_path', '/tokyo/takadanobaba-station', false, '要確認：自動生成 2026-07-09');  -- 高田馬場 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('b1b801cd-95db-4cf0-8922-e0ce07e80602', 'homes', 'station_path', '/tokyo/musashisakai-station', false, '要確認：自動生成 2026-07-09');  -- 武蔵境 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('ab6c6186-7ca4-47d3-bd04-400950aae813', 'homes', 'station_path', '/tokyo/kokubunji-station', false, '要確認：自動生成 2026-07-09');  -- 国分寺 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('b52dfa8e-d800-4076-84e1-66e15dce3bb8', 'homes', 'station_path', '/tokyo/kunitachi-station', false, '要確認：自動生成 2026-07-09');  -- 国立 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('0f5a2b5b-1405-4ae8-a5d9-fc788267786c', 'homes', 'station_path', '/tokyo/tachikawa-station', false, '要確認：自動生成 2026-07-09');  -- 立川 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('28bcfaf5-9361-4de3-bb93-2729f6b8a94d', 'homes', 'station_path', '/tokyo/hachioji-station', false, '要確認：自動生成 2026-07-09');  -- 八王子 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('1324b14f-b140-405d-9e86-bea260a3196b', 'homes', 'station_path', '/tokyo/kameido-station', false, '要確認：自動生成 2026-07-09');  -- 亀戸 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('8b7372e9-d110-48a2-ba48-5455d03d4ae3', 'homes', 'station_path', '/tokyo/oji-station', false, '要確認：自動生成 2026-07-09');  -- 王子 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('4d5e6fb4-21db-48b6-8df5-197f35860c66', 'homes', 'station_path', '/tokyo/akabane-station', false, '要確認：自動生成 2026-07-09');  -- 赤羽 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('713925f4-03bf-45c5-bc60-01ca30fca8f1', 'homes', 'station_path', '/tokyo/kameari-station', false, '要確認：自動生成 2026-07-09');  -- 亀有 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('303b096e-a8b4-49e2-b8a4-74c7d256dc6b', 'homes', 'station_path', '/tokyo/kanamachi-station', false, '要確認：自動生成 2026-07-09');  -- 金町 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('4ef817e1-ba6f-4894-a56e-7f45f7c462d5', 'homes', 'station_path', '/tokyo/oimachi-station', false, '要確認：自動生成 2026-07-09');  -- 大井町 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('077eb4a4-80b3-403d-b7b8-abd8850bb48c', 'homes', 'station_path', '/tokyo/meijijingumae-station', false, '要確認：自動生成 2026-07-09');  -- 明治神宮前 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('4613ccf0-bf5d-419f-89ea-2b192aaf6ead', 'homes', 'station_path', '/tokyo/yushima-station', false, '要確認：自動生成 2026-07-09');  -- 湯島 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('b0749096-ddb2-4198-946f-b211c90fd866', 'homes', 'station_path', '/tokyo/nezu-station', false, '要確認：自動生成 2026-07-09');  -- 根津 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('e79c2dc3-66bf-4063-a95a-bc345c1dfebb', 'homes', 'station_path', '/tokyo/sendagi-station', false, '要確認：自動生成 2026-07-09');  -- 千駄木 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('bede82e2-3cc8-4dd2-b6c6-30b907be1413', 'homes', 'station_path', '/tokyo/machiya-station', false, '要確認：自動生成 2026-07-09');  -- 町屋 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('ab6ed659-bf7d-412d-bfb4-78c78f7ff6ce', 'homes', 'station_path', '/tokyo/kyobashi-station', false, '要確認：自動生成 2026-07-09');  -- 京橋 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('dff43dc4-48f2-4f63-8f04-288c874c56b1', 'homes', 'station_path', '/tokyo/asakusa-station', false, '要確認：自動生成 2026-07-09');  -- 浅草 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('5171c395-02c8-414c-be35-0c0a371799fa', 'homes', 'station_path', '/tokyo/hibiya-station', false, '要確認：自動生成 2026-07-09');  -- 日比谷 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('738b4406-f0ce-47bf-950c-d6ad55e081f0', 'homes', 'station_path', '/tokyo/waseda-station', false, '要確認：自動生成 2026-07-09');  -- 早稲田 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('d310cd93-9654-4a42-86d3-e448a0352f76', 'homes', 'station_path', '/tokyo/kagurazaka-station', false, '要確認：自動生成 2026-07-09');  -- 神楽坂 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('8efee431-d58d-47a3-8f73-c2f2b702258c', 'homes', 'station_path', '/tokyo/iidabashi-station', false, '要確認：自動生成 2026-07-09');  -- 飯田橋 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('2751079e-871e-47a1-806c-c1d2da7ff168', 'homes', 'station_path', '/tokyo/kudanshita-station', false, '要確認：自動生成 2026-07-09');  -- 九段下 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('c33f9860-ffaa-4f81-8474-e96026a93f7c', 'homes', 'station_path', '/tokyo/suitengumae-station', false, '要確認：自動生成 2026-07-09');  -- 水天宮前 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('6b3d9b82-051b-4aba-85ee-2744f1a55f54', 'homes', 'station_path', '/tokyo/hanzomon-station', false, '要確認：自動生成 2026-07-09');  -- 半蔵門 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('85d28497-d73f-4aaf-bad0-ae043b0c0ca9', 'homes', 'station_path', '/tokyo/jimbocho-station', false, '要確認：自動生成 2026-07-09');  -- 神保町 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('59f41922-54b8-4d7e-9ba5-b8538732c61c', 'homes', 'station_path', '/tokyo/aoyama-itchome-station', false, '要確認：自動生成 2026-07-09');  -- 青山一丁目 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('2bed4e13-4af1-46ea-96a1-b4809a2033e9', 'homes', 'station_path', '/tokyo/honkomagome-station', false, '要確認：自動生成 2026-07-09');  -- 本駒込 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('78ee2810-191a-4ac9-adc8-9db6bd923c11', 'homes', 'station_path', '/tokyo/nishigahara-station', false, '要確認：自動生成 2026-07-09');  -- 西ヶ原 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('d61a7e9d-3be6-4d09-889b-f99600b2cb62', 'homes', 'station_path', '/tokyo/akabaneiwabuchi-station', false, '要確認：自動生成 2026-07-09');  -- 赤羽岩淵 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('800ff462-52de-4c6d-b442-afa087c025e3', 'homes', 'station_path', '/tokyo/daimon-station', false, '要確認：自動生成 2026-07-09');  -- 大門 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('6b206586-5061-482f-b560-efc703500653', 'homes', 'station_path', '/tokyo/shibakoen-station', false, '要確認：自動生成 2026-07-09');  -- 芝公園 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('9ded7be6-3c02-448b-8a72-ddb958a44b5f', 'homes', 'station_path', '/tokyo/onarimon-station', false, '要確認：自動生成 2026-07-09');  -- 御成門 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('924548d9-8af1-4a75-9a3e-a998d435aa89', 'homes', 'station_path', '/tokyo/kasuga-station', false, '要確認：自動生成 2026-07-09');  -- 春日 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('b65458f7-54a6-4590-a344-a1e4087dcbcd', 'homes', 'station_path', '/tokyo/sengoku-station', false, '要確認：自動生成 2026-07-09');  -- 千石 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('210d4216-eac8-45d7-b733-37da814912ea', 'homes', 'station_path', '/tokyo/nishisugamo-station', false, '要確認：自動生成 2026-07-09');  -- 西巣鴨 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('bff334ad-28c9-4657-80f9-1b3704f58522', 'homes', 'station_path', '/tokyo/takashimadaira-station', false, '要確認：自動生成 2026-07-09');  -- 高島平 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('dbcbaba1-0fc9-41e0-86ad-bc1dce4be3ce', 'homes', 'station_path', '/tokyo/morishita-station', false, '要確認：自動生成 2026-07-09');  -- 森下 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('01418c95-0c40-4cbb-8dba-b1194981dcaa', 'homes', 'station_path', '/tokyo/kikukawa-station', false, '要確認：自動生成 2026-07-09');  -- 菊川 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('1ff032d0-0387-4a14-be4a-6ee6e91025bd', 'homes', 'station_path', '/tokyo/bakuroyokoyama-station', false, '要確認：自動生成 2026-07-09');  -- 馬喰横山 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('bcc99d36-c0f5-4c8c-8bb1-09900d1cc29e', 'homes', 'station_path', '/tokyo/iwamotocho-station', false, '要確認：自動生成 2026-07-09');  -- 岩本町 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('fbc4632f-4c7b-45f9-97d3-a5f2be6ae029', 'homes', 'station_path', '/tokyo/akebonobashi-station', false, '要確認：自動生成 2026-07-09');  -- 曙橋 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('4d71ce2a-bbfc-40ab-a40c-1c850d374413', 'homes', 'station_path', '/tokyo/daitabashi-station', false, '要確認：自動生成 2026-07-09');  -- 代田橋 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('d0792046-97f6-4cfe-8414-0c6b26fac687', 'homes', 'station_path', '/tokyo/sakurajosui-station', false, '要確認：自動生成 2026-07-09');  -- 桜上水 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('fbb045af-1a8f-4c28-a54c-4f27c4b71432', 'homes', 'station_path', '/tokyo/ryogoku-station', false, '要確認：自動生成 2026-07-09');  -- 両国 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('d6b74e88-d812-453b-83ef-f4de2fecfff7', 'homes', 'station_path', '/tokyo/shinkiba-station', false, '要確認：自動生成 2026-07-09');  -- 新木場 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('e7e05da7-c805-4d58-85c4-f1257b9a8f1a', 'homes', 'station_path', '/tokyo/komabatoddaimae-station', false, '要確認：自動生成 2026-07-09');  -- 駒場東大前 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('e29987c8-58ed-455c-bfe6-d76e98040575', 'homes', 'station_path', '/tokyo/komae-station', false, '要確認：自動生成 2026-07-09');  -- 狛江 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('3fcee996-bb49-440e-9bc0-252eec0b5a02', 'homes', 'station_path', '/tokyo/tachikawakit-station', false, '要確認：自動生成 2026-07-09');  -- 立川北 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('39e0ba3f-fb97-4388-9d18-e268b737b07d', 'homes', 'station_path', '/kanagawa/yokohama-shi-tsurumi-ku', false, '要確認：自動生成 2026-07-09');  -- 横浜市鶴見区 (ward/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('af2c619b-2fc6-4d58-a823-530004591205', 'homes', 'station_path', '/kanagawa/yokohama-shi-kanagawa-ku', false, '要確認：自動生成 2026-07-09');  -- 横浜市神奈川区 (ward/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('c9cd5069-dfcd-4a36-a85e-1def09e1e10e', 'homes', 'station_path', '/kanagawa/yokohama-shi-minami-ku', false, '要確認：自動生成 2026-07-09');  -- 横浜市南区 (ward/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('58ff9a0f-206d-4761-bf21-7f87ae38c0cf', 'homes', 'station_path', '/kanagawa/yokohama-shi-konan-ku', false, '要確認：自動生成 2026-07-09');  -- 横浜市港南区 (ward/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('58b16703-a1c6-4819-bf1d-80cceb9d7d73', 'homes', 'station_path', '/kanagawa/yokohama-shi-hodogaya-ku', false, '要確認：自動生成 2026-07-09');  -- 横浜市保土ケ谷区 (ward/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('4e5e5da3-dc25-49b7-99d6-c556618ff639', 'homes', 'station_path', '/kanagawa/yokohama-shi-asahi-ku', false, '要確認：自動生成 2026-07-09');  -- 横浜市旭区 (ward/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('c96982ad-8788-4960-870e-01299fe96f56', 'homes', 'station_path', '/kanagawa/yokohama-shi-isogo-ku', false, '要確認：自動生成 2026-07-09');  -- 横浜市磯子区 (ward/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('1750d712-fa31-457b-89af-d07d4099ab90', 'homes', 'station_path', '/kanagawa/yokohama-shi-kanazawa-ku', false, '要確認：自動生成 2026-07-09');  -- 横浜市金沢区 (ward/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('37de7563-f4f4-41f3-81bf-8d3f99370514', 'homes', 'station_path', '/kanagawa/yokohama-shi-midori-ku', false, '要確認：自動生成 2026-07-09');  -- 横浜市緑区 (ward/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('d74aa60f-37b5-4220-88f5-79f326caa562', 'homes', 'station_path', '/kanagawa/yokohama-shi-totsuka-ku', false, '要確認：自動生成 2026-07-09');  -- 横浜市戸塚区 (ward/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('77bb0f99-1d6e-4f76-b4fe-79506091e3b7', 'homes', 'station_path', '/kanagawa/yokohama-shi-sakae-ku', false, '要確認：自動生成 2026-07-09');  -- 横浜市栄区 (ward/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('d44cead8-c75a-4584-9bdd-2b57b912bb2d', 'homes', 'station_path', '/kanagawa/yokohama-shi-izumi-ku', false, '要確認：自動生成 2026-07-09');  -- 横浜市泉区 (ward/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('f226f817-3780-4660-b5d5-f747c1d9cdd1', 'homes', 'station_path', '/kanagawa/yokohama-shi-seya-ku', false, '要確認：自動生成 2026-07-09');  -- 横浜市瀬谷区 (ward/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('618c4606-d1a2-49f7-8a58-2d4d8238a30d', 'homes', 'station_path', '/kanagawa/kawasaki-shi-kawasaki-ku', false, '要確認：自動生成 2026-07-09');  -- 川崎市川崎区 (ward/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('65228dc5-e4be-4f99-b776-ded000273d61', 'homes', 'station_path', '/kanagawa/kawasaki-shi-saiwai-ku', false, '要確認：自動生成 2026-07-09');  -- 川崎市幸区 (ward/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('82590158-8351-4c99-83d0-27e950b7a551', 'homes', 'city_path', '/kanagawa/sagamihara-midori-ku-city', false, '要確認：自動生成 2026-07-09');  -- 相模原市緑区 (ward/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('6185ab80-1b9a-4105-916d-b53927abf0cd', 'homes', 'station_path', '/kanagawa/sagamihara-shi-chuo-ku', false, '要確認：自動生成 2026-07-09');  -- 相模原市中央区 (ward/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('1b2cbfd0-d322-4e73-bf7c-8b5d3843898e', 'homes', 'station_path', '/kanagawa/sagamihara-shi-minami-ku', false, '要確認：自動生成 2026-07-09');  -- 相模原市南区 (ward/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('655af4b2-e87c-4f2f-a8de-fde5e057da3c', 'homes', 'city_path', '/kanagawa/yokohama-city', false, '要確認：自動生成 2026-07-09');  -- 横浜市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('769c769d-29c2-4081-b75f-aeca3f7f919d', 'homes', 'city_path', '/kanagawa/kawasaki-city', false, '要確認：自動生成 2026-07-09');  -- 川崎市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('90974d77-86e6-4d25-90a3-ec9cb72c3177', 'homes', 'city_path', '/kanagawa/sagamihara-city', false, '要確認：自動生成 2026-07-09');  -- 相模原市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('7d7dbb46-c80a-48cf-9180-d195e2c13c6f', 'homes', 'station_path', '/kanagawa/yokosuka-city', false, '要確認：自動生成 2026-07-09');  -- 横須賀市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('db333a6c-24ac-43ba-83cb-2bd7175de555', 'homes', 'station_path', '/kanagawa/hiratsuka-city', false, '要確認：自動生成 2026-07-09');  -- 平塚市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('3ddfb8ac-302b-445d-9ab5-0c4ee335dd7e', 'homes', 'station_path', '/kanagawa/odawara-city', false, '要確認：自動生成 2026-07-09');  -- 小田原市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('1fcc6216-b1e0-422a-a504-72f0a85961f4', 'homes', 'city_path', '/kanagawa/miura-city', false, '要確認：自動生成 2026-07-09');  -- 三浦市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('7bb5837b-51fb-45eb-9692-4b7b2aa0b402', 'homes', 'city_path', '/kanagawa/hadano-city', false, '要確認：自動生成 2026-07-09');  -- 秦野市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('49d3ab68-0b84-45f5-8740-4d5fb99833d6', 'homes', 'station_path', '/kanagawa/atsugi-city', false, '要確認：自動生成 2026-07-09');  -- 厚木市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('7fe8aea2-216d-4d27-aec4-39b5576582b8', 'homes', 'station_path', '/kanagawa/yamato-city', false, '要確認：自動生成 2026-07-09');  -- 大和市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('0eea26c9-dac2-407f-8ae9-1555e7d06b0c', 'homes', 'city_path', '/kanagawa/isehara-city', false, '要確認：自動生成 2026-07-09');  -- 伊勢原市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('7866380c-7e5c-401a-9bdf-43e1f57bae5e', 'homes', 'station_path', '/kanagawa/ebina-city', false, '要確認：自動生成 2026-07-09');  -- 海老名市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('08f386c4-3c5a-401b-a43a-ff7ed358e3a0', 'homes', 'city_path', '/kanagawa/zama-city', false, '要確認：自動生成 2026-07-09');  -- 座間市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('8670680c-f05c-4af6-bf0d-4d815b5cc703', 'homes', 'city_path', '/kanagawa/minamiashigara-city', false, '要確認：自動生成 2026-07-09');  -- 南足柄市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('bc86581d-437d-4df9-a360-d8ffd8f92ac6', 'homes', 'city_path', '/kanagawa/ayase-city', false, '要確認：自動生成 2026-07-09');  -- 綾瀬市 (city/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('62d6ff7a-3060-44ad-8383-b9577d74ab56', 'homes', 'station_path', '/tokyo/yoyogikouen-station', false, '要確認：自動生成 2026-07-09');  -- 代々木公園 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('f281ada7-d5a9-4b43-b6fc-eea62224e07f', 'homes', 'station_path', '/tokyo/akabanebashi-station', false, '要確認：自動生成 2026-07-09');  -- 赤羽橋 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('7fd89532-e020-4c3c-b404-e742a313c5a8', 'homes', 'station_path', '/tokyo/mita-station', false, '要確認：自動生成 2026-07-09');  -- 三田 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('d862d8bf-5750-4f33-ab2b-c325d758eea3', 'homes', 'station_path', '/tokyo/takanawa-gateway-station', false, '要確認：自動生成 2026-07-09');  -- 高輪ゲートウェイ (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('02c830e1-5856-44bc-b611-5492cd640705', 'homes', 'station_path', '/tokyo/sengakuji-station', false, '要確認：自動生成 2026-07-09');  -- 泉岳寺 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('5dbab126-042f-4d3e-a375-b3e6786f2c47', 'homes', 'station_path', '/tokyo/kamiyacho-station', false, '要確認：自動生成 2026-07-09');  -- 神谷町 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('e4c2791a-c4b2-4c20-812f-ed58ce10c12c', 'homes', 'station_path', '/tokyo/roppongiiichome-station', false, '要確認：自動生成 2026-07-09');  -- 六本木一丁目 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('0706c05a-a085-4878-9e6b-9f020497c4b9', 'homes', 'station_path', '/tokyo/tameikesanno-station', false, '要確認：自動生成 2026-07-09');  -- 溜池山王 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('a77c394b-bfc7-4f3f-add3-db5c7a35f57c', 'homes', 'station_path', '/tokyo/shinjukusanchome-station', false, '要確認：自動生成 2026-07-09');  -- 新宿三丁目 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('672e08b2-939d-417c-924e-bae2109bddc6', 'homes', 'station_path', '/tokyo/wakamatsu-kawada-station', false, '要確認：自動生成 2026-07-09');  -- 若松河田 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('398fcf39-303d-4cdc-a0a1-0fb1c631af5b', 'homes', 'station_path', '/tokyo/ushigome-kagurazaka-station', false, '要確認：自動生成 2026-07-09');  -- 牛込神楽坂 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('99540162-6965-4093-8da1-60867219e273', 'homes', 'station_path', '/tokyo/ichigaya-station', false, '要確認：自動生成 2026-07-09');  -- 市ヶ谷 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('b876486b-613e-487a-a0d6-ae3263b257c8', 'homes', 'station_path', '/tokyo/nagatacho-station', false, '要確認：自動生成 2026-07-09');  -- 永田町 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('cbd1abd6-076e-453b-85e8-bebfdb6924ff', 'homes', 'station_path', '/tokyo/kasumigaseki-station', false, '要確認：自動生成 2026-07-09');  -- 霞ヶ関 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('ec3ee85f-53f5-4ece-8417-3415d7284f04', 'homes', 'station_path', '/tokyo/yurakucho-station', false, '要確認：自動生成 2026-07-09');  -- 有楽町 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('c9b4f9e7-96bc-45bb-acaa-2e2bec76c1f5', 'homes', 'station_path', '/tokyo/nijubashimae-station', false, '要確認：自動生成 2026-07-09');  -- 二重橋前 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('e0a5b9c2-f338-4a30-acfd-f4d886ee8332', 'homes', 'station_path', '/tokyo/ginza-station', false, '要確認：自動生成 2026-07-09');  -- 銀座 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('c57b3220-1572-4db2-8c4a-129eca3dd503', 'homes', 'station_path', '/tokyo/senzoku-station', false, '要確認：自動生成 2026-07-09');  -- 洗足 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('488d0a07-9f04-4fa1-9b65-ab60965e97dd', 'homes', 'station_path', '/tokyo/osaki-station', false, '要確認：自動生成 2026-07-09');  -- 大崎 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('e4431a72-cc4a-4051-9196-619f62492f80', 'homes', 'station_path', '/tokyo/kamata-station', false, '要確認：自動生成 2026-07-09');  -- 蒲田 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('01eeca1c-91e2-4d99-a7a7-b3e337a38693', 'homes', 'station_path', '/tokyo/omori-station', false, '要確認：自動生成 2026-07-09');  -- 大森 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('aa167ca2-f409-44af-8d9b-cf9e877ee332', 'homes', 'station_path', '/tokyo/hongosanchome-station', false, '要確認：自動生成 2026-07-09');  -- 本郷三丁目 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('ecd8cca0-5e01-45ff-8760-5fcb0fdb7d2b', 'homes', 'station_path', '/tokyo/korakuen-station', false, '要確認：自動生成 2026-07-09');  -- 後楽園 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('2d1d1826-a2b7-40f7-a631-17fd4b156f9c', 'homes', 'station_path', '/tokyo/myogadani-station', false, '要確認：自動生成 2026-07-09');  -- 茗荷谷 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('c134e746-89df-4d89-ad41-6f1102dbe5ca', 'homes', 'station_path', '/tokyo/higashiikebukuro-station', false, '要確認：自動生成 2026-07-09');  -- 東池袋 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('b980484a-fecd-49e8-a1b3-fafa4c571238', 'homes', 'station_path', '/tokyo/nakano-station', false, '要確認：自動生成 2026-07-09');  -- 中野 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('84aeb30c-c4bb-4832-b42a-7f22b3b3ac4c', 'homes', 'station_path', '/tokyo/koenji-station', false, '要確認：自動生成 2026-07-09');  -- 高円寺 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('327064c1-ffbe-4093-adb4-a4bc171ba5be', 'homes', 'station_path', '/tokyo/asagaya-station', false, '要確認：自動生成 2026-07-09');  -- 阿佐ヶ谷 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('8f8f489c-cac3-464c-bfd4-1c50079b0d59', 'homes', 'station_path', '/tokyo/ogikubo-station', false, '要確認：自動生成 2026-07-09');  -- 荻窪 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('5a258dd6-1ace-43b2-9a85-a9e9e733a183', 'homes', 'station_path', '/tokyo/nishiogikubo-station', false, '要確認：自動生成 2026-07-09');  -- 西荻窪 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('cba21760-0623-42ff-bf50-63f6ebe0727b', 'homes', 'station_path', '/tokyo/mitaka-station', false, '要確認：自動生成 2026-07-09');  -- 三鷹 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('b4166442-7c20-4e85-9f2c-827c3f765912', 'homes', 'station_path', '/kanagawa/odawara-station', false, '要確認：自動生成 2026-07-09');  -- 小田原 (station/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('1654ab41-7259-4109-8c51-be0b52017898', 'homes', 'station_path', '/tokyo/tachikawamina-station', false, '要確認：自動生成 2026-07-09');  -- 立川南 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('8dc3edf3-edfa-4eee-9686-1d59ee73d290', 'homes', 'station_path', '/tokyo/takahatafudo-station', false, '要確認：自動生成 2026-07-09');  -- 高幡不動 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('b7f47fef-2ca3-4bd7-918a-4d561cf06163', 'homes', 'station_path', '/tokyo/tamacenter-station', false, '要確認：自動生成 2026-07-09');  -- 多摩センター (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('82da38f9-d731-4a0f-aac7-e9786624337b', 'homes', 'station_path', '/kanagawa/shinmatsuda-station', false, '要確認：自動生成 2026-07-09');  -- 新松田 (station/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('2f59ee8b-b19b-45b6-beaf-cb108645ffab', 'homes', 'station_path', '/kanagawa/keikyu-kawasaki-station', false, '要確認：自動生成 2026-07-09');  -- 京急川崎 (station/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('01e798b2-3cb9-4d50-bc6f-3c5d538522cf', 'homes', 'station_path', '/kanagawa/enoshima-station', false, '要確認：自動生成 2026-07-09');  -- 江ノ島 (station/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('bda20a23-1fc3-4967-8b22-878dee1e91a2', 'homes', 'station_path', '/tokyo/yotsuya-station', false, '要確認：自動生成 2026-07-09');  -- 四ツ谷 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('5c4aae1d-ff48-4cd0-8096-0f4bcebb0401', 'homes', 'station_path', '/kanagawa/musashinakajo-station', false, '要確認：自動生成 2026-07-09');  -- 武蔵新城 (station/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('9ef267c9-b7dc-4152-99a4-61ed5761d99d', 'homes', 'station_path', '/kanagawa/musashimizonokuchi-station', false, '要確認：自動生成 2026-07-09');  -- 武蔵溝ノ口 (station/神奈川県)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('52e6a89b-583e-49d0-ba55-e486bcc80f79', 'homes', 'station_path', '/tokyo/hamamatsucho-station', false, '要確認：自動生成 2026-07-09');  -- 浜松町 (station/東京都)

INSERT INTO portal_area_params (area_id, portal, param_type, portal_url_param, verified, notes) VALUES
  ('613cd2da-20a5-4400-883e-72f4938d565d', 'homes', 'station_path', '/tokyo/kanda-station', false, '要確認：自動生成 2026-07-09');  -- 神田 (station/東京都)
