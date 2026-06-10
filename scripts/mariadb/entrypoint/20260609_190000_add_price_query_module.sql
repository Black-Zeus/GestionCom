-- Agrega el modulo de consulta de precio en el menu de ventas.

INSERT INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active)
VALUES (
  'PRICE_QUERY_ACCESS',
  'Consultar Precios de Productos',
  'SALES',
  'Permite consultar el precio de venta de productos por lista de precios y ver el stock disponible por local.',
  TRUE
)
ON DUPLICATE KEY UPDATE
  permission_name = VALUES(permission_name),
  permission_group = VALUES(permission_group),
  permission_description = VALUES(permission_description),
  is_active = VALUES(is_active);

-- Otorgar permiso a roles que deben tener acceso a la consulta de precios
INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, (SELECT id FROM users WHERE username = 'root' LIMIT 1)
FROM roles r
JOIN permissions p ON p.permission_code = 'PRICE_QUERY_ACCESS'
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'SUPERVISOR');

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, (SELECT id FROM users WHERE username = 'root' LIMIT 1)
FROM roles r
JOIN permissions p ON p.permission_code = 'PRICE_QUERY_ACCESS'
WHERE r.role_code IN ('SELLER', 'CASHIER');

-- Insertar item de menu dentro del grupo Ventas
INSERT INTO menu_items (
  parent_id, menu_code, menu_name, menu_description, icon_name, menu_url,
  menu_type, required_permission_id, is_active, is_visible, sort_order, menu_level, menu_path
) VALUES (
  (SELECT id FROM menu_items WHERE menu_code = 'sales'),
  'price_query',
  'Consulta de precio',
  'Consulta el precio de venta de productos por lista de precios y revisa el stock disponible por local.',
  'price-tag-3-line',
  '/sales/price-query',
  'LINK',
  (SELECT id FROM permissions WHERE permission_code = 'PRICE_QUERY_ACCESS'),
  TRUE,
  TRUE,
  35,
  2,
  '/sales/price-query'
)
ON DUPLICATE KEY UPDATE
  parent_id      = VALUES(parent_id),
  menu_name      = VALUES(menu_name),
  menu_description = VALUES(menu_description),
  icon_name      = VALUES(icon_name),
  menu_url       = VALUES(menu_url),
  menu_type      = VALUES(menu_type),
  required_permission_id = VALUES(required_permission_id),
  is_active      = VALUES(is_active),
  is_visible     = VALUES(is_visible),
  sort_order     = VALUES(sort_order),
  menu_level     = VALUES(menu_level),
  menu_path      = VALUES(menu_path);

-- Vincular permisos alternativos: quien tenga PRICE_LISTS_ACCESS o PRICE_LISTS_MANAGE
-- tambien puede ver el modulo (sin necesitar PRICE_QUERY_ACCESS explicitamente)
INSERT IGNORE INTO menu_item_permissions (menu_item_id, permission_id, permission_type)
SELECT
  (SELECT id FROM menu_items WHERE menu_code = 'price_query'),
  p.id,
  'ALTERNATIVE'
FROM permissions p
WHERE p.permission_code IN ('PRICE_LISTS_ACCESS', 'PRICE_LISTS_MANAGE');
