-- =====================================================
-- Schema inventario fisico
-- Archivo: 20260603_1404_schema_physical_inventory.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS physical_inventory_counts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    count_code VARCHAR(50) UNIQUE NOT NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    warehouse_zone_id BIGINT UNSIGNED NULL,
    count_type ENUM('FULL', 'PARTIAL', 'RANDOM', 'CYCLE') DEFAULT 'PARTIAL',
    scope_description TEXT NULL,
    scheduled_date DATE NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    status_id BIGINT UNSIGNED NULL,
    freeze_stock BOOLEAN DEFAULT FALSE,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    approved_by_user_id BIGINT UNSIGNED NULL,
    approved_at TIMESTAMP NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (warehouse_zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
    FOREIGN KEY (status_id) REFERENCES system_statuses(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_warehouse_zone_id (warehouse_zone_id),
    INDEX idx_count_type (count_type),
    INDEX idx_status_id (status_id),
    INDEX idx_deleted_at (deleted_at)
);

CREATE TABLE IF NOT EXISTS physical_inventory_count_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    physical_inventory_count_id BIGINT UNSIGNED NOT NULL,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    warehouse_zone_id BIGINT UNSIGNED NULL,
    measurement_unit_id BIGINT UNSIGNED NOT NULL,
    system_quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    counted_quantity DECIMAL(15,4) NULL,
    difference_quantity DECIMAL(15,4) GENERATED ALWAYS AS (COALESCE(counted_quantity, 0) - system_quantity) VIRTUAL,
    unit_cost DECIMAL(15,4) NULL,
    difference_cost DECIMAL(15,4) GENERATED ALWAYS AS ((COALESCE(counted_quantity, 0) - system_quantity) * COALESCE(unit_cost, 0)) VIRTUAL,
    batch_lot_number VARCHAR(100) NULL,
    expiry_date DATE NULL,
    serial_number VARCHAR(100) NULL,
    counted_by_user_id BIGINT UNSIGNED NULL,
    counted_at TIMESTAMP NULL,
    review_status ENUM('PENDING', 'OK', 'DIFFERENCE', 'RECOUNT_REQUIRED', 'APPROVED') DEFAULT 'PENDING',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (physical_inventory_count_id) REFERENCES physical_inventory_counts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
    FOREIGN KEY (warehouse_zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
    FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id) ON DELETE RESTRICT,
    FOREIGN KEY (counted_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_count_product_zone_batch (physical_inventory_count_id, product_variant_id, warehouse_zone_id, batch_lot_number, serial_number),
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_review_status (review_status)
);

CREATE TABLE IF NOT EXISTS physical_inventory_adjustments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    physical_inventory_count_id BIGINT UNSIGNED NOT NULL,
    document_id BIGINT UNSIGNED NULL,
    stock_movement_id BIGINT UNSIGNED NULL,
    adjustment_date DATE NOT NULL,
    total_positive_quantity DECIMAL(15,4) DEFAULT 0,
    total_negative_quantity DECIMAL(15,4) DEFAULT 0,
    total_difference_cost DECIMAL(15,4) DEFAULT 0,
    posted_by_user_id BIGINT UNSIGNED NOT NULL,
    posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT NULL,
    FOREIGN KEY (physical_inventory_count_id) REFERENCES physical_inventory_counts(id) ON DELETE RESTRICT,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
    FOREIGN KEY (stock_movement_id) REFERENCES stock_movements(id) ON DELETE SET NULL,
    FOREIGN KEY (posted_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_physical_inventory_count_id (physical_inventory_count_id),
    INDEX idx_adjustment_date (adjustment_date)
);

SET FOREIGN_KEY_CHECKS = 1;
