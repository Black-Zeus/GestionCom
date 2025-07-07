-- =====================================================
-- EXTENSIÓN: DOCUMENTOS TRIBUTARIOS ELECTRÓNICOS (DTE) - CHILE
-- Códigos oficiales según SII Chile
-- =====================================================

-- Agregar documentos DTE específicos de Chile
INSERT INTO document_types (document_type_code, document_type_name, document_category, requires_approval, generates_movement, movement_type) VALUES

-- DOCUMENTOS DE VENTA (Afectos y Exentos)
('DTE_33', 'Factura Electrónica', 'SALE', FALSE, TRUE, 'OUT'),
('DTE_34', 'Factura No Afecta o Exenta Electrónica', 'SALE', FALSE, TRUE, 'OUT'),
('DTE_39', 'Boleta Electrónica', 'SALE', FALSE, TRUE, 'OUT'),
('DTE_41', 'Boleta Exenta Electrónica', 'SALE', FALSE, TRUE, 'OUT'),

-- NOTAS DE CRÉDITO Y DÉBITO
('DTE_61', 'Nota de Crédito Electrónica', 'SALE', FALSE, TRUE, 'IN'),
('DTE_56', 'Nota de Débito Electrónica', 'SALE', FALSE, TRUE, 'OUT'),

-- GUÍAS DE DESPACHO
('DTE_52', 'Guía de Despacho Electrónica', 'TRANSFER', FALSE, TRUE, 'TRANSFER'),

-- DOCUMENTOS DE COMPRA
('DTE_46', 'Factura de Compra Electrónica', 'PURCHASE', FALSE, TRUE, 'IN'),

-- DOCUMENTOS ESPECIALES
('DTE_43', 'Liquidación Factura Electrónica', 'PURCHASE', TRUE, TRUE, 'IN'),
('DTE_110', 'Factura de Exportación Electrónica', 'SALE', TRUE, TRUE, 'OUT'),
('DTE_111', 'Nota de Débito de Exportación Electrónica', 'SALE', TRUE, TRUE, 'OUT'),
('DTE_112', 'Nota de Crédito de Exportación Electrónica', 'SALE', TRUE, TRUE, 'IN');

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

-- =====================================================
-- TABLA PARA CONFIGURACIÓN DTE POR EMPRESA
-- =====================================================

CREATE TABLE dte_company_config (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_rut VARCHAR(12) UNIQUE NOT NULL COMMENT 'RUT de la empresa',
    company_name VARCHAR(255) NOT NULL,
    company_business_name VARCHAR(255) NOT NULL COMMENT 'Razón social',
    company_address TEXT NOT NULL,
    company_comuna VARCHAR(100) NOT NULL,
    company_city VARCHAR(100) NOT NULL,
    company_region VARCHAR(100) NOT NULL,
    economic_activity_code VARCHAR(10) NOT NULL COMMENT 'Código actividad económica',
    economic_activity_name VARCHAR(255) NOT NULL,
    
    -- Configuración técnica DTE
    dte_environment ENUM('CERTIFICACION', 'PRODUCCION') DEFAULT 'CERTIFICACION',
    certificate_path VARCHAR(500) NULL COMMENT 'Ruta certificado digital',
    certificate_password VARCHAR(255) NULL COMMENT 'Password certificado (encriptado)',
    sii_user VARCHAR(100) NULL COMMENT 'Usuario SII',
    sii_password VARCHAR(255) NULL COMMENT 'Password SII (encriptado)',
    
    -- Configuración de folios
    current_folio_33 BIGINT UNSIGNED DEFAULT 1 COMMENT 'Folio actual Facturas',
    current_folio_39 BIGINT UNSIGNED DEFAULT 1 COMMENT 'Folio actual Boletas',
    current_folio_52 BIGINT UNSIGNED DEFAULT 1 COMMENT 'Folio actual Guías',
    current_folio_61 BIGINT UNSIGNED DEFAULT 1 COMMENT 'Folio actual Notas Crédito',
    
    -- Rangos de folios autorizados
    folio_range_33_from BIGINT UNSIGNED NULL,
    folio_range_33_to BIGINT UNSIGNED NULL,
    folio_range_39_from BIGINT UNSIGNED NULL,
    folio_range_39_to BIGINT UNSIGNED NULL,
    folio_range_52_from BIGINT UNSIGNED NULL,
    folio_range_52_to BIGINT UNSIGNED NULL,
    folio_range_61_from BIGINT UNSIGNED NULL,
    folio_range_61_to BIGINT UNSIGNED NULL,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_company_rut (company_rut),
    INDEX idx_dte_environment (dte_environment),
    INDEX idx_is_active (is_active)
);

-- =====================================================
-- TABLA PARA LOG DE TRANSACCIONES DTE
-- =====================================================

CREATE TABLE dte_transaction_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT UNSIGNED NOT NULL,
    dte_type_code VARCHAR(10) NOT NULL,
    dte_folio BIGINT UNSIGNED NOT NULL,
    transaction_type ENUM('SEND', 'QUERY', 'CANCEL', 'ACCEPT', 'REJECT') NOT NULL,
    request_xml TEXT NULL,
    response_xml TEXT NULL,
    response_code VARCHAR(10) NULL,
    response_message TEXT NULL,
    sii_track_id VARCHAR(100) NULL COMMENT 'Track ID del SII',
    processing_time_ms INT UNSIGNED NULL,
    is_success BOOLEAN DEFAULT FALSE,
    error_details TEXT NULL,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Índices
    INDEX idx_document_id (document_id),
    INDEX idx_dte_type_folio (dte_type_code, dte_folio),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_sii_track_id (sii_track_id),
    INDEX idx_created_at (created_at),
    INDEX idx_is_success (is_success)
);

-- =====================================================
-- VISTA PARA DOCUMENTOS DTE CON ESTADO
-- =====================================================

CREATE VIEW v_dte_documents AS
SELECT 
    d.id,
    d.document_number,
    d.document_date,
    dt.document_type_name,
    d.dte_type_code,
    d.dte_folio,
    d.dte_status,
    d.total_amount,
    d.rut_emisor,
    d.rut_receptor,
    d.customer_supplier_name,
    d.ambiente_dte,
    d.dte_sent_date,
    d.dte_accepted_date,
    CASE 
        WHEN d.dte_status = 'ACCEPTED' THEN 'Aceptado por SII'
        WHEN d.dte_status = 'SENT' THEN 'Enviado al SII'
        WHEN d.dte_status = 'REJECTED' THEN 'Rechazado por SII'
        WHEN d.dte_status = 'CANCELLED' THEN 'Anulado'
        ELSE 'Borrador'
    END as status_description,
    d.created_at,
    d.created_by_user_id
FROM documents d
JOIN document_types dt ON d.document_type_id = dt.id
WHERE d.dte_type_code IS NOT NULL
    AND d.deleted_at IS NULL
ORDER BY d.created_at DESC;

-- =====================================================
-- DATOS DE EJEMPLO PARA CONFIGURACIÓN
-- =====================================================

-- Ejemplo de configuración de empresa
INSERT INTO dte_company_config (
    company_rut, 
    company_name, 
    company_business_name,
    company_address,
    company_comuna,
    company_city,
    company_region,
    economic_activity_code,
    economic_activity_name,
    dte_environment
) VALUES (
    '12345678-9',
    'Mi Empresa SpA',
    'Mi Empresa Sociedad por Acciones',
    'Av. Libertador 1234',
    'Providencia',
    'Santiago',
    'Región Metropolitana',
    '4711',
    'Comercio al por menor en almacenes no especializados',
    'CERTIFICACION'
);

-- =====================================================
-- FUNCIONES ÚTILES PARA DTE
-- =====================================================

-- Función para obtener siguiente folio
DELIMITER //
CREATE FUNCTION get_next_dte_folio(company_rut_param VARCHAR(12), dte_type VARCHAR(10)) 
RETURNS BIGINT UNSIGNED
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE next_folio BIGINT UNSIGNED DEFAULT 1;
    
    CASE dte_type
        WHEN '33' THEN
            SELECT current_folio_33 + 1 INTO next_folio 
            FROM dte_company_config 
            WHERE company_rut = company_rut_param AND is_active = TRUE;
            
            UPDATE dte_company_config 
            SET current_folio_33 = next_folio 
            WHERE company_rut = company_rut_param;
            
        WHEN '39' THEN
            SELECT current_folio_39 + 1 INTO next_folio 
            FROM dte_company_config 
            WHERE company_rut = company_rut_param AND is_active = TRUE;
            
            UPDATE dte_company_config 
            SET current_folio_39 = next_folio 
            WHERE company_rut = company_rut_param;
            
        WHEN '52' THEN
            SELECT current_folio_52 + 1 INTO next_folio 
            FROM dte_company_config 
            WHERE company_rut = company_rut_param AND is_active = TRUE;
            
            UPDATE dte_company_config 
            SET current_folio_52 = next_folio 
            WHERE company_rut = company_rut_param;
            
        WHEN '61' THEN
            SELECT current_folio_61 + 1 INTO next_folio 
            FROM dte_company_config 
            WHERE company_rut = company_rut_param AND is_active = TRUE;
            
            UPDATE dte_company_config 
            SET current_folio_61 = next_folio 
            WHERE company_rut = company_rut_param;
    END CASE;
    
    RETURN next_folio;
END//
DELIMITER ;
