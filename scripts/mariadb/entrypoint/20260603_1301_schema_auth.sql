-- =====================================================
-- Schema auth y permisos
-- Archivo: 20260603_1301_schema_auth.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- MÓDULO: USUARIOS Y AUTENTICACIÓN
-- =====================================================

-- Tabla de usuarios principales
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash CHAR(64) NOT NULL COMMENT 'SHA-256 hash',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP NULL,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Índices
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Roles del sistema
CREATE TABLE roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_code VARCHAR(50) UNIQUE NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    role_description TEXT NULL,
    is_system_role BOOLEAN DEFAULT FALSE COMMENT 'No editable si es true',
    is_active BOOLEAN DEFAULT TRUE,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Índices
    INDEX idx_role_code (role_code),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Permisos granulares
CREATE TABLE permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    permission_code VARCHAR(100) UNIQUE NOT NULL,
    permission_name VARCHAR(150) NOT NULL,
    permission_group VARCHAR(50) NOT NULL COMMENT 'PRODUCTS, INVENTORY, SALES, etc.',
    permission_description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Índices
    INDEX idx_permission_code (permission_code),
    INDEX idx_permission_group (permission_group),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Permisos por rol (base)
CREATE TABLE role_permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by_user_id BIGINT UNSIGNED NULL,

    -- Constraints
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_role_permission (role_id, permission_id),

    -- Índices
    INDEX idx_role_id (role_id),
    INDEX idx_permission_id (permission_id)
);

-- Asignación de roles a usuarios
CREATE TABLE user_roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by_user_id BIGINT UNSIGNED NULL,

    -- Constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_user_role (user_id, role_id),

    -- Índices
    INDEX idx_user_id (user_id),
    INDEX idx_role_id (role_id)
);

-- Permisos adicionales específicos por usuario
CREATE TABLE user_permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    permission_type ENUM('GRANT', 'DENY') DEFAULT 'GRANT',
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by_user_id BIGINT UNSIGNED NULL,
    expires_at TIMESTAMP NULL,

    -- Constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_user_permission (user_id, permission_id),

    -- Índices
    INDEX idx_user_id (user_id),
    INDEX idx_permission_id (permission_id),
    INDEX idx_expires_at (expires_at)
);

SET FOREIGN_KEY_CHECKS = 1;
