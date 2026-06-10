-- Composite index for ORDER BY created_at DESC, id DESC used in list_movements endpoint.
-- Single-column idx_created_at existed but forced filesort when id is the tiebreaker.
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at_id
    ON stock_movements (created_at DESC, id DESC);

-- Refresh optimizer statistics so the new index is used immediately.
ANALYZE TABLE stock_movements, products, product_variants,
              warehouses, product_measurement_units,
              warehouse_zones, warehouse_zone_locations,
              measurement_units, users;
