-- =====================================================
-- Schema documentos comerciales
-- Archivo: 20260603_1306_schema_documents.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- MÓDULO: DOCUMENTOS
-- =====================================================

-- Tipos de documentos
CREATE TABLE document_types (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_type_code VARCHAR(50) UNIQUE NOT NULL,
    document_type_name VARCHAR(100) NOT NULL,
    document_category ENUM('PURCHASE', 'SALE', 'INVENTORY', 'TRANSFER') NOT NULL,
    requires_approval BOOLEAN DEFAULT FALSE,
    generates_movement BOOLEAN DEFAULT TRUE,
    movement_type ENUM('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT') NULL,
    is_active BOOLEAN DEFAULT TRUE,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Índices
    INDEX idx_document_type_code (document_type_code),
    INDEX idx_document_category (document_category),
    INDEX idx_movement_type (movement_type),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Series de numeración para documentos
CREATE TABLE document_series (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_type_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NULL COMMENT 'Serie específica por bodega',
    series_code VARCHAR(20) NOT NULL,
    series_prefix VARCHAR(10) NULL,
    current_number BIGINT UNSIGNED DEFAULT 0,
    min_number BIGINT UNSIGNED DEFAULT 1,
    max_number BIGINT UNSIGNED DEFAULT 999999999,
    number_length TINYINT UNSIGNED DEFAULT 8,
    is_active BOOLEAN DEFAULT TRUE,

    -- Constraints
    FOREIGN KEY (document_type_id) REFERENCES document_types(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    UNIQUE KEY uk_series_warehouse (document_type_id, warehouse_id, series_code),

    -- Índices
    INDEX idx_document_type_id (document_type_id),
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_series_code (series_code),
    INDEX idx_is_active (is_active)
);

-- Documentos principales (cabecera)
CREATE TABLE documents (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_type_id BIGINT UNSIGNED NOT NULL,
    document_series_id BIGINT UNSIGNED NOT NULL,
    document_number VARCHAR(50) NOT NULL,
    document_date DATE NOT NULL,
    source_warehouse_id BIGINT UNSIGNED NULL,
    target_warehouse_id BIGINT UNSIGNED NULL,
    customer_supplier_name VARCHAR(255) NULL,
    customer_supplier_document VARCHAR(50) NULL,
    reference_external VARCHAR(100) NULL COMMENT 'Número de factura externa, orden, etc.',
    subtotal DECIMAL(15,4) DEFAULT 0,
    tax_amount DECIMAL(15,4) DEFAULT 0,
    discount_amount DECIMAL(15,4) DEFAULT 0,
    total_amount DECIMAL(15,4) DEFAULT 0,
    document_status ENUM('DRAFT', 'PENDING', 'APPROVED', 'PROCESSED', 'CANCELLED') DEFAULT 'DRAFT',
    notes TEXT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    approved_by_user_id BIGINT UNSIGNED NULL,
    approved_at TIMESTAMP NULL,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Constraints
    FOREIGN KEY (document_type_id) REFERENCES document_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (document_series_id) REFERENCES document_series(id) ON DELETE RESTRICT,
    FOREIGN KEY (source_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (target_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_document_number (document_type_id, document_series_id, document_number),

    -- Índices
    INDEX idx_document_type_id (document_type_id),
    INDEX idx_document_number (document_number),
    INDEX idx_document_date (document_date),
    INDEX idx_source_warehouse_id (source_warehouse_id),
    INDEX idx_target_warehouse_id (target_warehouse_id),
    INDEX idx_document_status (document_status),
    INDEX idx_created_by_user_id (created_by_user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_deleted_at (deleted_at)
);

-- Detalle de documentos (líneas de productos)
CREATE TABLE document_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT UNSIGNED NOT NULL,
    line_number SMALLINT UNSIGNED NOT NULL,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    measurement_unit_id BIGINT UNSIGNED NOT NULL,
    quantity DECIMAL(15,4) NOT NULL,
    unit_price DECIMAL(15,4) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,4) DEFAULT 0,
    line_total DECIMAL(15,4) NOT NULL,
    batch_lot_number VARCHAR(100) NULL,
    expiry_date DATE NULL,
    serial_number VARCHAR(100) NULL,
    warehouse_zone_id BIGINT UNSIGNED NULL,
    notes TEXT NULL,

    -- Constraints
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
    FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id) ON DELETE RESTRICT,
    FOREIGN KEY (warehouse_zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
    UNIQUE KEY uk_document_line (document_id, line_number),

    -- Índices
    INDEX idx_document_id (document_id),
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_batch_lot_number (batch_lot_number),
    INDEX idx_serial_number (serial_number)
);

SET FOREIGN_KEY_CHECKS = 1;
