-- =====================================================
-- Alter documentos y pagos para cuentas por cobrar
-- Archivo: 20260603_1325_alter_accounts_receivable.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

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

SET FOREIGN_KEY_CHECKS = 1;
