-- Agrega categoria opcional a promociones con objetivo CATEGORY
ALTER TABLE promotions
  ADD COLUMN category_id BIGINT UNSIGNED NULL AFTER target_type,
  ADD CONSTRAINT fk_promotions_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
