-- Agrega tipo de documento "Ticket de Venta" si no existe
INSERT INTO document_types (document_type_code, document_type_name, document_category, requires_approval, generates_movement, movement_type, is_active)
SELECT 'TICKET', 'Ticket de Venta', 'SALE', 0, 1, 'OUT', 1
WHERE NOT EXISTS (
  SELECT 1 FROM document_types WHERE document_type_code = 'TICKET'
);
