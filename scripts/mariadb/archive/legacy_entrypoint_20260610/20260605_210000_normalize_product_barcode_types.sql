-- Normaliza tipos de codigos de barra a formatos estandar.

UPDATE product_barcodes
SET barcode_type = 'CODE128'
WHERE barcode_type = 'OTHER';

ALTER TABLE product_barcodes
MODIFY barcode_type ENUM('EAN13', 'EAN8', 'UPC', 'CODE128', 'QR') NOT NULL;
