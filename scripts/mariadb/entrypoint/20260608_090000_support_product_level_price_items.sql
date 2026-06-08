-- Permite definir precios por producto base o por SKU / variacion.
-- Si product_variant_id es NULL, la linea aplica al producto completo.

ALTER TABLE price_list_items
  ADD COLUMN IF NOT EXISTS product_id BIGINT UNSIGNED NULL AFTER price_list_id;

UPDATE price_list_items pli
JOIN product_variants pv ON pv.id = pli.product_variant_id
SET pli.product_id = pv.product_id
WHERE pli.product_id IS NULL;

SET @fk_variant := (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'price_list_items'
    AND COLUMN_NAME = 'product_variant_id'
    AND REFERENCED_TABLE_NAME = 'product_variants'
  LIMIT 1
);
SET @fk_product := (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'price_list_items'
    AND COLUMN_NAME = 'product_id'
    AND REFERENCED_TABLE_NAME = 'products'
  LIMIT 1
);

SET @sql := IF(
  @fk_product IS NULL,
  'SELECT 1',
  CONCAT('ALTER TABLE price_list_items DROP FOREIGN KEY ', @fk_product)
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @fk_variant IS NULL,
  'SELECT 1',
  CONCAT('ALTER TABLE price_list_items DROP FOREIGN KEY ', @fk_variant)
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DROP INDEX IF EXISTS uk_price_list_item ON price_list_items;

ALTER TABLE price_list_items
  MODIFY product_variant_id BIGINT UNSIGNED NULL;

ALTER TABLE price_list_items
  ADD CONSTRAINT fk_price_list_items_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_price_list_items_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_price_list_items_product_id ON price_list_items (product_id);
CREATE INDEX IF NOT EXISTS idx_price_list_items_variant_scope ON price_list_items (price_list_id, product_id, product_variant_id, measurement_unit_id);
