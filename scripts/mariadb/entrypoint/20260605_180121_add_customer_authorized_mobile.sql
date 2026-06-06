-- Agrega movil a personas autorizadas por cliente.

ALTER TABLE customer_authorized_users
ADD COLUMN IF NOT EXISTS mobile VARCHAR(20) NULL AFTER phone;
