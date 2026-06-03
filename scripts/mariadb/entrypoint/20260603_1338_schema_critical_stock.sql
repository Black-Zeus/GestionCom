-- =====================================================
-- Schema stock critico y reorden
-- Archivo: 20260603_1338_schema_critical_stock.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

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

SET FOREIGN_KEY_CHECKS = 1;
