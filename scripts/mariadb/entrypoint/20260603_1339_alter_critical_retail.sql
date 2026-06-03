-- =====================================================
-- Alter retail critico
-- Archivo: 20260603_1339_alter_critical_retail.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

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

SET FOREIGN_KEY_CHECKS = 1;
