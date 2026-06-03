-- =====================================================
-- Schema caja y caja chica
-- Archivo: 20260603_1318_schema_cash.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- SECCIÓN 1: CREACIÓN DE TABLAS NUEVAS
-- =====================================================

-- Cajas registradoras / Terminales
CREATE TABLE cash_registers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    register_code VARCHAR(20) UNIQUE NOT NULL COMMENT 'Código único de la caja (CAJA01, TERM01)',
    register_name VARCHAR(100) NOT NULL COMMENT 'Nombre descriptivo de la caja',
    warehouse_id BIGINT UNSIGNED NOT NULL COMMENT 'Bodega/punto de venta donde está la caja',
    terminal_identifier VARCHAR(100) NULL COMMENT 'ID del terminal/computador',
    ip_address VARCHAR(45) NULL COMMENT 'IP del terminal para control',
    location_description VARCHAR(255) NULL COMMENT 'Ubicación física de la caja',
    is_active BOOLEAN DEFAULT TRUE,

    -- Configuración
    requires_supervisor_approval BOOLEAN DEFAULT TRUE COMMENT 'Requiere supervisor para diferencias',
    max_difference_amount DECIMAL(15,2) DEFAULT 1000.00 COMMENT 'Diferencia máxima sin supervisión',

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Constraints
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,

    -- Índices
    INDEX idx_register_code (register_code),
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_terminal_identifier (terminal_identifier),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Métodos de pago
CREATE TABLE payment_methods (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    method_code VARCHAR(20) UNIQUE NOT NULL COMMENT 'Código del método (CASH, DEBIT, CREDIT)',
    method_name VARCHAR(100) NOT NULL COMMENT 'Nombre descriptivo',
    method_type ENUM('CASH', 'CARD', 'TRANSFER', 'OTHER') NOT NULL COMMENT 'Tipo principal',
    affects_cash_flow BOOLEAN DEFAULT TRUE COMMENT 'Si afecta el flujo de efectivo de la caja',
    requires_authorization BOOLEAN DEFAULT FALSE COMMENT 'Requiere autorización especial',
    currency_code CHAR(3) DEFAULT 'CLP' COMMENT 'Moneda por defecto',
    is_active BOOLEAN DEFAULT TRUE,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Índices
    INDEX idx_method_code (method_code),
    INDEX idx_method_type (method_type),
    INDEX idx_affects_cash_flow (affects_cash_flow),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Sesiones de caja (turnos de cajero)
CREATE TABLE cash_register_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_code VARCHAR(50) UNIQUE NOT NULL COMMENT 'Código único de sesión',
    cash_register_id BIGINT UNSIGNED NOT NULL,
    cashier_user_id BIGINT UNSIGNED NOT NULL COMMENT 'Usuario cajero',
    supervisor_user_id BIGINT UNSIGNED NULL COMMENT 'Supervisor que autoriza',

    -- Control de apertura
    opening_amount DECIMAL(15,2) NOT NULL COMMENT 'Monto inicial para vueltos',
    opening_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    opening_notes TEXT NULL,

    -- Control de cierre
    closing_datetime TIMESTAMP NULL,
    theoretical_amount DECIMAL(15,2) NULL COMMENT 'Monto teórico según sistema',
    physical_amount DECIMAL(15,2) NULL COMMENT 'Monto físico contado',
    difference_amount DECIMAL(15,2) NULL COMMENT 'Diferencia (físico - teórico)',
    closing_notes TEXT NULL,

    -- Estados
    session_status ENUM('OPEN', 'PENDING_CLOSE', 'CLOSED', 'CANCELLED') DEFAULT 'OPEN',
    requires_supervisor_approval BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_datetime TIMESTAMP NULL,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Constraints
    FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id) ON DELETE RESTRICT,
    FOREIGN KEY (cashier_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (supervisor_user_id) REFERENCES users(id) ON DELETE RESTRICT,

    -- Índices
    INDEX idx_session_code (session_code),
    INDEX idx_cash_register_id (cash_register_id),
    INDEX idx_cashier_user_id (cashier_user_id),
    INDEX idx_session_status (session_status),
    INDEX idx_opening_datetime (opening_datetime),
    INDEX idx_closing_datetime (closing_datetime),
    INDEX idx_deleted_at (deleted_at)
);

-- Movimientos de caja
CREATE TABLE cash_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cash_register_session_id BIGINT UNSIGNED NOT NULL,
    movement_type ENUM('OPENING', 'SALE', 'RETURN', 'PETTY_CASH', 'ADJUSTMENT', 'CLOSING') NOT NULL,
    document_id BIGINT UNSIGNED NULL COMMENT 'Documento que genera el movimiento',
    payment_method_id BIGINT UNSIGNED NOT NULL,

    -- Montos
    amount DECIMAL(15,2) NOT NULL COMMENT 'Monto del movimiento (+ entrada, - salida)',
    change_amount DECIMAL(15,2) DEFAULT 0 COMMENT 'Vuelto entregado',
    received_amount DECIMAL(15,2) NULL COMMENT 'Monto recibido del cliente',

    -- Detalles
    reference_number VARCHAR(100) NULL COMMENT 'Número de referencia externo',
    description TEXT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    FOREIGN KEY (cash_register_session_id) REFERENCES cash_register_sessions(id) ON DELETE RESTRICT,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,

    -- Índices
    INDEX idx_session_id (cash_register_session_id),
    INDEX idx_movement_type (movement_type),
    INDEX idx_document_id (document_id),
    INDEX idx_payment_method_id (payment_method_id),
    INDEX idx_created_at (created_at),
    INDEX idx_created_by_user_id (created_by_user_id)
);

-- Categorías de gastos caja chica
CREATE TABLE petty_cash_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(20) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    category_description TEXT NULL,
    max_amount_per_expense DECIMAL(15,2) NULL COMMENT 'Monto máximo por gasto individual',
    requires_evidence BOOLEAN DEFAULT FALSE COMMENT 'Requiere comprobante obligatorio',
    is_active BOOLEAN DEFAULT TRUE,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Índices
    INDEX idx_category_code (category_code),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Fondos de caja chica
CREATE TABLE petty_cash_funds (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    fund_code VARCHAR(50) UNIQUE NOT NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL COMMENT 'Punto de venta que maneja el fondo',
    responsible_user_id BIGINT UNSIGNED NOT NULL COMMENT 'Usuario responsable del fondo',

    -- Control del fondo
    initial_amount DECIMAL(15,2) NOT NULL COMMENT 'Monto inicial asignado',
    current_balance DECIMAL(15,2) NOT NULL COMMENT 'Saldo actual disponible',
    total_expenses DECIMAL(15,2) DEFAULT 0 COMMENT 'Total gastado',
    total_replenishments DECIMAL(15,2) DEFAULT 0 COMMENT 'Total reposiciones',

    -- Estado
    fund_status ENUM('ACTIVE', 'SUSPENDED', 'CLOSED') DEFAULT 'ACTIVE',
    last_replenishment_date TIMESTAMP NULL,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Constraints
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (responsible_user_id) REFERENCES users(id) ON DELETE RESTRICT,

    -- Índices
    INDEX idx_fund_code (fund_code),
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_responsible_user_id (responsible_user_id),
    INDEX idx_fund_status (fund_status)
);

-- Gastos de caja chica
CREATE TABLE petty_cash_expenses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    expense_code VARCHAR(50) UNIQUE NOT NULL,
    petty_cash_fund_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    cash_register_session_id BIGINT UNSIGNED NULL COMMENT 'Sesión de caja donde se registró',

    -- Detalles del gasto
    expense_amount DECIMAL(15,2) NOT NULL,
    expense_description TEXT NOT NULL,
    vendor_name VARCHAR(255) NULL COMMENT 'Proveedor o comercio',
    expense_date DATE NOT NULL,

    -- Evidencia
    evidence_file_hash VARCHAR(100) NULL COMMENT 'Hash UUID del archivo en MinIO',
    evidence_file_extension VARCHAR(10) NULL COMMENT 'Extensión del archivo',
    evidence_file_size BIGINT UNSIGNED NULL COMMENT 'Tamaño del archivo en bytes',
    has_receipt BOOLEAN DEFAULT FALSE COMMENT 'Si tiene comprobante físico',

    -- Estado
    expense_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    approved_by_user_id BIGINT UNSIGNED NULL,
    approved_datetime TIMESTAMP NULL,
    rejection_reason TEXT NULL,

    -- Auditoría
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Constraints
    FOREIGN KEY (petty_cash_fund_id) REFERENCES petty_cash_funds(id) ON DELETE RESTRICT,
    FOREIGN KEY (category_id) REFERENCES petty_cash_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (cash_register_session_id) REFERENCES cash_register_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,

    -- Índices
    INDEX idx_expense_code (expense_code),
    INDEX idx_fund_id (petty_cash_fund_id),
    INDEX idx_category_id (category_id),
    INDEX idx_session_id (cash_register_session_id),
    INDEX idx_expense_date (expense_date),
    INDEX idx_expense_status (expense_status),
    INDEX idx_created_by_user_id (created_by_user_id),
    INDEX idx_evidence_hash (evidence_file_hash)
);

-- Reposiciones de caja chica
CREATE TABLE petty_cash_replenishments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    replenishment_code VARCHAR(50) UNIQUE NOT NULL,
    petty_cash_fund_id BIGINT UNSIGNED NOT NULL,
    cash_register_session_id BIGINT UNSIGNED NULL COMMENT 'Sesión donde se hizo la reposición',

    -- Detalles de reposición
    replenishment_amount DECIMAL(15,2) NOT NULL,
    previous_balance DECIMAL(15,2) NOT NULL,
    new_balance DECIMAL(15,2) NOT NULL,
    replenishment_reason TEXT NULL,

    -- Control
    authorized_by_user_id BIGINT UNSIGNED NOT NULL COMMENT 'Quien autoriza la reposición',
    created_by_user_id BIGINT UNSIGNED NOT NULL,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    FOREIGN KEY (petty_cash_fund_id) REFERENCES petty_cash_funds(id) ON DELETE RESTRICT,
    FOREIGN KEY (cash_register_session_id) REFERENCES cash_register_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (authorized_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,

    -- Índices
    INDEX idx_replenishment_code (replenishment_code),
    INDEX idx_fund_id (petty_cash_fund_id),
    INDEX idx_session_id (cash_register_session_id),
    INDEX idx_authorized_by_user_id (authorized_by_user_id),
    INDEX idx_created_at (created_at)
);

SET FOREIGN_KEY_CHECKS = 1;
