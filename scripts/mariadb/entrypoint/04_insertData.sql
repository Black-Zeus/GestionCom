
-- =====================================================
-- SISTEMA DE INVENTARIO COMPLETO
-- Base de datos: MariaDB 10.6.22
-- Convención: snake_case, soft delete, auditoría completa
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- DATOS INICIALES BÁSICOS
-- =====================================================

-- Insertar permisos básicos del sistema
INSERT INTO permissions (permission_code, permission_name, permission_group) VALUES
-- Productos
('PRODUCTS_VIEW', 'Ver productos', 'PRODUCTS'),
('PRODUCTS_CREATE', 'Crear productos', 'PRODUCTS'),
('PRODUCTS_EDIT', 'Editar productos', 'PRODUCTS'),
('PRODUCTS_DELETE', 'Eliminar productos', 'PRODUCTS'),
('CATEGORIES_MANAGE', 'Gestionar categorías', 'PRODUCTS'),
('ATTRIBUTES_MANAGE', 'Gestionar atributos', 'PRODUCTS'),

-- Inventario
('STOCK_VIEW', 'Ver stock', 'INVENTORY'),
('STOCK_ADJUST', 'Ajustar stock', 'INVENTORY'),
('STOCK_TRANSFER', 'Transferir stock', 'INVENTORY'),
('WAREHOUSES_MANAGE', 'Gestionar bodegas', 'INVENTORY'),
('MOVEMENTS_VIEW', 'Ver movimientos', 'INVENTORY'),

-- Precios
('PRICES_VIEW', 'Ver precios', 'PRICING'),
('PRICES_MANAGE', 'Gestionar precios', 'PRICING'),
('PROMOTIONS_MANAGE', 'Gestionar promociones', 'PRICING'),

-- Documentos
('DOCUMENTS_VIEW', 'Ver documentos', 'DOCUMENTS'),
('DOCUMENTS_CREATE', 'Crear documentos', 'DOCUMENTS'),
('DOCUMENTS_APPROVE', 'Aprobar documentos', 'DOCUMENTS'),
('DOCUMENTS_CANCEL', 'Cancelar documentos', 'DOCUMENTS'),

-- Reportes
('REPORTS_VIEW', 'Ver reportes', 'REPORTS'),
('REPORTS_EXPORT', 'Exportar reportes', 'REPORTS'),

-- Administración
('USERS_MANAGE', 'Gestionar usuarios', 'ADMIN'),
('ROLES_MANAGE', 'Gestionar roles', 'ADMIN'),
('PERMISSIONS_MANAGE', 'Gestionar permisos', 'ADMIN'),
('SYSTEM_CONFIG', 'Configurar sistema', 'ADMIN'),
('AUDIT_VIEW', 'Ver auditoría', 'ADMIN');

-- Insertar roles básicos
INSERT INTO roles (role_code, role_name, role_description, is_system_role) VALUES
('ADMIN', 'Administrador', 'Acceso completo al sistema', TRUE),
('WAREHOUSE_MANAGER', 'Jefe de Bodega', 'Gestión completa de inventario y bodegas', TRUE),
('SALES_PERSON', 'Vendedor', 'Gestión de ventas y consulta de productos', TRUE),
('VIEWER', 'Consultor', 'Solo lectura de información', TRUE);

-- Insertar características del sistema
INSERT INTO system_features (feature_code, feature_name, feature_description, feature_type, default_value, current_value) VALUES
('BATCH_CONTROL_GLOBAL', 'Control de Lotes Global', 'Activar control de lotes en todo el sistema', 'BOOLEAN', 'false', 'false'),
('EXPIRY_DATE_GLOBAL', 'Fechas de Vencimiento Global', 'Activar control de fechas de vencimiento', 'BOOLEAN', 'false', 'false'),
('SERIAL_NUMBERS_GLOBAL', 'Números de Serie Global', 'Activar control de números de serie', 'BOOLEAN', 'false', 'false'),
('LOCATION_TRACKING_GLOBAL', 'Seguimiento de Ubicación Global', 'Activar seguimiento de ubicaciones en bodegas', 'BOOLEAN', 'false', 'false'),
('MULTIPLE_BARCODES', 'Códigos de Barras Múltiples', 'Permitir múltiples códigos de barras por producto', 'BOOLEAN', 'true', 'true'),
('PRICE_LISTS_DERIVATION', 'Derivación de Listas de Precios', 'Permitir crear listas derivadas de otras listas', 'BOOLEAN', 'true', 'true'),
('PROMOTIONS_ENABLED', 'Promociones Habilitadas', 'Activar sistema de promociones', 'BOOLEAN', 'true', 'true');

-- Insertar unidades de medida básicas
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

-- Insertar tipos de documentos básicos
INSERT INTO document_types (document_type_code, document_type_name, document_category, generates_movement, movement_type) VALUES
('PURCHASE_RECEIPT', 'Guía de Entrada por Compra', 'PURCHASE', TRUE, 'IN'),
('SALE_INVOICE', 'Factura de Venta', 'SALE', TRUE, 'OUT'),
('WAREHOUSE_TRANSFER', 'Transferencia entre Bodegas', 'TRANSFER', TRUE, 'TRANSFER'),
('STOCK_ADJUSTMENT', 'Ajuste de Inventario', 'INVENTORY', TRUE, 'ADJUSTMENT'),
('INVENTORY_COUNT', 'Conteo de Inventario', 'INVENTORY', FALSE, NULL),
('CREDIT_NOTE', 'Nota de Crédito', 'SALE', TRUE, 'IN'),
('RETURN_NOTE', 'Nota de Devolución', 'PURCHASE', TRUE, 'OUT'),
('PRE_SALE', 'Pre-Venta / Voucher', 'SALE', FALSE, NULL);

-- Insertar grupos de atributos básicos
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