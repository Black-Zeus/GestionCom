-- =====================================================
-- Schema DTE
-- Archivo: 20260603_1313_schema_dte.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

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

SET FOREIGN_KEY_CHECKS = 1;
