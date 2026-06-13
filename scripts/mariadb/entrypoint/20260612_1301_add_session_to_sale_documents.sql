-- Vincula cada documento de venta a la sesion de caja en que fue cobrado.
USE inventario;

ALTER TABLE `sale_documents`
  ADD COLUMN IF NOT EXISTS `cash_register_session_id` bigint(20) unsigned DEFAULT NULL
    AFTER `cash_register_id`;

ALTER TABLE `sale_documents`
  ADD KEY IF NOT EXISTS `idx_sale_documents_session_id` (`cash_register_session_id`);

ALTER TABLE `sale_documents`
  ADD CONSTRAINT `fk_sale_documents_session`
    FOREIGN KEY (`cash_register_session_id`) REFERENCES `cash_register_sessions` (`id`);
