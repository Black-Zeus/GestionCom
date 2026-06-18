-- Deja solo tipos manuales basicos para venta:
-- TICKET, MANUAL_39, MANUAL_33 y MANUAL_61.
-- Los tipos operativos de inventario/transferencia/preventa se retiran del catalogo
-- funcional de documentos de venta.

UPDATE document_series ds
JOIN document_types dt ON dt.id = ds.document_type_id
SET
  ds.is_active = 0,
  ds.deleted_at = COALESCE(ds.deleted_at, CURRENT_TIMESTAMP)
WHERE dt.document_type_code NOT LIKE 'DTE\_%'
  AND dt.document_type_code NOT IN ('TICKET', 'BOLETA', 'SALE_INVOICE', 'CREDIT_NOTE', 'MANUAL_39', 'MANUAL_33', 'MANUAL_61');

UPDATE document_templates tpl
JOIN document_types dt ON dt.id = tpl.document_type_id
SET
  tpl.is_active = 0,
  tpl.deleted_at = COALESCE(tpl.deleted_at, CURRENT_TIMESTAMP)
WHERE dt.document_type_code NOT LIKE 'DTE\_%'
  AND dt.document_type_code NOT IN ('TICKET', 'BOLETA', 'SALE_INVOICE', 'CREDIT_NOTE', 'MANUAL_39', 'MANUAL_33', 'MANUAL_61');

UPDATE document_types
SET
  is_active = 0,
  deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP)
WHERE document_type_code NOT LIKE 'DTE\_%'
  AND document_type_code NOT IN ('TICKET', 'BOLETA', 'SALE_INVOICE', 'CREDIT_NOTE', 'MANUAL_39', 'MANUAL_33', 'MANUAL_61');
