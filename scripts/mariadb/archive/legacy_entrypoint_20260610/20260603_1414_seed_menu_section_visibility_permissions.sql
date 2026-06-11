-- =====================================================
-- Seed permisos de visibilidad por seccion de menu
-- Archivo: 20260603_1414_seed_menu_section_visibility_permissions.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

INSERT IGNORE INTO permissions (
    permission_code,
    permission_name,
    permission_group,
    permission_description,
    is_active
) VALUES
('HOME_VISIBLE', 'Visible en menu', 'HOME', 'Permite ver la seccion Inicio en el menu.', TRUE),
('SALES_VISIBLE', 'Visible en menu', 'SALES', 'Permite ver la seccion Ventas en el menu.', TRUE),
('CUSTOMERS_VISIBLE', 'Visible en menu', 'CUSTOMERS', 'Permite ver la seccion Clientes en el menu.', TRUE),
('CASH_VISIBLE', 'Visible en menu', 'CASH_CONTROL', 'Permite ver la seccion Caja en el menu.', TRUE),
('INVENTORY_VISIBLE', 'Visible en menu', 'INVENTORY', 'Permite ver la seccion Inventario en el menu.', TRUE),
('SUPPLIERS_VISIBLE', 'Visible en menu', 'SUPPLIERS', 'Permite ver la seccion Proveedores en el menu.', TRUE),
('FINANCE_VISIBLE', 'Visible en menu', 'FINANCE', 'Permite ver la seccion Finanzas en el menu.', TRUE),
('DOCUMENTS_VISIBLE', 'Visible en menu', 'DOCUMENTS', 'Permite ver la seccion Documentos en el menu.', TRUE),
('METRICS_VISIBLE', 'Visible en menu', 'METRICS', 'Permite ver la seccion Metricas en el menu.', TRUE),
('REPORTS_VISIBLE', 'Visible en menu', 'REPORTS', 'Permite ver la seccion Reportes Gestion en el menu.', TRUE),
('AUDIT_VISIBLE', 'Visible en menu', 'AUDIT', 'Permite ver la seccion Reportes Auditoria en el menu.', TRUE),
('SETTINGS_VISIBLE', 'Visible en menu', 'SETTINGS', 'Permite ver la seccion Configuracion en el menu.', TRUE),
('ADMIN_VISIBLE', 'Visible en menu', 'ADMIN', 'Permite ver la seccion Administracion en el menu.', TRUE);

INSERT IGNORE INTO role_permissions (
    role_id,
    permission_id,
    granted_by_user_id
)
SELECT
    r.id,
    p.id,
    1
FROM roles r
JOIN permissions p ON p.permission_code IN (
    'HOME_VISIBLE',
    'SALES_VISIBLE',
    'CUSTOMERS_VISIBLE',
    'CASH_VISIBLE',
    'INVENTORY_VISIBLE',
    'SUPPLIERS_VISIBLE',
    'FINANCE_VISIBLE',
    'DOCUMENTS_VISIBLE',
    'METRICS_VISIBLE',
    'REPORTS_VISIBLE',
    'AUDIT_VISIBLE',
    'SETTINGS_VISIBLE',
    'ADMIN_VISIBLE'
)
WHERE r.role_code = 'ADMIN';

INSERT IGNORE INTO role_permissions (
    role_id,
    permission_id,
    granted_by_user_id
)
SELECT
    r.id,
    p.id,
    1
FROM roles r
JOIN permissions p ON p.permission_code = 'HOME_VISIBLE'
WHERE r.is_active = TRUE;

SET FOREIGN_KEY_CHECKS = 1;
