-- =====================================================
-- Seed mapa de tablas legacy
-- Archivo: 20260603_1408_seed_legacy_table_map.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

INSERT IGNORE INTO legacy_table_map
    (legacy_table_name, modern_table_name, migration_strategy, notes)
VALUES
    ('proveedor', 'suppliers', 'DIRECT', 'Maestro de proveedores'),
    ('suc_prov', 'supplier_addresses', 'SPLIT', 'Sucursales/direcciones de proveedor'),
    ('bancos', 'banks', 'DIRECT', 'Maestro de bancos'),
    ('cheque', 'check_register', 'DIRECT', 'Cartera de cheques recibidos/emitidos'),
    ('pagos', 'customer_payments', 'SPLIT', 'Pagos de clientes normalizados'),
    ('pagos_enca', 'customer_payments', 'SPLIT', 'Cabeceras de pagos'),
    ('pagos_deta', 'payment_allocations', 'SPLIT', 'Imputacion de pagos'),
    ('ctacte', 'accounts_receivable', 'SPLIT', 'Cuenta corriente de clientes'),
    ('mov_inv_enc', 'documents', 'SPLIT', 'Cabecera de documentos/movimientos'),
    ('mov_inv_deta', 'document_items', 'SPLIT', 'Detalle de documentos/movimientos'),
    ('aj_tras_enc', 'documents', 'SPLIT', 'Ajustes y transferencias'),
    ('aj_tras_deta', 'document_items', 'SPLIT', 'Detalle de ajustes y transferencias'),
    ('productos', 'products/product_variants/product_variant_attributes', 'SPLIT', 'Producto plano legacy a producto + variantes + atributos'),
    ('colores', 'attribute_values', 'DIRECT', 'Valores de atributo color'),
    ('tallas', 'attribute_values', 'DIRECT', 'Valores de atributo talla'),
    ('lista_precio_encabezado', 'price_lists', 'DIRECT', 'Listas de precio'),
    ('lista_precio_productos', 'price_list_items', 'DIRECT', 'Items de listas de precio'),
    ('dev_enc', 'return_documents', 'DIRECT', 'Cabecera devoluciones/cambios'),
    ('dev_deta', 'return_document_items', 'DIRECT', 'Detalle devoluciones/cambios'),
    ('cajachica', 'petty_cash_expenses', 'SPLIT', 'Movimientos de caja chica'),
    ('dolar', 'currency_exchange_rates', 'DIRECT', 'Tipo de cambio diario');

-- =====================================================
-- CAMBIO DE NUMERACION, MONEDAS Y LIBROS TRIBUTARIOS
-- =====================================================

SET FOREIGN_KEY_CHECKS = 1;
