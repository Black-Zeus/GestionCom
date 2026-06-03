-- =====================================================
-- Schema recepcion de transferencias
-- Archivo: 20260603_1405_schema_transfer_receptions.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS transfer_receptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transfer_document_id BIGINT UNSIGNED NOT NULL,
    reception_code VARCHAR(50) UNIQUE NOT NULL,
    source_warehouse_id BIGINT UNSIGNED NOT NULL,
    target_warehouse_id BIGINT UNSIGNED NOT NULL,
    shipped_at TIMESTAMP NULL,
    received_at TIMESTAMP NULL,
    received_by_user_id BIGINT UNSIGNED NULL,
    status_id BIGINT UNSIGNED NULL,
    has_differences BOOLEAN DEFAULT FALSE,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (transfer_document_id) REFERENCES documents(id) ON DELETE RESTRICT,
    FOREIGN KEY (source_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (target_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (received_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (status_id) REFERENCES system_statuses(id) ON DELETE SET NULL,
    INDEX idx_transfer_document_id (transfer_document_id),
    INDEX idx_target_warehouse_id (target_warehouse_id),
    INDEX idx_status_id (status_id),
    INDEX idx_has_differences (has_differences)
);

CREATE TABLE IF NOT EXISTS transfer_reception_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transfer_reception_id BIGINT UNSIGNED NOT NULL,
    document_item_id BIGINT UNSIGNED NOT NULL,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    measurement_unit_id BIGINT UNSIGNED NOT NULL,
    shipped_quantity DECIMAL(15,4) NOT NULL,
    received_quantity DECIMAL(15,4) NOT NULL,
    difference_quantity DECIMAL(15,4) GENERATED ALWAYS AS (received_quantity - shipped_quantity) VIRTUAL,
    difference_reason ENUM('NONE', 'SHORTAGE', 'OVERAGE', 'DAMAGED', 'WRONG_PRODUCT', 'OTHER') DEFAULT 'NONE',
    target_warehouse_zone_id BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transfer_reception_id) REFERENCES transfer_receptions(id) ON DELETE CASCADE,
    FOREIGN KEY (document_item_id) REFERENCES document_items(id) ON DELETE RESTRICT,
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
    FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id) ON DELETE RESTRICT,
    FOREIGN KEY (target_warehouse_zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
    INDEX idx_transfer_reception_id (transfer_reception_id),
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_difference_reason (difference_reason)
);

-- =====================================================
-- ARCHIVOS, CARGAS MASIVAS Y MAPEO LEGACY
-- =====================================================

SET FOREIGN_KEY_CHECKS = 1;
