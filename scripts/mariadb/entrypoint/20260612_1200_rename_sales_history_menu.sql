-- Renombra el ítem de menú "Historial de ventas" a "Pre-ventas pendientes"
-- El módulo solo muestra pre-ventas en espera de cierre en caja,
-- no un historial completo de ventas procesadas.
USE inventario;

UPDATE menu_items
SET
  menu_name        = 'Pre-ventas pendientes',
  menu_description = 'Cola de ventas listas para ser procesadas en caja.'
WHERE menu_url = '/sales/history'
  AND menu_name IN ('Historial de ventas', 'Historial de Ventas');
