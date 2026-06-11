-- Habilita el mantenedor de Bodegas para perfiles administrativos y Jefe de Bodega.

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'WAREHOUSES_ACCESS',
  'WAREHOUSE_READ',
  'WAREHOUSE_WRITE',
  'WAREHOUSE_DELETE',
  'WAREHOUSE_ADMIN',
  'WAREHOUSE_MANAGER'
)
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN');

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'WAREHOUSES_ACCESS',
  'WAREHOUSE_READ',
  'WAREHOUSE_WRITE',
  'WAREHOUSE_DELETE',
  'WAREHOUSE_MANAGER'
)
WHERE r.role_code = 'WAREHOUSE_MANAGER';

UPDATE menu_items
SET required_permission_id = (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSES_ACCESS')
WHERE menu_code = 'warehouses'
  AND EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'WAREHOUSES_ACCESS');
