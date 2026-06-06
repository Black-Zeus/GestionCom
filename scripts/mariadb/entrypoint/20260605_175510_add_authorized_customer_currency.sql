-- Agrega moneda al monto maximo de personas autorizadas por cliente.

ALTER TABLE customer_authorized_users
ADD COLUMN IF NOT EXISTS max_purchase_currency_code VARCHAR(3) NOT NULL DEFAULT 'CLP' AFTER max_purchase_amount;

CREATE INDEX IF NOT EXISTS idx_customer_authorized_users_currency
ON customer_authorized_users (max_purchase_currency_code);

UPDATE customer_authorized_users
SET max_purchase_currency_code = 'CLP'
WHERE max_purchase_currency_code IS NULL
   OR max_purchase_currency_code = '';
