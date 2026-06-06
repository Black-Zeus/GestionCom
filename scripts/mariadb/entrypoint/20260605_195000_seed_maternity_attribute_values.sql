-- Reconstruye grupos, atributos y valores para inventario de ropa maternal.
-- Base tomada del legacy inv_old/DB/inventario.sql:
-- - colores: catalogo legacy de colores.
-- - tallas: XS, S, M, L, XL, XXL, ST.
-- - productos/temporal: SKU compuesto por producto + talla + color, con prendas como
--   polera, pantalon, vestido, blusa, enterito, palazzo, calza y lactancia.
--
-- IMPORTANTE: este seed limpia los catalogos de atributos actuales.

DELETE FROM product_variant_attributes;
DELETE FROM attribute_values;
DELETE FROM attributes;
DELETE FROM attribute_groups;

ALTER TABLE attribute_values AUTO_INCREMENT = 1;
ALTER TABLE attributes AUTO_INCREMENT = 1;
ALTER TABLE attribute_groups AUTO_INCREMENT = 1;

INSERT INTO attribute_groups (
  group_code, group_name, group_description, sort_order, is_active
) VALUES
('VARIANTS', 'Variantes vendibles', 'Atributos que diferencian SKU / Variedades: talla, color, calce y etapa maternal.', 10, TRUE),
('GARMENT', 'Prenda y uso', 'Clasificacion funcional de la prenda, estilo, linea maternal y uso principal.', 20, TRUE),
('MATERIALS', 'Materiales y confeccion', 'Material, tela, elasticidad y terminaciones usadas en taller o compra.', 30, TRUE),
('SEASONALITY', 'Temporada y diseno', 'Temporada, patron visual y largo de manga o pierna.', 40, TRUE),
('PACKAGING', 'Empaque', 'Formato de empaque y unidades comerciales.', 50, TRUE);

SET @group_variants := (SELECT id FROM attribute_groups WHERE group_code = 'VARIANTS' LIMIT 1);
SET @group_garment := (SELECT id FROM attribute_groups WHERE group_code = 'GARMENT' LIMIT 1);
SET @group_materials := (SELECT id FROM attribute_groups WHERE group_code = 'MATERIALS' LIMIT 1);
SET @group_seasonality := (SELECT id FROM attribute_groups WHERE group_code = 'SEASONALITY' LIMIT 1);
SET @group_packaging := (SELECT id FROM attribute_groups WHERE group_code = 'PACKAGING' LIMIT 1);

INSERT INTO attributes (
  attribute_group_id, attribute_code, attribute_name, attribute_type, is_required, affects_sku, sort_order, is_active
) VALUES
(@group_variants, 'SIZE', 'Talla', 'SELECT', TRUE, TRUE, 10, TRUE),
(@group_variants, 'COLOR', 'Color', 'SELECT', TRUE, TRUE, 20, TRUE),
(@group_variants, 'FIT', 'Calce', 'SELECT', FALSE, TRUE, 30, TRUE),
(@group_variants, 'MATERNITY_STAGE', 'Etapa maternal', 'SELECT', FALSE, TRUE, 40, TRUE),

(@group_garment, 'GARMENT_TYPE', 'Tipo de prenda', 'SELECT', TRUE, FALSE, 10, TRUE),
(@group_garment, 'PRODUCT_LINE', 'Linea de producto', 'SELECT', FALSE, FALSE, 20, TRUE),
(@group_garment, 'USE_CASE', 'Uso principal', 'SELECT', FALSE, FALSE, 30, TRUE),
(@group_garment, 'STYLE', 'Estilo', 'SELECT', FALSE, TRUE, 40, TRUE),

(@group_materials, 'MATERIAL', 'Material', 'SELECT', FALSE, TRUE, 10, TRUE),
(@group_materials, 'FABRIC', 'Tela', 'SELECT', FALSE, TRUE, 20, TRUE),
(@group_materials, 'ELASTICITY', 'Elasticidad', 'SELECT', FALSE, TRUE, 30, TRUE),
(@group_materials, 'FINISHING', 'Terminacion', 'SELECT', FALSE, FALSE, 40, TRUE),

(@group_seasonality, 'SEASON', 'Temporada', 'SELECT', FALSE, FALSE, 10, TRUE),
(@group_seasonality, 'PATTERN', 'Diseno / patron', 'SELECT', FALSE, TRUE, 20, TRUE),
(@group_seasonality, 'SLEEVE_LENGTH', 'Largo de manga', 'SELECT', FALSE, TRUE, 30, TRUE),
(@group_seasonality, 'LEG_LENGTH', 'Largo de pierna', 'SELECT', FALSE, TRUE, 40, TRUE),

(@group_packaging, 'PACKAGE_TYPE', 'Tipo de empaque', 'SELECT', FALSE, FALSE, 10, TRUE),
(@group_packaging, 'UNITS_PER_PACK', 'Unidades por empaque', 'NUMBER', FALSE, FALSE, 20, TRUE);

SET @attr_size := (SELECT id FROM attributes WHERE attribute_code = 'SIZE' LIMIT 1);
SET @attr_color := (SELECT id FROM attributes WHERE attribute_code = 'COLOR' LIMIT 1);
SET @attr_fit := (SELECT id FROM attributes WHERE attribute_code = 'FIT' LIMIT 1);
SET @attr_maternity_stage := (SELECT id FROM attributes WHERE attribute_code = 'MATERNITY_STAGE' LIMIT 1);
SET @attr_garment_type := (SELECT id FROM attributes WHERE attribute_code = 'GARMENT_TYPE' LIMIT 1);
SET @attr_product_line := (SELECT id FROM attributes WHERE attribute_code = 'PRODUCT_LINE' LIMIT 1);
SET @attr_use_case := (SELECT id FROM attributes WHERE attribute_code = 'USE_CASE' LIMIT 1);
SET @attr_style := (SELECT id FROM attributes WHERE attribute_code = 'STYLE' LIMIT 1);
SET @attr_material := (SELECT id FROM attributes WHERE attribute_code = 'MATERIAL' LIMIT 1);
SET @attr_fabric := (SELECT id FROM attributes WHERE attribute_code = 'FABRIC' LIMIT 1);
SET @attr_elasticity := (SELECT id FROM attributes WHERE attribute_code = 'ELASTICITY' LIMIT 1);
SET @attr_finishing := (SELECT id FROM attributes WHERE attribute_code = 'FINISHING' LIMIT 1);
SET @attr_season := (SELECT id FROM attributes WHERE attribute_code = 'SEASON' LIMIT 1);
SET @attr_pattern := (SELECT id FROM attributes WHERE attribute_code = 'PATTERN' LIMIT 1);
SET @attr_sleeve_length := (SELECT id FROM attributes WHERE attribute_code = 'SLEEVE_LENGTH' LIMIT 1);
SET @attr_leg_length := (SELECT id FROM attributes WHERE attribute_code = 'LEG_LENGTH' LIMIT 1);
SET @attr_package_type := (SELECT id FROM attributes WHERE attribute_code = 'PACKAGE_TYPE' LIMIT 1);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_size, 'SIZE_XS', 'XS', 10, TRUE),
(@attr_size, 'SIZE_S', 'S', 20, TRUE),
(@attr_size, 'SIZE_M', 'M', 30, TRUE),
(@attr_size, 'SIZE_L', 'L', 40, TRUE),
(@attr_size, 'SIZE_XL', 'XL', 50, TRUE),
(@attr_size, 'SIZE_XXL', 'XXL', 60, TRUE),
(@attr_size, 'SIZE_ST', 'Standard', 70, TRUE),
(@attr_size, 'SIZE_ONE', 'Talla unica', 80, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_color, 'COLOR_BLACK', 'Negro', 10, TRUE),
(@attr_color, 'COLOR_WHITE', 'Blanco', 20, TRUE),
(@attr_color, 'COLOR_IVORY', 'Marfil', 30, TRUE),
(@attr_color, 'COLOR_BEIGE', 'Beige', 40, TRUE),
(@attr_color, 'COLOR_CREAM', 'Blanco crema', 50, TRUE),
(@attr_color, 'COLOR_COFFEE', 'Cafe', 60, TRUE),
(@attr_color, 'COLOR_BLUE', 'Azul', 70, TRUE),
(@attr_color, 'COLOR_NAVY', 'Azul marino', 80, TRUE),
(@attr_color, 'COLOR_DENIM', 'Mezclilla', 90, TRUE),
(@attr_color, 'COLOR_GRAY', 'Gris', 100, TRUE),
(@attr_color, 'COLOR_LIGHT_GRAY', 'Gris claro', 110, TRUE),
(@attr_color, 'COLOR_PEARL_GRAY', 'Gris perla', 120, TRUE),
(@attr_color, 'COLOR_GRAPHITE', 'Grafito', 130, TRUE),
(@attr_color, 'COLOR_RED', 'Rojo', 140, TRUE),
(@attr_color, 'COLOR_BURGUNDY', 'Burdeo', 150, TRUE),
(@attr_color, 'COLOR_PINK', 'Rosado', 160, TRUE),
(@attr_color, 'COLOR_DUSTY_ROSE', 'Palo rosa', 170, TRUE),
(@attr_color, 'COLOR_CORAL', 'Coral', 180, TRUE),
(@attr_color, 'COLOR_FUCHSIA', 'Fucsia', 190, TRUE),
(@attr_color, 'COLOR_LILAC', 'Lila', 200, TRUE),
(@attr_color, 'COLOR_PURPLE', 'Morado', 210, TRUE),
(@attr_color, 'COLOR_PETROL', 'Petroleo', 220, TRUE),
(@attr_color, 'COLOR_OLIVE', 'Verde musgo', 230, TRUE),
(@attr_color, 'COLOR_EARTH_GREEN', 'Verde tierra', 240, TRUE),
(@attr_color, 'COLOR_CALYPSO', 'Calipso', 250, TRUE),
(@attr_color, 'COLOR_TERRACOTTA', 'Terracota', 260, TRUE),
(@attr_color, 'COLOR_MUSTARD', 'Mostaza', 270, TRUE),
(@attr_color, 'COLOR_OYSTER', 'Ostra', 280, TRUE),
(@attr_color, 'COLOR_MELANGE', 'Melange', 290, TRUE),
(@attr_color, 'COLOR_PRINTED', 'Estampado', 300, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_fit, 'FIT_REGULAR', 'Regular', 10, TRUE),
(@attr_fit, 'FIT_ADJUSTABLE', 'Ajustable', 20, TRUE),
(@attr_fit, 'FIT_BELLY_PANEL', 'Panel abdominal', 30, TRUE),
(@attr_fit, 'FIT_HIGH_WAIST', 'Cintura alta', 40, TRUE),
(@attr_fit, 'FIT_STRETCH', 'Elasticado', 50, TRUE),
(@attr_fit, 'FIT_OVERSIZE', 'Holgado', 60, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_maternity_stage, 'STAGE_FIRST_TRIMESTER', 'Primer trimestre', 10, TRUE),
(@attr_maternity_stage, 'STAGE_SECOND_TRIMESTER', 'Segundo trimestre', 20, TRUE),
(@attr_maternity_stage, 'STAGE_THIRD_TRIMESTER', 'Tercer trimestre', 30, TRUE),
(@attr_maternity_stage, 'STAGE_POSTPARTUM', 'Postparto', 40, TRUE),
(@attr_maternity_stage, 'STAGE_NURSING', 'Lactancia', 50, TRUE),
(@attr_maternity_stage, 'STAGE_ALL', 'Todo el embarazo', 60, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_garment_type, 'GARMENT_BLOUSE', 'Blusa', 10, TRUE),
(@attr_garment_type, 'GARMENT_SHIRT', 'Polera', 20, TRUE),
(@attr_garment_type, 'GARMENT_DRESS', 'Vestido', 30, TRUE),
(@attr_garment_type, 'GARMENT_PANTS', 'Pantalon', 40, TRUE),
(@attr_garment_type, 'GARMENT_LEGGING', 'Calza', 50, TRUE),
(@attr_garment_type, 'GARMENT_PALAZZO', 'Palazzo', 60, TRUE),
(@attr_garment_type, 'GARMENT_JUMPSUIT', 'Enterito', 70, TRUE),
(@attr_garment_type, 'GARMENT_OVERALL', 'Jardinera', 80, TRUE),
(@attr_garment_type, 'GARMENT_BRA', 'Sosten lactancia', 90, TRUE),
(@attr_garment_type, 'GARMENT_PIJAMA', 'Pijama maternal', 100, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_product_line, 'LINE_MATERNITY', 'Maternal', 10, TRUE),
(@attr_product_line, 'LINE_NURSING', 'Lactancia', 20, TRUE),
(@attr_product_line, 'LINE_WORKSHOP', 'Taller propio', 30, TRUE),
(@attr_product_line, 'LINE_RETAIL', 'Venta tienda', 40, TRUE),
(@attr_product_line, 'LINE_BASIC', 'Basicos', 50, TRUE),
(@attr_product_line, 'LINE_CEREMONY', 'Ceremonia', 60, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_use_case, 'USE_DAILY', 'Uso diario', 10, TRUE),
(@attr_use_case, 'USE_OFFICE', 'Oficina', 20, TRUE),
(@attr_use_case, 'USE_SLEEP', 'Dormir', 30, TRUE),
(@attr_use_case, 'USE_NURSING', 'Amamantar', 40, TRUE),
(@attr_use_case, 'USE_PARTY', 'Fiesta', 50, TRUE),
(@attr_use_case, 'USE_WORKSHOP', 'Confeccion taller', 60, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_style, 'STYLE_BASIC', 'Basico', 10, TRUE),
(@attr_style, 'STYLE_CASUAL', 'Casual', 20, TRUE),
(@attr_style, 'STYLE_OFFICE', 'Oficina', 30, TRUE),
(@attr_style, 'STYLE_CEREMONY', 'Ceremonia', 40, TRUE),
(@attr_style, 'STYLE_NURSING', 'Lactancia', 50, TRUE),
(@attr_style, 'STYLE_SPORT', 'Comodo / sport', 60, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_material, 'MAT_COTTON', 'Algodon', 10, TRUE),
(@attr_material, 'MAT_COTTON_STRETCH', 'Algodon elasticado', 20, TRUE),
(@attr_material, 'MAT_LYCRA', 'Lycra', 30, TRUE),
(@attr_material, 'MAT_VISCOSE', 'Viscosa', 40, TRUE),
(@attr_material, 'MAT_MODAL', 'Modal', 50, TRUE),
(@attr_material, 'MAT_GABARDINE', 'Gabardina', 60, TRUE),
(@attr_material, 'MAT_WOOL_BLEND', 'Lanilla', 70, TRUE),
(@attr_material, 'MAT_DENIM', 'Mezclilla', 80, TRUE),
(@attr_material, 'MAT_LACE', 'Encaje', 90, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_fabric, 'FAB_JERSEY', 'Jersey', 10, TRUE),
(@attr_fabric, 'FAB_RIB', 'Rib elasticado', 20, TRUE),
(@attr_fabric, 'FAB_CREPE', 'Crepe', 30, TRUE),
(@attr_fabric, 'FAB_FLEECE', 'Franela suave', 40, TRUE),
(@attr_fabric, 'FAB_GABARDINE', 'Gabardina', 50, TRUE),
(@attr_fabric, 'FAB_KNIT', 'Tejido punto', 60, TRUE),
(@attr_fabric, 'FAB_DENIM', 'Denim', 70, TRUE),
(@attr_fabric, 'FAB_PRINTED', 'Tela estampada', 80, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_elasticity, 'ELAS_NONE', 'Sin elasticidad', 10, TRUE),
(@attr_elasticity, 'ELAS_LOW', 'Baja', 20, TRUE),
(@attr_elasticity, 'ELAS_MEDIUM', 'Media', 30, TRUE),
(@attr_elasticity, 'ELAS_HIGH', 'Alta', 40, TRUE),
(@attr_elasticity, 'ELAS_FOUR_WAY', 'Elasticidad 4 direcciones', 50, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_finishing, 'FINISH_SMOOTH', 'Liso', 10, TRUE),
(@attr_finishing, 'FINISH_SMOK', 'Smock', 20, TRUE),
(@attr_finishing, 'FINISH_LACE', 'Encaje', 30, TRUE),
(@attr_finishing, 'FINISH_PANEL', 'Panel abdominal', 40, TRUE),
(@attr_finishing, 'FINISH_NURSING_OPENING', 'Abertura lactancia', 50, TRUE),
(@attr_finishing, 'FINISH_ADJUSTABLE_WAIST', 'Cintura ajustable', 60, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_season, 'SEASON_ALL', 'Todo el ano', 10, TRUE),
(@attr_season, 'SEASON_SUMMER', 'Primavera / verano', 20, TRUE),
(@attr_season, 'SEASON_WINTER', 'Otono / invierno', 30, TRUE),
(@attr_season, 'SEASON_TRANSITION', 'Media temporada', 40, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_pattern, 'PATTERN_SOLID', 'Liso', 10, TRUE),
(@attr_pattern, 'PATTERN_PRINTED', 'Estampado', 20, TRUE),
(@attr_pattern, 'PATTERN_STRIPED', 'Listado', 30, TRUE),
(@attr_pattern, 'PATTERN_MELANGE', 'Melange', 40, TRUE),
(@attr_pattern, 'PATTERN_PLAID', 'Escoces', 50, TRUE),
(@attr_pattern, 'PATTERN_DENIM', 'Mezclilla', 60, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_sleeve_length, 'SLEEVE_SLEEVELESS', 'Sin manga', 10, TRUE),
(@attr_sleeve_length, 'SLEEVE_SHORT', 'Manga corta', 20, TRUE),
(@attr_sleeve_length, 'SLEEVE_THREE_QUARTERS', 'Manga tres cuartos', 30, TRUE),
(@attr_sleeve_length, 'SLEEVE_LONG', 'Manga larga', 40, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_leg_length, 'LEG_SHORT', 'Corto', 10, TRUE),
(@attr_leg_length, 'LEG_CAPRI', 'Capri', 20, TRUE),
(@attr_leg_length, 'LEG_REGULAR', 'Largo regular', 30, TRUE),
(@attr_leg_length, 'LEG_PALAZZO', 'Palazzo', 40, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_package_type, 'PKG_INDIVIDUAL_BAG', 'Bolsa individual', 10, TRUE),
(@attr_package_type, 'PKG_HANGER', 'Percha', 20, TRUE),
(@attr_package_type, 'PKG_GIFT_BOX', 'Caja regalo', 30, TRUE),
(@attr_package_type, 'PKG_BULK', 'Bulto taller', 40, TRUE);
