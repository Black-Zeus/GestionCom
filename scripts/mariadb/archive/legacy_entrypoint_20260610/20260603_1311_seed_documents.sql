-- =====================================================
-- Seed tipos de documentos base
-- Archivo: 20260603_1311_seed_documents.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO document_types (document_type_code, document_type_name, document_category, generates_movement, movement_type) VALUES
('PURCHASE_RECEIPT', 'Guía de Entrada por Compra', 'PURCHASE', TRUE, 'IN'),
('SALE_INVOICE', 'Factura de Venta', 'SALE', TRUE, 'OUT'),
('WAREHOUSE_TRANSFER', 'Transferencia entre Bodegas', 'TRANSFER', TRUE, 'TRANSFER'),
('STOCK_ADJUSTMENT', 'Ajuste de Inventario', 'INVENTORY', TRUE, 'ADJUSTMENT'),
('INVENTORY_COUNT', 'Conteo de Inventario', 'INVENTORY', FALSE, NULL),
('CREDIT_NOTE', 'Nota de Crédito', 'SALE', TRUE, 'IN'),
('RETURN_NOTE', 'Nota de Devolución', 'PURCHASE', TRUE, 'OUT'),
('PRE_SALE', 'Pre-Venta / Voucher', 'SALE', FALSE, NULL);

SET FOREIGN_KEY_CHECKS = 1;
