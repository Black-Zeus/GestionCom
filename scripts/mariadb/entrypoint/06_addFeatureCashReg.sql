-- =====================================================
-- FEATURE: CONTROL DE CAJA Y CAJA CHICA
-- Archivo: 06_addFeatureCashReg.sql
-- Descripción: Implementación completa de control de caja registradora
-- Incluye: Apertura/Cierre, Caja Chica, Cuadraturas, Reportería
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

-- =====================================================
-- SECCIÓN 2: MODIFICACIÓN DE TABLAS EXISTENTES
-- =====================================================

-- Agregar campos a tabla documents para vincular con caja
ALTER TABLE documents 
ADD COLUMN cash_register_session_id BIGINT UNSIGNED NULL COMMENT 'Sesión de caja donde se procesó',
ADD COLUMN payment_method_id BIGINT UNSIGNED NULL COMMENT 'Método de pago principal',
ADD COLUMN total_received DECIMAL(15,2) NULL COMMENT 'Monto total recibido',
ADD COLUMN total_change DECIMAL(15,2) NULL COMMENT 'Vuelto entregado';

ALTER TABLE documents 
ADD INDEX idx_cash_register_session_id (cash_register_session_id);

ALTER TABLE documents 
ADD INDEX idx_payment_method_id (payment_method_id);

ALTER TABLE documents 
ADD FOREIGN KEY (cash_register_session_id) REFERENCES cash_register_sessions(id) ON DELETE SET NULL;

ALTER TABLE documents 
ADD FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL;

-- Agregar campo a usuarios para límite de caja chica
ALTER TABLE users 
ADD COLUMN petty_cash_limit DECIMAL(15,2) NULL COMMENT 'Límite máximo para gastos de caja chica individual';

-- =====================================================
-- SECCIÓN 3: CREACIÓN DE VISTAS
-- =====================================================

-- Vista resumen diario por cajero
CREATE VIEW v_daily_cash_summary AS
SELECT 
    DATE(crs.opening_datetime) as session_date,
    cr.register_code,
    cr.register_name,
    u.username as cashier_name,
    crs.session_code,
    crs.opening_amount,
    crs.theoretical_amount,
    crs.physical_amount,
    crs.difference_amount,
    CASE 
        WHEN crs.difference_amount > 0 THEN 'SOBRANTE'
        WHEN crs.difference_amount < 0 THEN 'FALTANTE'
        ELSE 'CUADRADO'
    END as difference_type,
    ABS(crs.difference_amount) as difference_abs,
    crs.session_status,
    crs.is_approved,
    supervisor.username as supervisor_name,
    COUNT(cm.id) as total_transactions,
    SUM(CASE WHEN cm.movement_type = 'SALE' THEN cm.amount ELSE 0 END) as total_sales,
    SUM(CASE WHEN cm.movement_type = 'RETURN' THEN ABS(cm.amount) ELSE 0 END) as total_returns,
    SUM(CASE WHEN cm.movement_type = 'PETTY_CASH' THEN ABS(cm.amount) ELSE 0 END) as total_petty_cash,
    crs.opening_datetime,
    crs.closing_datetime
FROM cash_register_sessions crs
JOIN cash_registers cr ON crs.cash_register_id = cr.id
JOIN users u ON crs.cashier_user_id = u.id
LEFT JOIN users supervisor ON crs.supervisor_user_id = supervisor.id
LEFT JOIN cash_movements cm ON crs.id = cm.cash_register_session_id
WHERE crs.deleted_at IS NULL 
    AND cr.deleted_at IS NULL 
    AND u.deleted_at IS NULL
GROUP BY crs.id
ORDER BY crs.opening_datetime DESC;

-- Vista estado actual de cajas
CREATE VIEW v_cash_register_status AS
SELECT 
    cr.id,
    cr.register_code,
    cr.register_name,
    w.warehouse_name,
    CASE 
        WHEN crs.session_status = 'OPEN' THEN 'ABIERTA'
        WHEN crs.session_status = 'PENDING_CLOSE' THEN 'PENDIENTE CIERRE'
        WHEN crs.session_status = 'CLOSED' THEN 'CERRADA'
        ELSE 'DISPONIBLE'
    END as current_status,
    u.username as current_cashier,
    crs.opening_datetime as session_start,
    crs.opening_amount,
    COALESCE(SUM(cm.amount), 0) as current_theoretical_balance,
    cr.terminal_identifier,
    cr.is_active
FROM cash_registers cr
JOIN warehouses w ON cr.warehouse_id = w.id
LEFT JOIN cash_register_sessions crs ON cr.id = crs.cash_register_id 
    AND crs.session_status IN ('OPEN', 'PENDING_CLOSE')
LEFT JOIN users u ON crs.cashier_user_id = u.id
LEFT JOIN cash_movements cm ON crs.id = cm.cash_register_session_id
WHERE cr.deleted_at IS NULL 
    AND w.deleted_at IS NULL
GROUP BY cr.id, crs.id
ORDER BY cr.register_code;

-- Vista resumen caja chica
CREATE VIEW v_petty_cash_summary AS
SELECT 
    pcf.fund_code,
    w.warehouse_name,
    u.username as responsible_user,
    pcf.initial_amount,
    pcf.current_balance,
    pcf.total_expenses,
    pcf.total_replenishments,
    ROUND((pcf.current_balance / pcf.initial_amount) * 100, 2) as balance_percentage,
    pcf.fund_status,
    pcf.last_replenishment_date,
    COUNT(pce.id) as total_expense_count,
    COUNT(CASE WHEN pce.expense_status = 'PENDING' THEN 1 END) as pending_expenses,
    COUNT(CASE WHEN pce.has_receipt = TRUE THEN 1 END) as expenses_with_receipt,
    MAX(pce.expense_date) as last_expense_date
FROM petty_cash_funds pcf
JOIN warehouses w ON pcf.warehouse_id = w.id
JOIN users u ON pcf.responsible_user_id = u.id
LEFT JOIN petty_cash_expenses pce ON pcf.id = pce.petty_cash_fund_id
WHERE w.deleted_at IS NULL 
    AND u.deleted_at IS NULL
GROUP BY pcf.id
ORDER BY pcf.fund_code;

-- Vista análisis de diferencias
CREATE VIEW v_cashier_performance AS
SELECT 
    u.username as cashier_name,
    DATE_FORMAT(crs.opening_datetime, '%Y-%m') as month_year,
    COUNT(crs.id) as total_sessions,
    COUNT(CASE WHEN crs.difference_amount = 0 THEN 1 END) as perfect_sessions,
    COUNT(CASE WHEN crs.difference_amount > 0 THEN 1 END) as surplus_sessions,
    COUNT(CASE WHEN crs.difference_amount < 0 THEN 1 END) as deficit_sessions,
    ROUND((COUNT(CASE WHEN crs.difference_amount = 0 THEN 1 END) / COUNT(crs.id)) * 100, 2) as accuracy_percentage,
    SUM(CASE WHEN crs.difference_amount > 0 THEN crs.difference_amount ELSE 0 END) as total_surplus,
    SUM(CASE WHEN crs.difference_amount < 0 THEN ABS(crs.difference_amount) ELSE 0 END) as total_deficit,
    AVG(ABS(crs.difference_amount)) as avg_difference,
    COUNT(CASE WHEN crs.requires_supervisor_approval = TRUE THEN 1 END) as sessions_requiring_approval
FROM users u
JOIN cash_register_sessions crs ON u.id = crs.cashier_user_id
WHERE u.deleted_at IS NULL 
    AND crs.session_status = 'CLOSED'
GROUP BY u.id, DATE_FORMAT(crs.opening_datetime, '%Y-%m')
ORDER BY month_year DESC, accuracy_percentage DESC;

-- Vista flujo de efectivo por período
CREATE VIEW v_cash_flow_period AS
SELECT 
    DATE(cm.created_at) as movement_date,
    cr.register_code,
    w.warehouse_name,
    cm.movement_type,
    pm.method_name as payment_method,
    COUNT(cm.id) as transaction_count,
    SUM(cm.amount) as total_amount,
    SUM(cm.change_amount) as total_change,
    SUM(cm.received_amount) as total_received
FROM cash_movements cm
JOIN cash_register_sessions crs ON cm.cash_register_session_id = crs.id
JOIN cash_registers cr ON crs.cash_register_id = cr.id
JOIN warehouses w ON cr.warehouse_id = w.id
JOIN payment_methods pm ON cm.payment_method_id = pm.id
WHERE cr.deleted_at IS NULL 
    AND w.deleted_at IS NULL 
    AND pm.deleted_at IS NULL
GROUP BY DATE(cm.created_at), cr.id, cm.movement_type, pm.id
ORDER BY movement_date DESC, cr.register_code;

-- =====================================================
-- SECCIÓN 4: INSERCIÓN DE DATOS MAESTROS
-- =====================================================

-- Insertar métodos de pago básicos
INSERT INTO payment_methods (method_code, method_name, method_type, affects_cash_flow, currency_code) VALUES
('CASH', 'Efectivo', 'CASH', TRUE, 'CLP'),
('DEBIT', 'Tarjeta de Débito', 'CARD', FALSE, 'CLP'),
('CREDIT', 'Tarjeta de Crédito', 'CARD', FALSE, 'CLP'),
('TRANSFER', 'Transferencia Bancaria', 'TRANSFER', FALSE, 'CLP'),
('CHECK', 'Cheque', 'OTHER', FALSE, 'CLP'),
('VOUCHER', 'Vale Vista', 'OTHER', FALSE, 'CLP'),
('GIFT_CARD', 'Tarjeta Regalo', 'OTHER', FALSE, 'CLP'),
('STORE_CREDIT', 'Crédito de Tienda', 'OTHER', FALSE, 'CLP');

-- Insertar categorías de caja chica básicas
INSERT INTO petty_cash_categories (category_code, category_name, category_description, max_amount_per_expense, requires_evidence) VALUES
('FOOD', 'Alimentación', 'Gastos en comida y bebidas para personal', 15000.00, FALSE),
('SUPPLIES', 'Suministros', 'Materiales de oficina, limpieza, etc.', 25000.00, TRUE),
('TRANSPORT', 'Transporte', 'Pasajes, combustible, estacionamiento', 10000.00, TRUE),
('SERVICES', 'Servicios', 'Servicios menores, reparaciones pequeñas', 30000.00, TRUE),
('PACKAGING', 'Empaque', 'Bolsas, cajas, material de empaque', 20000.00, TRUE),
('UTILITIES', 'Servicios Básicos', 'Pagos menores de luz, agua, teléfono', 50000.00, TRUE),
('MAINTENANCE', 'Mantención', 'Reparaciones menores, mantención equipos', 40000.00, TRUE),
('OTHER', 'Otros', 'Gastos varios no categorizados', 5000.00, FALSE);

-- Insertar permisos específicos para control de caja
INSERT INTO permissions (permission_code, permission_name, permission_group) VALUES
('CASH_REGISTER_OPEN', 'Abrir Caja Registradora', 'CASH_CONTROL'),
('CASH_REGISTER_CLOSE', 'Cerrar Caja Registradora', 'CASH_CONTROL'),
('CASH_REGISTER_SUPERVISE', 'Supervisar Cierre de Caja', 'CASH_CONTROL'),
('CASH_MOVEMENTS_VIEW', 'Ver Movimientos de Caja', 'CASH_CONTROL'),
('PETTY_CASH_SPEND', 'Realizar Gastos Caja Chica', 'CASH_CONTROL'),
('PETTY_CASH_REPLENISH', 'Reponer Caja Chica', 'CASH_CONTROL'),
('PETTY_CASH_APPROVE', 'Aprobar Gastos Caja Chica', 'CASH_CONTROL'),
('CASH_REPORTS_VIEW', 'Ver Reportes de Caja', 'CASH_CONTROL'),
('CASH_SETTINGS_MANAGE', 'Gestionar Configuración de Cajas', 'CASH_CONTROL');

-- =====================================================
-- SECCIÓN 5: FUNCIONES Y PROCEDIMIENTOS
-- =====================================================

-- Función para obtener saldo actual de caja
DELIMITER //
CREATE FUNCTION get_cash_register_balance(session_id BIGINT UNSIGNED) 
RETURNS DECIMAL(15,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE current_balance DECIMAL(15,2) DEFAULT 0;
    
    SELECT 
        COALESCE(opening_amount, 0) + COALESCE(SUM(cm.amount), 0)
    INTO current_balance
    FROM cash_register_sessions crs
    LEFT JOIN cash_movements cm ON crs.id = cm.cash_register_session_id
    WHERE crs.id = session_id
    GROUP BY crs.id;
    
    RETURN COALESCE(current_balance, 0);
END//
DELIMITER ;

-- Función para validar límite de caja chica
DELIMITER //
CREATE FUNCTION validate_petty_cash_limit(user_id BIGINT UNSIGNED, expense_amount DECIMAL(15,2)) 
RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE user_limit DECIMAL(15,2) DEFAULT NULL;
    DECLARE is_valid BOOLEAN DEFAULT TRUE;
    
    SELECT petty_cash_limit INTO user_limit
    FROM users 
    WHERE id = user_id AND deleted_at IS NULL;
    
    IF user_limit IS NOT NULL AND expense_amount > user_limit THEN
        SET is_valid = FALSE;
    END IF;
    
    RETURN is_valid;
END//
DELIMITER ;

-- Procedimiento para cerrar sesión de caja
DELIMITER //
CREATE PROCEDURE close_cash_register_session(
    IN p_session_id BIGINT UNSIGNED,
    IN p_physical_amount DECIMAL(15,2),
    IN p_closing_notes TEXT,
    IN p_supervisor_user_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_theoretical_amount DECIMAL(15,2);
    DECLARE v_difference DECIMAL(15,2);
    DECLARE v_max_difference DECIMAL(15,2);
    DECLARE v_requires_approval BOOLEAN DEFAULT FALSE;
    
    -- Calcular monto teórico
    SELECT get_cash_register_balance(p_session_id) INTO v_theoretical_amount;
    
    -- Calcular diferencia
    SET v_difference = p_physical_amount - v_theoretical_amount;
    
    -- Verificar si requiere aprobación
    SELECT cr.max_difference_amount INTO v_max_difference
    FROM cash_register_sessions crs
    JOIN cash_registers cr ON crs.cash_register_id = cr.id
    WHERE crs.id = p_session_id;
    
    IF ABS(v_difference) > v_max_difference THEN
        SET v_requires_approval = TRUE;
    END IF;
    
    -- Actualizar sesión
    UPDATE cash_register_sessions 
    SET 
        closing_datetime = NOW(),
        theoretical_amount = v_theoretical_amount,
        physical_amount = p_physical_amount,
        difference_amount = v_difference,
        closing_notes = p_closing_notes,
        session_status = IF(v_requires_approval, 'PENDING_CLOSE', 'CLOSED'),
        requires_supervisor_approval = v_requires_approval,
        supervisor_user_id = p_supervisor_user_id,
        is_approved = IF(v_requires_approval, FALSE, TRUE),
        approved_datetime = IF(v_requires_approval, NULL, NOW())
    WHERE id = p_session_id;
    
    -- Registrar movimiento de cierre
    INSERT INTO cash_movements (
        cash_register_session_id,
        movement_type,
        payment_method_id,
        amount,
        description,
        created_by_user_id
    ) VALUES (
        p_session_id,
        'CLOSING',
        (SELECT id FROM payment_methods WHERE method_code = 'CASH'),
        v_difference,
        CONCAT('Cierre de caja - Diferencia: ', v_difference),
        p_supervisor_user_id
    );
    
END//
DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;