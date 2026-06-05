-- Agrega origen legible para notificaciones y prepara filtro por origen.

ALTER TABLE user_notifications
ADD COLUMN IF NOT EXISTS source_label VARCHAR(120) NULL AFTER source_id;

CREATE INDEX IF NOT EXISTS idx_user_notifications_source_label ON user_notifications (source_label);

UPDATE user_notifications
SET source_label = CASE
  WHEN source_table IS NULL OR source_table = '' THEN 'Sistema'
  WHEN source_table = 'system' THEN 'Sistema'
  WHEN source_table = 'inventory' THEN 'Inventario'
  WHEN source_table = 'security' THEN 'Seguridad'
  WHEN source_table = 'products' THEN 'Productos'
  WHEN source_table = 'users' THEN 'Usuarios'
  ELSE source_table
END
WHERE source_label IS NULL;
