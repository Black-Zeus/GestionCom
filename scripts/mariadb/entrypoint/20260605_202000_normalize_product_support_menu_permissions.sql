-- Separa mantenedores auxiliares de producto y normaliza permisos de acceso.

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

INSERT IGNORE INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active) VALUES
('PRODUCT_BARCODES_ACCESS', 'Acceder a Codigos de Barra de Productos', 'PRODUCTS', 'Permite visualizar codigos de barra asociados a SKU y unidades.', TRUE),
('PRODUCT_BARCODES_MANAGE', 'Gestionar Codigos de Barra de Productos', 'PRODUCTS', 'Permite crear, editar, activar y eliminar codigos de barra de productos.', TRUE),
('PRODUCT_UNITS_ACCESS', 'Acceder a Unidades por Producto', 'PRODUCTS', 'Permite visualizar unidades alternativas por producto.', TRUE),
('PRODUCT_UNITS_MANAGE', 'Gestionar Unidades por Producto', 'PRODUCTS', 'Permite crear, editar, activar y eliminar unidades alternativas por producto.', TRUE),
('PRODUCT_MEDIA_ACCESS', 'Acceder a Media de Productos', 'PRODUCTS', 'Permite visualizar media tecnica asociada a productos.', TRUE),
('PRODUCT_MEDIA_MANAGE', 'Gestionar Media de Productos', 'PRODUCTS', 'Permite crear, editar y eliminar media tecnica asociada a productos.', TRUE);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'PRODUCT_BRAND_MODELS_ACCESS',
  'PRODUCT_BRAND_MODELS_MANAGE',
  'PRODUCT_BARCODES_ACCESS',
  'PRODUCT_BARCODES_MANAGE',
  'PRODUCT_UNITS_ACCESS',
  'PRODUCT_UNITS_MANAGE',
  'PRODUCT_MEDIA_ACCESS',
  'PRODUCT_MEDIA_MANAGE'
)
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN');

INSERT INTO menu_items (
  parent_id, menu_code, menu_name, menu_description, icon_name, menu_url,
  menu_type, required_permission_id, is_active, is_visible, sort_order, menu_level, menu_path
) VALUES
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'product_brand_models', 'Marcas y modelos de productos', 'Catalogo de marcas y modelos reutilizables en productos.', 'price-tag-3-line', '/products/brands-models', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PRODUCT_BRAND_MODELS_ACCESS'), TRUE, TRUE, 78, 2, '/products/brands-models'),
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'barcodes', 'Codigos de barra de productos', 'Codigos asociados a SKU / Variedades y unidades comerciales.', 'qr-code-line', '/barcodes', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PRODUCT_BARCODES_ACCESS'), TRUE, TRUE, 80, 2, '/barcodes'),
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'product_units', 'Unidades por producto', 'Unidades alternativas de compra, venta e inventario.', 'ruler-line', '/products/units', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PRODUCT_UNITS_ACCESS'), TRUE, TRUE, 82, 2, '/products/units'),
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'product_media', 'Media de productos', 'Media tecnica asociada a productos o SKU / Variedades.', 'image-line', '/products/media', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PRODUCT_MEDIA_ACCESS'), TRUE, TRUE, 84, 2, '/products/media')
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

UPDATE menu_items
SET is_active = FALSE,
    is_visible = FALSE
WHERE menu_code IN ('products_barcodes', 'products_brand_models', 'products_units', 'products_media')
   OR menu_url IN ('/products/barcodes');

-- Root hereda SUPER_ADMIN; este refuerzo mantiene SUPER_ADMIN con todos los permisos activos.
INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.is_active = TRUE
WHERE r.role_code = 'SUPER_ADMIN';
