-- =====================================================
-- Schema proveedores
-- Archivo: 20260603_1359_schema_suppliers.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS suppliers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supplier_code VARCHAR(50) UNIQUE NOT NULL,
    supplier_type ENUM('COMPANY', 'INDIVIDUAL', 'FOREIGN') DEFAULT 'COMPANY',
    tax_id VARCHAR(20) NULL,
    legal_name VARCHAR(255) NOT NULL,
    commercial_name VARCHAR(255) NULL,
    business_activity VARCHAR(255) NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(30) NULL,
    mobile VARCHAR(30) NULL,
    website VARCHAR(255) NULL,
    default_currency_code CHAR(3) DEFAULT 'CLP',
    default_payment_terms_days INT UNSIGNED DEFAULT 30,
    default_tax_rate DECIMAL(5,2) DEFAULT 19.00,
    credit_limit DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    status_id BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    internal_notes TEXT NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (status_id) REFERENCES system_statuses(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_suppliers_tax_id (tax_id),
    INDEX idx_supplier_code (supplier_code),
    INDEX idx_tax_id (tax_id),
    INDEX idx_legal_name (legal_name),
    INDEX idx_status_id (status_id),
    INDEX idx_deleted_at (deleted_at)
);

CREATE TABLE IF NOT EXISTS supplier_contacts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supplier_id BIGINT UNSIGNED NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    position VARCHAR(100) NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(30) NULL,
    mobile VARCHAR(30) NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    is_purchase_contact BOOLEAN DEFAULT TRUE,
    is_payment_contact BOOLEAN DEFAULT FALSE,
    notes TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_is_primary (is_primary),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

CREATE TABLE IF NOT EXISTS supplier_addresses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supplier_id BIGINT UNSIGNED NOT NULL,
    address_type ENUM('BILLING', 'SHIPPING', 'OFFICE', 'OTHER') DEFAULT 'BILLING',
    address_line TEXT NOT NULL,
    city VARCHAR(100) NULL,
    region VARCHAR(100) NULL,
    country VARCHAR(100) DEFAULT 'Chile',
    postal_code VARCHAR(20) NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_address_type (address_type),
    INDEX idx_deleted_at (deleted_at)
);

CREATE TABLE IF NOT EXISTS supplier_products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supplier_id BIGINT UNSIGNED NOT NULL,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    supplier_sku VARCHAR(100) NULL,
    supplier_barcode VARCHAR(255) NULL,
    supplier_product_name VARCHAR(255) NULL,
    measurement_unit_id BIGINT UNSIGNED NULL,
    minimum_order_quantity DECIMAL(15,4) DEFAULT 1,
    package_quantity DECIMAL(15,4) DEFAULT 1,
    last_purchase_cost DECIMAL(15,4) NULL,
    lead_time_days INT UNSIGNED DEFAULT 7,
    is_preferred BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id) ON DELETE SET NULL,
    UNIQUE KEY uk_supplier_product (supplier_id, product_variant_id),
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_supplier_sku (supplier_sku),
    INDEX idx_is_preferred (is_preferred),
    INDEX idx_deleted_at (deleted_at)
);

SET FOREIGN_KEY_CHECKS = 1;
