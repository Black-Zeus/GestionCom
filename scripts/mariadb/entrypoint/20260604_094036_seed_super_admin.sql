-- GestionCom - Seed Super Admin profile and root user.
-- Date: 2026-06-04 09:40:36 America/Santiago
-- Purpose:
--   1. Create SUPER_ADMIN as a protected system role.
--   2. Grant all active permissions to SUPER_ADMIN.
--   3. Create root user and assign SUPER_ADMIN role.
--
-- Initial DEV credentials:
--   username: root
--   password: GCom#R7xP9!v2
--
-- Notes:
--   - This seeder is idempotent.
--   - Existing root password is not overwritten on rerun.
--   - Rerunning this seeder adds any newly seeded active permission to SUPER_ADMIN.

SET @super_admin_code = 'SUPER_ADMIN';
SET @root_username = 'root';
SET @root_email = 'root@gestioncom.local';
SET @root_password_hash = '$2b$12$7o2dTIA0yj42HCqgN.YmWe4J0NdY4mKYXLsCRm1HOiM4cCHZshX06';

INSERT INTO roles (
  role_code,
  role_name,
  role_description,
  is_system_role,
  is_active,
  deleted_at
) VALUES (
  @super_admin_code,
  'Super Administrador',
  'Perfil raiz del sistema con todos los permisos disponibles.',
  TRUE,
  TRUE,
  NULL
)
ON DUPLICATE KEY UPDATE
  role_name = VALUES(role_name),
  role_description = VALUES(role_description),
  is_system_role = TRUE,
  is_active = TRUE,
  deleted_at = NULL,
  updated_at = CURRENT_TIMESTAMP;

SET @super_admin_role_id = (SELECT id FROM roles WHERE role_code = @super_admin_code LIMIT 1);

INSERT INTO users (
  username,
  email,
  password_hash,
  secret,
  first_name,
  last_name,
  phone,
  is_active,
  petty_cash_limit,
  password_changed_at,
  deleted_at
) VALUES (
  @root_username,
  @root_email,
  @root_password_hash,
  SHA2(CONCAT(@root_username, ':', UUID()), 256),
  'Root',
  'Super Administrador',
  NULL,
  TRUE,
  NULL,
  CURRENT_TIMESTAMP,
  NULL
)
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  is_active = TRUE,
  secret = COALESCE(secret, SHA2(CONCAT(@root_username, ':', UUID()), 256)),
  deleted_at = NULL,
  updated_at = CURRENT_TIMESTAMP;

SET @root_user_id = (SELECT id FROM users WHERE username = @root_username LIMIT 1);

INSERT INTO role_permissions (
  role_id,
  permission_id,
  granted_by_user_id,
  granted_at,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  @super_admin_role_id,
  p.id,
  @root_user_id,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
FROM permissions p
WHERE p.is_active = TRUE
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_id = @super_admin_role_id
      AND rp.permission_id = p.id
  );

UPDATE role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
SET
  rp.deleted_at = NULL,
  rp.updated_at = CURRENT_TIMESTAMP
WHERE rp.role_id = @super_admin_role_id
  AND p.is_active = TRUE
  AND p.deleted_at IS NULL;

INSERT INTO user_roles (
  user_id,
  role_id,
  assigned_by_user_id,
  assigned_at,
  created_at,
  updated_at,
  deleted_at
) VALUES (
  @root_user_id,
  @super_admin_role_id,
  @root_user_id,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
)
ON DUPLICATE KEY UPDATE
  assigned_by_user_id = VALUES(assigned_by_user_id),
  assigned_at = VALUES(assigned_at),
  deleted_at = NULL,
  updated_at = CURRENT_TIMESTAMP;

