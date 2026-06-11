-- Habilita mantenedores de categorias, atributos y series de documentos.

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

ALTER TABLE document_series
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_document_series_deleted_at ON document_series (deleted_at);

INSERT IGNORE INTO categories (
  category_code, category_name, category_description, category_level, category_path, sort_order, is_active
) VALUES
('CAT_0001', 'Vestuario', 'Prendas de vestir y moda.', 1, 'Vestuario', 10, TRUE),
('CAT_0002', 'Accesorios', 'Accesorios personales y complementos.', 1, 'Accesorios', 20, TRUE),
('CAT_0003', 'Calzado', 'Zapatos, zapatillas y calzado en general.', 1, 'Calzado', 30, TRUE),
('CAT_0004', 'Bolsos y carteras', 'Bolsos, carteras, mochilas y similares.', 1, 'Bolsos y carteras', 40, TRUE),
('CAT_0005', 'Belleza y cuidado', 'Productos de belleza, cuidado personal y cosmetica.', 1, 'Belleza y cuidado', 50, TRUE);

INSERT IGNORE INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active) VALUES
('PRODUCT_CATEGORIES_MANAGE', 'Gestionar Categorias de Productos', 'PRODUCTS', 'Permite crear, editar, activar y eliminar categorias de productos.', TRUE),
('PRODUCT_ATTRIBUTES_ACCESS', 'Acceder a Atributos de Productos', 'PRODUCTS', 'Permite visualizar grupos, atributos y valores de productos.', TRUE),
('PRODUCT_ATTRIBUTES_MANAGE', 'Gestionar Atributos de Productos', 'PRODUCTS', 'Permite crear, editar, activar y eliminar grupos, atributos y valores.', TRUE),
('DOCUMENT_SERIES_MANAGE', 'Gestionar Series de Documentos', 'DOCUMENTS', 'Permite editar tipos y gestionar series de documentos.', TRUE);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'CATEGORIES_ACCESS',
  'PRODUCT_CATEGORIES_MANAGE',
  'PRODUCT_ATTRIBUTES_ACCESS',
  'PRODUCT_ATTRIBUTES_MANAGE',
  'DOCUMENT_SERIES_ACCESS',
  'DOCUMENT_SERIES_MANAGE'
)
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN');

INSERT INTO menu_items (
  parent_id, menu_code, menu_name, menu_description, icon_name, menu_url,
  menu_type, required_permission_id, is_active, is_visible, sort_order, menu_level, menu_path
) VALUES
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'product_attributes', 'Atributos de productos', 'Atributos de productos', 'list-check-line', '/product-attributes', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PRODUCT_ATTRIBUTES_ACCESS'), TRUE, TRUE, 75, 2, '/product-attributes')
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
SET required_permission_id = (SELECT id FROM permissions WHERE permission_code = 'CATEGORIES_ACCESS')
WHERE menu_code = 'categories';

UPDATE menu_items
SET required_permission_id = (SELECT id FROM permissions WHERE permission_code = 'DOCUMENT_SERIES_ACCESS')
WHERE menu_code = 'document_series';
