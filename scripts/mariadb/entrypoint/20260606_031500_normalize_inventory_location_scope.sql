-- Extiende inventario y movimientos hasta ubicaciones internas.
-- Jerarquia operativa: Bodega -> Zona -> Ubicacion interna.

ALTER TABLE stock
  ADD COLUMN IF NOT EXISTS warehouse_zone_location_id BIGINT UNSIGNED NULL AFTER warehouse_zone_id;

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS warehouse_zone_location_id BIGINT UNSIGNED NULL AFTER warehouse_zone_id;

ALTER TABLE physical_inventory_counts
  ADD COLUMN IF NOT EXISTS warehouse_zone_location_id BIGINT UNSIGNED NULL AFTER warehouse_zone_id;

ALTER TABLE physical_inventory_count_items
  ADD COLUMN IF NOT EXISTS warehouse_zone_location_id BIGINT UNSIGNED NULL AFTER warehouse_zone_id;

ALTER TABLE stock
  ADD INDEX IF NOT EXISTS idx_warehouse_zone_location_id (warehouse_zone_location_id);

ALTER TABLE stock_movements
  ADD INDEX IF NOT EXISTS idx_warehouse_zone_location_id (warehouse_zone_location_id);

ALTER TABLE physical_inventory_counts
  ADD INDEX IF NOT EXISTS idx_warehouse_zone_location_id (warehouse_zone_location_id);

ALTER TABLE physical_inventory_count_items
  ADD INDEX IF NOT EXISTS idx_warehouse_zone_location_id (warehouse_zone_location_id);

ALTER TABLE stock
  DROP INDEX IF EXISTS uk_stock_location,
  ADD UNIQUE KEY IF NOT EXISTS uk_stock_location_detail (
    product_variant_id,
    warehouse_id,
    warehouse_zone_id,
    warehouse_zone_location_id
  );

ALTER TABLE physical_inventory_count_items
  DROP INDEX IF EXISTS uk_count_product_zone_batch,
  ADD UNIQUE KEY IF NOT EXISTS uk_count_product_location_batch (
    physical_inventory_count_id,
    product_variant_id,
    warehouse_zone_id,
    warehouse_zone_location_id,
    batch_lot_number,
    serial_number
  );

SET @stock_location_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'stock'
    AND CONSTRAINT_NAME = 'fk_stock_zone_location'
);
SET @stock_location_fk_sql := IF(
  @stock_location_fk_exists = 0,
  'ALTER TABLE stock ADD CONSTRAINT fk_stock_zone_location FOREIGN KEY (warehouse_zone_location_id) REFERENCES warehouse_zone_locations(id) ON DELETE SET NULL',
  'DO 0'
);
PREPARE stock_location_fk_stmt FROM @stock_location_fk_sql;
EXECUTE stock_location_fk_stmt;
DEALLOCATE PREPARE stock_location_fk_stmt;

SET @stock_movements_location_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'stock_movements'
    AND CONSTRAINT_NAME = 'fk_stock_movements_zone_location'
);
SET @stock_movements_location_fk_sql := IF(
  @stock_movements_location_fk_exists = 0,
  'ALTER TABLE stock_movements ADD CONSTRAINT fk_stock_movements_zone_location FOREIGN KEY (warehouse_zone_location_id) REFERENCES warehouse_zone_locations(id) ON DELETE SET NULL',
  'DO 0'
);
PREPARE stock_movements_location_fk_stmt FROM @stock_movements_location_fk_sql;
EXECUTE stock_movements_location_fk_stmt;
DEALLOCATE PREPARE stock_movements_location_fk_stmt;

SET @physical_counts_location_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'physical_inventory_counts'
    AND CONSTRAINT_NAME = 'fk_physical_counts_zone_location'
);
SET @physical_counts_location_fk_sql := IF(
  @physical_counts_location_fk_exists = 0,
  'ALTER TABLE physical_inventory_counts ADD CONSTRAINT fk_physical_counts_zone_location FOREIGN KEY (warehouse_zone_location_id) REFERENCES warehouse_zone_locations(id) ON DELETE SET NULL',
  'DO 0'
);
PREPARE physical_counts_location_fk_stmt FROM @physical_counts_location_fk_sql;
EXECUTE physical_counts_location_fk_stmt;
DEALLOCATE PREPARE physical_counts_location_fk_stmt;

SET @physical_items_location_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'physical_inventory_count_items'
    AND CONSTRAINT_NAME = 'fk_physical_items_zone_location'
);
SET @physical_items_location_fk_sql := IF(
  @physical_items_location_fk_exists = 0,
  'ALTER TABLE physical_inventory_count_items ADD CONSTRAINT fk_physical_items_zone_location FOREIGN KEY (warehouse_zone_location_id) REFERENCES warehouse_zone_locations(id) ON DELETE SET NULL',
  'DO 0'
);
PREPARE physical_items_location_fk_stmt FROM @physical_items_location_fk_sql;
EXECUTE physical_items_location_fk_stmt;
DEALLOCATE PREPARE physical_items_location_fk_stmt;

CREATE OR REPLACE VIEW v_recent_stock_movements AS
SELECT
    sm.id,
    p.product_code,
    p.product_name,
    pv.variant_sku,
    pv.variant_name,
    w.warehouse_code,
    w.warehouse_name,
    wz.zone_code,
    wz.zone_name,
    wzl.location_code,
    wzl.location_name,
    sm.movement_type,
    sm.reference_type,
    sm.quantity,
    sm.quantity_before,
    sm.quantity_after,
    sm.batch_lot_number,
    sm.expiry_date,
    u.username AS created_by,
    sm.created_at
FROM stock_movements sm
JOIN product_variants pv ON sm.product_variant_id = pv.id
JOIN products p ON pv.product_id = p.id
JOIN warehouses w ON sm.warehouse_id = w.id
LEFT JOIN warehouse_zones wz ON sm.warehouse_zone_id = wz.id
LEFT JOIN warehouse_zone_locations wzl ON sm.warehouse_zone_location_id = wzl.id
JOIN users u ON sm.created_by_user_id = u.id
WHERE p.deleted_at IS NULL
    AND pv.deleted_at IS NULL
    AND w.deleted_at IS NULL
    AND u.deleted_at IS NULL
ORDER BY sm.created_at DESC;

CREATE OR REPLACE VIEW v_physical_inventory_differences AS
SELECT
    pic.id AS count_id,
    pic.count_code,
    w.warehouse_code,
    w.warehouse_name,
    wz.zone_code,
    wz.zone_name,
    wzl.location_code,
    wzl.location_name,
    pv.variant_sku,
    pv.variant_name,
    p.product_code,
    p.product_name,
    pici.system_quantity,
    pici.counted_quantity,
    pici.difference_quantity,
    pici.difference_cost,
    pici.review_status
FROM physical_inventory_count_items pici
JOIN physical_inventory_counts pic ON pic.id = pici.physical_inventory_count_id
JOIN warehouses w ON w.id = pic.warehouse_id
LEFT JOIN warehouse_zones wz ON wz.id = pici.warehouse_zone_id
LEFT JOIN warehouse_zone_locations wzl ON wzl.id = pici.warehouse_zone_location_id
JOIN product_variants pv ON pv.id = pici.product_variant_id
JOIN products p ON p.id = pv.product_id
WHERE pici.difference_quantity <> 0;
