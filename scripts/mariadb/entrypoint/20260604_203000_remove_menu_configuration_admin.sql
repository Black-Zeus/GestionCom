-- Retira la administracion tecnica de estructura de menu.
-- La visibilidad y acceso del menu se administran desde permisos por rol.

SET FOREIGN_KEY_CHECKS = 0;

UPDATE menu_items
SET
  is_active = FALSE,
  is_visible = FALSE,
  deleted_at = COALESCE(deleted_at, NOW())
WHERE menu_code IN ('menu_config', 'admin_menu_config')
   OR menu_url IN ('/admin/menu', '/administration/menu-config');

DELETE mip
FROM menu_item_permissions mip
JOIN permissions p ON p.id = mip.permission_id
WHERE p.permission_code IN (
  'MENU_VISIBLE',
  'MENU_CONFIG_ACCESS',
  'MENU_READ',
  'MENU_WRITE',
  'MENU_MANAGER',
  'MENU_ADMIN',
  'USER_MENU_READ',
  'USER_MENU_WRITE',
  'USER_MENU_MANAGER',
  'USER_MENU_ADMIN'
);

DELETE rp
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE p.permission_code IN (
  'MENU_VISIBLE',
  'MENU_CONFIG_ACCESS',
  'MENU_READ',
  'MENU_WRITE',
  'MENU_MANAGER',
  'MENU_ADMIN',
  'USER_MENU_READ',
  'USER_MENU_WRITE',
  'USER_MENU_MANAGER',
  'USER_MENU_ADMIN'
);

DELETE up
FROM user_permissions up
JOIN permissions p ON p.id = up.permission_id
WHERE p.permission_code IN (
  'MENU_VISIBLE',
  'MENU_CONFIG_ACCESS',
  'MENU_READ',
  'MENU_WRITE',
  'MENU_MANAGER',
  'MENU_ADMIN',
  'USER_MENU_READ',
  'USER_MENU_WRITE',
  'USER_MENU_MANAGER',
  'USER_MENU_ADMIN'
);

UPDATE menu_items mi
JOIN permissions p ON p.id = mi.required_permission_id
SET mi.required_permission_id = NULL
WHERE p.permission_code IN (
  'MENU_VISIBLE',
  'MENU_CONFIG_ACCESS',
  'MENU_READ',
  'MENU_WRITE',
  'MENU_MANAGER',
  'MENU_ADMIN',
  'USER_MENU_READ',
  'USER_MENU_WRITE',
  'USER_MENU_MANAGER',
  'USER_MENU_ADMIN'
);

DELETE FROM permissions
WHERE permission_code IN (
  'MENU_VISIBLE',
  'MENU_CONFIG_ACCESS',
  'MENU_READ',
  'MENU_WRITE',
  'MENU_MANAGER',
  'MENU_ADMIN',
  'USER_MENU_READ',
  'USER_MENU_WRITE',
  'USER_MENU_MANAGER',
  'USER_MENU_ADMIN'
);

SET FOREIGN_KEY_CHECKS = 1;
