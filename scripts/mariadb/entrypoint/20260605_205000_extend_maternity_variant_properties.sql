-- Complementa atributos de SKU / Variedades para ropa maternal.
-- Mantiene rasgos de confeccion fuera del nombre comercial del modelo.

SET @group_garment := (SELECT id FROM attribute_groups WHERE group_code = 'GARMENT' LIMIT 1);
SET @group_variants := (SELECT id FROM attribute_groups WHERE group_code = 'VARIANTS' LIMIT 1);
SET @group_materials := (SELECT id FROM attribute_groups WHERE group_code = 'MATERIALS' LIMIT 1);
SET @group_seasonality := (SELECT id FROM attribute_groups WHERE group_code = 'SEASONALITY' LIMIT 1);

INSERT INTO attributes (
  attribute_group_id, attribute_code, attribute_name, attribute_type, is_required, affects_sku, sort_order, is_active
) VALUES
(@group_garment, 'NECKLINE', 'Escote / cuello', 'SELECT', FALSE, TRUE, 50, TRUE),
(@group_garment, 'FUNCTIONAL_FEATURE', 'Rasgo funcional', 'MULTISELECT', FALSE, TRUE, 60, TRUE),
(@group_garment, 'GARMENT_LENGTH', 'Largo de prenda', 'SELECT', FALSE, TRUE, 70, TRUE),
(@group_variants, 'WAIST_TYPE', 'Cintura / tiro', 'SELECT', FALSE, TRUE, 50, TRUE),
(@group_materials, 'TEXTURE', 'Textura', 'SELECT', FALSE, TRUE, 50, TRUE),
(@group_seasonality, 'OCCASION', 'Ocasion', 'SELECT', FALSE, FALSE, 50, TRUE)
ON DUPLICATE KEY UPDATE
  attribute_group_id = VALUES(attribute_group_id),
  attribute_name = VALUES(attribute_name),
  attribute_type = VALUES(attribute_type),
  is_required = VALUES(is_required),
  affects_sku = VALUES(affects_sku),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);

SET @attr_neckline := (SELECT id FROM attributes WHERE attribute_code = 'NECKLINE' LIMIT 1);
SET @attr_functional_feature := (SELECT id FROM attributes WHERE attribute_code = 'FUNCTIONAL_FEATURE' LIMIT 1);
SET @attr_garment_length := (SELECT id FROM attributes WHERE attribute_code = 'GARMENT_LENGTH' LIMIT 1);
SET @attr_waist_type := (SELECT id FROM attributes WHERE attribute_code = 'WAIST_TYPE' LIMIT 1);
SET @attr_texture := (SELECT id FROM attributes WHERE attribute_code = 'TEXTURE' LIMIT 1);
SET @attr_occasion := (SELECT id FROM attributes WHERE attribute_code = 'OCCASION' LIMIT 1);

DELETE FROM attribute_values
WHERE value_code IN (
  'NECK_ROUND', 'NECK_V', 'NECK_BEATLE', 'NECK_NORMAL', 'NECK_HALTER', 'NECK_STRAPLESS', 'FEAT_HOOD', 'FEAT_TIE',
  'FEAT_NURSING_ACCESS', 'FEAT_BELLY_PANEL', 'FEAT_POCKET', 'FEAT_TAPETA', 'FEAT_BUTTONS', 'FEAT_ADJUSTABLE_WAIST', 'FEAT_BABY_CARRIER', 'FEAT_SMOK',
  'FEAT_TABLE_PLEAT', 'GLEN_CROP', 'GLEN_HIP', 'GLEN_TUNIC', 'GLEN_KNEE', 'GLEN_MIDI', 'GLEN_LONG', 'WAIST_UNDER_BELLY',
  'WAIST_OVER_BELLY', 'WAIST_PANEL', 'WAIST_ADJUSTABLE', 'WAIST_HIGH', 'WAIST_REGULAR', 'TEXT_SMOOTH', 'TEXT_RIBBED', 'TEXT_SOFT',
  'TEXT_THICK', 'TEXT_LIGHT', 'OCC_DAILY', 'OCC_OFFICE', 'OCC_CEREMONY', 'OCC_NURSING', 'OCC_SLEEP'
);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_neckline, 'NECK_ROUND', 'Cuello redondo', 10, TRUE),
(@attr_neckline, 'NECK_V', 'Escote V', 20, TRUE),
(@attr_neckline, 'NECK_BEATLE', 'Cuello beatle', 30, TRUE),
(@attr_neckline, 'NECK_NORMAL', 'Cuello normal', 40, TRUE),
(@attr_neckline, 'NECK_HALTER', 'Halter', 50, TRUE),
(@attr_neckline, 'NECK_STRAPLESS', 'Strapless', 60, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_functional_feature, 'FEAT_HOOD', 'Gorro', 10, TRUE),
(@attr_functional_feature, 'FEAT_TIE', 'Amarra', 20, TRUE),
(@attr_functional_feature, 'FEAT_NURSING_ACCESS', 'Acceso lactancia', 30, TRUE),
(@attr_functional_feature, 'FEAT_BELLY_PANEL', 'Panel abdominal', 40, TRUE),
(@attr_functional_feature, 'FEAT_POCKET', 'Bolsillo', 50, TRUE),
(@attr_functional_feature, 'FEAT_TAPETA', 'Tapeta', 60, TRUE),
(@attr_functional_feature, 'FEAT_BUTTONS', 'Botones', 70, TRUE),
(@attr_functional_feature, 'FEAT_ADJUSTABLE_WAIST', 'Cintura ajustable', 80, TRUE),
(@attr_functional_feature, 'FEAT_BABY_CARRIER', 'Adaptado para bebe', 90, TRUE),
(@attr_functional_feature, 'FEAT_SMOK', 'Smock', 100, TRUE),
(@attr_functional_feature, 'FEAT_TABLE_PLEAT', 'Tabla', 110, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_garment_length, 'GLEN_CROP', 'Crop', 10, TRUE),
(@attr_garment_length, 'GLEN_HIP', 'A la cadera', 20, TRUE),
(@attr_garment_length, 'GLEN_TUNIC', 'Tunica', 30, TRUE),
(@attr_garment_length, 'GLEN_KNEE', 'A la rodilla', 40, TRUE),
(@attr_garment_length, 'GLEN_MIDI', 'Midi', 50, TRUE),
(@attr_garment_length, 'GLEN_LONG', 'Largo', 60, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_waist_type, 'WAIST_UNDER_BELLY', 'Bajo abdomen', 10, TRUE),
(@attr_waist_type, 'WAIST_OVER_BELLY', 'Sobre abdomen', 20, TRUE),
(@attr_waist_type, 'WAIST_PANEL', 'Con panel', 30, TRUE),
(@attr_waist_type, 'WAIST_ADJUSTABLE', 'Ajustable', 40, TRUE),
(@attr_waist_type, 'WAIST_HIGH', 'Tiro alto', 50, TRUE),
(@attr_waist_type, 'WAIST_REGULAR', 'Tiro regular', 60, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_texture, 'TEXT_SMOOTH', 'Lisa', 10, TRUE),
(@attr_texture, 'TEXT_RIBBED', 'Acanalada', 20, TRUE),
(@attr_texture, 'TEXT_SOFT', 'Suave', 30, TRUE),
(@attr_texture, 'TEXT_THICK', 'Gruesa', 40, TRUE),
(@attr_texture, 'TEXT_LIGHT', 'Liviana', 50, TRUE);

INSERT INTO attribute_values (attribute_id, value_code, value_name, sort_order, is_active) VALUES
(@attr_occasion, 'OCC_DAILY', 'Diario', 10, TRUE),
(@attr_occasion, 'OCC_OFFICE', 'Oficina', 20, TRUE),
(@attr_occasion, 'OCC_CEREMONY', 'Ceremonia', 30, TRUE),
(@attr_occasion, 'OCC_NURSING', 'Lactancia', 40, TRUE),
(@attr_occasion, 'OCC_SLEEP', 'Dormir', 50, TRUE);
