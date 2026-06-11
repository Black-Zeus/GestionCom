-- =====================================================
-- Cleanup permisos legacy de menu
-- Archivo: 20260603_2313_cleanup_menu_legacy_permissions.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

UPDATE permissions
SET
    permission_group = 'ADMIN',
    permission_name = 'Visible en menu',
    permission_description = 'Permite mostrar y acceder a la opcion de configuracion de menu.'
WHERE permission_code = 'MENU_VISIBLE';

DELETE rp
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE p.permission_code IN (
    'MENU_ADMIN',
    'MENU_MANAGER',
    'MENU_WRITE',
    'USER_MENU_ADMIN',
    'USER_MENU_MANAGER',
    'USER_MENU_READ',
    'USER_MENU_WRITE',
    'MENU_ACCESS_LOGS_VIEW',
    'MENU_CONFIG_EDIT',
    'MENU_CONFIG_VIEW',
    'MENU_FAVORITES_MANAGE',
    'MENU_ITEMS_CREATE',
    'MENU_ITEMS_DELETE'
);

DELETE up
FROM user_permissions up
JOIN permissions p ON p.id = up.permission_id
WHERE p.permission_code IN (
    'MENU_ADMIN',
    'MENU_MANAGER',
    'MENU_WRITE',
    'USER_MENU_ADMIN',
    'USER_MENU_MANAGER',
    'USER_MENU_READ',
    'USER_MENU_WRITE',
    'MENU_ACCESS_LOGS_VIEW',
    'MENU_CONFIG_EDIT',
    'MENU_CONFIG_VIEW',
    'MENU_FAVORITES_MANAGE',
    'MENU_ITEMS_CREATE',
    'MENU_ITEMS_DELETE'
);

DELETE mip
FROM menu_item_permissions mip
JOIN permissions p ON p.id = mip.permission_id
WHERE p.permission_code IN (
    'MENU_ADMIN',
    'MENU_MANAGER',
    'MENU_WRITE',
    'USER_MENU_ADMIN',
    'USER_MENU_MANAGER',
    'USER_MENU_READ',
    'USER_MENU_WRITE',
    'MENU_ACCESS_LOGS_VIEW',
    'MENU_CONFIG_EDIT',
    'MENU_CONFIG_VIEW',
    'MENU_FAVORITES_MANAGE',
    'MENU_ITEMS_CREATE',
    'MENU_ITEMS_DELETE'
);

UPDATE menu_items mi
JOIN permissions p ON p.id = mi.required_permission_id
SET mi.required_permission_id = NULL
WHERE p.permission_code IN (
    'MENU_ADMIN',
    'MENU_MANAGER',
    'MENU_WRITE',
    'USER_MENU_ADMIN',
    'USER_MENU_MANAGER',
    'USER_MENU_READ',
    'USER_MENU_WRITE',
    'MENU_ACCESS_LOGS_VIEW',
    'MENU_CONFIG_EDIT',
    'MENU_CONFIG_VIEW',
    'MENU_FAVORITES_MANAGE',
    'MENU_ITEMS_CREATE',
    'MENU_ITEMS_DELETE'
);

DELETE FROM permissions
WHERE permission_code IN (
    'MENU_ADMIN',
    'MENU_MANAGER',
    'MENU_WRITE',
    'USER_MENU_ADMIN',
    'USER_MENU_MANAGER',
    'USER_MENU_READ',
    'USER_MENU_WRITE',
    'MENU_ACCESS_LOGS_VIEW',
    'MENU_CONFIG_EDIT',
    'MENU_CONFIG_VIEW',
    'MENU_FAVORITES_MANAGE',
    'MENU_ITEMS_CREATE',
    'MENU_ITEMS_DELETE'
);

SET FOREIGN_KEY_CHECKS = 1;
