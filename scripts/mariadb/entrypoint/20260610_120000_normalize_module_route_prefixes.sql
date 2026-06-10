-- Normaliza prefijos de rutas frontend por modulo sin cambiar permisos.

UPDATE menu_items
SET menu_url = CASE menu_code
    WHEN 'cash_pos' THEN '/cash/pos'
    WHEN 'sales_points_admin' THEN '/cash/sales-points'
    WHEN 'operator_assignments_admin' THEN '/cash/operator-assignments'
    WHEN 'products' THEN '/inventory/products'
    WHEN 'stock_movements' THEN '/inventory/stock/movements'
    WHEN 'stock_conversions' THEN '/inventory/stock/conversions'
    WHEN 'physical_inventory' THEN '/inventory/stock/physical'
    WHEN 'inventory_tracking_reports' THEN '/inventory/stock/tracking-reports'
    WHEN 'inventory_adjustments' THEN '/inventory/stock/adjustments'
    WHEN 'stock_critical_config' THEN '/inventory/stock/critical'
    WHEN 'transfers' THEN '/inventory/stock/transfers'
    WHEN 'price_lists' THEN '/inventory/pricing/price-lists'
    WHEN 'categories' THEN '/inventory/products/categories'
    WHEN 'product_attributes' THEN '/inventory/products/attributes'
    WHEN 'product_brand_models' THEN '/inventory/products/brands-models'
    WHEN 'barcodes' THEN '/inventory/products/barcodes'
    WHEN 'product_units' THEN '/inventory/products/units'
    WHEN 'returns' THEN '/documents/returns'
    WHEN 'return_reasons' THEN '/documents/returns/reasons'
    WHEN 'credit_notes' THEN '/documents/returns/credit-notes'
    WHEN 'document_templates' THEN '/documents/templates'
    WHEN 'cash_pos_admin' THEN '/admin/cash/pos'
    WHEN 'petty_cash_admin' THEN '/admin/cash/petty-cash-categories'
    ELSE menu_url
  END,
  menu_path = CASE menu_code
    WHEN 'cash_pos' THEN '/cash/pos'
    WHEN 'sales_points_admin' THEN '/cash/sales-points'
    WHEN 'operator_assignments_admin' THEN '/cash/operator-assignments'
    WHEN 'products' THEN '/inventory/products'
    WHEN 'stock_movements' THEN '/inventory/stock/movements'
    WHEN 'stock_conversions' THEN '/inventory/stock/conversions'
    WHEN 'physical_inventory' THEN '/inventory/stock/physical'
    WHEN 'inventory_tracking_reports' THEN '/inventory/stock/tracking-reports'
    WHEN 'inventory_adjustments' THEN '/inventory/stock/adjustments'
    WHEN 'stock_critical_config' THEN '/inventory/stock/critical'
    WHEN 'transfers' THEN '/inventory/stock/transfers'
    WHEN 'price_lists' THEN '/inventory/pricing/price-lists'
    WHEN 'categories' THEN '/inventory/products/categories'
    WHEN 'product_attributes' THEN '/inventory/products/attributes'
    WHEN 'product_brand_models' THEN '/inventory/products/brands-models'
    WHEN 'barcodes' THEN '/inventory/products/barcodes'
    WHEN 'product_units' THEN '/inventory/products/units'
    WHEN 'returns' THEN '/documents/returns'
    WHEN 'return_reasons' THEN '/documents/returns/reasons'
    WHEN 'credit_notes' THEN '/documents/returns/credit-notes'
    WHEN 'document_templates' THEN '/documents/templates'
    WHEN 'cash_pos_admin' THEN '/admin/cash/pos'
    WHEN 'petty_cash_admin' THEN '/admin/cash/petty-cash-categories'
    ELSE menu_path
  END
WHERE menu_code IN (
  'cash_pos',
  'sales_points_admin',
  'operator_assignments_admin',
  'products',
  'stock_movements',
  'stock_conversions',
  'physical_inventory',
  'inventory_tracking_reports',
  'inventory_adjustments',
  'stock_critical_config',
  'transfers',
  'price_lists',
  'categories',
  'product_attributes',
  'product_brand_models',
  'barcodes',
  'product_units',
  'returns',
  'return_reasons',
  'credit_notes',
  'document_templates',
  'cash_pos_admin',
  'petty_cash_admin'
);

UPDATE menu_items child
JOIN menu_items cash_parent ON cash_parent.menu_code = 'cash'
SET child.parent_id = cash_parent.id,
    child.menu_url = '/cash/pos',
    child.menu_path = '/cash/pos'
WHERE child.menu_code = 'cash_pos';

UPDATE menu_items
SET sort_order = CASE menu_code
    WHEN 'dashboard' THEN 10
    WHEN 'new_sale' THEN 10
    WHEN 'price_query' THEN 20
    WHEN 'promotions' THEN 30
    WHEN 'sales_history' THEN 40
    WHEN 'customers_list' THEN 10
    WHEN 'suppliers_list' THEN 20
    WHEN 'sales_points_admin' THEN 10
    WHEN 'operator_assignments_admin' THEN 20
    WHEN 'cash_opening' THEN 30
    WHEN 'cash_pos' THEN 40
    WHEN 'cash_count' THEN 50
    WHEN 'cash_movements' THEN 60
    WHEN 'petty_cash' THEN 70
    WHEN 'petty_cash_expenses' THEN 80
    WHEN 'products' THEN 10
    WHEN 'categories' THEN 20
    WHEN 'product_attributes' THEN 30
    WHEN 'product_brand_models' THEN 40
    WHEN 'product_units' THEN 50
    WHEN 'barcodes' THEN 60
    WHEN 'warehouses' THEN 70
    WHEN 'stock_critical_config' THEN 80
    WHEN 'stock_movements' THEN 90
    WHEN 'stock_conversions' THEN 100
    WHEN 'physical_inventory' THEN 110
    WHEN 'inventory_adjustments' THEN 120
    WHEN 'transfers' THEN 130
    WHEN 'inventory_tracking_reports' THEN 140
    WHEN 'price_lists' THEN 150
    WHEN 'finance_banking' THEN 10
    WHEN 'finance_currencies' THEN 20
    WHEN 'bank_reconciliation_settings' THEN 30
    WHEN 'expenses' THEN 40
    WHEN 'additional_income' THEN 50
    WHEN 'supplier_payments' THEN 60
    WHEN 'bank_reconciliation' THEN 70
    WHEN 'document_series' THEN 10
    WHEN 'document_templates' THEN 20
    WHEN 'commercial_documents' THEN 30
    WHEN 'return_reasons' THEN 40
    WHEN 'returns' THEN 50
    WHEN 'credit_notes' THEN 60
    WHEN 'company_config' THEN 10
    WHEN 'system_parameters' THEN 20
    WHEN 'tax_config' THEN 30
    WHEN 'payment_methods' THEN 40
    WHEN 'measurement_units' THEN 50
    WHEN 'notification_settings' THEN 60
    WHEN 'system_logs' THEN 70
    WHEN 'system_audit' THEN 80
    WHEN 'admin_users' THEN 10
    WHEN 'admin_roles' THEN 20
    WHEN 'product_flag_settings' THEN 30
    WHEN 'cash_pos_admin' THEN 40
    WHEN 'petty_cash_admin' THEN 50
    WHEN 'backup' THEN 60
    ELSE sort_order
  END
WHERE menu_code IN (
  'dashboard',
  'new_sale',
  'price_query',
  'promotions',
  'sales_history',
  'customers_list',
  'suppliers_list',
  'sales_points_admin',
  'operator_assignments_admin',
  'cash_opening',
  'cash_pos',
  'cash_count',
  'cash_movements',
  'petty_cash',
  'petty_cash_expenses',
  'products',
  'categories',
  'product_attributes',
  'product_brand_models',
  'product_units',
  'barcodes',
  'warehouses',
  'stock_critical_config',
  'stock_movements',
  'stock_conversions',
  'physical_inventory',
  'inventory_adjustments',
  'transfers',
  'inventory_tracking_reports',
  'price_lists',
  'finance_banking',
  'finance_currencies',
  'bank_reconciliation_settings',
  'expenses',
  'additional_income',
  'supplier_payments',
  'bank_reconciliation',
  'document_series',
  'document_templates',
  'commercial_documents',
  'return_reasons',
  'returns',
  'credit_notes',
  'company_config',
  'system_parameters',
  'tax_config',
  'payment_methods',
  'measurement_units',
  'notification_settings',
  'system_logs',
  'system_audit',
  'admin_users',
  'admin_roles',
  'product_flag_settings',
  'cash_pos_admin',
  'petty_cash_admin',
  'backup'
);
