-- =====================================================
-- Schema numeracion moneda y libros tributarios
-- Archivo: 20260603_1409_schema_document_numbering_currency_tax.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS document_number_change_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT UNSIGNED NOT NULL,
    old_document_number VARCHAR(50) NOT NULL,
    new_document_number VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    requested_by_user_id BIGINT UNSIGNED NOT NULL,
    approved_by_user_id BIGINT UNSIGNED NULL,
    approved_at TIMESTAMP NULL,
    applied_at TIMESTAMP NULL,
    status_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE RESTRICT,
    FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (status_id) REFERENCES system_statuses(id) ON DELETE SET NULL,
    INDEX idx_document_id (document_id),
    INDEX idx_status_id (status_id)
);

CREATE TABLE IF NOT EXISTS currency_exchange_rates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    currency_code CHAR(3) NOT NULL,
    rate_date DATE NOT NULL,
    rate_to_clp DECIMAL(15,6) NOT NULL,
    source_name VARCHAR(100) NULL,
    source_reference VARCHAR(255) NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_currency_rate_date (currency_code, rate_date),
    INDEX idx_rate_date (rate_date)
);

CREATE TABLE IF NOT EXISTS tax_periods (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tax_year SMALLINT UNSIGNED NOT NULL,
    tax_month TINYINT UNSIGNED NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status_id BIGINT UNSIGNED NULL,
    closed_by_user_id BIGINT UNSIGNED NULL,
    closed_at TIMESTAMP NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (status_id) REFERENCES system_statuses(id) ON DELETE SET NULL,
    FOREIGN KEY (closed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_tax_period (tax_year, tax_month),
    INDEX idx_period_dates (period_start, period_end),
    INDEX idx_status_id (status_id)
);

CREATE TABLE IF NOT EXISTS tax_book_entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tax_period_id BIGINT UNSIGNED NOT NULL,
    book_type ENUM('SALES', 'PURCHASES') NOT NULL,
    document_id BIGINT UNSIGNED NOT NULL,
    document_type_code VARCHAR(50) NOT NULL,
    document_number VARCHAR(50) NOT NULL,
    document_date DATE NOT NULL,
    counterparty_tax_id VARCHAR(20) NULL,
    counterparty_name VARCHAR(255) NULL,
    net_amount DECIMAL(15,2) DEFAULT 0,
    exempt_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    dte_type_code VARCHAR(10) NULL,
    dte_folio BIGINT UNSIGNED NULL,
    status_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tax_period_id) REFERENCES tax_periods(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE RESTRICT,
    FOREIGN KEY (status_id) REFERENCES system_statuses(id) ON DELETE SET NULL,
    UNIQUE KEY uk_tax_book_document (book_type, document_id),
    INDEX idx_tax_period_id (tax_period_id),
    INDEX idx_book_type (book_type),
    INDEX idx_document_date (document_date),
    INDEX idx_counterparty_tax_id (counterparty_tax_id)
);

-- =====================================================
-- VISTAS OPERATIVAS
-- =====================================================

SET FOREIGN_KEY_CHECKS = 1;
