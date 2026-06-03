-- =====================================================
-- Schema cuentas por cobrar
-- Archivo: 20260603_1324_schema_accounts_receivable.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE accounts_receivable (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT UNSIGNED NOT NULL COMMENT 'Factura o documento origen',
    customer_id BIGINT UNSIGNED NOT NULL,

    -- Montos
    original_amount DECIMAL(15,2) NOT NULL COMMENT 'Monto original de la factura',
    current_balance DECIMAL(15,2) NOT NULL COMMENT 'Saldo pendiente actual',
    paid_amount DECIMAL(15,2) DEFAULT 0 COMMENT 'Monto pagado a la fecha',
    penalty_amount DECIMAL(15,2) DEFAULT 0 COMMENT 'Multas acumuladas',

    -- Fechas
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    first_overdue_date DATE NULL COMMENT 'Primera fecha de mora',

    -- Estado
    status ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WRITTEN_OFF') DEFAULT 'PENDING',
    days_overdue INT DEFAULT 0 COMMENT 'Días de mora',

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Constraints
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_document_receivable (document_id),

    -- Índices
    INDEX idx_customer_id (customer_id),
    INDEX idx_document_id (document_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date),
    INDEX idx_days_overdue (days_overdue),
    INDEX idx_invoice_date (invoice_date),
    INDEX idx_current_balance (current_balance)
);

-- Pagos recibidos de clientes
CREATE TABLE customer_payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_code VARCHAR(50) UNIQUE NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    payment_method_id BIGINT UNSIGNED NOT NULL,

    -- Montos
    payment_amount DECIMAL(15,2) NOT NULL,
    allocated_amount DECIMAL(15,2) DEFAULT 0 COMMENT 'Monto ya aplicado a facturas',
    unallocated_amount DECIMAL(15,2) GENERATED ALWAYS AS (payment_amount - allocated_amount) VIRTUAL,

    -- Detalles del pago
    payment_date DATE NOT NULL,
    reference_number VARCHAR(100) NULL COMMENT 'Número de cheque, transferencia, etc.',
    bank_name VARCHAR(100) NULL,
    account_number VARCHAR(50) NULL,

    -- Para cheques a fecha
    check_date DATE NULL COMMENT 'Fecha del cheque si es posfechado',
    check_status ENUM('PENDING', 'DEPOSITED', 'CLEARED', 'BOUNCED') NULL,

    -- Estado del pago
    payment_status ENUM('PENDING', 'CONFIRMED', 'CLEARED', 'CANCELLED') DEFAULT 'PENDING',
    is_prepayment BOOLEAN DEFAULT FALSE COMMENT 'Si es un prepago',

    -- Observaciones
    notes TEXT NULL,
    processed_by_user_id BIGINT UNSIGNED NOT NULL,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Constraints
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
    FOREIGN KEY (processed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,

    -- Índices
    INDEX idx_payment_code (payment_code),
    INDEX idx_customer_id (customer_id),
    INDEX idx_payment_method_id (payment_method_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_payment_status (payment_status),
    INDEX idx_check_date (check_date),
    INDEX idx_check_status (check_status),
    INDEX idx_is_prepayment (is_prepayment),
    INDEX idx_processed_by_user_id (processed_by_user_id)
);

-- Aplicación de pagos a facturas específicas
CREATE TABLE payment_allocations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_payment_id BIGINT UNSIGNED NOT NULL,
    accounts_receivable_id BIGINT UNSIGNED NOT NULL,

    -- Montos
    allocated_amount DECIMAL(15,2) NOT NULL,
    allocation_date DATE NOT NULL,

    -- Control
    allocation_type ENUM('AUTOMATIC', 'MANUAL') DEFAULT 'MANUAL',
    applied_by_user_id BIGINT UNSIGNED NOT NULL,
    notes TEXT NULL,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    FOREIGN KEY (customer_payment_id) REFERENCES customer_payments(id) ON DELETE CASCADE,
    FOREIGN KEY (accounts_receivable_id) REFERENCES accounts_receivable(id) ON DELETE CASCADE,
    FOREIGN KEY (applied_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,

    -- Índices
    INDEX idx_customer_payment_id (customer_payment_id),
    INDEX idx_accounts_receivable_id (accounts_receivable_id),
    INDEX idx_allocation_date (allocation_date),
    INDEX idx_allocation_type (allocation_type),
    INDEX idx_applied_by_user_id (applied_by_user_id)
);

-- Multas por mora
CREATE TABLE customer_penalties (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    accounts_receivable_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,

    -- Detalles de la multa
    penalty_amount DECIMAL(15,2) NOT NULL,
    penalty_rate DECIMAL(5,2) NOT NULL COMMENT 'Porcentaje aplicado',
    days_overdue INT NOT NULL,
    calculation_base DECIMAL(15,2) NOT NULL COMMENT 'Monto base para el cálculo',

    -- Descripción
    penalty_description TEXT NOT NULL,
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,

    -- Control
    is_applied BOOLEAN DEFAULT FALSE COMMENT 'Si ya se aplicó a la cuenta',
    is_waived BOOLEAN DEFAULT FALSE COMMENT 'Si fue condonada',
    waived_by_user_id BIGINT UNSIGNED NULL,
    waived_reason TEXT NULL,

    -- Auditoría
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    FOREIGN KEY (accounts_receivable_id) REFERENCES accounts_receivable(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (waived_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,

    -- Índices
    INDEX idx_accounts_receivable_id (accounts_receivable_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_penalty_amount (penalty_amount),
    INDEX idx_days_overdue (days_overdue),
    INDEX idx_is_applied (is_applied),
    INDEX idx_is_waived (is_waived),
    INDEX idx_created_by_user_id (created_by_user_id)
);

-- Excepciones de límite de crédito autorizadas por supervisor
CREATE TABLE credit_limit_exceptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NOT NULL,
    document_id BIGINT UNSIGNED NULL COMMENT 'Documento que excedió el límite',

    -- Detalles de la excepción
    original_limit DECIMAL(15,2) NOT NULL,
    exception_amount DECIMAL(15,2) NOT NULL,
    new_effective_limit DECIMAL(15,2) NOT NULL,

    -- Justificación
    reason TEXT NOT NULL,
    is_temporary BOOLEAN DEFAULT TRUE,
    expires_at DATE NULL COMMENT 'Fecha de expiración de la excepción',

    -- Autorización
    authorized_by_user_id BIGINT UNSIGNED NOT NULL COMMENT 'Supervisor que autoriza',
    authorization_level ENUM('SUPERVISOR', 'MANAGER', 'ADMIN') NOT NULL,

    -- Estado
    exception_status ENUM('ACTIVE', 'EXPIRED', 'REVOKED') DEFAULT 'ACTIVE',

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Constraints
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
    FOREIGN KEY (authorized_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,

    -- Índices
    INDEX idx_customer_id (customer_id),
    INDEX idx_document_id (document_id),
    INDEX idx_authorized_by_user_id (authorized_by_user_id),
    INDEX idx_exception_status (exception_status),
    INDEX idx_expires_at (expires_at),
    INDEX idx_authorization_level (authorization_level)
);

SET FOREIGN_KEY_CHECKS = 1;
