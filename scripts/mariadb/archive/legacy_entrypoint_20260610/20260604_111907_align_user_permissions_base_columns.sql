-- Alinea user_permissions con BaseModel usado por SQLAlchemy.
-- Requerido para operar permisos especiales por usuario desde endpoints administrativos.

ALTER TABLE user_permissions
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_user_permissions_deleted_at
ON user_permissions (deleted_at);
