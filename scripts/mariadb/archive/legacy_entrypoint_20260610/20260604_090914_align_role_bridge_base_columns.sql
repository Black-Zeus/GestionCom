-- GestionCom - Align role bridge tables with SQLAlchemy BaseModel columns.
-- Date: 2026-06-04 09:09:14 America/Santiago
-- Reason: UserRole and RolePermission inherit BaseModel, so ORM inserts
-- created_at, updated_at and deleted_at in bridge tables.

ALTER TABLE user_roles
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creacion del registro' AFTER assigned_at,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de ultima actualizacion del registro' AFTER created_at,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT 'Fecha de eliminacion logica' AFTER updated_at;

ALTER TABLE role_permissions
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creacion del registro' AFTER granted_at,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de ultima actualizacion del registro' AFTER created_at,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT 'Fecha de eliminacion logica' AFTER updated_at;

