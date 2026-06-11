-- =====================================================
-- Schema listas de precios y promociones
-- Archivo: 20260603_1305_schema_pricing.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- MÓDULO: LISTAS DE PRECIOS
-- =====================================================

-- Grupos de listas de precios
CREATE TABLE price_list_groups (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    group_code VARCHAR(50) UNIQUE NOT NULL,
    group_name VARCHAR(100) NOT NULL,
    group_description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Índices
    INDEX idx_group_code (group_code),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Listas de precios maestras
CREATE TABLE price_lists (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    price_list_group_id BIGINT UNSIGNED NULL,
    price_list_code VARCHAR(50) UNIQUE NOT NULL,
    price_list_name VARCHAR(150) NOT NULL,
    base_price_list_id BIGINT UNSIGNED NULL COMMENT 'Lista base para derivar precios',
    base_adjustment_type ENUM('PERCENTAGE', 'FIXED') NULL COMMENT 'Tipo de ajuste sobre lista base',
    base_adjustment_value DECIMAL(10,4) NULL COMMENT 'Valor del ajuste (% o monto fijo)',
    currency_code CHAR(3) DEFAULT 'USD',
    valid_from DATE NOT NULL,
    valid_to DATE NULL,
    priority TINYINT UNSIGNED DEFAULT 1 COMMENT 'Prioridad si múltiples listas activas',
    applies_to ENUM('ALL_PRODUCTS', 'CATEGORY', 'SPECIFIC') DEFAULT 'ALL_PRODUCTS',
    is_active BOOLEAN DEFAULT TRUE,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Constraints
    FOREIGN KEY (price_list_group_id) REFERENCES price_list_groups(id) ON DELETE SET NULL,
    FOREIGN KEY (base_price_list_id) REFERENCES price_lists(id) ON DELETE SET NULL,

    -- Índices
    INDEX idx_price_list_code (price_list_code),
    INDEX idx_price_list_group_id (price_list_group_id),
    INDEX idx_base_price_list_id (base_price_list_id),
    INDEX idx_valid_from (valid_from),
    INDEX idx_valid_to (valid_to),
    INDEX idx_priority (priority),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Precios específicos por producto/variante
CREATE TABLE price_list_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    price_list_id BIGINT UNSIGNED NOT NULL,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    measurement_unit_id BIGINT UNSIGNED NOT NULL,
    base_price DECIMAL(15,4) NOT NULL,
    sale_price DECIMAL(15,4) NOT NULL COMMENT 'Precio final calculado',
    cost_price DECIMAL(15,4) NULL,
    margin_percentage DECIMAL(5,2) NULL,
    is_active BOOLEAN DEFAULT TRUE,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Constraints
    FOREIGN KEY (price_list_id) REFERENCES price_lists(id) ON DELETE CASCADE,
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id) ON DELETE CASCADE,
    UNIQUE KEY uk_price_list_item (price_list_id, product_variant_id, measurement_unit_id),

    -- Índices
    INDEX idx_price_list_id (price_list_id),
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_measurement_unit_id (measurement_unit_id),
    INDEX idx_sale_price (sale_price),
    INDEX idx_is_active (is_active)
);

-- Promociones especiales
CREATE TABLE promotions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    promotion_code VARCHAR(50) UNIQUE NOT NULL,
    promotion_name VARCHAR(150) NOT NULL,
    promotion_type ENUM('QUANTITY_DISCOUNT', 'BUY_X_GET_Y', 'PERCENTAGE_OFF', 'FIXED_AMOUNT') NOT NULL,
    target_type ENUM('PRODUCT', 'CATEGORY', 'ALL') DEFAULT 'PRODUCT',
    min_quantity DECIMAL(15,4) NULL COMMENT 'Cantidad mínima para activar promoción',
    discount_percentage DECIMAL(5,2) NULL,
    discount_amount DECIMAL(15,4) NULL,
    buy_quantity DECIMAL(15,4) NULL COMMENT 'Para promociones 3x2',
    get_quantity DECIMAL(15,4) NULL COMMENT 'Para promociones 3x2',
    valid_from DATETIME NOT NULL,
    valid_to DATETIME NOT NULL,
    is_combinable BOOLEAN DEFAULT FALSE COMMENT 'Si se puede combinar con otras promociones',
    is_active BOOLEAN DEFAULT TRUE,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Índices
    INDEX idx_promotion_code (promotion_code),
    INDEX idx_promotion_type (promotion_type),
    INDEX idx_valid_from (valid_from),
    INDEX idx_valid_to (valid_to),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Productos/categorías incluidos en promociones
CREATE TABLE promotion_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    promotion_id BIGINT UNSIGNED NOT NULL,
    product_variant_id BIGINT UNSIGNED NULL,
    category_id BIGINT UNSIGNED NULL,

    -- Constraints
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,

    -- Índices
    INDEX idx_promotion_id (promotion_id),
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_category_id (category_id),

    -- Constraint: debe tener producto O categoría, no ambos
    CHECK ((product_variant_id IS NOT NULL AND category_id IS NULL) OR
           (product_variant_id IS NULL AND category_id IS NOT NULL))
);

SET FOREIGN_KEY_CHECKS = 1;
