-- =====================================================
-- FEATURE: SISTEMA DE MENÚS DINÁMICOS
-- Archivo: 08_addFeatureMenuSystem.sql
-- Descripción: Sistema completo de menús basado en permisos
-- Genera menús personalizados según rol y permisos del usuario
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
-- SECCIÓN 2: CREACIÓN DE VISTAS
-- =====================================================

-- Vista menú completo con permisos
CREATE VIEW v_menu_hierarchy AS
WITH RECURSIVE menu_tree AS (
    -- Menús raíz
    SELECT 
        m.id,
        m.parent_id,
        m.menu_code,
        m.menu_name,
        m.menu_description,
        m.icon_name,
        m.icon_color,
        m.menu_url,
        m.menu_type,
        m.required_permission_id,
        p.permission_code as required_permission_code,
        m.is_active,
        m.is_visible,
        m.sort_order,
        m.menu_level,
        m.menu_path,
        m.target_window,
        m.css_classes,
        CAST(m.menu_name AS CHAR(1000)) as full_path
    FROM menu_items m
    LEFT JOIN permissions p ON m.required_permission_id = p.id
    WHERE m.parent_id IS NULL 
        AND m.deleted_at IS NULL
    
    UNION ALL
    
    -- Menús hijos (recursivo)
    SELECT 
        m.id,
        m.parent_id,
        m.menu_code,
        m.menu_name,
        m.menu_description,
        m.icon_name,
        m.icon_color,
        m.menu_url,
        m.menu_type,
        m.required_permission_id,
        p.permission_code as required_permission_code,
        m.is_active,
        m.is_visible,
        m.sort_order,
        m.menu_level,
        m.menu_path,
        m.target_window,
        m.css_classes,
        CONCAT(mt.full_path, ' > ', m.menu_name) as full_path
    FROM menu_items m
    JOIN menu_tree mt ON m.parent_id = mt.id
    LEFT JOIN permissions p ON m.required_permission_id = p.id
    WHERE m.deleted_at IS NULL
)
SELECT * FROM menu_tree
ORDER BY menu_level, sort_order, menu_name;

-- Vista menú por usuario (con permisos aplicados)
CREATE VIEW v_user_menu AS
SELECT DISTINCT
    u.id as user_id,
    u.username,
    m.id as menu_item_id,
    m.parent_id,
    m.menu_code,
    m.menu_name,
    m.menu_description,
    m.icon_name,
    m.icon_color,
    m.menu_url,
    m.menu_type,
    m.sort_order,
    m.menu_level,
    m.menu_path,
    m.target_window,
    m.css_classes,
    m.data_attributes,
    
    -- Información de permisos
    m.required_permission_id,
    p.permission_code as required_permission,
    
    -- Favoritos
    CASE WHEN umf.id IS NOT NULL THEN TRUE ELSE FALSE END as is_favorite,
    umf.favorite_order,
    
    -- Estado
    CASE 
        WHEN m.required_permission_id IS NULL THEN TRUE
        WHEN user_perms.has_permission = TRUE THEN TRUE
        ELSE FALSE
    END as has_access

FROM users u
CROSS JOIN menu_items m
LEFT JOIN permissions p ON m.required_permission_id = p.id
LEFT JOIN user_menu_favorites umf ON u.id = umf.user_id AND m.id = umf.menu_item_id

-- Verificar permisos del usuario (rol + permisos adicionales)
LEFT JOIN (
    -- Permisos por rol
    SELECT DISTINCT
        u.id as user_id,
        rp.permission_id,
        TRUE as has_permission
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.deleted_at IS NULL
    
    UNION
    
    -- Permisos adicionales específicos del usuario
    SELECT DISTINCT
        up.user_id,
        up.permission_id,
        CASE WHEN up.permission_type = 'GRANT' THEN TRUE ELSE FALSE END as has_permission
    FROM user_permissions up
    WHERE (up.expires_at IS NULL OR up.expires_at > NOW())
) user_perms ON u.id = user_perms.user_id AND m.required_permission_id = user_perms.permission_id

WHERE u.deleted_at IS NULL 
    AND m.deleted_at IS NULL
    AND m.is_active = TRUE
    AND m.is_visible = TRUE
    AND (
        m.required_permission_id IS NULL 
        OR user_perms.has_permission = TRUE
    )
ORDER BY u.id, m.menu_level, m.sort_order, m.menu_name;

-- Vista estadísticas de uso del menú
CREATE VIEW v_menu_usage_stats AS
SELECT 
    m.menu_code,
    m.menu_name,
    m.menu_url,
    COUNT(mal.id) as total_accesses,
    COUNT(DISTINCT mal.user_id) as unique_users,
    COUNT(DISTINCT DATE(mal.access_timestamp)) as active_days,
    MAX(mal.access_timestamp) as last_access,
    AVG(daily_access.daily_count) as avg_daily_accesses
FROM menu_items m
LEFT JOIN menu_access_log mal ON m.id = mal.menu_item_id
LEFT JOIN (
    SELECT 
        menu_item_id,
        DATE(access_timestamp) as access_date,
        COUNT(*) as daily_count
    FROM menu_access_log
    GROUP BY menu_item_id, DATE(access_timestamp)
) daily_access ON m.id = daily_access.menu_item_id
WHERE m.deleted_at IS NULL
GROUP BY m.id
ORDER BY total_accesses DESC;

-- =====================================================
-- SECCIÓN 3: INSERCIÓN DE DATOS DEL MENÚ
-- =====================================================

-- Menús principales (nivel 1)
INSERT INTO menu_items (menu_code, menu_name, menu_description, icon_name, icon_color, menu_type, sort_order, menu_level, menu_path) VALUES
('dashboard', 'Dashboard', 'Panel principal del sistema', 'dashboard-line', '#3B82F6', 'LINK', 10, 1, '/dashboard'),
('products', 'Productos', 'Gestión de productos e inventario', 'product-hunt-line', '#10B981', 'PARENT', 20, 1, '/products'),
('inventory', 'Inventario', 'Control de stock y movimientos', 'archive-line', '#F59E0B', 'PARENT', 30, 1, '/inventory'),
('sales', 'Punto de Venta', 'Gestión de ventas y facturación', 'shopping-cart-line', '#EF4444', 'PARENT', 40, 1, '/sales'),
('customers', 'Clientes', 'Gestión de clientes y cuenta corriente', 'user-line', '#8B5CF6', 'PARENT', 50, 1, '/customers'),
('cash_control', 'Control de Caja', 'Apertura, cierre y movimientos de caja', 'safe-line', '#06B6D4', 'PARENT', 60, 1, '/cash-control'),
('reports', 'Reportes', 'Reportería y análisis', 'bar-chart-line', '#84CC16', 'PARENT', 70, 1, '/reports'),
('administration', 'Administración', 'Configuración del sistema', 'settings-line', '#6B7280', 'PARENT', 80, 1, '/administration');

-- Submenús de Productos (nivel 2)
INSERT INTO menu_items (parent_id, menu_code, menu_name, menu_description, icon_name, menu_url, menu_type, required_permission_id, sort_order, menu_level, menu_path) VALUES
((SELECT id FROM menu_items WHERE menu_code = 'products'), 'products_list', 'Ver Productos', 'Lista y búsqueda de productos', 'list-check', '/products/list', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PRODUCTS_VIEW'), 10, 2, '/products/list'),
((SELECT id FROM menu_items WHERE menu_code = 'products'), 'products_create', 'Crear Producto', 'Agregar nuevo producto al catálogo', 'add-circle-line', '/products/create', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PRODUCTS_CREATE'), 20, 2, '/products/create'),
((SELECT id FROM menu_items WHERE menu_code = 'products'), 'products_variants', 'Gestionar Variantes', 'Crear y gestionar variantes de productos', 'git-branch-line', '/products/variants', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PRODUCTS_EDIT'), 30, 2, '/products/variants'),
((SELECT id FROM menu_items WHERE menu_code = 'products'), 'products_categories', 'Categorías', 'Gestión de categorías de productos', 'folder-line', '/products/categories', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CATEGORIES_MANAGE'), 40, 2, '/products/categories'),
((SELECT id FROM menu_items WHERE menu_code = 'products'), 'products_attributes', 'Atributos', 'Configuración de atributos de productos', 'price-tag-3-line', '/products/attributes', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'ATTRIBUTES_MANAGE'), 50, 2, '/products/attributes'),
((SELECT id FROM menu_items WHERE menu_code = 'products'), 'products_barcodes', 'Códigos de Barras', 'Gestión de códigos de barras', 'qr-code-line', '/products/barcodes', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PRODUCTS_EDIT'), 60, 2, '/products/barcodes');

-- Submenús de Inventario (nivel 2)
INSERT INTO menu_items (parent_id, menu_code, menu_name, menu_description, icon_name, menu_url, menu_type, required_permission_id, sort_order, menu_level, menu_path) VALUES
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'inventory_stock', 'Ver Stock', 'Consulta de stock por bodega', 'database-line', '/inventory/stock', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'STOCK_VIEW'), 10, 2, '/inventory/stock'),
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'inventory_movements', 'Movimientos', 'Historial de movimientos de inventario', 'exchange-line', '/inventory/movements', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'MOVEMENTS_VIEW'), 20, 2, '/inventory/movements'),
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'inventory_adjustments', 'Ajustes de Stock', 'Ajustes manuales de inventario', 'edit-line', '/inventory/adjustments', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'STOCK_ADJUST'), 30, 2, '/inventory/adjustments'),
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'inventory_transfers', 'Transferencias', 'Transferencias entre bodegas', 'truck-line', '/inventory/transfers', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'STOCK_TRANSFER'), 40, 2, '/inventory/transfers'),
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'inventory_warehouses', 'Bodegas', 'Gestión de bodegas y ubicaciones', 'building-line', '/inventory/warehouses', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSES_MANAGE'), 50, 2, '/inventory/warehouses'),
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'inventory_counting', 'Conteo de Inventario', 'Conteos físicos y auditoria', 'calculator-line', '/inventory/counting', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'STOCK_ADJUST'), 60, 2, '/inventory/counting');

-- Submenús de Punto de Venta (nivel 2)
INSERT INTO menu_items (parent_id, menu_code, menu_name, menu_description, icon_name, menu_url, menu_type, required_permission_id, sort_order, menu_level, menu_path) VALUES
((SELECT id FROM menu_items WHERE menu_code = 'sales'), 'sales_new', 'Nueva Venta', 'Crear pre-venta o venta directa', 'shopping-bag-line', '/sales/new', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'DOCUMENTS_CREATE'), 10, 2, '/sales/new'),
((SELECT id FROM menu_items WHERE menu_code = 'sales'), 'sales_process', 'Procesar Venta', 'Convertir pre-venta a factura', 'bank-card-line', '/sales/process', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'DOCUMENTS_CREATE'), 20, 2, '/sales/process'),
((SELECT id FROM menu_items WHERE menu_code = 'sales'), 'sales_search_presale', 'Buscar Pre-venta', 'Buscar y consultar pre-ventas', 'search-line', '/sales/search-presale', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'DOCUMENTS_VIEW'), 30, 2, '/sales/search-presale'),
((SELECT id FROM menu_items WHERE menu_code = 'sales'), 'sales_search_document', 'Consultar Documento', 'Buscar ventas por número de documento', 'file-search-line', '/sales/search-document', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'DOCUMENTS_VIEW'), 40, 2, '/sales/search-document'),
((SELECT id FROM menu_items WHERE menu_code = 'sales'), 'sales_returns', 'Devoluciones', 'Procesar devoluciones de productos', 'refund-line', '/sales/returns', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'DOCUMENTS_CREATE'), 50, 2, '/sales/returns'),
((SELECT id FROM menu_items WHERE menu_code = 'sales'), 'sales_exchanges', 'Cambios de Producto', 'Cambios y ajustes de productos vendidos', 'exchange-cny-line', '/sales/exchanges', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'DOCUMENTS_CREATE'), 60, 2, '/sales/exchanges'),
((SELECT id FROM menu_items WHERE menu_code = 'sales'), 'sales_cancel', 'Anular Venta', 'Anulación de documentos de venta', 'close-circle-line', '/sales/cancel', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'DOCUMENTS_CANCEL'), 70, 2, '/sales/cancel'),
((SELECT id FROM menu_items WHERE menu_code = 'sales'), 'sales_pricing', 'Listas de Precios', 'Gestión de precios y promociones', 'price-tag-line', '/sales/pricing', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PRICES_VIEW'), 80, 2, '/sales/pricing');

-- Submenús de Clientes (nivel 2)
INSERT INTO menu_items (parent_id, menu_code, menu_name, menu_description, icon_name, menu_url, menu_type, required_permission_id, sort_order, menu_level, menu_path) VALUES
((SELECT id FROM menu_items WHERE menu_code = 'customers'), 'customers_list', 'Ver Clientes', 'Lista y búsqueda de clientes', 'user-3-line', '/customers/list', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CUSTOMERS_VIEW'), 10, 2, '/customers/list'),
((SELECT id FROM menu_items WHERE menu_code = 'customers'), 'customers_create', 'Crear Cliente', 'Registrar nuevo cliente', 'user-add-line', '/customers/create', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CUSTOMERS_CREATE'), 20, 2, '/customers/create'),
((SELECT id FROM menu_items WHERE menu_code = 'customers'), 'customers_credit', 'Límites de Crédito', 'Configuración de crédito por cliente', 'bank-line', '/customers/credit', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CREDIT_LIMITS_VIEW'), 30, 2, '/customers/credit'),
((SELECT id FROM menu_items WHERE menu_code = 'customers'), 'customers_accounts', 'Cuentas por Cobrar', 'Estado de cuenta y facturas pendientes', 'bill-line', '/customers/accounts-receivable', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'AR_REPORTS_VIEW'), 40, 2, '/customers/accounts-receivable'),
((SELECT id FROM menu_items WHERE menu_code = 'customers'), 'customers_payments', 'Recibir Pagos', 'Registro de pagos de clientes', 'hand-coin-line', '/customers/payments', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PAYMENTS_RECEIVE'), 50, 2, '/customers/payments'),
((SELECT id FROM menu_items WHERE menu_code = 'customers'), 'customers_statements', 'Estados de Cuenta', 'Generar estados de cuenta detallados', 'file-text-line', '/customers/statements', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CUSTOMER_STATEMENTS_GENERATE'), 60, 2, '/customers/statements'),
((SELECT id FROM menu_items WHERE menu_code = 'customers'), 'customers_overdue', 'Clientes Morosos', 'Gestión de clientes en mora', 'alarm-warning-line', '/customers/overdue', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'AR_REPORTS_VIEW'), 70, 2, '/customers/overdue');

-- Submenús de Control de Caja (nivel 2)
INSERT INTO menu_items (parent_id, menu_code, menu_name, menu_description, icon_name, menu_url, menu_type, required_permission_id, sort_order, menu_level, menu_path) VALUES
((SELECT id FROM menu_items WHERE menu_code = 'cash_control'), 'cash_open', 'Abrir Caja', 'Apertura de turno de caja', 'lock-unlock-line', '/cash-control/open', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CASH_REGISTER_OPEN'), 10, 2, '/cash-control/open'),
((SELECT id FROM menu_items WHERE menu_code = 'cash_control'), 'cash_close', 'Cerrar Caja', 'Cierre y cuadratura de caja', 'lock-line', '/cash-control/close', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CASH_REGISTER_CLOSE'), 20, 2, '/cash-control/close'),
((SELECT id FROM menu_items WHERE menu_code = 'cash_control'), 'cash_status', 'Estado de Caja', 'Estado actual y movimientos del turno', 'dashboard-3-line', '/cash-control/status', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CASH_MOVEMENTS_VIEW'), 30, 2, '/cash-control/status'),
((SELECT id FROM menu_items WHERE menu_code = 'cash_control'), 'cash_movements', 'Movimientos de Caja', 'Historial de movimientos de efectivo', 'exchange-funds-line', '/cash-control/movements', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CASH_MOVEMENTS_VIEW'), 40, 2, '/cash-control/movements'),
((SELECT id FROM menu_items WHERE menu_code = 'cash_control'), 'petty_cash', 'Caja Chica', 'Gestión de gastos de caja chica', 'wallet-3-line', '/cash-control/petty-cash', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PETTY_CASH_SPEND'), 50, 2, '/cash-control/petty-cash'),
((SELECT id FROM menu_items WHERE menu_code = 'cash_control'), 'cash_reconciliation', 'Cuadraturas', 'Revisión y supervisión de cierres', 'calculator-line', '/cash-control/reconciliation', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CASH_REGISTER_SUPERVISE'), 60, 2, '/cash-control/reconciliation');

-- Submenús de Reportes (nivel 2)
INSERT INTO menu_items (parent_id, menu_code, menu_name, menu_description, icon_name, menu_url, menu_type, required_permission_id, sort_order, menu_level, menu_path) VALUES
((SELECT id FROM menu_items WHERE menu_code = 'reports'), 'reports_sales', 'Reportes de Ventas', 'Análisis de ventas por período', 'line-chart-line', '/reports/sales', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'REPORTS_VIEW'), 10, 2, '/reports/sales'),
((SELECT id FROM menu_items WHERE menu_code = 'reports'), 'reports_inventory', 'Reportes de Inventario', 'Stock, rotación y valorización', 'pie-chart-line', '/reports/inventory', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'REPORTS_VIEW'), 20, 2, '/reports/inventory'),
((SELECT id FROM menu_items WHERE menu_code = 'reports'), 'reports_cash', 'Reportes de Caja', 'Cuadraturas y movimientos de caja', 'funds-line', '/reports/cash', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CASH_REPORTS_VIEW'), 30, 2, '/reports/cash'),
((SELECT id FROM menu_items WHERE menu_code = 'reports'), 'reports_customers', 'Reportes de Clientes', 'Cuentas por cobrar y aging', 'user-star-line', '/reports/customers', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'AR_REPORTS_VIEW'), 40, 2, '/reports/customers'),
((SELECT id FROM menu_items WHERE menu_code = 'reports'), 'reports_products', 'Reportes de Productos', 'Productos más vendidos y rentabilidad', 'trophy-line', '/reports/products', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'REPORTS_VIEW'), 50, 2, '/reports/products'),
((SELECT id FROM menu_items WHERE menu_code = 'reports'), 'reports_financial', 'Reportes Financieros', 'Estados financieros y flujo de caja', 'money-dollar-circle-line', '/reports/financial', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'REPORTS_VIEW'), 60, 2, '/reports/financial');

-- Submenús de Administración (nivel 2)
INSERT INTO menu_items (parent_id, menu_code, menu_name, menu_description, icon_name, menu_url, menu_type, required_permission_id, sort_order, menu_level, menu_path) VALUES
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'admin_users', 'Usuarios', 'Gestión de usuarios del sistema', 'team-line', '/administration/users', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'USERS_MANAGE'), 10, 2, '/administration/users'),
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'admin_roles', 'Roles y Permisos', 'Configuración de roles y permisos', 'shield-user-line', '/administration/roles', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'ROLES_MANAGE'), 20, 2, '/administration/roles'),
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'admin_warehouses', 'Configurar Bodegas', 'Configuración de bodegas y puntos de venta', 'store-line', '/administration/warehouses-config', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSES_MANAGE'), 30, 2, '/administration/warehouses-config'),
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'admin_cash_registers', 'Cajas Registradoras', 'Configuración de cajas y terminales', 'computer-line', '/administration/cash-registers', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CASH_SETTINGS_MANAGE'), 40, 2, '/administration/cash-registers'),
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'admin_payment_methods', 'Métodos de Pago', 'Configuración de métodos de pago', 'bank-card-2-line', '/administration/payment-methods', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SYSTEM_CONFIG'), 50, 2, '/administration/payment-methods'),
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'admin_document_series', 'Series de Documentos', 'Configuración de numeración de documentos', 'file-list-3-line', '/administration/document-series', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SYSTEM_CONFIG'), 60, 2, '/administration/document-series'),
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'admin_system_features', 'Características del Sistema', 'Activar/desactivar funcionalidades', 'toggle-line', '/administration/system-features', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SYSTEM_CONFIG'), 70, 2, '/administration/system-features'),
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'admin_audit_log', 'Auditoría', 'Registro de cambios y accesos', 'history-line', '/administration/audit-log', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'AUDIT_VIEW'), 80, 2, '/administration/audit-log'),
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'admin_backup', 'Respaldos', 'Gestión de respaldos del sistema', 'save-line', '/administration/backup', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SYSTEM_CONFIG'), 90, 2, '/administration/backup'),
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'admin_menu_config', 'Configurar Menú', 'Configuración del sistema de menús', 'menu-line', '/administration/menu-config', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SYSTEM_CONFIG'), 100, 2, '/administration/menu-config');

-- Separadores y headers para organizar mejor el menú
INSERT INTO menu_items (parent_id, menu_code, menu_name, menu_description, menu_type, sort_order, menu_level, menu_path) VALUES
-- Separador en productos
((SELECT id FROM menu_items WHERE menu_code = 'products'), 'products_divider_1', '', 'Separador', 'DIVIDER', 35, 2, ''),
-- Header en reportes
((SELECT id FROM menu_items WHERE menu_code = 'reports'), 'reports_header_operational', 'Reportes Operacionales', 'Sección de reportes operacionales', 'HEADER', 5, 2, ''),
((SELECT id FROM menu_items WHERE menu_code = 'reports'), 'reports_divider_1', '', 'Separador', 'DIVIDER', 35, 2, ''),
((SELECT id FROM menu_items WHERE menu_code = 'reports'), 'reports_header_financial', 'Reportes Financieros', 'Sección de reportes financieros', 'HEADER', 55, 2, '');

-- =====================================================
-- SECCIÓN 4: DATOS DE CONFIGURACIÓN
-- =====================================================

-- Agregar nuevos permisos para gestión de menús
INSERT INTO permissions (permission_code, permission_name, permission_group) VALUES
('MENU_CONFIG_VIEW', 'Ver Configuración de Menú', 'MENU_SYSTEM'),
('MENU_CONFIG_EDIT', 'Editar Configuración de Menú', 'MENU_SYSTEM'),
('MENU_ITEMS_CREATE', 'Crear Elementos de Menú', 'MENU_SYSTEM'),
('MENU_ITEMS_DELETE', 'Eliminar Elementos de Menú', 'MENU_SYSTEM'),
('MENU_ACCESS_LOGS_VIEW', 'Ver Logs de Acceso a Menú', 'MENU_SYSTEM'),
('MENU_FAVORITES_MANAGE', 'Gestionar Favoritos de Menú', 'MENU_SYSTEM');

-- Configuración del sistema para menús
INSERT INTO system_features (feature_code, feature_name, feature_description, feature_type, default_value, current_value) VALUES
('MENU_FAVORITES_ENABLED', 'Menús Favoritos Habilitados', 'Permite a usuarios marcar menús como favoritos', 'BOOLEAN', 'true', 'true'),
('MENU_ACCESS_LOGGING', 'Registro de Acceso a Menú', 'Registrar accesos a elementos del menú para analítica', 'BOOLEAN', 'true', 'true'),
('MENU_DYNAMIC_ORDERING', 'Ordenamiento Dinámico de Menú', 'Permite reordenar elementos del menú dinámicamente', 'BOOLEAN', 'false', 'false'),
('MENU_BREADCRUMBS_ENABLED', 'Breadcrumbs Habilitados', 'Mostrar navegación breadcrumb basada en menú', 'BOOLEAN', 'true', 'true');

-- =====================================================
-- SECCIÓN 5: VISTAS ADICIONALES PARA FRONTEND
-- =====================================================

-- Vista menú jerárquico para React Tree Component
CREATE VIEW v_menu_tree_structure AS
WITH RECURSIVE menu_hierarchy AS (
    -- Nivel raíz
    SELECT 
        m.id,
        m.parent_id,
        m.menu_code,
        m.menu_name,
        m.icon_name,
        m.icon_color,
        m.menu_url,
        m.menu_type,
        m.sort_order,
        m.menu_level,
        CAST(m.id AS CHAR(200)) as path,
        JSON_OBJECT(
            'id', m.id,
            'code', m.menu_code,
            'name', m.menu_name,
            'icon', m.icon_name,
            'iconColor', m.icon_color,
            'url', m.menu_url,
            'type', m.menu_type,
            'level', m.menu_level,
            'children', JSON_ARRAY()
        ) as menu_node
    FROM menu_items m
    WHERE m.parent_id IS NULL 
        AND m.deleted_at IS NULL
        AND m.is_active = TRUE
        AND m.is_visible = TRUE
    
    UNION ALL
    
    -- Niveles hijos
    SELECT 
        m.id,
        m.parent_id,
        m.menu_code,
        m.menu_name,
        m.icon_name,
        m.icon_color,
        m.menu_url,
        m.menu_type,
        m.sort_order,
        m.menu_level,
        CONCAT(mh.path, '->', m.id) as path,
        JSON_OBJECT(
            'id', m.id,
            'code', m.menu_code,
            'name', m.menu_name,
            'icon', m.icon_name,
            'iconColor', m.icon_color,
            'url', m.menu_url,
            'type', m.menu_type,
            'level', m.menu_level,
            'children', JSON_ARRAY()
        ) as menu_node
    FROM menu_items m
    JOIN menu_hierarchy mh ON m.parent_id = mh.id
    WHERE m.deleted_at IS NULL
        AND m.is_active = TRUE
        AND m.is_visible = TRUE
)
SELECT * FROM menu_hierarchy
ORDER BY menu_level, sort_order;

-- Vista menús favoritos por usuario
CREATE VIEW v_user_favorites_menu AS
SELECT 
    u.id as user_id,
    u.username,
    m.id as menu_item_id,
    m.menu_code,
    m.menu_name,
    m.icon_name,
    m.icon_color,
    m.menu_url,
    umf.favorite_order,
    umf.created_at as favorited_at
FROM users u
JOIN user_menu_favorites umf ON u.id = umf.user_id
JOIN menu_items m ON umf.menu_item_id = m.id
WHERE u.deleted_at IS NULL 
    AND m.deleted_at IS NULL
    AND m.is_active = TRUE
ORDER BY u.id, umf.favorite_order;

-- =====================================================
-- PROCEDIMIENTOS PARA API/FRONTEND
-- =====================================================

-- Procedimiento para obtener menú completo del usuario (para API)
DELIMITER //

CREATE PROCEDURE get_user_menu_api(
    IN p_user_id BIGINT UNSIGNED,
    IN p_include_favorites BOOLEAN
)
BEGIN
    -- Si no se pasa el valor para p_include_favorites, establecerlo en TRUE por defecto
    IF p_include_favorites IS NULL THEN
        SET p_include_favorites = TRUE;
    END IF;

    -- Menú principal
    SELECT 
        menu_item_id AS id,
        parent_id,
        menu_code AS code,
        menu_name AS name,
        menu_description AS description,
        icon_name AS icon,
        icon_color AS iconColor,
        menu_url AS url,
        menu_type AS type,
        sort_order AS sortOrder,
        menu_level AS level,
        menu_path AS path,
        target_window AS target,
        css_classes AS cssClasses,
        data_attributes AS dataAttributes,
        is_favorite AS isFavorite,
        favorite_order AS favoriteOrder
    FROM v_user_menu 
    WHERE user_id = p_user_id 
        AND has_access = TRUE
    ORDER BY menu_level, sort_order, menu_name;
    
    -- Menús favoritos (si se solicitan)
    IF p_include_favorites THEN
        SELECT 
            menu_item_id AS id,
            menu_code AS code,
            menu_name AS name,
            icon_name AS icon,
            icon_color AS iconColor,
            menu_url AS url,
            favorite_order AS orderReg,
            favorited_at AS favoritedAt
        FROM v_user_favorites_menu
        WHERE user_id = p_user_id
        ORDER BY favorite_order;
    END IF;
END//

DELIMITER ;

-- Procedimiento para búsqueda de menús
DELIMITER //

CREATE PROCEDURE search_menu_items(
    IN p_user_id BIGINT UNSIGNED,
    IN p_search_term VARCHAR(255)
)
BEGIN
    SELECT 
        menu_item_id AS id,
        menu_code AS code,
        menu_name AS name,
        menu_description AS description,
        icon_name AS icon,
        icon_color AS iconColor,
        menu_url AS url,
        menu_path AS path,
        MATCH(menu_name, menu_description) AGAINST(p_search_term IN BOOLEAN MODE) AS relevance
    FROM v_user_menu 
    WHERE user_id = p_user_id 
        AND has_access = TRUE
        AND MATCH(menu_name, menu_description) AGAINST(p_search_term IN BOOLEAN MODE)
    ORDER BY relevance DESC, menu_name ASC
    LIMIT 20;
END//

DELIMITER ;


SET FOREIGN_KEY_CHECKS = 1;