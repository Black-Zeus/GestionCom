-- Agrega producto base a los items de promocion (product_variant_id NULL = todas las variantes)
ALTER TABLE promotion_items
  ADD COLUMN product_id BIGINT UNSIGNED NULL AFTER promotion_id,
  ADD CONSTRAINT fk_promotion_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
