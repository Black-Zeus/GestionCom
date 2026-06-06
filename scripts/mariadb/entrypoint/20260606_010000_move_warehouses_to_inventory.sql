-- Normaliza navegacion de bodegas:
-- - Administrador de bodegas pasa a Inventario.
-- - Zonas de bodega deja de exponerse como entrada independiente.
-- - Stock critico permanece como mantenedor separado de Inventario.

SET @inventory_menu_id := (SELECT id FROM menu_items WHERE menu_code = 'inventory' LIMIT 1);
SET @warehouses_permission_id := (SELECT id FROM permissions WHERE permission_code = 'WAREHOUSES_ACCESS' LIMIT 1);

UPDATE menu_items
SET parent_id = @inventory_menu_id,
    menu_name = 'Administracion de bodegas',
    menu_description = 'Bodegas, tiendas, outlets y zonas operativas.',
    menu_url = '/inventory/warehouses',
    menu_path = '/inventory/warehouses',
    required_permission_id = @warehouses_permission_id,
    is_active = TRUE,
    is_visible = TRUE,
    sort_order = 35,
    menu_level = 2,
    updated_at = NOW()
WHERE menu_code = 'warehouses'
  AND @inventory_menu_id IS NOT NULL;

UPDATE menu_items
SET is_active = FALSE,
    is_visible = FALSE,
    updated_at = NOW()
WHERE menu_code = 'warehouse_zones'
   OR menu_url = '/inventory/warehouse-zones'
   OR menu_path = '/inventory/warehouse-zones';

UPDATE menu_items
SET parent_id = @inventory_menu_id,
    sort_order = 36,
    is_active = TRUE,
    is_visible = TRUE,
    updated_at = NOW()
WHERE menu_code = 'stock_critical_config'
  AND @inventory_menu_id IS NOT NULL;
