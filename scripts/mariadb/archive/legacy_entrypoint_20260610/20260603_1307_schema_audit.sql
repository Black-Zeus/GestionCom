-- =====================================================
-- Schema auditoria
-- Archivo: 20260603_1307_schema_audit.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- MÓDULO: AUDITORÍA
-- =====================================================

-- Log de cambios de permisos
CREATE TABLE permission_audit_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    target_user_id BIGINT UNSIGNED NOT NULL COMMENT 'Usuario al que se le modificaron permisos',
    action_type ENUM('ROLE_ASSIGNED', 'ROLE_REMOVED', 'PERMISSION_GRANTED', 'PERMISSION_REVOKED', 'WAREHOUSE_ACCESS_CHANGED') NOT NULL,
    role_id BIGINT UNSIGNED NULL,
    permission_id BIGINT UNSIGNED NULL,
    warehouse_id BIGINT UNSIGNED NULL,
    old_value TEXT NULL COMMENT 'Valor anterior',
    new_value TEXT NULL COMMENT 'Nuevo valor',
    performed_by_user_id BIGINT UNSIGNED NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE SET NULL,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
    FOREIGN KEY (performed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,

    -- Índices
    INDEX idx_target_user_id (target_user_id),
    INDEX idx_action_type (action_type),
    INDEX idx_performed_by_user_id (performed_by_user_id),
    INDEX idx_created_at (created_at)
);

-- Log general de cambios en tablas críticas
CREATE TABLE audit_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id BIGINT UNSIGNED NOT NULL,
    action_type ENUM('INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE') NOT NULL,
    old_values JSON NULL COMMENT 'Valores anteriores en formato JSON',
    new_values JSON NULL COMMENT 'Nuevos valores en formato JSON',
    changed_fields TEXT NULL COMMENT 'Lista de campos modificados',
    user_id BIGINT UNSIGNED NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,

    -- Índices
    INDEX idx_table_name (table_name),
    INDEX idx_record_id (record_id),
    INDEX idx_action_type (action_type),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_table_record (table_name, record_id)
);

SET FOREIGN_KEY_CHECKS = 1;
