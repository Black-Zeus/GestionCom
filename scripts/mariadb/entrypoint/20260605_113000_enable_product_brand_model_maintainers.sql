-- Habilita mantenedores de marcas y modelos de productos.

CREATE TABLE IF NOT EXISTS product_brands (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    brand_code VARCHAR(50) UNIQUE NOT NULL,
    brand_name VARCHAR(150) NOT NULL,
    brand_description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_brand_code (brand_code),
    INDEX idx_brand_name (brand_name),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

CREATE TABLE IF NOT EXISTS product_models (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    brand_id BIGINT UNSIGNED NULL,
    model_code VARCHAR(50) UNIQUE NOT NULL,
    model_name VARCHAR(150) NOT NULL,
    model_description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (brand_id) REFERENCES product_brands(id) ON DELETE SET NULL,
    INDEX idx_brand_id (brand_id),
    INDEX idx_model_code (model_code),
    INDEX idx_model_name (model_name),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS brand_id BIGINT UNSIGNED NULL AFTER product_description,
ADD COLUMN IF NOT EXISTS product_model_id BIGINT UNSIGNED NULL AFTER brand;

SET @products_brand_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND CONSTRAINT_NAME = 'fk_products_brand_id'
);

SET @sql := IF(@products_brand_fk_exists = 0,
  'ALTER TABLE products ADD CONSTRAINT fk_products_brand_id FOREIGN KEY (brand_id) REFERENCES product_brands(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @products_model_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND CONSTRAINT_NAME = 'fk_products_product_model_id'
);

SET @sql := IF(@products_model_fk_exists = 0,
  'ALTER TABLE products ADD CONSTRAINT fk_products_product_model_id FOREIGN KEY (product_model_id) REFERENCES product_models(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products (brand_id);
CREATE INDEX IF NOT EXISTS idx_products_product_model_id ON products (product_model_id);
