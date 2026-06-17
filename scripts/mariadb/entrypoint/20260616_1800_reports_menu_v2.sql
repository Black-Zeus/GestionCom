-- ============================================================
-- Migración: reestructura menú de Reportes de Gestión v2
-- Convierte los 5 PARENT separados en 5 LINK bajo un único
-- PARENT "management_reports" (id=69), igual que Métricas.
-- Fecha: 2026-06-16
-- ============================================================

-- ── 1. Reactivar el PARENT original ──────────────────────────
UPDATE menu_items SET is_active = 1, is_visible = 1 WHERE id = 69;

-- ── 2. Desactivar los 5 PARENT intermedios creados en v1 ─────
UPDATE menu_items SET is_active = 0, is_visible = 0
WHERE menu_code IN (
  'reports_ventas', 'reports_inventario', 'reports_transfers',
  'reports_caja_rep', 'reports_clientes_r'
);

-- ── 3. Desactivar todos sus hijos de v1 ──────────────────────
UPDATE menu_items SET is_active = 0, is_visible = 0
WHERE menu_code IN (
  'rep_daily_sales', 'rep_ventas_hub', 'rep_inv_hub',
  'rep_transfers_hub', 'rep_caja_hub', 'rep_clientes_hub'
);

-- ── 4. Desactivar hijos planos originales de id=69 ───────────
UPDATE menu_items SET is_active = 0, is_visible = 0
WHERE parent_id = 69;

-- ── 5. Crear 5 LINK de área bajo management_reports (id=69) ──
-- Todos usan REPORTS_VIEW (18) — ya asignado a ADMIN, SUPER_ADMIN,
-- SALES_PERSON (3) y WAREHOUSE_MANAGER (2) desde migración anterior.
INSERT INTO menu_items
  (menu_code, parent_id, menu_name, menu_url, menu_type, icon_name, sort_order,
   required_permission_id, is_active, is_visible, menu_level)
VALUES
  ('rep_area_ventas',        69, 'Ventas',          '/reports/ventas',          'LINK', 'trending-up', 10, 18, 1, 1, 2),
  ('rep_area_inventario',    69, 'Inventario',       '/reports/inventario',      'LINK', 'box',         20, 18, 1, 1, 2),
  ('rep_area_transferencias',69, 'Transferencias',   '/reports/transferencias',  'LINK', 'exchange',    30, 18, 1, 1, 2),
  ('rep_area_caja',          69, 'Caja',             '/reports/caja',            'LINK', 'safe',        40, 18, 1, 1, 2),
  ('rep_area_clientes',      69, 'Clientes',         '/reports/clientes',        'LINK', 'user-3',      50, 18, 1, 1, 2)
ON DUPLICATE KEY UPDATE
  menu_name = VALUES(menu_name),
  menu_url  = VALUES(menu_url),
  parent_id = 69,
  is_active  = 1,
  is_visible = 1;

-- Verificación
SELECT
  p.menu_code AS parent, p.menu_name AS parent_nombre,
  c.menu_code AS item_code, c.menu_name AS item_nombre,
  c.menu_url, c.is_active
FROM menu_items p
JOIN menu_items c ON c.parent_id = p.id
WHERE p.id = 69
ORDER BY c.sort_order;
