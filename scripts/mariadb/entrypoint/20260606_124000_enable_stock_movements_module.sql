-- Normaliza el modulo operativo de movimientos manuales de stock.

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS manual_movement_type VARCHAR(50) NULL AFTER reference_type,
  ADD COLUMN IF NOT EXISTS measurement_unit_id BIGINT UNSIGNED NULL AFTER manual_movement_type,
  ADD COLUMN IF NOT EXISTS movement_unit_quantity DECIMAL(15,4) NULL AFTER measurement_unit_id,
  ADD INDEX IF NOT EXISTS idx_manual_movement_type (manual_movement_type);

SET @stock_movements_unit_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'stock_movements'
    AND CONSTRAINT_NAME = 'fk_stock_movements_measurement_unit'
);
SET @stock_movements_unit_fk_sql := IF(
  @stock_movements_unit_fk_exists = 0,
  'ALTER TABLE stock_movements ADD CONSTRAINT fk_stock_movements_measurement_unit FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stock_movements_unit_fk_stmt FROM @stock_movements_unit_fk_sql;
EXECUTE stock_movements_unit_fk_stmt;
DEALLOCATE PREPARE stock_movements_unit_fk_stmt;

INSERT INTO product_measurement_units (
  product_id,
  measurement_unit_id,
  conversion_factor,
  is_purchase_unit,
  is_sale_unit,
  is_inventory_unit,
  is_active
)
SELECT
  p.id,
  p.base_measurement_unit_id,
  1.000000,
  TRUE,
  TRUE,
  TRUE,
  TRUE
FROM products p
JOIN measurement_units mu ON mu.id = p.base_measurement_unit_id
LEFT JOIN product_measurement_units pmu
  ON pmu.product_id = p.id
 AND pmu.measurement_unit_id = p.base_measurement_unit_id
WHERE p.deleted_at IS NULL
  AND mu.deleted_at IS NULL
  AND pmu.id IS NULL;

UPDATE product_measurement_units pmu
JOIN products p
  ON p.id = pmu.product_id
 AND p.base_measurement_unit_id = pmu.measurement_unit_id
SET pmu.conversion_factor = 1.000000,
    pmu.is_inventory_unit = TRUE,
    pmu.is_active = TRUE
WHERE p.deleted_at IS NULL;

INSERT IGNORE INTO permissions (
  permission_code,
  permission_name,
  permission_group,
  permission_description,
  is_active
) VALUES
('STOCK_MOVEMENTS_ACCESS', 'Acceder a Movimientos de stock', 'INVENTORY', 'Permite consultar movimientos de stock.', TRUE),
('STOCK_ADJUST', 'Registrar movimientos manuales de stock', 'INVENTORY', 'Permite ingresar, retirar o ajustar stock manualmente.', TRUE);

UPDATE menu_items
SET
  menu_name = 'Movimientos de stock',
  menu_description = 'Ingresos, egresos y ajustes manuales de stock.',
  icon_name = 'archive-line',
  menu_url = '/stock/movements',
  required_permission_id = (SELECT id FROM permissions WHERE permission_code = 'STOCK_MOVEMENTS_ACCESS'),
  is_active = TRUE,
  is_visible = TRUE,
  sort_order = 20,
  menu_path = '/stock/movements',
  updated_at = CURRENT_TIMESTAMP
WHERE menu_code = 'stock_movements';

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
)
SELECT
  (SELECT id FROM menu_items WHERE menu_code = 'inventory'),
  'stock_movements',
  'Movimientos de stock',
  'Ingresos, egresos y ajustes manuales de stock.',
  'archive-line',
  '/stock/movements',
  'LINK',
  (SELECT id FROM permissions WHERE permission_code = 'STOCK_MOVEMENTS_ACCESS'),
  TRUE,
  TRUE,
  20,
  2,
  '/stock/movements'
WHERE NOT EXISTS (
  SELECT 1 FROM menu_items WHERE menu_code = 'stock_movements'
);

UPDATE menu_items
SET is_active = FALSE,
    is_visible = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE menu_code = 'inventory_adjustments';

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, 1
FROM roles r
JOIN permissions p ON p.permission_code IN ('STOCK_MOVEMENTS_ACCESS', 'STOCK_ADJUST')
WHERE r.role_code IN ('SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER');
