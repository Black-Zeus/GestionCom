-- =====================================================
-- Seed retail critico
-- Archivo: 20260603_1340_seed_critical_retail.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- SECCIÓN 7: DATOS INICIALES
-- =====================================================

-- Insertar razones de devolución estándar
INSERT INTO return_reasons (reason_code, reason_name, reason_description, requires_approval, affects_stock, allows_exchange, allows_refund, max_days_after_sale) VALUES
('DEFECTIVE', 'Producto Defectuoso', 'El producto presenta fallas de fabricación', FALSE, TRUE, TRUE, TRUE, 30),
('WRONG_SIZE', 'Talla Incorrecta', 'Cliente eligió talla equivocada', FALSE, TRUE, TRUE, TRUE, 15),
('WRONG_COLOR', 'Color Incorrecto', 'Cliente eligió color equivocado', FALSE, TRUE, TRUE, TRUE, 15),
('NOT_AS_DESCRIBED', 'No Coincide con Descripción', 'El producto no coincide con la descripción', FALSE, TRUE, TRUE, TRUE, 7),
('CHANGED_MIND', 'Cambió de Opinión', 'Cliente ya no desea el producto', FALSE, TRUE, TRUE, TRUE, 7),
('WRONG_ITEM', 'Producto Incorrecto', 'Se entregó producto equivocado', FALSE, TRUE, TRUE, TRUE, 30),
('DAMAGED_SHIPPING', 'Dañado en Envío', 'Producto dañado durante el transporte', FALSE, TRUE, TRUE, TRUE, 5),
('EXPIRED', 'Producto Vencido', 'Producto con fecha de vencimiento pasada', TRUE, FALSE, FALSE, TRUE, NULL),
('WARRANTY', 'Garantía', 'Reclamo de garantía del fabricante', TRUE, FALSE, TRUE, FALSE, 365),
('DUPLICATE_ORDER', 'Pedido Duplicado', 'Cliente realizó pedido por error', FALSE, TRUE, FALSE, TRUE, 1);

-- Insertar configuraciones críticas para productos demo (si existen)
INSERT IGNORE INTO stock_critical_config (product_variant_id, warehouse_id, minimum_stock, safety_stock, reorder_quantity, lead_time_days, alert_enabled)
SELECT
   pv.id,
   w.id,
   CASE
       WHEN w.warehouse_type = 'STORE' THEN 5     -- Tiendas: stock mínimo menor
       WHEN w.warehouse_type = 'WAREHOUSE' THEN 20 -- Bodegas: stock mínimo mayor
       ELSE 10
   END as minimum_stock,
   CASE
       WHEN w.warehouse_type = 'STORE' THEN 2     -- Stock de seguridad menor en tiendas
       WHEN w.warehouse_type = 'WAREHOUSE' THEN 10 -- Stock de seguridad mayor en bodegas
       ELSE 5
   END as safety_stock,
   CASE
       WHEN w.warehouse_type = 'STORE' THEN 25    -- Reorden menor en tiendas
       WHEN w.warehouse_type = 'WAREHOUSE' THEN 100 -- Reorden mayor en bodegas
       ELSE 50
   END as reorder_quantity,
   CASE
       WHEN w.warehouse_type = 'STORE' THEN 3     -- Lead time menor para tiendas
       WHEN w.warehouse_type = 'WAREHOUSE' THEN 7  -- Lead time normal para bodegas
       ELSE 5
   END as lead_time_days,
   TRUE as alert_enabled
FROM product_variants pv
CROSS JOIN warehouses w
WHERE pv.deleted_at IS NULL
   AND w.deleted_at IS NULL
LIMIT 50; -- Limitamos para no sobrecargar en demo

-- Insertar permisos para las nuevas funcionalidades
INSERT INTO permissions (permission_code, permission_name, permission_group) VALUES
('RETURNS_VIEW', 'Ver Devoluciones', 'RETURNS'),
('RETURNS_CREATE', 'Crear Devoluciones', 'RETURNS'),
('RETURNS_APPROVE', 'Aprobar Devoluciones', 'RETURNS'),
('RETURNS_PROCESS', 'Procesar Devoluciones', 'RETURNS'),
('STOCK_ALERTS_VIEW', 'Ver Alertas de Stock', 'INVENTORY'),
('STOCK_ALERTS_MANAGE', 'Gestionar Alertas de Stock', 'INVENTORY'),
('REORDER_SUGGESTIONS_VIEW', 'Ver Sugerencias de Reorden', 'INVENTORY'),
('REORDER_SUGGESTIONS_APPROVE', 'Aprobar Sugerencias de Reorden', 'INVENTORY'),
('PAYMENT_METHODS_FRACTIONAL', 'Usar Pagos Fraccionados', 'PAYMENTS'),
('CRITICAL_STOCK_CONFIG', 'Configurar Stock Crítico', 'INVENTORY');

-- Agregar elementos del menú para las nuevas funcionalidades
INSERT INTO menu_items (parent_id, menu_code, menu_name, menu_description, icon_name, menu_url, menu_type, required_permission_id, sort_order, menu_level, menu_path) VALUES
-- Devoluciones en Punto de Venta
((SELECT id FROM menu_items WHERE menu_code = 'sales'), 'sales_returns_manage', 'Gestionar Devoluciones', 'Procesar devoluciones y cambios completos', 'refund-2-line', '/sales/returns-manage', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'RETURNS_CREATE'), 75, 2, '/sales/returns-manage'),

-- Alertas de Stock en Inventario
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'inventory_alerts', 'Alertas de Stock', 'Ver alertas de stock crítico y sugerencias', 'alarm-warning-line', '/inventory/alerts', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'STOCK_ALERTS_VIEW'), 70, 2, '/inventory/alerts'),
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'inventory_reorder', 'Sugerencias de Reorden', 'Sugerencias automáticas de reabastecimiento', 'shopping-cart-2-line', '/inventory/reorder-suggestions', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'REORDER_SUGGESTIONS_VIEW'), 80, 2, '/inventory/reorder-suggestions'),

-- Configuración en Administración
((SELECT id FROM menu_items WHERE menu_code = 'administration'), 'admin_stock_critical', 'Configurar Stock Crítico', 'Configuración de alertas y puntos de reorden', 'settings-4-line', '/administration/critical-stock-config', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'CRITICAL_STOCK_CONFIG'), 110, 2, '/administration/critical-stock-config');

-- Asignar permisos de devoluciones a roles existentes
INSERT INTO role_permissions (role_id, permission_id) VALUES
-- ADMIN: todos los permisos de devoluciones
((SELECT id FROM roles WHERE role_code = 'ADMIN'), (SELECT id FROM permissions WHERE permission_code = 'RETURNS_VIEW')),
((SELECT id FROM roles WHERE role_code = 'ADMIN'), (SELECT id FROM permissions WHERE permission_code = 'RETURNS_CREATE')),
((SELECT id FROM roles WHERE role_code = 'ADMIN'), (SELECT id FROM permissions WHERE permission_code = 'RETURNS_APPROVE')),
((SELECT id FROM roles WHERE role_code = 'ADMIN'), (SELECT id FROM permissions WHERE permission_code = 'RETURNS_PROCESS')),

-- WAREHOUSE_MANAGER: gestión completa de stock crítico
((SELECT id FROM roles WHERE role_code = 'WAREHOUSE_MANAGER'), (SELECT id FROM permissions WHERE permission_code = 'STOCK_ALERTS_VIEW')),
((SELECT id FROM roles WHERE role_code = 'WAREHOUSE_MANAGER'), (SELECT id FROM permissions WHERE permission_code = 'STOCK_ALERTS_MANAGE')),
((SELECT id FROM roles WHERE role_code = 'WAREHOUSE_MANAGER'), (SELECT id FROM permissions WHERE permission_code = 'REORDER_SUGGESTIONS_VIEW')),
((SELECT id FROM roles WHERE role_code = 'WAREHOUSE_MANAGER'), (SELECT id FROM permissions WHERE permission_code = 'REORDER_SUGGESTIONS_APPROVE')),
((SELECT id FROM roles WHERE role_code = 'WAREHOUSE_MANAGER'), (SELECT id FROM permissions WHERE permission_code = 'CRITICAL_STOCK_CONFIG')),

-- SALES_PERSON: crear y ver devoluciones, pagos fraccionados
((SELECT id FROM roles WHERE role_code = 'SALES_PERSON'), (SELECT id FROM permissions WHERE permission_code = 'RETURNS_VIEW')),
((SELECT id FROM roles WHERE role_code = 'SALES_PERSON'), (SELECT id FROM permissions WHERE permission_code = 'RETURNS_CREATE')),
((SELECT id FROM roles WHERE role_code = 'SALES_PERSON'), (SELECT id FROM permissions WHERE permission_code = 'PAYMENT_METHODS_FRACTIONAL')),

-- ACCOUNTANT: aprobar devoluciones costosas
((SELECT id FROM roles WHERE role_code = 'ACCOUNTANT'), (SELECT id FROM permissions WHERE permission_code = 'RETURNS_VIEW')),
((SELECT id FROM roles WHERE role_code = 'ACCOUNTANT'), (SELECT id FROM permissions WHERE permission_code = 'RETURNS_APPROVE'));

-- Configurar características del sistema para nuevas funcionalidades
INSERT INTO system_features (feature_code, feature_name, feature_description, feature_type, default_value, current_value) VALUES
('RETURNS_ENABLED', 'Devoluciones Habilitadas', 'Permite procesar devoluciones de productos', 'BOOLEAN', 'true', 'true'),
('RETURNS_REQUIRE_APPROVAL', 'Devoluciones Requieren Aprobación', 'Si las devoluciones requieren aprobación supervisor', 'BOOLEAN', 'false', 'false'),
('RETURNS_MAX_DAYS_DEFAULT', 'Días Máximos Devolución por Defecto', 'Días máximos para devoluciones sin razón específica', 'INTEGER', '15', '15'),
('FRACTIONAL_PAYMENTS_ENABLED', 'Pagos Fraccionados Habilitados', 'Permite usar múltiples métodos de pago por venta', 'BOOLEAN', 'true', 'true'),
('FRACTIONAL_PAYMENTS_MAX_METHODS', 'Máximo Métodos por Venta', 'Número máximo de métodos de pago por documento', 'INTEGER', '5', '5'),
('STOCK_ALERTS_ENABLED', 'Alertas de Stock Habilitadas', 'Generar alertas automáticas de stock crítico', 'BOOLEAN', 'true', 'true'),
('STOCK_ALERTS_FREQUENCY_HOURS', 'Frecuencia Alertas Stock (Horas)', 'Frecuencia en horas para generar alertas', 'INTEGER', '24', '24'),
('REORDER_SUGGESTIONS_ENABLED', 'Sugerencias Reorden Habilitadas', 'Generar sugerencias automáticas de reorden', 'BOOLEAN', 'true', 'true'),
('REORDER_SUGGESTIONS_DAYS_ANALYSIS', 'Días Análisis Sugerencias', 'Días de histórico para calcular sugerencias', 'INTEGER', '90', '90');

-- Datos demo para testing de alertas (simular algunos productos con stock bajo)
UPDATE stock
SET current_quantity = 2,
   last_sale_date = DATE_SUB(CURDATE(), INTERVAL 3 DAY),
   avg_monthly_sales = 15,
   rotation_category = 'FAST'
WHERE id IN (
   SELECT s.id FROM (
       SELECT id FROM stock ORDER BY RAND() LIMIT 3
   ) s
);

UPDATE stock
SET current_quantity = 0,
   last_sale_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY),
   avg_monthly_sales = 8,
   rotation_category = 'MEDIUM'
WHERE id IN (
   SELECT s.id FROM (
       SELECT id FROM stock ORDER BY RAND() LIMIT 1
   ) s
);

SET FOREIGN_KEY_CHECKS = 1;
