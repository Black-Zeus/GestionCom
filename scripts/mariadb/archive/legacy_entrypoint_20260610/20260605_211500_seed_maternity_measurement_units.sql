-- Reemplaza unidades de medida para catalogo de ropa maternal.
-- Destructivo para entorno de perfilamiento: elimina productos/SKU existentes y unidades previas.

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM product_media;
DELETE FROM media_assets WHERE owner_type = 'PRODUCT';
DELETE FROM product_variant_attributes;
DELETE FROM product_barcodes;
DELETE FROM product_measurement_units;
DELETE FROM supplier_products;
DELETE FROM price_list_items;
DELETE FROM promotion_items;
DELETE FROM reorder_suggestions;
DELETE FROM stock_alerts;
DELETE FROM stock_critical_config;
DELETE FROM stock_movements;
DELETE FROM stock;
DELETE FROM transfer_reception_items;
DELETE FROM purchase_order_items;
DELETE FROM purchase_receipt_items;
DELETE FROM document_items;
DELETE FROM product_variants;
DELETE FROM products;

SET @physical_inventory_items_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'physical_inventory_items'
);
SET @physical_inventory_items_sql := IF(@physical_inventory_items_exists > 0, 'DELETE FROM physical_inventory_items', 'DO 0');
PREPARE physical_inventory_items_stmt FROM @physical_inventory_items_sql;
EXECUTE physical_inventory_items_stmt;
DEALLOCATE PREPARE physical_inventory_items_stmt;

SET @physical_inventory_count_items_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'physical_inventory_count_items'
);
SET @physical_inventory_count_items_sql := IF(@physical_inventory_count_items_exists > 0, 'DELETE FROM physical_inventory_count_items', 'DO 0');
PREPARE physical_inventory_count_items_stmt FROM @physical_inventory_count_items_sql;
EXECUTE physical_inventory_count_items_stmt;
DEALLOCATE PREPARE physical_inventory_count_items_stmt;

DELETE FROM measurement_units;

ALTER TABLE product_media AUTO_INCREMENT = 1;
ALTER TABLE product_variant_attributes AUTO_INCREMENT = 1;
ALTER TABLE product_barcodes AUTO_INCREMENT = 1;
ALTER TABLE product_measurement_units AUTO_INCREMENT = 1;
ALTER TABLE supplier_products AUTO_INCREMENT = 1;
ALTER TABLE price_list_items AUTO_INCREMENT = 1;
ALTER TABLE promotion_items AUTO_INCREMENT = 1;
ALTER TABLE reorder_suggestions AUTO_INCREMENT = 1;
ALTER TABLE stock_alerts AUTO_INCREMENT = 1;
ALTER TABLE stock_critical_config AUTO_INCREMENT = 1;
ALTER TABLE stock_movements AUTO_INCREMENT = 1;
ALTER TABLE stock AUTO_INCREMENT = 1;
ALTER TABLE transfer_reception_items AUTO_INCREMENT = 1;
ALTER TABLE purchase_order_items AUTO_INCREMENT = 1;
ALTER TABLE purchase_receipt_items AUTO_INCREMENT = 1;
ALTER TABLE document_items AUTO_INCREMENT = 1;
ALTER TABLE product_variants AUTO_INCREMENT = 1;
ALTER TABLE products AUTO_INCREMENT = 1;
ALTER TABLE measurement_units AUTO_INCREMENT = 1;

SET @physical_inventory_items_ai_sql := IF(@physical_inventory_items_exists > 0, 'ALTER TABLE physical_inventory_items AUTO_INCREMENT = 1', 'DO 0');
PREPARE physical_inventory_items_ai_stmt FROM @physical_inventory_items_ai_sql;
EXECUTE physical_inventory_items_ai_stmt;
DEALLOCATE PREPARE physical_inventory_items_ai_stmt;

SET @physical_inventory_count_items_ai_sql := IF(@physical_inventory_count_items_exists > 0, 'ALTER TABLE physical_inventory_count_items AUTO_INCREMENT = 1', 'DO 0');
PREPARE physical_inventory_count_items_ai_stmt FROM @physical_inventory_count_items_ai_sql;
EXECUTE physical_inventory_count_items_ai_stmt;
DEALLOCATE PREPARE physical_inventory_count_items_ai_stmt;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO measurement_units (
  unit_code, unit_name, unit_symbol, unit_type, conversion_factor,
  base_unit_id, allow_decimals, is_active
) VALUES
('UN', 'Unidad', 'UN', 'BASE', 1.000000, NULL, FALSE, TRUE),
('MTR', 'Metro', 'M', 'BASE', 1.000000, NULL, TRUE, TRUE),
('KG', 'Kilogramo', 'KG', 'BASE', 1.000000, NULL, TRUE, TRUE);

SET @unit_un := (SELECT id FROM measurement_units WHERE unit_code = 'UN');
SET @unit_mtr := (SELECT id FROM measurement_units WHERE unit_code = 'MTR');
SET @unit_kg := (SELECT id FROM measurement_units WHERE unit_code = 'KG');

INSERT INTO measurement_units (
  unit_code, unit_name, unit_symbol, unit_type, conversion_factor,
  base_unit_id, allow_decimals, is_active
) VALUES
('PAR', 'Par', 'PAR', 'DERIVED', 2.000000, @unit_un, FALSE, TRUE),
('SET', 'Set / conjunto', 'SET', 'DERIVED', 1.000000, @unit_un, FALSE, TRUE),
('PACK', 'Pack comercial', 'PACK', 'DERIVED', 1.000000, @unit_un, FALSE, TRUE),
('CAJA', 'Caja', 'CAJA', 'DERIVED', 1.000000, @unit_un, FALSE, TRUE),
('DOC', 'Docena', 'DOC', 'DERIVED', 12.000000, @unit_un, FALSE, TRUE),
('CM', 'Centimetro', 'CM', 'DERIVED', 0.010000, @unit_mtr, TRUE, TRUE),
('ROL', 'Rollo de tela', 'ROL', 'DERIVED', 1.000000, @unit_mtr, TRUE, TRUE),
('GR', 'Gramo', 'G', 'DERIVED', 0.001000, @unit_kg, TRUE, TRUE);
