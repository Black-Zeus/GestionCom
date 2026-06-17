-- Guarda el correo indicado al procesar una venta para envio/registro de comprobante.
USE inventario;

ALTER TABLE `sale_documents`
  ADD COLUMN IF NOT EXISTS `receipt_email` varchar(255) DEFAULT NULL
    COMMENT 'Correo indicado al procesar la venta para comprobante; independiente del email del cliente'
    AFTER `change_amount`;
