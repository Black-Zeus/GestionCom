-- ============================================================
-- Migración: estructura de menú de Reportes de Gestión
-- Reemplaza la lista plana bajo management_reports por 5 grupos
-- separados (uno por área), igual que el esquema de Métricas.
-- Fecha: 2026-06-16
-- ============================================================

-- ── 1. Desactivar estructura anterior ────────────────────────
UPDATE menu_items SET is_active = 0, is_visible = 0
WHERE id = 69;                                    -- management_reports (PARENT antiguo)

UPDATE menu_items SET is_active = 0, is_visible = 0
WHERE parent_id = 69;                             -- todos sus hijos planos

-- ── 2. Crear los 5 grupos PARENT por área ────────────────────
-- Usan REPORTS_VISIBLE (id=130), ya asignado a ADMIN, ACCOUNTANT, SUPER_ADMIN.
-- Se agregan SALES_PERSON y WAREHOUSE_MANAGER en el paso 5.

INSERT INTO menu_items
  (menu_code, parent_id, menu_name, menu_url, menu_type, icon_name, sort_order,
   required_permission_id, is_active, is_visible, menu_level)
VALUES
  ('reports_ventas',    NULL, 'Reportes — Ventas',         NULL, 'PARENT', 'bar-chart',   95, 130, 1, 1, 1),
  ('reports_inventario',NULL, 'Reportes — Inventario',     NULL, 'PARENT', 'box',         96, 130, 1, 1, 1),
  ('reports_transfers', NULL, 'Reportes — Transferencias', NULL, 'PARENT', 'exchange',    97, 130, 1, 1, 1),
  ('reports_caja_rep',  NULL, 'Reportes — Caja',           NULL, 'PARENT', 'safe',        98, 130, 1, 1, 1),
  ('reports_clientes_r',NULL, 'Reportes — Clientes',       NULL, 'PARENT', 'user-3',      99, 130, 1, 1, 1)
ON DUPLICATE KEY UPDATE
  menu_name = VALUES(menu_name),
  is_active  = 1,
  is_visible = 1;

-- ── 3. Ítems bajo Reportes — Ventas ──────────────────────────
-- Ventas diarias: reporte implementado (DAILY_SALES_ACCESS = 176)
INSERT INTO menu_items
  (menu_code, parent_id, menu_name, menu_url, menu_type, icon_name, sort_order,
   required_permission_id, is_active, is_visible, menu_level)
VALUES
  ('rep_daily_sales',
   (SELECT id FROM (SELECT id FROM menu_items WHERE menu_code = 'reports_ventas') AS t),
   'Ventas diarias', '/reports/daily-sales', 'LINK', 'bar-chart', 10, 176, 1, 1, 2),
  ('rep_ventas_hub',
   (SELECT id FROM (SELECT id FROM menu_items WHERE menu_code = 'reports_ventas') AS t),
   'Ver catálogo de ventas', '/reports', 'LINK', 'file-list-3', 90, 18, 1, 1, 2)
ON DUPLICATE KEY UPDATE
  menu_name = VALUES(menu_name),
  menu_url  = VALUES(menu_url),
  is_active  = 1,
  is_visible = 1;

-- ── 4. Ítems placeholder bajo los grupos sin reporte implementado ─
-- Cada grupo necesita al menos un ítem para aparecer en el sidebar.
-- Apuntan al hub de reportes hasta que se implementen los reportes específicos.

INSERT INTO menu_items
  (menu_code, parent_id, menu_name, menu_url, menu_type, icon_name, sort_order,
   required_permission_id, is_active, is_visible, menu_level)
VALUES
  ('rep_inv_hub',
   (SELECT id FROM (SELECT id FROM menu_items WHERE menu_code = 'reports_inventario') AS t),
   'Ver catálogo de inventario', '/reports', 'LINK', 'file-list-3', 10, 18, 1, 1, 2),
  ('rep_transfers_hub',
   (SELECT id FROM (SELECT id FROM menu_items WHERE menu_code = 'reports_transfers') AS t),
   'Ver catálogo de transferencias', '/reports', 'LINK', 'file-list-3', 10, 18, 1, 1, 2),
  ('rep_caja_hub',
   (SELECT id FROM (SELECT id FROM menu_items WHERE menu_code = 'reports_caja_rep') AS t),
   'Ver catálogo de caja', '/reports', 'LINK', 'file-list-3', 10, 18, 1, 1, 2),
  ('rep_clientes_hub',
   (SELECT id FROM (SELECT id FROM menu_items WHERE menu_code = 'reports_clientes_r') AS t),
   'Ver catálogo de clientes', '/reports', 'LINK', 'file-list-3', 10, 18, 1, 1, 2)
ON DUPLICATE KEY UPDATE
  menu_name = VALUES(menu_name),
  menu_url  = VALUES(menu_url),
  is_active  = 1,
  is_visible = 1;

-- ── 5. Permisos para roles que actualmente no tienen acceso ───
-- REPORTS_VISIBLE (130): para ver los grupos en el sidebar
-- REPORTS_VIEW (18): para acceder al hub de reportes
-- DAILY_SALES_ACCESS (176): para acceder a Ventas Diarias

-- SALES_PERSON (role_id = 3)
INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  (3, 130),   -- REPORTS_VISIBLE
  (3, 18),    -- REPORTS_VIEW
  (3, 176);   -- DAILY_SALES_ACCESS

-- WAREHOUSE_MANAGER (role_id = 2)
INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  (2, 130),   -- REPORTS_VISIBLE
  (2, 18),    -- REPORTS_VIEW
  (2, 176);   -- DAILY_SALES_ACCESS (acceso general a ventas para gerencia)

-- Verificación rápida
SELECT
  p.menu_code,
  p.menu_name        AS grupo,
  c.menu_code        AS item_code,
  c.menu_name        AS item_nombre,
  c.menu_url         AS url,
  c.is_active
FROM menu_items p
JOIN menu_items c ON c.parent_id = p.id
WHERE p.menu_code IN ('reports_ventas','reports_inventario','reports_transfers','reports_caja_rep','reports_clientes_r')
ORDER BY p.sort_order, c.sort_order;
