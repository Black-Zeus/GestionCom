-- =====================================================
-- Schema devoluciones y cambios
-- Archivo: 20260603_1337_schema_returns.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

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

SET FOREIGN_KEY_CHECKS = 1;
