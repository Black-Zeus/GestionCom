-- =====================================================
-- Schema menu
-- Archivo: 20260603_1331_schema_menu.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- SECCIÓN 1: CREACIÓN DE TABLAS NUEVAS
-- =====================================================

-- Elementos del menú (estructura jerárquica)
CREATE TABLE menu_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id BIGINT UNSIGNED NULL COMMENT 'ID del menú padre (NULL = menú raíz)',
    menu_code VARCHAR(50) UNIQUE NOT NULL COMMENT 'Código único del menú',
    menu_name VARCHAR(100) NOT NULL COMMENT 'Nombre mostrado en el menú',
    menu_description TEXT NULL COMMENT 'Descripción del elemento del menú',

    -- Configuración visual
    icon_name VARCHAR(50) NULL COMMENT 'Nombre del icono (ej: product-line, shopping-cart)',
    icon_color VARCHAR(20) NULL COMMENT 'Color del icono en formato hex',
    menu_url VARCHAR(255) NULL COMMENT 'URL/ruta del frontend',

    -- Configuración funcional
    menu_type ENUM('PARENT', 'LINK', 'DIVIDER', 'HEADER') DEFAULT 'LINK' COMMENT 'Tipo de elemento del menú',
    required_permission_id BIGINT UNSIGNED NULL COMMENT 'Permiso requerido para ver este menú',
    alternative_permissions JSON NULL COMMENT 'Array de permisos alternativos que permiten acceso',

    -- Control de visualización
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Si el menú está activo globalmente',
    is_visible BOOLEAN DEFAULT TRUE COMMENT 'Si es visible en el menú',
    requires_feature BOOLEAN DEFAULT FALSE COMMENT 'Si requiere que una característica esté habilitada',
    feature_code VARCHAR(100) NULL COMMENT 'Código de característica requerida',

    -- Ordenamiento y agrupación
    sort_order INT UNSIGNED DEFAULT 0 COMMENT 'Orden de aparición en el menú',
    menu_level TINYINT UNSIGNED DEFAULT 1 COMMENT 'Nivel jerárquico (1=raíz, 2=submenú, etc.)',
    menu_path VARCHAR(500) NULL COMMENT 'Ruta completa del menú (/inventario/productos)',

    -- Configuración adicional
    target_window ENUM('SELF', 'BLANK', 'MODAL') DEFAULT 'SELF' COMMENT 'Donde abrir el enlace',
    css_classes VARCHAR(255) NULL COMMENT 'Clases CSS adicionales',
    data_attributes JSON NULL COMMENT 'Atributos data- adicionales',

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by_user_id BIGINT UNSIGNED NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    -- Constraints
    FOREIGN KEY (parent_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    FOREIGN KEY (required_permission_id) REFERENCES permissions(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,

    -- Índices
    INDEX idx_parent_id (parent_id),
    INDEX idx_menu_code (menu_code),
    INDEX idx_required_permission_id (required_permission_id),
    INDEX idx_is_active (is_active),
    INDEX idx_is_visible (is_visible),
    INDEX idx_sort_order (sort_order),
    INDEX idx_menu_level (menu_level),
    INDEX idx_menu_path (menu_path(255)),
    INDEX idx_feature_code (feature_code),
    INDEX idx_deleted_at (deleted_at)
);

-- Permisos específicos por elemento de menú (permisos adicionales)
CREATE TABLE menu_item_permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    menu_item_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    permission_type ENUM('REQUIRED', 'ALTERNATIVE', 'EXCLUDE') DEFAULT 'ALTERNATIVE' COMMENT 'Tipo de relación con el permiso',

    -- Constraints
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE KEY uk_menu_permission (menu_item_id, permission_id),

    -- Índices
    INDEX idx_menu_item_id (menu_item_id),
    INDEX idx_permission_id (permission_id),
    INDEX idx_permission_type (permission_type)
);

-- Menús favoritos por usuario
CREATE TABLE user_menu_favorites (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    menu_item_id BIGINT UNSIGNED NOT NULL,
    favorite_order INT UNSIGNED DEFAULT 0,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_favorite (user_id, menu_item_id),

    -- Índices
    INDEX idx_user_id (user_id),
    INDEX idx_menu_item_id (menu_item_id),
    INDEX idx_favorite_order (favorite_order)
);

-- Log de acceso a menús (analítica)
CREATE TABLE menu_access_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    menu_item_id BIGINT UNSIGNED NOT NULL,
    access_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    session_id VARCHAR(255) NULL,

    -- Constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,

    -- Índices
    INDEX idx_user_id (user_id),
    INDEX idx_menu_item_id (menu_item_id),
    INDEX idx_access_timestamp (access_timestamp),
    INDEX idx_session_id (session_id)
);

-- =====================================================

SET FOREIGN_KEY_CHECKS = 1;
