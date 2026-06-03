-- =====================================================
-- Seed DTE
-- Archivo: 20260603_1315_seed_dte.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO document_types (document_type_code, document_type_name, document_category, requires_approval, generates_movement, movement_type) VALUES

-- DOCUMENTOS DE VENTA (Afectos y Exentos)
('DTE_33', 'Factura Electrónica', 'SALE', FALSE, TRUE, 'OUT'),
('DTE_34', 'Factura No Afecta o Exenta Electrónica', 'SALE', FALSE, TRUE, 'OUT'),
('DTE_39', 'Boleta Electrónica', 'SALE', FALSE, TRUE, 'OUT'),
('DTE_41', 'Boleta Exenta Electrónica', 'SALE', FALSE, TRUE, 'OUT'),

-- NOTAS DE CRÉDITO Y DÉBITO
('DTE_61', 'Nota de Crédito Electrónica', 'SALE', FALSE, TRUE, 'IN'),
('DTE_56', 'Nota de Débito Electrónica', 'SALE', FALSE, TRUE, 'OUT'),

-- GUÍAS DE DESPACHO
('DTE_52', 'Guía de Despacho Electrónica', 'TRANSFER', FALSE, TRUE, 'TRANSFER'),

-- DOCUMENTOS DE COMPRA
('DTE_46', 'Factura de Compra Electrónica', 'PURCHASE', FALSE, TRUE, 'IN'),

-- DOCUMENTOS ESPECIALES
('DTE_43', 'Liquidación Factura Electrónica', 'PURCHASE', TRUE, TRUE, 'IN'),
('DTE_110', 'Factura de Exportación Electrónica', 'SALE', TRUE, TRUE, 'OUT'),
('DTE_111', 'Nota de Débito de Exportación Electrónica', 'SALE', TRUE, TRUE, 'OUT'),
('DTE_112', 'Nota de Crédito de Exportación Electrónica', 'SALE', TRUE, TRUE, 'IN');

-- =====================================================
-- DATOS DE EJEMPLO PARA CONFIGURACIÓN
-- =====================================================

-- Ejemplo de configuración de empresa
INSERT INTO dte_company_config (
    company_rut,
    company_name,
    company_business_name,
    company_address,
    company_comuna,
    company_city,
    company_region,
    economic_activity_code,
    economic_activity_name,
    dte_environment
) VALUES (
    '12345678-9',
    'Mi Empresa SpA',
    'Mi Empresa Sociedad por Acciones',
    'Av. Libertador 1234',
    'Providencia',
    'Santiago',
    'Región Metropolitana',
    '4711',
    'Comercio al por menor en almacenes no especializados',
    'CERTIFICACION'
);

SET FOREIGN_KEY_CHECKS = 1;
