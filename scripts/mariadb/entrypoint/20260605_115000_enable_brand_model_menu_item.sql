-- Expone Marcas y modelos como modulo navegable propio y refuerza permisos root.

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

INSERT IGNORE INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active) VALUES
('PRODUCT_BRAND_MODELS_ACCESS', 'Acceder a Marcas y Modelos', 'PRODUCTS', 'Permite visualizar marcas y modelos de productos.', TRUE),
('PRODUCT_BRAND_MODELS_MANAGE', 'Gestionar Marcas y Modelos', 'PRODUCTS', 'Permite crear, editar y eliminar marcas y modelos de productos.', TRUE);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'PRODUCT_BRAND_MODELS_ACCESS',
  'PRODUCT_BRAND_MODELS_MANAGE',
  'FOUNDATION_MAINTAINERS_ACCESS',
  'FOUNDATION_MAINTAINERS_MANAGE'
)
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN');

INSERT INTO menu_items (
  parent_id, menu_code, menu_name, menu_description, icon_name, menu_url,
  menu_type, required_permission_id, is_active, is_visible, sort_order, menu_level, menu_path
) VALUES
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'product_brand_models', 'Marcas y modelos de productos', 'Catalogo de marcas y modelos para productos.', 'price-tag-3-line', '/products/brands-models', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PRODUCT_BRAND_MODELS_ACCESS'), TRUE, TRUE, 78, 2, '/products/brands-models')
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

-- Root hereda SUPER_ADMIN; este refuerzo mantiene SUPER_ADMIN con todos los permisos activos.
INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.is_active = TRUE
WHERE r.role_code = 'SUPER_ADMIN';
