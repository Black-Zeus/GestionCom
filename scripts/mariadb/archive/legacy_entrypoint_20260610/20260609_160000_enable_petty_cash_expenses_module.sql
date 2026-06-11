-- Habilita modulo operativo para registrar y aprobar gastos de caja chica.

ALTER TABLE petty_cash_expenses
  ADD COLUMN IF NOT EXISTS expense_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING' AFTER has_receipt,
  ADD COLUMN IF NOT EXISTS evidence_mime_type VARCHAR(100) NULL AFTER evidence_file_size,
  ADD COLUMN IF NOT EXISTS evidence_width INT UNSIGNED NULL AFTER evidence_mime_type,
  ADD COLUMN IF NOT EXISTS evidence_height INT UNSIGNED NULL AFTER evidence_width,
  ADD COLUMN IF NOT EXISTS evidence_original_filename VARCHAR(255) NULL AFTER evidence_height,
  ADD INDEX IF NOT EXISTS idx_expense_status (expense_status);

INSERT INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active) VALUES
('PETTY_CASH_EXPENSES_ACCESS', 'Acceder a Gastos de Caja Chica', 'CASH_CONTROL', 'Permite ver gastos operativos registrados contra fondos de caja chica.', TRUE),
('PETTY_CASH_EXPENSES_CREATE', 'Registrar Gastos de Caja Chica', 'CASH_CONTROL', 'Permite registrar gastos que descuentan saldo de un fondo de caja chica.', TRUE),
('PETTY_CASH_EXPENSES_APPROVE', 'Aprobar Gastos de Caja Chica', 'CASH_CONTROL', 'Permite aprobar o rechazar gastos de caja chica.', TRUE)
ON DUPLICATE KEY UPDATE
  permission_name = VALUES(permission_name),
  permission_group = VALUES(permission_group),
  permission_description = VALUES(permission_description),
  is_active = VALUES(is_active);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, (SELECT id FROM users WHERE username = 'root' LIMIT 1)
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'PETTY_CASH_EXPENSES_ACCESS',
  'PETTY_CASH_EXPENSES_CREATE',
  'PETTY_CASH_EXPENSES_APPROVE'
)
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT');

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, (SELECT id FROM users WHERE username = 'root' LIMIT 1)
FROM roles r
JOIN permissions p ON p.permission_code IN ('PETTY_CASH_EXPENSES_ACCESS', 'PETTY_CASH_EXPENSES_CREATE')
WHERE r.role_code IN ('CASHIER', 'SELLER');

INSERT INTO menu_items (
  parent_id, menu_code, menu_name, menu_description, icon_name, menu_url,
  menu_type, required_permission_id, is_active, is_visible, sort_order, menu_level, menu_path
) VALUES (
  (SELECT id FROM menu_items WHERE menu_code = 'cash'),
  'petty_cash_expenses',
  'Gastos de caja chica',
  'Registro, revision y aprobacion de gastos menores.',
  'receipt-line',
  '/cash/petty/expenses',
  'LINK',
  (SELECT id FROM permissions WHERE permission_code = 'PETTY_CASH_EXPENSES_ACCESS'),
  TRUE,
  TRUE,
  45,
  2,
  '/cash/petty/expenses'
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
