-- =====================================================
-- Schema pagos detallados de documentos
-- Archivo: 20260603_1336_schema_document_payments.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

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

SET FOREIGN_KEY_CHECKS = 1;
