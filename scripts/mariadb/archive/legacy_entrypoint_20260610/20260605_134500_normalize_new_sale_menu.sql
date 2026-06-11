-- Normaliza el submenu duplicado "Nueva venta".
-- sales_new viene del seed legacy y new_sale es la opcion canonica alineada al frontend.

SET @legacy_sales_new_id := (SELECT id FROM menu_items WHERE menu_code = 'sales_new' LIMIT 1);
SET @canonical_new_sale_id := (SELECT id FROM menu_items WHERE menu_code = 'new_sale' LIMIT 1);

UPDATE menu_items
SET
  parent_id = (SELECT id FROM menu_items parent WHERE parent.menu_code = 'sales'),
  menu_name = 'Nueva venta',
  menu_description = 'Crear una nueva venta',
  icon_name = 'shopping-cart-line',
  menu_url = '/sales/new',
  required_permission_id = (SELECT id FROM permissions WHERE permission_code = 'NEW_SALE_ACCESS'),
  is_active = TRUE,
  is_visible = TRUE,
  sort_order = 10,
  menu_level = 2,
  menu_path = '/sales/new'
WHERE menu_code = 'new_sale';

DELETE legacy_favorite
FROM user_menu_favorites legacy_favorite
JOIN user_menu_favorites canonical_favorite
  ON canonical_favorite.user_id = legacy_favorite.user_id
 AND canonical_favorite.menu_item_id = @canonical_new_sale_id
WHERE legacy_favorite.menu_item_id = @legacy_sales_new_id
  AND @legacy_sales_new_id IS NOT NULL
  AND @canonical_new_sale_id IS NOT NULL;

UPDATE user_menu_favorites
SET menu_item_id = @canonical_new_sale_id
WHERE menu_item_id = @legacy_sales_new_id
  AND @legacy_sales_new_id IS NOT NULL
  AND @canonical_new_sale_id IS NOT NULL;

UPDATE menu_items
SET
  is_active = FALSE,
  is_visible = FALSE,
  sort_order = 999,
  menu_description = 'Opcion legacy reemplazada por new_sale.'
WHERE menu_code = 'sales_new';
