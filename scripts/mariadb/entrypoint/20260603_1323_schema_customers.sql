-- =====================================================
-- Schema clientes
-- Archivo: 20260603_1323_schema_customers.sql
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

SET FOREIGN_KEY_CHECKS = 1;
