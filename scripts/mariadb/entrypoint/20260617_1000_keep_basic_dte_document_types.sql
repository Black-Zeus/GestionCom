-- Deja solo los DTE basicos usados por venta diaria:
-- DTE_33 Factura electronica, DTE_39 Boleta electronica y DTE_61 Nota de credito.

UPDATE dte_document_type_settings dts
JOIN document_types dt ON dt.id = dts.document_type_id
SET
  dts.is_enabled = 0,
  dts.deleted_at = COALESCE(dts.deleted_at, CURRENT_TIMESTAMP)
WHERE dt.document_type_code LIKE 'DTE\_%'
  AND dt.document_type_code NOT IN ('DTE_33', 'DTE_39', 'DTE_61');

UPDATE document_series ds
JOIN document_types dt ON dt.id = ds.document_type_id
SET
  ds.is_active = 0,
  ds.deleted_at = COALESCE(ds.deleted_at, CURRENT_TIMESTAMP)
WHERE dt.document_type_code LIKE 'DTE\_%'
  AND dt.document_type_code NOT IN ('DTE_33', 'DTE_39', 'DTE_61');

UPDATE document_templates tpl
JOIN document_types dt ON dt.id = tpl.document_type_id
SET
  tpl.is_active = 0,
  tpl.deleted_at = COALESCE(tpl.deleted_at, CURRENT_TIMESTAMP)
WHERE dt.document_type_code LIKE 'DTE\_%'
  AND dt.document_type_code NOT IN ('DTE_33', 'DTE_39', 'DTE_61');

UPDATE document_types
SET
  is_active = 0,
  deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP)
WHERE document_type_code LIKE 'DTE\_%'
  AND document_type_code NOT IN ('DTE_33', 'DTE_39', 'DTE_61');

