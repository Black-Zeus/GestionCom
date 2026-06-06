-- Unifica accesos de clientes y proveedores en un solo menu lateral.
-- Mueve reportes de cliente a Reportes de gestion.

SET @customer_supplier_parent_id := (SELECT id FROM menu_items WHERE menu_code = 'customers' LIMIT 1);
SET @supplier_parent_id := (SELECT id FROM menu_items WHERE menu_code = 'suppliers' LIMIT 1);
SET @management_reports_id := (SELECT id FROM menu_items WHERE menu_code = 'management_reports' LIMIT 1);

UPDATE menu_items
SET menu_name = 'Clientes y proveedores',
    menu_description = 'Clientes, proveedores y datos maestros comerciales',
    icon_name = 'team-line',
    menu_path = '/customers-suppliers',
    required_permission_id = NULL,
    is_active = TRUE,
    is_visible = TRUE,
    sort_order = 30
WHERE menu_code = 'customers';

UPDATE menu_items
SET parent_id = @customer_supplier_parent_id,
    menu_name = 'Listado de clientes',
    menu_description = 'Mantenedor de clientes',
    sort_order = 10,
    menu_level = 2,
    menu_path = '/customers',
    is_active = TRUE,
    is_visible = TRUE
WHERE menu_code = 'customers_list';

UPDATE menu_items
SET parent_id = @customer_supplier_parent_id,
    menu_name = 'Listado de proveedores',
    menu_description = 'Mantenedor de proveedores',
    sort_order = 20,
    menu_level = 2,
    menu_path = '/suppliers',
    is_active = TRUE,
    is_visible = TRUE
WHERE menu_code = 'suppliers_list';

UPDATE menu_items
SET is_active = FALSE,
    is_visible = FALSE
WHERE menu_code = 'suppliers';

UPDATE menu_items
SET parent_id = @management_reports_id,
    menu_name = 'Estado de cuenta de clientes',
    menu_description = 'Reporte de estado de cuenta de clientes',
    sort_order = 70,
    menu_level = 2,
    menu_path = '/customers/account-status',
    is_active = TRUE,
    is_visible = TRUE
WHERE menu_code = 'account_status';

UPDATE menu_items
SET parent_id = @management_reports_id,
    menu_name = 'Historial de compras de clientes',
    menu_description = 'Reporte de historial de compras de clientes',
    sort_order = 80,
    menu_level = 2,
    menu_path = '/customers/purchase-history',
    is_active = TRUE,
    is_visible = TRUE
WHERE menu_code = 'purchase_history';
