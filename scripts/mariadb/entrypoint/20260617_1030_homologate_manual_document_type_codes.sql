-- Homologa codigos de documentos manuales con los codigos SII/DTE.
-- DTE_33 <-> MANUAL_33, DTE_39 <-> MANUAL_39, DTE_61 <-> MANUAL_61.
-- TICKET se mantiene como documento interno sin equivalente tributario.

UPDATE document_types
SET
  document_type_code = 'MANUAL_33',
  document_type_name = 'Factura Manual'
WHERE document_type_code = 'SALE_INVOICE';

UPDATE document_types
SET
  document_type_code = 'MANUAL_39',
  document_type_name = 'Boleta Manual'
WHERE document_type_code = 'BOLETA';

UPDATE document_types
SET
  document_type_code = 'MANUAL_61',
  document_type_name = 'Nota de Credito Manual'
WHERE document_type_code = 'CREDIT_NOTE';

UPDATE sale_documents
SET
  document_type_code = CASE document_type_code
    WHEN 'SALE_INVOICE' THEN 'MANUAL_33'
    WHEN 'BOLETA' THEN 'MANUAL_39'
    WHEN 'CREDIT_NOTE' THEN 'MANUAL_61'
    ELSE document_type_code
  END,
  document_type_name = CASE document_type_code
    WHEN 'SALE_INVOICE' THEN 'Factura Manual'
    WHEN 'BOLETA' THEN 'Boleta Manual'
    WHEN 'CREDIT_NOTE' THEN 'Nota de Credito Manual'
    ELSE document_type_name
  END
WHERE document_type_code IN ('SALE_INVOICE', 'BOLETA', 'CREDIT_NOTE');

