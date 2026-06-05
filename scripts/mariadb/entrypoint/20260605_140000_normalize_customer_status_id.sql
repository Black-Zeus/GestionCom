-- Normaliza Clientes para usar system_statuses como fuente unica de estados.
-- Los clientes sin estado quedan Activos por defecto.

UPDATE customers
SET status_id = (
  SELECT id
  FROM system_statuses
  WHERE status_group = 'CUSTOMER'
    AND status_code = 'ACTIVE'
  LIMIT 1
)
WHERE status_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM system_statuses
    WHERE status_group = 'CUSTOMER'
      AND status_code = 'ACTIVE'
  );
