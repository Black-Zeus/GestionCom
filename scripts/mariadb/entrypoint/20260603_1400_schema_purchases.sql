-- =====================================================
-- Schema compras
-- Archivo: 20260603_1400_schema_purchases.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS purchase_orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_order_code VARCHAR(50) UNIQUE NOT NULL,
    supplier_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    document_id BIGINT UNSIGNED NULL COMMENT 'Documento interno asociado si existe',
    order_date DATE NOT NULL,
    expected_delivery_date DATE NULL,
    currency_code CHAR(3) DEFAULT 'CLP',
    exchange_rate DECIMAL(15,6) DEFAULT 1,
    subtotal DECIMAL(15,4) DEFAULT 0,
    tax_amount DECIMAL(15,4) DEFAULT 0,
    discount_amount DECIMAL(15,4) DEFAULT 0,
    total_amount DECIMAL(15,4) DEFAULT 0,
    status_id BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    approved_by_user_id BIGINT UNSIGNED NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
    FOREIGN KEY (status_id) REFERENCES system_statuses(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_order_date (order_date),
    INDEX idx_status_id (status_id),
    INDEX idx_deleted_at (deleted_at)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id BIGINT UNSIGNED NOT NULL,
    line_number SMALLINT UNSIGNED NOT NULL,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    measurement_unit_id BIGINT UNSIGNED NOT NULL,
    ordered_quantity DECIMAL(15,4) NOT NULL,
    received_quantity DECIMAL(15,4) DEFAULT 0,
    pending_quantity DECIMAL(15,4) GENERATED ALWAYS AS (ordered_quantity - received_quantity) VIRTUAL,
    unit_cost DECIMAL(15,4) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 19.00,
    line_total DECIMAL(15,4) NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
    FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_purchase_order_line (purchase_order_id, line_number),
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_pending_quantity (pending_quantity)
);

CREATE TABLE IF NOT EXISTS purchase_receipts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    receipt_code VARCHAR(50) UNIQUE NOT NULL,
    purchase_order_id BIGINT UNSIGNED NULL,
    supplier_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    document_id BIGINT UNSIGNED NULL COMMENT 'Documento de entrada o factura de compra',
    supplier_document_number VARCHAR(100) NULL,
    receipt_date DATE NOT NULL,
    received_by_user_id BIGINT UNSIGNED NOT NULL,
    status_id BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
    FOREIGN KEY (received_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (status_id) REFERENCES system_statuses(id) ON DELETE SET NULL,
    INDEX idx_purchase_order_id (purchase_order_id),
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_receipt_date (receipt_date),
    INDEX idx_status_id (status_id),
    INDEX idx_deleted_at (deleted_at)
);

CREATE TABLE IF NOT EXISTS purchase_receipt_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_receipt_id BIGINT UNSIGNED NOT NULL,
    purchase_order_item_id BIGINT UNSIGNED NULL,
    line_number SMALLINT UNSIGNED NOT NULL,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    measurement_unit_id BIGINT UNSIGNED NOT NULL,
    received_quantity DECIMAL(15,4) NOT NULL,
    accepted_quantity DECIMAL(15,4) NOT NULL,
    rejected_quantity DECIMAL(15,4) DEFAULT 0,
    unit_cost DECIMAL(15,4) NOT NULL,
    batch_lot_number VARCHAR(100) NULL,
    expiry_date DATE NULL,
    serial_number VARCHAR(100) NULL,
    warehouse_zone_id BIGINT UNSIGNED NULL,
    quality_status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'PARTIAL') DEFAULT 'ACCEPTED',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_receipt_id) REFERENCES purchase_receipts(id) ON DELETE CASCADE,
    FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id) ON DELETE SET NULL,
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
    FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id) ON DELETE RESTRICT,
    FOREIGN KEY (warehouse_zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
    UNIQUE KEY uk_purchase_receipt_line (purchase_receipt_id, line_number),
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_quality_status (quality_status)
);

SET FOREIGN_KEY_CHECKS = 1;
