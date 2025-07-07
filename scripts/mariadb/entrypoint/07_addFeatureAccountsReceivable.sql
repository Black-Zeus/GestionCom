-- =====================================================
-- FEATURE: GESTIÓN DE CUENTA CORRIENTE
-- Archivo: 07_addFeatureAccountsReceivable.sql
-- Descripción: Sistema completo de cuentas por cobrar y gestión de clientes
-- Incluye: Clientes, Crédito, Pagos, Mora, Reportería
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- SECCIÓN 1: CREACIÓN DE TABLAS NUEVAS
-- =====================================================

-- Clientes principales (empresas y personas naturales)
CREATE TABLE customers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_code VARCHAR(50) UNIQUE NOT NULL COMMENT 'Código único del cliente',
    customer_type ENUM('COMPANY', 'INDIVIDUAL') NOT NULL COMMENT 'Tipo de cliente',
    
    -- Datos identificación
    tax_id VARCHAR(20) UNIQUE NOT NULL COMMENT 'RUT/DNI del cliente',
    legal_name VARCHAR(255) NOT NULL COMMENT 'Razón social o nombre completo',
    commercial_name VARCHAR(255) NULL COMMENT 'Nombre comercial o fantasía',
    
    -- Datos de contacto
    contact_person VARCHAR(255) NULL COMMENT 'Persona de contacto principal',
    email VARCHAR(255) NULL,
    phone VARCHAR(20) NULL,
    mobile VARCHAR(20) NULL,
    website VARCHAR(255) NULL,
    
    -- Dirección
    address TEXT NULL,
    city VARCHAR(100) NULL,
    region VARCHAR(100) NULL,
    country VARCHAR(100) DEFAULT 'Chile',
    postal_code VARCHAR(20) NULL,
    
    -- Configuración comercial
    price_list_id BIGINT UNSIGNED NULL COMMENT 'Lista de precios asignada',
    sales_rep_user_id BIGINT UNSIGNED NULL COMMENT 'Vendedor asignado',
    
    -- Estado del cliente
    customer_status ENUM('ACTIVE', 'INACTIVE', 'BLOCKED', 'DEFAULTED') DEFAULT 'ACTIVE',
    is_credit_customer BOOLEAN DEFAULT FALSE COMMENT 'Si maneja cuenta corriente',
    registration_date DATE NOT NULL DEFAULT (CURDATE()),
    
    -- Observaciones
    notes TEXT NULL,
    internal_notes TEXT NULL COMMENT 'Notas internas no visibles al cliente',
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by_user_id BIGINT UNSIGNED NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Constraints
    FOREIGN KEY (price_list_id) REFERENCES price_lists(id) ON DELETE SET NULL,
    FOREIGN KEY (sales_rep_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Índices
    INDEX idx_customer_code (customer_code),
    INDEX idx_tax_id (tax_id),
    INDEX idx_customer_type (customer_type),
    INDEX idx_customer_status (customer_status),
    INDEX idx_is_credit_customer (is_credit_customer),
    INDEX idx_sales_rep_user_id (sales_rep_user_id),
    INDEX idx_registration_date (registration_date),
    INDEX idx_deleted_at (deleted_at)
);

-- Usuarios autorizados por cliente empresa
CREATE TABLE customer_authorized_users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NOT NULL,
    authorized_name VARCHAR(255) NOT NULL COMMENT 'Nombre del comprador autorizado',
    authorized_tax_id VARCHAR(20) NULL COMMENT 'RUT del comprador',
    position VARCHAR(100) NULL COMMENT 'Cargo en la empresa',
    email VARCHAR(255) NULL,
    phone VARCHAR(20) NULL,
    is_primary_contact BOOLEAN DEFAULT FALSE COMMENT 'Contacto principal',
    authorization_level ENUM('BASIC', 'ADVANCED', 'FULL') DEFAULT 'BASIC' COMMENT 'Nivel de autorización',
    max_purchase_amount DECIMAL(15,2) NULL COMMENT 'Monto máximo de compra individual',
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    UNIQUE KEY uk_customer_tax_id (customer_id, authorized_tax_id),
    
    -- Índices
    INDEX idx_customer_id (customer_id),
    INDEX idx_authorized_tax_id (authorized_tax_id),
    INDEX idx_is_primary_contact (is_primary_contact),
    INDEX idx_authorization_level (authorization_level),
    INDEX idx_is_active (is_active)
);

-- Configuración de crédito por cliente
CREATE TABLE customer_credit_config (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NOT NULL,
    
    -- Límites de crédito
    credit_limit DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'Límite máximo de crédito',
    available_credit DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'Crédito disponible actual',
    used_credit DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'Crédito utilizado',
    
    -- Condiciones de pago
    payment_terms_days INT UNSIGNED DEFAULT 30 COMMENT 'Días de plazo para pago',
    grace_period_days INT UNSIGNED DEFAULT 5 COMMENT 'Días de gracia antes de multa',
    minimum_payment_percentage DECIMAL(5,2) DEFAULT 30.00 COMMENT 'Porcentaje mínimo para pago en cuotas',
    
    -- Configuración de mora
    penalty_rate DECIMAL(5,2) DEFAULT 2.00 COMMENT 'Porcentaje de multa por mora',
    max_overdue_amount DECIMAL(15,2) NULL COMMENT 'Monto máximo permitido en mora',
    
    -- Métodos de pago permitidos
    allows_cash BOOLEAN DEFAULT TRUE,
    allows_check BOOLEAN DEFAULT TRUE,
    allows_postdated_check BOOLEAN DEFAULT FALSE COMMENT 'Permite cheques a fecha',
    allows_transfer BOOLEAN DEFAULT TRUE,
    allows_installments BOOLEAN DEFAULT FALSE COMMENT 'Permite pago en cuotas',
    
    -- Control de riesgo
    risk_level ENUM('LOW', 'MEDIUM', 'HIGH') DEFAULT 'MEDIUM',
    requires_guarantor BOOLEAN DEFAULT FALSE,
    auto_block_on_overdue BOOLEAN DEFAULT TRUE COMMENT 'Bloqueo automático por mora',
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by_user_id BIGINT UNSIGNED NULL,
    
    -- Constraints
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_customer_credit (customer_id),
    
    -- Índices
    INDEX idx_customer_id (customer_id),
    INDEX idx_credit_limit (credit_limit),
    INDEX idx_available_credit (available_credit),
    INDEX idx_risk_level (risk_level),
    INDEX idx_auto_block_on_overdue (auto_block_on_overdue)
);

-- Cuentas por cobrar (facturas pendientes)
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

-- =====================================================
-- SECCIÓN 2: MODIFICACIÓN DE TABLAS EXISTENTES
-- =====================================================

-- Vincular documentos con clientes
ALTER TABLE documents 
ADD COLUMN customer_id BIGINT UNSIGNED NULL COMMENT 'Cliente asociado al documento',
ADD COLUMN authorized_buyer_id BIGINT UNSIGNED NULL COMMENT 'Comprador autorizado que realizó la compra',
ADD COLUMN credit_sale BOOLEAN DEFAULT FALSE COMMENT 'Si es venta a crédito',
ADD COLUMN credit_terms_days INT UNSIGNED NULL COMMENT 'Días de crédito para este documento';

ALTER TABLE documents 
ADD INDEX idx_customer_id (customer_id);

ALTER TABLE documents 
ADD INDEX idx_authorized_buyer_id (authorized_buyer_id);

ALTER TABLE documents 
ADD INDEX idx_credit_sale (credit_sale);

ALTER TABLE documents 
ADD FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT;

ALTER TABLE documents 
ADD FOREIGN KEY (authorized_buyer_id) REFERENCES customer_authorized_users(id) ON DELETE SET NULL;

-- Expandir métodos de pago para cheques a fecha
ALTER TABLE payment_methods 
ADD COLUMN allows_postdated BOOLEAN DEFAULT FALSE COMMENT 'Permite cheques/pagos a fecha',
ADD COLUMN requires_bank_info BOOLEAN DEFAULT FALSE COMMENT 'Requiere información bancaria',
ADD COLUMN default_terms_days INT UNSIGNED NULL COMMENT 'Días por defecto para este método';

-- Agregar nuevos permisos para cuenta corriente
INSERT INTO permissions (permission_code, permission_name, permission_group) VALUES
('CUSTOMERS_VIEW', 'Ver Clientes', 'ACCOUNTS_RECEIVABLE'),
('CUSTOMERS_CREATE', 'Crear Clientes', 'ACCOUNTS_RECEIVABLE'),
('CUSTOMERS_EDIT', 'Editar Clientes', 'ACCOUNTS_RECEIVABLE'),
('CUSTOMERS_DELETE', 'Eliminar Clientes', 'ACCOUNTS_RECEIVABLE'),
('CREDIT_LIMITS_VIEW', 'Ver Límites de Crédito', 'ACCOUNTS_RECEIVABLE'),
('CREDIT_LIMITS_EDIT', 'Modificar Límites de Crédito', 'ACCOUNTS_RECEIVABLE'),
('CREDIT_EXCEPTIONS_AUTHORIZE', 'Autorizar Excepciones de Crédito', 'ACCOUNTS_RECEIVABLE'),
('PAYMENTS_RECEIVE', 'Recibir Pagos', 'ACCOUNTS_RECEIVABLE'),
('PAYMENTS_ALLOCATE', 'Aplicar Pagos a Facturas', 'ACCOUNTS_RECEIVABLE'),
('PENALTIES_APPLY', 'Aplicar Multas por Mora', 'ACCOUNTS_RECEIVABLE'),
('PENALTIES_WAIVE', 'Condonar Multas', 'ACCOUNTS_RECEIVABLE'),
('AR_REPORTS_VIEW', 'Ver Reportes Cuentas por Cobrar', 'ACCOUNTS_RECEIVABLE'),
('AGING_REPORTS_VIEW', 'Ver Reportes de Antigüedad', 'ACCOUNTS_RECEIVABLE'),
('CUSTOMER_STATEMENTS_GENERATE', 'Generar Estados de Cuenta', 'ACCOUNTS_RECEIVABLE');

-- =====================================================
-- SECCIÓN 3: CREACIÓN DE VISTAS
-- =====================================================

-- Vista saldo actual por cliente
CREATE VIEW v_customer_balance AS
SELECT 
    c.id as customer_id,
    c.customer_code,
    c.legal_name,
    c.customer_type,
    c.customer_status,
    ccc.credit_limit,
    ccc.used_credit,
    ccc.available_credit,
    
    -- Saldos de cuenta corriente
    COALESCE(ar_summary.total_pending, 0) as total_pending,
    COALESCE(ar_summary.total_overdue, 0) as total_overdue,
    COALESCE(ar_summary.oldest_invoice_days, 0) as oldest_invoice_days,
    
    -- Prepagos
    COALESCE(prepay_summary.prepaid_balance, 0) as prepaid_balance,
    
    -- Estado financiero
    CASE 
        WHEN COALESCE(ar_summary.total_overdue, 0) > 0 THEN 'OVERDUE'
        WHEN COALESCE(ar_summary.total_pending, 0) > ccc.credit_limit THEN 'OVER_LIMIT'
        WHEN c.customer_status = 'BLOCKED' THEN 'BLOCKED'
        ELSE 'CURRENT'
    END as financial_status,
    
    -- Información del vendedor
    sales_rep.username as sales_rep_name,
    
    -- Última actividad
    last_activity.last_invoice_date,
    last_activity.last_payment_date
    
FROM customers c
LEFT JOIN customer_credit_config ccc ON c.id = ccc.customer_id
LEFT JOIN users sales_rep ON c.sales_rep_user_id = sales_rep.id

-- Resumen de cuentas por cobrar
LEFT JOIN (
    SELECT 
        customer_id,
        SUM(current_balance) as total_pending,
        SUM(CASE WHEN status = 'OVERDUE' THEN current_balance ELSE 0 END) as total_overdue,
        MAX(days_overdue) as oldest_invoice_days
    FROM accounts_receivable 
    WHERE status IN ('PENDING', 'PARTIAL', 'OVERDUE')
    GROUP BY customer_id
) ar_summary ON c.id = ar_summary.customer_id

-- Resumen de prepagos
LEFT JOIN (
    SELECT 
        customer_id,
        SUM(unallocated_amount) as prepaid_balance
    FROM customer_payments 
    WHERE payment_status = 'CONFIRMED' 
        AND is_prepayment = TRUE 
        AND unallocated_amount > 0
    GROUP BY customer_id
) prepay_summary ON c.id = prepay_summary.customer_id

-- Última actividad
LEFT JOIN (
    SELECT 
        customer_id,
        MAX(CASE WHEN doc_type = 'INVOICE' THEN activity_date END) as last_invoice_date,
        MAX(CASE WHEN doc_type = 'PAYMENT' THEN activity_date END) as last_payment_date
    FROM (
        SELECT customer_id, invoice_date as activity_date, 'INVOICE' as doc_type 
        FROM accounts_receivable
        UNION ALL
        SELECT customer_id, payment_date as activity_date, 'PAYMENT' as doc_type 
        FROM customer_payments
    ) activities
    GROUP BY customer_id
) last_activity ON c.id = last_activity.customer_id

WHERE c.deleted_at IS NULL
ORDER BY c.customer_code;

-- Vista análisis de antigüedad (aging)
CREATE VIEW v_aging_analysis AS
SELECT 
    c.customer_code,
    c.legal_name,
    c.customer_type,
    
    -- Aging buckets
    SUM(CASE WHEN ar.days_overdue = 0 THEN ar.current_balance ELSE 0 END) as current_amount,
    SUM(CASE WHEN ar.days_overdue BETWEEN 1 AND 30 THEN ar.current_balance ELSE 0 END) as days_1_30,
    SUM(CASE WHEN ar.days_overdue BETWEEN 31 AND 60 THEN ar.current_balance ELSE 0 END) as days_31_60,
    SUM(CASE WHEN ar.days_overdue BETWEEN 61 AND 90 THEN ar.current_balance ELSE 0 END) as days_61_90,
    SUM(CASE WHEN ar.days_overdue > 90 THEN ar.current_balance ELSE 0 END) as days_over_90,
    
    -- Totales
    SUM(ar.current_balance) as total_balance,
    MAX(ar.days_overdue) as max_days_overdue,
    COUNT(ar.id) as invoice_count,
    
    -- Información de crédito
    ccc.credit_limit,
    ccc.payment_terms_days,
    
    -- Estado
    CASE 
        WHEN MAX(ar.days_overdue) > 90 THEN 'CRITICAL'
        WHEN MAX(ar.days_overdue) > 60 THEN 'HIGH_RISK'
        WHEN MAX(ar.days_overdue) > 30 THEN 'MODERATE_RISK'
        WHEN MAX(ar.days_overdue) > 0 THEN 'LOW_RISK'
        ELSE 'CURRENT'
    END as risk_category

FROM customers c
JOIN accounts_receivable ar ON c.id = ar.customer_id
LEFT JOIN customer_credit_config ccc ON c.id = ccc.customer_id
WHERE c.deleted_at IS NULL 
    AND ar.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
GROUP BY c.id
ORDER BY max_days_overdue DESC, total_balance DESC;

-- Vista clientes morosos
CREATE VIEW v_overdue_customers AS
SELECT 
    c.customer_code,
    c.legal_name,
    c.tax_id,
    c.customer_status,
    
    -- Datos de contacto
    c.contact_person,
    c.email,
    c.phone,
    
    -- Información de mora
    SUM(ar.current_balance) as total_overdue_amount,
    MAX(ar.days_overdue) as max_days_overdue,
    MIN(ar.first_overdue_date) as first_overdue_date,
    COUNT(ar.id) as overdue_invoice_count,
    
    -- Multas
    COALESCE(penalty_summary.total_penalties, 0) as total_penalties,
    COALESCE(penalty_summary.applied_penalties, 0) as applied_penalties,
    
    -- Límite de crédito
    ccc.credit_limit,
    ccc.auto_block_on_overdue,
    
    -- Vendedor asignado
    sales_rep.username as sales_rep_name,
    sales_rep.email as sales_rep_email,
    
    -- Clasificación de riesgo
    CASE 
        WHEN MAX(ar.days_overdue) > 120 THEN 'COLLECTION_AGENCY'
        WHEN MAX(ar.days_overdue) > 90 THEN 'LEGAL_ACTION'
        WHEN MAX(ar.days_overdue) > 60 THEN 'FINAL_NOTICE'
        WHEN MAX(ar.days_overdue) > 30 THEN 'SECOND_NOTICE'
        ELSE 'FIRST_NOTICE'
    END as collection_stage

FROM customers c
JOIN accounts_receivable ar ON c.id = ar.customer_id
LEFT JOIN customer_credit_config ccc ON c.id = ccc.customer_id
LEFT JOIN users sales_rep ON c.sales_rep_user_id = sales_rep.id

-- Resumen de multas
LEFT JOIN (
    SELECT 
        customer_id,
        SUM(penalty_amount) as total_penalties,
        SUM(CASE WHEN is_applied = TRUE THEN penalty_amount ELSE 0 END) as applied_penalties
    FROM customer_penalties
    WHERE is_waived = FALSE
    GROUP BY customer_id
) penalty_summary ON c.id = penalty_summary.customer_id

WHERE c.deleted_at IS NULL 
    AND ar.status = 'OVERDUE'
    AND ar.days_overdue > 0
GROUP BY c.id
ORDER BY max_days_overdue DESC, total_overdue_amount DESC;

-- Vista estado de cuenta detallado
CREATE VIEW v_customer_statement AS
SELECT 
    c.customer_code,
    c.legal_name,
    'INVOICE' as transaction_type,
    d.document_number as reference,
    ar.invoice_date as transaction_date,
    ar.due_date,
    ar.original_amount as debit_amount,
    0 as credit_amount,
    ar.current_balance as balance,
    ar.status,
    ar.days_overdue,
    '' as notes

FROM customers c
JOIN accounts_receivable ar ON c.id = ar.customer_id
JOIN documents d ON ar.document_id = d.id
WHERE c.deleted_at IS NULL

UNION ALL

SELECT 
    c.customer_code,
    c.legal_name,
    'PAYMENT' as transaction_type,
    cp.payment_code as reference,
    cp.payment_date as transaction_date,
    NULL as due_date,
    0 as debit_amount,
    cp.payment_amount as credit_amount,
    cp.unallocated_amount as balance,
    cp.payment_status as status,
    0 as days_overdue,
    cp.notes

FROM customers c
JOIN customer_payments cp ON c.id = cp.customer_id
WHERE c.deleted_at IS NULL

UNION ALL

SELECT 
    c.customer_code,
    c.legal_name,
    'PENALTY' as transaction_type,
    CONCAT('PENALTY-', cp.id) as reference,
    DATE(cp.created_at) as transaction_date,
    NULL as due_date,
    cp.penalty_amount as debit_amount,
    0 as credit_amount,
    CASE WHEN cp.is_applied THEN 0 ELSE cp.penalty_amount END as balance,
    CASE WHEN cp.is_waived THEN 'WAIVED' WHEN cp.is_applied THEN 'APPLIED' ELSE 'PENDING' END as status,
    cp.days_overdue,
    cp.penalty_description as notes

FROM customers c
JOIN customer_penalties cp ON c.id = cp.customer_id
WHERE c.deleted_at IS NULL

ORDER BY customer_code, transaction_date DESC;

-- Vista proyección de flujo de caja
CREATE VIEW v_cash_flow_projection AS
SELECT 
    projection_date,
    SUM(expected_amount) as expected_collections,
    COUNT(*) as invoice_count,
    
    -- Por tipo de cliente
    SUM(CASE WHEN customer_type = 'COMPANY' THEN expected_amount ELSE 0 END) as company_collections,
    SUM(CASE WHEN customer_type = 'INDIVIDUAL' THEN expected_amount ELSE 0 END) as individual_collections,
    
    -- Por riesgo
    SUM(CASE WHEN risk_level = 'LOW' THEN expected_amount ELSE 0 END) as low_risk_amount,
    SUM(CASE WHEN risk_level = 'MEDIUM' THEN expected_amount ELSE 0 END) as medium_risk_amount,
    SUM(CASE WHEN risk_level = 'HIGH' THEN expected_amount ELSE 0 END) as high_risk_amount,
    
    -- Probabilidad de cobro
    SUM(expected_amount * collection_probability) as weighted_collections

FROM (
    SELECT 
        ar.due_date as projection_date,
        ar.current_balance as expected_amount,
        c.customer_type,
        ccc.risk_level,
        
        -- Probabilidad de cobro basada en historial
        CASE 
            WHEN ar.days_overdue = 0 THEN 0.95
            WHEN ar.days_overdue BETWEEN 1 AND 15 THEN 0.85
            WHEN ar.days_overdue BETWEEN 16 AND 30 THEN 0.70
            WHEN ar.days_overdue BETWEEN 31 AND 60 THEN 0.50
            WHEN ar.days_overdue BETWEEN 61 AND 90 THEN 0.30
            ELSE 0.15
        END as collection_probability
        
    FROM accounts_receivable ar
    JOIN customers c ON ar.customer_id = c.id
    LEFT JOIN customer_credit_config ccc ON c.id = ccc.customer_id
    WHERE ar.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
        AND c.deleted_at IS NULL
) projections
GROUP BY projection_date
ORDER BY projection_date;

-- =====================================================
-- SECCIÓN 4: INSERCIÓN DE DATOS MAESTROS
-- =====================================================

-- Actualizar métodos de pago existentes para cuenta corriente
UPDATE payment_methods SET 
    allows_postdated = TRUE,
    requires_bank_info = TRUE,
    default_terms_days = 30
WHERE method_code = 'CHECK';

UPDATE payment_methods SET 
    requires_bank_info = TRUE,
    default_terms_days = 0
WHERE method_code = 'TRANSFER';

-- Insertar nuevos métodos de pago específicos para cuenta corriente
INSERT INTO payment_methods (method_code, method_name, method_type, affects_cash_flow, requires_bank_info, allows_postdated, currency_code) VALUES
('CREDIT_TERMS', 'Crédito Empresa', 'OTHER', FALSE, FALSE, FALSE, 'CLP'),
('POSTDATED_CHECK', 'Cheque a Fecha', 'OTHER', FALSE, TRUE, TRUE, 'CLP'),
('WIRE_TRANSFER', 'Transferencia Bancaria', 'TRANSFER', FALSE, TRUE, FALSE, 'CLP'),
('PROMISSORY_NOTE', 'Pagaré', 'OTHER', FALSE, FALSE, TRUE, 'CLP');

-- Insertar rol específico para contabilidad
INSERT INTO roles (role_code, role_name, role_description, is_system_role) VALUES
('ACCOUNTANT', 'Contador', 'Gestión completa de cuentas por cobrar y contabilidad', TRUE);

-- Asignar permisos al rol de contador
INSERT INTO role_permissions (role_id, permission_id) 
SELECT 
    (SELECT id FROM roles WHERE role_code = 'ACCOUNTANT'),
    id
FROM permissions 
WHERE permission_group IN ('ACCOUNTS_RECEIVABLE', 'CASH_CONTROL', 'REPORTS');

-- Configuración del sistema para cuenta corriente
INSERT INTO system_features (feature_code, feature_name, feature_description, feature_type, default_value, current_value) VALUES
('AR_AUTO_AGING_DAYS', 'Días para Aging Automático', 'Días para clasificación automática de antigüedad', 'STRING', '30,60,90,120', '30,60,90,120'),
('AR_AUTO_PENALTY_RATE', 'Tasa de Multa Automática', 'Porcentaje de multa por mora por defecto', 'STRING', '2.0', '2.0'),
('AR_GRACE_PERIOD_DAYS', 'Días de Gracia por Defecto', 'Días de gracia antes de aplicar mora', 'INTEGER', '5', '5'),
('AR_DEFAULT_CREDIT_LIMIT', 'Límite de Crédito por Defecto', 'Límite de crédito para nuevos clientes', 'STRING', '100000', '100000'),
('AR_REQUIRE_SUPERVISOR_OVER_LIMIT', 'Requiere Supervisor para Exceso', 'Si requiere autorización para exceder límite', 'BOOLEAN', 'true', 'true'),
('AR_AUTO_BLOCK_OVERDUE', 'Bloqueo Automático por Mora', 'Bloquear clientes automáticamente por mora', 'BOOLEAN', 'true', 'true'),
('AR_MIN_PAYMENT_PERCENTAGE', 'Porcentaje Mínimo de Pago', 'Porcentaje mínimo para pago en cuotas', 'STRING', '30', '30');

-- =====================================================
-- SECCIÓN 5: FUNCIONES Y PROCEDIMIENTOS
-- =====================================================

-- Función para calcular días de mora
DELIMITER //
CREATE FUNCTION calculate_overdue_days(due_date DATE) 
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE overdue_days INT DEFAULT 0;
    
    IF due_date < CURDATE() THEN
        SET overdue_days = DATEDIFF(CURDATE(), due_date);
    END IF;
    
    RETURN overdue_days;
END//
DELIMITER ;

-- Función para validar límite de crédito
DELIMITER //
CREATE FUNCTION validate_credit_limit(customer_id BIGINT UNSIGNED, new_amount DECIMAL(15,2)) 
RETURNS JSON
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE result JSON;
    DECLARE current_used DECIMAL(15,2) DEFAULT 0;
    DECLARE credit_limit DECIMAL(15,2) DEFAULT 0;
    DECLARE available_credit DECIMAL(15,2) DEFAULT 0;
    DECLARE total_after_purchase DECIMAL(15,2) DEFAULT 0;
    DECLARE is_valid BOOLEAN DEFAULT FALSE;
    DECLARE message VARCHAR(255) DEFAULT '';
    
    -- Obtener configuración de crédito
    SELECT 
        COALESCE(ccc.used_credit, 0),
        COALESCE(ccc.credit_limit, 0),
        COALESCE(ccc.available_credit, 0)
    INTO current_used, credit_limit, available_credit
    FROM customer_credit_config ccc
    WHERE ccc.customer_id = customer_id;
    
    -- Calcular total después de la compra
    SET total_after_purchase = current_used + new_amount;
    
    -- Validar límite
    IF total_after_purchase <= credit_limit THEN
        SET is_valid = TRUE;
        SET message = 'Transacción aprobada dentro del límite de crédito';
    ELSE
        SET is_valid = FALSE;
        SET message = CONCAT('Excede límite de crédito. Límite: ', credit_limit, ', Usado: ', total_after_purchase);
    END IF;
    
    -- Construir resultado JSON
    SET result = JSON_OBJECT(
        'is_valid', is_valid,
        'message', message,
        'credit_limit', credit_limit,
        'current_used', current_used,
        'available_credit', available_credit,
        'amount_requested', new_amount,
        'total_after_purchase', total_after_purchase,
        'excess_amount', GREATEST(0, total_after_purchase - credit_limit)
    );
    
    RETURN result;
END//
DELIMITER ;

-- Procedimiento para crear cuenta por cobrar automáticamente
DELIMITER //
CREATE PROCEDURE create_accounts_receivable(
    IN p_document_id BIGINT UNSIGNED,
    IN p_customer_id BIGINT UNSIGNED,
    IN p_amount DECIMAL(15,2),
    IN p_terms_days INT UNSIGNED
)
BEGIN
    DECLARE v_invoice_date DATE;
    DECLARE v_due_date DATE;
    
    -- Obtener fecha del documento
    SELECT document_date INTO v_invoice_date
    FROM documents 
    WHERE id = p_document_id;
    
    -- Calcular fecha de vencimiento
    SET v_due_date = DATE_ADD(v_invoice_date, INTERVAL p_terms_days DAY);
    
    -- Crear cuenta por cobrar
    INSERT INTO accounts_receivable (
        document_id,
        customer_id,
        original_amount,
        current_balance,
        invoice_date,
        due_date,
        status
    ) VALUES (
        p_document_id,
        p_customer_id,
        p_amount,
        p_amount,
        v_invoice_date,
        v_due_date,
        'PENDING'
    );
    
    -- Actualizar crédito usado del cliente
    UPDATE customer_credit_config 
    SET 
        used_credit = used_credit + p_amount,
        available_credit = credit_limit - (used_credit + p_amount)
    WHERE customer_id = p_customer_id;
    
END//
DELIMITER ;

-- Procedimiento para aplicar pago a facturas
DELIMITER //
CREATE PROCEDURE apply_payment_to_invoices(
    IN p_payment_id BIGINT UNSIGNED,
    IN p_allocation_strategy ENUM('OLDEST_FIRST', 'MANUAL', 'PROPORTIONAL')
)
BEGIN
    DECLARE v_remaining_amount DECIMAL(15,2);
    DECLARE v_customer_id BIGINT UNSIGNED;
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_ar_id BIGINT UNSIGNED;
    DECLARE v_ar_balance DECIMAL(15,2);
    DECLARE v_allocation_amount DECIMAL(15,2);
    
    -- Cursor para facturas pendientes (ordenadas por antigüedad)
    DECLARE ar_cursor CURSOR FOR
        SELECT ar.id, ar.current_balance
        FROM accounts_receivable ar
        WHERE ar.customer_id = v_customer_id
            AND ar.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
            AND ar.current_balance > 0
        ORDER BY ar.due_date ASC, ar.invoice_date ASC;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Obtener datos del pago
    SELECT customer_id, unallocated_amount 
    INTO v_customer_id, v_remaining_amount
    FROM customer_payments 
    WHERE id = p_payment_id;
    
    -- Solo procesar si hay monto disponible
    IF v_remaining_amount > 0 AND p_allocation_strategy = 'OLDEST_FIRST' THEN
        
        OPEN ar_cursor;
        
        payment_loop: LOOP
            FETCH ar_cursor INTO v_ar_id, v_ar_balance;
            
            IF done THEN
                LEAVE payment_loop;
            END IF;
            
            -- Determinar monto a aplicar
            SET v_allocation_amount = LEAST(v_remaining_amount, v_ar_balance);
            
            -- Crear asignación
            INSERT INTO payment_allocations (
                customer_payment_id,
                accounts_receivable_id,
                allocated_amount,
                allocation_date,
                allocation_type,
                applied_by_user_id
            ) VALUES (
                p_payment_id,
                v_ar_id,
                v_allocation_amount,
                CURDATE(),
                'AUTOMATIC',
                1 -- Asumiendo usuario sistema
            );
            
            -- Actualizar saldo de cuenta por cobrar
            UPDATE accounts_receivable 
            SET 
                current_balance = current_balance - v_allocation_amount,
                paid_amount = paid_amount + v_allocation_amount,
                status = CASE 
                    WHEN (current_balance - v_allocation_amount) = 0 THEN 'PAID'
                    WHEN (current_balance - v_allocation_amount) < original_amount THEN 'PARTIAL'
                    ELSE status
                END
            WHERE id = v_ar_id;
            
            -- Reducir monto restante
            SET v_remaining_amount = v_remaining_amount - v_allocation_amount;
            
            -- Si no queda monto, salir
            IF v_remaining_amount <= 0 THEN
                LEAVE payment_loop;
            END IF;
            
        END LOOP;
        
        CLOSE ar_cursor;
        
        -- Actualizar monto aplicado en el pago
        UPDATE customer_payments 
        SET allocated_amount = payment_amount - v_remaining_amount
        WHERE id = p_payment_id;
        
        -- Actualizar crédito disponible del cliente
        UPDATE customer_credit_config 
        SET 
            used_credit = used_credit - (payment_amount - v_remaining_amount),
            available_credit = credit_limit - used_credit
        WHERE customer_id = v_customer_id;
        
    END IF;
    
END//
DELIMITER ;

-- Procedimiento para calcular multas por mora
DELIMITER //
CREATE PROCEDURE calculate_penalties_for_customer(
    IN p_customer_id BIGINT UNSIGNED,
    IN p_calculation_date DATE
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_ar_id BIGINT UNSIGNED;
    DECLARE v_current_balance DECIMAL(15,2);
    DECLARE v_days_overdue INT;
    DECLARE v_penalty_rate DECIMAL(5,2);
    DECLARE v_penalty_amount DECIMAL(15,2);
    DECLARE v_grace_period INT;
    
    -- Cursor para facturas vencidas
    DECLARE overdue_cursor CURSOR FOR
        SELECT 
            ar.id,
            ar.current_balance,
            DATEDIFF(p_calculation_date, ar.due_date) as days_overdue
        FROM accounts_receivable ar
        WHERE ar.customer_id = p_customer_id
            AND ar.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
            AND ar.current_balance > 0
            AND ar.due_date < p_calculation_date;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Obtener configuración de multas del cliente
    SELECT penalty_rate, grace_period_days
    INTO v_penalty_rate, v_grace_period
    FROM customer_credit_config
    WHERE customer_id = p_customer_id;
    
    OPEN overdue_cursor;
    
    penalty_loop: LOOP
        FETCH overdue_cursor INTO v_ar_id, v_current_balance, v_days_overdue;
        
        IF done THEN
            LEAVE penalty_loop;
        END IF;
        
        -- Solo aplicar multa si excede el período de gracia
        IF v_days_overdue > v_grace_period THEN
            
            -- Calcular multa (por mes de mora)
            SET v_penalty_amount = v_current_balance * (v_penalty_rate / 100) * (v_days_overdue / 30);
            
            -- Verificar si ya existe multa para este período
            IF NOT EXISTS (
                SELECT 1 FROM customer_penalties 
                WHERE accounts_receivable_id = v_ar_id 
                    AND period_to >= p_calculation_date
                    AND is_applied = FALSE
            ) THEN
                
                -- Insertar nueva multa
                INSERT INTO customer_penalties (
                    accounts_receivable_id,
                    customer_id,
                    penalty_amount,
                    penalty_rate,
                    days_overdue,
                    calculation_base,
                    penalty_description,
                    period_from,
                    period_to,
                    created_by_user_id
                ) VALUES (
                    v_ar_id,
                    p_customer_id,
                    v_penalty_amount,
                    v_penalty_rate,
                    v_days_overdue,
                    v_current_balance,
                    CONCAT('Multa por ', v_days_overdue, ' días de mora'),
                    DATE_SUB(p_calculation_date, INTERVAL 30 DAY),
                    p_calculation_date,
                    1 -- Usuario sistema
                );
                
                -- Actualizar días de mora en cuenta por cobrar
                UPDATE accounts_receivable 
                SET 
                    days_overdue = v_days_overdue,
                    status = 'OVERDUE',
                    first_overdue_date = COALESCE(first_overdue_date, due_date)
                WHERE id = v_ar_id;
                
            END IF;
            
        END IF;
        
    END LOOP;
    
    CLOSE overdue_cursor;
    
END//
DELIMITER ;

-- Procedimiento para generar excepción de límite de crédito
DELIMITER //
CREATE PROCEDURE create_credit_limit_exception(
    IN p_customer_id BIGINT UNSIGNED,
    IN p_document_id BIGINT UNSIGNED,
    IN p_exception_amount DECIMAL(15,2),
    IN p_reason TEXT,
    IN p_authorized_by_user_id BIGINT UNSIGNED,
    IN p_is_temporary BOOLEAN,
    IN p_expires_days INT UNSIGNED
)
BEGIN
    DECLARE v_current_limit DECIMAL(15,2);
    DECLARE v_new_limit DECIMAL(15,2);
    DECLARE v_expires_date DATE DEFAULT NULL;
    
    -- Obtener límite actual
    SELECT credit_limit INTO v_current_limit
    FROM customer_credit_config
    WHERE customer_id = p_customer_id;
    
    -- Calcular nuevo límite
    SET v_new_limit = v_current_limit + p_exception_amount;
    
    -- Calcular fecha de expiración si es temporal
    IF p_is_temporary THEN
        SET v_expires_date = DATE_ADD(CURDATE(), INTERVAL p_expires_days DAY);
    END IF;
    
    -- Crear excepción
    INSERT INTO credit_limit_exceptions (
        customer_id,
        document_id,
        original_limit,
        exception_amount,
        new_effective_limit,
        reason,
        is_temporary,
        expires_at,
        authorized_by_user_id,
        authorization_level
    ) VALUES (
        p_customer_id,
        p_document_id,
        v_current_limit,
        p_exception_amount,
        v_new_limit,
        p_reason,
        p_is_temporary,
        v_expires_date,
        p_authorized_by_user_id,
        'SUPERVISOR' -- Por defecto, puede ajustarse según el usuario
    );
    
    -- Actualizar límite temporalmente
    UPDATE customer_credit_config 
    SET 
        credit_limit = v_new_limit,
        available_credit = v_new_limit - used_credit
    WHERE customer_id = p_customer_id;
    
END//
DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;