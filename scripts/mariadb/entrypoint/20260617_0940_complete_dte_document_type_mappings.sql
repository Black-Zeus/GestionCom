-- Completa mapeos DTE faltantes y sincroniza todos los DTE_* con el switch global.

INSERT INTO dte_document_type_settings (
  document_type_id,
  sii_dte_type,
  sii_dte_name,
  amount_mode,
  emission_policy,
  provider_code,
  is_enabled
)
SELECT id, 46, 'Factura de compra electronica', 'NET', 'MANUAL', 'LIBREDTE', (SELECT dte_enabled FROM dte_system_settings WHERE id = 1)
FROM document_types WHERE document_type_code = 'DTE_46'
ON DUPLICATE KEY UPDATE sii_dte_name = VALUES(sii_dte_name), amount_mode = VALUES(amount_mode), is_enabled = VALUES(is_enabled);

INSERT INTO dte_document_type_settings (
  document_type_id,
  sii_dte_type,
  sii_dte_name,
  amount_mode,
  emission_policy,
  provider_code,
  is_enabled
)
SELECT id, 43, 'Liquidacion factura electronica', 'NET', 'MANUAL', 'LIBREDTE', (SELECT dte_enabled FROM dte_system_settings WHERE id = 1)
FROM document_types WHERE document_type_code = 'DTE_43'
ON DUPLICATE KEY UPDATE sii_dte_name = VALUES(sii_dte_name), amount_mode = VALUES(amount_mode), is_enabled = VALUES(is_enabled);

INSERT INTO dte_document_type_settings (
  document_type_id,
  sii_dte_type,
  sii_dte_name,
  amount_mode,
  emission_policy,
  provider_code,
  is_enabled
)
SELECT id, 110, 'Factura de exportacion electronica', 'NET', 'MANUAL', 'LIBREDTE', (SELECT dte_enabled FROM dte_system_settings WHERE id = 1)
FROM document_types WHERE document_type_code = 'DTE_110'
ON DUPLICATE KEY UPDATE sii_dte_name = VALUES(sii_dte_name), amount_mode = VALUES(amount_mode), is_enabled = VALUES(is_enabled);

INSERT INTO dte_document_type_settings (
  document_type_id,
  sii_dte_type,
  sii_dte_name,
  amount_mode,
  emission_policy,
  provider_code,
  is_enabled
)
SELECT id, 111, 'Nota de debito de exportacion electronica', 'NET', 'MANUAL', 'LIBREDTE', (SELECT dte_enabled FROM dte_system_settings WHERE id = 1)
FROM document_types WHERE document_type_code = 'DTE_111'
ON DUPLICATE KEY UPDATE sii_dte_name = VALUES(sii_dte_name), amount_mode = VALUES(amount_mode), is_enabled = VALUES(is_enabled);

INSERT INTO dte_document_type_settings (
  document_type_id,
  sii_dte_type,
  sii_dte_name,
  amount_mode,
  emission_policy,
  provider_code,
  is_enabled
)
SELECT id, 112, 'Nota de credito de exportacion electronica', 'NET', 'MANUAL', 'LIBREDTE', (SELECT dte_enabled FROM dte_system_settings WHERE id = 1)
FROM document_types WHERE document_type_code = 'DTE_112'
ON DUPLICATE KEY UPDATE sii_dte_name = VALUES(sii_dte_name), amount_mode = VALUES(amount_mode), is_enabled = VALUES(is_enabled);

UPDATE dte_document_type_settings dts
JOIN dte_system_settings settings ON settings.id = 1
SET dts.is_enabled = settings.dte_enabled
WHERE dts.deleted_at IS NULL;

UPDATE document_types dt
JOIN dte_system_settings settings ON settings.id = 1
SET dt.is_active = settings.dte_enabled
WHERE dt.deleted_at IS NULL
  AND dt.document_type_code LIKE 'DTE\_%';

