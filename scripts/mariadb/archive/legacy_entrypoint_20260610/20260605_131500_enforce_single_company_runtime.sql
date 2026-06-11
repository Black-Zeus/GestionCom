-- Garantiza que exista una sola empresa activa y una sola empresa en ambiente productivo.
-- Se normalizan datos actuales antes de agregar restricciones defensivas.

SET @active_company_id := (
  SELECT id
  FROM dte_company_config
  WHERE is_active = TRUE
  ORDER BY (dte_environment = 'PRODUCCION') DESC, id ASC
  LIMIT 1
);

UPDATE dte_company_config
SET is_active = FALSE
WHERE @active_company_id IS NOT NULL
  AND id <> @active_company_id
  AND is_active = TRUE;

SET @production_company_id := (
  SELECT id
  FROM dte_company_config
  WHERE dte_environment = 'PRODUCCION'
  ORDER BY is_active DESC, id ASC
  LIMIT 1
);

UPDATE dte_company_config
SET dte_environment = 'CERTIFICACION'
WHERE @production_company_id IS NOT NULL
  AND id <> @production_company_id
  AND dte_environment = 'PRODUCCION';

ALTER TABLE dte_company_config
  ADD COLUMN IF NOT EXISTS active_singleton TINYINT
    GENERATED ALWAYS AS (CASE WHEN is_active = TRUE THEN 1 ELSE NULL END) STORED,
  ADD COLUMN IF NOT EXISTS production_singleton TINYINT
    GENERATED ALWAYS AS (CASE WHEN dte_environment = 'PRODUCCION' THEN 1 ELSE NULL END) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS ux_dte_company_single_active
  ON dte_company_config (active_singleton);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dte_company_single_production
  ON dte_company_config (production_singleton);
