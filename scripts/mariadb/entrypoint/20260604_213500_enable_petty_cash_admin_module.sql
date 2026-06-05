-- Habilita el mantenedor de Administracion de caja chica.

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

ALTER TABLE petty_cash_funds
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_petty_cash_funds_deleted_at ON petty_cash_funds(deleted_at);

INSERT IGNORE INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active) VALUES
('PETTY_CASH_MANAGE', 'Gestionar Caja Chica', 'CASH_CONTROL', 'Permite crear, editar, cerrar y eliminar fondos y categorias de caja chica.', TRUE);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'PETTY_CASH_ADMIN_ACCESS',
  'PETTY_CASH_ACCESS',
  'PETTY_CASH_MANAGE',
  'PETTY_CASH_APPROVE',
  'PETTY_CASH_REPLENISH'
)
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT');

UPDATE menu_items
SET required_permission_id = (SELECT id FROM permissions WHERE permission_code = 'PETTY_CASH_ADMIN_ACCESS')
WHERE menu_code = 'petty_cash_admin'
  AND EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'PETTY_CASH_ADMIN_ACCESS');
