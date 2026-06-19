-- ============================================================
-- Migración: agrega entrada "Convenios" al menú de Reportes de Gestión
-- Hermano de rep_area_ventas/inventario/transferencias/caja/clientes
-- bajo management_reports (parent_id = 69).
-- Fecha: 2026-06-19
-- ============================================================

INSERT INTO menu_items
  (menu_code, parent_id, menu_name, menu_url, menu_type, icon_name, sort_order,
   required_permission_id, is_active, is_visible, menu_level)
VALUES
  ('rep_area_convenios', 69, 'Convenios', '/reports/agreements', 'LINK', 'handshake', 60, 18, 1, 1, 2)
ON DUPLICATE KEY UPDATE
  menu_name              = VALUES(menu_name),
  menu_url               = VALUES(menu_url),
  parent_id              = 69,
  icon_name              = VALUES(icon_name),
  sort_order             = VALUES(sort_order),
  required_permission_id = VALUES(required_permission_id),
  is_active              = 1,
  is_visible             = 1;

-- Verificación
SELECT
  p.menu_code AS parent_code, p.menu_name AS parent_nombre,
  c.id, c.menu_code, c.menu_name, c.menu_url, c.sort_order, c.is_active
FROM menu_items p
JOIN menu_items c ON c.parent_id = p.id
WHERE p.id = 69
ORDER BY c.sort_order;
