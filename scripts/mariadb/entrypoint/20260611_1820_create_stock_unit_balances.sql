-- Tabla de saldos de stock por unidad de medida.
-- Requerida por apply_unit_balance_delta en sales_documents para registrar
-- movimientos de inventario al cerrar ventas, devoluciones y cambios.
USE inventario;

-- Agregar RETURN al enum de reference_type si no existe
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
