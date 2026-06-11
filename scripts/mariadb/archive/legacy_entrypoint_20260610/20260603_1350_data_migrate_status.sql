-- =====================================================
-- Migracion de datos a estados centralizados
-- Archivo: 20260603_1350_data_migrate_status.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 3.4: Migrar datos
UPDATE documents SET status_id = (SELECT id FROM system_statuses WHERE status_group = 'DOCUMENT' AND status_code = documents.document_status) WHERE document_status IS NOT NULL;
UPDATE customers SET status_id = (SELECT id FROM system_statuses WHERE status_group = 'CUSTOMER' AND status_code = customers.customer_status) WHERE customer_status IS NOT NULL;
UPDATE customer_payments SET status_id = (SELECT id FROM system_statuses WHERE status_group = 'PAYMENT' AND status_code = customer_payments.payment_status) WHERE payment_status IS NOT NULL;
UPDATE cash_register_sessions SET status_id = (SELECT id FROM system_statuses WHERE status_group = 'CASH_SESSION' AND status_code = cash_register_sessions.session_status) WHERE session_status IS NOT NULL;
UPDATE accounts_receivable SET status_id = (SELECT id FROM system_statuses WHERE status_group = 'RECEIVABLE' AND status_code = accounts_receivable.status) WHERE status IS NOT NULL;
UPDATE return_documents SET status_id = (SELECT id FROM system_statuses WHERE status_group = 'RETURN' AND status_code = return_documents.return_status) WHERE return_status IS NOT NULL;
UPDATE stock_alerts SET status_id = (SELECT id FROM system_statuses WHERE status_group = 'STOCK_ALERT' AND status_code = stock_alerts.alert_status) WHERE alert_status IS NOT NULL;
UPDATE petty_cash_expenses SET status_id = (SELECT id FROM system_statuses WHERE status_group = 'EXPENSE' AND status_code = petty_cash_expenses.expense_status) WHERE expense_status IS NOT NULL;
UPDATE document_payment_details SET status_id = (SELECT id FROM system_statuses WHERE status_group = 'PAYMENT' AND status_code = document_payment_details.payment_status) WHERE payment_status IS NOT NULL;

-- 4.5: Después de verificar que todo está correcto, eliminar ENUMs
ALTER TABLE `documents` DROP COLUMN `document_status`;
ALTER TABLE `customers` DROP COLUMN `customer_status`;
ALTER TABLE `customer_payments` DROP COLUMN `payment_status`;
ALTER TABLE `cash_register_sessions` DROP COLUMN `session_status`;
ALTER TABLE `accounts_receivable` DROP COLUMN `status`;
ALTER TABLE `return_documents` DROP COLUMN `return_status`;
ALTER TABLE `stock_alerts` DROP COLUMN `alert_status`;
ALTER TABLE `petty_cash_expenses` DROP COLUMN `expense_status`;
ALTER TABLE `document_payment_details` DROP COLUMN `payment_status`;

SET FOREIGN_KEY_CHECKS = 1;
