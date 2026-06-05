-- Habilita mantenedores de metodos de pago y unidades de medida.
-- Mueve Backup y restauracion desde Configuracion a Administracion.

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

INSERT IGNORE INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active) VALUES
('PAYMENT_METHODS_MANAGE', 'Gestionar Metodos de Pago', 'CONFIGURATION', 'Permite crear, editar, activar y eliminar metodos de pago.', TRUE),
('MEASUREMENT_UNITS_ACCESS', 'Acceder a Unidades de Medida', 'CONFIGURATION', 'Permite visualizar el mantenedor de unidades de medida.', TRUE),
('MEASUREMENT_UNITS_MANAGE', 'Gestionar Unidades de Medida', 'CONFIGURATION', 'Permite crear, editar, activar y eliminar unidades de medida.', TRUE);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'PAYMENT_METHODS_ACCESS',
  'PAYMENT_METHODS_MANAGE',
  'MEASUREMENT_UNITS_ACCESS',
  'MEASUREMENT_UNITS_MANAGE',
  'BACKUP_ACCESS'
)
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN');

INSERT INTO menu_items (
  parent_id, menu_code, menu_name, menu_description, icon_name, menu_url,
  menu_type, required_permission_id, is_active, is_visible, sort_order, menu_level, menu_path
) VALUES
((SELECT id FROM menu_items WHERE menu_code = 'settings'), 'measurement_units', 'Unidades de medida', 'Unidades de medida', 'ruler-line', '/config/measurement-units', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'MEASUREMENT_UNITS_ACCESS'), TRUE, TRUE, 50, 2, '/config/measurement-units')
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
  parent_id = (SELECT id FROM (SELECT id FROM menu_items WHERE menu_code = 'administration') admin_parent),
  menu_url = '/admin/backup',
  menu_path = '/admin/backup',
  sort_order = 60,
  menu_level = 2,
  is_active = TRUE,
  is_visible = TRUE,
  required_permission_id = (SELECT id FROM permissions WHERE permission_code = 'BACKUP_ACCESS')
WHERE menu_code = 'backup';
