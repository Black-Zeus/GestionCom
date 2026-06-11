-- Agrega divisa base de ventas de la empresa.

ALTER TABLE dte_company_config
ADD COLUMN IF NOT EXISTS default_sales_currency_code CHAR(3) NOT NULL DEFAULT 'CLP' AFTER default_supplier_currency_code;

UPDATE dte_company_config
SET default_sales_currency_code = 'CLP'
WHERE default_sales_currency_code IS NULL
   OR default_sales_currency_code = '';

CREATE INDEX IF NOT EXISTS idx_dte_company_default_sales_currency
ON dte_company_config (default_sales_currency_code);

SET @fk_company_sales_currency_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'dte_company_config'
    AND CONSTRAINT_NAME = 'fk_dte_company_default_sales_currency'
);

SET @fk_company_sales_currency_sql := IF(
  @fk_company_sales_currency_exists = 0,
  'ALTER TABLE dte_company_config ADD CONSTRAINT fk_dte_company_default_sales_currency FOREIGN KEY (default_sales_currency_code) REFERENCES currencies(currency_code)',
  'SELECT 1'
);

PREPARE stmt FROM @fk_company_sales_currency_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
