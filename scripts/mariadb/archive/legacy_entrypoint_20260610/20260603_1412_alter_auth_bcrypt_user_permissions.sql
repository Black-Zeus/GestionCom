-- =====================================================
-- Normalizacion auth: bcrypt y permisos USER_*
-- Archivo: 20260603_1412_alter_auth_bcrypt_user_permissions.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE users
    MODIFY COLUMN password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt password hash';

INSERT IGNORE INTO permissions (permission_code, permission_name, permission_group) VALUES
    ('USER_READ', 'Ver usuarios', 'USER'),
    ('USER_WRITE', 'Crear y editar usuarios', 'USER'),
    ('USER_MANAGER', 'Gestionar usuarios', 'USER'),
    ('USER_ADMIN', 'Administrar usuarios', 'USER'),
    ('USERS_MANAGE', 'Gestionar usuarios legacy', 'ADMIN');

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, admin_user.id
FROM roles r
JOIN permissions p ON p.permission_code IN (
    'USER_READ',
    'USER_WRITE',
    'USER_MANAGER',
    'USER_ADMIN',
    'USERS_MANAGE'
)
LEFT JOIN users admin_user ON admin_user.username = 'admin.demo'
WHERE r.role_code = 'ADMIN';

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, admin_user.id
FROM roles r
JOIN permissions p ON p.permission_code = 'USER_READ'
LEFT JOIN users admin_user ON admin_user.username = 'admin.demo'
WHERE r.role_code IN ('WAREHOUSE_MANAGER', 'SALES_PERSON', 'VIEWER');

UPDATE menu_items
SET required_permission_id = (SELECT id FROM permissions WHERE permission_code = 'USER_MANAGER')
WHERE menu_code = 'admin_users'
  AND EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'USER_MANAGER');

INSERT IGNORE INTO user_permissions (user_id, permission_id, permission_type, granted_by_user_id)
SELECT u.id, p.id, 'GRANT', u.id
FROM users u
JOIN permissions p ON p.permission_code IN ('USER_ADMIN', 'USER_MANAGER')
WHERE u.username = 'admin.demo';

SET FOREIGN_KEY_CHECKS = 1;
