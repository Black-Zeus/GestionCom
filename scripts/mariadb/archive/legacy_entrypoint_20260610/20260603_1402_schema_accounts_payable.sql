-- =====================================================
-- Schema cuentas por pagar
-- Archivo: 20260603_1402_schema_accounts_payable.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS accounts_payable (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT UNSIGNED NOT NULL,
    supplier_id BIGINT UNSIGNED NOT NULL,
    purchase_order_id BIGINT UNSIGNED NULL,
    original_amount DECIMAL(15,2) NOT NULL,
    current_balance DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    first_overdue_date DATE NULL,
    status_id BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE RESTRICT,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL,
    FOREIGN KEY (status_id) REFERENCES system_statuses(id) ON DELETE SET NULL,
    UNIQUE KEY uk_document_payable (document_id),
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_due_date (due_date),
    INDEX idx_status_id (status_id),
    INDEX idx_current_balance (current_balance)
);

CREATE TABLE IF NOT EXISTS supplier_payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_code VARCHAR(50) UNIQUE NOT NULL,
    supplier_id BIGINT UNSIGNED NOT NULL,
    payment_method_id BIGINT UNSIGNED NOT NULL,
    payment_amount DECIMAL(15,2) NOT NULL,
    allocated_amount DECIMAL(15,2) DEFAULT 0,
    unallocated_amount DECIMAL(15,2) GENERATED ALWAYS AS (payment_amount - allocated_amount) VIRTUAL,
    payment_date DATE NOT NULL,
    reference_number VARCHAR(100) NULL,
    bank_name VARCHAR(100) NULL,
    account_number VARCHAR(50) NULL,
    check_date DATE NULL,
    check_status ENUM('PENDING', 'DEPOSITED', 'CLEARED', 'BOUNCED') NULL,
    status_id BIGINT UNSIGNED NULL,
    is_prepayment BOOLEAN DEFAULT FALSE,
    notes TEXT NULL,
    processed_by_user_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
    FOREIGN KEY (status_id) REFERENCES system_statuses(id) ON DELETE SET NULL,
    FOREIGN KEY (processed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_payment_method_id (payment_method_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_status_id (status_id),
    INDEX idx_check_date (check_date)
);

CREATE TABLE IF NOT EXISTS supplier_payment_allocations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supplier_payment_id BIGINT UNSIGNED NOT NULL,
    accounts_payable_id BIGINT UNSIGNED NOT NULL,
    allocated_amount DECIMAL(15,2) NOT NULL,
    allocation_date DATE NOT NULL,
    allocation_type ENUM('AUTOMATIC', 'MANUAL') DEFAULT 'MANUAL',
    applied_by_user_id BIGINT UNSIGNED NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_payment_id) REFERENCES supplier_payments(id) ON DELETE CASCADE,
    FOREIGN KEY (accounts_payable_id) REFERENCES accounts_payable(id) ON DELETE CASCADE,
    FOREIGN KEY (applied_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_supplier_payment_id (supplier_payment_id),
    INDEX idx_accounts_payable_id (accounts_payable_id),
    INDEX idx_allocation_date (allocation_date)
);

SET FOREIGN_KEY_CHECKS = 1;
