-- =====================================================
-- Alter documentos y usuarios para caja
-- Archivo: 20260603_1319_alter_cash.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

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

SET FOREIGN_KEY_CHECKS = 1;
