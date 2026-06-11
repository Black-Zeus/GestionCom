-- Controla visibilidad de checks funcionales en el maestro de productos.

INSERT INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active) VALUES
('PRODUCT_FLAG_SETTINGS_ACCESS', 'Acceder a Configuracion de Checks de Producto', 'PRODUCTS', 'Permite ver que checks funcionales se muestran en el maestro de productos.', TRUE),
('PRODUCT_FLAG_SETTINGS_MANAGE', 'Gestionar Configuracion de Checks de Producto', 'PRODUCTS', 'Permite mostrar u ocultar checks funcionales del maestro de productos.', TRUE)
ON DUPLICATE KEY UPDATE
  permission_name = VALUES(permission_name),
  permission_group = VALUES(permission_group),
  permission_description = VALUES(permission_description),
  is_active = VALUES(is_active);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, (SELECT id FROM users WHERE username = 'root' LIMIT 1)
FROM roles r
JOIN permissions p ON p.permission_code IN ('PRODUCT_FLAG_SETTINGS_ACCESS', 'PRODUCT_FLAG_SETTINGS_MANAGE')
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN');

INSERT INTO menu_items (
  parent_id, menu_code, menu_name, menu_description, icon_name, menu_url,
  menu_type, required_permission_id, is_active, is_visible, sort_order, menu_level, menu_path
) VALUES (
  (SELECT id FROM menu_items WHERE menu_code = 'administration'),
  'product_flag_settings',
  'Checks de producto',
  'Mostrar u ocultar checks funcionales del maestro de productos.',
  'sliders-horizontal-line',
  '/admin/product-flags',
  'LINK',
  (SELECT id FROM permissions WHERE permission_code = 'PRODUCT_FLAG_SETTINGS_ACCESS'),
  TRUE,
  TRUE,
  55,
  2,
  '/admin/product-flags'
)
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  menu_name = VALUES(menu_name),
  menu_description = VALUES(menu_description),
  icon_name = VALUES(icon_name),
  menu_url = VALUES(menu_url),
  menu_type = VALUES(menu_type),
  required_permission_id = VALUES(required_permission_id),
  is_active = VALUES(is_active),
  is_visible = VALUES(is_visible),
  sort_order = VALUES(sort_order),
  menu_level = VALUES(menu_level),
  menu_path = VALUES(menu_path);

INSERT INTO system_features (feature_code, feature_name, feature_description, feature_type, default_value, current_value, is_active) VALUES
('PRODUCT_FLAG_ACTIVE_VISIBLE', 'Mostrar check Activo', 'Muestra u oculta el check Activo en el maestro de productos.', 'BOOLEAN', 'true', 'true', TRUE),
('PRODUCT_FLAG_VARIANTS_VISIBLE', 'Mostrar check Usa variantes', 'Muestra u oculta el check Usa variantes en el maestro de productos.', 'BOOLEAN', 'true', 'true', TRUE),
('BATCH_CONTROL_GLOBAL', 'Mostrar check Controla lotes', 'Muestra u oculta el check Controla lotes en el maestro de productos.', 'BOOLEAN', 'false', 'false', TRUE),
('EXPIRY_DATE_GLOBAL', 'Mostrar check Controla vencimiento', 'Muestra u oculta el check Controla vencimiento en el maestro de productos.', 'BOOLEAN', 'false', 'false', TRUE),
('SERIAL_NUMBERS_GLOBAL', 'Mostrar check Controla seriales', 'Muestra u oculta el check Controla seriales en el maestro de productos.', 'BOOLEAN', 'false', 'false', TRUE),
('LOCATION_TRACKING_GLOBAL', 'Mostrar check Controla ubicacion', 'Muestra u oculta el check Controla ubicacion en el maestro de productos.', 'BOOLEAN', 'false', 'false', TRUE)
ON DUPLICATE KEY UPDATE
  feature_name = VALUES(feature_name),
  feature_description = VALUES(feature_description),
  feature_type = VALUES(feature_type),
  default_value = VALUES(default_value),
  is_active = VALUES(is_active);
