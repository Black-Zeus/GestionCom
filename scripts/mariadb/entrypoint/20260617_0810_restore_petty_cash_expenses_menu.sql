-- Restaura el modulo operativo para registrar gastos con cargo a caja chica.
-- El frontend ya tiene la ruta /cash/petty/expenses; faltaba el item en menu_items
-- y los permisos especificos de gastos en algunas bases existentes.

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

INSERT INTO permissions (
  permission_code,
  permission_name,
  permission_group,
  permission_description,
  is_active
) VALUES
('PETTY_CASH_EXPENSES_ACCESS', 'Acceder a Gastos de Caja Chica', 'CASH_CONTROL', 'Permite ver gastos operativos registrados contra fondos de caja chica.', TRUE),
('PETTY_CASH_EXPENSES_CREATE', 'Registrar Gastos de Caja Chica', 'CASH_CONTROL', 'Permite registrar gastos que descuentan saldo de un fondo de caja chica.', TRUE),
('PETTY_CASH_EXPENSES_APPROVE', 'Aprobar Gastos de Caja Chica', 'CASH_CONTROL', 'Permite aprobar o rechazar gastos de caja chica.', TRUE)
ON DUPLICATE KEY UPDATE
  permission_name = VALUES(permission_name),
  permission_group = VALUES(permission_group),
  permission_description = VALUES(permission_description),
  is_active = TRUE,
  deleted_at = NULL;

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT rp.role_id, p.permission_id, @system_user_id
FROM (
  SELECT id AS permission_id, permission_code
  FROM permissions
  WHERE permission_code IN ('PETTY_CASH_EXPENSES_ACCESS', 'PETTY_CASH_EXPENSES_CREATE')
) p
JOIN role_permissions rp
  ON rp.permission_id = (SELECT id FROM permissions WHERE permission_code = 'PETTY_CASH_ACCESS')
WHERE rp.deleted_at IS NULL;

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT rp.role_id, p.id, @system_user_id
FROM permissions p
JOIN role_permissions rp
  ON rp.permission_id = (SELECT id FROM permissions WHERE permission_code = 'PETTY_CASH_APPROVE')
WHERE p.permission_code = 'PETTY_CASH_EXPENSES_APPROVE'
  AND rp.deleted_at IS NULL;

INSERT INTO menu_items (
  parent_id,
  menu_code,
  menu_name,
  menu_description,
  icon_name,
  icon_color,
  menu_url,
  menu_type,
  required_permission_id,
  alternative_permissions,
  is_active,
  is_visible,
  requires_feature,
  feature_code,
  sort_order,
  menu_level,
  menu_path,
  target_window,
  css_classes,
  data_attributes,
  created_by_user_id
) VALUES (
  (SELECT id FROM menu_items WHERE menu_code = 'cash' LIMIT 1),
  'petty_cash_expenses',
  'Gastos de caja chica',
  'Registro y aprobacion de gastos menores con cargo a fondos de caja chica.',
  'receipt-line',
  NULL,
  '/cash/petty/expenses',
  'LINK',
  (SELECT id FROM permissions WHERE permission_code = 'PETTY_CASH_ACCESS' LIMIT 1),
  NULL,
  TRUE,
  TRUE,
  FALSE,
  NULL,
  80,
  2,
  '/cash/petty/expenses',
  'SELF',
  NULL,
  NULL,
  @system_user_id
)
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  menu_name = VALUES(menu_name),
  menu_description = VALUES(menu_description),
  icon_name = VALUES(icon_name),
  menu_url = VALUES(menu_url),
  menu_type = VALUES(menu_type),
  required_permission_id = VALUES(required_permission_id),
  alternative_permissions = VALUES(alternative_permissions),
  is_active = TRUE,
  is_visible = TRUE,
  sort_order = VALUES(sort_order),
  menu_level = VALUES(menu_level),
  menu_path = VALUES(menu_path),
  target_window = VALUES(target_window),
  deleted_at = NULL;
