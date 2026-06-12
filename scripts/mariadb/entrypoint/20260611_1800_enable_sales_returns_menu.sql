-- Enable Cambio y devoluciones (sales_returns) in the sales menu.
-- The menu item (id=24) was already seeded but left inactive.
-- Also links the existing RETURNS_ACCESS permission (id=168) for proper access control.
USE inventario;

UPDATE menu_items
SET
    is_active             = 1,
    is_visible            = 1,
    menu_name             = 'Cambio y devoluciones',
    menu_description      = 'Procesar cambios y devoluciones de productos',
    required_permission_id = 168,
    updated_at            = NOW()
WHERE menu_code = 'sales_returns';

UPDATE menu_items
SET
    menu_name        = 'Cambio y devoluciones',
    menu_description = 'Gestion de cambios y devoluciones de ventas.',
    updated_at       = NOW()
WHERE menu_code = 'returns';
