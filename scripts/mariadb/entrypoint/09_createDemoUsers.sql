-- =====================================================
-- USUARIOS DEMO POR PERFIL
-- Archivo: 09_createDemoUsers.sql
-- Descripción: Crear usuarios de demostración para cada rol
-- Para probar el sistema de menús y permisos
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- SECCIÓN 1: CREACIÓN DE BODEGAS DEMO
-- =====================================================

-- Crear bodegas de ejemplo para los usuarios demo
INSERT INTO warehouses (warehouse_code, warehouse_name, warehouse_type, responsible_user_id, address, city, country, is_active) VALUES
-- Asumiendo que el usuario ID 1 es admin para responsible_user_id temporal
('TIENDA_CENTRO', 'Tienda Centro', 'STORE', 1, 'Av. Providencia 1234', 'Santiago', 'Chile', TRUE),
('TIENDA_MALL', 'Tienda Mall Plaza', 'STORE', 1, 'Mall Plaza Norte Local 45', 'Santiago', 'Chile', TRUE),
('BODEGA_CENTRAL', 'Bodega Central', 'WAREHOUSE', 1, 'Av. Industrial 5678', 'Santiago', 'Chile', TRUE),
('TIENDA_VALPO', 'Tienda Valparaíso', 'STORE', 1, 'Calle Condell 890', 'Valparaíso', 'Chile', TRUE);

-- =====================================================
-- SECCIÓN 2: USUARIOS DEMO
-- =====================================================

-- USUARIO 1: ADMINISTRADOR DEMO
INSERT INTO users (username, email, password_hash, first_name, last_name, phone, is_active, petty_cash_limit) VALUES
('admin.demo', 'admin@demo.com', SHA2('admin123', 256), 'Carlos', 'Administrador', '+56912345678', TRUE, NULL);

SET @admin_user_id = LAST_INSERT_ID();

-- USUARIO 2: CONTADOR DEMO
INSERT INTO users (username, email, password_hash, first_name, last_name, phone, is_active, petty_cash_limit) VALUES
('contador.demo', 'contador@demo.com', SHA2('contador123', 256), 'María', 'Contador', '+56912345679', TRUE, 100000.00);

SET @accountant_user_id = LAST_INSERT_ID();

-- USUARIO 3: JEFE DE BODEGA DEMO
INSERT INTO users (username, email, password_hash, first_name, last_name, phone, is_active, petty_cash_limit) VALUES
('jefe.bodega', 'jefe.bodega@demo.com', SHA2('bodega123', 256), 'Pedro', 'Jefe Bodega', '+56912345680', TRUE, 50000.00);

SET @warehouse_manager_user_id = LAST_INSERT_ID();

-- USUARIO 4: VENDEDOR TIENDA CENTRO
INSERT INTO users (username, email, password_hash, first_name, last_name, phone, is_active, petty_cash_limit) VALUES
('vendedor.centro', 'vendedor.centro@demo.com', SHA2('vendedor123', 256), 'Ana', 'Vendedora Centro', '+56912345681', TRUE, 30000.00);

SET @salesperson_centro_id = LAST_INSERT_ID();

-- USUARIO 5: VENDEDOR TIENDA MALL
INSERT INTO users (username, email, password_hash, first_name, last_name, phone, is_active, petty_cash_limit) VALUES
('vendedor.mall', 'vendedor.mall@demo.com', SHA2('vendedor123', 256), 'Luis', 'Vendedor Mall', '+56912345682', TRUE, 30000.00);

SET @salesperson_mall_id = LAST_INSERT_ID();

-- USUARIO 6: CAJERO DEMO
INSERT INTO users (username, email, password_hash, first_name, last_name, phone, is_active, petty_cash_limit) VALUES
('cajero.demo', 'cajero@demo.com', SHA2('cajero123', 256), 'Sofia', 'Cajera', '+56912345683', TRUE, 20000.00);

SET @cashier_user_id = LAST_INSERT_ID();

-- USUARIO 7: CONSULTOR/VIEWER DEMO
INSERT INTO users (username, email, password_hash, first_name, last_name, phone, is_active, petty_cash_limit) VALUES
('consultor.demo', 'consultor@demo.com', SHA2('consultor123', 256), 'Roberto', 'Consultor', '+56912345684', TRUE, NULL);

SET @viewer_user_id = LAST_INSERT_ID();

-- USUARIO 8: SUPERVISOR DEMO
INSERT INTO users (username, email, password_hash, first_name, last_name, phone, is_active, petty_cash_limit) VALUES
('supervisor.demo', 'supervisor@demo.com', SHA2('supervisor123', 256), 'Carmen', 'Supervisora', '+56912345685', TRUE, 75000.00);

SET @supervisor_user_id = LAST_INSERT_ID();

-- =====================================================
-- SECCIÓN 3: ASIGNACIÓN DE ROLES
-- =====================================================

-- ADMIN DEMO → ROL ADMIN
INSERT INTO user_roles (user_id, role_id, assigned_by_user_id) VALUES
(@admin_user_id, (SELECT id FROM roles WHERE role_code = 'ADMIN'), 1);

-- CONTADOR DEMO → ROL ACCOUNTANT
INSERT INTO user_roles (user_id, role_id, assigned_by_user_id) VALUES
(@accountant_user_id, (SELECT id FROM roles WHERE role_code = 'ACCOUNTANT'), @admin_user_id);

-- JEFE BODEGA → ROL WAREHOUSE_MANAGER
INSERT INTO user_roles (user_id, role_id, assigned_by_user_id) VALUES
(@warehouse_manager_user_id, (SELECT id FROM roles WHERE role_code = 'WAREHOUSE_MANAGER'), @admin_user_id);

-- VENDEDORES → ROL SALES_PERSON
INSERT INTO user_roles (user_id, role_id, assigned_by_user_id) VALUES
(@salesperson_centro_id, (SELECT id FROM roles WHERE role_code = 'SALES_PERSON'), @admin_user_id),
(@salesperson_mall_id, (SELECT id FROM roles WHERE role_code = 'SALES_PERSON'), @admin_user_id);

-- CAJERO → ROL SALES_PERSON (base para ventas)
INSERT INTO user_roles (user_id, role_id, assigned_by_user_id) VALUES
(@cashier_user_id, (SELECT id FROM roles WHERE role_code = 'SALES_PERSON'), @admin_user_id);

-- CONSULTOR → ROL VIEWER
INSERT INTO user_roles (user_id, role_id, assigned_by_user_id) VALUES
(@viewer_user_id, (SELECT id FROM roles WHERE role_code = 'VIEWER'), @admin_user_id);

-- SUPERVISOR → ROL WAREHOUSE_MANAGER
INSERT INTO user_roles (user_id, role_id, assigned_by_user_id) VALUES
(@supervisor_user_id, (SELECT id FROM roles WHERE role_code = 'WAREHOUSE_MANAGER'), @admin_user_id);

-- =====================================================
-- SECCIÓN 4: PERMISOS ADICIONALES ESPECÍFICOS
-- =====================================================

-- CONTADOR: Permisos adicionales para gestión financiera
INSERT INTO user_permissions (user_id, permission_id, permission_type, granted_by_user_id) VALUES
-- Permisos de caja (no incluidos en rol base)
(@accountant_user_id, (SELECT id FROM permissions WHERE permission_code = 'CASH_REGISTER_SUPERVISE'), 'GRANT', @admin_user_id),
(@accountant_user_id, (SELECT id FROM permissions WHERE permission_code = 'CASH_REPORTS_VIEW'), 'GRANT', @admin_user_id),
(@accountant_user_id, (SELECT id FROM permissions WHERE permission_code = 'PETTY_CASH_APPROVE'), 'GRANT', @admin_user_id);

-- VENDEDOR CENTRO: Permisos para transferir entre CENTRO y BODEGA_CENTRAL
INSERT INTO user_permissions (user_id, permission_id, permission_type, granted_by_user_id) VALUES
(@salesperson_centro_id, (SELECT id FROM permissions WHERE permission_code = 'STOCK_TRANSFER'), 'GRANT', @admin_user_id),
(@salesperson_centro_id, (SELECT id FROM permissions WHERE permission_code = 'MOVEMENTS_VIEW'), 'GRANT', @admin_user_id);

-- VENDEDOR MALL: Similar al centro
INSERT INTO user_permissions (user_id, permission_id, permission_type, granted_by_user_id) VALUES
(@salesperson_mall_id, (SELECT id FROM permissions WHERE permission_code = 'STOCK_TRANSFER'), 'GRANT', @admin_user_id),
(@salesperson_mall_id, (SELECT id FROM permissions WHERE permission_code = 'MOVEMENTS_VIEW'), 'GRANT', @admin_user_id);

-- CAJERO: Permisos específicos de caja
INSERT INTO user_permissions (user_id, permission_id, permission_type, granted_by_user_id) VALUES
(@cashier_user_id, (SELECT id FROM permissions WHERE permission_code = 'CASH_REGISTER_OPEN'), 'GRANT', @admin_user_id),
(@cashier_user_id, (SELECT id FROM permissions WHERE permission_code = 'CASH_REGISTER_CLOSE'), 'GRANT', @admin_user_id),
(@cashier_user_id, (SELECT id FROM permissions WHERE permission_code = 'CASH_MOVEMENTS_VIEW'), 'GRANT', @admin_user_id),
(@cashier_user_id, (SELECT id FROM permissions WHERE permission_code = 'PETTY_CASH_SPEND'), 'GRANT', @admin_user_id);

-- SUPERVISOR: Permisos adicionales de supervisión
INSERT INTO user_permissions (user_id, permission_id, permission_type, granted_by_user_id) VALUES
(@supervisor_user_id, (SELECT id FROM permissions WHERE permission_code = 'CASH_REGISTER_SUPERVISE'), 'GRANT', @admin_user_id),
(@supervisor_user_id, (SELECT id FROM permissions WHERE permission_code = 'CREDIT_EXCEPTIONS_AUTHORIZE'), 'GRANT', @admin_user_id),
(@supervisor_user_id, (SELECT id FROM permissions WHERE permission_code = 'PENALTIES_WAIVE'), 'GRANT', @admin_user_id);

-- =====================================================
-- SECCIÓN 5: ACCESO A BODEGAS POR USUARIO
-- =====================================================

-- ADMIN: Acceso completo a todas las bodegas
INSERT INTO user_warehouse_access (user_id, warehouse_id, access_type, granted_by_user_id) 
SELECT @admin_user_id, id, 'FULL', @admin_user_id 
FROM warehouses WHERE deleted_at IS NULL;

-- CONTADOR: Acceso de solo lectura a todas las bodegas
INSERT INTO user_warehouse_access (user_id, warehouse_id, access_type, granted_by_user_id) 
SELECT @accountant_user_id, id, 'READ_ONLY', @admin_user_id 
FROM warehouses WHERE deleted_at IS NULL;

-- JEFE BODEGA: Acceso completo a BODEGA_CENTRAL y lectura a tiendas
INSERT INTO user_warehouse_access (user_id, warehouse_id, access_type, granted_by_user_id) VALUES
(@warehouse_manager_user_id, (SELECT id FROM warehouses WHERE warehouse_code = 'BODEGA_CENTRAL'), 'FULL', @admin_user_id),
(@warehouse_manager_user_id, (SELECT id FROM warehouses WHERE warehouse_code = 'TIENDA_CENTRO'), 'READ_ONLY', @admin_user_id),
(@warehouse_manager_user_id, (SELECT id FROM warehouses WHERE warehouse_code = 'TIENDA_MALL'), 'READ_ONLY', @admin_user_id),
(@warehouse_manager_user_id, (SELECT id FROM warehouses WHERE warehouse_code = 'TIENDA_VALPO'), 'READ_ONLY', @admin_user_id);

-- VENDEDOR CENTRO: Acceso completo a TIENDA_CENTRO y lectura a BODEGA_CENTRAL
INSERT INTO user_warehouse_access (user_id, warehouse_id, access_type, granted_by_user_id) VALUES
(@salesperson_centro_id, (SELECT id FROM warehouses WHERE warehouse_code = 'TIENDA_CENTRO'), 'FULL', @admin_user_id),
(@salesperson_centro_id, (SELECT id FROM warehouses WHERE warehouse_code = 'BODEGA_CENTRAL'), 'READ_ONLY', @admin_user_id);

-- VENDEDOR MALL: Acceso completo a TIENDA_MALL y lectura a BODEGA_CENTRAL
INSERT INTO user_warehouse_access (user_id, warehouse_id, access_type, granted_by_user_id) VALUES
(@salesperson_mall_id, (SELECT id FROM warehouses WHERE warehouse_code = 'TIENDA_MALL'), 'FULL', @admin_user_id),
(@salesperson_mall_id, (SELECT id FROM warehouses WHERE warehouse_code = 'BODEGA_CENTRAL'), 'READ_ONLY', @admin_user_id);

-- CAJERO: Acceso completo solo a TIENDA_CENTRO
INSERT INTO user_warehouse_access (user_id, warehouse_id, access_type, granted_by_user_id) VALUES
(@cashier_user_id, (SELECT id FROM warehouses WHERE warehouse_code = 'TIENDA_CENTRO'), 'FULL', @admin_user_id);

-- CONSULTOR: Acceso de solo lectura a todas las bodegas
INSERT INTO user_warehouse_access (user_id, warehouse_id, access_type, granted_by_user_id) 
SELECT @viewer_user_id, id, 'READ_ONLY', @admin_user_id 
FROM warehouses WHERE deleted_at IS NULL;

-- SUPERVISOR: Acceso completo a tiendas, lectura a bodega central
INSERT INTO user_warehouse_access (user_id, warehouse_id, access_type, granted_by_user_id) VALUES
(@supervisor_user_id, (SELECT id FROM warehouses WHERE warehouse_code = 'TIENDA_CENTRO'), 'FULL', @admin_user_id),
(@supervisor_user_id, (SELECT id FROM warehouses WHERE warehouse_code = 'TIENDA_MALL'), 'FULL', @admin_user_id),
(@supervisor_user_id, (SELECT id FROM warehouses WHERE warehouse_code = 'TIENDA_VALPO'), 'FULL', @admin_user_id),
(@supervisor_user_id, (SELECT id FROM warehouses WHERE warehouse_code = 'BODEGA_CENTRAL'), 'READ_ONLY', @admin_user_id);

-- =====================================================
-- SECCIÓN 6: CONFIGURACIÓN ESPECÍFICA DE CADA USUARIO
-- =====================================================

-- Actualizar responsables de bodegas
UPDATE warehouses SET responsible_user_id = @warehouse_manager_user_id WHERE warehouse_code = 'BODEGA_CENTRAL';
UPDATE warehouses SET responsible_user_id = @salesperson_centro_id WHERE warehouse_code = 'TIENDA_CENTRO';
UPDATE warehouses SET responsible_user_id = @salesperson_mall_id WHERE warehouse_code = 'TIENDA_MALL';
UPDATE warehouses SET responsible_user_id = @supervisor_user_id WHERE warehouse_code = 'TIENDA_VALPO';

-- =====================================================
-- SECCIÓN 7: MENÚS FAVORITOS DEMO
-- =====================================================

-- Favoritos para VENDEDOR CENTRO (sus menús más usados)
INSERT INTO user_menu_favorites (user_id, menu_item_id, favorite_order) VALUES
(@salesperson_centro_id, (SELECT id FROM menu_items WHERE menu_code = 'sales_new'), 1),
(@salesperson_centro_id, (SELECT id FROM menu_items WHERE menu_code = 'sales_search_presale'), 2),
(@salesperson_centro_id, (SELECT id FROM menu_items WHERE menu_code = 'inventory_stock'), 3),
(@salesperson_centro_id, (SELECT id FROM menu_items WHERE menu_code = 'customers_list'), 4);

-- Favoritos para CAJERO
INSERT INTO user_menu_favorites (user_id, menu_item_id, favorite_order) VALUES
(@cashier_user_id, (SELECT id FROM menu_items WHERE menu_code = 'cash_open'), 1),
(@cashier_user_id, (SELECT id FROM menu_items WHERE menu_code = 'sales_process'), 2),
(@cashier_user_id, (SELECT id FROM menu_items WHERE menu_code = 'cash_status'), 3),
(@cashier_user_id, (SELECT id FROM menu_items WHERE menu_code = 'cash_close'), 4);

-- Favoritos para CONTADOR
INSERT INTO user_menu_favorites (user_id, menu_item_id, favorite_order) VALUES
(@accountant_user_id, (SELECT id FROM menu_items WHERE menu_code = 'customers_accounts'), 1),
(@accountant_user_id, (SELECT id FROM menu_items WHERE menu_code = 'customers_overdue'), 2),
(@accountant_user_id, (SELECT id FROM menu_items WHERE menu_code = 'reports_financial'), 3),
(@accountant_user_id, (SELECT id FROM menu_items WHERE menu_code = 'cash_reconciliation'), 4);

-- Favoritos para JEFE BODEGA
INSERT INTO user_menu_favorites (user_id, menu_item_id, favorite_order) VALUES
(@warehouse_manager_user_id, (SELECT id FROM menu_items WHERE menu_code = 'inventory_stock'), 1),
(@warehouse_manager_user_id, (SELECT id FROM menu_items WHERE menu_code = 'inventory_movements'), 2),
(@warehouse_manager_user_id, (SELECT id FROM menu_items WHERE menu_code = 'inventory_transfers'), 3),
(@warehouse_manager_user_id, (SELECT id FROM menu_items WHERE menu_code = 'products_list'), 4);

-- =====================================================
-- SECCIÓN 8: CAJAS REGISTRADORAS DEMO
-- =====================================================

-- Crear cajas registradoras para testing
INSERT INTO cash_registers (register_code, register_name, warehouse_id, terminal_identifier, ip_address, location_description, is_active) VALUES
('CAJA01_CENTRO', 'Caja 1 - Tienda Centro', (SELECT id FROM warehouses WHERE warehouse_code = 'TIENDA_CENTRO'), 'TERMINAL-001', '192.168.1.101', 'Caja principal tienda centro', TRUE),
('CAJA02_CENTRO', 'Caja 2 - Tienda Centro', (SELECT id FROM warehouses WHERE warehouse_code = 'TIENDA_CENTRO'), 'TERMINAL-002', '192.168.1.102', 'Caja secundaria tienda centro', TRUE),
('CAJA01_MALL', 'Caja 1 - Tienda Mall', (SELECT id FROM warehouses WHERE warehouse_code = 'TIENDA_MALL'), 'TERMINAL-003', '192.168.1.103', 'Caja principal tienda mall', TRUE),
('CAJA01_VALPO', 'Caja 1 - Tienda Valparaíso', (SELECT id FROM warehouses WHERE warehouse_code = 'TIENDA_VALPO'), 'TERMINAL-004', '192.168.1.104', 'Caja tienda valparaíso', TRUE);

-- =====================================================
-- SECCIÓN 9: DATOS DEMO ADICIONALES
-- =====================================================

-- Crear fondos de caja chica
INSERT INTO petty_cash_funds (fund_code, warehouse_id, responsible_user_id, initial_amount, current_balance, fund_status) VALUES
('CCHICA_CENTRO', (SELECT id FROM warehouses WHERE warehouse_code = 'TIENDA_CENTRO'), @salesperson_centro_id, 50000.00, 50000.00, 'ACTIVE'),
('CCHICA_MALL', (SELECT id FROM warehouses WHERE warehouse_code = 'TIENDA_MALL'), @salesperson_mall_id, 50000.00, 50000.00, 'ACTIVE'),
('CCHICA_VALPO', (SELECT id FROM warehouses WHERE warehouse_code = 'TIENDA_VALPO'), @supervisor_user_id, 30000.00, 30000.00, 'ACTIVE');

-- Configuración de crédito para usuarios demo (esto sería para clientes, pero sirve como ejemplo)
-- Se podría usar para crear clientes demo más adelante

-- =====================================================
-- SECCIÓN 10: CONSULTAS DE VERIFICACIÓN
-- =====================================================

-- Consulta para verificar usuarios creados
SELECT 
    'USUARIOS DEMO CREADOS' as titulo,
    u.username,
    u.first_name,
    u.last_name,
    r.role_name,
    u.petty_cash_limit,
    COUNT(uwa.id) as bodegas_asignadas,
    COUNT(umf.id) as menus_favoritos
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN user_warehouse_access uwa ON u.id = uwa.user_id
LEFT JOIN user_menu_favorites umf ON u.id = umf.user_id
WHERE u.username LIKE '%.demo' OR u.username LIKE '%centro' OR u.username LIKE '%mall' OR u.username LIKE '%bodega'
GROUP BY u.id
ORDER BY u.id;

-- Consulta para verificar acceso a bodegas por usuario
SELECT 
    'ACCESO A BODEGAS' as titulo,
    u.username,
    w.warehouse_code,
    w.warehouse_name,
    uwa.access_type
FROM users u
JOIN user_warehouse_access uwa ON u.id = uwa.user_id
JOIN warehouses w ON uwa.warehouse_id = w.id
WHERE u.username LIKE '%.demo' OR u.username LIKE '%centro' OR u.username LIKE '%mall' OR u.username LIKE '%bodega'
ORDER BY u.username, w.warehouse_code;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- RESUMEN DE USUARIOS DEMO CREADOS
-- =====================================================
/*
USUARIOS DEMO PARA TESTING:

1. admin.demo / admin123
   - Rol: ADMIN
   - Acceso: Todas las bodegas (FULL)
   - Menú: COMPLETO - ve todos los módulos

2. contador.demo / contador123
   - Rol: ACCOUNTANT + permisos adicionales de caja
   - Acceso: Todas las bodegas (READ_ONLY)
   - Menú: Clientes, Cuenta Corriente, Reportes, Caja (supervisión)

3. jefe.bodega / bodega123
   - Rol: WAREHOUSE_MANAGER
   - Acceso: BODEGA_CENTRAL (FULL), tiendas (READ_ONLY)
   - Menú: Inventario completo, productos, reportes

4. vendedor.centro / vendedor123
   - Rol: SALES_PERSON + permisos transferencia
   - Acceso: TIENDA_CENTRO (FULL), BODEGA_CENTRAL (READ_ONLY)
   - Menú: Ventas, clientes, stock, transferencias

5. vendedor.mall / vendedor123
   - Rol: SALES_PERSON + permisos transferencia
   - Acceso: TIENDA_MALL (FULL), BODEGA_CENTRAL (READ_ONLY)
   - Menú: Similar a vendedor.centro

6. cajero.demo / cajero123
   - Rol: SALES_PERSON + permisos de caja
   - Acceso: TIENDA_CENTRO (FULL)
   - Menú: Ventas, procesamiento, control de caja

7. consultor.demo / consultor123
   - Rol: VIEWER
   - Acceso: Todas las bodegas (READ_ONLY)
   - Menú: Solo consultas y reportes (sin crear/editar)

8. supervisor.demo / supervisor123
   - Rol: WAREHOUSE_MANAGER + permisos supervisión
   - Acceso: Tiendas (FULL), BODEGA_CENTRAL (READ_ONLY)
   - Menú: Supervisión de caja, autorización crédito, gestión multas

TESTING DEL MENÚ:

1. Conéctate con cada usuario
2. Ejecuta: CALL get_user_menu_api(user_id, TRUE);
3. Verifica que solo ve los menús correspondientes
4. Prueba favoritos y búsqueda

CREDENCIALES TESTING:
- Todos usan el mismo patrón: [rol]123
- Emails: [usuario]@demo.com
*/