-- Retira del sistema los tipos de documento de compra.
-- Se usa baja logica para conservar integridad si existieran referencias historicas.

UPDATE dte_document_type_settings dts
JOIN document_types dt ON dt.id = dts.document_type_id
SET
  dts.is_enabled = 0,
  dts.deleted_at = COALESCE(dts.deleted_at, CURRENT_TIMESTAMP)
WHERE dt.document_category = 'PURCHASE'
   OR dt.document_type_code IN ('DTE_46', 'DTE_43');

UPDATE document_series ds
JOIN document_types dt ON dt.id = ds.document_type_id
SET
  ds.is_active = 0,
  ds.deleted_at = COALESCE(ds.deleted_at, CURRENT_TIMESTAMP)
WHERE dt.document_category = 'PURCHASE'
   OR dt.document_type_code IN ('DTE_46', 'DTE_43');

UPDATE document_templates tpl
JOIN document_types dt ON dt.id = tpl.document_type_id
SET
  tpl.is_active = 0,
  tpl.deleted_at = COALESCE(tpl.deleted_at, CURRENT_TIMESTAMP)
WHERE dt.document_category = 'PURCHASE'
   OR dt.document_type_code IN ('DTE_46', 'DTE_43');

UPDATE document_types
SET
  is_active = 0,
  deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP)
WHERE document_category = 'PURCHASE'
   OR document_type_code IN ('DTE_46', 'DTE_43');

