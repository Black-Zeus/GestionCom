-- Normaliza el submodulo Unidades por producto.
-- Deja permisos especificos, menu visible y unidad base relacional por producto.

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

INSERT IGNORE INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active) VALUES
('PRODUCT_UNITS_ACCESS', 'Acceder a Unidades por Producto', 'PRODUCTS', 'Permite visualizar unidades alternativas por producto.', TRUE),
('PRODUCT_UNITS_MANAGE', 'Gestionar Unidades por Producto', 'PRODUCTS', 'Permite crear, editar, activar y eliminar unidades alternativas por producto.', TRUE);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN ('PRODUCT_UNITS_ACCESS', 'PRODUCT_UNITS_MANAGE')
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN');

INSERT INTO menu_items (
  parent_id, menu_code, menu_name, menu_description, icon_name, menu_url,
  menu_type, required_permission_id, is_active, is_visible, sort_order, menu_level, menu_path
) VALUES
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'product_units', 'Unidades por producto', 'Unidades alternativas de compra, venta e inventario.', 'ruler-line', '/products/units', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PRODUCT_UNITS_ACCESS'), TRUE, TRUE, 82, 2, '/products/units')
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
WHERE menu_code IN ('products_units')
   OR menu_url IN ('/product-units', '/inventory/product-units');

UPDATE product_measurement_units
SET conversion_factor = 1.000000
WHERE conversion_factor <= 0;

UPDATE product_measurement_units pmu
JOIN products p ON p.id = pmu.product_id
SET pmu.conversion_factor = 1.000000,
    pmu.is_sale_unit = TRUE,
    pmu.is_inventory_unit = TRUE,
    pmu.is_active = TRUE
WHERE pmu.measurement_unit_id = p.base_measurement_unit_id;

INSERT INTO product_measurement_units (
  product_id, measurement_unit_id, conversion_factor,
  is_purchase_unit, is_sale_unit, is_inventory_unit, is_active
)
SELECT
  p.id, p.base_measurement_unit_id, 1.000000,
  FALSE, TRUE, TRUE, TRUE
FROM products p
LEFT JOIN product_measurement_units pmu
  ON pmu.product_id = p.id
 AND pmu.measurement_unit_id = p.base_measurement_unit_id
WHERE p.deleted_at IS NULL
  AND pmu.id IS NULL;

UPDATE product_measurement_units
SET is_sale_unit = TRUE,
    is_inventory_unit = TRUE
WHERE is_purchase_unit = FALSE
  AND is_sale_unit = FALSE
  AND is_inventory_unit = FALSE;

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.is_active = TRUE
WHERE r.role_code = 'SUPER_ADMIN';
