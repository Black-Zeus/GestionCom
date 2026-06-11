-- =====================================================
-- Alter documentos para proveedores y anulaciones
-- Archivo: 20260603_1401_alter_purchase_documents.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS supplier_id BIGINT UNSIGNED NULL AFTER customer_supplier_document,
    ADD COLUMN IF NOT EXISTS original_document_id BIGINT UNSIGNED NULL COMMENT 'Documento relacionado: anulacion, nota, cambio o correccion' AFTER supplier_id,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT NULL AFTER notes,
    ADD COLUMN IF NOT EXISTS cancelled_by_user_id BIGINT UNSIGNED NULL AFTER cancellation_reason,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP NULL AFTER cancelled_by_user_id;

CREATE INDEX IF NOT EXISTS idx_documents_supplier_id ON documents (supplier_id);
CREATE INDEX IF NOT EXISTS idx_documents_original_document_id ON documents (original_document_id);
CREATE INDEX IF NOT EXISTS idx_documents_cancelled_by_user_id ON documents (cancelled_by_user_id);

-- =====================================================
-- PROVEEDORES Y COMPRAS
-- =====================================================

ALTER TABLE documents
    ADD CONSTRAINT fk_documents_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

ALTER TABLE documents
    ADD CONSTRAINT fk_documents_original_document
    FOREIGN KEY (original_document_id) REFERENCES documents(id) ON DELETE SET NULL;

ALTER TABLE documents
    ADD CONSTRAINT fk_documents_cancelled_by_user
    FOREIGN KEY (cancelled_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

SET FOREIGN_KEY_CHECKS = 1;
