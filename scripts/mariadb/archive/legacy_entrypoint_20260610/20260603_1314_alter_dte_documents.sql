-- =====================================================
-- Alter documentos para DTE
-- Archivo: 20260603_1314_alter_dte_documents.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- CAMPOS ADICIONALES PARA INTEGRACIÓN DTE
-- =====================================================

-- Agregar campos específicos para DTE (modificación de tabla)
ALTER TABLE documents ADD COLUMN dte_type_code VARCHAR(10) NULL COMMENT 'Código DTE según SII (33, 39, 52, etc.)';
ALTER TABLE documents ADD COLUMN dte_folio BIGINT UNSIGNED NULL COMMENT 'Folio DTE asignado por SII';
ALTER TABLE documents ADD COLUMN dte_uuid VARCHAR(100) NULL COMMENT 'UUID del DTE';
ALTER TABLE documents ADD COLUMN dte_xml_path VARCHAR(500) NULL COMMENT 'Ruta del XML DTE';
ALTER TABLE documents ADD COLUMN dte_pdf_path VARCHAR(500) NULL COMMENT 'Ruta del PDF DTE';
ALTER TABLE documents ADD COLUMN dte_status ENUM('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED') NULL COMMENT 'Estado en SII';
ALTER TABLE documents ADD COLUMN dte_response_xml TEXT NULL COMMENT 'Respuesta XML del SII';
ALTER TABLE documents ADD COLUMN dte_sent_date TIMESTAMP NULL COMMENT 'Fecha envío a SII';
ALTER TABLE documents ADD COLUMN dte_accepted_date TIMESTAMP NULL COMMENT 'Fecha aceptación SII';
ALTER TABLE documents ADD COLUMN rut_emisor VARCHAR(12) NULL COMMENT 'RUT del emisor';
ALTER TABLE documents ADD COLUMN rut_receptor VARCHAR(12) NULL COMMENT 'RUT del receptor';
ALTER TABLE documents ADD COLUMN ambiente_dte ENUM('CERTIFICACION', 'PRODUCCION') DEFAULT 'CERTIFICACION' COMMENT 'Ambiente SII';

-- Índices para DTE
ALTER TABLE documents ADD INDEX idx_dte_type_code (dte_type_code);
ALTER TABLE documents ADD INDEX idx_dte_folio (dte_folio);
ALTER TABLE documents ADD INDEX idx_dte_uuid (dte_uuid);
ALTER TABLE documents ADD INDEX idx_dte_status (dte_status);
ALTER TABLE documents ADD INDEX idx_rut_emisor (rut_emisor);
ALTER TABLE documents ADD INDEX idx_rut_receptor (rut_receptor);

SET FOREIGN_KEY_CHECKS = 1;
