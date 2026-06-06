-- Semilla inicial de marca y modelos comerciales para ropa maternal.
-- Mantiene un catalogo base para asociar modelos a productos.

INSERT INTO product_brands (brand_code, brand_name, brand_description, is_active)
VALUES
('BRD_CECICHIC', 'CeciChic', 'Marca propia para colecciones de ropa maternal.', TRUE)
ON DUPLICATE KEY UPDATE
  brand_name = VALUES(brand_name),
  brand_description = VALUES(brand_description),
  is_active = VALUES(is_active);

SET @brand_cecichic := (
  SELECT id
  FROM product_brands
  WHERE brand_code = 'BRD_CECICHIC'
  LIMIT 1
);


DELETE FROM product_models
WHERE brand_id = @brand_cecichic
  AND model_code LIKE 'MOD_MAT_%';

INSERT INTO product_models (brand_id, model_code, model_name, model_description, is_active) VALUES
(@brand_cecichic, 'MOD_MAT_001', 'Polera Mono', 'Linea sugerida: Vestuario / Polera.', TRUE),
(@brand_cecichic, 'MOD_MAT_002', 'Polera Gorro', 'Linea sugerida: Vestuario / Polera.', TRUE),
(@brand_cecichic, 'MOD_MAT_003', 'Polera Amarra', 'Linea sugerida: Vestuario / Polera.', TRUE),
(@brand_cecichic, 'MOD_MAT_004', 'Polera Marucela', 'Linea sugerida: Vestuario / Polera.', TRUE),
(@brand_cecichic, 'MOD_MAT_005', 'Polera Amamantar', 'Linea sugerida: Vestuario / Polera lactancia.', TRUE),
(@brand_cecichic, 'MOD_MAT_006', 'Polera Lactancia Fiesta', 'Linea sugerida: Vestuario / Polera lactancia.', TRUE),
(@brand_cecichic, 'MOD_MAT_007', 'Strapless', 'Linea sugerida: Vestuario / Polera.', TRUE),
(@brand_cecichic, 'MOD_MAT_008', 'Gitano', 'Linea sugerida: Vestuario / Polera.', TRUE),
(@brand_cecichic, 'MOD_MAT_009', 'Brenda', 'Linea sugerida: Vestuario / Polera.', TRUE),
(@brand_cecichic, 'MOD_MAT_010', 'Brenda Smoking', 'Linea sugerida: Vestuario / Blusa.', TRUE),
(@brand_cecichic, 'MOD_MAT_011', 'Brenda Smok', 'Linea sugerida: Vestuario / Blusa.', TRUE),
(@brand_cecichic, 'MOD_MAT_012', 'Sara', 'Linea sugerida: Vestuario / Polera.', TRUE),
(@brand_cecichic, 'MOD_MAT_013', 'Jenifer', 'Linea sugerida: Vestuario / Polera.', TRUE),
(@brand_cecichic, 'MOD_MAT_014', 'Beatle Angie', 'Linea sugerida: Vestuario / Polera.', TRUE),
(@brand_cecichic, 'MOD_MAT_015', 'Peto Shess', 'Linea sugerida: Vestuario / Polera.', TRUE),
(@brand_cecichic, 'MOD_MAT_016', 'Crop Top', 'Linea sugerida: Vestuario / Polera.', TRUE),
(@brand_cecichic, 'MOD_MAT_017', 'Pantalon Tapeta', 'Linea sugerida: Vestuario / Pantalon.', TRUE),
(@brand_cecichic, 'MOD_MAT_018', 'Pantalon Lino Tapeta', 'Linea sugerida: Vestuario / Pantalon.', TRUE),
(@brand_cecichic, 'MOD_MAT_019', 'Pantalon Cargo', 'Linea sugerida: Vestuario / Pantalon.', TRUE),
(@brand_cecichic, 'MOD_MAT_020', 'Pantalon Pitillo', 'Linea sugerida: Vestuario / Pantalon.', TRUE),
(@brand_cecichic, 'MOD_MAT_021', 'Pantalon Cotele', 'Linea sugerida: Vestuario / Pantalon.', TRUE),
(@brand_cecichic, 'MOD_MAT_022', 'Capri Cargo', 'Linea sugerida: Vestuario / Pantalon.', TRUE),
(@brand_cecichic, 'MOD_MAT_023', 'Capri', 'Linea sugerida: Vestuario / Pantalon.', TRUE),
(@brand_cecichic, 'MOD_MAT_024', 'Calza Pantalon', 'Linea sugerida: Vestuario / Calza.', TRUE),
(@brand_cecichic, 'MOD_MAT_025', 'Calza Pitillo', 'Linea sugerida: Vestuario / Calza.', TRUE),
(@brand_cecichic, 'MOD_MAT_026', 'Calza Flare', 'Linea sugerida: Vestuario / Calza.', TRUE),
(@brand_cecichic, 'MOD_MAT_027', 'Flare', 'Linea sugerida: Vestuario / Pantalon.', TRUE),
(@brand_cecichic, 'MOD_MAT_028', 'Leggin Con Bolsillo', 'Linea sugerida: Vestuario / Calza.', TRUE),
(@brand_cecichic, 'MOD_MAT_029', 'Jean', 'Linea sugerida: Vestuario / Pantalon.', TRUE),
(@brand_cecichic, 'MOD_MAT_030', 'Jean Pitillo', 'Linea sugerida: Vestuario / Pantalon.', TRUE),
(@brand_cecichic, 'MOD_MAT_031', 'Jean Cargo', 'Linea sugerida: Vestuario / Pantalon.', TRUE),
(@brand_cecichic, 'MOD_MAT_032', 'Jean Focalizado', 'Linea sugerida: Vestuario / Pantalon.', TRUE),
(@brand_cecichic, 'MOD_MAT_033', 'Jean Leggin', 'Linea sugerida: Vestuario / Calza.', TRUE),
(@brand_cecichic, 'MOD_MAT_034', 'Jeans Palazzo', 'Linea sugerida: Vestuario / Palazzo.', TRUE),
(@brand_cecichic, 'MOD_MAT_035', 'Palazzo', 'Linea sugerida: Vestuario / Palazzo.', TRUE),
(@brand_cecichic, 'MOD_MAT_036', 'Palazzo Maternal', 'Linea sugerida: Vestuario / Palazzo.', TRUE),
(@brand_cecichic, 'MOD_MAT_037', 'Palazzo Fiesta', 'Linea sugerida: Vestuario / Palazzo.', TRUE),
(@brand_cecichic, 'MOD_MAT_038', 'Jardinera', 'Linea sugerida: Vestuario / Jardinera.', TRUE),
(@brand_cecichic, 'MOD_MAT_039', 'Bombacha', 'Linea sugerida: Vestuario / Pantalon.', TRUE),
(@brand_cecichic, 'MOD_MAT_040', 'Falda Recta', 'Linea sugerida: Vestuario / Falda.', TRUE),
(@brand_cecichic, 'MOD_MAT_041', 'Vestido Plato', 'Linea sugerida: Vestuario / Vestido.', TRUE),
(@brand_cecichic, 'MOD_MAT_042', 'Vestido Marylin', 'Linea sugerida: Vestuario / Vestido.', TRUE),
(@brand_cecichic, 'MOD_MAT_043', 'Vestido Hilo', 'Linea sugerida: Vestuario / Vestido.', TRUE),
(@brand_cecichic, 'MOD_MAT_044', 'Vestido Tubo', 'Linea sugerida: Vestuario / Vestido.', TRUE),
(@brand_cecichic, 'MOD_MAT_045', 'Vestido Tubo Lactancia', 'Linea sugerida: Vestuario / Vestido lactancia.', TRUE),
(@brand_cecichic, 'MOD_MAT_046', 'Mini Koni', 'Linea sugerida: Vestuario / Vestido.', TRUE),
(@brand_cecichic, 'MOD_MAT_047', 'Koni Gaza', 'Linea sugerida: Vestuario / Vestido.', TRUE),
(@brand_cecichic, 'MOD_MAT_048', 'Solera Pavilo Tabla', 'Linea sugerida: Vestuario / Vestido.', TRUE),
(@brand_cecichic, 'MOD_MAT_049', 'Solera Strap Gaza', 'Linea sugerida: Vestuario / Vestido.', TRUE),
(@brand_cecichic, 'MOD_MAT_050', 'Enterito', 'Linea sugerida: Vestuario / Enterito.', TRUE),
(@brand_cecichic, 'MOD_MAT_051', 'Enterito Palazzo', 'Linea sugerida: Vestuario / Enterito.', TRUE),
(@brand_cecichic, 'MOD_MAT_052', 'Enterito Lactancia', 'Linea sugerida: Vestuario / Enterito lactancia.', TRUE),
(@brand_cecichic, 'MOD_MAT_053', 'Poncho', 'Linea sugerida: Vestuario / Abrigo.', TRUE),
(@brand_cecichic, 'MOD_MAT_054', 'Poncho Cuello Normal Gorro', 'Linea sugerida: Vestuario / Abrigo.', TRUE),
(@brand_cecichic, 'MOD_MAT_055', 'Chaleco Punta', 'Linea sugerida: Vestuario / Abrigo.', TRUE),
(@brand_cecichic, 'MOD_MAT_056', 'Abrigo Con Bebe', 'Linea sugerida: Vestuario / Abrigo maternal.', TRUE),
(@brand_cecichic, 'MOD_MAT_057', 'Campanita', 'Linea sugerida: Vestuario / Abrigo.', TRUE),
(@brand_cecichic, 'MOD_MAT_058', 'Tunica', 'Linea sugerida: Vestuario / Blusa.', TRUE),
(@brand_cecichic, 'MOD_MAT_059', 'Conjunto Pijama', 'Linea sugerida: Dormir / Pijama maternal.', TRUE)
ON DUPLICATE KEY UPDATE
  brand_id = VALUES(brand_id),
  model_name = VALUES(model_name),
  model_description = VALUES(model_description),
  is_active = VALUES(is_active);
