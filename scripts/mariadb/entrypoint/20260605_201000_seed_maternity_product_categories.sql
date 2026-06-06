-- Limpia productos/SKU demo y reconstruye categorias base para ropa maternal.
-- No recrea productos: se iran creando a medida que se defina el arbol comercial.

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM product_media;
DELETE FROM product_variant_attributes;
DELETE FROM product_barcodes;
DELETE FROM product_measurement_units;
DELETE FROM supplier_products;
DELETE FROM price_list_items;
DELETE FROM promotion_items;
DELETE FROM reorder_suggestions;
DELETE FROM stock_alerts;
DELETE FROM stock_critical_config;
DELETE FROM stock_movements;
DELETE FROM stock;
DELETE FROM product_variants;
DELETE FROM products;
DELETE FROM categories;

ALTER TABLE product_media AUTO_INCREMENT = 1;
ALTER TABLE product_variant_attributes AUTO_INCREMENT = 1;
ALTER TABLE product_barcodes AUTO_INCREMENT = 1;
ALTER TABLE product_measurement_units AUTO_INCREMENT = 1;
ALTER TABLE supplier_products AUTO_INCREMENT = 1;
ALTER TABLE price_list_items AUTO_INCREMENT = 1;
ALTER TABLE promotion_items AUTO_INCREMENT = 1;
ALTER TABLE reorder_suggestions AUTO_INCREMENT = 1;
ALTER TABLE stock_alerts AUTO_INCREMENT = 1;
ALTER TABLE stock_critical_config AUTO_INCREMENT = 1;
ALTER TABLE stock_movements AUTO_INCREMENT = 1;
ALTER TABLE stock AUTO_INCREMENT = 1;
ALTER TABLE product_variants AUTO_INCREMENT = 1;
ALTER TABLE products AUTO_INCREMENT = 1;
ALTER TABLE categories AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO categories (
  category_code, category_name, category_description, category_level, category_path, sort_order, is_active
) VALUES
('CAT_0001', 'Ropa maternal', 'Prendas principales para embarazo y postparto.', 1, 'Ropa maternal', 10, TRUE),
('CAT_0002', 'Lactancia', 'Prendas y accesorios pensados para etapa de lactancia.', 1, 'Lactancia', 20, TRUE),
('CAT_0003', 'Postparto', 'Prendas de apoyo y comodidad para recuperacion postparto.', 1, 'Postparto', 30, TRUE),
('CAT_0004', 'Accesorios maternales', 'Accesorios de apoyo para embarazo, lactancia y cuidado diario.', 1, 'Accesorios maternales', 40, TRUE),
('CAT_0005', 'Taller y confeccion', 'Insumos y preparacion interna para prendas maternales.', 1, 'Taller y confeccion', 50, TRUE);

SET @cat_ropa := (SELECT id FROM categories WHERE category_code = 'CAT_0001');
SET @cat_lactancia := (SELECT id FROM categories WHERE category_code = 'CAT_0002');
SET @cat_postparto := (SELECT id FROM categories WHERE category_code = 'CAT_0003');
SET @cat_accesorios := (SELECT id FROM categories WHERE category_code = 'CAT_0004');
SET @cat_taller := (SELECT id FROM categories WHERE category_code = 'CAT_0005');

INSERT INTO categories (
  parent_id, category_code, category_name, category_description, category_level, category_path, sort_order, is_active
) VALUES
(@cat_ropa, 'CAT_0006', 'Vestidos maternales', 'Vestidos para embarazo, ceremonia, oficina y uso diario.', 2, 'Ropa maternal/Vestidos maternales', 10, TRUE),
(@cat_ropa, 'CAT_0007', 'Blusas y poleras maternales', 'Prendas superiores con calce y comodidad para embarazo.', 2, 'Ropa maternal/Blusas y poleras maternales', 20, TRUE),
(@cat_ropa, 'CAT_0008', 'Pantalones y jeans maternales', 'Pantalones con cintura ajustable, panel o calce maternal.', 2, 'Ropa maternal/Pantalones y jeans maternales', 30, TRUE),
(@cat_ropa, 'CAT_0009', 'Calzas y palazzos maternales', 'Prendas inferiores elasticadas o amplias para uso diario.', 2, 'Ropa maternal/Calzas y palazzos maternales', 40, TRUE),
(@cat_ropa, 'CAT_0010', 'Enteritos y jardineras', 'Prendas completas para embarazo y uso casual.', 2, 'Ropa maternal/Enteritos y jardineras', 50, TRUE),
(@cat_ropa, 'CAT_0011', 'Abrigos y capas maternales', 'Prendas exteriores para temporada fria y media estacion.', 2, 'Ropa maternal/Abrigos y capas maternales', 60, TRUE),

(@cat_lactancia, 'CAT_0012', 'Poleras de lactancia', 'Poleras con acceso o abertura para amamantar.', 2, 'Lactancia/Poleras de lactancia', 10, TRUE),
(@cat_lactancia, 'CAT_0013', 'Vestidos de lactancia', 'Vestidos compatibles con lactancia y uso posterior.', 2, 'Lactancia/Vestidos de lactancia', 20, TRUE),
(@cat_lactancia, 'CAT_0014', 'Sostenes de lactancia', 'Soporte y comodidad para lactancia.', 2, 'Lactancia/Sostenes de lactancia', 30, TRUE),
(@cat_lactancia, 'CAT_0015', 'Pijamas de lactancia', 'Prendas de descanso con acceso para lactancia.', 2, 'Lactancia/Pijamas de lactancia', 40, TRUE),

(@cat_postparto, 'CAT_0016', 'Fajas y soporte postparto', 'Soporte y compresion suave para recuperacion.', 2, 'Postparto/Fajas y soporte postparto', 10, TRUE),
(@cat_postparto, 'CAT_0017', 'Ropa comoda postparto', 'Prendas suaves y adaptables para recuperacion diaria.', 2, 'Postparto/Ropa comoda postparto', 20, TRUE),

(@cat_accesorios, 'CAT_0018', 'Cinturones y extensores', 'Accesorios para ajustar prendas durante embarazo.', 2, 'Accesorios maternales/Cinturones y extensores', 10, TRUE),
(@cat_accesorios, 'CAT_0019', 'Bolsos maternales', 'Bolsos y organizadores para etapa maternal.', 2, 'Accesorios maternales/Bolsos maternales', 20, TRUE),
(@cat_accesorios, 'CAT_0020', 'Packs regalo maternal', 'Kits y combinaciones para regalo o venta especial.', 2, 'Accesorios maternales/Packs regalo maternal', 30, TRUE),

(@cat_taller, 'CAT_0021', 'Telas maternales', 'Telas usadas para prendas con elasticidad o calce maternal.', 2, 'Taller y confeccion/Telas maternales', 10, TRUE),
(@cat_taller, 'CAT_0022', 'Avios y terminaciones', 'Insumos, cierres, elasticos y terminaciones de taller.', 2, 'Taller y confeccion/Avios y terminaciones', 20, TRUE);
