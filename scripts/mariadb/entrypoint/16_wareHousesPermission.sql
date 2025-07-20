-- ==========================================
-- PERMISOS PARA MÓDULO WAREHOUSES
-- ==========================================

INSERT INTO permissions (permission_code, permission_name, permission_group) VALUES
('WAREHOUSE_READ', 'Ver bodegas', 'WAREHOUSE'),
('WAREHOUSE_WRITE', 'Crear/Editar bodegas', 'WAREHOUSE'),
('WAREHOUSE_DELETE', 'Eliminar bodegas', 'WAREHOUSE'),
('WAREHOUSE_ADMIN', 'Administrador completo de bodegas', 'WAREHOUSE'),
('WAREHOUSE_MANAGER', 'Gestionar bodegas asignadas', 'WAREHOUSE'),
('WAREHOUSE_SUPERVISOR', 'Supervisar operaciones de bodega', 'WAREHOUSE'),
('WAREHOUSE_ASSIGN_USERS', 'Asignar usuarios a bodegas', 'WAREHOUSE'),
('WAREHOUSE_MANAGE_ZONES', 'Gestionar zonas de bodega', 'WAREHOUSE'),
('WAREHOUSE_VIEW_REPORTS', 'Ver reportes de bodega', 'WAREHOUSE'),
('WAREHOUSE_CONFIGURE', 'Configurar parámetros de bodega', 'WAREHOUSE'),
('WAREHOUSE_ACCESS_ALL', 'Acceso a todas las bodegas', 'WAREHOUSE'),
('WAREHOUSE_ACCESS_ASSIGNED', 'Acceso solo a bodegas asignadas', 'WAREHOUSE'),
('WAREHOUSE_INVENTORY_VIEW', 'Ver inventario de bodega', 'WAREHOUSE'),
('WAREHOUSE_INVENTORY_MANAGE', 'Gestionar inventario de bodega', 'WAREHOUSE'),
('WAREHOUSE_MOVEMENTS_VIEW', 'Ver movimientos de bodega', 'WAREHOUSE'),
('WAREHOUSE_MOVEMENTS_CREATE', 'Crear movimientos de bodega', 'WAREHOUSE'),
('WAREHOUSE_ACTIVATE_DEACTIVATE', 'Activar/Desactivar bodegas', 'WAREHOUSE'),
('WAREHOUSE_TRANSFER', 'Transferir entre bodegas', 'WAREHOUSE'),
('WAREHOUSE_AUDIT', 'Auditar operaciones de bodega', 'WAREHOUSE');

-- ==========================================
-- PERMISOS DE WAREHOUSE PARA USUARIO ADMIN (ID: 1)
-- ==========================================

INSERT INTO user_permissions (user_id, permission_id, permission_type, granted_by_user_id) VALUES
(1, (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSE_ADMIN'), 'GRANT', 1);


-- ==========================================
-- PERMISOS PARA MÓDULO WAREHOUSE_ZONE
-- ==========================================

INSERT INTO permissions (permission_code, permission_name, permission_group) VALUES
-- Permisos básicos CRUD para zones
('WAREHOUSE_ZONE_READ', 'Ver zonas de bodega', 'WAREHOUSE_ZONE'),
('WAREHOUSE_ZONE_WRITE', 'Crear/Editar zonas de bodega', 'WAREHOUSE_ZONE'),
('WAREHOUSE_ZONE_DELETE', 'Eliminar zonas de bodega', 'WAREHOUSE_ZONE'),

-- Permisos administrativos para zones
('WAREHOUSE_ZONE_ADMIN', 'Administrador completo de zonas', 'WAREHOUSE_ZONE'),
('WAREHOUSE_ZONE_MANAGER', 'Gestionar zonas asignadas', 'WAREHOUSE_ZONE'),

-- Permisos específicos adicionales
('WAREHOUSE_ZONE_CONFIGURE', 'Configurar parámetros de zona', 'WAREHOUSE_ZONE'),
('WAREHOUSE_ZONE_LOCATION_TRACKING', 'Habilitar/deshabilitar seguimiento', 'WAREHOUSE_ZONE');

-- ==========================================
-- ASIGNAR PERMISOS AL ADMIN (ID: 1)
-- ==========================================

INSERT INTO user_permissions (user_id, permission_id, permission_type, granted_by_user_id) VALUES
(1, (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSE_ZONE_READ'), 'GRANT', 1),
(1, (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSE_ZONE_WRITE'), 'GRANT', 1),
(1, (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSE_ZONE_DELETE'), 'GRANT', 1),
(1, (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSE_ZONE_ADMIN'), 'GRANT', 1),
(1, (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSE_ZONE_MANAGER'), 'GRANT', 1),
(1, (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSE_ZONE_CONFIGURE'), 'GRANT', 1),
(1, (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSE_ZONE_LOCATION_TRACKING'), 'GRANT', 1);

-- ==========================================
-- PERMISOS PARA MÓDULO WAREHOUSE_ACCESS
-- ==========================================

INSERT INTO permissions (permission_code, permission_name, permission_group) VALUES
-- Permisos básicos CRUD para warehouse access
('WAREHOUSE_ACCESS_READ', 'Ver accesos de bodega', 'WAREHOUSE_ACCESS'),
('WAREHOUSE_ACCESS_WRITE', 'Crear/Editar accesos de bodega', 'WAREHOUSE_ACCESS'),
('WAREHOUSE_ACCESS_DELETE', 'Eliminar accesos de bodega', 'WAREHOUSE_ACCESS'),

-- Permisos administrativos para warehouse access
('WAREHOUSE_ACCESS_ADMIN', 'Administrador completo de accesos', 'WAREHOUSE_ACCESS'),
('WAREHOUSE_ACCESS_MANAGER', 'Gestionar accesos asignados', 'WAREHOUSE_ACCESS'),

-- Permisos específicos adicionales
('WAREHOUSE_ACCESS_GRANT', 'Otorgar accesos a usuarios', 'WAREHOUSE_ACCESS'),
('WAREHOUSE_ACCESS_REVOKE', 'Revocar accesos de usuarios', 'WAREHOUSE_ACCESS'),
('WAREHOUSE_ACCESS_VIEW_ALL', 'Ver todos los accesos del sistema', 'WAREHOUSE_ACCESS'),
('WAREHOUSE_ACCESS_BULK_MANAGE', 'Gestión masiva de accesos', 'WAREHOUSE_ACCESS');

-- ==========================================
-- ASIGNAR PERMISOS AL ADMIN (ID: 1)
-- ==========================================

INSERT INTO user_permissions (user_id, permission_id, permission_type, granted_by_user_id) VALUES
(1, (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSE_ACCESS_READ'), 'GRANT', 1),
(1, (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSE_ACCESS_WRITE'), 'GRANT', 1),
(1, (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSE_ACCESS_DELETE'), 'GRANT', 1),
(1, (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSE_ACCESS_ADMIN'), 'GRANT', 1),
(1, (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSE_ACCESS_MANAGER'), 'GRANT', 1),
(1, (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSE_ACCESS_GRANT'), 'GRANT', 1),
(1, (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSE_ACCESS_REVOKE'), 'GRANT', 1),
(1, (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSE_ACCESS_VIEW_ALL'), 'GRANT', 1),
(1, (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSE_ACCESS_BULK_MANAGE'), 'GRANT', 1);