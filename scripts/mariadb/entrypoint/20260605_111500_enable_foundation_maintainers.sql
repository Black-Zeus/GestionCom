-- Habilita permisos para mantenedores fundacionales no transaccionales.

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

INSERT IGNORE INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active) VALUES
('FOUNDATION_MAINTAINERS_ACCESS', 'Acceder a Mantenedores Fundacionales', 'SETTINGS', 'Permite visualizar mantenedores base no transaccionales.', TRUE),
('FOUNDATION_MAINTAINERS_MANAGE', 'Gestionar Mantenedores Fundacionales', 'SETTINGS', 'Permite crear, editar y eliminar mantenedores base no transaccionales.', TRUE);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'FOUNDATION_MAINTAINERS_ACCESS',
  'FOUNDATION_MAINTAINERS_MANAGE'
)
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN');

UPDATE menu_items
SET required_permission_id = (SELECT id FROM permissions WHERE permission_code = 'FOUNDATION_MAINTAINERS_ACCESS')
WHERE menu_code IN (
  'customers',
  'customer_credit',
  'authorized_persons',
  'suppliers',
  'supplier_products',
  'supplier_contacts',
  'barcodes',
  'system_parameters'
);
