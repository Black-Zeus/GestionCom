-- Agrega giro comercial para clientes.

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS business_activity VARCHAR(255) NULL AFTER commercial_name;

UPDATE customers
SET business_activity = CASE customer_code
  WHEN 'DEMO_CUS_001' THEN 'Cliente final'
  WHEN 'DEMO_CUS_002' THEN 'Comercio minorista'
  ELSE business_activity
END
WHERE business_activity IS NULL
  AND customer_code IN ('DEMO_CUS_001', 'DEMO_CUS_002');
