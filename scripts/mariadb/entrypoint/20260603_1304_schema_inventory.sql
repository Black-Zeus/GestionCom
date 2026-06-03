-- =====================================================
-- Schema bodegas e inventario
-- Archivo: 20260603_1304_schema_inventory.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- MÓDULO: BODEGAS E INVENTARIO
-- =====================================================

-- Bodegas principales
CREATE TABLE warehouses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    warehouse_code VARCHAR(20) UNIQUE NOT NULL,
    warehouse_name VARCHAR(150) NOT NULL,
    warehouse_type ENUM('WAREHOUSE', 'STORE', 'OUTLET') DEFAULT 'WAREHOUSE',
    responsible_user_id BIGINT UNSIGNED NOT NULL COMMENT 'Usuario responsable único',
    address TEXT NULL,
    city VARCHAR(100) NULL,
    country VARCHAR(100) NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(255) NULL,
    is_active BOOLEAN DEFAULT TRUE,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Constraints
    FOREIGN KEY (responsible_user_id) REFERENCES users(id) ON DELETE RESTRICT,

    -- Índices
    INDEX idx_warehouse_code (warehouse_code),
    INDEX idx_warehouse_type (warehouse_type),
    INDEX idx_responsible_user_id (responsible_user_id),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Zonas dentro de bodegas (opcional)
CREATE TABLE warehouse_zones (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    zone_code VARCHAR(20) NOT NULL,
    zone_name VARCHAR(100) NOT NULL,
    zone_description TEXT NULL,
    is_location_tracking_enabled BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Constraints
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    UNIQUE KEY uk_warehouse_zone (warehouse_id, zone_code),

    -- Índices
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_zone_code (zone_code),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Acceso de usuarios a bodegas
CREATE TABLE user_warehouse_access (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    access_type ENUM('FULL', 'READ_ONLY', 'DENIED') DEFAULT 'READ_ONLY',
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by_user_id BIGINT UNSIGNED NOT NULL,

    -- Constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_user_warehouse (user_id, warehouse_id),

    -- Índices
    INDEX idx_user_id (user_id),
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_access_type (access_type)
);

-- Stock actual consolidado
CREATE TABLE stock (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    warehouse_zone_id BIGINT UNSIGNED NULL,
    current_quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(15,4) NOT NULL DEFAULT 0 COMMENT 'Stock reservado para órdenes',
    available_quantity DECIMAL(15,4) GENERATED ALWAYS AS (current_quantity - reserved_quantity) VIRTUAL,
    minimum_stock DECIMAL(15,4) DEFAULT 0,
    maximum_stock DECIMAL(15,4) DEFAULT 0,
    last_movement_date TIMESTAMP NULL,

    -- Auditoría
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Constraints
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
    UNIQUE KEY uk_stock_location (product_variant_id, warehouse_id, warehouse_zone_id),

    -- Índices
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_warehouse_zone_id (warehouse_zone_id),
    INDEX idx_current_quantity (current_quantity),
    INDEX idx_available_quantity (available_quantity),
    INDEX idx_last_movement_date (last_movement_date)
);

-- Movimientos de stock (historial completo)
CREATE TABLE stock_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    warehouse_zone_id BIGINT UNSIGNED NULL,
    movement_type ENUM('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT') NOT NULL,
    reference_type ENUM('PURCHASE', 'SALE', 'TRANSFER', 'ADJUSTMENT', 'RETURN', 'DAMAGE') NOT NULL,
    reference_document_id BIGINT UNSIGNED NULL COMMENT 'ID del documento que generó el movimiento',
    quantity DECIMAL(15,4) NOT NULL COMMENT 'Cantidad del movimiento (+ o -)',
    quantity_before DECIMAL(15,4) NOT NULL,
    quantity_after DECIMAL(15,4) NOT NULL,
    unit_cost DECIMAL(15,4) NULL,
    total_cost DECIMAL(15,4) NULL,
    batch_lot_number VARCHAR(100) NULL,
    expiry_date DATE NULL,
    serial_number VARCHAR(100) NULL,
    notes TEXT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (warehouse_zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,

    -- Índices
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_movement_type (movement_type),
    INDEX idx_reference_type (reference_type),
    INDEX idx_reference_document_id (reference_document_id),
    INDEX idx_batch_lot_number (batch_lot_number),
    INDEX idx_serial_number (serial_number),
    INDEX idx_created_at (created_at),
    INDEX idx_created_by_user_id (created_by_user_id)
);

SET FOREIGN_KEY_CHECKS = 1;
