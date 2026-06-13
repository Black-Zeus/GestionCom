-- Agrega el mantenedor de denominaciones de efectivo al menu de administracion de caja.
USE inventario;

INSERT INTO menu_items
  (menu_code, menu_name, menu_description, icon_name, menu_url, menu_type, parent_id,
   is_active, is_visible, sort_order, menu_level, menu_path, target_window)
VALUES
  ('cash_denominations_admin',
   'Denominaciones de efectivo',
   'Administracion de billetes y monedas para arqueo y apertura de caja.',
   'money-dollar-circle-line',
   '/admin/cash/denominations',
   'LINK',
   8,
   1, 1, 45, 2, '/admin/cash/denominations', 'SELF')
ON DUPLICATE KEY UPDATE
  menu_name    = VALUES(menu_name),
  menu_url     = VALUES(menu_url),
  is_active    = 1,
  is_visible   = 1,
  updated_at   = NOW();
