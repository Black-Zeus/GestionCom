-- Agrega soporte de soft delete para Configuracion de empresa.

ALTER TABLE dte_company_config
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_dte_company_config_deleted_at ON dte_company_config (deleted_at);
