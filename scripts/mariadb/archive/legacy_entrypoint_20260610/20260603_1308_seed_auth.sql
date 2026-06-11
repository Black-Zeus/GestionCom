-- =====================================================
-- Seed permisos y roles base
-- Archivo: 20260603_1308_seed_auth.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

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

SET FOREIGN_KEY_CHECKS = 1;
