-- Pool demo para probar mantenedores y relaciones base.
-- Datos re-ejecutables: usa codigos DEMO/D* y evita duplicar relaciones.

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

-- Empresa / monedas / impuestos
INSERT IGNORE INTO dte_company_config (
  company_rut, company_name, company_business_name, company_address,
  company_comuna, company_city, company_region, economic_activity_code,
  economic_activity_name, dte_environment, sii_user, is_active
) VALUES
('76123456-7', 'Ceci Chic Demo', 'Comercial Ceci Chic Demo SpA', 'Av. Providencia 1234',
 'Providencia', 'Santiago', 'Metropolitana', '477101', 'Venta al por menor de vestuario', 'CERTIFICACION', 'demo_sii', TRUE);

INSERT INTO currencies (currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, is_active)
VALUES
('CLP', 'Peso chileno', '$', 0, TRUE, TRUE),
('USD', 'Dolar estadounidense', 'US$', 2, FALSE, TRUE),
('EUR', 'Euro', '€', 2, FALSE, TRUE),
('PEN', 'Sol peruano', 'S/', 2, FALSE, TRUE),
('ARS', 'Peso argentino', 'AR$', 2, FALSE, TRUE)
ON DUPLICATE KEY UPDATE
  currency_name = VALUES(currency_name),
  currency_symbol = VALUES(currency_symbol),
  decimal_places = VALUES(decimal_places),
  is_active = TRUE;

INSERT INTO currency_exchange_rates (currency_code, rate_date, rate_to_clp, source_name, source_reference, created_by_user_id)
SELECT 'USD', CURRENT_DATE, 920.000000, 'DEMO', 'Pool mantenedores', @system_user_id
WHERE NOT EXISTS (SELECT 1 FROM currency_exchange_rates WHERE currency_code = 'USD' AND rate_date = CURRENT_DATE AND source_name = 'DEMO');

INSERT INTO currency_exchange_rates (currency_code, rate_date, rate_to_clp, source_name, source_reference, created_by_user_id)
SELECT 'EUR', CURRENT_DATE, 995.000000, 'DEMO', 'Pool mantenedores', @system_user_id
WHERE NOT EXISTS (SELECT 1 FROM currency_exchange_rates WHERE currency_code = 'EUR' AND rate_date = CURRENT_DATE AND source_name = 'DEMO');

INSERT IGNORE INTO tax_rates (tax_code, tax_name, tax_type, rate_percentage, is_default, valid_from, is_active) VALUES
('DEMO_TAX_VAT19', 'IVA demo 19%', 'VAT', 19.0000, TRUE, '2026-01-01', TRUE),
('DEMO_TAX_EXEMPT', 'Exento demo', 'EXEMPT', 0.0000, FALSE, '2026-01-01', TRUE),
('DEMO_TAX_ADD', 'Impuesto adicional demo 10%', 'ADDITIONAL', 10.0000, FALSE, '2026-01-01', TRUE);

-- Unidades / categorias / atributos
INSERT IGNORE INTO measurement_units (
  unit_code, unit_name, unit_symbol, unit_type, conversion_factor, allow_decimals, is_active
) VALUES
('DEMO_UN', 'Unidad demo', 'un', 'BASE', 1.000000, FALSE, TRUE),
('DEMO_PAR', 'Par demo', 'par', 'BASE', 1.000000, FALSE, TRUE),
('DEMO_CJA', 'Caja demo', 'cja', 'BASE', 1.000000, FALSE, FALSE);

INSERT IGNORE INTO categories (
  category_code, category_name, category_description, category_level, category_path, sort_order, is_active
) VALUES
('DEMO_CAT_ROPA', 'Ropa demo', 'Categoria demo para vestuario.', 1, 'Ropa demo', 100, TRUE),
('DEMO_CAT_ACC', 'Accesorios demo', 'Categoria demo para accesorios.', 1, 'Accesorios demo', 110, TRUE),
('DEMO_CAT_CALZ', 'Calzado demo', 'Categoria demo para calzado.', 1, 'Calzado demo', 120, TRUE);

INSERT IGNORE INTO attribute_groups (group_code, group_name, group_description, sort_order, is_active) VALUES
('DEMO_ATTR_FIS', 'Caracteristicas demo', 'Grupo demo para atributos fisicos.', 100, TRUE),
('DEMO_ATTR_COM', 'Comercial demo', 'Grupo demo para atributos comerciales.', 110, TRUE);

SET @demo_attr_group_fis := (SELECT id FROM attribute_groups WHERE group_code = 'DEMO_ATTR_FIS');
SET @demo_attr_group_com := (SELECT id FROM attribute_groups WHERE group_code = 'DEMO_ATTR_COM');

INSERT IGNORE INTO attributes (
  attribute_group_id, attribute_code, attribute_name, attribute_type, is_required, affects_sku, sort_order, is_active
) VALUES
(@demo_attr_group_fis, 'DEMO_COLOR', 'Color demo', 'SELECT', TRUE, TRUE, 10, TRUE),
(@demo_attr_group_fis, 'DEMO_TALLA', 'Talla demo', 'SELECT', TRUE, TRUE, 20, TRUE),
(@demo_attr_group_com, 'DEMO_TEMP', 'Temporada demo', 'SELECT', FALSE, FALSE, 30, TRUE);

SET @demo_attr_color := (SELECT id FROM attributes WHERE attribute_code = 'DEMO_COLOR');
SET @demo_attr_talla := (SELECT id FROM attributes WHERE attribute_code = 'DEMO_TALLA');
SET @demo_attr_temp := (SELECT id FROM attributes WHERE attribute_code = 'DEMO_TEMP');

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active)
SELECT @demo_attr_color, 'DEMO_NEGRO', 'Negro', 10, TRUE
WHERE NOT EXISTS (SELECT 1 FROM attribute_values WHERE attribute_id = @demo_attr_color AND value_code = 'DEMO_NEGRO');

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active)
SELECT @demo_attr_color, 'DEMO_BEIGE', 'Beige', 20, TRUE
WHERE NOT EXISTS (SELECT 1 FROM attribute_values WHERE attribute_id = @demo_attr_color AND value_code = 'DEMO_BEIGE');

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active)
SELECT @demo_attr_talla, 'DEMO_S', 'S', 10, TRUE
WHERE NOT EXISTS (SELECT 1 FROM attribute_values WHERE attribute_id = @demo_attr_talla AND value_code = 'DEMO_S');

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active)
SELECT @demo_attr_talla, 'DEMO_M', 'M', 20, TRUE
WHERE NOT EXISTS (SELECT 1 FROM attribute_values WHERE attribute_id = @demo_attr_talla AND value_code = 'DEMO_M');

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active)
SELECT @demo_attr_temp, 'DEMO_VERANO', 'Verano', 10, TRUE
WHERE NOT EXISTS (SELECT 1 FROM attribute_values WHERE attribute_id = @demo_attr_temp AND value_code = 'DEMO_VERANO');

SET @demo_unit_un := (SELECT id FROM measurement_units WHERE unit_code = 'DEMO_UN');
SET @demo_cat_ropa := (SELECT id FROM categories WHERE category_code = 'DEMO_CAT_ROPA');
SET @demo_cat_acc := (SELECT id FROM categories WHERE category_code = 'DEMO_CAT_ACC');

INSERT IGNORE INTO products (
  category_id, product_code, product_name, product_description, brand, model,
  base_measurement_unit_id, has_variants, is_active
) VALUES
(@demo_cat_ropa, 'DEMO_PROD_POLERA', 'Polera demo', 'Producto demo para vestuario.', 'Ceci Chic Demo', 'Polera basica', @demo_unit_un, TRUE, TRUE),
(@demo_cat_ropa, 'DEMO_PROD_BLAZER', 'Blazer demo', 'Producto demo para vestuario formal.', 'Ceci Chic Demo', 'Blazer urbano', @demo_unit_un, TRUE, TRUE),
(@demo_cat_acc, 'DEMO_PROD_CARTERA', 'Cartera demo', 'Producto demo para accesorios.', 'Ceci Chic Demo', 'Cartera urbana', @demo_unit_un, TRUE, TRUE);

SET @demo_prod_polera := (SELECT id FROM products WHERE product_code = 'DEMO_PROD_POLERA');
SET @demo_prod_blazer := (SELECT id FROM products WHERE product_code = 'DEMO_PROD_BLAZER');
SET @demo_prod_cartera := (SELECT id FROM products WHERE product_code = 'DEMO_PROD_CARTERA');

INSERT IGNORE INTO product_variants (
  product_id, variant_sku, variant_name, variant_description, is_default_variant, is_active
) VALUES
(@demo_prod_polera, 'DEMO_SKU_POL_NEG_S', 'Polera negra S demo', 'Variante demo color negro talla S.', TRUE, TRUE),
(@demo_prod_polera, 'DEMO_SKU_POL_BEI_M', 'Polera beige M demo', 'Variante demo color beige talla M.', FALSE, TRUE),
(@demo_prod_blazer, 'DEMO_SKU_BLAZER_NEG_M', 'Blazer negro M demo', 'Variante demo color negro talla M.', TRUE, TRUE),
(@demo_prod_cartera, 'DEMO_SKU_CARTERA_URB', 'Cartera urbana demo', 'Variante demo de accesorio.', TRUE, TRUE);

SET @demo_sku_pol_neg := (SELECT id FROM product_variants WHERE variant_sku = 'DEMO_SKU_POL_NEG_S');
SET @demo_sku_pol_bei := (SELECT id FROM product_variants WHERE variant_sku = 'DEMO_SKU_POL_BEI_M');
SET @demo_sku_blazer := (SELECT id FROM product_variants WHERE variant_sku = 'DEMO_SKU_BLAZER_NEG_M');
SET @demo_sku_cartera := (SELECT id FROM product_variants WHERE variant_sku = 'DEMO_SKU_CARTERA_URB');

-- Bodegas / zonas / cajas / caja chica
INSERT IGNORE INTO warehouses (
  warehouse_code, warehouse_name, warehouse_type, responsible_user_id, address, city, country, phone, email, is_active
) VALUES
('DWH_0001', 'Bodega demo principal', 'WAREHOUSE', @system_user_id, 'Av. Demo 100', 'Santiago', 'Chile', '+56220000001', 'bodega.demo@ceci.local', TRUE),
('DST_0001', 'Tienda demo centro', 'STORE', @system_user_id, 'Paseo Demo 200', 'Santiago', 'Chile', '+56220000002', 'tienda.demo@ceci.local', TRUE);

SET @demo_wh_main := (SELECT id FROM warehouses WHERE warehouse_code = 'DWH_0001');
SET @demo_wh_store := (SELECT id FROM warehouses WHERE warehouse_code = 'DST_0001');

INSERT INTO warehouse_zones (warehouse_id, zone_code, zone_name, zone_description, is_location_tracking_enabled, is_active)
SELECT @demo_wh_main, 'DEMO_Z_RECEP', 'Recepcion demo', 'Zona demo de recepcion.', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM warehouse_zones WHERE warehouse_id = @demo_wh_main AND zone_code = 'DEMO_Z_RECEP');

INSERT INTO warehouse_zones (warehouse_id, zone_code, zone_name, zone_description, is_location_tracking_enabled, is_active)
SELECT @demo_wh_main, 'DEMO_Z_SALA', 'Sala demo', 'Zona demo de picking.', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM warehouse_zones WHERE warehouse_id = @demo_wh_main AND zone_code = 'DEMO_Z_SALA');

SET @demo_zone_recep := (SELECT id FROM warehouse_zones WHERE warehouse_id = @demo_wh_main AND zone_code = 'DEMO_Z_RECEP');
SET @demo_zone_sala := (SELECT id FROM warehouse_zones WHERE warehouse_id = @demo_wh_main AND zone_code = 'DEMO_Z_SALA');

INSERT IGNORE INTO cash_registers (
  register_code, register_name, warehouse_id, terminal_identifier, ip_address,
  location_description, is_active, requires_supervisor_approval, max_difference_amount
) VALUES
('DPOS_0001', 'Caja demo tienda', @demo_wh_store, 'DEMO-POS-01', '10.10.10.10', 'Mostrador demo', TRUE, TRUE, 2500.00);

INSERT IGNORE INTO petty_cash_funds (
  fund_code, warehouse_id, responsible_user_id, initial_amount, current_balance, total_expenses, total_replenishments, fund_status
) VALUES
('DPCF_000001', @demo_wh_store, @system_user_id, 150000.00, 150000.00, 0.00, 0.00, 'ACTIVE');

INSERT IGNORE INTO petty_cash_categories (
  category_code, category_name, category_description, max_amount_per_expense, requires_evidence, is_active
) VALUES
('DPCC_0001', 'Movilizacion demo', 'Gastos demo de movilizacion.', 30000.00, TRUE, TRUE),
('DPCC_0002', 'Insumos tienda demo', 'Gastos demo de insumos menores.', 25000.00, TRUE, TRUE);

-- Metodos de pago / bancos
INSERT IGNORE INTO payment_methods (
  method_code, method_name, method_type, affects_cash_flow, requires_authorization,
  currency_code, is_active, allows_postdated, requires_bank_info, default_terms_days
) VALUES
('DEMO_CASH', 'Efectivo demo', 'CASH', TRUE, FALSE, 'CLP', TRUE, FALSE, FALSE, NULL),
('DEMO_CARD', 'Tarjeta demo', 'CARD', TRUE, TRUE, 'CLP', TRUE, FALSE, FALSE, 0),
('DEMO_TRANS', 'Transferencia demo', 'TRANSFER', TRUE, FALSE, 'CLP', TRUE, FALSE, TRUE, 1);

INSERT IGNORE INTO banks (bank_code, bank_name, country, swift_code, routing_code, is_active) VALUES
('DEMO_BNK_001', 'Banco demo nacional', 'Chile', 'DEMOCLRM', '001', TRUE),
('DEMO_BNK_002', 'Banco demo internacional', 'Chile', 'DEMOCLRI', '002', TRUE);

SET @demo_bank_001 := (SELECT id FROM banks WHERE bank_code = 'DEMO_BNK_001');

INSERT IGNORE INTO bank_accounts (
  bank_id, account_code, account_number, account_name, account_type,
  currency_code, opening_balance, current_balance, is_active
) VALUES
(@demo_bank_001, 'DEMO_BAC_001', '000-123456-01', 'Cuenta corriente demo CLP', 'CHECKING', 'CLP', 1000000.00, 1000000.00, TRUE),
(@demo_bank_001, 'DEMO_BAC_002', '000-123456-02', 'Cuenta ahorro demo USD', 'SAVINGS', 'USD', 1000.00, 1000.00, TRUE);

-- Precios / clientes
INSERT IGNORE INTO price_list_groups (group_code, group_name, group_description, is_active) VALUES
('DEMO_PLG_RETAIL', 'Retail demo', 'Grupo demo para venta publico.', TRUE),
('DEMO_PLG_MAYOR', 'Mayorista demo', 'Grupo demo para clientes mayoristas.', TRUE);

SET @demo_plg_retail := (SELECT id FROM price_list_groups WHERE group_code = 'DEMO_PLG_RETAIL');
SET @demo_plg_mayor := (SELECT id FROM price_list_groups WHERE group_code = 'DEMO_PLG_MAYOR');

INSERT IGNORE INTO price_lists (
  price_list_group_id, price_list_code, price_list_name, currency_code,
  valid_from, priority, applies_to, is_active
) VALUES
(@demo_plg_retail, 'DEMO_PRL_RETAIL', 'Lista retail demo', 'CLP', '2026-01-01', 1, 'ALL_PRODUCTS', TRUE),
(@demo_plg_mayor, 'DEMO_PRL_MAYOR', 'Lista mayorista demo', 'CLP', '2026-01-01', 2, 'ALL_PRODUCTS', TRUE);

SET @demo_prl_retail := (SELECT id FROM price_lists WHERE price_list_code = 'DEMO_PRL_RETAIL');
SET @demo_prl_mayor := (SELECT id FROM price_lists WHERE price_list_code = 'DEMO_PRL_MAYOR');

INSERT IGNORE INTO price_list_items (
  price_list_id, product_variant_id, measurement_unit_id, base_price, sale_price, cost_price, margin_percentage, is_active
) VALUES
(@demo_prl_retail, @demo_sku_pol_neg, @demo_unit_un, 8990.0000, 12990.0000, 6200.0000, 44.49, TRUE),
(@demo_prl_retail, @demo_sku_pol_bei, @demo_unit_un, 8990.0000, 12990.0000, 6200.0000, 44.49, TRUE),
(@demo_prl_retail, @demo_sku_blazer, @demo_unit_un, 29990.0000, 49990.0000, 22000.0000, 66.69, TRUE),
(@demo_prl_retail, @demo_sku_cartera, @demo_unit_un, 15990.0000, 24990.0000, 11000.0000, 56.29, TRUE),
(@demo_prl_mayor, @demo_sku_pol_neg, @demo_unit_un, 8990.0000, 10990.0000, 6200.0000, 22.25, TRUE),
(@demo_prl_mayor, @demo_sku_blazer, @demo_unit_un, 29990.0000, 42990.0000, 22000.0000, 43.35, TRUE);

INSERT IGNORE INTO customers (
  customer_code, customer_type, tax_id, legal_name, commercial_name,
  contact_person, email, phone, mobile, address, city, region, country,
  price_list_id, sales_rep_user_id, is_credit_customer, registration_date,
  notes, internal_notes, created_by_user_id
) VALUES
('DEMO_CUS_001', 'INDIVIDUAL', '11111111-1', 'Cliente demo persona', 'Cliente demo persona', 'Cliente Demo', 'cliente.persona.demo@ceci.local', '+56911111111', '+56911111111', 'Calle Demo 10', 'Santiago', 'Metropolitana', 'Chile', @demo_prl_retail, @system_user_id, FALSE, CURRENT_DATE, 'Cliente demo para venta retail.', 'Creado por pool demo.', @system_user_id),
('DEMO_CUS_002', 'COMPANY', '22222222-2', 'Boutique Demo Ltda', 'Boutique Demo', 'Compras Demo', 'compras.demo@ceci.local', '+56222222222', '+56922222222', 'Av. Cliente 200', 'Santiago', 'Metropolitana', 'Chile', @demo_prl_mayor, @system_user_id, TRUE, CURRENT_DATE, 'Cliente demo mayorista.', 'Creado por pool demo.', @system_user_id);

SET @demo_customer_company := (SELECT id FROM customers WHERE customer_code = 'DEMO_CUS_002');

INSERT INTO customer_authorized_users (
  customer_id, authorized_name, authorized_tax_id, position, email, phone,
  is_primary_contact, authorization_level, max_purchase_amount, is_active
)
SELECT @demo_customer_company, 'Camila Compras Demo', '33333333-3', 'Compradora', 'camila.demo@ceci.local', '+56933333333', TRUE, 'FULL', 500000.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM customer_authorized_users WHERE customer_id = @demo_customer_company AND authorized_tax_id = '33333333-3');

INSERT INTO customer_credit_config (
  customer_id, credit_limit, available_credit, used_credit, payment_terms_days,
  grace_period_days, minimum_payment_percentage, penalty_rate, max_overdue_amount,
  allows_cash, allows_check, allows_postdated_check, allows_transfer,
  allows_installments, risk_level, requires_guarantor, auto_block_on_overdue
) VALUES
(@demo_customer_company, 1000000.00, 1000000.00, 0.00, 30, 5, 30.00, 2.00, 250000.00, TRUE, TRUE, FALSE, TRUE, FALSE, 'LOW', FALSE, TRUE)
ON DUPLICATE KEY UPDATE
  credit_limit = VALUES(credit_limit),
  available_credit = VALUES(available_credit),
  risk_level = VALUES(risk_level);

-- Proveedores / relacion producto-proveedor
INSERT IGNORE INTO suppliers (
  supplier_code, supplier_type, tax_id, legal_name, commercial_name,
  business_activity, email, phone, mobile, website, default_currency_code,
  default_payment_terms_days, default_tax_rate, credit_limit, current_balance,
  notes, internal_notes, created_by_user_id
) VALUES
('DEMO_SUP_001', 'COMPANY', '44444444-4', 'Textiles Demo SpA', 'Textiles Demo', 'Confeccion y textiles', 'ventas@textiles.demo', '+56244444444', '+56944444444', 'https://textiles.demo', 'CLP', 30, 19.00, 2000000.00, 0.00, 'Proveedor demo nacional.', 'Creado por pool demo.', @system_user_id),
('DEMO_SUP_002', 'FOREIGN', 'F-DEMO-001', 'Imports Demo LLC', 'Imports Demo', 'Importacion accesorios', 'sales@imports.demo', '+13055550100', '+13055550101', 'https://imports.demo', 'USD', 45, 0.00, 5000.00, 0.00, 'Proveedor demo extranjero.', 'Creado por pool demo.', @system_user_id);

SET @demo_supplier_textiles := (SELECT id FROM suppliers WHERE supplier_code = 'DEMO_SUP_001');
SET @demo_supplier_imports := (SELECT id FROM suppliers WHERE supplier_code = 'DEMO_SUP_002');

INSERT INTO supplier_contacts (
  supplier_id, contact_name, position, email, phone, mobile, is_primary,
  is_purchase_contact, is_payment_contact, notes, is_active
)
SELECT @demo_supplier_textiles, 'Valentina Ventas Demo', 'Ejecutiva comercial', 'valentina@textiles.demo', '+56244440001', '+56944440001', TRUE, TRUE, FALSE, 'Contacto demo compras.', TRUE
WHERE NOT EXISTS (SELECT 1 FROM supplier_contacts WHERE supplier_id = @demo_supplier_textiles AND email = 'valentina@textiles.demo');

INSERT IGNORE INTO supplier_products (
  supplier_id, product_variant_id, supplier_sku, supplier_barcode, supplier_product_name,
  measurement_unit_id, minimum_order_quantity, package_quantity, last_purchase_cost,
  lead_time_days, is_preferred, is_active
) VALUES
(@demo_supplier_textiles, @demo_sku_pol_neg, 'TXT-POL-NEG-S', 'TXT7801001', 'Polera negra S proveedor demo', @demo_unit_un, 12.0000, 12.0000, 6200.0000, 7, TRUE, TRUE),
(@demo_supplier_textiles, @demo_sku_blazer, 'TXT-BLA-NEG-M', 'TXT7801003', 'Blazer negro M proveedor demo', @demo_unit_un, 6.0000, 6.0000, 22000.0000, 14, TRUE, TRUE),
(@demo_supplier_imports, @demo_sku_cartera, 'IMP-CAR-URB', 'IMP7801004', 'Cartera urbana proveedor demo', @demo_unit_un, 10.0000, 10.0000, 11000.0000, 21, TRUE, TRUE);

-- Stock / stock critico
INSERT INTO stock (
  product_variant_id, warehouse_id, warehouse_zone_id, current_quantity, reserved_quantity,
  minimum_stock, maximum_stock, last_movement_date, days_until_stockout,
  last_movement_type, rotation_category, last_sale_date, avg_monthly_sales
) VALUES
(@demo_sku_pol_neg, @demo_wh_main, @demo_zone_sala, 60.0000, 5.0000, 10.0000, 120.0000, CURRENT_TIMESTAMP, 45.00, 'IN', 'FAST', CURRENT_DATE, 40.0000),
(@demo_sku_pol_bei, @demo_wh_main, @demo_zone_sala, 35.0000, 2.0000, 10.0000, 100.0000, CURRENT_TIMESTAMP, 30.00, 'IN', 'MEDIUM', CURRENT_DATE, 25.0000),
(@demo_sku_blazer, @demo_wh_main, @demo_zone_recep, 12.0000, 1.0000, 5.0000, 40.0000, CURRENT_TIMESTAMP, 25.00, 'IN', 'SLOW', CURRENT_DATE, 10.0000),
(@demo_sku_cartera, @demo_wh_main, @demo_zone_recep, 4.0000, 0.0000, 8.0000, 50.0000, CURRENT_TIMESTAMP, 8.00, 'IN', 'FAST', CURRENT_DATE, 18.0000)
ON DUPLICATE KEY UPDATE
  current_quantity = VALUES(current_quantity),
  reserved_quantity = VALUES(reserved_quantity),
  minimum_stock = VALUES(minimum_stock),
  maximum_stock = VALUES(maximum_stock),
  last_movement_date = VALUES(last_movement_date),
  rotation_category = VALUES(rotation_category);

INSERT INTO stock_critical_config (
  product_variant_id, warehouse_id, minimum_stock, maximum_stock, safety_stock,
  reorder_quantity, lead_time_days, avg_daily_sales, last_calculated_date,
  alert_enabled, alert_frequency_hours, is_active
) VALUES
(@demo_sku_pol_neg, @demo_wh_main, 10.0000, 120.0000, 5.0000, 30.0000, 7, 1.3000, CURRENT_DATE, TRUE, 24, TRUE),
(@demo_sku_cartera, @demo_wh_main, 8.0000, 50.0000, 4.0000, 20.0000, 21, 0.6000, CURRENT_DATE, TRUE, 12, TRUE)
ON DUPLICATE KEY UPDATE
  minimum_stock = VALUES(minimum_stock),
  maximum_stock = VALUES(maximum_stock),
  safety_stock = VALUES(safety_stock),
  reorder_quantity = VALUES(reorder_quantity),
  alert_enabled = VALUES(alert_enabled),
  is_active = VALUES(is_active);

-- Documentos / devoluciones
SET @demo_doc_sale := (SELECT id FROM document_types WHERE document_type_code IN ('SALE_INVOICE', 'BOLETA', 'FACTURA', 'SALE') ORDER BY id LIMIT 1);
SET @demo_doc_inventory := (SELECT id FROM document_types WHERE document_category = 'INVENTORY' ORDER BY id LIMIT 1);

INSERT INTO document_series (
  document_type_id, warehouse_id, series_code, series_prefix, current_number,
  min_number, max_number, number_length, is_active
)
SELECT @demo_doc_sale, @demo_wh_store, 'DEMO_SALE_A', 'DVA', 100, 1, 99999999, 8, TRUE
WHERE @demo_doc_sale IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM document_series WHERE series_code = 'DEMO_SALE_A');

INSERT INTO document_series (
  document_type_id, warehouse_id, series_code, series_prefix, current_number,
  min_number, max_number, number_length, is_active
)
SELECT @demo_doc_inventory, @demo_wh_main, 'DEMO_INV_A', 'DIN', 50, 1, 99999999, 8, TRUE
WHERE @demo_doc_inventory IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM document_series WHERE series_code = 'DEMO_INV_A');

INSERT IGNORE INTO return_reasons (
  reason_code, reason_name, reason_description, requires_approval, affects_stock,
  allows_exchange, allows_refund, max_days_after_sale, default_account_code, is_active
) VALUES
('DEMO_RET_SIZE', 'Cambio de talla demo', 'Motivo demo para cambio de talla.', FALSE, TRUE, TRUE, FALSE, 30, 'RET-DEMO', TRUE),
('DEMO_RET_DEFECT', 'Producto defectuoso demo', 'Motivo demo para defecto de fabrica.', TRUE, TRUE, TRUE, TRUE, 60, 'RET-DEF', TRUE);

-- Notificacion de referencia para validar origen en bandeja.
INSERT INTO user_notifications (
  notification_type_id, user_id, title, message, action_url, action_label,
  source_table, source_id, source_label, priority
)
SELECT nt.id, @system_user_id, 'Pool demo de mantenedores cargado',
       'Se cargaron datos demo para validar relaciones entre mantenedores.',
       '/products', 'Ver productos', 'demo_seed', NULL, 'Seeder demo', 'NORMAL'
FROM notification_types nt
WHERE nt.type_code = 'SYSTEM_INFO'
  AND @system_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_notifications
    WHERE user_id = @system_user_id
      AND title = 'Pool demo de mantenedores cargado'
      AND deleted_at IS NULL
  );
