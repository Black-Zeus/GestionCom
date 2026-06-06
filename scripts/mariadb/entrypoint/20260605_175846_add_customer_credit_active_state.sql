-- Agrega estado operativo a la configuracion de credito del cliente.

ALTER TABLE customer_credit_config
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER auto_block_on_overdue;

CREATE INDEX IF NOT EXISTS idx_customer_credit_config_active
ON customer_credit_config (is_active);

UPDATE customer_credit_config
SET is_active = TRUE
WHERE is_active IS NULL;
