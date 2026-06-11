-- Habilita seriales como dimension operativa de stock y transferencias.
-- Regla funcional: un producto serializado se mueve en lineas de cantidad 1 por serial.

ALTER TABLE stock
  ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100) NULL AFTER expiry_date;

ALTER TABLE stock_transfer_items
  ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100) NULL AFTER expiry_date;

ALTER TABLE stock
  ADD INDEX IF NOT EXISTS idx_stock_serial_number (serial_number);

ALTER TABLE stock_transfer_items
  ADD INDEX IF NOT EXISTS idx_transfer_serial_number (serial_number);

ALTER TABLE stock
  DROP INDEX IF EXISTS uk_stock_location,
  DROP INDEX IF EXISTS uk_stock_location_detail,
  DROP INDEX IF EXISTS uk_stock_inventory_dimensions,
  ADD UNIQUE KEY IF NOT EXISTS uk_stock_tracking_dimensions (
    product_variant_id,
    warehouse_id,
    warehouse_zone_id,
    warehouse_zone_location_id,
    batch_lot_number,
    expiry_date,
    serial_number
  );
