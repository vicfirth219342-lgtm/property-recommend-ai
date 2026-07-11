-- seed_area_masters_kanagawa_cities_v2.sql
-- 神奈川県 郡部・追加市区 を area_masters に登録
-- 横浜市18区・川崎市7区・相模原市3区・主要市 は v1 seed 済み
-- ここでは郡部（町・村）を追加

INSERT INTO area_masters (area_type, display_name, prefecture, city, ward, station_name, line_name, station_ward, yomi)
VALUES
  -- ── 三浦郡 ────────────────────────────────────────────────────────
  ('city','葉山町',  '神奈川県',NULL,NULL,NULL,NULL,NULL,'はやままち'),
  -- ── 高座郡 ────────────────────────────────────────────────────────
  ('city','寒川町',  '神奈川県',NULL,NULL,NULL,NULL,NULL,'さむかわまち'),
  -- ── 中郡 ─────────────────────────────────────────────────────────
  ('city','大磯町',  '神奈川県',NULL,NULL,NULL,NULL,NULL,'おおいそまち'),
  ('city','二宮町',  '神奈川県',NULL,NULL,NULL,NULL,NULL,'にのみやまち'),
  -- ── 足柄上郡 ──────────────────────────────────────────────────────
  ('city','中井町',  '神奈川県',NULL,NULL,NULL,NULL,NULL,'なかいまち'),
  ('city','大井町',  '神奈川県',NULL,NULL,NULL,NULL,NULL,'おおいまち'),
  ('city','松田町',  '神奈川県',NULL,NULL,NULL,NULL,NULL,'まつだまち'),
  ('city','山北町',  '神奈川県',NULL,NULL,NULL,NULL,NULL,'やまきたまち'),
  ('city','開成町',  '神奈川県',NULL,NULL,NULL,NULL,NULL,'かいせいまち'),
  -- ── 足柄下郡 ──────────────────────────────────────────────────────
  ('city','箱根町',  '神奈川県',NULL,NULL,NULL,NULL,NULL,'はこねまち'),
  ('city','真鶴町',  '神奈川県',NULL,NULL,NULL,NULL,NULL,'まなづるまち'),
  ('city','湯河原町','神奈川県',NULL,NULL,NULL,NULL,NULL,'ゆがわらまち'),
  -- ── 愛甲郡 ────────────────────────────────────────────────────────
  ('city','愛川町',  '神奈川県',NULL,NULL,NULL,NULL,NULL,'あいかわまち'),
  ('city','清川村',  '神奈川県',NULL,NULL,NULL,NULL,NULL,'きよかわむら')
ON CONFLICT DO NOTHING;
