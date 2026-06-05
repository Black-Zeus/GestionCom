-- Habilita el mantenedor de Configuracion de caja POS.

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

INSERT IGNORE INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active) VALUES
('CASH_SETTINGS_MANAGE', 'Gestionar Configuracion de Cajas', 'CASH_CONTROL', 'Permite crear, editar, activar y eliminar cajas POS.', TRUE);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'CASH_POS_ADMIN_ACCESS',
  'CASH_SETTINGS_MANAGE'
)
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN');

UPDATE menu_items
SET required_permission_id = (SELECT id FROM permissions WHERE permission_code = 'CASH_POS_ADMIN_ACCESS')
WHERE menu_code = 'cash_pos_admin'
  AND EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'CASH_POS_ADMIN_ACCESS');
