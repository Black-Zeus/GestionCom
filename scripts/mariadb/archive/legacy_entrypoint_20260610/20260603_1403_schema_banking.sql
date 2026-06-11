-- =====================================================
-- Schema bancos cheques y conciliacion
-- Archivo: 20260603_1403_schema_banking.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS banks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bank_code VARCHAR(30) UNIQUE NOT NULL,
    bank_name VARCHAR(150) NOT NULL,
    country VARCHAR(100) DEFAULT 'Chile',
    swift_code VARCHAR(20) NULL,
    routing_code VARCHAR(30) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_bank_code (bank_code),
    INDEX idx_bank_name (bank_name),
    INDEX idx_deleted_at (deleted_at)
);

CREATE TABLE IF NOT EXISTS bank_accounts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bank_id BIGINT UNSIGNED NOT NULL,
    account_code VARCHAR(50) UNIQUE NOT NULL,
    account_number VARCHAR(80) NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    account_type ENUM('CHECKING', 'SAVINGS', 'CREDIT_LINE', 'CASH', 'OTHER') DEFAULT 'CHECKING',
    currency_code CHAR(3) DEFAULT 'CLP',
    opening_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE RESTRICT,
    INDEX idx_bank_id (bank_id),
    INDEX idx_account_number (account_number),
    INDEX idx_deleted_at (deleted_at)
);

CREATE TABLE IF NOT EXISTS check_register (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    check_code VARCHAR(50) UNIQUE NOT NULL,
    check_direction ENUM('RECEIVED', 'ISSUED') NOT NULL,
    check_number VARCHAR(50) NOT NULL,
    bank_id BIGINT UNSIGNED NULL,
    bank_account_id BIGINT UNSIGNED NULL,
    customer_payment_id BIGINT UNSIGNED NULL,
    supplier_payment_id BIGINT UNSIGNED NULL,
    document_payment_detail_id BIGINT UNSIGNED NULL,
    holder_name VARCHAR(255) NULL,
    holder_tax_id VARCHAR(20) NULL,
    issue_date DATE NULL,
    due_date DATE NOT NULL,
    deposit_date DATE NULL,
    cleared_date DATE NULL,
    amount DECIMAL(15,2) NOT NULL,
    status_id BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE SET NULL,
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_payment_id) REFERENCES customer_payments(id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_payment_id) REFERENCES supplier_payments(id) ON DELETE SET NULL,
    FOREIGN KEY (document_payment_detail_id) REFERENCES document_payment_details(id) ON DELETE SET NULL,
    FOREIGN KEY (status_id) REFERENCES system_statuses(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_check_number (check_number),
    INDEX idx_check_direction (check_direction),
    INDEX idx_due_date (due_date),
    INDEX idx_status_id (status_id)
);

CREATE TABLE IF NOT EXISTS bank_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bank_account_id BIGINT UNSIGNED NOT NULL,
    transaction_code VARCHAR(80) UNIQUE NOT NULL,
    transaction_date DATE NOT NULL,
    value_date DATE NULL,
    transaction_type ENUM('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'FEE', 'INTEREST', 'ADJUSTMENT') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NULL,
    reference_number VARCHAR(100) NULL,
    source_table VARCHAR(100) NULL,
    source_id BIGINT UNSIGNED NULL,
    is_reconciled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    INDEX idx_bank_account_id (bank_account_id),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_reference_number (reference_number),
    INDEX idx_is_reconciled (is_reconciled)
);

CREATE TABLE IF NOT EXISTS bank_reconciliations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reconciliation_code VARCHAR(50) UNIQUE NOT NULL,
    bank_account_id BIGINT UNSIGNED NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    statement_balance DECIMAL(15,2) NOT NULL,
    system_balance DECIMAL(15,2) NOT NULL,
    difference_amount DECIMAL(15,2) GENERATED ALWAYS AS (statement_balance - system_balance) VIRTUAL,
    status_id BIGINT UNSIGNED NULL,
    reconciled_by_user_id BIGINT UNSIGNED NULL,
    reconciled_at TIMESTAMP NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY (status_id) REFERENCES system_statuses(id) ON DELETE SET NULL,
    FOREIGN KEY (reconciled_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_bank_account_id (bank_account_id),
    INDEX idx_period (period_start, period_end),
    INDEX idx_status_id (status_id)
);

CREATE TABLE IF NOT EXISTS bank_reconciliation_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bank_reconciliation_id BIGINT UNSIGNED NOT NULL,
    bank_transaction_id BIGINT UNSIGNED NOT NULL,
    matched_source_table VARCHAR(100) NULL,
    matched_source_id BIGINT UNSIGNED NULL,
    matched_amount DECIMAL(15,2) NOT NULL,
    match_type ENUM('EXACT', 'PARTIAL', 'MANUAL', 'ADJUSTMENT') DEFAULT 'MANUAL',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bank_reconciliation_id) REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
    FOREIGN KEY (bank_transaction_id) REFERENCES bank_transactions(id) ON DELETE CASCADE,
    UNIQUE KEY uk_reconciliation_transaction (bank_reconciliation_id, bank_transaction_id),
    INDEX idx_bank_transaction_id (bank_transaction_id)
);

-- =====================================================
-- INVENTARIO FISICO Y TRANSFERENCIAS CON DIFERENCIAS
-- =====================================================

SET FOREIGN_KEY_CHECKS = 1;
