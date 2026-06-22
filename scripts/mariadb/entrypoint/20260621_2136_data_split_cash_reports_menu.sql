-- ============================================================
-- Migracion: separa los reportes de caja en Caja Chica y Caja POS
-- Mantiene la estructura bajo management_reports (id=69).
-- Fecha: 2026-06-21
-- ============================================================

-- Renombrar la entrada anterior de caja para apuntar explicitamente a caja chica.
UPDATE menu_items
SET
  menu_name = 'Caja chica',
  menu_url = '/reports/petty-cash',
  menu_path = '/reports/petty-cash',
  icon_name = 'wallet-3',
  sort_order = 40,
  is_active = 1,
  is_visible = 1
WHERE menu_code = 'rep_area_caja';

-- Crear la entrada hermana para los reportes de caja POS.
INSERT INTO menu_items
  (menu_code, parent_id, menu_name, menu_url, menu_type, icon_name, sort_order,
   required_permission_id, is_active, is_visible, menu_level, menu_path)
VALUES
  ('rep_area_caja_pos', 69, 'Caja POS', '/reports/cash-pos', 'LINK', 'bank-card', 45, 18, 1, 1, 2, '/reports/cash-pos')
ON DUPLICATE KEY UPDATE
  menu_name              = VALUES(menu_name),
  menu_url               = VALUES(menu_url),
  menu_path              = VALUES(menu_path),
  parent_id              = 69,
  icon_name              = VALUES(icon_name),
  sort_order             = VALUES(sort_order),
  required_permission_id = VALUES(required_permission_id),
  is_active              = 1,
  is_visible             = 1;

-- Verificacion
SELECT
  p.menu_code AS parent_code, p.menu_name AS parent_nombre,
  c.id, c.menu_code, c.menu_name, c.menu_url, c.sort_order, c.is_active, c.is_visible
FROM menu_items p
JOIN menu_items c ON c.parent_id = p.id
WHERE p.id = 69
  AND c.menu_code IN ('rep_area_caja', 'rep_area_caja_pos')
ORDER BY c.sort_order;
