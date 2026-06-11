-- =====================================================
-- Schema configuracion del sistema
-- Archivo: 20260603_1302_schema_system.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- MÓDULO: CONFIGURACIÓN DEL SISTEMA
-- =====================================================

-- Características globales activables
CREATE TABLE system_features (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    feature_code VARCHAR(100) UNIQUE NOT NULL,
    feature_name VARCHAR(150) NOT NULL,
    feature_description TEXT NULL,
    feature_type ENUM('BOOLEAN', 'STRING', 'INTEGER', 'JSON') DEFAULT 'BOOLEAN',
    default_value TEXT NULL,
    current_value TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by_user_id BIGINT UNSIGNED NULL,

    -- Constraints
    FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,

    -- Índices
    INDEX idx_feature_code (feature_code),
    INDEX idx_is_active (is_active)
);

SET FOREIGN_KEY_CHECKS = 1;
