-- Sincroniza el estado de los tipos de documento DTE con el switch global del modulo.
-- Si la integracion DTE esta apagada, los DTE_* dejan de quedar disponibles como
-- tipos activos en ventas; si esta encendida, se vuelven a habilitar.

UPDATE dte_document_type_settings dts
JOIN dte_system_settings settings ON settings.id = 1
SET dts.is_enabled = settings.dte_enabled
WHERE dts.deleted_at IS NULL;

UPDATE document_types dt
JOIN dte_document_type_settings dts ON dts.document_type_id = dt.id
JOIN dte_system_settings settings ON settings.id = 1
SET dt.is_active = settings.dte_enabled
WHERE dt.deleted_at IS NULL
  AND dts.deleted_at IS NULL
  AND dt.document_type_code LIKE 'DTE\_%';

