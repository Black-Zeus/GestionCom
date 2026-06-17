-- ============================================================
-- Migración: renombrar URLs de reportes de área a inglés
-- Afecta los 5 ítems LINK creados en reports_menu_v2.
-- Fecha: 2026-06-16
-- ============================================================

UPDATE menu_items
SET menu_url = CASE menu_code
  WHEN 'rep_area_ventas'          THEN '/reports/sales'
  WHEN 'rep_area_inventario'      THEN '/reports/inventory'
  WHEN 'rep_area_transferencias'  THEN '/reports/transfers'
  WHEN 'rep_area_caja'            THEN '/reports/cash'
  WHEN 'rep_area_clientes'        THEN '/reports/customers'
END
WHERE menu_code IN (
  'rep_area_ventas',
  'rep_area_inventario',
  'rep_area_transferencias',
  'rep_area_caja',
  'rep_area_clientes'
);

-- Verificación
SELECT menu_code, menu_name, menu_url, is_active
FROM menu_items
WHERE menu_code IN (
  'rep_area_ventas', 'rep_area_inventario', 'rep_area_transferencias',
  'rep_area_caja', 'rep_area_clientes'
)
ORDER BY sort_order;
