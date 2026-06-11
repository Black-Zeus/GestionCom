-- Normaliza permisos de visibilidad de menu para perfiles operativos.
-- No modifica perfiles reservados: SUPER_ADMIN ni ADMIN.
-- La regla aplicada es: si el rol tiene permisos funcionales de un dominio,
-- debe tener tambien el permiso *_VISIBLE de la seccion de menu correspondiente.

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

-- ACCOUNTANT / Contador
-- Permisos funcionales actuales: cuentas por cobrar, caja, reportes y devoluciones.
INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'CUSTOMERS_VISIBLE',
  'CASH_VISIBLE',
  'DOCUMENTS_VISIBLE',
  'FINANCE_VISIBLE',
  'REPORTS_VISIBLE'
)
WHERE r.role_code = 'ACCOUNTANT';

-- SALES_PERSON / Vendedor
-- Permisos funcionales actuales: ventas operativas y devoluciones.
INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'SALES_VISIBLE',
  'DOCUMENTS_VISIBLE'
)
WHERE r.role_code = 'SALES_PERSON';

-- WAREHOUSE_MANAGER / Jefe de Bodega
-- Permisos funcionales actuales: inventario, stock y reposicion.
INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'INVENTORY_VISIBLE'
)
WHERE r.role_code = 'WAREHOUSE_MANAGER';

-- VIEWER / Consultor
-- Mantiene solo HOME_VISIBLE por ahora. No se agregan nuevas secciones.

-- Invalidar sesiones/permisos cacheados para usuarios afectados por estos perfiles.
UPDATE users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
SET
  u.secret = SHA2(CONCAT(UUID(), ':', u.id, ':', NOW(6)), 256),
  u.updated_at = NOW()
WHERE r.role_code IN ('ACCOUNTANT', 'SALES_PERSON', 'WAREHOUSE_MANAGER');
