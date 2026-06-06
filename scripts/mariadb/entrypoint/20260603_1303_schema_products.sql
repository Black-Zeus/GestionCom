-- =====================================================
-- Schema productos
-- Archivo: 20260603_1303_schema_products.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- MÓDULO: PRODUCTOS
-- =====================================================

-- Categorías jerárquicas
CREATE TABLE categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id BIGINT UNSIGNED NULL,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(150) NOT NULL,
    category_description TEXT NULL,
    category_level TINYINT UNSIGNED DEFAULT 1 COMMENT 'Nivel jerárquico',
    category_path VARCHAR(1000) NULL COMMENT 'Ruta completa separada por /',
    sort_order INT UNSIGNED DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Constraints
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,

    -- Índices
    INDEX idx_parent_id (parent_id),
    INDEX idx_category_code (category_code),
    INDEX idx_category_level (category_level),
    INDEX idx_category_path (category_path(255)),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Unidades de medida
CREATE TABLE measurement_units (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    unit_code VARCHAR(20) UNIQUE NOT NULL,
    unit_name VARCHAR(100) NOT NULL,
    unit_symbol VARCHAR(10) NOT NULL,
    unit_type ENUM('BASE', 'DERIVED') DEFAULT 'BASE',
    base_unit_id BIGINT UNSIGNED NULL COMMENT 'Unidad base para conversiones',
    conversion_factor DECIMAL(15,6) DEFAULT 1.000000 COMMENT 'Factor de conversión a unidad base',
    allow_decimals BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Constraints
    FOREIGN KEY (base_unit_id) REFERENCES measurement_units(id) ON DELETE SET NULL,

    -- Índices
    INDEX idx_unit_code (unit_code),
    INDEX idx_unit_type (unit_type),
    INDEX idx_base_unit_id (base_unit_id),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Grupos de atributos
CREATE TABLE attribute_groups (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    group_code VARCHAR(50) UNIQUE NOT NULL,
    group_name VARCHAR(100) NOT NULL,
    group_description TEXT NULL,
    sort_order INT UNSIGNED DEFAULT 0,
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

-- Atributos de productos
CREATE TABLE attributes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    attribute_group_id BIGINT UNSIGNED NOT NULL,
    attribute_code VARCHAR(50) UNIQUE NOT NULL,
    attribute_name VARCHAR(100) NOT NULL,
    attribute_type ENUM('TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTISELECT') DEFAULT 'TEXT',
    is_required BOOLEAN DEFAULT FALSE,
    affects_sku BOOLEAN DEFAULT FALSE COMMENT 'Si afecta la generación de variantes',
    sort_order INT UNSIGNED DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Constraints
    FOREIGN KEY (attribute_group_id) REFERENCES attribute_groups(id) ON DELETE CASCADE,

    -- Índices
    INDEX idx_attribute_code (attribute_code),
    INDEX idx_attribute_group_id (attribute_group_id),
    INDEX idx_affects_sku (affects_sku),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Valores posibles para atributos de tipo SELECT
CREATE TABLE attribute_values (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    attribute_id BIGINT UNSIGNED NOT NULL,
    value_code VARCHAR(50) NOT NULL,
    value_name VARCHAR(100) NOT NULL,
    sort_order INT UNSIGNED DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Constraints
    FOREIGN KEY (attribute_id) REFERENCES attributes(id) ON DELETE CASCADE,
    UNIQUE KEY uk_attribute_value (attribute_id, value_code),

    -- Índices
    INDEX idx_attribute_id (attribute_id),
    INDEX idx_value_code (value_code),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Productos principales (padre)
CREATE TABLE products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED NOT NULL,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_description TEXT NULL,
    brand VARCHAR(100) NULL,
    model VARCHAR(100) NULL,
    base_measurement_unit_id BIGINT UNSIGNED NOT NULL,
    has_variants BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Características activables por producto
    has_batch_control BOOLEAN DEFAULT FALSE,
    has_expiry_date BOOLEAN DEFAULT FALSE,
    has_serial_numbers BOOLEAN DEFAULT FALSE,
    has_location_tracking BOOLEAN DEFAULT FALSE,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Constraints
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (base_measurement_unit_id) REFERENCES measurement_units(id) ON DELETE RESTRICT,

    -- Índices
    INDEX idx_product_code (product_code),
    INDEX idx_category_id (category_id),
    INDEX idx_brand (brand),
    INDEX idx_has_variants (has_variants),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Variantes de productos
CREATE TABLE product_variants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    variant_sku VARCHAR(100) UNIQUE NOT NULL,
    variant_name VARCHAR(255) NOT NULL,
    variant_description TEXT NULL,
    is_default_variant BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Constraints
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,

    -- Índices
    INDEX idx_product_id (product_id),
    INDEX idx_variant_sku (variant_sku),
    INDEX idx_is_default_variant (is_default_variant),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Valores de atributos por variante de producto
CREATE TABLE product_variant_attributes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    attribute_id BIGINT UNSIGNED NOT NULL,
    attribute_value_id BIGINT UNSIGNED NULL COMMENT 'Para atributos SELECT',
    text_value TEXT NULL COMMENT 'Para atributos TEXT/NUMBER',

    -- Constraints
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_id) REFERENCES attributes(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_value_id) REFERENCES attribute_values(id) ON DELETE SET NULL,
    UNIQUE KEY uk_variant_attribute (product_variant_id, attribute_id),

    -- Índices
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_attribute_id (attribute_id)
);

-- Unidades de medida por producto
CREATE TABLE product_measurement_units (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    measurement_unit_id BIGINT UNSIGNED NOT NULL,
    conversion_factor DECIMAL(15,6) NOT NULL DEFAULT 1.000000,
    is_purchase_unit BOOLEAN DEFAULT FALSE,
    is_sale_unit BOOLEAN DEFAULT FALSE,
    is_inventory_unit BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Constraints
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id) ON DELETE CASCADE,
    UNIQUE KEY uk_product_unit (product_id, measurement_unit_id),

    -- Índices
    INDEX idx_product_id (product_id),
    INDEX idx_measurement_unit_id (measurement_unit_id),
    INDEX idx_is_purchase_unit (is_purchase_unit),
    INDEX idx_is_sale_unit (is_sale_unit)
);

-- Códigos de barras múltiples
CREATE TABLE product_barcodes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    barcode_type ENUM('EAN13', 'EAN8', 'UPC', 'CODE128', 'QR') NOT NULL,
    barcode_value VARCHAR(255) UNIQUE NOT NULL,
    measurement_unit_id BIGINT UNSIGNED NULL COMMENT 'Unidad que representa este código',
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Constraints
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id) ON DELETE SET NULL,

    -- Índices
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_barcode_value (barcode_value),
    INDEX idx_barcode_type (barcode_type),
    INDEX idx_is_primary (is_primary),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

SET FOREIGN_KEY_CHECKS = 1;
