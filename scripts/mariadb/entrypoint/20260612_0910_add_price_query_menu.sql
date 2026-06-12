-- Agrega el ítem de menú "Consulta de precios" al sidebar.
-- El módulo SalesPriceQuery ya existe en el frontend (ruta /sales/price-query)
-- pero no tenía entrada en la base de datos.
USE inventario;

INSERT INTO menu_items
  (menu_code, menu_name, menu_description, menu_url, menu_type, parent_id,
   is_active, is_visible, sort_order, menu_level, menu_path, required_permission_id, target_window)
VALUES
  ('price_query', 'Consulta de precios',
   'Consulta el precio de venta de productos por lista de precios y revisa stock por local.',
   '/sales/price-query', 'LINK', 4,
   1, 1, 25, 2, '/sales/price-query', 154, 'SELF')
ON DUPLICATE KEY UPDATE
  menu_name = VALUES(menu_name),
  menu_url  = VALUES(menu_url),
  is_active = 1,
  is_visible = 1;
