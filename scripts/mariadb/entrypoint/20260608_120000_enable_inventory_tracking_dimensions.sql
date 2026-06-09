-- Habilita dimensiones operativas de inventario por lote y vencimiento.
-- Fase 1: ubicacion + lote + vencimiento. Seriales quedan a nivel de movimientos.

ALTER TABLE stock
  ADD COLUMN IF NOT EXISTS batch_lot_number VARCHAR(100) NULL AFTER warehouse_zone_location_id,
  ADD COLUMN IF NOT EXISTS expiry_date DATE NULL AFTER batch_lot_number;

ALTER TABLE stock_transfer_items
  ADD COLUMN IF NOT EXISTS batch_lot_number VARCHAR(100) NULL AFTER source_warehouse_zone_location_id,
  ADD COLUMN IF NOT EXISTS expiry_date DATE NULL AFTER batch_lot_number;

ALTER TABLE stock
  ADD INDEX IF NOT EXISTS idx_batch_lot_number (batch_lot_number),
  ADD INDEX IF NOT EXISTS idx_expiry_date (expiry_date);

ALTER TABLE stock_transfer_items
  ADD INDEX IF NOT EXISTS idx_transfer_batch_lot_number (batch_lot_number),
  ADD INDEX IF NOT EXISTS idx_transfer_expiry_date (expiry_date);

ALTER TABLE stock
  DROP INDEX IF EXISTS uk_stock_location,
  DROP INDEX IF EXISTS uk_stock_location_detail,
  ADD UNIQUE KEY IF NOT EXISTS uk_stock_inventory_dimensions (
    product_variant_id,
    warehouse_id,
    warehouse_zone_id,
    warehouse_zone_location_id,
    batch_lot_number,
    expiry_date
  );

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
    sm.serial_number,
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
