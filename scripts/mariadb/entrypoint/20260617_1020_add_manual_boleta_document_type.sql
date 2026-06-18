-- Agrega boleta manual como tipo basico separado del ticket interno.

INSERT INTO document_types (
  document_type_code,
  document_type_name,
  document_category,
  requires_approval,
  generates_movement,
  movement_type,
  is_active
) VALUES (
  'MANUAL_39',
  'Boleta Manual',
  'SALE',
  0,
  1,
  'OUT',
  1
) ON DUPLICATE KEY UPDATE
  document_type_name = VALUES(document_type_name),
  document_category = VALUES(document_category),
  requires_approval = VALUES(requires_approval),
  generates_movement = VALUES(generates_movement),
  movement_type = VALUES(movement_type),
  is_active = VALUES(is_active),
  deleted_at = NULL;

UPDATE document_types
SET
  document_type_code = 'MANUAL_39',
  document_type_name = 'Boleta Manual',
  deleted_at = NULL,
  is_active = 1
WHERE document_type_code = 'BOLETA';
