-- Normaliza estado operativo de proveedores existentes.

UPDATE suppliers
SET status_id = (
  SELECT id
  FROM system_statuses
  WHERE status_group = 'SUPPLIER'
    AND status_code = 'ACTIVE'
    AND is_active = TRUE
  LIMIT 1
)
WHERE status_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM system_statuses
    WHERE status_group = 'SUPPLIER'
      AND status_code = 'ACTIVE'
      AND is_active = TRUE
  );
