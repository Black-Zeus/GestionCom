-- =====================================================
-- FUNCIONALIDADES CRÍTICAS PARA RETAIL
-- Archivo: 10_addCriticalFeatures.sql
-- Descripción: Pagos Fraccionados, Devoluciones Completas y Stock Crítico
-- Compatible con: Retail Moda, Ferretería, Almacén, Quiosco, Farmacia
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- SECCIÓN 1: PAGOS FRACCIONADOS
-- =====================================================

-- Detalle de métodos de pago por documento (múltiples métodos por venta)
CREATE TABLE document_payment_details (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT UNSIGNED NOT NULL,
    payment_method_id BIGINT UNSIGNED NOT NULL,
    
    -- Montos
    payment_amount DECIMAL(15,2) NOT NULL COMMENT 'Monto pagado con este método',
    received_amount DECIMAL(15,2) NULL COMMENT 'Monto recibido (para efectivo)',
    change_amount DECIMAL(15,2) DEFAULT 0 COMMENT 'Vuelto entregado',
    
    -- Detalles específicos del método
    reference_number VARCHAR(100) NULL COMMENT 'Número de autorización, cheque, etc.',
    card_last_digits VARCHAR(4) NULL COMMENT 'Últimos 4 dígitos de tarjeta',
    authorization_code VARCHAR(50) NULL COMMENT 'Código de autorización',
    transaction_id VARCHAR(100) NULL COMMENT 'ID de transacción externa',
    
    -- Para cheques
    check_number VARCHAR(50) NULL,
    check_date DATE NULL,
    bank_name VARCHAR(100) NULL,
    account_holder VARCHAR(255) NULL,
    
    -- Para transferencias
    bank_reference VARCHAR(100) NULL,
    transfer_date DATETIME NULL,
    
    -- Control
    payment_order TINYINT UNSIGNED DEFAULT 1 COMMENT 'Orden de aplicación del pago',
    payment_status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') DEFAULT 'APPROVED',
    
    -- Auditoría
    processed_by_user_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
    FOREIGN KEY (processed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Índices
    INDEX idx_document_id (document_id),
    INDEX idx_payment_method_id (payment_method_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_payment_order (payment_order),
    INDEX idx_processed_by_user_id (processed_by_user_id),
    INDEX idx_reference_number (reference_number),
    INDEX idx_transaction_id (transaction_id)
);

-- =====================================================
-- SECCIÓN 2: SISTEMA DE DEVOLUCIONES
-- =====================================================

-- Razones de devolución
CREATE TABLE return_reasons (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reason_code VARCHAR(20) UNIQUE NOT NULL,
    reason_name VARCHAR(100) NOT NULL,
    reason_description TEXT NULL,
    
    -- Configuración
    requires_approval BOOLEAN DEFAULT FALSE COMMENT 'Si requiere aprobación de supervisor',
    affects_stock BOOLEAN DEFAULT TRUE COMMENT 'Si devuelve stock al inventario',
    allows_exchange BOOLEAN DEFAULT TRUE COMMENT 'Si permite intercambio',
    allows_refund BOOLEAN DEFAULT TRUE COMMENT 'Si permite reembolso',
    max_days_after_sale INT UNSIGNED NULL COMMENT 'Días máximos después de la venta',
    
    -- Contabilidad
    default_account_code VARCHAR(20) NULL COMMENT 'Cuenta contable por defecto',
    
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Índices
    INDEX idx_reason_code (reason_code),
    INDEX idx_requires_approval (requires_approval),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Documentos de devolución (cabecera)
CREATE TABLE return_documents (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    return_number VARCHAR(50) UNIQUE NOT NULL,
    original_document_id BIGINT UNSIGNED NOT NULL COMMENT 'Documento original de venta',
    customer_id BIGINT UNSIGNED NULL,
    return_reason_id BIGINT UNSIGNED NOT NULL,
    
    -- Tipo de devolución
    return_type ENUM('REFUND', 'EXCHANGE', 'CREDIT_NOTE', 'STORE_CREDIT') NOT NULL,
    
    -- Montos
    total_return_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    refund_amount DECIMAL(15,2) DEFAULT 0 COMMENT 'Monto a reembolsar',
    exchange_amount DECIMAL(15,2) DEFAULT 0 COMMENT 'Valor de productos de intercambio',
    difference_amount DECIMAL(15,2) DEFAULT 0 COMMENT 'Diferencia a pagar/devolver',
    
    -- Fechas
    return_date DATE NOT NULL,
    original_sale_date DATE NOT NULL,
    days_since_sale INT UNSIGNED GENERATED ALWAYS AS (DATEDIFF(return_date, original_sale_date)) VIRTUAL,
    
    -- Estado y control
    return_status ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSED', 'CANCELLED') DEFAULT 'DRAFT',
    requires_supervisor_approval BOOLEAN DEFAULT FALSE,
    
    -- Personal involucrado
    processed_by_user_id BIGINT UNSIGNED NOT NULL,
    approved_by_user_id BIGINT UNSIGNED NULL,
    supervisor_comments TEXT NULL,
    
    -- Observaciones
    customer_comments TEXT NULL COMMENT 'Comentarios del cliente',
    internal_notes TEXT NULL COMMENT 'Notas internas',
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    
    -- Constraints
    FOREIGN KEY (original_document_id) REFERENCES documents(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (return_reason_id) REFERENCES return_reasons(id) ON DELETE RESTRICT,
    FOREIGN KEY (processed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Índices
    INDEX idx_return_number (return_number),
    INDEX idx_original_document_id (original_document_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_return_reason_id (return_reason_id),
    INDEX idx_return_type (return_type),
    INDEX idx_return_status (return_status),
    INDEX idx_return_date (return_date),
    INDEX idx_processed_by_user_id (processed_by_user_id),
    INDEX idx_requires_supervisor_approval (requires_supervisor_approval)
);

-- Detalle de productos devueltos
CREATE TABLE return_document_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    return_document_id BIGINT UNSIGNED NOT NULL,
    original_document_item_id BIGINT UNSIGNED NULL COMMENT 'Línea original de venta',
    product_variant_id BIGINT UNSIGNED NOT NULL,
    
    -- Cantidades
    original_quantity DECIMAL(15,4) NOT NULL COMMENT 'Cantidad original vendida',
    return_quantity DECIMAL(15,4) NOT NULL COMMENT 'Cantidad a devolver',
    
    -- Precios
    original_unit_price DECIMAL(15,2) NOT NULL,
    return_unit_price DECIMAL(15,2) NOT NULL COMMENT 'Precio para el cálculo de devolución',
    return_line_total DECIMAL(15,2) NOT NULL,
    
    -- Estado del producto devuelto
    product_condition ENUM('NEW', 'USED', 'DAMAGED', 'DEFECTIVE') DEFAULT 'USED',
    condition_notes TEXT NULL,
    
    -- Control de stock
    return_to_stock BOOLEAN DEFAULT TRUE COMMENT 'Si se devuelve al inventario',
    warehouse_id BIGINT UNSIGNED NULL COMMENT 'Bodega donde se devuelve',
    
    -- Para intercambios
    exchange_product_variant_id BIGINT UNSIGNED NULL COMMENT 'Producto de intercambio',
    exchange_quantity DECIMAL(15,4) NULL,
    exchange_unit_price DECIMAL(15,2) NULL,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (return_document_id) REFERENCES return_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (original_document_item_id) REFERENCES document_items(id) ON DELETE SET NULL,
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
    FOREIGN KEY (exchange_product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
    
    -- Índices
    INDEX idx_return_document_id (return_document_id),
    INDEX idx_original_document_item_id (original_document_item_id),
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_exchange_product_variant_id (exchange_product_variant_id),
    INDEX idx_product_condition (product_condition),
    INDEX idx_return_to_stock (return_to_stock)
);

-- Reembolsos procesados
CREATE TABLE return_refunds (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    return_document_id BIGINT UNSIGNED NOT NULL,
    payment_method_id BIGINT UNSIGNED NOT NULL,
    
    -- Montos
    refund_amount DECIMAL(15,2) NOT NULL,
    
    -- Detalles específicos del reembolso
    reference_number VARCHAR(100) NULL COMMENT 'Número de referencia del reembolso',
    transaction_id VARCHAR(100) NULL COMMENT 'ID de transacción de reversión',
    
    -- Estado
    refund_status ENUM('PENDING', 'PROCESSED', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
    
    -- Auditoría
    processed_by_user_id BIGINT UNSIGNED NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (return_document_id) REFERENCES return_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
    FOREIGN KEY (processed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Índices
    INDEX idx_return_document_id (return_document_id),
    INDEX idx_payment_method_id (payment_method_id),
    INDEX idx_refund_status (refund_status),
    INDEX idx_processed_by_user_id (processed_by_user_id)
);

-- =====================================================
-- SECCIÓN 3: GESTIÓN DE STOCK CRÍTICO
-- =====================================================

-- Configuración de stock crítico por producto y bodega
CREATE TABLE stock_critical_config (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    
    -- Niveles de stock
    minimum_stock DECIMAL(15,4) NOT NULL DEFAULT 0 COMMENT 'Stock mínimo (punto de reorden)',
    maximum_stock DECIMAL(15,4) NULL COMMENT 'Stock máximo recomendado',
    safety_stock DECIMAL(15,4) DEFAULT 0 COMMENT 'Stock de seguridad',
    reorder_point DECIMAL(15,4) GENERATED ALWAYS AS (minimum_stock + safety_stock) VIRTUAL,
    
    -- Configuración de reorden
    reorder_quantity DECIMAL(15,4) NULL COMMENT 'Cantidad sugerida para reorden',
    lead_time_days INT UNSIGNED DEFAULT 7 COMMENT 'Días de lead time del proveedor',
    
    -- Análisis de rotación
    avg_daily_sales DECIMAL(15,4) DEFAULT 0 COMMENT 'Promedio de ventas diarias',
    last_calculated_date DATE NULL COMMENT 'Última fecha de cálculo de promedios',
    
    -- Alertas
    alert_enabled BOOLEAN DEFAULT TRUE,
    last_alert_sent TIMESTAMP NULL,
    alert_frequency_hours INT UNSIGNED DEFAULT 24 COMMENT 'Frecuencia de alertas en horas',
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    UNIQUE KEY uk_product_warehouse_critical (product_variant_id, warehouse_id),
    
    -- Índices
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_minimum_stock (minimum_stock),
    INDEX idx_reorder_point (reorder_point),
    INDEX idx_alert_enabled (alert_enabled),
    INDEX idx_is_active (is_active)
);

-- Alertas de stock crítico
CREATE TABLE stock_alerts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    
    -- Tipo de alerta
    alert_type ENUM('LOW_STOCK', 'OUT_OF_STOCK', 'REORDER_POINT', 'EXCESS_STOCK', 'NO_MOVEMENT') NOT NULL,
    alert_level ENUM('INFO', 'WARNING', 'CRITICAL', 'URGENT') DEFAULT 'WARNING',
    
    -- Datos de la alerta
    current_stock DECIMAL(15,4) NOT NULL,
    minimum_stock DECIMAL(15,4) NULL,
    reorder_point DECIMAL(15,4) NULL,
    days_until_stockout DECIMAL(5,2) NULL COMMENT 'Días estimados hasta agotamiento',
    
    -- Mensaje y descripción
    alert_title VARCHAR(255) NOT NULL,
    alert_message TEXT NOT NULL,
    suggested_action TEXT NULL,
    
    -- Estado
    alert_status ENUM('NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED') DEFAULT 'NEW',
    
    -- Asignación
    assigned_to_user_id BIGINT UNSIGNED NULL,
    acknowledged_by_user_id BIGINT UNSIGNED NULL,
    acknowledged_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    resolution_notes TEXT NULL,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (acknowledged_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Índices
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_alert_type (alert_type),
    INDEX idx_alert_level (alert_level),
    INDEX idx_alert_status (alert_status),
    INDEX idx_assigned_to_user_id (assigned_to_user_id),
    INDEX idx_created_at (created_at)
);

-- Sugerencias de reorden
CREATE TABLE reorder_suggestions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    
    -- Análisis
    current_stock DECIMAL(15,4) NOT NULL,
    minimum_stock DECIMAL(15,4) NOT NULL,
    safety_stock DECIMAL(15,4) NOT NULL,
    suggested_order_quantity DECIMAL(15,4) NOT NULL,
    
    -- Cálculos
    avg_daily_consumption DECIMAL(15,4) NOT NULL,
    lead_time_days INT UNSIGNED NOT NULL,
    stockout_risk_percentage DECIMAL(5,2) NOT NULL COMMENT 'Porcentaje de riesgo de quiebre',
    
    -- Costos estimados
    estimated_unit_cost DECIMAL(15,2) NULL,
    estimated_total_cost DECIMAL(15,2) NULL,
    
    -- Prioridad y urgencia
    priority_score INT UNSIGNED NOT NULL DEFAULT 50 COMMENT 'Puntuación de prioridad (0-100)',
    urgency_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    
    -- Estado
    suggestion_status ENUM('PENDING', 'REVIEWED', 'ORDERED', 'REJECTED', 'EXPIRED') DEFAULT 'PENDING',
    
    -- Fechas
    valid_until DATE NOT NULL COMMENT 'Fecha de expiración de la sugerencia',
    
    -- Auditoría
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by_user_id BIGINT UNSIGNED NULL,
    reviewed_at TIMESTAMP NULL,
    review_notes TEXT NULL,
    
    -- Constraints
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Índices
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_priority_score (priority_score),
    INDEX idx_urgency_level (urgency_level),
    INDEX idx_suggestion_status (suggestion_status),
    INDEX idx_valid_until (valid_until),
    INDEX idx_generated_at (generated_at)
);

-- =====================================================
-- SECCIÓN 4: MODIFICACIONES A TABLAS EXISTENTES
-- =====================================================

-- Agregar campos de control crítico a la tabla stock
ALTER TABLE stock 
ADD COLUMN days_until_stockout DECIMAL(5,2) NULL COMMENT 'Días estimados hasta agotamiento',
ADD COLUMN last_movement_type ENUM('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT') NULL COMMENT 'Último tipo de movimiento',
ADD COLUMN rotation_category ENUM('FAST', 'MEDIUM', 'SLOW', 'NO_MOVEMENT') NULL COMMENT 'Categoría de rotación',
ADD COLUMN last_sale_date DATE NULL COMMENT 'Fecha de última venta',
ADD COLUMN avg_monthly_sales DECIMAL(15,4) DEFAULT 0 COMMENT 'Promedio mensual de ventas',
ADD INDEX idx_days_until_stockout (days_until_stockout),
ADD INDEX idx_rotation_category (rotation_category),
ADD INDEX idx_last_sale_date (last_sale_date);

-- Agregar campos de devolución a documents
ALTER TABLE documents 
ADD COLUMN is_return BOOLEAN DEFAULT FALSE COMMENT 'Si es documento de devolución',
ADD COLUMN original_document_id BIGINT UNSIGNED NULL COMMENT 'Documento original (para devoluciones)',
ADD COLUMN return_type ENUM('REFUND', 'EXCHANGE', 'CREDIT_NOTE') NULL COMMENT 'Tipo de devolución';

ALTER TABLE documents 
ADD INDEX idx_is_return (is_return);

ALTER TABLE documents
ADD INDEX idx_original_document_id (original_document_id);

ALTER TABLE documents
ADD FOREIGN KEY (original_document_id) REFERENCES documents(id) ON DELETE SET NULL;

CREATE VIEW v_critical_stock_products AS
SELECT 
    p.product_code,
    p.product_name,
    pv.variant_sku,
    pv.variant_name,
    w.warehouse_code,
    w.warehouse_name,
    s.current_quantity,
    s.available_quantity,
    scc.minimum_stock,
    scc.safety_stock,
    scc.reorder_point,
    scc.reorder_quantity,
    
    -- Cálculos de criticidad
    CASE 
        WHEN s.available_quantity = 0 THEN 'OUT_OF_STOCK'
        WHEN s.available_quantity <= scc.safety_stock THEN 'CRITICAL'
        WHEN s.available_quantity <= scc.minimum_stock THEN 'LOW'
        WHEN s.available_quantity <= scc.reorder_point THEN 'REORDER'
        ELSE 'OK'
    END AS stock_status,
    
    s.days_until_stockout,
    s.rotation_category,
    s.last_sale_date,
    s.avg_monthly_sales,
    
    -- Datos de configuración
    scc.lead_time_days,
    scc.alert_enabled,
    scc.last_alert_sent,
    
    -- Alertas activas
    COUNT(CASE WHEN sa.id IS NOT NULL THEN 1 END) AS active_alerts,  -- Cuenta solo alertas activas
    MAX(sa.alert_level) AS highest_alert_level

FROM products p
JOIN product_variants pv ON p.id = pv.product_id
JOIN stock s ON pv.id = s.product_variant_id
JOIN warehouses w ON s.warehouse_id = w.id
LEFT JOIN stock_critical_config scc ON pv.id = scc.product_variant_id AND w.id = scc.warehouse_id
LEFT JOIN stock_alerts sa ON pv.id = sa.product_variant_id AND w.id = sa.warehouse_id AND sa.alert_status IN ('NEW', 'ACKNOWLEDGED')

WHERE p.deleted_at IS NULL 
    AND pv.deleted_at IS NULL 
    AND w.deleted_at IS NULL
    AND (scc.is_active = TRUE OR scc.is_active IS NULL)

GROUP BY p.product_code, p.product_name, pv.variant_sku, pv.variant_name, w.warehouse_code, w.warehouse_name, 
         s.current_quantity, s.available_quantity, scc.minimum_stock, scc.safety_stock, scc.reorder_point, 
         scc.reorder_quantity, s.days_until_stockout, s.rotation_category, s.last_sale_date, s.avg_monthly_sales, 
         scc.lead_time_days, scc.alert_enabled, scc.last_alert_sent

HAVING stock_status IN ('OUT_OF_STOCK', 'CRITICAL', 'LOW', 'REORDER')

ORDER BY 
    CASE stock_status 
        WHEN 'OUT_OF_STOCK' THEN 1
        WHEN 'CRITICAL' THEN 2
        WHEN 'LOW' THEN 3
        WHEN 'REORDER' THEN 4
        ELSE 5
    END,
    CASE 
        WHEN s.days_until_stockout IS NULL THEN 9999999 
        ELSE s.days_until_stockout 
    END ASC;


-- Vista de devoluciones por período
CREATE VIEW v_returns_analysis AS
SELECT 
    DATE_FORMAT(rd.return_date, '%Y-%m') as return_period,
    rr.reason_name,
    rd.return_type,
    
    -- Cantidades
    COUNT(rd.id) as total_returns,
    SUM(rd.total_return_amount) as total_return_amount,
    AVG(rd.total_return_amount) as avg_return_amount,
    
    -- Por estado
    COUNT(CASE WHEN rd.return_status = 'APPROVED' THEN 1 END) as approved_returns,
    COUNT(CASE WHEN rd.return_status = 'CANCELLED' THEN 1 END) as cancelled_returns,
    
    -- Productos más devueltos
    COUNT(DISTINCT rdi.product_variant_id) as unique_products_returned,
    SUM(rdi.return_quantity) as total_quantity_returned,
    
    -- Tiempos
    AVG(rd.days_since_sale) as avg_days_since_sale,
    MAX(rd.days_since_sale) as max_days_since_sale,
    
    -- Por usuario
    COUNT(DISTINCT rd.processed_by_user_id) as processors_involved

FROM return_documents rd
JOIN return_reasons rr ON rd.return_reason_id = rr.id
LEFT JOIN return_document_items rdi ON rd.id = rdi.return_document_id

WHERE rd.return_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)

GROUP BY 
    DATE_FORMAT(rd.return_date, '%Y-%m'),
    rr.id,
    rd.return_type

ORDER BY return_period DESC, total_return_amount DESC;

-- Vista de pagos fraccionados por documento
CREATE VIEW v_document_payment_breakdown AS
SELECT 
    d.id as document_id,
    d.document_number,
    d.document_date,
    d.total_amount,
    
    -- Resumen de pagos
    COUNT(dpd.id) as payment_methods_count,
    SUM(dpd.payment_amount) as total_paid,
    SUM(dpd.change_amount) as total_change,
    
    -- Por método
    GROUP_CONCAT(
        CONCAT(pm.method_name, ': $', FORMAT(dpd.payment_amount, 2))
        ORDER BY dpd.payment_order 
        SEPARATOR ' | '
    ) as payment_breakdown,
    
    -- Validación
    CASE 
        WHEN ABS(d.total_amount - SUM(dpd.payment_amount)) < 0.01 THEN 'BALANCED'
        WHEN d.total_amount > SUM(dpd.payment_amount) THEN 'UNDERPAID'
        ELSE 'OVERPAID'
    END as payment_status,
    
    (d.total_amount - SUM(dpd.payment_amount)) as balance_difference

FROM documents d
JOIN document_payment_details dpd ON d.id = dpd.document_id
JOIN payment_methods pm ON dpd.payment_method_id = pm.id

WHERE d.deleted_at IS NULL
    AND pm.deleted_at IS NULL

GROUP BY d.id
ORDER BY d.document_date DESC;

-- =====================================================
-- SECCIÓN 6: FUNCIONES Y PROCEDIMIENTOS
-- =====================================================

-- Función para calcular días hasta agotamiento de stock
DELIMITER //

CREATE FUNCTION calculate_stockout_days(
    current_stock DECIMAL(15,4),
    avg_daily_sales DECIMAL(15,4)
) 
RETURNS DECIMAL(5,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE days_until_stockout DECIMAL(5,2);
    
    IF avg_daily_sales <= 0 OR current_stock <= 0 THEN
        RETURN NULL;
    END IF;
    
    SET days_until_stockout = current_stock / avg_daily_sales;
    
    RETURN ROUND(days_until_stockout, 2);
END//

DELIMITER ;


-- Procedimiento para procesar devolución completa
DELIMITER //

CREATE PROCEDURE process_return_document(
    IN p_return_document_id BIGINT UNSIGNED,
    IN p_approved_by_user_id BIGINT UNSIGNED
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_product_variant_id BIGINT UNSIGNED;
    DECLARE v_return_quantity DECIMAL(15,4);
    DECLARE v_warehouse_id BIGINT UNSIGNED;
    DECLARE v_return_to_stock BOOLEAN;
    DECLARE v_original_document_id BIGINT UNSIGNED;
    DECLARE v_return_type VARCHAR(50);
    DECLARE v_total_return_amount DECIMAL(15,2);
    
    -- Cursor para items de devolución
    DECLARE return_cursor CURSOR FOR
        SELECT 
            rdi.product_variant_id,
            rdi.return_quantity,
            rdi.warehouse_id,
            rdi.return_to_stock
        FROM return_document_items rdi
        WHERE rdi.return_document_id = p_return_document_id;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Obtener datos de la devolución
    SELECT original_document_id, return_type, total_return_amount
    INTO v_original_document_id, v_return_type, v_total_return_amount
    FROM return_documents 
    WHERE id = p_return_document_id;
    
    -- Actualizar estado de la devolución
    UPDATE return_documents 
    SET 
        return_status = 'PROCESSED',
        approved_by_user_id = p_approved_by_user_id,
        approved_at = NOW()
    WHERE id = p_return_document_id;
    
    -- Procesar cada item de devolución
    OPEN return_cursor;
    
    return_loop: LOOP
        FETCH return_cursor INTO v_product_variant_id, v_return_quantity, v_warehouse_id, v_return_to_stock;
        
        IF done THEN
            LEAVE return_loop;
        END IF;
        
        -- Si se devuelve al stock
        IF v_return_to_stock THEN
            -- Actualizar stock
            UPDATE stock 
            SET current_quantity = current_quantity + v_return_quantity,
                last_movement_date = NOW(),
                last_movement_type = 'IN'
            WHERE product_variant_id = v_product_variant_id 
                AND warehouse_id = v_warehouse_id;
            
            -- Crear movimiento de stock
            INSERT INTO stock_movements (
                product_variant_id,
                warehouse_id,
                movement_type,
                reference_type,
                reference_document_id,
                quantity,
                quantity_before,
                quantity_after,
                notes,
                created_by_user_id
            ) VALUES (
                v_product_variant_id,
                v_warehouse_id,
                'IN',
                'RETURN',
                p_return_document_id,
                v_return_quantity,
                (SELECT current_quantity FROM stock WHERE product_variant_id = v_product_variant_id AND warehouse_id = v_warehouse_id) - v_return_quantity,
                (SELECT current_quantity FROM stock WHERE product_variant_id = v_product_variant_id AND warehouse_id = v_warehouse_id),
                CONCAT('Devolución procesada - Documento: ', p_return_document_id),
                p_approved_by_user_id
            );
        END IF;
        
    END LOOP;
    
    CLOSE return_cursor;
    
    -- Si es reembolso, crear documento de nota de crédito automáticamente
    IF v_return_type IN ('REFUND', 'CREDIT_NOTE') THEN
        INSERT INTO documents (
            document_type_id,
            document_series_id,
            document_number,
            document_date,
            source_warehouse_id,
            total_amount,
            document_status,
            is_return,
            original_document_id,
            return_type,
            created_by_user_id,
            notes
        ) VALUES (
            (SELECT id FROM document_types WHERE document_type_code = 'CREDIT_NOTE'),
            (SELECT id FROM document_series WHERE document_type_id = (SELECT id FROM document_types WHERE document_type_code = 'CREDIT_NOTE') LIMIT 1),
            CONCAT('NC-', LPAD(p_return_document_id, 8, '0')),
            CURDATE(),
            v_warehouse_id,
            v_total_return_amount,
            'APPROVED',
            TRUE,
            v_original_document_id,
            v_return_type,
            p_approved_by_user_id,
            CONCAT('Nota de crédito por devolución ID: ', p_return_document_id)
        );
    END IF;
    
END//

DELIMITER ;


-- Procedimiento para validar pagos fraccionados
DELIMITER //

CREATE PROCEDURE validate_document_payments(
    IN p_document_id BIGINT UNSIGNED,
    OUT p_is_valid BOOLEAN,
    OUT p_total_paid DECIMAL(15,2),
    OUT p_difference DECIMAL(15,2),
    OUT p_validation_message VARCHAR(255)
)
BEGIN
    DECLARE v_document_total DECIMAL(15,2);
    DECLARE v_payments_total DECIMAL(15,2);
    
    -- Obtener total del documento
    SELECT total_amount INTO v_document_total
    FROM documents 
    WHERE id = p_document_id;
    
    -- Obtener total de pagos
    SELECT COALESCE(SUM(payment_amount), 0) INTO v_payments_total
    FROM document_payment_details
    WHERE document_id = p_document_id
        AND payment_status = 'APPROVED';
    
    -- Calcular diferencia
    SET p_total_paid = v_payments_total;
    SET p_difference = v_document_total - v_payments_total;
    
    -- Validar (tolerancia de 1 centavo)
    IF ABS(p_difference) <= 0.01 THEN
        SET p_is_valid = TRUE;
        SET p_validation_message = 'Pagos balanceados correctamente';
    ELSEIF p_difference > 0.01 THEN
        SET p_is_valid = FALSE;
        SET p_validation_message = CONCAT('Falta pagar: ', FORMAT(p_difference, 2));
    ELSE
        SET p_is_valid = FALSE;
        SET p_validation_message = CONCAT('Exceso de pago: ', FORMAT(ABS(p_difference), 2));
    END IF;
    
END//

DELIMITER ;


-- Procedimiento para generar alertas de stock crítico
DELIMITER //

CREATE PROCEDURE generate_stock_alerts()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_product_variant_id BIGINT UNSIGNED;
    DECLARE v_warehouse_id BIGINT UNSIGNED;
    DECLARE v_current_stock DECIMAL(15,4);
    DECLARE v_minimum_stock DECIMAL(15,4);
    DECLARE v_reorder_point DECIMAL(15,4);
    DECLARE v_avg_daily_sales DECIMAL(15,4);
    DECLARE v_days_until_stockout DECIMAL(5,2);
    DECLARE v_alert_type VARCHAR(20);
    DECLARE v_alert_level VARCHAR(20);
    DECLARE v_alert_title VARCHAR(255);
    DECLARE v_alert_message TEXT;
    
    -- Cursor para productos con configuración crítica
    DECLARE stock_cursor CURSOR FOR
        SELECT 
            s.product_variant_id,
            s.warehouse_id,
            s.current_quantity,
            scc.minimum_stock,
            scc.reorder_point,
            scc.avg_daily_sales,
            calculate_stockout_days(s.current_quantity, scc.avg_daily_sales) as days_until_stockout
        FROM stock s
        JOIN stock_critical_config scc ON s.product_variant_id = scc.product_variant_id 
            AND s.warehouse_id = scc.warehouse_id
        WHERE scc.is_active = TRUE
            AND scc.alert_enabled = TRUE
            AND (scc.last_alert_sent IS NULL 
                OR scc.last_alert_sent < DATE_SUB(NOW(), INTERVAL scc.alert_frequency_hours HOUR));
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN stock_cursor;
    
    alert_loop: LOOP
        FETCH stock_cursor INTO v_product_variant_id, v_warehouse_id, v_current_stock, 
                                v_minimum_stock, v_reorder_point, v_avg_daily_sales, v_days_until_stockout;
        
        IF done THEN
            LEAVE alert_loop;
        END IF;
        
        -- Determinar tipo y nivel de alerta
        IF v_current_stock = 0 THEN
            SET v_alert_type = 'OUT_OF_STOCK';
            SET v_alert_level = 'CRITICAL';
            SET v_alert_title = 'Producto Agotado';
            SET v_alert_message = 'El producto está completamente agotado en esta bodega';
        ELSEIF v_current_stock <= (v_minimum_stock * 0.5) THEN
            SET v_alert_type = 'LOW_STOCK';
            SET v_alert_level = 'URGENT';
            SET v_alert_title = 'Stock Crítico';
            SET v_alert_message = CONCAT('Stock muy bajo: ', v_current_stock, ' unidades restantes');
        ELSEIF v_current_stock <= v_minimum_stock THEN
            SET v_alert_type = 'LOW_STOCK';
            SET v_alert_level = 'WARNING';
            SET v_alert_title = 'Stock Bajo';
            SET v_alert_message = CONCAT('Stock por debajo del mínimo: ', v_current_stock, '/', v_minimum_stock);
        ELSEIF v_current_stock <= v_reorder_point THEN
            SET v_alert_type = 'REORDER_POINT';
            SET v_alert_level = 'INFO';
            SET v_alert_title = 'Punto de Reorden Alcanzado';
            SET v_alert_message = CONCAT('Se recomienda realizar pedido. Stock actual: ', v_current_stock);
        END IF;
        
        -- Solo crear alerta si hay problema
        IF v_current_stock <= v_reorder_point THEN
            -- Verificar si ya existe alerta activa similar
            IF NOT EXISTS (
                SELECT 1 FROM stock_alerts 
                WHERE product_variant_id = v_product_variant_id 
                    AND warehouse_id = v_warehouse_id
                    AND alert_type = v_alert_type
                    AND alert_status IN ('NEW', 'ACKNOWLEDGED')
                    AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
            ) THEN
                -- Crear nueva alerta
                INSERT INTO stock_alerts (
                    product_variant_id,
                    warehouse_id,
                    alert_type,
                    alert_level,
                    current_stock,
                    minimum_stock,
                    reorder_point,
                    days_until_stockout,
                    alert_title,
                    alert_message,
                    suggested_action
                ) VALUES (
                    v_product_variant_id,
                    v_warehouse_id,
                    v_alert_type,
                    v_alert_level,
                    v_current_stock,
                    v_minimum_stock,
                    v_reorder_point,
                    v_days_until_stockout,
                    v_alert_title,
                    v_alert_message,
                    CASE 
                        WHEN v_alert_type = 'OUT_OF_STOCK' THEN 'Realizar pedido urgente al proveedor'
                        WHEN v_alert_type = 'LOW_STOCK' THEN 'Considerar pedido inmediato'
                        ELSE 'Programar pedido según lead time'
                    END
                );
                
                -- Actualizar fecha de última alerta
                UPDATE stock_critical_config 
                SET last_alert_sent = NOW()
                WHERE product_variant_id = v_product_variant_id 
                    AND warehouse_id = v_warehouse_id;
            END IF;
        END IF;
        
    END LOOP;
    
    CLOSE stock_cursor;
    
END//

DELIMITER ;


-- Procedimiento para calcular sugerencias de reorden
DELIMITER //

CREATE PROCEDURE generate_reorder_suggestions()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_product_variant_id BIGINT UNSIGNED;
    DECLARE v_warehouse_id BIGINT UNSIGNED;
    DECLARE v_current_stock DECIMAL(15,4);
    DECLARE v_minimum_stock DECIMAL(15,4);
    DECLARE v_safety_stock DECIMAL(15,4);
    DECLARE v_reorder_quantity DECIMAL(15,4);
    DECLARE v_avg_daily_consumption DECIMAL(15,4);
    DECLARE v_lead_time_days INT UNSIGNED;
    DECLARE v_stockout_risk DECIMAL(5,2);
    DECLARE v_priority_score INT UNSIGNED;
    DECLARE v_urgency_level VARCHAR(20);
    
    -- Cursor para productos que necesitan reorden
    DECLARE reorder_cursor CURSOR FOR
        SELECT 
            s.product_variant_id,
            s.warehouse_id,
            s.current_quantity,
            scc.minimum_stock,
            scc.safety_stock,
            scc.reorder_quantity,
            scc.avg_daily_sales,
            scc.lead_time_days
        FROM stock s
        JOIN stock_critical_config scc ON s.product_variant_id = scc.product_variant_id 
            AND s.warehouse_id = scc.warehouse_id
        WHERE scc.is_active = TRUE
            AND s.current_quantity <= scc.reorder_point
            AND NOT EXISTS (
                SELECT 1 FROM reorder_suggestions rs
                WHERE rs.product_variant_id = s.product_variant_id
                    AND rs.warehouse_id = s.warehouse_id
                    AND rs.suggestion_status = 'PENDING'
                    AND rs.valid_until > CURDATE()
            );
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Limpiar sugerencias expiradas
    DELETE FROM reorder_suggestions 
    WHERE valid_until < CURDATE() 
        AND suggestion_status = 'PENDING';
    
    OPEN reorder_cursor;
    
    suggestion_loop: LOOP
        FETCH reorder_cursor INTO v_product_variant_id, v_warehouse_id, v_current_stock,
                                  v_minimum_stock, v_safety_stock, v_reorder_quantity,
                                  v_avg_daily_consumption, v_lead_time_days;
        
        IF done THEN
            LEAVE suggestion_loop;
        END IF;
        
        -- Calcular cantidad sugerida si no está configurada
        IF v_reorder_quantity IS NULL OR v_reorder_quantity <= 0 THEN
            SET v_reorder_quantity = (v_avg_daily_consumption * v_lead_time_days) + v_safety_stock - v_current_stock;
            SET v_reorder_quantity = GREATEST(v_reorder_quantity, v_minimum_stock);
        END IF;
        
        -- Calcular riesgo de quiebre de stock
        IF v_avg_daily_consumption > 0 THEN
            SET v_stockout_risk = GREATEST(0, 100 - ((v_current_stock / (v_avg_daily_consumption * v_lead_time_days)) * 100));
        ELSE
            SET v_stockout_risk = 0;
        END IF;
        
        -- Calcular prioridad (0-100)
        SET v_priority_score = CASE 
            WHEN v_current_stock = 0 THEN 100
            WHEN v_current_stock <= (v_minimum_stock * 0.25) THEN 90
            WHEN v_current_stock <= (v_minimum_stock * 0.5) THEN 80
            WHEN v_current_stock <= v_minimum_stock THEN 70
            ELSE GREATEST(50, ROUND(v_stockout_risk))
        END;
        
        -- Determinar urgencia
        SET v_urgency_level = CASE 
            WHEN v_priority_score >= 90 THEN 'CRITICAL'
            WHEN v_priority_score >= 80 THEN 'HIGH'
            WHEN v_priority_score >= 70 THEN 'MEDIUM'
            ELSE 'LOW'
        END;
        
        -- Crear sugerencia de reorden
        INSERT INTO reorder_suggestions (
            product_variant_id,
            warehouse_id,
            current_stock,
            minimum_stock,
            safety_stock,
            suggested_order_quantity,
            avg_daily_consumption,
            lead_time_days,
            stockout_risk_percentage,
            priority_score,
            urgency_level,
            valid_until
        ) VALUES (
            v_product_variant_id,
            v_warehouse_id,
            v_current_stock,
            v_minimum_stock,
            v_safety_stock,
            v_reorder_quantity,
            v_avg_daily_consumption,
            v_lead_time_days,
            v_stockout_risk,
            v_priority_score,
            v_urgency_level,
            DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        );
        
    END LOOP;
    
    CLOSE reorder_cursor;
    
END//

DELIMITER ;

-- Procedimiento para actualizar estadísticas de rotación
DELIMITER //

CREATE PROCEDURE update_stock_rotation_stats(
    IN p_days_to_analyze INT
)
BEGIN
    -- TODAS las declaraciones de variables PRIMERO
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_product_variant_id BIGINT;
    DECLARE v_warehouse_id BIGINT;
    DECLARE v_total_sales DECIMAL(15,4);
    DECLARE v_avg_daily_sales DECIMAL(15,4);
    DECLARE v_avg_monthly_sales DECIMAL(15,4);
    DECLARE v_last_sale_date DATE;
    DECLARE v_rotation_category VARCHAR(20);
    DECLARE v_days_since_last_sale INT;
    DECLARE v_current_quantity DECIMAL(15,4);
    DECLARE v_days_until_stockout INT;
    
    -- LUEGO todas las declaraciones de CURSOR
    DECLARE rotation_cursor CURSOR FOR
        SELECT DISTINCT s.product_variant_id, s.warehouse_id, s.current_quantity
        FROM stock s
        WHERE s.current_quantity >= 0;
    
    -- FINALMENTE todos los HANDLERS
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Establecer valor predeterminado si p_days_to_analyze es NULL o menor a 1
    IF p_days_to_analyze IS NULL OR p_days_to_analyze < 1 THEN
        SET p_days_to_analyze = 90; -- Valor predeterminado
    END IF;

    -- Abrir el cursor
    OPEN rotation_cursor;
    
    rotation_loop: LOOP
        FETCH rotation_cursor INTO v_product_variant_id, v_warehouse_id, v_current_quantity;
        
        IF done THEN
            LEAVE rotation_loop;
        END IF;
        
        -- Calcular ventas en el período
        SELECT 
            COALESCE(SUM(ABS(sm.quantity)), 0),
            COALESCE(SUM(ABS(sm.quantity)) / p_days_to_analyze, 0),
            COALESCE(SUM(ABS(sm.quantity)) / (p_days_to_analyze / 30.0), 0),
            MAX(DATE(sm.created_at))
        INTO v_total_sales, v_avg_daily_sales, v_avg_monthly_sales, v_last_sale_date
        FROM stock_movements sm
        WHERE sm.product_variant_id = v_product_variant_id
            AND sm.warehouse_id = v_warehouse_id
            AND sm.movement_type = 'OUT'
            AND sm.reference_type IN ('SALE', 'TRANSFER')
            AND sm.created_at >= DATE_SUB(CURDATE(), INTERVAL p_days_to_analyze DAY);
        
        -- Calcular días desde última venta
        IF v_last_sale_date IS NOT NULL THEN
            SET v_days_since_last_sale = DATEDIFF(CURDATE(), v_last_sale_date);
        ELSE
            SET v_days_since_last_sale = NULL;
        END IF;
        
        -- Categorizar rotación
        IF v_last_sale_date IS NULL OR v_days_since_last_sale > 180 THEN
            SET v_rotation_category = 'NO_MOVEMENT';
        ELSEIF v_avg_daily_sales >= 1 THEN
            SET v_rotation_category = 'FAST';
        ELSEIF v_avg_daily_sales >= 0.1 THEN
            SET v_rotation_category = 'MEDIUM';
        ELSEIF v_avg_daily_sales > 0 THEN
            SET v_rotation_category = 'SLOW';
        ELSE
            SET v_rotation_category = 'NO_MOVEMENT';
        END IF;
        
        -- Calcular días hasta agotamiento
        IF v_avg_daily_sales > 0 AND v_current_quantity > 0 THEN
            SET v_days_until_stockout = CEIL(v_current_quantity / v_avg_daily_sales);
            -- Limitar a un máximo razonable
            IF v_days_until_stockout > 9999 THEN
                SET v_days_until_stockout = 9999;
            END IF;
        ELSE
            SET v_days_until_stockout = NULL;
        END IF;
        
        -- Actualizar estadísticas en la tabla stock
        UPDATE stock 
        SET 
            avg_monthly_sales = v_avg_monthly_sales,
            last_sale_date = v_last_sale_date,
            rotation_category = v_rotation_category,
            days_until_stockout = v_days_until_stockout
        WHERE product_variant_id = v_product_variant_id 
            AND warehouse_id = v_warehouse_id;
        
        -- Verificar si existe registro en stock_critical_config antes de actualizar
        IF EXISTS (
            SELECT 1 FROM stock_critical_config 
            WHERE product_variant_id = v_product_variant_id 
                AND warehouse_id = v_warehouse_id
        ) THEN
            -- Actualizar configuración crítica existente
            UPDATE stock_critical_config
            SET 
                avg_daily_sales = v_avg_daily_sales,
                last_calculated_date = CURDATE()
            WHERE product_variant_id = v_product_variant_id 
                AND warehouse_id = v_warehouse_id;
        END IF;
        
    END LOOP;
    
    CLOSE rotation_cursor;
    
END//

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- SECCIÓN 7: DATOS INICIALES
-- =====================================================

-- Insertar razones de devolución estándar
INSERT INTO return_reasons (reason_code, reason_name, reason_description, requires_approval, affects_stock, allows_exchange, allows_refund, max_days_after_sale) VALUES
('DEFECTIVE', 'Producto Defectuoso', 'El producto presenta fallas de fabricación', FALSE, TRUE, TRUE, TRUE, 30),
('WRONG_SIZE', 'Talla Incorrecta', 'Cliente eligió talla equivocada', FALSE, TRUE, TRUE, TRUE, 15),
('WRONG_COLOR', 'Color Incorrecto', 'Cliente eligió color equivocado', FALSE, TRUE, TRUE, TRUE, 15),
('NOT_AS_DESCRIBED', 'No Coincide con Descripción', 'El producto no coincide con la descripción', FALSE, TRUE, TRUE, TRUE, 7),
('CHANGED_MIND', 'Cambió de Opinión', 'Cliente ya no desea el producto', FALSE, TRUE, TRUE, TRUE, 7),
('WRONG_ITEM', 'Producto Incorrecto', 'Se entregó producto equivocado', FALSE, TRUE, TRUE, TRUE, 30),
('DAMAGED_SHIPPING', 'Dañado en Envío', 'Producto dañado durante el transporte', FALSE, TRUE, TRUE, TRUE, 5),
('EXPIRED', 'Producto Vencido', 'Producto con fecha de vencimiento pasada', TRUE, FALSE, FALSE, TRUE, NULL),
('WARRANTY', 'Garantía', 'Reclamo de garantía del fabricante', TRUE, FALSE, TRUE, FALSE, 365),
('DUPLICATE_ORDER', 'Pedido Duplicado', 'Cliente realizó pedido por error', FALSE, TRUE, FALSE, TRUE, 1);

-- Insertar configuraciones críticas para productos demo (si existen)
INSERT IGNORE INTO stock_critical_config (product_variant_id, warehouse_id, minimum_stock, safety_stock, reorder_quantity, lead_time_days, alert_enabled)
SELECT 
   pv.id,
   w.id,
   CASE 
       WHEN w.warehouse_type = 'STORE' THEN 5     -- Tiendas: stock mínimo menor
       WHEN w.warehouse_type = 'WAREHOUSE' THEN 20 -- Bodegas: stock mínimo mayor
       ELSE 10
   END as minimum_stock,
   CASE 
       WHEN w.warehouse_type = 'STORE' THEN 2     -- Stock de seguridad menor en tiendas
       WHEN w.warehouse_type = 'WAREHOUSE' THEN 10 -- Stock de seguridad mayor en bodegas
       ELSE 5
   END as safety_stock,
   CASE 
       WHEN w.warehouse_type = 'STORE' THEN 25    -- Reorden menor en tiendas
       WHEN w.warehouse_type = 'WAREHOUSE' THEN 100 -- Reorden mayor en bodegas
       ELSE 50
   END as reorder_quantity,
   CASE 
       WHEN w.warehouse_type = 'STORE' THEN 3     -- Lead time menor para tiendas
       WHEN w.warehouse_type = 'WAREHOUSE' THEN 7  -- Lead time normal para bodegas
       ELSE 5
   END as lead_time_days,
   TRUE as alert_enabled
FROM product_variants pv
CROSS JOIN warehouses w
WHERE pv.deleted_at IS NULL 
   AND w.deleted_at IS NULL
LIMIT 50; -- Limitamos para no sobrecargar en demo

-- Insertar permisos para las nuevas funcionalidades
INSERT INTO permissions (permission_code, permission_name, permission_group) VALUES
('RETURNS_VIEW', 'Ver Devoluciones', 'RETURNS'),
('RETURNS_CREATE', 'Crear Devoluciones', 'RETURNS'),
('RETURNS_APPROVE', 'Aprobar Devoluciones', 'RETURNS'),
('RETURNS_PROCESS', 'Procesar Devoluciones', 'RETURNS'),
('STOCK_ALERTS_VIEW', 'Ver Alertas de Stock', 'INVENTORY'),
('STOCK_ALERTS_MANAGE', 'Gestionar Alertas de Stock', 'INVENTORY'),
('REORDER_SUGGESTIONS_VIEW', 'Ver Sugerencias de Reorden', 'INVENTORY'),
('REORDER_SUGGESTIONS_APPROVE', 'Aprobar Sugerencias de Reorden', 'INVENTORY'),
('PAYMENT_METHODS_FRACTIONAL', 'Usar Pagos Fraccionados', 'PAYMENTS'),
('CRITICAL_STOCK_CONFIG', 'Configurar Stock Crítico', 'INVENTORY');

-- Agregar elementos del menú para las nuevas funcionalidades
INSERT INTO menu_items (parent_id, menu_code, menu_name, menu_description, icon_name, menu_url, menu_type, required_permission_id, sort_order, menu_level, menu_path) VALUES
-- Devoluciones en Punto de Venta
((SELECT id FROM menu_items WHERE menu_code = 'sales'), 'sales_returns_manage', 'Gestionar Devoluciones', 'Procesar devoluciones y cambios completos', 'refund-2-line', '/sales/returns-manage', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'RETURNS_CREATE'), 75, 2, '/sales/returns-manage'),

-- Alertas de Stock en Inventario
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'inventory_alerts', 'Alertas de Stock', 'Ver alertas de stock crítico y sugerencias', 'alarm-warning-line', '/inventory/alerts', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'STOCK_ALERTS_VIEW'), 70, 2, '/inventory/alerts'),
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'inventory_reorder', 'Sugerencias de Reorden', 'Sugerencias automáticas de reabastecimiento', 'shopping-cart-2-line', '/inventory/reorder-suggestions', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'REORDER_SUGGESTIONS_VIEW'), 80, 2, '/inventory/reorder-suggestions'),

-- Configuración en Administración
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'admin_stock_critical', 'Configurar Stock Crítico', 'Configuración de alertas y puntos de reorden', 'settings-4-line', '/administration/critical-stock-config', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CRITICAL_STOCK_CONFIG'), 110, 2, '/administration/critical-stock-config');

-- Asignar permisos de devoluciones a roles existentes
INSERT INTO role_permissions (role_id, permission_id) VALUES
-- ADMIN: todos los permisos de devoluciones
((SELECT id FROM roles WHERE role_code = 'ADMIN'), (SELECT id FROM permissions WHERE permission_code = 'RETURNS_VIEW')),
((SELECT id FROM roles WHERE role_code = 'ADMIN'), (SELECT id FROM permissions WHERE permission_code = 'RETURNS_CREATE')),
((SELECT id FROM roles WHERE role_code = 'ADMIN'), (SELECT id FROM permissions WHERE permission_code = 'RETURNS_APPROVE')),
((SELECT id FROM roles WHERE role_code = 'ADMIN'), (SELECT id FROM permissions WHERE permission_code = 'RETURNS_PROCESS')),

-- WAREHOUSE_MANAGER: gestión completa de stock crítico
((SELECT id FROM roles WHERE role_code = 'WAREHOUSE_MANAGER'), (SELECT id FROM permissions WHERE permission_code = 'STOCK_ALERTS_VIEW')),
((SELECT id FROM roles WHERE role_code = 'WAREHOUSE_MANAGER'), (SELECT id FROM permissions WHERE permission_code = 'STOCK_ALERTS_MANAGE')),
((SELECT id FROM roles WHERE role_code = 'WAREHOUSE_MANAGER'), (SELECT id FROM permissions WHERE permission_code = 'REORDER_SUGGESTIONS_VIEW')),
((SELECT id FROM roles WHERE role_code = 'WAREHOUSE_MANAGER'), (SELECT id FROM permissions WHERE permission_code = 'REORDER_SUGGESTIONS_APPROVE')),
((SELECT id FROM roles WHERE role_code = 'WAREHOUSE_MANAGER'), (SELECT id FROM permissions WHERE permission_code = 'CRITICAL_STOCK_CONFIG')),

-- SALES_PERSON: crear y ver devoluciones, pagos fraccionados
((SELECT id FROM roles WHERE role_code = 'SALES_PERSON'), (SELECT id FROM permissions WHERE permission_code = 'RETURNS_VIEW')),
((SELECT id FROM roles WHERE role_code = 'SALES_PERSON'), (SELECT id FROM permissions WHERE permission_code = 'RETURNS_CREATE')),
((SELECT id FROM roles WHERE role_code = 'SALES_PERSON'), (SELECT id FROM permissions WHERE permission_code = 'PAYMENT_METHODS_FRACTIONAL')),

-- ACCOUNTANT: aprobar devoluciones costosas
((SELECT id FROM roles WHERE role_code = 'ACCOUNTANT'), (SELECT id FROM permissions WHERE permission_code = 'RETURNS_VIEW')),
((SELECT id FROM roles WHERE role_code = 'ACCOUNTANT'), (SELECT id FROM permissions WHERE permission_code = 'RETURNS_APPROVE'));

-- Configurar características del sistema para nuevas funcionalidades
INSERT INTO system_features (feature_code, feature_name, feature_description, feature_type, default_value, current_value) VALUES
('RETURNS_ENABLED', 'Devoluciones Habilitadas', 'Permite procesar devoluciones de productos', 'BOOLEAN', 'true', 'true'),
('RETURNS_REQUIRE_APPROVAL', 'Devoluciones Requieren Aprobación', 'Si las devoluciones requieren aprobación supervisor', 'BOOLEAN', 'false', 'false'),
('RETURNS_MAX_DAYS_DEFAULT', 'Días Máximos Devolución por Defecto', 'Días máximos para devoluciones sin razón específica', 'INTEGER', '15', '15'),
('FRACTIONAL_PAYMENTS_ENABLED', 'Pagos Fraccionados Habilitados', 'Permite usar múltiples métodos de pago por venta', 'BOOLEAN', 'true', 'true'),
('FRACTIONAL_PAYMENTS_MAX_METHODS', 'Máximo Métodos por Venta', 'Número máximo de métodos de pago por documento', 'INTEGER', '5', '5'),
('STOCK_ALERTS_ENABLED', 'Alertas de Stock Habilitadas', 'Generar alertas automáticas de stock crítico', 'BOOLEAN', 'true', 'true'),
('STOCK_ALERTS_FREQUENCY_HOURS', 'Frecuencia Alertas Stock (Horas)', 'Frecuencia en horas para generar alertas', 'INTEGER', '24', '24'),
('REORDER_SUGGESTIONS_ENABLED', 'Sugerencias Reorden Habilitadas', 'Generar sugerencias automáticas de reorden', 'BOOLEAN', 'true', 'true'),
('REORDER_SUGGESTIONS_DAYS_ANALYSIS', 'Días Análisis Sugerencias', 'Días de histórico para calcular sugerencias', 'INTEGER', '90', '90');

-- Datos demo para testing de alertas (simular algunos productos con stock bajo)
UPDATE stock 
SET current_quantity = 2, 
   last_sale_date = DATE_SUB(CURDATE(), INTERVAL 3 DAY),
   avg_monthly_sales = 15,
   rotation_category = 'FAST'
WHERE id IN (
   SELECT s.id FROM (
       SELECT id FROM stock ORDER BY RAND() LIMIT 3
   ) s
);

UPDATE stock 
SET current_quantity = 0,
   last_sale_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY),
   avg_monthly_sales = 8,
   rotation_category = 'MEDIUM'
WHERE id IN (
   SELECT s.id FROM (
       SELECT id FROM stock ORDER BY RAND() LIMIT 1
   ) s
);