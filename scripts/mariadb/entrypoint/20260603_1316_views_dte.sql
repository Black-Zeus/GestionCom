-- =====================================================
-- Vistas DTE
-- Archivo: 20260603_1316_views_dte.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- VISTA PARA DOCUMENTOS DTE CON ESTADO
-- =====================================================

CREATE VIEW v_dte_documents AS
SELECT
    d.id,
    d.document_number,
    d.document_date,
    dt.document_type_name,
    d.dte_type_code,
    d.dte_folio,
    d.dte_status,
    d.total_amount,
    d.rut_emisor,
    d.rut_receptor,
    d.customer_supplier_name,
    d.ambiente_dte,
    d.dte_sent_date,
    d.dte_accepted_date,
    CASE
        WHEN d.dte_status = 'ACCEPTED' THEN 'Aceptado por SII'
        WHEN d.dte_status = 'SENT' THEN 'Enviado al SII'
        WHEN d.dte_status = 'REJECTED' THEN 'Rechazado por SII'
        WHEN d.dte_status = 'CANCELLED' THEN 'Anulado'
        ELSE 'Borrador'
    END as status_description,
    d.created_at,
    d.created_by_user_id
FROM documents d
JOIN document_types dt ON d.document_type_id = dt.id
WHERE d.dte_type_code IS NOT NULL
    AND d.deleted_at IS NULL
ORDER BY d.created_at DESC;

SET FOREIGN_KEY_CHECKS = 1;
