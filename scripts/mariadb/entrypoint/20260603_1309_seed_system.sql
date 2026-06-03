-- =====================================================
-- Seed features base
-- Archivo: 20260603_1309_seed_system.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO system_features (feature_code, feature_name, feature_description, feature_type, default_value, current_value) VALUES
('BATCH_CONTROL_GLOBAL', 'Control de Lotes Global', 'Activar control de lotes en todo el sistema', 'BOOLEAN', 'false', 'false'),
('EXPIRY_DATE_GLOBAL', 'Fechas de Vencimiento Global', 'Activar control de fechas de vencimiento', 'BOOLEAN', 'false', 'false'),
('SERIAL_NUMBERS_GLOBAL', 'Números de Serie Global', 'Activar control de números de serie', 'BOOLEAN', 'false', 'false'),
('LOCATION_TRACKING_GLOBAL', 'Seguimiento de Ubicación Global', 'Activar seguimiento de ubicaciones en bodegas', 'BOOLEAN', 'false', 'false'),
('MULTIPLE_BARCODES', 'Códigos de Barras Múltiples', 'Permitir múltiples códigos de barras por producto', 'BOOLEAN', 'true', 'true'),
('PRICE_LISTS_DERIVATION', 'Derivación de Listas de Precios', 'Permitir crear listas derivadas de otras listas', 'BOOLEAN', 'true', 'true'),
('PROMOTIONS_ENABLED', 'Promociones Habilitadas', 'Activar sistema de promociones', 'BOOLEAN', 'true', 'true');

SET FOREIGN_KEY_CHECKS = 1;
