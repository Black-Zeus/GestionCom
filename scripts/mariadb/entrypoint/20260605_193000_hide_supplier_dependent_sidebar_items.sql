-- Oculta accesos laterales de submodulos que dependen de un proveedor seleccionado.
-- Se mantienen disponibles desde la columna Acciones del mantenedor principal.

UPDATE menu_items
SET is_active = FALSE,
    is_visible = FALSE
WHERE menu_code IN (
  'purchase_orders',
  'supplier_payable',
  'supplier_products',
  'supplier_history',
  'supplier_contacts',
  'supplier_addresses'
)
OR menu_url IN (
  '/suppliers/purchase-orders',
  '/suppliers/accounts-payable',
  '/suppliers/products',
  '/suppliers/purchase-history',
  '/suppliers/contacts',
  '/suppliers/addresses'
);
