-- Separa caja chica en categorias administrativas y fondos operativos.
-- Los fondos usan subestado alineado con liquidacion: no declarado, declarado, suspendido, cerrado.

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

ALTER TABLE petty_cash_funds
  MODIFY COLUMN fund_status ENUM('ACTIVE', 'SUSPENDED', 'CLOSED', 'UNDECLARED', 'DECLARED') DEFAULT 'UNDECLARED';

UPDATE petty_cash_funds
SET fund_status = 'UNDECLARED'
WHERE fund_status = 'ACTIVE';

ALTER TABLE petty_cash_funds
  MODIFY COLUMN fund_status ENUM('UNDECLARED', 'DECLARED', 'SUSPENDED', 'CLOSED') DEFAULT 'UNDECLARED';

INSERT INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active) VALUES
('PETTY_CASH_CATEGORIES_ACCESS', 'Acceder a Categorias de Caja Chica', 'ADMIN', 'Permite ver categorias, limites y reglas de comprobante de caja chica.', TRUE),
('PETTY_CASH_CATEGORIES_MANAGE', 'Gestionar Categorias de Caja Chica', 'ADMIN', 'Permite crear, editar y desactivar categorias de caja chica.', TRUE),
('PETTY_CASH_FUNDS_ACCESS', 'Acceder a Fondos de Caja Chica', 'CASH_CONTROL', 'Permite ver fondos asignados de caja chica en el modulo de Caja.', TRUE),
('PETTY_CASH_FUNDS_MANAGE', 'Gestionar Fondos de Caja Chica', 'CASH_CONTROL', 'Permite asignar, declarar, suspender y cerrar fondos de caja chica.', TRUE)
ON DUPLICATE KEY UPDATE
  permission_name = VALUES(permission_name),
  permission_group = VALUES(permission_group),
  permission_description = VALUES(permission_description),
  is_active = VALUES(is_active);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'PETTY_CASH_CATEGORIES_ACCESS',
  'PETTY_CASH_CATEGORIES_MANAGE',
  'PETTY_CASH_FUNDS_ACCESS',
  'PETTY_CASH_FUNDS_MANAGE',
  'PETTY_CASH_ACCESS',
  'PETTY_CASH_REPLENISH',
  'PETTY_CASH_APPROVE'
)
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT');

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN ('PETTY_CASH_FUNDS_ACCESS', 'PETTY_CASH_ACCESS')
WHERE r.role_code IN ('CASHIER', 'SELLER');

INSERT INTO menu_items (
  parent_id, menu_code, menu_name, menu_description, icon_name, menu_url,
  menu_type, required_permission_id, is_active, is_visible, sort_order, menu_level, menu_path
) VALUES
(
  (SELECT id FROM menu_items WHERE menu_code = 'cash'),
  'petty_cash',
  'Fondos de caja chica',
  'Asignacion, declaracion y cierre de fondos menores por responsable.',
  'wallet-3-line',
  '/cash/petty',
  'LINK',
  (SELECT id FROM permissions WHERE permission_code = 'PETTY_CASH_FUNDS_ACCESS'),
  TRUE,
  TRUE,
  40,
  2,
  '/cash/petty'
),
(
  (SELECT id FROM menu_items WHERE menu_code = 'administration'),
  'petty_cash_categories',
  'Categorias de caja chica',
  'Categorias, limites y reglas de comprobante para gastos menores.',
  'price-tag-3-line',
  '/admin/petty-cash-categories',
  'LINK',
  (SELECT id FROM permissions WHERE permission_code = 'PETTY_CASH_CATEGORIES_ACCESS'),
  TRUE,
  TRUE,
  50,
  2,
  '/admin/petty-cash-categories'
)
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

UPDATE menu_items
SET
  menu_name = 'Categorias de caja chica',
  menu_description = 'Categorias, limites y reglas de comprobante para gastos menores.',
  menu_url = '/admin/petty-cash-categories',
  menu_path = '/admin/petty-cash-categories',
  icon_name = 'price-tag-3-line',
  required_permission_id = (SELECT id FROM permissions WHERE permission_code = 'PETTY_CASH_CATEGORIES_ACCESS'),
  is_active = FALSE,
  is_visible = FALSE
WHERE menu_code = 'petty_cash_admin';
