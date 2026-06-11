-- =====================================================
-- Seed menu y permisos de menu
-- Archivo: 20260603_1332_seed_menu.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

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
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'admin_cash_registers', 'Cajas Registradoras', 'Configuración de cajas y terminales', 'computer-line', '/administration/cash-registers', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CASH_SETTINGS_MANAGE'), 40, 2, '/administration/cash-registers'),
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'admin_payment_methods', 'Métodos de Pago', 'Configuración de métodos de pago', 'bank-card-2-line', '/administration/payment-methods', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SYSTEM_CONFIG'), 50, 2, '/administration/payment-methods'),
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'admin_document_series', 'Series de Documentos', 'Configuración de numeración de documentos', 'file-list-3-line', '/administration/document-series', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SYSTEM_CONFIG'), 60, 2, '/administration/document-series'),
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'admin_system_features', 'Características del Sistema', 'Activar/desactivar funcionalidades', 'toggle-line', '/administration/system-features', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SYSTEM_CONFIG'), 70, 2, '/administration/system-features'),
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'admin_audit_log', 'Auditoría', 'Registro de cambios y accesos', 'history-line', '/administration/audit-log', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'AUDIT_VIEW'), 80, 2, '/administration/audit-log'),
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'admin_backup', 'Respaldos', 'Gestión de respaldos del sistema', 'save-line', '/administration/backup', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SYSTEM_CONFIG'), 90, 2, '/administration/backup');

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

SET FOREIGN_KEY_CHECKS = 1;
