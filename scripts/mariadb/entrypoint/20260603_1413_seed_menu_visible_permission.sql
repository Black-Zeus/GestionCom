-- =====================================================
-- Seed permiso de visibilidad de menu
-- Archivo: 20260603_1413_seed_menu_visible_permission.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

INSERT IGNORE INTO permissions (
    permission_code,
    permission_name,
    permission_group,
    permission_description,
    is_active
) VALUES (
    'MENU_VISIBLE',
    'Visible en menu',
    'MENU',
    'Permite mostrar y acceder a la opcion de administracion de menu.',
    TRUE
);

INSERT IGNORE INTO role_permissions (
    role_id,
    permission_id,
    granted_by_user_id
)
SELECT
    r.id,
    p.id,
    1
FROM roles r
JOIN permissions p ON p.permission_code = 'MENU_VISIBLE'
WHERE r.role_code = 'ADMIN';

SET FOREIGN_KEY_CHECKS = 1;
