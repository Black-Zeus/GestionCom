USE inventario;

INSERT INTO menu_items (
  parent_id,
  menu_code,
  menu_name,
  menu_description,
  icon_name,
  menu_url,
  menu_type,
  required_permission_id,
  is_active,
  is_visible,
  sort_order,
  menu_level,
  menu_path
) VALUES (
  (SELECT id FROM menu_items WHERE menu_code = 'sales' LIMIT 1),
  'sales_completed',
  'Ventas realizadas',
  'Consulta de documentos de venta cerrados en caja.',
  'receipt-line',
  '/sales/completed',
  'LINK',
  (SELECT id FROM permissions WHERE permission_code = 'SALES_HISTORY_ACCESS' LIMIT 1),
  TRUE,
  TRUE,
  45,
  2,
  '/sales/completed'
)
ON DUPLICATE KEY UPDATE
  menu_name = VALUES(menu_name),
  menu_description = VALUES(menu_description),
  icon_name = VALUES(icon_name),
  menu_url = VALUES(menu_url),
  required_permission_id = VALUES(required_permission_id),
  is_active = TRUE,
  is_visible = TRUE,
  sort_order = VALUES(sort_order),
  menu_path = VALUES(menu_path);
