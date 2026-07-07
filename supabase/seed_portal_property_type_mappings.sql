-- ============================================================
-- seed_portal_property_type_mappings.sql
-- ポータル別・物件種別コードのシードデータ
--
-- portal_url_param の形式:
--   SUUMO  : "tc=0300101" (クエリパラメータ)
--   AtHome : "/mansion/chuko" (パスセグメント)
--   HOME'S : "/mansion/chuko" (パスセグメント、AtHome と同形式)
-- ============================================================

INSERT INTO portal_property_type_mappings
  (portal, transaction_type, input_pattern, display_name, portal_code, portal_url_param, is_default, sort_order)
VALUES
  -- ============================
  -- SUUMO 売買
  -- ============================
  ('suumo', 'sale', 'マンション',   '中古マンション（売買）', '0300101', 'tc=0300101', TRUE,  10),
  ('suumo', 'sale', '中古マンション','中古マンション（売買）', '0300101', 'tc=0300101', FALSE, 11),
  ('suumo', 'sale', '新築マンション','新築マンション（売買）', '0300301', 'tc=0300301', FALSE, 12),
  ('suumo', 'sale', '戸建',          '中古一戸建て（売買）',  '0401101', 'tc=0401101', FALSE, 20),
  ('suumo', 'sale', '一戸建て',      '中古一戸建て（売買）',  '0401101', 'tc=0401101', FALSE, 21),
  ('suumo', 'sale', '中古戸建',      '中古一戸建て（売買）',  '0401101', 'tc=0401101', FALSE, 22),
  ('suumo', 'sale', '新築戸建',      '新築一戸建て（売買）',  '0401301', 'tc=0401301', FALSE, 23),
  ('suumo', 'sale', '新築一戸建て',  '新築一戸建て（売買）',  '0401301', 'tc=0401301', FALSE, 24),
  ('suumo', 'sale', '土地',          '土地（売買）',          '0500101', 'tc=0500101', FALSE, 30),
  ('suumo', 'sale', '店舗',          '店舗・事務所（売買）',  '0600101', 'tc=0600101', FALSE, 40),
  ('suumo', 'sale', '事務所',        '店舗・事務所（売買）',  '0600101', 'tc=0600101', FALSE, 41),

  -- ============================
  -- SUUMO 賃貸
  -- ============================
  ('suumo', 'rent', 'マンション',  'マンション・アパート（賃貸）', '0300101', 'tc=0300101', TRUE,  10),
  ('suumo', 'rent', 'アパート',    'マンション・アパート（賃貸）', '0300101', 'tc=0300101', FALSE, 11),
  ('suumo', 'rent', '戸建',        '一戸建て（賃貸）',            '0401101', 'tc=0401101', FALSE, 20),
  ('suumo', 'rent', '一戸建て',    '一戸建て（賃貸）',            '0401101', 'tc=0401101', FALSE, 21),
  ('suumo', 'rent', '店舗',        '店舗・事務所（賃貸）',        '0700101', 'tc=0700101', FALSE, 30),
  ('suumo', 'rent', '事務所',      '店舗・事務所（賃貸）',        '0700101', 'tc=0700101', FALSE, 31),

  -- ============================
  -- AtHome 売買
  -- ============================
  ('athome', 'sale', 'マンション',    '中古マンション（売買）', NULL, '/mansion/chuko',    TRUE,  10),
  ('athome', 'sale', '中古マンション','中古マンション（売買）', NULL, '/mansion/chuko',    FALSE, 11),
  ('athome', 'sale', '新築マンション','新築マンション（売買）', NULL, '/mansion/shinchiku', FALSE, 12),
  ('athome', 'sale', '戸建',          '中古一戸建て（売買）',  NULL, '/kodate/chuko',     FALSE, 20),
  ('athome', 'sale', '一戸建て',      '中古一戸建て（売買）',  NULL, '/kodate/chuko',     FALSE, 21),
  ('athome', 'sale', '中古戸建',      '中古一戸建て（売買）',  NULL, '/kodate/chuko',     FALSE, 22),
  ('athome', 'sale', '新築戸建',      '新築一戸建て（売買）',  NULL, '/kodate/shinchiku', FALSE, 23),
  ('athome', 'sale', '新築一戸建て',  '新築一戸建て（売買）',  NULL, '/kodate/shinchiku', FALSE, 24),
  ('athome', 'sale', '土地',          '土地（売買）',          NULL, '/tochi',            FALSE, 30),
  ('athome', 'sale', '店舗',          '店舗・事務所（売買）',  NULL, '/shop-office/chuko', FALSE, 40),
  ('athome', 'sale', '事務所',        '店舗・事務所（売買）',  NULL, '/shop-office/chuko', FALSE, 41),

  -- ============================
  -- AtHome 賃貸
  -- ============================
  ('athome', 'rent', 'マンション',  'マンション（賃貸）',    NULL, '/chintai',           TRUE,  10),
  ('athome', 'rent', 'アパート',    'アパート（賃貸）',      NULL, '/chintai',           FALSE, 11),
  ('athome', 'rent', '戸建',        '一戸建て（賃貸）',      NULL, '/kodate/chintai',   FALSE, 20),
  ('athome', 'rent', '一戸建て',    '一戸建て（賃貸）',      NULL, '/kodate/chintai',   FALSE, 21),
  ('athome', 'rent', '店舗',        '店舗・事務所（賃貸）',  NULL, '/shop-office/chintai', FALSE, 30),
  ('athome', 'rent', '事務所',      '店舗・事務所（賃貸）',  NULL, '/shop-office/chintai', FALSE, 31),

  -- ============================
  -- HOME'S 売買 (AtHome と同じパス形式)
  -- ============================
  ('homes', 'sale', 'マンション',    '中古マンション（売買）', NULL, '/mansion/chuko',    TRUE,  10),
  ('homes', 'sale', '中古マンション','中古マンション（売買）', NULL, '/mansion/chuko',    FALSE, 11),
  ('homes', 'sale', '新築マンション','新築マンション（売買）', NULL, '/mansion/shinchiku', FALSE, 12),
  ('homes', 'sale', '戸建',          '中古一戸建て（売買）',  NULL, '/kodate/chuko',     FALSE, 20),
  ('homes', 'sale', '一戸建て',      '中古一戸建て（売買）',  NULL, '/kodate/chuko',     FALSE, 21),
  ('homes', 'sale', '中古戸建',      '中古一戸建て（売買）',  NULL, '/kodate/chuko',     FALSE, 22),
  ('homes', 'sale', '新築戸建',      '新築一戸建て（売買）',  NULL, '/kodate/shinchiku', FALSE, 23),
  ('homes', 'sale', '新築一戸建て',  '新築一戸建て（売買）',  NULL, '/kodate/shinchiku', FALSE, 24),
  ('homes', 'sale', '土地',          '土地（売買）',          NULL, '/tochi',            FALSE, 30),
  ('homes', 'sale', '店舗',          '店舗・事務所（売買）',  NULL, '/shop-office/chuko', FALSE, 40),
  ('homes', 'sale', '事務所',        '店舗・事務所（売買）',  NULL, '/shop-office/chuko', FALSE, 41),

  -- ============================
  -- HOME'S 賃貸
  -- ============================
  ('homes', 'rent', 'マンション',  'マンション（賃貸）',    NULL, '/chintai',           TRUE,  10),
  ('homes', 'rent', 'アパート',    'アパート（賃貸）',      NULL, '/chintai',           FALSE, 11),
  ('homes', 'rent', '戸建',        '一戸建て（賃貸）',      NULL, '/kodate/chintai',   FALSE, 20),
  ('homes', 'rent', '一戸建て',    '一戸建て（賃貸）',      NULL, '/kodate/chintai',   FALSE, 21),
  ('homes', 'rent', '店舗',        '店舗・事務所（賃貸）',  NULL, '/shop-office/chintai', FALSE, 30),
  ('homes', 'rent', '事務所',      '店舗・事務所（賃貸）',  NULL, '/shop-office/chintai', FALSE, 31)

ON CONFLICT (portal, transaction_type, input_pattern) DO UPDATE
  SET display_name    = EXCLUDED.display_name,
      portal_code     = EXCLUDED.portal_code,
      portal_url_param = EXCLUDED.portal_url_param,
      is_default      = EXCLUDED.is_default,
      sort_order      = EXCLUDED.sort_order,
      updated_at      = NOW();
