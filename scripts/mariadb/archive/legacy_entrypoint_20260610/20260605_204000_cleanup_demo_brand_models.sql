-- Elimina marcas/modelos demo de productos y sus relaciones de prueba.

SET @demo_prd_polera := (SELECT id FROM products WHERE product_code = 'DEMO_PRD_POLERA' LIMIT 1);
SET @demo_prd_blazer := (SELECT id FROM products WHERE product_code = 'DEMO_PRD_BLAZER' LIMIT 1);
SET @demo_prd_cartera := (SELECT id FROM products WHERE product_code = 'DEMO_PRD_CARTERA' LIMIT 1);

DELETE FROM product_barcodes
WHERE product_variant_id IN (
  SELECT id FROM product_variants
  WHERE product_id IN (@demo_prd_polera, @demo_prd_blazer, @demo_prd_cartera)
);

DELETE FROM product_measurement_units
WHERE product_id IN (@demo_prd_polera, @demo_prd_blazer, @demo_prd_cartera);

DELETE FROM product_variants
WHERE product_id IN (@demo_prd_polera, @demo_prd_blazer, @demo_prd_cartera);

DELETE FROM products
WHERE product_code IN ('DEMO_PRD_POLERA', 'DEMO_PRD_BLAZER', 'DEMO_PRD_CARTERA');

DELETE FROM product_models
WHERE model_code IN ('DEMO_MOD_BASIC', 'DEMO_MOD_PREM', 'DEMO_MOD_LUNA')
   OR brand_id IN (
     SELECT id FROM product_brands
     WHERE brand_code IN ('DEMO_BRD_CECI', 'DEMO_BRD_LUNA')
        OR brand_name IN ('Ceci Chic Demo', 'Luna Demo')
   );

DELETE FROM product_brands
WHERE brand_code IN ('DEMO_BRD_CECI', 'DEMO_BRD_LUNA')
   OR brand_name IN ('Ceci Chic Demo', 'Luna Demo');
