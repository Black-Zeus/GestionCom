-- Limpia y normaliza listas de precio operativas para venta.
-- Las categorias son catalogo fijo; no se gestionan desde mantenedor UI.

SET @retail_category_code := 'PLC_RETAIL';
SET @wholesale_category_code := 'PLC_WHOLESALE';
SET @agreement_category_code := 'PLC_AGREEMENT';
SET @promotion_category_code := 'PLC_PROMOTION';
SET @internal_category_code := 'PLC_INTERNAL';
SET @retail_list_code := 'PRL_RETAIL';
SET @wholesale_list_code := 'PRL_WHOLESALE';

UPDATE customers SET price_list_id = NULL WHERE price_list_id IS NOT NULL;

DELETE FROM price_list_items;
DELETE FROM price_lists;
DELETE FROM price_list_groups;

ALTER TABLE price_list_items AUTO_INCREMENT = 1;
ALTER TABLE price_lists AUTO_INCREMENT = 1;
ALTER TABLE price_list_groups AUTO_INCREMENT = 1;

INSERT INTO price_list_groups (group_code, group_name, group_description, is_active)
VALUES
(@retail_category_code, 'Retail', 'Ventas destinadas directamente al consumidor final, bajo condiciones comerciales estandar.', TRUE),
(@wholesale_category_code, 'Mayorista', 'Ventas orientadas a distribuidores, comercios o clientes que adquieren productos para reventa o en grandes volumenes.', TRUE),
(@agreement_category_code, 'Convenio', 'Ventas realizadas bajo condiciones preferenciales definidas mediante acuerdos comerciales especificos con empresas, instituciones o grupos de clientes.', TRUE),
(@promotion_category_code, 'Promocion', 'Ventas asociadas a campanas comerciales, ofertas temporales, liquidaciones, lanzamientos o temporadas especificas.', TRUE),
(@internal_category_code, 'Interna', 'Operaciones destinadas al consumo interno, entrega de muestras, beneficios al personal, pruebas o movimientos sin finalidad comercial.', TRUE);

SET @retail_category_id := (SELECT id FROM price_list_groups WHERE group_code = @retail_category_code);
SET @wholesale_category_id := (SELECT id FROM price_list_groups WHERE group_code = @wholesale_category_code);

INSERT INTO price_lists (
  price_list_group_id,
  price_list_code,
  price_list_name,
  currency_code,
  valid_from,
  valid_to,
  priority,
  applies_to,
  is_active
) VALUES
(@retail_category_id, @retail_list_code, 'Lista retail CLP', 'CLP', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH), 1, 'ALL_PRODUCTS', TRUE),
(@wholesale_category_id, @wholesale_list_code, 'Lista mayorista CLP', 'CLP', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH), 2, 'ALL_PRODUCTS', TRUE);

SET @retail_list_id := (SELECT id FROM price_lists WHERE price_list_code = @retail_list_code);
SET @wholesale_list_id := (SELECT id FROM price_lists WHERE price_list_code = @wholesale_list_code);

INSERT INTO price_list_items (
  price_list_id,
  product_id,
  product_variant_id,
  measurement_unit_id,
  base_price,
  sale_price,
  cost_price,
  margin_percentage,
  is_active
)
SELECT
  @retail_list_id,
  p.id,
  pv.id,
  p.base_measurement_unit_id,
  14990.0000,
  CASE
    WHEN pv.variant_name LIKE '%XS%' THEN 18990.0000
    WHEN pv.variant_name LIKE '%S%' THEN 19990.0000
    ELSE 19990.0000
  END,
  12990.0000,
  NULL,
  TRUE
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
JOIN product_measurement_units pmu
  ON pmu.product_id = p.id
 AND pmu.measurement_unit_id = p.base_measurement_unit_id
 AND pmu.is_active = TRUE
WHERE pv.deleted_at IS NULL
  AND pv.is_active = TRUE
  AND p.deleted_at IS NULL
  AND p.is_active = TRUE;

INSERT INTO price_list_items (
  price_list_id,
  product_id,
  product_variant_id,
  measurement_unit_id,
  base_price,
  sale_price,
  cost_price,
  margin_percentage,
  is_active
)
SELECT
  @wholesale_list_id,
  p.id,
  pv.id,
  p.base_measurement_unit_id,
  12990.0000,
  CASE
    WHEN pv.variant_name LIKE '%XS%' THEN 15990.0000
    WHEN pv.variant_name LIKE '%S%' THEN 16990.0000
    ELSE 16990.0000
  END,
  11990.0000,
  NULL,
  TRUE
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
JOIN product_measurement_units pmu
  ON pmu.product_id = p.id
 AND pmu.measurement_unit_id = p.base_measurement_unit_id
 AND pmu.is_active = TRUE
WHERE pv.deleted_at IS NULL
  AND pv.is_active = TRUE
  AND p.deleted_at IS NULL
  AND p.is_active = TRUE;

UPDATE customers
SET price_list_id = @retail_list_id,
    default_currency_code = 'CLP'
WHERE deleted_at IS NULL
  AND customer_type IN ('PERSON', 'INDIVIDUAL');

UPDATE customers
SET price_list_id = @wholesale_list_id,
    default_currency_code = 'CLP'
WHERE deleted_at IS NULL
  AND customer_type NOT IN ('PERSON', 'INDIVIDUAL');
