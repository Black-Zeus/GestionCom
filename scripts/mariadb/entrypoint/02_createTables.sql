-- =====================================================
-- SISTEMA DE INVENTARIO COMPLETO
-- Base de datos: MariaDB 10.6.22
-- Convención: snake_case, soft delete, auditoría completa
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
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

-- =====================================================
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

-- =====================================================
-- MÓDULO: PRODUCTOS
-- =====================================================

-- Categorías jerárquicas
CREATE TABLE categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id BIGINT UNSIGNED NULL,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(150) NOT NULL,
    category_description TEXT NULL,
    category_level TINYINT UNSIGNED DEFAULT 1 COMMENT 'Nivel jerárquico',
    category_path VARCHAR(1000) NULL COMMENT 'Ruta completa separada por /',
    sort_order INT UNSIGNED DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Constraints
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    
    -- Índices
    INDEX idx_parent_id (parent_id),
    INDEX idx_category_code (category_code),
    INDEX idx_category_level (category_level),
    INDEX idx_category_path (category_path(255)),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Unidades de medida
CREATE TABLE measurement_units (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    unit_code VARCHAR(20) UNIQUE NOT NULL,
    unit_name VARCHAR(100) NOT NULL,
    unit_symbol VARCHAR(10) NOT NULL,
    unit_type ENUM('BASE', 'DERIVED') DEFAULT 'BASE',
    base_unit_id BIGINT UNSIGNED NULL COMMENT 'Unidad base para conversiones',
    conversion_factor DECIMAL(15,6) DEFAULT 1.000000 COMMENT 'Factor de conversión a unidad base',
    allow_decimals BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Constraints
    FOREIGN KEY (base_unit_id) REFERENCES measurement_units(id) ON DELETE SET NULL,
    
    -- Índices
    INDEX idx_unit_code (unit_code),
    INDEX idx_unit_type (unit_type),
    INDEX idx_base_unit_id (base_unit_id),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Grupos de atributos
CREATE TABLE attribute_groups (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    group_code VARCHAR(50) UNIQUE NOT NULL,
    group_name VARCHAR(100) NOT NULL,
    group_description TEXT NULL,
    sort_order INT UNSIGNED DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Índices
    INDEX idx_group_code (group_code),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Atributos de productos
CREATE TABLE attributes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    attribute_group_id BIGINT UNSIGNED NOT NULL,
    attribute_code VARCHAR(50) UNIQUE NOT NULL,
    attribute_name VARCHAR(100) NOT NULL,
    attribute_type ENUM('TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTISELECT') DEFAULT 'TEXT',
    is_required BOOLEAN DEFAULT FALSE,
    affects_sku BOOLEAN DEFAULT FALSE COMMENT 'Si afecta la generación de variantes',
    sort_order INT UNSIGNED DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Constraints
    FOREIGN KEY (attribute_group_id) REFERENCES attribute_groups(id) ON DELETE CASCADE,
    
    -- Índices
    INDEX idx_attribute_code (attribute_code),
    INDEX idx_attribute_group_id (attribute_group_id),
    INDEX idx_affects_sku (affects_sku),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Valores posibles para atributos de tipo SELECT
CREATE TABLE attribute_values (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    attribute_id BIGINT UNSIGNED NOT NULL,
    value_code VARCHAR(50) NOT NULL,
    value_name VARCHAR(100) NOT NULL,
    sort_order INT UNSIGNED DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Constraints
    FOREIGN KEY (attribute_id) REFERENCES attributes(id) ON DELETE CASCADE,
    UNIQUE KEY uk_attribute_value (attribute_id, value_code),
    
    -- Índices
    INDEX idx_attribute_id (attribute_id),
    INDEX idx_value_code (value_code),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Productos principales (padre)
CREATE TABLE products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED NOT NULL,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_description TEXT NULL,
    brand VARCHAR(100) NULL,
    model VARCHAR(100) NULL,
    base_measurement_unit_id BIGINT UNSIGNED NOT NULL,
    has_variants BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Características activables por producto
    has_batch_control BOOLEAN DEFAULT FALSE,
    has_expiry_date BOOLEAN DEFAULT FALSE,
    has_serial_numbers BOOLEAN DEFAULT FALSE,
    has_location_tracking BOOLEAN DEFAULT FALSE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Constraints
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (base_measurement_unit_id) REFERENCES measurement_units(id) ON DELETE RESTRICT,
    
    -- Índices
    INDEX idx_product_code (product_code),
    INDEX idx_category_id (category_id),
    INDEX idx_brand (brand),
    INDEX idx_has_variants (has_variants),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Variantes de productos
CREATE TABLE product_variants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    variant_sku VARCHAR(100) UNIQUE NOT NULL,
    variant_name VARCHAR(255) NOT NULL,
    variant_description TEXT NULL,
    is_default_variant BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Constraints
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    
    -- Índices
    INDEX idx_product_id (product_id),
    INDEX idx_variant_sku (variant_sku),
    INDEX idx_is_default_variant (is_default_variant),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Valores de atributos por variante de producto
CREATE TABLE product_variant_attributes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    attribute_id BIGINT UNSIGNED NOT NULL,
    attribute_value_id BIGINT UNSIGNED NULL COMMENT 'Para atributos SELECT',
    text_value TEXT NULL COMMENT 'Para atributos TEXT/NUMBER',
    
    -- Constraints
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_id) REFERENCES attributes(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_value_id) REFERENCES attribute_values(id) ON DELETE SET NULL,
    UNIQUE KEY uk_variant_attribute (product_variant_id, attribute_id),
    
    -- Índices
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_attribute_id (attribute_id)
);

-- Unidades de medida por producto
CREATE TABLE product_measurement_units (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    measurement_unit_id BIGINT UNSIGNED NOT NULL,
    conversion_factor DECIMAL(15,6) NOT NULL DEFAULT 1.000000,
    is_purchase_unit BOOLEAN DEFAULT FALSE,
    is_sale_unit BOOLEAN DEFAULT FALSE,
    is_inventory_unit BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Constraints
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id) ON DELETE CASCADE,
    UNIQUE KEY uk_product_unit (product_id, measurement_unit_id),
    
    -- Índices
    INDEX idx_product_id (product_id),
    INDEX idx_measurement_unit_id (measurement_unit_id),
    INDEX idx_is_purchase_unit (is_purchase_unit),
    INDEX idx_is_sale_unit (is_sale_unit)
);

-- Códigos de barras múltiples
CREATE TABLE product_barcodes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    barcode_type ENUM('EAN13', 'EAN8', 'UPC', 'CODE128', 'QR', 'OTHER') NOT NULL,
    barcode_value VARCHAR(255) UNIQUE NOT NULL,
    measurement_unit_id BIGINT UNSIGNED NULL COMMENT 'Unidad que representa este código',
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Constraints
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id) ON DELETE SET NULL,
    
    -- Índices
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_barcode_value (barcode_value),
    INDEX idx_barcode_type (barcode_type),
    INDEX idx_is_primary (is_primary),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- =====================================================
-- MÓDULO: BODEGAS E INVENTARIO
-- =====================================================

-- Bodegas principales
CREATE TABLE warehouses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    warehouse_code VARCHAR(20) UNIQUE NOT NULL,
    warehouse_name VARCHAR(150) NOT NULL,
    warehouse_type ENUM('WAREHOUSE', 'STORE', 'OUTLET') DEFAULT 'WAREHOUSE',
    responsible_user_id BIGINT UNSIGNED NOT NULL COMMENT 'Usuario responsable único',
    address TEXT NULL,
    city VARCHAR(100) NULL,
    country VARCHAR(100) NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(255) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Constraints
    FOREIGN KEY (responsible_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Índices
    INDEX idx_warehouse_code (warehouse_code),
    INDEX idx_warehouse_type (warehouse_type),
    INDEX idx_responsible_user_id (responsible_user_id),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Zonas dentro de bodegas (opcional)
CREATE TABLE warehouse_zones (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    zone_code VARCHAR(20) NOT NULL,
    zone_name VARCHAR(100) NOT NULL,
    zone_description TEXT NULL,
    is_location_tracking_enabled BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Constraints
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    UNIQUE KEY uk_warehouse_zone (warehouse_id, zone_code),
    
    -- Índices
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_zone_code (zone_code),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Acceso de usuarios a bodegas
CREATE TABLE user_warehouse_access (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    access_type ENUM('FULL', 'READ_ONLY', 'DENIED') DEFAULT 'READ_ONLY',
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by_user_id BIGINT UNSIGNED NOT NULL,
    
    -- Constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_user_warehouse (user_id, warehouse_id),
    
    -- Índices
    INDEX idx_user_id (user_id),
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_access_type (access_type)
);

-- Stock actual consolidado
CREATE TABLE stock (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    warehouse_zone_id BIGINT UNSIGNED NULL,
    current_quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(15,4) NOT NULL DEFAULT 0 COMMENT 'Stock reservado para órdenes',
    available_quantity DECIMAL(15,4) GENERATED ALWAYS AS (current_quantity - reserved_quantity) VIRTUAL,
    minimum_stock DECIMAL(15,4) DEFAULT 0,
    maximum_stock DECIMAL(15,4) DEFAULT 0,
    last_movement_date TIMESTAMP NULL,
    
    -- Auditoría
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
    UNIQUE KEY uk_stock_location (product_variant_id, warehouse_id, warehouse_zone_id),
    
    -- Índices
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_warehouse_zone_id (warehouse_zone_id),
    INDEX idx_current_quantity (current_quantity),
    INDEX idx_available_quantity (available_quantity),
    INDEX idx_last_movement_date (last_movement_date)
);

-- Movimientos de stock (historial completo)
CREATE TABLE stock_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    warehouse_zone_id BIGINT UNSIGNED NULL,
    movement_type ENUM('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT') NOT NULL,
    reference_type ENUM('PURCHASE', 'SALE', 'TRANSFER', 'ADJUSTMENT', 'RETURN', 'DAMAGE') NOT NULL,
    reference_document_id BIGINT UNSIGNED NULL COMMENT 'ID del documento que generó el movimiento',
    quantity DECIMAL(15,4) NOT NULL COMMENT 'Cantidad del movimiento (+ o -)',
    quantity_before DECIMAL(15,4) NOT NULL,
    quantity_after DECIMAL(15,4) NOT NULL,
    unit_cost DECIMAL(15,4) NULL,
    total_cost DECIMAL(15,4) NULL,
    batch_lot_number VARCHAR(100) NULL,
    expiry_date DATE NULL,
    serial_number VARCHAR(100) NULL,
    notes TEXT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (warehouse_zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Índices
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_movement_type (movement_type),
    INDEX idx_reference_type (reference_type),
    INDEX idx_reference_document_id (reference_document_id),
    INDEX idx_batch_lot_number (batch_lot_number),
    INDEX idx_serial_number (serial_number),
    INDEX idx_created_at (created_at),
    INDEX idx_created_by_user_id (created_by_user_id)
);

-- =====================================================
-- MÓDULO: LISTAS DE PRECIOS
-- =====================================================

-- Grupos de listas de precios
CREATE TABLE price_list_groups (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    group_code VARCHAR(50) UNIQUE NOT NULL,
    group_name VARCHAR(100) NOT NULL,
    group_description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Índices
    INDEX idx_group_code (group_code),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Listas de precios maestras
CREATE TABLE price_lists (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    price_list_group_id BIGINT UNSIGNED NULL,
    price_list_code VARCHAR(50) UNIQUE NOT NULL,
    price_list_name VARCHAR(150) NOT NULL,
    base_price_list_id BIGINT UNSIGNED NULL COMMENT 'Lista base para derivar precios',
    base_adjustment_type ENUM('PERCENTAGE', 'FIXED') NULL COMMENT 'Tipo de ajuste sobre lista base',
    base_adjustment_value DECIMAL(10,4) NULL COMMENT 'Valor del ajuste (% o monto fijo)',
    currency_code CHAR(3) DEFAULT 'USD',
    valid_from DATE NOT NULL,
    valid_to DATE NULL,
    priority TINYINT UNSIGNED DEFAULT 1 COMMENT 'Prioridad si múltiples listas activas',
    applies_to ENUM('ALL_PRODUCTS', 'CATEGORY', 'SPECIFIC') DEFAULT 'ALL_PRODUCTS',
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Constraints
    FOREIGN KEY (price_list_group_id) REFERENCES price_list_groups(id) ON DELETE SET NULL,
    FOREIGN KEY (base_price_list_id) REFERENCES price_lists(id) ON DELETE SET NULL,
    
    -- Índices
    INDEX idx_price_list_code (price_list_code),
    INDEX idx_price_list_group_id (price_list_group_id),
    INDEX idx_base_price_list_id (base_price_list_id),
    INDEX idx_valid_from (valid_from),
    INDEX idx_valid_to (valid_to),
    INDEX idx_priority (priority),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Precios específicos por producto/variante
CREATE TABLE price_list_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    price_list_id BIGINT UNSIGNED NOT NULL,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    measurement_unit_id BIGINT UNSIGNED NOT NULL,
    base_price DECIMAL(15,4) NOT NULL,
    sale_price DECIMAL(15,4) NOT NULL COMMENT 'Precio final calculado',
    cost_price DECIMAL(15,4) NULL,
    margin_percentage DECIMAL(5,2) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (price_list_id) REFERENCES price_lists(id) ON DELETE CASCADE,
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id) ON DELETE CASCADE,
    UNIQUE KEY uk_price_list_item (price_list_id, product_variant_id, measurement_unit_id),
    
    -- Índices
    INDEX idx_price_list_id (price_list_id),
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_measurement_unit_id (measurement_unit_id),
    INDEX idx_sale_price (sale_price),
    INDEX idx_is_active (is_active)
);

-- Promociones especiales
CREATE TABLE promotions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    promotion_code VARCHAR(50) UNIQUE NOT NULL,
    promotion_name VARCHAR(150) NOT NULL,
    promotion_type ENUM('QUANTITY_DISCOUNT', 'BUY_X_GET_Y', 'PERCENTAGE_OFF', 'FIXED_AMOUNT') NOT NULL,
    target_type ENUM('PRODUCT', 'CATEGORY', 'ALL') DEFAULT 'PRODUCT',
    min_quantity DECIMAL(15,4) NULL COMMENT 'Cantidad mínima para activar promoción',
    discount_percentage DECIMAL(5,2) NULL,
    discount_amount DECIMAL(15,4) NULL,
    buy_quantity DECIMAL(15,4) NULL COMMENT 'Para promociones 3x2',
    get_quantity DECIMAL(15,4) NULL COMMENT 'Para promociones 3x2',
    valid_from DATETIME NOT NULL,
    valid_to DATETIME NOT NULL,
    is_combinable BOOLEAN DEFAULT FALSE COMMENT 'Si se puede combinar con otras promociones',
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Índices
    INDEX idx_promotion_code (promotion_code),
    INDEX idx_promotion_type (promotion_type),
    INDEX idx_valid_from (valid_from),
    INDEX idx_valid_to (valid_to),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Productos/categorías incluidos en promociones
CREATE TABLE promotion_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    promotion_id BIGINT UNSIGNED NOT NULL,
    product_variant_id BIGINT UNSIGNED NULL,
    category_id BIGINT UNSIGNED NULL,
    
    -- Constraints
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    
    -- Índices
    INDEX idx_promotion_id (promotion_id),
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_category_id (category_id),
    
    -- Constraint: debe tener producto O categoría, no ambos
    CHECK ((product_variant_id IS NOT NULL AND category_id IS NULL) OR 
           (product_variant_id IS NULL AND category_id IS NOT NULL))
);

-- =====================================================
-- MÓDULO: DOCUMENTOS
-- =====================================================

-- Tipos de documentos
CREATE TABLE document_types (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_type_code VARCHAR(50) UNIQUE NOT NULL,
    document_type_name VARCHAR(100) NOT NULL,
    document_category ENUM('PURCHASE', 'SALE', 'INVENTORY', 'TRANSFER') NOT NULL,
    requires_approval BOOLEAN DEFAULT FALSE,
    generates_movement BOOLEAN DEFAULT TRUE,
    movement_type ENUM('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT') NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Índices
    INDEX idx_document_type_code (document_type_code),
    INDEX idx_document_category (document_category),
    INDEX idx_movement_type (movement_type),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- Series de numeración para documentos
CREATE TABLE document_series (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_type_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NULL COMMENT 'Serie específica por bodega',
    series_code VARCHAR(20) NOT NULL,
    series_prefix VARCHAR(10) NULL,
    current_number BIGINT UNSIGNED DEFAULT 0,
    min_number BIGINT UNSIGNED DEFAULT 1,
    max_number BIGINT UNSIGNED DEFAULT 999999999,
    number_length TINYINT UNSIGNED DEFAULT 8,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Constraints
    FOREIGN KEY (document_type_id) REFERENCES document_types(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    UNIQUE KEY uk_series_warehouse (document_type_id, warehouse_id, series_code),
    
    -- Índices
    INDEX idx_document_type_id (document_type_id),
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_series_code (series_code),
    INDEX idx_is_active (is_active)
);

-- Documentos principales (cabecera)
CREATE TABLE documents (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_type_id BIGINT UNSIGNED NOT NULL,
    document_series_id BIGINT UNSIGNED NOT NULL,
    document_number VARCHAR(50) NOT NULL,
    document_date DATE NOT NULL,
    source_warehouse_id BIGINT UNSIGNED NULL,
    target_warehouse_id BIGINT UNSIGNED NULL,
    customer_supplier_name VARCHAR(255) NULL,
    customer_supplier_document VARCHAR(50) NULL,
    reference_external VARCHAR(100) NULL COMMENT 'Número de factura externa, orden, etc.',
    subtotal DECIMAL(15,4) DEFAULT 0,
    tax_amount DECIMAL(15,4) DEFAULT 0,
    discount_amount DECIMAL(15,4) DEFAULT 0,
    total_amount DECIMAL(15,4) DEFAULT 0,
    document_status ENUM('DRAFT', 'PENDING', 'APPROVED', 'PROCESSED', 'CANCELLED') DEFAULT 'DRAFT',
    notes TEXT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    approved_by_user_id BIGINT UNSIGNED NULL,
    approved_at TIMESTAMP NULL,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Constraints
    FOREIGN KEY (document_type_id) REFERENCES document_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (document_series_id) REFERENCES document_series(id) ON DELETE RESTRICT,
    FOREIGN KEY (source_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (target_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_document_number (document_type_id, document_series_id, document_number),
    
    -- Índices
    INDEX idx_document_type_id (document_type_id),
    INDEX idx_document_number (document_number),
    INDEX idx_document_date (document_date),
    INDEX idx_source_warehouse_id (source_warehouse_id),
    INDEX idx_target_warehouse_id (target_warehouse_id),
    INDEX idx_document_status (document_status),
    INDEX idx_created_by_user_id (created_by_user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_deleted_at (deleted_at)
);

-- Detalle de documentos (líneas de productos)
CREATE TABLE document_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT UNSIGNED NOT NULL,
    line_number SMALLINT UNSIGNED NOT NULL,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    measurement_unit_id BIGINT UNSIGNED NOT NULL,
    quantity DECIMAL(15,4) NOT NULL,
    unit_price DECIMAL(15,4) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,4) DEFAULT 0,
    line_total DECIMAL(15,4) NOT NULL,
    batch_lot_number VARCHAR(100) NULL,
    expiry_date DATE NULL,
    serial_number VARCHAR(100) NULL,
    warehouse_zone_id BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    
    -- Constraints
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
    FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id) ON DELETE RESTRICT,
    FOREIGN KEY (warehouse_zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
    UNIQUE KEY uk_document_line (document_id, line_number),
    
    -- Índices
    INDEX idx_document_id (document_id),
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_batch_lot_number (batch_lot_number),
    INDEX idx_serial_number (serial_number)
);

-- =====================================================
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