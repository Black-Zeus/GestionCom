-- Agrega el ítem de menú "Tipos de cambio" bajo la sección Finanzas (parent_id=66).
USE inventario;

INSERT INTO `menu_items`
  (`menu_code`, `menu_name`, `menu_description`, `icon_name`, `menu_url`,
   `menu_type`, `parent_id`, `required_permission_id`,
   `is_active`, `is_visible`, `sort_order`, `menu_level`, `menu_path`, `target_window`)
VALUES
  ('finance_exchange_rates',
   'Tipos de cambio',
   'Consulta y sincronizacion de tipos de cambio desde Frankfurter.',
   'arrow-left-right-line',
   '/finance/exchange-rates',
   'LINK',
   66,
   (SELECT id FROM permissions WHERE permission_code = 'FINANCE_MAINTAINERS_ACCESS'),
   1, 1, 25, 2, '/finance/exchange-rates', 'SELF')
ON DUPLICATE KEY UPDATE
  menu_name              = VALUES(menu_name),
  menu_url               = VALUES(menu_url),
  required_permission_id = VALUES(required_permission_id),
  is_active              = 1,
  is_visible             = 1,
  updated_at             = NOW();
