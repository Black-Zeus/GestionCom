-- Alinea menu_items con la navegacion actual del frontend.
-- La BD queda como fuente oficial: *_VISIBLE controla secciones y *_ACCESS controla opciones.

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

INSERT IGNORE INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active) VALUES
('MENU_READ', 'Ver configuracion de menus', 'MENU', 'Permite consultar estructura y configuracion de menus.', TRUE),
('MENU_WRITE', 'Crear y editar menus', 'MENU', 'Permite crear y modificar menus.', TRUE),
('MENU_MANAGER', 'Gestionar menus', 'MENU', 'Permite administrar menus, orden y estados.', TRUE);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN ('MENU_READ', 'MENU_WRITE', 'MENU_MANAGER')
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN');

UPDATE menu_items
SET is_active = FALSE, is_visible = FALSE
WHERE menu_code IN (
  'dashboard',
  'products', 'products_list', 'products_create', 'products_variants', 'products_categories',
  'products_attributes', 'products_barcodes', 'products_divider_1',
  'inventory_stock', 'inventory_movements', 'inventory_adjustments', 'inventory_transfers',
  'inventory_counting', 'inventory_alerts', 'inventory_reorder',
  'sales_process', 'sales_search_presale', 'sales_search_document', 'sales_returns',
  'sales_exchanges', 'sales_cancel', 'sales_pricing', 'sales_returns_manage',
  'customers_list', 'customers_create', 'customers_credit', 'customers_accounts',
  'customers_payments', 'customers_statements', 'customers_overdue',
  'cash_control', 'cash_open', 'cash_close', 'cash_status', 'cash_movements',
  'petty_cash', 'cash_reconciliation',
  'reports', 'reports_sales', 'reports_inventory', 'reports_cash', 'reports_customers',
  'reports_products', 'reports_financial', 'reports_header_operational',
  'reports_divider_1', 'reports_header_financial',
  'administration', 'admin_users', 'admin_roles', 'admin_cash_registers',
  'admin_payment_methods', 'admin_document_series', 'admin_system_features',
  'admin_audit_log', 'admin_backup', 'admin_menu_config', 'admin_stock_critical'
);

INSERT INTO menu_items (
  parent_id, menu_code, menu_name, menu_description, icon_name, icon_color, menu_url,
  menu_type, required_permission_id, is_active, is_visible, sort_order, menu_level, menu_path
) VALUES
(NULL, 'home', 'Inicio', 'Inicio y tablero principal', 'home-line', '#2563EB', NULL, 'PARENT', (SELECT id FROM permissions WHERE permission_code = 'HOME_VISIBLE'), TRUE, TRUE, 10, 1, '/home'),
(NULL, 'sales', 'Ventas', 'Ventas, POS e historial comercial', 'shopping-cart-line', '#DC2626', NULL, 'PARENT', (SELECT id FROM permissions WHERE permission_code = 'SALES_VISIBLE'), TRUE, TRUE, 20, 1, '/sales'),
(NULL, 'customers', 'Clientes', 'Clientes, credito y estado de cuenta', 'user-line', '#7C3AED', NULL, 'PARENT', (SELECT id FROM permissions WHERE permission_code = 'CUSTOMERS_VISIBLE'), TRUE, TRUE, 30, 1, '/customers'),
(NULL, 'cash', 'Caja', 'Apertura, arqueo y movimientos de caja', 'wallet-3-line', '#0891B2', NULL, 'PARENT', (SELECT id FROM permissions WHERE permission_code = 'CASH_VISIBLE'), TRUE, TRUE, 40, 1, '/cash'),
(NULL, 'inventory', 'Inventario', 'Productos, stock y movimientos', 'archive-line', '#D97706', NULL, 'PARENT', (SELECT id FROM permissions WHERE permission_code = 'INVENTORY_VISIBLE'), TRUE, TRUE, 50, 1, '/inventory'),
(NULL, 'suppliers', 'Proveedores', 'Proveedores, compras y contactos', 'truck-line', '#0F766E', NULL, 'PARENT', (SELECT id FROM permissions WHERE permission_code = 'SUPPLIERS_VISIBLE'), TRUE, TRUE, 60, 1, '/suppliers'),
(NULL, 'finance', 'Finanzas', 'Gastos, ingresos y conciliacion', 'money-dollar-circle-line', '#16A34A', NULL, 'PARENT', (SELECT id FROM permissions WHERE permission_code = 'FINANCE_VISIBLE'), TRUE, TRUE, 70, 1, '/finance'),
(NULL, 'documents', 'Documentos', 'Documentos comerciales y devoluciones', 'file-text-line', '#4F46E5', NULL, 'PARENT', (SELECT id FROM permissions WHERE permission_code = 'DOCUMENTS_VISIBLE'), TRUE, TRUE, 80, 1, '/documents'),
(NULL, 'metrics', 'Metricas', 'Metricas operativas del negocio', 'line-chart-line', '#0284C7', NULL, 'PARENT', (SELECT id FROM permissions WHERE permission_code = 'METRICS_VISIBLE'), TRUE, TRUE, 90, 1, '/metrics'),
(NULL, 'management_reports', 'Reportes Gestion', 'Reportes de gestion operacional', 'bar-chart-line', '#65A30D', NULL, 'PARENT', (SELECT id FROM permissions WHERE permission_code = 'REPORTS_VISIBLE'), TRUE, TRUE, 100, 1, '/reports'),
(NULL, 'audit_reports', 'Reportes Auditoria', 'Reportes y trazabilidad de auditoria', 'file-search-line', '#9333EA', NULL, 'PARENT', (SELECT id FROM permissions WHERE permission_code = 'AUDIT_VISIBLE'), TRUE, TRUE, 110, 1, '/reports/audit'),
(NULL, 'settings', 'Configuracion', 'Parametros y configuracion del sistema', 'settings-line', '#475569', NULL, 'PARENT', (SELECT id FROM permissions WHERE permission_code = 'SETTINGS_VISIBLE'), TRUE, TRUE, 120, 1, '/config'),
(NULL, 'administration', 'Administracion', 'Administracion de usuarios, roles y recursos', 'shield-user-line', '#64748B', NULL, 'PARENT', (SELECT id FROM permissions WHERE permission_code = 'ADMIN_VISIBLE'), TRUE, TRUE, 130, 1, '/admin')
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  menu_name = VALUES(menu_name),
  menu_description = VALUES(menu_description),
  icon_name = VALUES(icon_name),
  icon_color = VALUES(icon_color),
  menu_url = VALUES(menu_url),
  menu_type = VALUES(menu_type),
  required_permission_id = VALUES(required_permission_id),
  is_active = VALUES(is_active),
  is_visible = VALUES(is_visible),
  sort_order = VALUES(sort_order),
  menu_level = VALUES(menu_level),
  menu_path = VALUES(menu_path);

INSERT INTO menu_items (
  parent_id, menu_code, menu_name, menu_description, icon_name, menu_url,
  menu_type, required_permission_id, is_active, is_visible, sort_order, menu_level, menu_path
) VALUES
((SELECT id FROM menu_items WHERE menu_code = 'home'), 'dashboard', 'Dashboard principal', 'Panel principal con resumen operativo', 'dashboard-line', '/dashboard', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'DASHBOARD_ACCESS'), TRUE, TRUE, 10, 2, '/dashboard'),
((SELECT id FROM menu_items WHERE menu_code = 'home'), 'notifications', 'Centro de notificaciones', 'Alertas y notificaciones del sistema', 'bell-line', '/notifications', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'NOTIFICATIONS_ACCESS'), TRUE, TRUE, 20, 2, '/notifications'),

((SELECT id FROM menu_items WHERE menu_code = 'sales'), 'new_sale', 'Nueva venta', 'Crear una nueva venta', 'shopping-cart-line', '/sales/new', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'NEW_SALE_ACCESS'), TRUE, TRUE, 10, 2, '/sales/new'),
((SELECT id FROM menu_items WHERE menu_code = 'sales'), 'cash_pos', 'Cobro en caja POS', 'Procesar cobro POS', 'credit-card-line', '/cash/pos', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CASH_POS_ACCESS'), TRUE, TRUE, 20, 2, '/cash/pos'),
((SELECT id FROM menu_items WHERE menu_code = 'sales'), 'sales_history', 'Historial de ventas', 'Historial y consulta de ventas', 'list-check-line', '/sales/history', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SALES_HISTORY_ACCESS'), TRUE, TRUE, 30, 2, '/sales/history'),
((SELECT id FROM menu_items WHERE menu_code = 'sales'), 'promotions', 'Promociones', 'Promociones comerciales', 'price-tag-line', '/sales/promotions', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PROMOTIONS_ACCESS'), TRUE, TRUE, 40, 2, '/sales/promotions'),

((SELECT id FROM menu_items WHERE menu_code = 'customers'), 'customers_list', 'Clientes', 'Maestro de clientes', 'team-line', '/customers', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CUSTOMERS_ACCESS'), TRUE, TRUE, 10, 2, '/customers'),
((SELECT id FROM menu_items WHERE menu_code = 'customers'), 'account_status', 'Estado de cuenta', 'Estado de cuenta de clientes', 'file-text-line', '/customers/account-status', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'ACCOUNT_STATUS_ACCESS'), TRUE, TRUE, 20, 2, '/customers/account-status'),
((SELECT id FROM menu_items WHERE menu_code = 'customers'), 'customer_credit', 'Creditos y limites', 'Credito y limites comerciales', 'credit-card-line', '/customers/credit-limits', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CUSTOMER_CREDIT_ACCESS'), TRUE, TRUE, 30, 2, '/customers/credit-limits'),
((SELECT id FROM menu_items WHERE menu_code = 'customers'), 'authorized_persons', 'Personas autorizadas', 'Personas autorizadas por cliente', 'shield-user-line', '/customers/authorized-persons', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'AUTHORIZED_PERSONS_ACCESS'), TRUE, TRUE, 40, 2, '/customers/authorized-persons'),
((SELECT id FROM menu_items WHERE menu_code = 'customers'), 'purchase_history', 'Historial de compras', 'Historial de compras de cliente', 'receipt-line', '/customers/purchase-history', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PURCHASE_HISTORY_ACCESS'), TRUE, TRUE, 50, 2, '/customers/purchase-history'),

((SELECT id FROM menu_items WHERE menu_code = 'cash'), 'cash_opening', 'Apertura / cierre de caja', 'Abrir o cerrar caja', 'lock-unlock-line', '/cash/opening', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CASH_OPENING_ACCESS'), TRUE, TRUE, 10, 2, '/cash/opening'),
((SELECT id FROM menu_items WHERE menu_code = 'cash'), 'cash_count', 'Arqueo de caja', 'Conteo y arqueo de caja', 'calculator-line', '/cash/count', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CASH_COUNT_ACCESS'), TRUE, TRUE, 20, 2, '/cash/count'),
((SELECT id FROM menu_items WHERE menu_code = 'cash'), 'cash_movements', 'Movimientos de caja', 'Movimientos de caja', 'exchange-line', '/cash/movements', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CASH_MOVEMENTS_ACCESS'), TRUE, TRUE, 30, 2, '/cash/movements'),
((SELECT id FROM menu_items WHERE menu_code = 'cash'), 'petty_cash', 'Caja chica operativa', 'Caja chica operativa', 'wallet-3-line', '/cash/petty', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PETTY_CASH_ACCESS'), TRUE, TRUE, 40, 2, '/cash/petty'),

((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'products', 'Productos', 'Maestro de productos', 'product-hunt-line', '/products', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PRODUCTS_ACCESS'), TRUE, TRUE, 10, 2, '/products'),
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'stock_movements', 'Movimientos de stock', 'Movimientos de stock', 'archive-line', '/stock/movements', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'STOCK_MOVEMENTS_ACCESS'), TRUE, TRUE, 20, 2, '/stock/movements'),
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'physical_inventory', 'Inventario fisico', 'Conteo fisico y conciliacion de inventario', 'list-check-line', '/stock/physical', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PHYSICAL_INVENTORY_ACCESS'), TRUE, TRUE, 30, 2, '/stock/physical'),
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'inventory_adjustments', 'Ajustes de inventario', 'Ajustes manuales de inventario', 'settings-line', '/stock/adjustments', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'INVENTORY_ADJUSTMENTS_ACCESS'), TRUE, TRUE, 40, 2, '/stock/adjustments'),
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'transfers', 'Transferencias de stock', 'Transferencias entre bodegas', 'truck-line', '/stock/transfers', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'TRANSFERS_ACCESS'), TRUE, TRUE, 50, 2, '/stock/transfers'),
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'price_lists', 'Listas de precios', 'Listas de precios', 'price-tag-line', '/price-lists', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PRICE_LISTS_ACCESS'), TRUE, TRUE, 60, 2, '/price-lists'),
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'categories', 'Categorias de productos', 'Categorias de productos', 'folder-line', '/categories', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CATEGORIES_ACCESS'), TRUE, TRUE, 70, 2, '/categories'),
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'barcodes', 'Codigos de barra', 'Codigos de barra', 'qr-code-line', '/barcodes', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'BARCODES_ACCESS'), TRUE, TRUE, 80, 2, '/barcodes'),

((SELECT id FROM menu_items WHERE menu_code = 'suppliers'), 'suppliers_list', 'Proveedores', 'Maestro de proveedores', 'truck-line', '/suppliers', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SUPPLIERS_ACCESS'), TRUE, TRUE, 10, 2, '/suppliers'),
((SELECT id FROM menu_items WHERE menu_code = 'suppliers'), 'purchase_orders', 'Ordenes de compra', 'Ordenes de compra', 'list-check-line', '/suppliers/purchase-orders', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PURCHASE_ORDERS_ACCESS'), TRUE, TRUE, 20, 2, '/suppliers/purchase-orders'),
((SELECT id FROM menu_items WHERE menu_code = 'suppliers'), 'supplier_payable', 'Cuentas por pagar proveedor', 'Cuentas por pagar proveedor', 'file-text-line', '/suppliers/accounts-payable', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SUPPLIER_PAYABLE_ACCESS'), TRUE, TRUE, 30, 2, '/suppliers/accounts-payable'),
((SELECT id FROM menu_items WHERE menu_code = 'suppliers'), 'supplier_products', 'Productos por proveedor', 'Productos por proveedor', 'product-hunt-line', '/suppliers/products', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SUPPLIER_PRODUCTS_ACCESS'), TRUE, TRUE, 40, 2, '/suppliers/products'),
((SELECT id FROM menu_items WHERE menu_code = 'suppliers'), 'supplier_history', 'Historial de compras a proveedor', 'Historial de compras a proveedor', 'receipt-line', '/suppliers/purchase-history', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SUPPLIER_HISTORY_ACCESS'), TRUE, TRUE, 50, 2, '/suppliers/purchase-history'),
((SELECT id FROM menu_items WHERE menu_code = 'suppliers'), 'supplier_contacts', 'Contactos de proveedores', 'Contactos de proveedores', 'team-line', '/suppliers/contacts', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SUPPLIER_CONTACTS_ACCESS'), TRUE, TRUE, 60, 2, '/suppliers/contacts'),

((SELECT id FROM menu_items WHERE menu_code = 'finance'), 'expenses', 'Gastos operativos', 'Gastos operativos', 'receipt-line', '/finance/expenses', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'EXPENSES_ACCESS'), TRUE, TRUE, 10, 2, '/finance/expenses'),
((SELECT id FROM menu_items WHERE menu_code = 'finance'), 'additional_income', 'Ingresos adicionales', 'Ingresos adicionales', 'money-dollar-circle-line', '/finance/additional-income', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'ADDITIONAL_INCOME_ACCESS'), TRUE, TRUE, 20, 2, '/finance/additional-income'),
((SELECT id FROM menu_items WHERE menu_code = 'finance'), 'supplier_payments', 'Pagos a proveedores', 'Pagos a proveedores', 'truck-line', '/finance/supplier-payments', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SUPPLIER_PAYMENTS_ACCESS'), TRUE, TRUE, 30, 2, '/finance/supplier-payments'),
((SELECT id FROM menu_items WHERE menu_code = 'finance'), 'bank_reconciliation', 'Conciliacion bancaria', 'Conciliacion bancaria', 'bank-card-line', '/finance/bank-reconciliation', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'BANK_RECONCILIATION_ACCESS'), TRUE, TRUE, 40, 2, '/finance/bank-reconciliation'),

((SELECT id FROM menu_items WHERE menu_code = 'documents'), 'commercial_documents', 'Documentos comerciales', 'Documentos comerciales', 'file-text-line', '/documents/commercial', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'COMMERCIAL_DOCUMENTS_ACCESS'), TRUE, TRUE, 10, 2, '/documents/commercial'),
((SELECT id FROM menu_items WHERE menu_code = 'documents'), 'returns', 'Devoluciones', 'Devoluciones', 'refund-line', '/returns', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'RETURNS_ACCESS'), TRUE, TRUE, 20, 2, '/returns'),
((SELECT id FROM menu_items WHERE menu_code = 'documents'), 'credit_notes', 'Notas de credito', 'Notas de credito', 'file-text-line', '/returns/credit-notes', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CREDIT_NOTES_ACCESS'), TRUE, TRUE, 30, 2, '/returns/credit-notes'),
((SELECT id FROM menu_items WHERE menu_code = 'documents'), 'document_series', 'Series de documentos', 'Series de documentos', 'list-check-line', '/documents/series', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'DOCUMENT_SERIES_ACCESS'), TRUE, TRUE, 40, 2, '/documents/series'),
((SELECT id FROM menu_items WHERE menu_code = 'documents'), 'document_templates', 'Plantillas de documentos', 'Plantillas de documentos', 'file-text-line', '/config/document-templates', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'DOCUMENT_TEMPLATES_ACCESS'), TRUE, TRUE, 50, 2, '/config/document-templates'),

((SELECT id FROM menu_items WHERE menu_code = 'metrics'), 'sales_metrics', 'Metricas de ventas', 'Metricas de ventas', 'line-chart-line', '/metrics/sales', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SALES_METRICS_ACCESS'), TRUE, TRUE, 10, 2, '/metrics/sales'),
((SELECT id FROM menu_items WHERE menu_code = 'metrics'), 'inventory_metrics', 'Metricas de inventario', 'Metricas de inventario', 'archive-line', '/metrics/inventory', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'INVENTORY_METRICS_ACCESS'), TRUE, TRUE, 20, 2, '/metrics/inventory'),
((SELECT id FROM menu_items WHERE menu_code = 'metrics'), 'cash_metrics', 'Metricas de caja', 'Metricas de caja', 'money-dollar-circle-line', '/metrics/cash', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CASH_METRICS_ACCESS'), TRUE, TRUE, 30, 2, '/metrics/cash'),
((SELECT id FROM menu_items WHERE menu_code = 'metrics'), 'customer_metrics', 'Metricas de clientes', 'Metricas de clientes', 'team-line', '/metrics/customers', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CUSTOMER_METRICS_ACCESS'), TRUE, TRUE, 40, 2, '/metrics/customers'),

((SELECT id FROM menu_items WHERE menu_code = 'management_reports'), 'daily_sales', 'Ventas diarias', 'Ventas diarias', 'bar-chart-line', '/reports/daily-sales', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'DAILY_SALES_ACCESS'), TRUE, TRUE, 10, 2, '/reports/daily-sales'),
((SELECT id FROM menu_items WHERE menu_code = 'management_reports'), 'sales_by_seller', 'Ventas por vendedor', 'Ventas por vendedor', 'bar-chart-line', '/reports/sales-by-seller', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SALES_BY_SELLER_ACCESS'), TRUE, TRUE, 20, 2, '/reports/sales-by-seller'),
((SELECT id FROM menu_items WHERE menu_code = 'management_reports'), 'top_products', 'Productos mas vendidos', 'Productos mas vendidos', 'bar-chart-line', '/reports/top-selling-products', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'TOP_PRODUCTS_ACCESS'), TRUE, TRUE, 30, 2, '/reports/top-selling-products'),
((SELECT id FROM menu_items WHERE menu_code = 'management_reports'), 'low_stock', 'Inventario bajo stock', 'Inventario bajo stock', 'archive-line', '/reports/low-stock', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'LOW_STOCK_ACCESS'), TRUE, TRUE, 40, 2, '/reports/low-stock'),
((SELECT id FROM menu_items WHERE menu_code = 'management_reports'), 'cash_flow', 'Flujo de caja', 'Flujo de caja', 'money-dollar-circle-line', '/reports/financial/cash-flow', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CASH_FLOW_ACCESS'), TRUE, TRUE, 50, 2, '/reports/financial/cash-flow'),
((SELECT id FROM menu_items WHERE menu_code = 'management_reports'), 'profitability', 'Analisis de rentabilidad', 'Analisis de rentabilidad', 'bar-chart-line', '/reports/financial/profitability-analysis', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PROFITABILITY_ACCESS'), TRUE, TRUE, 60, 2, '/reports/financial/profitability-analysis'),

((SELECT id FROM menu_items WHERE menu_code = 'audit_reports'), 'financial_audit', 'Auditoria financiera', 'Auditoria financiera', 'shield-user-line', '/reports/financial/financial-audit', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'FINANCIAL_AUDIT_ACCESS'), TRUE, TRUE, 10, 2, '/reports/financial/financial-audit'),
((SELECT id FROM menu_items WHERE menu_code = 'audit_reports'), 'system_audit_report', 'Auditoria del sistema', 'Auditoria del sistema', 'file-search-line', '/reports/audit/system', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SYSTEM_AUDIT_REPORT_ACCESS'), TRUE, TRUE, 20, 2, '/reports/audit/system'),
((SELECT id FROM menu_items WHERE menu_code = 'audit_reports'), 'user_activity_report', 'Actividad de usuarios', 'Actividad de usuarios', 'team-line', '/reports/audit/user-activity', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'USER_ACTIVITY_REPORT_ACCESS'), TRUE, TRUE, 30, 2, '/reports/audit/user-activity'),

((SELECT id FROM menu_items WHERE menu_code = 'settings'), 'company_config', 'Configuracion de empresa', 'Configuracion de empresa', 'building-line', '/config/company', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'COMPANY_CONFIG_ACCESS'), TRUE, TRUE, 10, 2, '/config/company'),
((SELECT id FROM menu_items WHERE menu_code = 'settings'), 'system_parameters', 'Parametros del sistema', 'Parametros del sistema', 'settings-line', '/config/system-parameters', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SYSTEM_PARAMETERS_ACCESS'), TRUE, TRUE, 20, 2, '/config/system-parameters'),
((SELECT id FROM menu_items WHERE menu_code = 'settings'), 'tax_config', 'Configuracion de impuestos', 'Configuracion de impuestos', 'receipt-line', '/config/taxes', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'TAX_CONFIG_ACCESS'), TRUE, TRUE, 30, 2, '/config/taxes'),
((SELECT id FROM menu_items WHERE menu_code = 'settings'), 'payment_methods', 'Metodos de pago', 'Metodos de pago', 'credit-card-line', '/config/payment-methods', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PAYMENT_METHODS_ACCESS'), TRUE, TRUE, 40, 2, '/config/payment-methods'),
((SELECT id FROM menu_items WHERE menu_code = 'settings'), 'backup', 'Backup y restauracion', 'Backup y restauracion', 'database-line', '/config/backup', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'BACKUP_ACCESS'), TRUE, TRUE, 50, 2, '/config/backup'),
((SELECT id FROM menu_items WHERE menu_code = 'settings'), 'system_logs', 'Logs del sistema', 'Logs del sistema', 'list-check-line', '/config/system-logs', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SYSTEM_LOGS_ACCESS'), TRUE, TRUE, 60, 2, '/config/system-logs'),
((SELECT id FROM menu_items WHERE menu_code = 'settings'), 'system_audit', 'Auditoria del sistema', 'Auditoria del sistema', 'shield-user-line', '/config/system-audit', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SYSTEM_AUDIT_ACCESS'), TRUE, TRUE, 70, 2, '/config/system-audit'),

((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'admin_users', 'Usuarios', 'Usuarios del sistema', 'team-line', '/admin/users', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'USER_READ'), TRUE, TRUE, 10, 2, '/admin/users'),
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'admin_roles', 'Roles', 'Roles y permisos', 'shield-user-line', '/admin/roles', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'USER_MANAGER'), TRUE, TRUE, 20, 2, '/admin/roles'),
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'warehouses', 'Bodegas', 'Bodegas y ubicaciones', 'building-line', '/admin/warehouses', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSES_ACCESS'), TRUE, TRUE, 30, 2, '/admin/warehouses'),
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'cash_pos_admin', 'Configuracion de caja POS', 'Configuracion de caja POS', 'credit-card-line', '/admin/cash-pos', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CASH_POS_ADMIN_ACCESS'), TRUE, TRUE, 40, 2, '/admin/cash-pos'),
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'petty_cash_admin', 'Administracion de caja chica', 'Administracion de caja chica', 'wallet-3-line', '/admin/cash-petty', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'PETTY_CASH_ADMIN_ACCESS'), TRUE, TRUE, 50, 2, '/admin/cash-petty'),
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'menu_config', 'Configuracion de menu', 'Configuracion de menu', 'settings-line', '/admin/menu', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'MENU_READ'), TRUE, TRUE, 60, 2, '/admin/menu')
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  menu_name = VALUES(menu_name),
  menu_description = VALUES(menu_description),
  icon_name = VALUES(icon_name),
  menu_url = VALUES(menu_url),
  menu_type = VALUES(menu_type),
  required_permission_id = VALUES(required_permission_id),
  is_active = VALUES(is_active),
  is_visible = VALUES(is_visible),
  sort_order = VALUES(sort_order),
  menu_level = VALUES(menu_level),
  menu_path = VALUES(menu_path);

UPDATE users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
SET
  u.secret = SHA2(CONCAT(UUID(), ':', u.id, ':', NOW(6)), 256),
  u.updated_at = NOW()
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN', 'SALES_PERSON', 'ACCOUNTANT', 'WAREHOUSE_MANAGER', 'VIEWER');
