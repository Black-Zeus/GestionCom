-- Agrega divisas por defecto de empresa para nuevos clientes y proveedores.

ALTER TABLE dte_company_config
ADD COLUMN IF NOT EXISTS default_customer_currency_code CHAR(3) NOT NULL DEFAULT 'CLP' AFTER dte_environment,
ADD COLUMN IF NOT EXISTS default_supplier_currency_code CHAR(3) NOT NULL DEFAULT 'CLP' AFTER default_customer_currency_code;

UPDATE dte_company_config
SET default_customer_currency_code = 'CLP'
WHERE default_customer_currency_code IS NULL
   OR default_customer_currency_code = '';

UPDATE dte_company_config
SET default_supplier_currency_code = 'CLP'
WHERE default_supplier_currency_code IS NULL
   OR default_supplier_currency_code = '';

CREATE INDEX IF NOT EXISTS idx_dte_company_default_customer_currency
ON dte_company_config (default_customer_currency_code);

CREATE INDEX IF NOT EXISTS idx_dte_company_default_supplier_currency
ON dte_company_config (default_supplier_currency_code);

SET @fk_company_customer_currency_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'dte_company_config'
    AND CONSTRAINT_NAME = 'fk_dte_company_default_customer_currency'
);

SET @fk_company_customer_currency_sql := IF(
  @fk_company_customer_currency_exists = 0,
  'ALTER TABLE dte_company_config ADD CONSTRAINT fk_dte_company_default_customer_currency FOREIGN KEY (default_customer_currency_code) REFERENCES currencies(currency_code)',
  'SELECT 1'
);

PREPARE stmt FROM @fk_company_customer_currency_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_company_supplier_currency_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'dte_company_config'
    AND CONSTRAINT_NAME = 'fk_dte_company_default_supplier_currency'
);

SET @fk_company_supplier_currency_sql := IF(
  @fk_company_supplier_currency_exists = 0,
  'ALTER TABLE dte_company_config ADD CONSTRAINT fk_dte_company_default_supplier_currency FOREIGN KEY (default_supplier_currency_code) REFERENCES currencies(currency_code)',
  'SELECT 1'
);

PREPARE stmt FROM @fk_company_supplier_currency_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
