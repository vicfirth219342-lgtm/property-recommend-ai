-- seed_area_masters_tokyo_cities_v2.sql
-- 東京都 市部(26市)・郡部 を area_masters に登録
-- 23区は v1 seed 済み。ここでは市部・郡部のみ追加。
-- ON CONFLICT DO NOTHING: 既存エントリを上書きしない

INSERT INTO area_masters (area_type, display_name, prefecture, city, ward, station_name, line_name, station_ward, yomi)
VALUES
  -- ── 市部 ─────────────────────────────────────────────────────────
  ('city','八王子市','東京都',NULL,NULL,NULL,NULL,NULL,'はちおうじし'),
  ('city','立川市',  '東京都',NULL,NULL,NULL,NULL,NULL,'たちかわし'),
  ('city','武蔵野市','東京都',NULL,NULL,NULL,NULL,NULL,'むさしのし'),
  ('city','三鷹市',  '東京都',NULL,NULL,NULL,NULL,NULL,'みたかし'),
  ('city','青梅市',  '東京都',NULL,NULL,NULL,NULL,NULL,'おうめし'),
  ('city','府中市',  '東京都',NULL,NULL,NULL,NULL,NULL,'ふちゅうし'),
  ('city','昭島市',  '東京都',NULL,NULL,NULL,NULL,NULL,'あきしまし'),
  ('city','調布市',  '東京都',NULL,NULL,NULL,NULL,NULL,'ちょうふし'),
  ('city','町田市',  '東京都',NULL,NULL,NULL,NULL,NULL,'まちだし'),
  ('city','小金井市','東京都',NULL,NULL,NULL,NULL,NULL,'こがねいし'),
  ('city','小平市',  '東京都',NULL,NULL,NULL,NULL,NULL,'こだいらし'),
  ('city','日野市',  '東京都',NULL,NULL,NULL,NULL,NULL,'ひのし'),
  ('city','東村山市','東京都',NULL,NULL,NULL,NULL,NULL,'ひがしむらやまし'),
  ('city','国分寺市','東京都',NULL,NULL,NULL,NULL,NULL,'こくぶんじし'),
  ('city','国立市',  '東京都',NULL,NULL,NULL,NULL,NULL,'くにたちし'),
  ('city','福生市',  '東京都',NULL,NULL,NULL,NULL,NULL,'ふっさし'),
  ('city','狛江市',  '東京都',NULL,NULL,NULL,NULL,NULL,'こまえし'),
  ('city','東大和市','東京都',NULL,NULL,NULL,NULL,NULL,'ひがしやまとし'),
  ('city','清瀬市',  '東京都',NULL,NULL,NULL,NULL,NULL,'きよせし'),
  ('city','東久留米市','東京都',NULL,NULL,NULL,NULL,NULL,'ひがしくるめし'),
  ('city','武蔵村山市','東京都',NULL,NULL,NULL,NULL,NULL,'むさしむらやまし'),
  ('city','多摩市',  '東京都',NULL,NULL,NULL,NULL,NULL,'たまし'),
  ('city','稲城市',  '東京都',NULL,NULL,NULL,NULL,NULL,'いなぎし'),
  ('city','羽村市',  '東京都',NULL,NULL,NULL,NULL,NULL,'はむらし'),
  ('city','あきる野市','東京都',NULL,NULL,NULL,NULL,NULL,'あきるのし'),
  ('city','西東京市','東京都',NULL,NULL,NULL,NULL,NULL,'にしとうきょうし'),
  -- ── 郡部 ─────────────────────────────────────────────────────────
  ('city','瑞穂町',  '東京都',NULL,NULL,NULL,NULL,NULL,'みずほまち'),
  ('city','日の出町','東京都',NULL,NULL,NULL,NULL,NULL,'ひのでまち'),
  ('city','檜原村',  '東京都',NULL,NULL,NULL,NULL,NULL,'ひのはらむら'),
  ('city','奥多摩町','東京都',NULL,NULL,NULL,NULL,NULL,'おくたままち')
ON CONFLICT DO NOTHING;

-- エイリアス（「○○市」→「○○」逆引き用）
INSERT INTO area_aliases (area_id, alias)
SELECT am.id, replace(replace(am.display_name,'市',''),'町','')
FROM area_masters am
WHERE am.area_type = 'city'
  AND am.prefecture = '東京都'
  AND am.display_name NOT LIKE '%区%'
  AND length(am.display_name) > 3  -- 短すぎる略称はスキップ
  AND NOT EXISTS (
    SELECT 1 FROM area_aliases al
    WHERE al.area_id = am.id
      AND al.alias = replace(replace(am.display_name,'市',''),'町','')
  )
ON CONFLICT DO NOTHING;
