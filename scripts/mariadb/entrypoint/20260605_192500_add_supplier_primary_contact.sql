-- Agrega contacto principal visible para proveedores.

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255) NULL AFTER business_activity;

UPDATE suppliers s
JOIN supplier_contacts sc ON sc.supplier_id = s.id
SET s.contact_person = sc.contact_name
WHERE s.contact_person IS NULL
  AND sc.is_primary = TRUE
  AND sc.is_active = TRUE;
