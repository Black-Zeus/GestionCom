-- Agrega moneda comercial por defecto al cliente.

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS default_currency_code CHAR(3) NOT NULL DEFAULT 'CLP' AFTER price_list_id;

UPDATE customers c
LEFT JOIN price_lists pl ON pl.id = c.price_list_id
SET c.default_currency_code = COALESCE(pl.currency_code, 'CLP')
WHERE c.default_currency_code IS NULL
   OR c.default_currency_code = '';

CREATE INDEX IF NOT EXISTS idx_customers_default_currency_code
ON customers (default_currency_code);

SET @fk_customers_default_currency_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'customers'
    AND CONSTRAINT_NAME = 'fk_customers_default_currency'
);

SET @fk_customers_default_currency_sql := IF(
  @fk_customers_default_currency_exists = 0,
  'ALTER TABLE customers ADD CONSTRAINT fk_customers_default_currency FOREIGN KEY (default_currency_code) REFERENCES currencies(currency_code)',
  'SELECT 1'
);

PREPARE stmt FROM @fk_customers_default_currency_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
