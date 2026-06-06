-- Limpieza y seed de bodegas basado en inv_old/DB/inventario.sql.
-- Legacy detectado:
--   bodega: 25 Rodrig, 26 Irma, 27 Cecilia, 28 C-4
--   t_parametro / Sucursales: Taller, PYME, Santa Filomena, Patronato, Cecilia

SET @seed_user_id := COALESCE(
  (SELECT id FROM users WHERE username = 'root' LIMIT 1),
  (SELECT id FROM users ORDER BY id LIMIT 1)
);

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM transfer_reception_items;
DELETE FROM transfer_receptions;

DELETE FROM physical_inventory_adjustments;
DELETE FROM physical_inventory_count_items;
DELETE FROM physical_inventory_counts;

DELETE FROM purchase_receipt_items;
DELETE FROM purchase_receipts;
DELETE FROM purchase_order_items;
DELETE FROM purchase_orders;

DELETE FROM cash_movements;
DELETE FROM cash_register_sessions;
DELETE FROM petty_cash_replenishments;
DELETE FROM petty_cash_expenses;
DELETE FROM petty_cash_funds;
DELETE FROM cash_registers;

UPDATE return_document_items SET warehouse_id = NULL;

DELETE FROM document_items;
DELETE FROM documents;
DELETE FROM document_series;

DELETE FROM stock_alerts;
DELETE FROM reorder_suggestions;
DELETE FROM stock_critical_config;
DELETE FROM stock_movements;
DELETE FROM stock;

DELETE FROM user_warehouse_access;
DELETE FROM warehouse_zone_locations;
DELETE FROM warehouse_zones;
DELETE FROM warehouses;

ALTER TABLE transfer_reception_items AUTO_INCREMENT = 1;
ALTER TABLE transfer_receptions AUTO_INCREMENT = 1;
ALTER TABLE physical_inventory_adjustments AUTO_INCREMENT = 1;
ALTER TABLE physical_inventory_count_items AUTO_INCREMENT = 1;
ALTER TABLE physical_inventory_counts AUTO_INCREMENT = 1;
ALTER TABLE purchase_receipt_items AUTO_INCREMENT = 1;
ALTER TABLE purchase_receipts AUTO_INCREMENT = 1;
ALTER TABLE purchase_order_items AUTO_INCREMENT = 1;
ALTER TABLE purchase_orders AUTO_INCREMENT = 1;
ALTER TABLE cash_movements AUTO_INCREMENT = 1;
ALTER TABLE cash_register_sessions AUTO_INCREMENT = 1;
ALTER TABLE petty_cash_replenishments AUTO_INCREMENT = 1;
ALTER TABLE petty_cash_expenses AUTO_INCREMENT = 1;
ALTER TABLE petty_cash_funds AUTO_INCREMENT = 1;
ALTER TABLE cash_registers AUTO_INCREMENT = 1;
ALTER TABLE document_items AUTO_INCREMENT = 1;
ALTER TABLE documents AUTO_INCREMENT = 1;
ALTER TABLE document_series AUTO_INCREMENT = 1;
ALTER TABLE stock_alerts AUTO_INCREMENT = 1;
ALTER TABLE reorder_suggestions AUTO_INCREMENT = 1;
ALTER TABLE stock_critical_config AUTO_INCREMENT = 1;
ALTER TABLE stock_movements AUTO_INCREMENT = 1;
ALTER TABLE stock AUTO_INCREMENT = 1;
ALTER TABLE user_warehouse_access AUTO_INCREMENT = 1;
ALTER TABLE warehouse_zone_locations AUTO_INCREMENT = 1;
ALTER TABLE warehouse_zones AUTO_INCREMENT = 1;
ALTER TABLE warehouses AUTO_INCREMENT = 1;

INSERT INTO warehouses (
  warehouse_code, warehouse_name, warehouse_type, responsible_user_id,
  address, city, country, phone, email, is_active
) VALUES
('BOD_25', 'Taller', 'WAREHOUSE', @seed_user_id, 'Patronato', 'Santiago', 'Chile', '2732 5728', 'no@mail.com', TRUE),
('BOD_26', 'PYME', 'STORE', @seed_user_id, 'Patronato', 'Santiago', 'Chile', '2732 9497', 'no@mail.com', TRUE),
('BOD_27', 'Santa Filomena', 'STORE', @seed_user_id, 'Santa Filomena, Patronato', 'Santiago', 'Chile', '2735 1922', 'no@mail.com', TRUE),
('BOD_28', 'Patronato', 'STORE', @seed_user_id, 'Patronato', 'Santiago', 'Chile', '2737 1769', 'no@mail.com', TRUE),
('BOD_29', 'Cecilia', 'STORE', @seed_user_id, 'Cecilia', 'Santiago', 'Chile', '2732 5728', 'no@mail.com', TRUE);

INSERT INTO warehouse_zones (
  warehouse_id, zone_code, zone_name, zone_description, is_location_tracking_enabled, is_active
)
SELECT
  id,
  CONCAT('EST_', REPLACE(warehouse_code, 'BOD_', '')),
  'Estanterias',
  'Zona de almacenamiento en estanterias del local.',
  warehouse_code IN ('BOD_27', 'BOD_28'),
  TRUE
FROM warehouses
WHERE warehouse_type = 'STORE';

INSERT INTO warehouse_zones (
  warehouse_id, zone_code, zone_name, zone_description, is_location_tracking_enabled, is_active
)
SELECT
  id,
  CONCAT('EXH_', REPLACE(warehouse_code, 'BOD_', '')),
  'Exhibicion',
  'Zona de exhibicion y sala de venta del local.',
  warehouse_code IN ('BOD_27', 'BOD_28'),
  TRUE
FROM warehouses
WHERE warehouse_type = 'STORE';

INSERT INTO warehouse_zone_locations (
  warehouse_zone_id, location_code, location_name, location_description, location_type, sort_order, is_active
)
SELECT wz.id, CONCAT('LOC_EST_', REPLACE(w.warehouse_code, 'BOD_', '')), 'Estanterias', 'Estanterias internas para reposicion y almacenamiento.', 'SHELF', 10, TRUE
FROM warehouse_zones wz
JOIN warehouses w ON w.id = wz.warehouse_id
WHERE w.warehouse_code IN ('BOD_27', 'BOD_28')
  AND wz.zone_code LIKE 'EST_%';

INSERT INTO warehouse_zone_locations (
  warehouse_zone_id, location_code, location_name, location_description, location_type, sort_order, is_active
)
SELECT wz.id, CONCAT('LOC_RCK_', REPLACE(w.warehouse_code, 'BOD_', '')), 'Rack', 'Rack interno para mercaderia ordenada por familia o talla.', 'RACK', 20, TRUE
FROM warehouse_zones wz
JOIN warehouses w ON w.id = wz.warehouse_id
WHERE w.warehouse_code IN ('BOD_27', 'BOD_28')
  AND wz.zone_code LIKE 'EST_%';

INSERT INTO warehouse_zone_locations (
  warehouse_zone_id, location_code, location_name, location_description, location_type, sort_order, is_active
)
SELECT wz.id, CONCAT('LOC_VIT_', REPLACE(w.warehouse_code, 'BOD_', '')), 'Vitrina', 'Vitrina de exhibicion visible para sala de venta.', 'DISPLAY', 10, TRUE
FROM warehouse_zones wz
JOIN warehouses w ON w.id = wz.warehouse_id
WHERE w.warehouse_code IN ('BOD_27', 'BOD_28')
  AND wz.zone_code LIKE 'EXH_%';

INSERT INTO warehouse_zone_locations (
  warehouse_zone_id, location_code, location_name, location_description, location_type, sort_order, is_active
)
SELECT wz.id, CONCAT('LOC_EXB_', REPLACE(w.warehouse_code, 'BOD_', '')), 'Exhibidor', 'Exhibidor de prendas y accesorios en sala de venta.', 'DISPLAY', 20, TRUE
FROM warehouse_zones wz
JOIN warehouses w ON w.id = wz.warehouse_id
WHERE w.warehouse_code IN ('BOD_27', 'BOD_28')
  AND wz.zone_code LIKE 'EXH_%';

INSERT IGNORE INTO user_warehouse_access (user_id, warehouse_id, access_type, granted_by_user_id)
SELECT @seed_user_id, id, 'FULL', @seed_user_id
FROM warehouses
WHERE @seed_user_id IS NOT NULL;

SET FOREIGN_KEY_CHECKS = 1;
