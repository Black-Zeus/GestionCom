-- Permisos de acceso por submodulo/opcion de menu.
-- Regla: *_VISIBLE habilita la seccion; *_ACCESS habilita la opcion interna.

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

INSERT INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active) VALUES
('DASHBOARD_ACCESS', 'Acceder a Dashboard principal', 'HOME', 'Permite acceder a la opcion Dashboard principal.', TRUE),
('NOTIFICATIONS_ACCESS', 'Acceder a Centro de notificaciones', 'HOME', 'Permite acceder a la opcion Centro de notificaciones.', TRUE),
('NEW_SALE_ACCESS', 'Acceder a Nueva venta', 'SALES', 'Permite acceder a la opcion Nueva venta.', TRUE),
('CASH_POS_ACCESS', 'Acceder a Cobro en caja POS', 'SALES', 'Permite acceder a la opcion Cobro en caja POS.', TRUE),
('SALES_HISTORY_ACCESS', 'Acceder a Historial de ventas', 'SALES', 'Permite acceder a la opcion Historial de ventas.', TRUE),
('PROMOTIONS_ACCESS', 'Acceder a Promociones', 'PRICING', 'Permite acceder a la opcion Promociones.', TRUE),
('CUSTOMERS_ACCESS', 'Acceder a Clientes', 'CUSTOMERS', 'Permite acceder a la opcion Clientes.', TRUE),
('ACCOUNT_STATUS_ACCESS', 'Acceder a Estado de cuenta', 'CUSTOMERS', 'Permite acceder a la opcion Estado de cuenta.', TRUE),
('CUSTOMER_CREDIT_ACCESS', 'Acceder a Creditos y limites', 'CUSTOMERS', 'Permite acceder a la opcion Creditos y limites.', TRUE),
('AUTHORIZED_PERSONS_ACCESS', 'Acceder a Personas autorizadas', 'CUSTOMERS', 'Permite acceder a la opcion Personas autorizadas.', TRUE),
('PURCHASE_HISTORY_ACCESS', 'Acceder a Historial de compras', 'CUSTOMERS', 'Permite acceder a la opcion Historial de compras.', TRUE),
('CASH_OPENING_ACCESS', 'Acceder a Apertura y cierre de caja', 'CASH_CONTROL', 'Permite acceder a la opcion Apertura y cierre de caja.', TRUE),
('CASH_COUNT_ACCESS', 'Acceder a Arqueo de caja', 'CASH_CONTROL', 'Permite acceder a la opcion Arqueo de caja.', TRUE),
('CASH_MOVEMENTS_ACCESS', 'Acceder a Movimientos de caja', 'CASH_CONTROL', 'Permite acceder a la opcion Movimientos de caja.', TRUE),
('PETTY_CASH_ACCESS', 'Acceder a Caja chica operativa', 'CASH_CONTROL', 'Permite acceder a la opcion Caja chica operativa.', TRUE),
('PRODUCTS_ACCESS', 'Acceder a Productos', 'INVENTORY', 'Permite acceder a la opcion Productos.', TRUE),
('STOCK_MOVEMENTS_ACCESS', 'Acceder a Movimientos de stock', 'INVENTORY', 'Permite acceder a la opcion Movimientos de stock.', TRUE),
('PHYSICAL_INVENTORY_ACCESS', 'Acceder a Inventario fisico', 'INVENTORY', 'Permite acceder a la opcion Inventario fisico.', TRUE),
('INVENTORY_ADJUSTMENTS_ACCESS', 'Acceder a Ajustes de inventario', 'INVENTORY', 'Permite acceder a la opcion Ajustes de inventario.', TRUE),
('TRANSFERS_ACCESS', 'Acceder a Transferencias de stock', 'INVENTORY', 'Permite acceder a la opcion Transferencias de stock.', TRUE),
('PRICE_LISTS_ACCESS', 'Acceder a Listas de precios', 'INVENTORY', 'Permite acceder a la opcion Listas de precios.', TRUE),
('CATEGORIES_ACCESS', 'Acceder a Categorias de productos', 'INVENTORY', 'Permite acceder a la opcion Categorias de productos.', TRUE),
('BARCODES_ACCESS', 'Acceder a Codigos de barra', 'INVENTORY', 'Permite acceder a la opcion Codigos de barra.', TRUE),
('SUPPLIERS_ACCESS', 'Acceder a Proveedores', 'SUPPLIERS', 'Permite acceder a la opcion Proveedores.', TRUE),
('PURCHASE_ORDERS_ACCESS', 'Acceder a Ordenes de compra', 'PURCHASES', 'Permite acceder a la opcion Ordenes de compra.', TRUE),
('SUPPLIER_PAYABLE_ACCESS', 'Acceder a Cuentas por pagar proveedor', 'SUPPLIERS', 'Permite acceder a la opcion Cuentas por pagar proveedor.', TRUE),
('SUPPLIER_PRODUCTS_ACCESS', 'Acceder a Productos por proveedor', 'SUPPLIERS', 'Permite acceder a la opcion Productos por proveedor.', TRUE),
('SUPPLIER_HISTORY_ACCESS', 'Acceder a Historial de compras a proveedor', 'SUPPLIERS', 'Permite acceder a la opcion Historial de compras a proveedor.', TRUE),
('SUPPLIER_CONTACTS_ACCESS', 'Acceder a Contactos de proveedores', 'SUPPLIERS', 'Permite acceder a la opcion Contactos de proveedores.', TRUE),
('EXPENSES_ACCESS', 'Acceder a Gastos operativos', 'FINANCE', 'Permite acceder a la opcion Gastos operativos.', TRUE),
('ADDITIONAL_INCOME_ACCESS', 'Acceder a Ingresos adicionales', 'FINANCE', 'Permite acceder a la opcion Ingresos adicionales.', TRUE),
('SUPPLIER_PAYMENTS_ACCESS', 'Acceder a Pagos a proveedores', 'FINANCE', 'Permite acceder a la opcion Pagos a proveedores.', TRUE),
('BANK_RECONCILIATION_ACCESS', 'Acceder a Conciliacion bancaria', 'FINANCE', 'Permite acceder a la opcion Conciliacion bancaria.', TRUE),
('COMMERCIAL_DOCUMENTS_ACCESS', 'Acceder a Documentos comerciales', 'DOCUMENTS', 'Permite acceder a la opcion Documentos comerciales.', TRUE),
('RETURNS_ACCESS', 'Acceder a Devoluciones', 'RETURNS', 'Permite acceder a la opcion Devoluciones.', TRUE),
('CREDIT_NOTES_ACCESS', 'Acceder a Notas de credito', 'RETURNS', 'Permite acceder a la opcion Notas de credito.', TRUE),
('DOCUMENT_SERIES_ACCESS', 'Acceder a Series de documentos', 'DOCUMENTS', 'Permite acceder a la opcion Series de documentos.', TRUE),
('DOCUMENT_TEMPLATES_ACCESS', 'Acceder a Plantillas de documentos', 'DOCUMENTS', 'Permite acceder a la opcion Plantillas de documentos.', TRUE),
('SALES_METRICS_ACCESS', 'Acceder a Metricas de ventas', 'METRICS', 'Permite acceder a la opcion Metricas de ventas.', TRUE),
('INVENTORY_METRICS_ACCESS', 'Acceder a Metricas de inventario', 'METRICS', 'Permite acceder a la opcion Metricas de inventario.', TRUE),
('CASH_METRICS_ACCESS', 'Acceder a Metricas de caja', 'METRICS', 'Permite acceder a la opcion Metricas de caja.', TRUE),
('CUSTOMER_METRICS_ACCESS', 'Acceder a Metricas de clientes', 'METRICS', 'Permite acceder a la opcion Metricas de clientes.', TRUE),
('DAILY_SALES_ACCESS', 'Acceder a Ventas diarias', 'REPORTS', 'Permite acceder a la opcion Ventas diarias.', TRUE),
('SALES_BY_SELLER_ACCESS', 'Acceder a Ventas por vendedor', 'REPORTS', 'Permite acceder a la opcion Ventas por vendedor.', TRUE),
('TOP_PRODUCTS_ACCESS', 'Acceder a Productos mas vendidos', 'REPORTS', 'Permite acceder a la opcion Productos mas vendidos.', TRUE),
('LOW_STOCK_ACCESS', 'Acceder a Inventario bajo stock', 'REPORTS', 'Permite acceder a la opcion Inventario bajo stock.', TRUE),
('CASH_FLOW_ACCESS', 'Acceder a Flujo de caja', 'REPORTS', 'Permite acceder a la opcion Flujo de caja.', TRUE),
('PROFITABILITY_ACCESS', 'Acceder a Analisis de rentabilidad', 'REPORTS', 'Permite acceder a la opcion Analisis de rentabilidad.', TRUE),
('FINANCIAL_AUDIT_ACCESS', 'Acceder a Auditoria financiera', 'AUDIT', 'Permite acceder a la opcion Auditoria financiera.', TRUE),
('SYSTEM_AUDIT_REPORT_ACCESS', 'Acceder a Auditoria del sistema', 'AUDIT', 'Permite acceder a la opcion Auditoria del sistema.', TRUE),
('USER_ACTIVITY_REPORT_ACCESS', 'Acceder a Actividad de usuarios', 'AUDIT', 'Permite acceder a la opcion Actividad de usuarios.', TRUE),
('COMPANY_CONFIG_ACCESS', 'Acceder a Configuracion de empresa', 'SETTINGS', 'Permite acceder a la opcion Configuracion de empresa.', TRUE),
('SYSTEM_PARAMETERS_ACCESS', 'Acceder a Parametros del sistema', 'SETTINGS', 'Permite acceder a la opcion Parametros del sistema.', TRUE),
('TAX_CONFIG_ACCESS', 'Acceder a Configuracion de impuestos', 'SETTINGS', 'Permite acceder a la opcion Configuracion de impuestos.', TRUE),
('PAYMENT_METHODS_ACCESS', 'Acceder a Metodos de pago', 'SETTINGS', 'Permite acceder a la opcion Metodos de pago.', TRUE),
('BACKUP_ACCESS', 'Acceder a Backup y restauracion', 'SETTINGS', 'Permite acceder a la opcion Backup y restauracion.', TRUE),
('SYSTEM_LOGS_ACCESS', 'Acceder a Logs del sistema', 'SETTINGS', 'Permite acceder a la opcion Logs del sistema.', TRUE),
('SYSTEM_AUDIT_ACCESS', 'Acceder a Auditoria del sistema', 'SETTINGS', 'Permite acceder a la opcion Auditoria del sistema.', TRUE),
('USERS_ACCESS', 'Acceder a Usuarios', 'ADMIN', 'Permite acceder a la opcion Usuarios.', TRUE),
('ROLES_ACCESS', 'Acceder a Roles', 'ADMIN', 'Permite acceder a la opcion Roles.', TRUE),
('WAREHOUSES_ACCESS', 'Acceder a Bodegas', 'ADMIN', 'Permite acceder a la opcion Bodegas.', TRUE),
('CASH_POS_ADMIN_ACCESS', 'Acceder a Configuracion de caja POS', 'ADMIN', 'Permite acceder a la opcion Configuracion de caja POS.', TRUE),
('PETTY_CASH_ADMIN_ACCESS', 'Acceder a Administracion de caja chica', 'ADMIN', 'Permite acceder a la opcion Administracion de caja chica.', TRUE)
ON DUPLICATE KEY UPDATE
  permission_name = VALUES(permission_name),
  permission_group = VALUES(permission_group),
  permission_description = VALUES(permission_description),
  is_active = VALUES(is_active);

-- ADMIN y SUPER_ADMIN conservan acceso completo al menu.
INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code LIKE '%\_ACCESS'
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN');

-- Defaults operativos iniciales para no romper los perfiles demo.
INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'DASHBOARD_ACCESS',
  'NEW_SALE_ACCESS',
  'CASH_POS_ACCESS',
  'SALES_HISTORY_ACCESS',
  'RETURNS_ACCESS',
  'CREDIT_NOTES_ACCESS'
)
WHERE r.role_code = 'SALES_PERSON';

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'DASHBOARD_ACCESS',
  'CUSTOMERS_ACCESS',
  'ACCOUNT_STATUS_ACCESS',
  'CUSTOMER_CREDIT_ACCESS',
  'CASH_OPENING_ACCESS',
  'CASH_COUNT_ACCESS',
  'CASH_MOVEMENTS_ACCESS',
  'PETTY_CASH_ACCESS',
  'COMMERCIAL_DOCUMENTS_ACCESS',
  'RETURNS_ACCESS',
  'CREDIT_NOTES_ACCESS',
  'DAILY_SALES_ACCESS',
  'SALES_BY_SELLER_ACCESS',
  'CASH_FLOW_ACCESS',
  'PROFITABILITY_ACCESS'
)
WHERE r.role_code = 'ACCOUNTANT';

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'DASHBOARD_ACCESS',
  'PRODUCTS_ACCESS',
  'STOCK_MOVEMENTS_ACCESS',
  'PHYSICAL_INVENTORY_ACCESS',
  'INVENTORY_ADJUSTMENTS_ACCESS',
  'TRANSFERS_ACCESS',
  'CATEGORIES_ACCESS',
  'BARCODES_ACCESS',
  'LOW_STOCK_ACCESS'
)
WHERE r.role_code = 'WAREHOUSE_MANAGER';

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN ('DASHBOARD_ACCESS')
WHERE r.role_code = 'VIEWER';

UPDATE users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
SET
  u.secret = SHA2(CONCAT(UUID(), ':', u.id, ':', NOW(6)), 256),
  u.updated_at = NOW()
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN', 'SALES_PERSON', 'ACCOUNTANT', 'WAREHOUSE_MANAGER', 'VIEWER');
