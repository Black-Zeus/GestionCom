-- =====================================================
-- Alter columnas de estado centralizado
-- Archivo: 20260603_1349_alter_status.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;


-- 3.1: Agregar nuevas columnas
ALTER TABLE `documents` ADD COLUMN `status_id` bigint(20) unsigned DEFAULT NULL AFTER `document_status`;
ALTER TABLE `customers` ADD COLUMN `status_id` bigint(20) unsigned DEFAULT NULL AFTER `customer_status`;
ALTER TABLE `customer_payments` ADD COLUMN `status_id` bigint(20) unsigned DEFAULT NULL AFTER `payment_status`;
ALTER TABLE `cash_register_sessions` ADD COLUMN `status_id` bigint(20) unsigned DEFAULT NULL AFTER `session_status`;
ALTER TABLE `accounts_receivable` ADD COLUMN `status_id` bigint(20) unsigned DEFAULT NULL AFTER `status`;
ALTER TABLE `return_documents` ADD COLUMN `status_id` bigint(20) unsigned DEFAULT NULL AFTER `return_status`;
ALTER TABLE `stock_alerts` ADD COLUMN `status_id` bigint(20) unsigned DEFAULT NULL AFTER `alert_status`;
ALTER TABLE `petty_cash_expenses` ADD COLUMN `status_id` bigint(20) unsigned DEFAULT NULL AFTER `expense_status`;
ALTER TABLE `document_payment_details` ADD COLUMN `status_id` bigint(20) unsigned DEFAULT NULL AFTER `payment_status`;

-- 3.2: Crear índices
ALTER TABLE `documents` ADD KEY `idx_status_id` (`status_id`);
ALTER TABLE `customers` ADD KEY `idx_status_id` (`status_id`);
ALTER TABLE `customer_payments` ADD KEY `idx_status_id` (`status_id`);
ALTER TABLE `cash_register_sessions` ADD KEY `idx_status_id` (`status_id`);
ALTER TABLE `accounts_receivable` ADD KEY `idx_status_id` (`status_id`);
ALTER TABLE `return_documents` ADD KEY `idx_status_id` (`status_id`);
ALTER TABLE `stock_alerts` ADD KEY `idx_status_id` (`status_id`);
ALTER TABLE `petty_cash_expenses` ADD KEY `idx_status_id` (`status_id`);
ALTER TABLE `document_payment_details` ADD KEY `idx_status_id` (`status_id`);

-- 3.3: Crear foreign keys
ALTER TABLE `documents` ADD CONSTRAINT `fk_documents_status` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`);
ALTER TABLE `customers` ADD CONSTRAINT `fk_customers_status` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`);
ALTER TABLE `customer_payments` ADD CONSTRAINT `fk_customer_payments_status` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`);
ALTER TABLE `cash_register_sessions` ADD CONSTRAINT `fk_cash_sessions_status` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`);
ALTER TABLE `accounts_receivable` ADD CONSTRAINT `fk_accounts_receivable_status` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`);
ALTER TABLE `return_documents` ADD CONSTRAINT `fk_return_documents_status` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`);
ALTER TABLE `stock_alerts` ADD CONSTRAINT `fk_stock_alerts_status` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`);
ALTER TABLE `petty_cash_expenses` ADD CONSTRAINT `fk_petty_cash_expenses_status` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`);
ALTER TABLE `document_payment_details` ADD CONSTRAINT `fk_document_payment_details_status` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`);

SET FOREIGN_KEY_CHECKS = 1;
