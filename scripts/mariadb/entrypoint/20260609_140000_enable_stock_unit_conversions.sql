-- Habilita conversion de stock entre unidades de inventario del mismo SKU.
-- Ejemplo: 1 PACK con factor 6 se convierte en 6 UN sin cambiar el saldo base neto.

ALTER TABLE stock
  ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100) NULL AFTER expiry_date,
  ADD INDEX IF NOT EXISTS idx_stock_serial_number (serial_number);

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100) NULL AFTER expiry_date,
  ADD INDEX IF NOT EXISTS idx_stock_movements_serial_number (serial_number);

ALTER TABLE stock_movements
  MODIFY COLUMN reference_type ENUM('PURCHASE', 'SALE', 'TRANSFER', 'ADJUSTMENT', 'RETURN', 'DAMAGE', 'UNIT_CONVERSION') NOT NULL;

CREATE TABLE IF NOT EXISTS stock_unit_balances (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_variant_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  warehouse_zone_id BIGINT UNSIGNED NULL,
  warehouse_zone_location_id BIGINT UNSIGNED NULL,
  measurement_unit_id BIGINT UNSIGNED NOT NULL,
  batch_lot_number VARCHAR(100) NULL,
  expiry_date DATE NULL,
  serial_number VARCHAR(100) NULL,
  current_quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
  FOREIGN KEY (warehouse_zone_location_id) REFERENCES warehouse_zone_locations(id) ON DELETE SET NULL,
  FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id) ON DELETE RESTRICT,

  INDEX idx_stock_unit_balance_variant (product_variant_id),
  INDEX idx_stock_unit_balance_warehouse (warehouse_id),
  INDEX idx_stock_unit_balance_unit (measurement_unit_id),
  INDEX idx_stock_unit_balance_dimensions (
    product_variant_id,
    warehouse_id,
    warehouse_zone_id,
    warehouse_zone_location_id,
    measurement_unit_id,
    batch_lot_number,
    expiry_date,
    serial_number
  )
);

CREATE TABLE IF NOT EXISTS stock_unit_conversions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_variant_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  warehouse_zone_id BIGINT UNSIGNED NULL,
  warehouse_zone_location_id BIGINT UNSIGNED NULL,
  from_measurement_unit_id BIGINT UNSIGNED NOT NULL,
  to_measurement_unit_id BIGINT UNSIGNED NOT NULL,
  from_quantity DECIMAL(15,4) NOT NULL,
  to_quantity DECIMAL(15,4) NOT NULL,
  base_quantity DECIMAL(15,4) NOT NULL,
  batch_lot_number VARCHAR(100) NULL,
  expiry_date DATE NULL,
  serial_number VARCHAR(100) NULL,
  notes VARCHAR(500) NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
  FOREIGN KEY (warehouse_zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
  FOREIGN KEY (warehouse_zone_location_id) REFERENCES warehouse_zone_locations(id) ON DELETE SET NULL,
  FOREIGN KEY (from_measurement_unit_id) REFERENCES measurement_units(id) ON DELETE RESTRICT,
  FOREIGN KEY (to_measurement_unit_id) REFERENCES measurement_units(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,

  INDEX idx_stock_unit_conversion_variant (product_variant_id),
  INDEX idx_stock_unit_conversion_warehouse (warehouse_id),
  INDEX idx_stock_unit_conversion_created_at (created_at)
);

INSERT INTO stock_unit_balances (
  product_variant_id,
  warehouse_id,
  warehouse_zone_id,
  warehouse_zone_location_id,
  measurement_unit_id,
  batch_lot_number,
  expiry_date,
  serial_number,
  current_quantity
)
SELECT
  s.product_variant_id,
  s.warehouse_id,
  s.warehouse_zone_id,
  s.warehouse_zone_location_id,
  p.base_measurement_unit_id,
  s.batch_lot_number,
  s.expiry_date,
  s.serial_number,
  s.current_quantity
FROM stock s
JOIN product_variants pv ON pv.id = s.product_variant_id
JOIN products p ON p.id = pv.product_id
WHERE s.current_quantity <> 0
  AND NOT EXISTS (
    SELECT 1
    FROM stock_unit_balances sub
    WHERE sub.product_variant_id = s.product_variant_id
      AND sub.warehouse_id = s.warehouse_id
      AND sub.warehouse_zone_id <=> s.warehouse_zone_id
      AND sub.warehouse_zone_location_id <=> s.warehouse_zone_location_id
      AND sub.measurement_unit_id = p.base_measurement_unit_id
      AND sub.batch_lot_number <=> s.batch_lot_number
      AND sub.expiry_date <=> s.expiry_date
      AND sub.serial_number <=> s.serial_number
  );

INSERT INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active) VALUES
('STOCK_CONVERSIONS_ACCESS', 'Acceder a Conversiones de Stock', 'INVENTORY', 'Permite ver el modulo de conversion de stock entre unidades.', TRUE),
('STOCK_CONVERT', 'Convertir Stock entre Unidades', 'INVENTORY', 'Permite convertir stock disponible entre unidades de inventario del mismo SKU.', TRUE)
ON DUPLICATE KEY UPDATE
  permission_name = VALUES(permission_name),
  permission_group = VALUES(permission_group),
  permission_description = VALUES(permission_description),
  is_active = VALUES(is_active);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, (SELECT id FROM users WHERE username = 'root' LIMIT 1)
FROM roles r
JOIN permissions p ON p.permission_code IN ('STOCK_CONVERSIONS_ACCESS', 'STOCK_CONVERT')
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER');

INSERT INTO menu_items (
  parent_id, menu_code, menu_name, menu_description, icon_name, menu_url,
  menu_type, required_permission_id, is_active, is_visible, sort_order, menu_level, menu_path
) VALUES (
  (SELECT id FROM menu_items WHERE menu_code = 'inventory'),
  'stock_conversions',
  'Conversion de stock',
  'Transforma stock entre unidades de inventario del mismo SKU.',
  'exchange-line',
  '/stock/conversions',
  'LINK',
  (SELECT id FROM permissions WHERE permission_code = 'STOCK_CONVERSIONS_ACCESS'),
  TRUE,
  TRUE,
  25,
  2,
  '/stock/conversions'
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
