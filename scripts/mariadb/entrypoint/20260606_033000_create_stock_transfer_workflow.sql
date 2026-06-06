-- Flujo operativo de transferencias de stock y ubicacion final.
-- Cubre: envio entre bodegas -> recepcion en destino -> ubicacion interna.

CREATE TABLE IF NOT EXISTS stock_transfers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transfer_code VARCHAR(50) NOT NULL,
    source_warehouse_id BIGINT UNSIGNED NOT NULL,
    target_warehouse_id BIGINT UNSIGNED NOT NULL,
    status ENUM('DRAFT', 'SHIPPED', 'RECEIVED', 'LOCATED', 'CANCELLED') DEFAULT 'DRAFT',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shipped_at TIMESTAMP NULL,
    received_at TIMESTAMP NULL,
    located_at TIMESTAMP NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    shipped_by_user_id BIGINT UNSIGNED NULL,
    received_by_user_id BIGINT UNSIGNED NULL,
    located_by_user_id BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    FOREIGN KEY (source_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (target_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (shipped_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (received_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (located_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_stock_transfer_code (transfer_code),
    INDEX idx_source_warehouse_id (source_warehouse_id),
    INDEX idx_target_warehouse_id (target_warehouse_id),
    INDEX idx_status (status),
    INDEX idx_deleted_at (deleted_at)
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    stock_transfer_id BIGINT UNSIGNED NOT NULL,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    measurement_unit_id BIGINT UNSIGNED NOT NULL,
    quantity DECIMAL(15,4) NOT NULL,
    received_quantity DECIMAL(15,4) NULL,
    pending_putaway_quantity DECIMAL(15,4) GENERATED ALWAYS AS (COALESCE(received_quantity, 0) - putaway_quantity) VIRTUAL,
    putaway_quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    source_warehouse_zone_id BIGINT UNSIGNED NULL,
    source_warehouse_zone_location_id BIGINT UNSIGNED NULL,
    target_pending_warehouse_zone_id BIGINT UNSIGNED NULL,
    target_pending_warehouse_zone_location_id BIGINT UNSIGNED NULL,
    unit_cost DECIMAL(15,4) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (stock_transfer_id) REFERENCES stock_transfers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
    FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id) ON DELETE RESTRICT,
    FOREIGN KEY (source_warehouse_zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
    FOREIGN KEY (source_warehouse_zone_location_id) REFERENCES warehouse_zone_locations(id) ON DELETE SET NULL,
    FOREIGN KEY (target_pending_warehouse_zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
    FOREIGN KEY (target_pending_warehouse_zone_location_id) REFERENCES warehouse_zone_locations(id) ON DELETE SET NULL,
    INDEX idx_stock_transfer_id (stock_transfer_id),
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_source_location (source_warehouse_zone_id, source_warehouse_zone_location_id),
    INDEX idx_target_pending_location (target_pending_warehouse_zone_id, target_pending_warehouse_zone_location_id)
);

CREATE TABLE IF NOT EXISTS stock_transfer_putaways (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    stock_transfer_item_id BIGINT UNSIGNED NOT NULL,
    warehouse_zone_id BIGINT UNSIGNED NULL,
    warehouse_zone_location_id BIGINT UNSIGNED NULL,
    quantity DECIMAL(15,4) NOT NULL,
    located_by_user_id BIGINT UNSIGNED NOT NULL,
    located_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT NULL,

    FOREIGN KEY (stock_transfer_item_id) REFERENCES stock_transfer_items(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
    FOREIGN KEY (warehouse_zone_location_id) REFERENCES warehouse_zone_locations(id) ON DELETE SET NULL,
    FOREIGN KEY (located_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_stock_transfer_item_id (stock_transfer_item_id),
    INDEX idx_putaway_location (warehouse_zone_id, warehouse_zone_location_id),
    INDEX idx_located_at (located_at)
);

-- Cada bodega necesita una zona operacional de recepcion para stock aun no ubicado.
INSERT INTO warehouse_zones (
  warehouse_id,
  zone_code,
  zone_name,
  zone_description,
  is_location_tracking_enabled,
  is_active
)
SELECT
  w.id,
  CONCAT('REC_', REPLACE(w.warehouse_code, 'BOD_', '')),
  'Recepcion',
  'Zona operacional para stock recibido pendiente de ubicacion final.',
  TRUE,
  TRUE
FROM warehouses w
WHERE w.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM warehouse_zones wz
    WHERE wz.warehouse_id = w.id
      AND wz.zone_code = CONCAT('REC_', REPLACE(w.warehouse_code, 'BOD_', ''))
      AND wz.deleted_at IS NULL
  );

INSERT INTO warehouse_zone_locations (
  warehouse_zone_id,
  location_code,
  location_name,
  location_description,
  location_type,
  sort_order,
  is_active
)
SELECT
  wz.id,
  CONCAT('PEND_', REPLACE(w.warehouse_code, 'BOD_', '')),
  'Pendiente de ubicacion',
  'Ubicacion temporal para mercaderia recibida y aun no distribuida.',
  'GENERAL',
  0,
  TRUE
FROM warehouse_zones wz
JOIN warehouses w ON w.id = wz.warehouse_id
WHERE wz.zone_code = CONCAT('REC_', REPLACE(w.warehouse_code, 'BOD_', ''))
  AND wz.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM warehouse_zone_locations wzl
    WHERE wzl.warehouse_zone_id = wz.id
      AND wzl.location_code = CONCAT('PEND_', REPLACE(w.warehouse_code, 'BOD_', ''))
      AND wzl.deleted_at IS NULL
  );
