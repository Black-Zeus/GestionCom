-- ==========================================
-- CREAR SOLO PERMISOS QUE NO EXISTEN
-- ==========================================

-- Verificar qué permisos ya existen
SELECT permission_code FROM permissions WHERE permission_code IN (
    'MENU_READ', 'MENU_WRITE', 'MENU_MANAGER', 'MENU_ADMIN',
    'USER_MENU_READ', 'USER_MENU_WRITE', 'USER_MENU_MANAGER', 'USER_MENU_ADMIN'
);

-- Crear solo los permisos que faltan (ajusta según lo que ya existe)
INSERT IGNORE INTO permissions (permission_code, permission_name, permission_group) VALUES
('MENU_WRITE', 'Crear/Editar menús', 'MENU'),
('MENU_MANAGER', 'Gestionar menús', 'MENU'),
('MENU_ADMIN', 'Administrador completo de menús', 'MENU'),
('USER_MENU_READ', 'Ver menús de usuario', 'USER_MENU'),
('USER_MENU_WRITE', 'Gestionar menús de usuario', 'USER_MENU'),
('USER_MENU_MANAGER', 'Gestionar menús de usuarios', 'USER_MENU'),
('USER_MENU_ADMIN', 'Administrador de menús de usuario', 'USER_MENU');

-- ==========================================
-- ASIGNAR SOLO PERMISOS ADMIN AL USUARIO ADMIN (ID: 1)
-- ==========================================

INSERT INTO user_permissions (user_id, permission_id, permission_type, granted_by_user_id) 
SELECT 1, id, 'GRANT', 1 
FROM permissions 
WHERE permission_code = 'MENU_ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE user_id = 1 AND permission_id = permissions.id
  );

INSERT INTO user_permissions (user_id, permission_id, permission_type, granted_by_user_id) 
SELECT 1, id, 'GRANT', 1 
FROM permissions 
WHERE permission_code = 'USER_MENU_ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE user_id = 1 AND permission_id = permissions.id
  );

-- ==========================================
-- VERIFICAR RESULTADO
-- ==========================================

SELECT 
    p.permission_code,
    p.permission_name,
    p.permission_group
FROM user_permissions up
JOIN permissions p ON up.permission_id = p.id
WHERE up.user_id = 1 
  AND p.permission_code IN ('MENU_ADMIN', 'USER_MENU_ADMIN')
ORDER BY p.permission_code;