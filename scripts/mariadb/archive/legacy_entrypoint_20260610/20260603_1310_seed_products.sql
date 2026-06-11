-- =====================================================
-- Seed unidades y atributos base
-- Archivo: 20260603_1310_seed_products.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO measurement_units (unit_code, unit_name, unit_symbol, unit_type, conversion_factor) VALUES
('UNIT', 'Unidad', 'UN', 'BASE', 1.000000),
('KG', 'Kilogramo', 'KG', 'BASE', 1.000000),
('GR', 'Gramo', 'GR', 'DERIVED', 0.001000),
('LT', 'Litro', 'LT', 'BASE', 1.000000),
('ML', 'Mililitro', 'ML', 'DERIVED', 0.001000),
('MT', 'Metro', 'MT', 'BASE', 1.000000),
('CM', 'Centímetro', 'CM', 'DERIVED', 0.010000),
('BOX', 'Caja', 'CAJA', 'DERIVED', 1.000000),
('DOZEN', 'Docena', 'DOC', 'DERIVED', 12.000000),
('PACK', 'Paquete', 'PACK', 'DERIVED', 1.000000);

-- Actualizar referencias de unidades base para las derivadas
UPDATE measurement_units SET base_unit_id = (SELECT id FROM measurement_units WHERE unit_code = 'KG') WHERE unit_code = 'GR';
UPDATE measurement_units SET base_unit_id = (SELECT id FROM measurement_units WHERE unit_code = 'LT') WHERE unit_code = 'ML';
UPDATE measurement_units SET base_unit_id = (SELECT id FROM measurement_units WHERE unit_code = 'MT') WHERE unit_code = 'CM';
UPDATE measurement_units SET base_unit_id = (SELECT id FROM measurement_units WHERE unit_code = 'UNIT') WHERE unit_code IN ('BOX', 'DOZEN', 'PACK');

INSERT INTO attribute_groups (group_code, group_name, group_description) VALUES
('PHYSICAL', 'Características Físicas', 'Dimensiones, peso, color, material'),
('PRESENTATION', 'Presentación', 'Talla, color, estilo, formato'),
('PACKAGING', 'Empaque', 'Tipo de envase, contenido, unidades por empaque'),
('TECHNICAL', 'Especificaciones Técnicas', 'Modelo, marca, especificaciones técnicas'),
('COMMERCIAL', 'Información Comercial', 'Proveedor, marca comercial, línea de producto');

-- Insertar atributos básicos
INSERT INTO attributes (attribute_group_id, attribute_code, attribute_name, attribute_type, affects_sku) VALUES
-- Características Físicas
((SELECT id FROM attribute_groups WHERE group_code = 'PHYSICAL'), 'COLOR', 'Color', 'SELECT', TRUE),
((SELECT id FROM attribute_groups WHERE group_code = 'PHYSICAL'), 'WEIGHT', 'Peso', 'NUMBER', FALSE),
((SELECT id FROM attribute_groups WHERE group_code = 'PHYSICAL'), 'MATERIAL', 'Material', 'SELECT', TRUE),

-- Presentación
((SELECT id FROM attribute_groups WHERE group_code = 'PRESENTATION'), 'SIZE', 'Talla', 'SELECT', TRUE),
((SELECT id FROM attribute_groups WHERE group_code = 'PRESENTATION'), 'STYLE', 'Estilo', 'SELECT', TRUE),
((SELECT id FROM attribute_groups WHERE group_code = 'PRESENTATION'), 'FORMAT', 'Formato', 'SELECT', TRUE),

-- Empaque
((SELECT id FROM attribute_groups WHERE group_code = 'PACKAGING'), 'PACKAGE_TYPE', 'Tipo de Empaque', 'SELECT', FALSE),
((SELECT id FROM attribute_groups WHERE group_code = 'PACKAGING'), 'UNITS_PER_PACK', 'Unidades por Empaque', 'NUMBER', TRUE),

-- Técnicas
((SELECT id FROM attribute_groups WHERE group_code = 'TECHNICAL'), 'BRAND', 'Marca', 'SELECT', FALSE),
((SELECT id FROM attribute_groups WHERE group_code = 'TECHNICAL'), 'MODEL', 'Modelo', 'TEXT', TRUE);

SET FOREIGN_KEY_CHECKS = 1;
