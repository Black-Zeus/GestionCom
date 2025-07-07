-- ===============================================
-- MIGRACIÓN SIMPLIFICADA: ENUMs A ESTADOS CENTRALIZADOS
-- ===============================================

-- PASO 1: CREAR NUEVAS TABLAS
-- ===============================================

CREATE TABLE `system_statuses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `status_group` varchar(50) NOT NULL,
  `status_code` varchar(50) NOT NULL,
  `status_name` varchar(100) NOT NULL,
  `status_display_es` varchar(150) NOT NULL,
  `status_color` varchar(20) DEFAULT NULL,
  `status_icon` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `sort_order` int(10) unsigned DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_status_group_code` (`status_group`, `status_code`),
  KEY `idx_status_group` (`status_group`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `status_change_history` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `table_name` varchar(100) NOT NULL,
  `record_id` bigint(20) unsigned NOT NULL,
  `from_status_id` bigint(20) unsigned DEFAULT NULL,
  `to_status_id` bigint(20) unsigned NOT NULL,
  `changed_by_user_id` bigint(20) unsigned NOT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reason` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_table_record` (`table_name`, `record_id`),
  KEY `idx_changed_at` (`changed_at`),
  CONSTRAINT `status_change_history_ibfk_1` FOREIGN KEY (`from_status_id`) REFERENCES `system_statuses` (`id`),
  CONSTRAINT `status_change_history_ibfk_2` FOREIGN KEY (`to_status_id`) REFERENCES `system_statuses` (`id`),
  CONSTRAINT `status_change_history_ibfk_3` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===============================================
-- PASO 2: POBLAR DATOS EN TABLAS NUEVAS
-- ===============================================

-- Estados para documentos
INSERT INTO `system_statuses` (`status_group`, `status_code`, `status_name`, `status_display_es`, `status_color`, `status_icon`, `sort_order`) VALUES
('DOCUMENT', 'DRAFT', 'Draft', 'Borrador', '#6c757d', 'fa-edit', 10),
('DOCUMENT', 'PENDING', 'Pending', 'Pendiente', '#ffc107', 'fa-clock', 20),
('DOCUMENT', 'APPROVED', 'Approved', 'Aprobado', '#28a745', 'fa-check', 30),
('DOCUMENT', 'PROCESSED', 'Processed', 'Procesado', '#17a2b8', 'fa-check-double', 40),
('DOCUMENT', 'CANCELLED', 'Cancelled', 'Cancelado', '#dc3545', 'fa-times', 50);

-- Estados para clientes  
INSERT INTO `system_statuses` (`status_group`, `status_code`, `status_name`, `status_display_es`, `status_color`, `status_icon`, `sort_order`) VALUES
('CUSTOMER', 'ACTIVE', 'Active', 'Activo', '#28a745', 'fa-user-check', 10),
('CUSTOMER', 'INACTIVE', 'Inactive', 'Inactivo', '#6c757d', 'fa-user-slash', 20),
('CUSTOMER', 'BLOCKED', 'Blocked', 'Bloqueado', '#dc3545', 'fa-user-lock', 30),
('CUSTOMER', 'DEFAULTED', 'Defaulted', 'En Mora', '#fd7e14', 'fa-exclamation-triangle', 40);

-- Estados para pagos
INSERT INTO `system_statuses` (`status_group`, `status_code`, `status_name`, `status_display_es`, `status_color`, `status_icon`, `sort_order`) VALUES
('PAYMENT', 'PENDING', 'Pending', 'Pendiente', '#ffc107', 'fa-clock', 10),
('PAYMENT', 'CONFIRMED', 'Confirmed', 'Confirmado', '#28a745', 'fa-check', 20),
('PAYMENT', 'CLEARED', 'Cleared', 'Liquidado', '#17a2b8', 'fa-check-double', 30),
('PAYMENT', 'CANCELLED', 'Cancelled', 'Cancelado', '#dc3545', 'fa-times', 40);

-- Estados para sesiones de caja
INSERT INTO `system_statuses` (`status_group`, `status_code`, `status_name`, `status_display_es`, `status_color`, `status_icon`, `sort_order`) VALUES
('CASH_SESSION', 'OPEN', 'Open', 'Abierta', '#28a745', 'fa-cash-register', 10),
('CASH_SESSION', 'PENDING_CLOSE', 'Pending Close', 'Pendiente de Cierre', '#ffc107', 'fa-clock', 20),
('CASH_SESSION', 'CLOSED', 'Closed', 'Cerrada', '#17a2b8', 'fa-lock', 30),
('CASH_SESSION', 'CANCELLED', 'Cancelled', 'Cancelada', '#dc3545', 'fa-times', 40);

-- Estados para cuentas por cobrar
INSERT INTO `system_statuses` (`status_group`, `status_code`, `status_name`, `status_display_es`, `status_color`, `status_icon`, `sort_order`) VALUES
('RECEIVABLE', 'PENDING', 'Pending', 'Pendiente', '#ffc107', 'fa-clock', 10),
('RECEIVABLE', 'PARTIAL', 'Partial', 'Parcial', '#fd7e14', 'fa-coins', 20),
('RECEIVABLE', 'PAID', 'Paid', 'Pagada', '#28a745', 'fa-check', 30),
('RECEIVABLE', 'OVERDUE', 'Overdue', 'Vencida', '#dc3545', 'fa-exclamation-triangle', 40),
('RECEIVABLE', 'WRITTEN_OFF', 'Written Off', 'Castigada', '#6c757d', 'fa-times-circle', 50);

-- Estados para devoluciones
INSERT INTO `system_statuses` (`status_group`, `status_code`, `status_name`, `status_display_es`, `status_color`, `status_icon`, `sort_order`) VALUES
('RETURN', 'DRAFT', 'Draft', 'Borrador', '#6c757d', 'fa-edit', 10),
('RETURN', 'PENDING_APPROVAL', 'Pending Approval', 'Pendiente de Aprobación', '#ffc107', 'fa-clock', 20),
('RETURN', 'APPROVED', 'Approved', 'Aprobada', '#28a745', 'fa-check', 30),
('RETURN', 'PROCESSED', 'Processed', 'Procesada', '#17a2b8', 'fa-check-double', 40),
('RETURN', 'CANCELLED', 'Cancelled', 'Cancelada', '#dc3545', 'fa-times', 50);

-- Estados para alertas de stock
INSERT INTO `system_statuses` (`status_group`, `status_code`, `status_name`, `status_display_es`, `status_color`, `status_icon`, `sort_order`) VALUES
('STOCK_ALERT', 'NEW', 'New', 'Nueva', '#dc3545', 'fa-bell', 10),
('STOCK_ALERT', 'ACKNOWLEDGED', 'Acknowledged', 'Reconocida', '#ffc107', 'fa-eye', 20),
('STOCK_ALERT', 'IN_PROGRESS', 'In Progress', 'En Proceso', '#17a2b8', 'fa-cog', 30),
('STOCK_ALERT', 'RESOLVED', 'Resolved', 'Resuelta', '#28a745', 'fa-check', 40),
('STOCK_ALERT', 'DISMISSED', 'Dismissed', 'Descartada', '#6c757d', 'fa-times', 50);

-- Estados para gastos de caja chica
INSERT INTO `system_statuses` (`status_group`, `status_code`, `status_name`, `status_display_es`, `status_color`, `status_icon`, `sort_order`) VALUES
('EXPENSE', 'PENDING', 'Pending', 'Pendiente', '#ffc107', 'fa-clock', 10),
('EXPENSE', 'APPROVED', 'Approved', 'Aprobado', '#28a745', 'fa-check', 20),
('EXPENSE', 'REJECTED', 'Rejected', 'Rechazado', '#dc3545', 'fa-times', 30);

-- Estados para cheques
INSERT INTO `system_statuses` (`status_group`, `status_code`, `status_name`, `status_display_es`, `status_color`, `status_icon`, `sort_order`) VALUES
('CHECK', 'PENDING', 'Pending', 'Pendiente', '#ffc107', 'fa-clock', 10),
('CHECK', 'DEPOSITED', 'Deposited', 'Depositado', '#17a2b8', 'fa-university', 20),
('CHECK', 'CLEARED', 'Cleared', 'Liberado', '#28a745', 'fa-check', 30),
('CHECK', 'BOUNCED', 'Bounced', 'Rebotado', '#dc3545', 'fa-exclamation-circle', 40);

-- Estados para DTE
INSERT INTO `system_statuses` (`status_group`, `status_code`, `status_name`, `status_display_es`, `status_color`, `status_icon`, `sort_order`) VALUES
('DTE', 'DRAFT', 'Draft', 'Borrador', '#6c757d', 'fa-edit', 10),
('DTE', 'SENT', 'Sent', 'Enviado', '#17a2b8', 'fa-paper-plane', 20),
('DTE', 'ACCEPTED', 'Accepted', 'Aceptado', '#28a745', 'fa-check', 30),
('DTE', 'REJECTED', 'Rejected', 'Rechazado', '#dc3545', 'fa-times', 40),
('DTE', 'CANCELLED', 'Cancelled', 'Cancelado', '#6c757d', 'fa-ban', 50);

-- ===============================================
-- PASO 3: MIGRAR TABLAS ACTUALES
-- ===============================================

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