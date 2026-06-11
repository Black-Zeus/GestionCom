USE inventario;

/*M!999999\- enable the sandbox mode */
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */
;

/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */
;

/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */
;

/*!40101 SET NAMES utf8mb4 */
;

/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */
;

/*!40103 SET TIME_ZONE='+00:00' */
;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */
;

/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */
;

/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */
;

/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */
;

DROP TABLE IF EXISTS `accounts_payable`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `accounts_payable` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `document_id` bigint(20) unsigned NOT NULL,
  `supplier_id` bigint(20) unsigned NOT NULL,
  `purchase_order_id` bigint(20) unsigned DEFAULT NULL,
  `original_amount` decimal(15, 2) NOT NULL,
  `current_balance` decimal(15, 2) NOT NULL,
  `paid_amount` decimal(15, 2) DEFAULT 0.00,
  `invoice_date` date NOT NULL,
  `due_date` date NOT NULL,
  `first_overdue_date` date DEFAULT NULL,
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_document_payable` (`document_id`),
  KEY `purchase_order_id` (`purchase_order_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_due_date` (`due_date`),
  KEY `idx_status_id` (`status_id`),
  KEY `idx_current_balance` (`current_balance`),
  CONSTRAINT `accounts_payable_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`),
  CONSTRAINT `accounts_payable_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `accounts_payable_ibfk_3` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `accounts_payable_ibfk_4` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `accounts_receivable`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `accounts_receivable` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `document_id` bigint(20) unsigned NOT NULL COMMENT 'Factura o documento origen',
  `customer_id` bigint(20) unsigned NOT NULL,
  `original_amount` decimal(15, 2) NOT NULL COMMENT 'Monto original de la factura',
  `current_balance` decimal(15, 2) NOT NULL COMMENT 'Saldo pendiente actual',
  `paid_amount` decimal(15, 2) DEFAULT 0.00 COMMENT 'Monto pagado a la fecha',
  `penalty_amount` decimal(15, 2) DEFAULT 0.00 COMMENT 'Multas acumuladas',
  `invoice_date` date NOT NULL,
  `due_date` date NOT NULL,
  `first_overdue_date` date DEFAULT NULL COMMENT 'Primera fecha de mora',
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `days_overdue` int(11) DEFAULT 0 COMMENT 'Días de mora',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_document_receivable` (`document_id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_due_date` (`due_date`),
  KEY `idx_days_overdue` (`days_overdue`),
  KEY `idx_invoice_date` (`invoice_date`),
  KEY `idx_current_balance` (`current_balance`),
  KEY `idx_status_id` (`status_id`),
  CONSTRAINT `accounts_receivable_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`),
  CONSTRAINT `accounts_receivable_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_accounts_receivable_status` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `attributes`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `attributes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `attribute_group_id` bigint(20) unsigned NOT NULL,
  `attribute_code` varchar(50) NOT NULL,
  `attribute_name` varchar(100) NOT NULL,
  `attribute_type` enum('TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTISELECT') DEFAULT 'TEXT',
  `is_required` tinyint(1) DEFAULT 0,
  `affects_sku` tinyint(1) DEFAULT 0 COMMENT 'Si afecta la generación de variantes',
  `sort_order` int(10) unsigned DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attribute_code` (`attribute_code`),
  KEY `idx_attribute_code` (`attribute_code`),
  KEY `idx_attribute_group_id` (`attribute_group_id`),
  KEY `idx_affects_sku` (`affects_sku`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `attributes_ibfk_1` FOREIGN KEY (`attribute_group_id`) REFERENCES `attribute_groups` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 3 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `attribute_groups`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `attribute_groups` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `group_code` varchar(50) NOT NULL,
  `group_name` varchar(100) NOT NULL,
  `group_description` text DEFAULT NULL,
  `sort_order` int(10) unsigned DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `group_code` (`group_code`),
  KEY `idx_group_code` (`group_code`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `attribute_values`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `attribute_values` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `attribute_id` bigint(20) unsigned NOT NULL,
  `value_code` varchar(50) NOT NULL,
  `value_name` varchar(100) NOT NULL,
  `sort_order` int(10) unsigned DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_attribute_value` (`attribute_id`, `value_code`),
  KEY `idx_attribute_id` (`attribute_id`),
  KEY `idx_value_code` (`value_code`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `attribute_values_ibfk_1` FOREIGN KEY (`attribute_id`) REFERENCES `attributes` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 93 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `audit_log`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `audit_log` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `table_name` varchar(100) NOT NULL,
  `record_id` bigint(20) unsigned NOT NULL,
  `action_type` enum('INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE') NOT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Valores anteriores en formato JSON' CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Nuevos valores en formato JSON' CHECK (json_valid(`new_values`)),
  `changed_fields` text DEFAULT NULL COMMENT 'Lista de campos modificados',
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_table_name` (`table_name`),
  KEY `idx_record_id` (`record_id`),
  KEY `idx_action_type` (`action_type`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_table_record` (`table_name`, `record_id`),
  CONSTRAINT `audit_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `banks`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `banks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `bank_code` varchar(30) NOT NULL,
  `bank_name` varchar(150) NOT NULL,
  `country` varchar(100) DEFAULT 'Chile',
  `swift_code` varchar(20) DEFAULT NULL,
  `routing_code` varchar(30) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bank_code` (`bank_code`),
  KEY `idx_bank_code` (`bank_code`),
  KEY `idx_bank_name` (`bank_name`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE = InnoDB AUTO_INCREMENT = 3 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `bank_accounts`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `bank_accounts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `bank_id` bigint(20) unsigned NOT NULL,
  `account_code` varchar(50) NOT NULL,
  `account_number` varchar(80) NOT NULL,
  `account_name` varchar(150) NOT NULL,
  `account_type` enum(
    'CHECKING',
    'SAVINGS',
    'CREDIT_LINE',
    'CASH',
    'OTHER'
  ) DEFAULT 'CHECKING',
  `currency_code` char(3) DEFAULT 'CLP',
  `opening_balance` decimal(15, 2) DEFAULT 0.00,
  `current_balance` decimal(15, 2) DEFAULT 0.00,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_code` (`account_code`),
  KEY `idx_bank_id` (`bank_id`),
  KEY `idx_account_number` (`account_number`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `fk_bank_accounts_currency` (`currency_code`),
  CONSTRAINT `bank_accounts_ibfk_1` FOREIGN KEY (`bank_id`) REFERENCES `banks` (`id`),
  CONSTRAINT `fk_bank_accounts_currency` FOREIGN KEY (`currency_code`) REFERENCES `currencies` (`currency_code`)
) ENGINE = InnoDB AUTO_INCREMENT = 3 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `bank_reconciliations`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `bank_reconciliations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `reconciliation_code` varchar(50) NOT NULL,
  `bank_account_id` bigint(20) unsigned NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `statement_balance` decimal(15, 2) NOT NULL,
  `system_balance` decimal(15, 2) NOT NULL,
  `difference_amount` decimal(15, 2) GENERATED ALWAYS AS (`statement_balance` - `system_balance`) VIRTUAL,
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `reconciled_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `reconciled_at` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `reconciliation_code` (`reconciliation_code`),
  KEY `reconciled_by_user_id` (`reconciled_by_user_id`),
  KEY `idx_bank_account_id` (`bank_account_id`),
  KEY `idx_period` (`period_start`, `period_end`),
  KEY `idx_status_id` (`status_id`),
  CONSTRAINT `bank_reconciliations_ibfk_1` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`),
  CONSTRAINT `bank_reconciliations_ibfk_2` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `bank_reconciliations_ibfk_3` FOREIGN KEY (`reconciled_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `bank_reconciliation_items`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `bank_reconciliation_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `bank_reconciliation_id` bigint(20) unsigned NOT NULL,
  `bank_transaction_id` bigint(20) unsigned NOT NULL,
  `matched_source_table` varchar(100) DEFAULT NULL,
  `matched_source_id` bigint(20) unsigned DEFAULT NULL,
  `matched_amount` decimal(15, 2) NOT NULL,
  `match_type` enum('EXACT', 'PARTIAL', 'MANUAL', 'ADJUSTMENT') DEFAULT 'MANUAL',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reconciliation_transaction` (`bank_reconciliation_id`, `bank_transaction_id`),
  KEY `idx_bank_transaction_id` (`bank_transaction_id`),
  CONSTRAINT `bank_reconciliation_items_ibfk_1` FOREIGN KEY (`bank_reconciliation_id`) REFERENCES `bank_reconciliations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bank_reconciliation_items_ibfk_2` FOREIGN KEY (`bank_transaction_id`) REFERENCES `bank_transactions` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `bank_reconciliation_settings`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `bank_reconciliation_settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `setting_code` varchar(50) NOT NULL,
  `bank_account_id` bigint(20) unsigned DEFAULT NULL,
  `match_reference_enabled` tinyint(1) DEFAULT 1,
  `match_amount_enabled` tinyint(1) DEFAULT 1,
  `match_date_tolerance_days` int(10) unsigned DEFAULT 3,
  `amount_tolerance` decimal(15, 2) DEFAULT 0.00,
  `auto_match_enabled` tinyint(1) DEFAULT 0,
  `require_review_over_amount` decimal(15, 2) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_code` (`setting_code`),
  KEY `idx_bank_reconciliation_setting_code` (`setting_code`),
  KEY `idx_bank_account_id` (`bank_account_id`),
  KEY `idx_bank_reconciliation_setting_active` (`is_active`),
  KEY `idx_bank_reconciliation_setting_deleted_at` (`deleted_at`),
  CONSTRAINT `bank_reconciliation_settings_ibfk_1` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `bank_transactions`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `bank_transactions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `bank_account_id` bigint(20) unsigned NOT NULL,
  `transaction_code` varchar(80) NOT NULL,
  `transaction_date` date NOT NULL,
  `value_date` date DEFAULT NULL,
  `transaction_type` enum(
    'DEPOSIT',
    'WITHDRAWAL',
    'TRANSFER_IN',
    'TRANSFER_OUT',
    'FEE',
    'INTEREST',
    'ADJUSTMENT'
  ) NOT NULL,
  `amount` decimal(15, 2) NOT NULL,
  `description` text DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `source_table` varchar(100) DEFAULT NULL,
  `source_id` bigint(20) unsigned DEFAULT NULL,
  `is_reconciled` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_code` (`transaction_code`),
  KEY `idx_bank_account_id` (`bank_account_id`),
  KEY `idx_transaction_date` (`transaction_date`),
  KEY `idx_reference_number` (`reference_number`),
  KEY `idx_is_reconciled` (`is_reconciled`),
  CONSTRAINT `bank_transactions_ibfk_1` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `cash_movements`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `cash_movements` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `cash_register_session_id` bigint(20) unsigned NOT NULL,
  `movement_type` enum(
    'OPENING',
    'SALE',
    'RETURN',
    'PETTY_CASH',
    'ADJUSTMENT',
    'CLOSING'
  ) NOT NULL,
  `document_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Documento que genera el movimiento',
  `payment_method_id` bigint(20) unsigned NOT NULL,
  `amount` decimal(15, 2) NOT NULL COMMENT 'Monto del movimiento (+ entrada, - salida)',
  `change_amount` decimal(15, 2) DEFAULT 0.00 COMMENT 'Vuelto entregado',
  `received_amount` decimal(15, 2) DEFAULT NULL COMMENT 'Monto recibido del cliente',
  `reference_number` varchar(100) DEFAULT NULL COMMENT 'Número de referencia externo',
  `description` text DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_session_id` (`cash_register_session_id`),
  KEY `idx_movement_type` (`movement_type`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_payment_method_id` (`payment_method_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_created_by_user_id` (`created_by_user_id`),
  CONSTRAINT `cash_movements_ibfk_1` FOREIGN KEY (`cash_register_session_id`) REFERENCES `cash_register_sessions` (`id`),
  CONSTRAINT `cash_movements_ibfk_2` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `cash_movements_ibfk_3` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`),
    CONSTRAINT `cash_movements_ibfk_4` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `cash_registers`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `cash_registers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `register_code` varchar(20) NOT NULL COMMENT 'Código único de la caja (CAJA01, TERM01)',
  `register_name` varchar(100) NOT NULL COMMENT 'Nombre descriptivo de la caja',
  `warehouse_id` bigint(20) unsigned NOT NULL COMMENT 'Bodega/punto de venta donde está la caja',
  `terminal_identifier` varchar(100) DEFAULT NULL COMMENT 'ID del terminal/computador',
  `ip_address` varchar(45) DEFAULT NULL COMMENT 'IP del terminal para control',
  `location_description` varchar(255) DEFAULT NULL COMMENT 'Ubicación física de la caja',
  `is_active` tinyint(1) DEFAULT 1,
  `requires_supervisor_approval` tinyint(1) DEFAULT 1 COMMENT 'Requiere supervisor para diferencias',
  `max_difference_amount` decimal(15, 2) DEFAULT 1000.00 COMMENT 'Diferencia máxima sin supervisión',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `register_code` (`register_code`),
  KEY `idx_register_code` (`register_code`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_terminal_identifier` (`terminal_identifier`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `cash_registers_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `cash_register_sessions`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `cash_register_sessions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `session_code` varchar(50) NOT NULL COMMENT 'Código único de sesión',
  `cash_register_id` bigint(20) unsigned NOT NULL,
  `cashier_user_id` bigint(20) unsigned NOT NULL COMMENT 'Usuario cajero',
  `supervisor_user_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Supervisor que autoriza',
  `opening_amount` decimal(15, 2) NOT NULL COMMENT 'Monto inicial para vueltos',
  `opening_datetime` timestamp NOT NULL DEFAULT current_timestamp(),
  `opening_notes` text DEFAULT NULL,
  `closing_datetime` timestamp NULL DEFAULT NULL,
  `theoretical_amount` decimal(15, 2) DEFAULT NULL COMMENT 'Monto teórico según sistema',
  `physical_amount` decimal(15, 2) DEFAULT NULL COMMENT 'Monto físico contado',
  `difference_amount` decimal(15, 2) DEFAULT NULL COMMENT 'Diferencia (físico - teórico)',
  `closing_notes` text DEFAULT NULL,
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `requires_supervisor_approval` tinyint(1) DEFAULT 0,
  `is_approved` tinyint(1) DEFAULT 0,
  `approved_datetime` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_code` (`session_code`),
  KEY `supervisor_user_id` (`supervisor_user_id`),
  KEY `idx_session_code` (`session_code`),
  KEY `idx_cash_register_id` (`cash_register_id`),
  KEY `idx_cashier_user_id` (`cashier_user_id`),
  KEY `idx_opening_datetime` (`opening_datetime`),
  KEY `idx_closing_datetime` (`closing_datetime`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `idx_status_id` (`status_id`),
  CONSTRAINT `cash_register_sessions_ibfk_1` FOREIGN KEY (`cash_register_id`) REFERENCES `cash_registers` (`id`),
  CONSTRAINT `cash_register_sessions_ibfk_2` FOREIGN KEY (`cashier_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `cash_register_sessions_ibfk_3` FOREIGN KEY (`supervisor_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_cash_sessions_status` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `cash_register_user_assignments`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `cash_register_user_assignments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `cash_register_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `operator_role` varchar(30) NOT NULL DEFAULT 'CASHIER',
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `valid_from` date DEFAULT NULL,
  `valid_until` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cash_register_user_assignment` (`cash_register_id`, `user_id`),
  KEY `idx_crua_cash_register_id` (`cash_register_id`),
  KEY `idx_crua_user_id` (`user_id`),
  KEY `idx_crua_operator_role` (`operator_role`),
  KEY `idx_crua_is_active` (`is_active`),
  KEY `idx_crua_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_crua_cash_register` FOREIGN KEY (`cash_register_id`) REFERENCES `cash_registers` (`id`),
  CONSTRAINT `fk_crua_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `categories`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `categories` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` bigint(20) unsigned DEFAULT NULL,
  `category_code` varchar(50) NOT NULL,
  `category_name` varchar(150) NOT NULL,
  `category_description` text DEFAULT NULL,
  `category_level` tinyint(3) unsigned DEFAULT 1 COMMENT 'Nivel jerárquico',
  `category_path` varchar(1000) DEFAULT NULL COMMENT 'Ruta completa separada por /',
  `sort_order` int(10) unsigned DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_code` (`category_code`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_category_code` (`category_code`),
  KEY `idx_category_level` (`category_level`),
  KEY `idx_category_path` (`category_path`(255)),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB AUTO_INCREMENT = 11 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `check_register`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `check_register` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `check_code` varchar(50) NOT NULL,
  `check_direction` enum('RECEIVED', 'ISSUED') NOT NULL,
  `check_number` varchar(50) NOT NULL,
  `bank_id` bigint(20) unsigned DEFAULT NULL,
  `bank_account_id` bigint(20) unsigned DEFAULT NULL,
  `customer_payment_id` bigint(20) unsigned DEFAULT NULL,
  `supplier_payment_id` bigint(20) unsigned DEFAULT NULL,
  `document_payment_detail_id` bigint(20) unsigned DEFAULT NULL,
  `holder_name` varchar(255) DEFAULT NULL,
  `holder_tax_id` varchar(20) DEFAULT NULL,
  `issue_date` date DEFAULT NULL,
  `due_date` date NOT NULL,
  `deposit_date` date DEFAULT NULL,
  `cleared_date` date DEFAULT NULL,
  `amount` decimal(15, 2) NOT NULL,
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `check_code` (`check_code`),
  KEY `bank_id` (`bank_id`),
  KEY `bank_account_id` (`bank_account_id`),
  KEY `customer_payment_id` (`customer_payment_id`),
  KEY `supplier_payment_id` (`supplier_payment_id`),
  KEY `document_payment_detail_id` (`document_payment_detail_id`),
  KEY `created_by_user_id` (`created_by_user_id`),
  KEY `idx_check_number` (`check_number`),
  KEY `idx_check_direction` (`check_direction`),
  KEY `idx_due_date` (`due_date`),
  KEY `idx_status_id` (`status_id`),
  CONSTRAINT `check_register_ibfk_1` FOREIGN KEY (`bank_id`) REFERENCES `banks` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `check_register_ibfk_2` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `check_register_ibfk_3` FOREIGN KEY (`customer_payment_id`) REFERENCES `customer_payments` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `check_register_ibfk_4` FOREIGN KEY (`supplier_payment_id`) REFERENCES `supplier_payments` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `check_register_ibfk_5` FOREIGN KEY (`document_payment_detail_id`) REFERENCES `document_payment_details` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `check_register_ibfk_6` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `check_register_ibfk_7` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `credit_limit_exceptions`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `credit_limit_exceptions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint(20) unsigned NOT NULL,
  `document_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Documento que excedió el límite',
  `original_limit` decimal(15, 2) NOT NULL,
  `exception_amount` decimal(15, 2) NOT NULL,
  `new_effective_limit` decimal(15, 2) NOT NULL,
  `reason` text NOT NULL,
  `is_temporary` tinyint(1) DEFAULT 1,
  `expires_at` date DEFAULT NULL COMMENT 'Fecha de expiración de la excepción',
  `authorized_by_user_id` bigint(20) unsigned NOT NULL COMMENT 'Supervisor que autoriza',
  `authorization_level` enum('SUPERVISOR', 'MANAGER', 'ADMIN') NOT NULL,
  `exception_status` enum('ACTIVE', 'EXPIRED', 'REVOKED') DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_authorized_by_user_id` (`authorized_by_user_id`),
  KEY `idx_exception_status` (`exception_status`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_authorization_level` (`authorization_level`),
  CONSTRAINT `credit_limit_exceptions_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `credit_limit_exceptions_ibfk_2` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `credit_limit_exceptions_ibfk_3` FOREIGN KEY (`authorized_by_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `currencies`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `currencies` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `currency_code` char(3) NOT NULL,
  `currency_name` varchar(100) NOT NULL,
  `currency_symbol` varchar(12) NOT NULL,
  `decimal_places` tinyint(3) unsigned NOT NULL DEFAULT 2,
  `is_base_currency` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `currency_code` (`currency_code`),
  KEY `idx_currency_code` (`currency_code`),
  KEY `idx_is_base_currency` (`is_base_currency`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE = InnoDB AUTO_INCREMENT = 19 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `currency_exchange_rates`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `currency_exchange_rates` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `currency_code` char(3) NOT NULL,
  `rate_date` date NOT NULL,
  `rate_to_clp` decimal(15, 6) NOT NULL,
  `source_name` varchar(100) DEFAULT NULL,
  `source_reference` varchar(255) DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_currency_rate_date` (`currency_code`, `rate_date`),
  KEY `created_by_user_id` (`created_by_user_id`),
  KEY `idx_rate_date` (`rate_date`),
  CONSTRAINT `currency_exchange_rates_ibfk_1` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `fk_currency_exchange_rates_currency` FOREIGN KEY (`currency_code`) REFERENCES `currencies` (`currency_code`)
) ENGINE = InnoDB AUTO_INCREMENT = 3 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `customers`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `customers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_code` varchar(50) NOT NULL COMMENT 'Código único del cliente',
  `customer_type` enum('COMPANY', 'INDIVIDUAL') NOT NULL COMMENT 'Tipo de cliente',
  `tax_id` varchar(20) NOT NULL COMMENT 'RUT/DNI del cliente',
  `legal_name` varchar(255) NOT NULL COMMENT 'Razón social o nombre completo',
  `commercial_name` varchar(255) DEFAULT NULL COMMENT 'Nombre comercial o fantasía',
  `business_activity` varchar(255) DEFAULT NULL,
  `logo_media_asset_id` bigint(20) unsigned DEFAULT NULL,
  `banner_media_asset_id` bigint(20) unsigned DEFAULT NULL,
  `contact_person` varchar(255) DEFAULT NULL COMMENT 'Persona de contacto principal',
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `region` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT 'Chile',
  `postal_code` varchar(20) DEFAULT NULL,
  `price_list_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Lista de precios asignada',
  `default_currency_code` char(3) NOT NULL DEFAULT 'CLP',
  `sales_rep_user_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Vendedor asignado',
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `is_credit_customer` tinyint(1) DEFAULT 0 COMMENT 'Si maneja cuenta corriente',
  `registration_date` date NOT NULL DEFAULT curdate(),
  `notes` text DEFAULT NULL,
  `internal_notes` text DEFAULT NULL COMMENT 'Notas internas no visibles al cliente',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_code` (`customer_code`),
  UNIQUE KEY `tax_id` (`tax_id`),
  KEY `price_list_id` (`price_list_id`),
  KEY `created_by_user_id` (`created_by_user_id`),
  KEY `idx_customer_code` (`customer_code`),
  KEY `idx_tax_id` (`tax_id`),
  KEY `idx_customer_type` (`customer_type`),
  KEY `idx_is_credit_customer` (`is_credit_customer`),
  KEY `idx_sales_rep_user_id` (`sales_rep_user_id`),
  KEY `idx_registration_date` (`registration_date`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `idx_status_id` (`status_id`),
  KEY `idx_customers_logo_media_asset_id` (`logo_media_asset_id`),
  KEY `idx_customers_banner_media_asset_id` (`banner_media_asset_id`),
  KEY `idx_customers_default_currency_code` (`default_currency_code`),
  CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`price_list_id`) REFERENCES `price_lists` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `customers_ibfk_2` FOREIGN KEY (`sales_rep_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `customers_ibfk_3` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `fk_customers_default_currency` FOREIGN KEY (`default_currency_code`) REFERENCES `currencies` (`currency_code`),
    CONSTRAINT `fk_customers_status` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 3 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `customer_authorized_users`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `customer_authorized_users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint(20) unsigned NOT NULL,
  `authorized_name` varchar(255) NOT NULL COMMENT 'Nombre del comprador autorizado',
  `authorized_tax_id` varchar(20) DEFAULT NULL COMMENT 'RUT del comprador',
  `position` varchar(100) DEFAULT NULL COMMENT 'Cargo en la empresa',
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `is_primary_contact` tinyint(1) DEFAULT 0 COMMENT 'Contacto principal',
  `authorization_level` enum('BASIC', 'ADVANCED', 'FULL') DEFAULT 'BASIC' COMMENT 'Nivel de autorización',
  `max_purchase_amount` decimal(15, 2) DEFAULT NULL COMMENT 'Monto máximo de compra individual',
  `max_purchase_currency_code` varchar(3) NOT NULL DEFAULT 'CLP',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_customer_tax_id` (`customer_id`, `authorized_tax_id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_authorized_tax_id` (`authorized_tax_id`),
  KEY `idx_is_primary_contact` (`is_primary_contact`),
  KEY `idx_authorization_level` (`authorization_level`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_customer_authorized_users_currency` (`max_purchase_currency_code`),
  CONSTRAINT `customer_authorized_users_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `customer_credit_config`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `customer_credit_config` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint(20) unsigned NOT NULL,
  `credit_limit` decimal(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Límite máximo de crédito',
  `available_credit` decimal(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Crédito disponible actual',
  `used_credit` decimal(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Crédito utilizado',
  `payment_terms_days` int(10) unsigned DEFAULT 30 COMMENT 'Días de plazo para pago',
  `grace_period_days` int(10) unsigned DEFAULT 5 COMMENT 'Días de gracia antes de multa',
  `minimum_payment_percentage` decimal(5, 2) DEFAULT 30.00 COMMENT 'Porcentaje mínimo para pago en cuotas',
  `penalty_rate` decimal(5, 2) DEFAULT 2.00 COMMENT 'Porcentaje de multa por mora',
  `max_overdue_amount` decimal(15, 2) DEFAULT NULL COMMENT 'Monto máximo permitido en mora',
  `allows_cash` tinyint(1) DEFAULT 1,
  `allows_check` tinyint(1) DEFAULT 1,
  `allows_postdated_check` tinyint(1) DEFAULT 0 COMMENT 'Permite cheques a fecha',
  `allows_transfer` tinyint(1) DEFAULT 1,
  `allows_installments` tinyint(1) DEFAULT 0 COMMENT 'Permite pago en cuotas',
  `risk_level` enum('LOW', 'MEDIUM', 'HIGH') DEFAULT 'MEDIUM',
  `requires_guarantor` tinyint(1) DEFAULT 0,
  `auto_block_on_overdue` tinyint(1) DEFAULT 1 COMMENT 'Bloqueo automático por mora',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by_user_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_customer_credit` (`customer_id`),
  KEY `updated_by_user_id` (`updated_by_user_id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_credit_limit` (`credit_limit`),
  KEY `idx_available_credit` (`available_credit`),
  KEY `idx_risk_level` (`risk_level`),
  KEY `idx_auto_block_on_overdue` (`auto_block_on_overdue`),
  KEY `idx_customer_credit_config_active` (`is_active`),
  CONSTRAINT `customer_credit_config_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_credit_config_ibfk_2` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `customer_payments`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `customer_payments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `payment_code` varchar(50) NOT NULL,
  `customer_id` bigint(20) unsigned NOT NULL,
  `payment_method_id` bigint(20) unsigned NOT NULL,
  `payment_amount` decimal(15, 2) NOT NULL,
  `allocated_amount` decimal(15, 2) DEFAULT 0.00 COMMENT 'Monto ya aplicado a facturas',
  `unallocated_amount` decimal(15, 2) GENERATED ALWAYS AS (`payment_amount` - `allocated_amount`) VIRTUAL,
  `payment_date` date NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL COMMENT 'Número de cheque, transferencia, etc.',
  `bank_name` varchar(100) DEFAULT NULL,
  `account_number` varchar(50) DEFAULT NULL,
  `check_date` date DEFAULT NULL COMMENT 'Fecha del cheque si es posfechado',
  `check_status` enum('PENDING', 'DEPOSITED', 'CLEARED', 'BOUNCED') DEFAULT NULL,
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `is_prepayment` tinyint(1) DEFAULT 0 COMMENT 'Si es un prepago',
  `notes` text DEFAULT NULL,
  `processed_by_user_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_code` (`payment_code`),
  KEY `idx_payment_code` (`payment_code`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_payment_method_id` (`payment_method_id`),
  KEY `idx_payment_date` (`payment_date`),
  KEY `idx_check_date` (`check_date`),
  KEY `idx_check_status` (`check_status`),
  KEY `idx_is_prepayment` (`is_prepayment`),
  KEY `idx_processed_by_user_id` (`processed_by_user_id`),
  KEY `idx_status_id` (`status_id`),
  CONSTRAINT `customer_payments_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `customer_payments_ibfk_2` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`),
  CONSTRAINT `customer_payments_ibfk_3` FOREIGN KEY (`processed_by_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_customer_payments_status` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `customer_penalties`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `customer_penalties` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `accounts_receivable_id` bigint(20) unsigned NOT NULL,
  `customer_id` bigint(20) unsigned NOT NULL,
  `penalty_amount` decimal(15, 2) NOT NULL,
  `penalty_rate` decimal(5, 2) NOT NULL COMMENT 'Porcentaje aplicado',
  `days_overdue` int(11) NOT NULL,
  `calculation_base` decimal(15, 2) NOT NULL COMMENT 'Monto base para el cálculo',
  `penalty_description` text NOT NULL,
  `period_from` date NOT NULL,
  `period_to` date NOT NULL,
  `is_applied` tinyint(1) DEFAULT 0 COMMENT 'Si ya se aplicó a la cuenta',
  `is_waived` tinyint(1) DEFAULT 0 COMMENT 'Si fue condonada',
  `waived_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `waived_reason` text DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `waived_by_user_id` (`waived_by_user_id`),
  KEY `idx_accounts_receivable_id` (`accounts_receivable_id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_penalty_amount` (`penalty_amount`),
  KEY `idx_days_overdue` (`days_overdue`),
  KEY `idx_is_applied` (`is_applied`),
  KEY `idx_is_waived` (`is_waived`),
  KEY `idx_created_by_user_id` (`created_by_user_id`),
  CONSTRAINT `customer_penalties_ibfk_1` FOREIGN KEY (`accounts_receivable_id`) REFERENCES `accounts_receivable` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_penalties_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `customer_penalties_ibfk_3` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `customer_penalties_ibfk_4` FOREIGN KEY (`waived_by_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `documents`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `documents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `document_type_id` bigint(20) unsigned NOT NULL,
  `document_series_id` bigint(20) unsigned NOT NULL,
  `document_number` varchar(50) NOT NULL,
  `document_date` date NOT NULL,
  `source_warehouse_id` bigint(20) unsigned DEFAULT NULL,
  `target_warehouse_id` bigint(20) unsigned DEFAULT NULL,
  `customer_supplier_name` varchar(255) DEFAULT NULL,
  `customer_supplier_document` varchar(50) DEFAULT NULL,
  `supplier_id` bigint(20) unsigned DEFAULT NULL,
  `reference_external` varchar(100) DEFAULT NULL COMMENT 'Número de factura externa, orden, etc.',
  `subtotal` decimal(15, 4) DEFAULT 0.0000,
  `tax_amount` decimal(15, 4) DEFAULT 0.0000,
  `discount_amount` decimal(15, 4) DEFAULT 0.0000,
  `total_amount` decimal(15, 4) DEFAULT 0.0000,
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `cancellation_reason` text DEFAULT NULL,
  `cancelled_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned NOT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  `dte_type_code` varchar(10) DEFAULT NULL COMMENT 'Código DTE según SII (33, 39, 52, etc.)',
  `dte_folio` bigint(20) unsigned DEFAULT NULL COMMENT 'Folio DTE asignado por SII',
  `dte_uuid` varchar(100) DEFAULT NULL COMMENT 'UUID del DTE',
  `dte_xml_path` varchar(500) DEFAULT NULL COMMENT 'Ruta del XML DTE',
  `dte_pdf_path` varchar(500) DEFAULT NULL COMMENT 'Ruta del PDF DTE',
  `dte_status` enum('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED') DEFAULT NULL COMMENT 'Estado en SII',
  `dte_response_xml` text DEFAULT NULL COMMENT 'Respuesta XML del SII',
  `dte_sent_date` timestamp NULL DEFAULT NULL COMMENT 'Fecha envío a SII',
  `dte_accepted_date` timestamp NULL DEFAULT NULL COMMENT 'Fecha aceptación SII',
  `rut_emisor` varchar(12) DEFAULT NULL COMMENT 'RUT del emisor',
  `rut_receptor` varchar(12) DEFAULT NULL COMMENT 'RUT del receptor',
  `ambiente_dte` enum('CERTIFICACION', 'PRODUCCION') DEFAULT 'CERTIFICACION' COMMENT 'Ambiente SII',
  `cash_register_session_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Sesión de caja donde se procesó',
  `payment_method_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Método de pago principal',
  `total_received` decimal(15, 2) DEFAULT NULL COMMENT 'Monto total recibido',
  `total_change` decimal(15, 2) DEFAULT NULL COMMENT 'Vuelto entregado',
  `customer_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Cliente asociado al documento',
  `authorized_buyer_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Comprador autorizado que realizó la compra',
  `credit_sale` tinyint(1) DEFAULT 0 COMMENT 'Si es venta a crédito',
  `credit_terms_days` int(10) unsigned DEFAULT NULL COMMENT 'Días de crédito para este documento',
  `is_return` tinyint(1) DEFAULT 0 COMMENT 'Si es documento de devolución',
  `original_document_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Documento original (para devoluciones)',
  `return_type` enum('REFUND', 'EXCHANGE', 'CREDIT_NOTE') DEFAULT NULL COMMENT 'Tipo de devolución',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_document_number` (
    `document_type_id`,
    `document_series_id`,
    `document_number`
  ),
  KEY `document_series_id` (`document_series_id`),
  KEY `approved_by_user_id` (`approved_by_user_id`),
  KEY `idx_document_type_id` (`document_type_id`),
  KEY `idx_document_number` (`document_number`),
  KEY `idx_document_date` (`document_date`),
  KEY `idx_source_warehouse_id` (`source_warehouse_id`),
  KEY `idx_target_warehouse_id` (`target_warehouse_id`),
  KEY `idx_created_by_user_id` (`created_by_user_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `idx_dte_type_code` (`dte_type_code`),
  KEY `idx_dte_folio` (`dte_folio`),
  KEY `idx_dte_uuid` (`dte_uuid`),
  KEY `idx_dte_status` (`dte_status`),
  KEY `idx_rut_emisor` (`rut_emisor`),
  KEY `idx_rut_receptor` (`rut_receptor`),
  KEY `idx_cash_register_session_id` (`cash_register_session_id`),
  KEY `idx_payment_method_id` (`payment_method_id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_authorized_buyer_id` (`authorized_buyer_id`),
  KEY `idx_credit_sale` (`credit_sale`),
  KEY `idx_is_return` (`is_return`),
  KEY `idx_original_document_id` (`original_document_id`),
  KEY `idx_status_id` (`status_id`),
  KEY `idx_documents_supplier_id` (`supplier_id`),
  KEY `idx_documents_original_document_id` (`original_document_id`),
  KEY `idx_documents_cancelled_by_user_id` (`cancelled_by_user_id`),
  CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`id`),
  CONSTRAINT `documents_ibfk_10` FOREIGN KEY (`authorized_buyer_id`) REFERENCES `customer_authorized_users` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `documents_ibfk_11` FOREIGN KEY (`original_document_id`) REFERENCES `documents` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`document_series_id`) REFERENCES `document_series` (`id`),
    CONSTRAINT `documents_ibfk_3` FOREIGN KEY (`source_warehouse_id`) REFERENCES `warehouses` (`id`),
    CONSTRAINT `documents_ibfk_4` FOREIGN KEY (`target_warehouse_id`) REFERENCES `warehouses` (`id`),
    CONSTRAINT `documents_ibfk_5` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`),
    CONSTRAINT `documents_ibfk_6` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`),
    CONSTRAINT `documents_ibfk_7` FOREIGN KEY (`cash_register_session_id`) REFERENCES `cash_register_sessions` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `documents_ibfk_8` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `documents_ibfk_9` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE NO ACTION,
    CONSTRAINT `fk_documents_cancelled_by_user` FOREIGN KEY (`cancelled_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `fk_documents_original_document` FOREIGN KEY (`original_document_id`) REFERENCES `documents` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `fk_documents_status` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`),
    CONSTRAINT `fk_documents_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `document_items`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `document_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `document_id` bigint(20) unsigned NOT NULL,
  `line_number` smallint(5) unsigned NOT NULL,
  `product_variant_id` bigint(20) unsigned NOT NULL,
  `measurement_unit_id` bigint(20) unsigned NOT NULL,
  `quantity` decimal(15, 4) NOT NULL,
  `unit_price` decimal(15, 4) NOT NULL,
  `discount_percentage` decimal(5, 2) DEFAULT 0.00,
  `discount_amount` decimal(15, 4) DEFAULT 0.0000,
  `line_total` decimal(15, 4) NOT NULL,
  `batch_lot_number` varchar(100) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `warehouse_zone_id` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_document_line` (`document_id`, `line_number`),
  KEY `measurement_unit_id` (`measurement_unit_id`),
  KEY `warehouse_zone_id` (`warehouse_zone_id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_product_variant_id` (`product_variant_id`),
  KEY `idx_batch_lot_number` (`batch_lot_number`),
  KEY `idx_serial_number` (`serial_number`),
  CONSTRAINT `document_items_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `document_items_ibfk_2` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`),
  CONSTRAINT `document_items_ibfk_3` FOREIGN KEY (`measurement_unit_id`) REFERENCES `measurement_units` (`id`),
  CONSTRAINT `document_items_ibfk_4` FOREIGN KEY (`warehouse_zone_id`) REFERENCES `warehouse_zones` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `document_number_change_requests`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `document_number_change_requests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `document_id` bigint(20) unsigned NOT NULL,
  `old_document_number` varchar(50) NOT NULL,
  `new_document_number` varchar(50) NOT NULL,
  `reason` text NOT NULL,
  `requested_by_user_id` bigint(20) unsigned NOT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `applied_at` timestamp NULL DEFAULT NULL,
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `requested_by_user_id` (`requested_by_user_id`),
  KEY `approved_by_user_id` (`approved_by_user_id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_status_id` (`status_id`),
  CONSTRAINT `document_number_change_requests_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`),
  CONSTRAINT `document_number_change_requests_ibfk_2` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `document_number_change_requests_ibfk_3` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `document_number_change_requests_ibfk_4` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `document_payment_details`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `document_payment_details` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `document_id` bigint(20) unsigned NOT NULL,
  `payment_method_id` bigint(20) unsigned NOT NULL,
  `payment_amount` decimal(15, 2) NOT NULL COMMENT 'Monto pagado con este método',
  `received_amount` decimal(15, 2) DEFAULT NULL COMMENT 'Monto recibido (para efectivo)',
  `change_amount` decimal(15, 2) DEFAULT 0.00 COMMENT 'Vuelto entregado',
  `reference_number` varchar(100) DEFAULT NULL COMMENT 'Número de autorización, cheque, etc.',
  `card_last_digits` varchar(4) DEFAULT NULL COMMENT 'Últimos 4 dígitos de tarjeta',
  `authorization_code` varchar(50) DEFAULT NULL COMMENT 'Código de autorización',
  `transaction_id` varchar(100) DEFAULT NULL COMMENT 'ID de transacción externa',
  `check_number` varchar(50) DEFAULT NULL,
  `check_date` date DEFAULT NULL,
  `bank_name` varchar(100) DEFAULT NULL,
  `account_holder` varchar(255) DEFAULT NULL,
  `bank_reference` varchar(100) DEFAULT NULL,
  `transfer_date` datetime DEFAULT NULL,
  `payment_order` tinyint(3) unsigned DEFAULT 1 COMMENT 'Orden de aplicación del pago',
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `processed_by_user_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_payment_method_id` (`payment_method_id`),
  KEY `idx_payment_order` (`payment_order`),
  KEY `idx_processed_by_user_id` (`processed_by_user_id`),
  KEY `idx_reference_number` (`reference_number`),
  KEY `idx_transaction_id` (`transaction_id`),
  KEY `idx_status_id` (`status_id`),
  CONSTRAINT `document_payment_details_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `document_payment_details_ibfk_2` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`),
  CONSTRAINT `document_payment_details_ibfk_3` FOREIGN KEY (`processed_by_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_document_payment_details_status` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `document_series`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `document_series` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `document_type_id` bigint(20) unsigned NOT NULL,
  `warehouse_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Serie específica por bodega',
  `series_code` varchar(20) NOT NULL,
  `series_prefix` varchar(10) DEFAULT NULL,
  `current_number` bigint(20) unsigned DEFAULT 0,
  `min_number` bigint(20) unsigned DEFAULT 1,
  `max_number` bigint(20) unsigned DEFAULT 999999999,
  `number_length` tinyint(3) unsigned DEFAULT 8,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_series_warehouse` (`document_type_id`, `warehouse_id`, `series_code`),
  KEY `idx_document_type_id` (`document_type_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_series_code` (`series_code`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_document_series_deleted_at` (`deleted_at`),
  CONSTRAINT `document_series_ibfk_1` FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `document_series_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `document_templates`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `document_templates` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `template_code` varchar(50) NOT NULL,
  `template_name` varchar(150) NOT NULL,
  `document_type_id` bigint(20) unsigned DEFAULT NULL,
  `template_channel` enum('PRINT', 'EMAIL', 'PDF', 'THERMAL', 'OTHER') DEFAULT 'PDF',
  `template_subject` varchar(255) DEFAULT NULL,
  `template_body` mediumtext DEFAULT NULL,
  `paper_size` varchar(30) DEFAULT 'A4',
  `orientation` enum('PORTRAIT', 'LANDSCAPE') DEFAULT 'PORTRAIT',
  `is_default` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `template_code` (`template_code`),
  KEY `idx_document_template_code` (`template_code`),
  KEY `idx_document_type_id` (`document_type_id`),
  KEY `idx_document_template_active` (`is_active`),
  KEY `idx_document_template_deleted_at` (`deleted_at`),
  CONSTRAINT `document_templates_ibfk_1` FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `document_types`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `document_types` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `document_type_code` varchar(50) NOT NULL,
  `document_type_name` varchar(100) NOT NULL,
  `document_category` enum('PURCHASE', 'SALE', 'INVENTORY', 'TRANSFER') NOT NULL,
  `requires_approval` tinyint(1) DEFAULT 0,
  `generates_movement` tinyint(1) DEFAULT 1,
  `movement_type` enum('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT') DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `document_type_code` (`document_type_code`),
  KEY `idx_document_type_code` (`document_type_code`),
  KEY `idx_document_category` (`document_category`),
  KEY `idx_movement_type` (`movement_type`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE = InnoDB AUTO_INCREMENT = 21 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `dte_company_config`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `dte_company_config` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_rut` varchar(12) NOT NULL COMMENT 'RUT de la empresa',
  `company_name` varchar(255) NOT NULL,
  `company_business_name` varchar(255) NOT NULL COMMENT 'Razón social',
  `company_address` text NOT NULL,
  `company_comuna` varchar(100) NOT NULL,
  `company_city` varchar(100) NOT NULL,
  `company_region` varchar(100) NOT NULL,
  `economic_activity_code` varchar(10) NOT NULL COMMENT 'Código actividad económica',
  `economic_activity_name` varchar(255) NOT NULL,
  `dte_environment` enum('CERTIFICACION', 'PRODUCCION') DEFAULT 'CERTIFICACION',
  `default_customer_currency_code` char(3) NOT NULL DEFAULT 'CLP',
  `default_supplier_currency_code` char(3) NOT NULL DEFAULT 'CLP',
  `default_sales_currency_code` char(3) NOT NULL DEFAULT 'CLP',
  `certificate_path` varchar(500) DEFAULT NULL COMMENT 'Ruta certificado digital',
  `certificate_password` varchar(255) DEFAULT NULL COMMENT 'Password certificado (encriptado)',
  `sii_user` varchar(100) DEFAULT NULL COMMENT 'Usuario SII',
  `logo_media_asset_id` bigint(20) unsigned DEFAULT NULL,
  `banner_media_asset_id` bigint(20) unsigned DEFAULT NULL,
  `sii_password` varchar(255) DEFAULT NULL COMMENT 'Password SII (encriptado)',
  `current_folio_33` bigint(20) unsigned DEFAULT 1 COMMENT 'Folio actual Facturas',
  `current_folio_39` bigint(20) unsigned DEFAULT 1 COMMENT 'Folio actual Boletas',
  `current_folio_52` bigint(20) unsigned DEFAULT 1 COMMENT 'Folio actual Guías',
  `current_folio_61` bigint(20) unsigned DEFAULT 1 COMMENT 'Folio actual Notas Crédito',
  `folio_range_33_from` bigint(20) unsigned DEFAULT NULL,
  `folio_range_33_to` bigint(20) unsigned DEFAULT NULL,
  `folio_range_39_from` bigint(20) unsigned DEFAULT NULL,
  `folio_range_39_to` bigint(20) unsigned DEFAULT NULL,
  `folio_range_52_from` bigint(20) unsigned DEFAULT NULL,
  `folio_range_52_to` bigint(20) unsigned DEFAULT NULL,
  `folio_range_61_from` bigint(20) unsigned DEFAULT NULL,
  `folio_range_61_to` bigint(20) unsigned DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `active_singleton` tinyint(4) GENERATED ALWAYS AS (
    case
      when `is_active` = 1 then 1
      else NULL
    end
  ) STORED,
  `production_singleton` tinyint(4) GENERATED ALWAYS AS (
    case
      when `dte_environment` = 'PRODUCCION' then 1
      else NULL
    end
  ) STORED,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_rut` (`company_rut`),
  UNIQUE KEY `ux_dte_company_single_active` (`active_singleton`),
  UNIQUE KEY `ux_dte_company_single_production` (`production_singleton`),
  KEY `idx_company_rut` (`company_rut`),
  KEY `idx_dte_environment` (`dte_environment`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_dte_company_config_deleted_at` (`deleted_at`),
  KEY `idx_dte_company_default_customer_currency` (`default_customer_currency_code`),
  KEY `idx_dte_company_default_supplier_currency` (`default_supplier_currency_code`),
  KEY `idx_dte_company_default_sales_currency` (`default_sales_currency_code`),
  CONSTRAINT `fk_dte_company_default_customer_currency` FOREIGN KEY (`default_customer_currency_code`) REFERENCES `currencies` (`currency_code`),
  CONSTRAINT `fk_dte_company_default_sales_currency` FOREIGN KEY (`default_sales_currency_code`) REFERENCES `currencies` (`currency_code`),
  CONSTRAINT `fk_dte_company_default_supplier_currency` FOREIGN KEY (`default_supplier_currency_code`) REFERENCES `currencies` (`currency_code`)
) ENGINE = InnoDB AUTO_INCREMENT = 3 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `dte_transaction_log`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `dte_transaction_log` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `document_id` bigint(20) unsigned NOT NULL,
  `dte_type_code` varchar(10) NOT NULL,
  `dte_folio` bigint(20) unsigned NOT NULL,
  `transaction_type` enum('SEND', 'QUERY', 'CANCEL', 'ACCEPT', 'REJECT') NOT NULL,
  `request_xml` text DEFAULT NULL,
  `response_xml` text DEFAULT NULL,
  `response_code` varchar(10) DEFAULT NULL,
  `response_message` text DEFAULT NULL,
  `sii_track_id` varchar(100) DEFAULT NULL COMMENT 'Track ID del SII',
  `processing_time_ms` int(10) unsigned DEFAULT NULL,
  `is_success` tinyint(1) DEFAULT 0,
  `error_details` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_dte_type_folio` (`dte_type_code`, `dte_folio`),
  KEY `idx_transaction_type` (`transaction_type`),
  KEY `idx_sii_track_id` (`sii_track_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_is_success` (`is_success`),
  CONSTRAINT `dte_transaction_log_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `import_batches`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `import_batches` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `batch_code` varchar(50) NOT NULL,
  `import_type` enum(
    'PRODUCTS',
    'STOCK',
    'PRICES',
    'CUSTOMERS',
    'SUPPLIERS',
    'PURCHASES',
    'LEGACY_FULL',
    'OTHER'
  ) NOT NULL,
  `source_file_name` varchar(255) DEFAULT NULL,
  `source_file_path` varchar(500) DEFAULT NULL,
  `source_format` enum('CSV', 'XLS', 'XLSX', 'JSON', 'SQL', 'OTHER') DEFAULT 'XLSX',
  `total_rows` int(10) unsigned DEFAULT 0,
  `processed_rows` int(10) unsigned DEFAULT 0,
  `success_rows` int(10) unsigned DEFAULT 0,
  `error_rows` int(10) unsigned DEFAULT 0,
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_code` (`batch_code`),
  KEY `created_by_user_id` (`created_by_user_id`),
  KEY `idx_import_type` (`import_type`),
  KEY `idx_status_id` (`status_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `import_batches_ibfk_1` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `import_batches_ibfk_2` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `import_batch_errors`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `import_batch_errors` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `import_batch_id` bigint(20) unsigned NOT NULL,
  `row_number` int(10) unsigned DEFAULT NULL,
  `source_key` varchar(255) DEFAULT NULL,
  `field_name` varchar(100) DEFAULT NULL,
  `error_code` varchar(50) DEFAULT NULL,
  `error_message` text NOT NULL,
  `raw_payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`raw_payload`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_import_batch_id` (`import_batch_id`),
  KEY `idx_row_number` (`row_number`),
  KEY `idx_error_code` (`error_code`),
  CONSTRAINT `import_batch_errors_ibfk_1` FOREIGN KEY (`import_batch_id`) REFERENCES `import_batches` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `legacy_record_map`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `legacy_record_map` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `legacy_table_name` varchar(100) NOT NULL,
  `legacy_primary_key` varchar(100) NOT NULL,
  `modern_table_name` varchar(100) NOT NULL,
  `modern_primary_key` bigint(20) unsigned NOT NULL,
  `import_batch_id` bigint(20) unsigned DEFAULT NULL,
  `checksum_hash` varchar(128) DEFAULT NULL,
  `migrated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_legacy_record_target` (
    `legacy_table_name`,
    `legacy_primary_key`,
    `modern_table_name`
  ),
  KEY `idx_modern_record` (`modern_table_name`, `modern_primary_key`),
  KEY `idx_import_batch_id` (`import_batch_id`),
  CONSTRAINT `legacy_record_map_ibfk_1` FOREIGN KEY (`import_batch_id`) REFERENCES `import_batches` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `measurement_units`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `measurement_units` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `unit_code` varchar(20) NOT NULL,
  `unit_name` varchar(100) NOT NULL,
  `unit_symbol` varchar(10) NOT NULL,
  `unit_type` enum('BASE', 'DERIVED') DEFAULT 'BASE',
  `base_unit_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Unidad base para conversiones',
  `conversion_factor` decimal(15, 6) DEFAULT 1.000000 COMMENT 'Factor de conversión a unidad base',
  `allow_decimals` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unit_code` (`unit_code`),
  KEY `idx_unit_code` (`unit_code`),
  KEY `idx_unit_type` (`unit_type`),
  KEY `idx_base_unit_id` (`base_unit_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `measurement_units_ibfk_1` FOREIGN KEY (`base_unit_id`) REFERENCES `measurement_units` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB AUTO_INCREMENT = 12 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `media_assets`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `media_assets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `media_code` varchar(50) NOT NULL,
  `owner_type` enum('USER', 'COMPANY', 'CUSTOMER', 'SUPPLIER', 'PRODUCT') NOT NULL,
  `owner_id` bigint(20) unsigned NOT NULL,
  `media_role` enum('AVATAR', 'LOGO', 'BANNER', 'PRODUCT_IMAGE') NOT NULL,
  `storage_provider` enum('MINIO') NOT NULL DEFAULT 'MINIO',
  `bucket_name` varchar(100) NOT NULL,
  `object_key_full` varchar(500) NOT NULL,
  `object_key_thumb` varchar(500) NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `mime_type` varchar(100) NOT NULL DEFAULT 'image/webp',
  `full_width` int(10) unsigned DEFAULT NULL,
  `full_height` int(10) unsigned DEFAULT NULL,
  `thumb_width` int(10) unsigned DEFAULT NULL,
  `thumb_height` int(10) unsigned DEFAULT NULL,
  `full_size_bytes` bigint(20) unsigned DEFAULT NULL,
  `thumb_size_bytes` bigint(20) unsigned DEFAULT NULL,
  `uploaded_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `media_code` (`media_code`),
  KEY `idx_media_owner` (
    `owner_type`,
    `owner_id`,
    `media_role`,
    `deleted_at`
  ),
  KEY `idx_media_deleted_at` (`deleted_at`),
  KEY `fk_media_uploaded_by_user` (`uploaded_by_user_id`),
  CONSTRAINT `fk_media_uploaded_by_user` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `menu_access_log`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `menu_access_log` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `menu_item_id` bigint(20) unsigned NOT NULL,
  `access_timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_menu_item_id` (`menu_item_id`),
  KEY `idx_access_timestamp` (`access_timestamp`),
  KEY `idx_session_id` (`session_id`),
  CONSTRAINT `menu_access_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `menu_access_log_ibfk_2` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `menu_items`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `menu_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` bigint(20) unsigned DEFAULT NULL COMMENT 'ID del menú padre (NULL = menú raíz)',
  `menu_code` varchar(50) NOT NULL COMMENT 'Código único del menú',
  `menu_name` varchar(100) NOT NULL COMMENT 'Nombre mostrado en el menú',
  `menu_description` text DEFAULT NULL COMMENT 'Descripción del elemento del menú',
  `icon_name` varchar(50) DEFAULT NULL COMMENT 'Nombre del icono (ej: product-line, shopping-cart)',
  `icon_color` varchar(20) DEFAULT NULL COMMENT 'Color del icono en formato hex',
  `menu_url` varchar(255) DEFAULT NULL COMMENT 'URL/ruta del frontend',
  `menu_type` enum('PARENT', 'LINK', 'DIVIDER', 'HEADER') DEFAULT 'LINK' COMMENT 'Tipo de elemento del menú',
  `required_permission_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Permiso requerido para ver este menú',
  `alternative_permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array de permisos alternativos que permiten acceso' CHECK (json_valid(`alternative_permissions`)),
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'Si el menú está activo globalmente',
  `is_visible` tinyint(1) DEFAULT 1 COMMENT 'Si es visible en el menú',
  `requires_feature` tinyint(1) DEFAULT 0 COMMENT 'Si requiere que una característica esté habilitada',
  `feature_code` varchar(100) DEFAULT NULL COMMENT 'Código de característica requerida',
  `sort_order` int(10) unsigned DEFAULT 0 COMMENT 'Orden de aparición en el menú',
  `menu_level` tinyint(3) unsigned DEFAULT 1 COMMENT 'Nivel jerárquico (1=raíz, 2=submenú, etc.)',
  `menu_path` varchar(500) DEFAULT NULL COMMENT 'Ruta completa del menú (/inventario/productos)',
  `target_window` enum('SELF', 'BLANK', 'MODAL') DEFAULT 'SELF' COMMENT 'Donde abrir el enlace',
  `css_classes` varchar(255) DEFAULT NULL COMMENT 'Clases CSS adicionales',
  `data_attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Atributos data- adicionales' CHECK (json_valid(`data_attributes`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `menu_code` (`menu_code`),
  KEY `created_by_user_id` (`created_by_user_id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_menu_code` (`menu_code`),
  KEY `idx_required_permission_id` (`required_permission_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_is_visible` (`is_visible`),
  KEY `idx_sort_order` (`sort_order`),
  KEY `idx_menu_level` (`menu_level`),
  KEY `idx_menu_path` (`menu_path`(255)),
  KEY `idx_feature_code` (`feature_code`),
  KEY `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `menu_items_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `menu_items_ibfk_2` FOREIGN KEY (`required_permission_id`) REFERENCES `permissions` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `menu_items_ibfk_3` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB AUTO_INCREMENT = 158 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `menu_item_permissions`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `menu_item_permissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_item_id` bigint(20) unsigned NOT NULL,
  `permission_id` bigint(20) unsigned NOT NULL,
  `permission_type` enum('REQUIRED', 'ALTERNATIVE', 'EXCLUDE') DEFAULT 'ALTERNATIVE' COMMENT 'Tipo de relación con el permiso',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_menu_permission` (`menu_item_id`, `permission_id`),
  KEY `idx_menu_item_id` (`menu_item_id`),
  KEY `idx_permission_id` (`permission_id`),
  KEY `idx_permission_type` (`permission_type`),
  CONSTRAINT `menu_item_permissions_ibfk_1` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `menu_item_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `notification_emission_rules`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `notification_emission_rules` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `rule_code` varchar(50) NOT NULL,
  `rule_name` varchar(150) NOT NULL,
  `source_label` varchar(120) NOT NULL,
  `notification_type_id` bigint(20) unsigned NOT NULL,
  `severity_override` enum('INFO', 'SUCCESS', 'WARNING', 'ERROR') DEFAULT NULL,
  `min_priority` tinyint(3) unsigned DEFAULT 1,
  `max_per_user_per_day` int(10) unsigned DEFAULT NULL,
  `emit_in_app` tinyint(1) DEFAULT 1,
  `emit_email` tinyint(1) DEFAULT 0,
  `emit_push` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rule_code` (`rule_code`),
  KEY `idx_notification_rule_code` (`rule_code`),
  KEY `idx_notification_rule_source` (`source_label`),
  KEY `idx_notification_rule_type` (`notification_type_id`),
  KEY `idx_notification_rule_active` (`is_active`),
  KEY `idx_notification_rule_deleted_at` (`deleted_at`),
  CONSTRAINT `notification_emission_rules_ibfk_1` FOREIGN KEY (`notification_type_id`) REFERENCES `notification_types` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `notification_types`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `notification_types` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `type_code` varchar(80) NOT NULL,
  `type_name` varchar(150) NOT NULL,
  `type_description` text DEFAULT NULL,
  `severity` enum('INFO', 'SUCCESS', 'WARNING', 'ERROR') NOT NULL DEFAULT 'INFO',
  `icon_name` varchar(80) DEFAULT NULL,
  `default_action_label` varchar(80) DEFAULT NULL,
  `is_user_visible` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `type_code` (`type_code`),
  KEY `idx_type_code` (`type_code`),
  KEY `idx_severity` (`severity`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE = InnoDB AUTO_INCREMENT = 6 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `payment_allocations`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `payment_allocations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_payment_id` bigint(20) unsigned NOT NULL,
  `accounts_receivable_id` bigint(20) unsigned NOT NULL,
  `allocated_amount` decimal(15, 2) NOT NULL,
  `allocation_date` date NOT NULL,
  `allocation_type` enum('AUTOMATIC', 'MANUAL') DEFAULT 'MANUAL',
  `applied_by_user_id` bigint(20) unsigned NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_customer_payment_id` (`customer_payment_id`),
  KEY `idx_accounts_receivable_id` (`accounts_receivable_id`),
  KEY `idx_allocation_date` (`allocation_date`),
  KEY `idx_allocation_type` (`allocation_type`),
  KEY `idx_applied_by_user_id` (`applied_by_user_id`),
  CONSTRAINT `payment_allocations_ibfk_1` FOREIGN KEY (`customer_payment_id`) REFERENCES `customer_payments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_allocations_ibfk_2` FOREIGN KEY (`accounts_receivable_id`) REFERENCES `accounts_receivable` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_allocations_ibfk_3` FOREIGN KEY (`applied_by_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `payment_methods`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `payment_methods` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `method_code` varchar(20) NOT NULL COMMENT 'Código del método (CASH, DEBIT, CREDIT)',
  `method_name` varchar(100) NOT NULL COMMENT 'Nombre descriptivo',
  `method_type` enum('CASH', 'CARD', 'TRANSFER', 'OTHER') NOT NULL COMMENT 'Tipo principal',
  `affects_cash_flow` tinyint(1) DEFAULT 1 COMMENT 'Si afecta el flujo de efectivo de la caja',
  `requires_authorization` tinyint(1) DEFAULT 0 COMMENT 'Requiere autorización especial',
  `currency_code` char(3) NOT NULL DEFAULT 'CLP',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  `allows_postdated` tinyint(1) DEFAULT 0 COMMENT 'Permite cheques/pagos a fecha',
  `requires_bank_info` tinyint(1) DEFAULT 0 COMMENT 'Requiere información bancaria',
  `default_terms_days` int(10) unsigned DEFAULT NULL COMMENT 'Días por defecto para este método',
  PRIMARY KEY (`id`),
  UNIQUE KEY `method_code` (`method_code`),
  KEY `idx_method_code` (`method_code`),
  KEY `idx_method_type` (`method_type`),
  KEY `idx_affects_cash_flow` (`affects_cash_flow`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `fk_payment_methods_currency` (`currency_code`),
  CONSTRAINT `fk_payment_methods_currency` FOREIGN KEY (`currency_code`) REFERENCES `currencies` (`currency_code`)
) ENGINE = InnoDB AUTO_INCREMENT = 16 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `permissions`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `permissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `permission_code` varchar(100) NOT NULL,
  `permission_name` varchar(150) NOT NULL,
  `permission_group` varchar(50) NOT NULL COMMENT 'PRODUCTS, INVENTORY, SALES, etc.',
  `permission_description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permission_code` (`permission_code`),
  KEY `idx_permission_code` (`permission_code`),
  KEY `idx_permission_group` (`permission_group`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE = InnoDB AUTO_INCREMENT = 242 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `permission_audit_log`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `permission_audit_log` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `target_user_id` bigint(20) unsigned NOT NULL COMMENT 'Usuario al que se le modificaron permisos',
  `action_type` enum(
    'ROLE_ASSIGNED',
    'ROLE_REMOVED',
    'PERMISSION_GRANTED',
    'PERMISSION_REVOKED',
    'WAREHOUSE_ACCESS_CHANGED'
  ) NOT NULL,
  `role_id` bigint(20) unsigned DEFAULT NULL,
  `permission_id` bigint(20) unsigned DEFAULT NULL,
  `warehouse_id` bigint(20) unsigned DEFAULT NULL,
  `old_value` text DEFAULT NULL COMMENT 'Valor anterior',
  `new_value` text DEFAULT NULL COMMENT 'Nuevo valor',
  `performed_by_user_id` bigint(20) unsigned NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `role_id` (`role_id`),
  KEY `permission_id` (`permission_id`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `idx_target_user_id` (`target_user_id`),
  KEY `idx_action_type` (`action_type`),
  KEY `idx_performed_by_user_id` (`performed_by_user_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `permission_audit_log_ibfk_1` FOREIGN KEY (`target_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `permission_audit_log_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `permission_audit_log_ibfk_3` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `permission_audit_log_ibfk_4` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `permission_audit_log_ibfk_5` FOREIGN KEY (`performed_by_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `petty_cash_categories`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `petty_cash_categories` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `category_code` varchar(20) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `category_description` text DEFAULT NULL,
  `max_amount_per_expense` decimal(15, 2) DEFAULT NULL COMMENT 'Monto máximo por gasto individual',
  `requires_evidence` tinyint(1) DEFAULT 0 COMMENT 'Requiere comprobante obligatorio',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_code` (`category_code`),
  KEY `idx_category_code` (`category_code`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE = InnoDB AUTO_INCREMENT = 11 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `petty_cash_expenses`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `petty_cash_expenses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `expense_code` varchar(50) NOT NULL,
  `petty_cash_fund_id` bigint(20) unsigned NOT NULL,
  `category_id` bigint(20) unsigned NOT NULL,
  `cash_register_session_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Sesión de caja donde se registró',
  `expense_amount` decimal(15, 2) NOT NULL,
  `expense_description` text NOT NULL,
  `vendor_name` varchar(255) DEFAULT NULL COMMENT 'Proveedor o comercio',
  `expense_date` date NOT NULL,
  `evidence_file_hash` varchar(100) DEFAULT NULL COMMENT 'Hash UUID del archivo en MinIO',
  `evidence_file_extension` varchar(10) DEFAULT NULL COMMENT 'Extensión del archivo',
  `evidence_file_size` bigint(20) unsigned DEFAULT NULL COMMENT 'Tamaño del archivo en bytes',
  `has_receipt` tinyint(1) DEFAULT 0 COMMENT 'Si tiene comprobante físico',
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_datetime` timestamp NULL DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_code` (`expense_code`),
  KEY `approved_by_user_id` (`approved_by_user_id`),
  KEY `idx_expense_code` (`expense_code`),
  KEY `idx_fund_id` (`petty_cash_fund_id`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_session_id` (`cash_register_session_id`),
  KEY `idx_expense_date` (`expense_date`),
  KEY `idx_created_by_user_id` (`created_by_user_id`),
  KEY `idx_evidence_hash` (`evidence_file_hash`),
  KEY `idx_status_id` (`status_id`),
  CONSTRAINT `fk_petty_cash_expenses_status` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`),
  CONSTRAINT `petty_cash_expenses_ibfk_1` FOREIGN KEY (`petty_cash_fund_id`) REFERENCES `petty_cash_funds` (`id`),
  CONSTRAINT `petty_cash_expenses_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `petty_cash_categories` (`id`),
  CONSTRAINT `petty_cash_expenses_ibfk_3` FOREIGN KEY (`cash_register_session_id`) REFERENCES `cash_register_sessions` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `petty_cash_expenses_ibfk_4` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`),
    CONSTRAINT `petty_cash_expenses_ibfk_5` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `petty_cash_funds`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `petty_cash_funds` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `fund_code` varchar(50) NOT NULL,
  `warehouse_id` bigint(20) unsigned NOT NULL COMMENT 'Punto de venta que maneja el fondo',
  `responsible_user_id` bigint(20) unsigned NOT NULL COMMENT 'Usuario responsable del fondo',
  `initial_amount` decimal(15, 2) NOT NULL COMMENT 'Monto inicial asignado',
  `current_balance` decimal(15, 2) NOT NULL COMMENT 'Saldo actual disponible',
  `total_expenses` decimal(15, 2) DEFAULT 0.00 COMMENT 'Total gastado',
  `total_replenishments` decimal(15, 2) DEFAULT 0.00 COMMENT 'Total reposiciones',
  `fund_status` enum('ACTIVE', 'SUSPENDED', 'CLOSED') DEFAULT 'ACTIVE',
  `last_replenishment_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fund_code` (`fund_code`),
  KEY `idx_fund_code` (`fund_code`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_responsible_user_id` (`responsible_user_id`),
  KEY `idx_fund_status` (`fund_status`),
  KEY `idx_petty_cash_funds_deleted_at` (`deleted_at`),
  CONSTRAINT `petty_cash_funds_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
  CONSTRAINT `petty_cash_funds_ibfk_2` FOREIGN KEY (`responsible_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `petty_cash_replenishments`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `petty_cash_replenishments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `replenishment_code` varchar(50) NOT NULL,
  `petty_cash_fund_id` bigint(20) unsigned NOT NULL,
  `cash_register_session_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Sesión donde se hizo la reposición',
  `replenishment_amount` decimal(15, 2) NOT NULL,
  `previous_balance` decimal(15, 2) NOT NULL,
  `new_balance` decimal(15, 2) NOT NULL,
  `replenishment_reason` text DEFAULT NULL,
  `authorized_by_user_id` bigint(20) unsigned NOT NULL COMMENT 'Quien autoriza la reposición',
  `created_by_user_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `replenishment_code` (`replenishment_code`),
  KEY `created_by_user_id` (`created_by_user_id`),
  KEY `idx_replenishment_code` (`replenishment_code`),
  KEY `idx_fund_id` (`petty_cash_fund_id`),
  KEY `idx_session_id` (`cash_register_session_id`),
  KEY `idx_authorized_by_user_id` (`authorized_by_user_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `petty_cash_replenishments_ibfk_1` FOREIGN KEY (`petty_cash_fund_id`) REFERENCES `petty_cash_funds` (`id`),
  CONSTRAINT `petty_cash_replenishments_ibfk_2` FOREIGN KEY (`cash_register_session_id`) REFERENCES `cash_register_sessions` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `petty_cash_replenishments_ibfk_3` FOREIGN KEY (`authorized_by_user_id`) REFERENCES `users` (`id`),
    CONSTRAINT `petty_cash_replenishments_ibfk_4` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `physical_inventory_adjustments`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `physical_inventory_adjustments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `physical_inventory_count_id` bigint(20) unsigned NOT NULL,
  `document_id` bigint(20) unsigned DEFAULT NULL,
  `stock_movement_id` bigint(20) unsigned DEFAULT NULL,
  `adjustment_date` date NOT NULL,
  `total_positive_quantity` decimal(15, 4) DEFAULT 0.0000,
  `total_negative_quantity` decimal(15, 4) DEFAULT 0.0000,
  `total_difference_cost` decimal(15, 4) DEFAULT 0.0000,
  `posted_by_user_id` bigint(20) unsigned NOT NULL,
  `posted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `document_id` (`document_id`),
  KEY `stock_movement_id` (`stock_movement_id`),
  KEY `posted_by_user_id` (`posted_by_user_id`),
  KEY `idx_physical_inventory_count_id` (`physical_inventory_count_id`),
  KEY `idx_adjustment_date` (`adjustment_date`),
  CONSTRAINT `physical_inventory_adjustments_ibfk_1` FOREIGN KEY (`physical_inventory_count_id`) REFERENCES `physical_inventory_counts` (`id`),
  CONSTRAINT `physical_inventory_adjustments_ibfk_2` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `physical_inventory_adjustments_ibfk_3` FOREIGN KEY (`stock_movement_id`) REFERENCES `stock_movements` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `physical_inventory_adjustments_ibfk_4` FOREIGN KEY (`posted_by_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `physical_inventory_counts`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `physical_inventory_counts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `count_code` varchar(50) NOT NULL,
  `warehouse_id` bigint(20) unsigned NOT NULL,
  `warehouse_zone_id` bigint(20) unsigned DEFAULT NULL,
  `warehouse_zone_location_id` bigint(20) unsigned DEFAULT NULL,
  `count_type` enum('FULL', 'PARTIAL', 'RANDOM', 'CYCLE') DEFAULT 'PARTIAL',
  `scope_description` text DEFAULT NULL,
  `scheduled_date` date DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `freeze_stock` tinyint(1) DEFAULT 0,
  `created_by_user_id` bigint(20) unsigned NOT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `count_code` (`count_code`),
  KEY `created_by_user_id` (`created_by_user_id`),
  KEY `approved_by_user_id` (`approved_by_user_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_warehouse_zone_id` (`warehouse_zone_id`),
  KEY `idx_count_type` (`count_type`),
  KEY `idx_status_id` (`status_id`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `idx_warehouse_zone_location_id` (`warehouse_zone_location_id`),
  CONSTRAINT `fk_physical_counts_zone_location` FOREIGN KEY (`warehouse_zone_location_id`) REFERENCES `warehouse_zone_locations` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `physical_inventory_counts_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
    CONSTRAINT `physical_inventory_counts_ibfk_2` FOREIGN KEY (`warehouse_zone_id`) REFERENCES `warehouse_zones` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `physical_inventory_counts_ibfk_3` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `physical_inventory_counts_ibfk_4` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`),
    CONSTRAINT `physical_inventory_counts_ibfk_5` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `physical_inventory_count_items`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `physical_inventory_count_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `physical_inventory_count_id` bigint(20) unsigned NOT NULL,
  `product_variant_id` bigint(20) unsigned NOT NULL,
  `warehouse_zone_id` bigint(20) unsigned DEFAULT NULL,
  `warehouse_zone_location_id` bigint(20) unsigned DEFAULT NULL,
  `measurement_unit_id` bigint(20) unsigned NOT NULL,
  `system_quantity` decimal(15, 4) NOT NULL DEFAULT 0.0000,
  `counted_quantity` decimal(15, 4) DEFAULT NULL,
  `difference_quantity` decimal(15, 4) GENERATED ALWAYS AS (
    coalesce(`counted_quantity`, 0) - `system_quantity`
  ) VIRTUAL,
  `unit_cost` decimal(15, 4) DEFAULT NULL,
  `difference_cost` decimal(15, 4) GENERATED ALWAYS AS (
    (
      coalesce(`counted_quantity`, 0) - `system_quantity`
    ) * coalesce(`unit_cost`, 0)
  ) VIRTUAL,
  `batch_lot_number` varchar(100) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `counted_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `counted_at` timestamp NULL DEFAULT NULL,
  `review_status` enum(
    'PENDING',
    'OK',
    'DIFFERENCE',
    'RECOUNT_REQUIRED',
    'APPROVED'
  ) DEFAULT 'PENDING',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_count_product_location_batch` (
    `physical_inventory_count_id`,
    `product_variant_id`,
    `warehouse_zone_id`,
    `warehouse_zone_location_id`,
    `batch_lot_number`,
    `serial_number`
  ),
  KEY `warehouse_zone_id` (`warehouse_zone_id`),
  KEY `measurement_unit_id` (`measurement_unit_id`),
  KEY `counted_by_user_id` (`counted_by_user_id`),
  KEY `idx_product_variant_id` (`product_variant_id`),
  KEY `idx_review_status` (`review_status`),
  KEY `idx_warehouse_zone_location_id` (`warehouse_zone_location_id`),
  CONSTRAINT `fk_physical_items_zone_location` FOREIGN KEY (`warehouse_zone_location_id`) REFERENCES `warehouse_zone_locations` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `physical_inventory_count_items_ibfk_1` FOREIGN KEY (`physical_inventory_count_id`) REFERENCES `physical_inventory_counts` (`id`) ON DELETE CASCADE,
    CONSTRAINT `physical_inventory_count_items_ibfk_2` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`),
    CONSTRAINT `physical_inventory_count_items_ibfk_3` FOREIGN KEY (`warehouse_zone_id`) REFERENCES `warehouse_zones` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `physical_inventory_count_items_ibfk_4` FOREIGN KEY (`measurement_unit_id`) REFERENCES `measurement_units` (`id`),
    CONSTRAINT `physical_inventory_count_items_ibfk_5` FOREIGN KEY (`counted_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `price_lists`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `price_lists` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `price_list_group_id` bigint(20) unsigned DEFAULT NULL,
  `price_list_code` varchar(50) NOT NULL,
  `price_list_name` varchar(150) NOT NULL,
  `base_price_list_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Lista base para derivar precios',
  `base_adjustment_type` enum('PERCENTAGE', 'FIXED') DEFAULT NULL COMMENT 'Tipo de ajuste sobre lista base',
  `base_adjustment_value` decimal(10, 4) DEFAULT NULL COMMENT 'Valor del ajuste (% o monto fijo)',
  `currency_code` char(3) DEFAULT 'USD',
  `valid_from` date NOT NULL,
  `valid_to` date DEFAULT NULL,
  `priority` tinyint(3) unsigned DEFAULT 1 COMMENT 'Prioridad si múltiples listas activas',
  `applies_to` enum('ALL_PRODUCTS', 'CATEGORY', 'SPECIFIC') DEFAULT 'ALL_PRODUCTS',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `price_list_code` (`price_list_code`),
  KEY `idx_price_list_code` (`price_list_code`),
  KEY `idx_price_list_group_id` (`price_list_group_id`),
  KEY `idx_base_price_list_id` (`base_price_list_id`),
  KEY `idx_valid_from` (`valid_from`),
  KEY `idx_valid_to` (`valid_to`),
  KEY `idx_priority` (`priority`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `fk_price_lists_currency` (`currency_code`),
  CONSTRAINT `fk_price_lists_currency` FOREIGN KEY (`currency_code`) REFERENCES `currencies` (`currency_code`),
  CONSTRAINT `price_lists_ibfk_1` FOREIGN KEY (`price_list_group_id`) REFERENCES `price_list_groups` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `price_lists_ibfk_2` FOREIGN KEY (`base_price_list_id`) REFERENCES `price_lists` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB AUTO_INCREMENT = 6 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `price_list_groups`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `price_list_groups` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `group_code` varchar(50) NOT NULL,
  `group_name` varchar(100) NOT NULL,
  `group_description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `group_code` (`group_code`),
  KEY `idx_group_code` (`group_code`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE = InnoDB AUTO_INCREMENT = 6 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `price_list_items`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `price_list_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `price_list_id` bigint(20) unsigned NOT NULL,
  `product_id` bigint(20) unsigned DEFAULT NULL,
  `product_variant_id` bigint(20) unsigned DEFAULT NULL,
  `measurement_unit_id` bigint(20) unsigned NOT NULL,
  `base_price` decimal(15, 4) NOT NULL,
  `sale_price` decimal(15, 4) NOT NULL COMMENT 'Precio final calculado',
  `cost_price` decimal(15, 4) DEFAULT NULL,
  `margin_percentage` decimal(5, 2) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_price_list_id` (`price_list_id`),
  KEY `idx_product_variant_id` (`product_variant_id`),
  KEY `idx_measurement_unit_id` (`measurement_unit_id`),
  KEY `idx_sale_price` (`sale_price`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_price_list_items_deleted_at` (`deleted_at`),
  KEY `idx_price_list_items_product_id` (`product_id`),
  KEY `idx_price_list_items_variant_scope` (
    `price_list_id`,
    `product_id`,
    `product_variant_id`,
    `measurement_unit_id`
  ),
  CONSTRAINT `fk_price_list_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_price_list_items_variant` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `price_list_items_ibfk_1` FOREIGN KEY (`price_list_id`) REFERENCES `price_lists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `price_list_items_ibfk_3` FOREIGN KEY (`measurement_unit_id`) REFERENCES `measurement_units` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 6828 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `products`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `products` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `category_id` bigint(20) unsigned NOT NULL,
  `product_code` varchar(50) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `product_description` text DEFAULT NULL,
  `primary_image_media_asset_id` bigint(20) unsigned DEFAULT NULL,
  `brand_id` bigint(20) unsigned DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `product_model_id` bigint(20) unsigned DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `base_measurement_unit_id` bigint(20) unsigned NOT NULL,
  `base_price` decimal(15, 4) DEFAULT NULL,
  `cost_price` decimal(15, 4) DEFAULT NULL,
  `has_variants` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `has_batch_control` tinyint(1) DEFAULT 0,
  `has_expiry_date` tinyint(1) DEFAULT 0,
  `has_serial_numbers` tinyint(1) DEFAULT 0,
  `has_location_tracking` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_code` (`product_code`),
  KEY `base_measurement_unit_id` (`base_measurement_unit_id`),
  KEY `idx_product_code` (`product_code`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_brand` (`brand`),
  KEY `idx_has_variants` (`has_variants`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `idx_products_brand_id` (`brand_id`),
  KEY `idx_products_product_model_id` (`product_model_id`),
  CONSTRAINT `fk_products_brand_id` FOREIGN KEY (`brand_id`) REFERENCES `product_brands` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `fk_products_product_model_id` FOREIGN KEY (`product_model_id`) REFERENCES `product_models` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
    CONSTRAINT `products_ibfk_2` FOREIGN KEY (`base_measurement_unit_id`) REFERENCES `measurement_units` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 289 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `product_barcodes`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `product_barcodes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_variant_id` bigint(20) unsigned NOT NULL,
  `barcode_type` enum('EAN13', 'EAN8', 'UPC', 'CODE128', 'QR') NOT NULL,
  `barcode_value` varchar(255) NOT NULL,
  `measurement_unit_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Unidad que representa este código',
  `is_primary` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `barcode_value` (`barcode_value`),
  KEY `measurement_unit_id` (`measurement_unit_id`),
  KEY `idx_product_variant_id` (`product_variant_id`),
  KEY `idx_barcode_value` (`barcode_value`),
  KEY `idx_barcode_type` (`barcode_type`),
  KEY `idx_is_primary` (`is_primary`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `product_barcodes_ibfk_1` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_barcodes_ibfk_2` FOREIGN KEY (`measurement_unit_id`) REFERENCES `measurement_units` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB AUTO_INCREMENT = 8513 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `product_brands`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `product_brands` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `brand_code` varchar(50) NOT NULL,
  `brand_name` varchar(150) NOT NULL,
  `brand_description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `brand_code` (`brand_code`),
  KEY `idx_brand_code` (`brand_code`),
  KEY `idx_brand_name` (`brand_name`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `product_measurement_units`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `product_measurement_units` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) unsigned NOT NULL,
  `measurement_unit_id` bigint(20) unsigned NOT NULL,
  `conversion_factor` decimal(15, 6) NOT NULL DEFAULT 1.000000,
  `is_purchase_unit` tinyint(1) DEFAULT 0,
  `is_sale_unit` tinyint(1) DEFAULT 0,
  `is_inventory_unit` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_product_unit` (`product_id`, `measurement_unit_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_measurement_unit_id` (`measurement_unit_id`),
  KEY `idx_is_purchase_unit` (`is_purchase_unit`),
  KEY `idx_is_sale_unit` (`is_sale_unit`),
  CONSTRAINT `product_measurement_units_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_measurement_units_ibfk_2` FOREIGN KEY (`measurement_unit_id`) REFERENCES `measurement_units` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 289 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `product_media`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `product_media` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) unsigned DEFAULT NULL,
  `product_variant_id` bigint(20) unsigned DEFAULT NULL,
  `media_asset_id` bigint(20) unsigned DEFAULT NULL,
  `media_type` enum('IMAGE', 'DOCUMENT', 'LABEL', 'OTHER') DEFAULT 'IMAGE',
  `storage_provider` enum('MINIO', 'S3', 'LOCAL', 'EXTERNAL') DEFAULT 'MINIO',
  `bucket_name` varchar(100) DEFAULT NULL,
  `object_key` varchar(500) DEFAULT NULL,
  `public_url` varchar(1000) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `file_size_bytes` bigint(20) unsigned DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `sort_order` int(10) unsigned DEFAULT 0,
  `uploaded_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  `active_product_image_key` bigint(20) unsigned GENERATED ALWAYS AS (if(`deleted_at` is null, `product_id`, NULL)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_product_media_active_product_image` (`active_product_image_key`),
  KEY `uploaded_by_user_id` (`uploaded_by_user_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_product_variant_id` (`product_variant_id`),
  KEY `idx_media_type` (`media_type`),
  KEY `idx_is_primary` (`is_primary`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `idx_product_media_asset_id` (`media_asset_id`),
  CONSTRAINT `fk_product_media_asset_id` FOREIGN KEY (`media_asset_id`) REFERENCES `media_assets` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `product_media_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
    CONSTRAINT `product_media_ibfk_2` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE,
    CONSTRAINT `product_media_ibfk_3` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `product_models`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `product_models` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `brand_id` bigint(20) unsigned DEFAULT NULL,
  `model_code` varchar(50) NOT NULL,
  `model_name` varchar(150) NOT NULL,
  `model_description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `model_code` (`model_code`),
  KEY `idx_brand_id` (`brand_id`),
  KEY `idx_model_code` (`model_code`),
  KEY `idx_model_name` (`model_name`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `product_models_ibfk_1` FOREIGN KEY (`brand_id`) REFERENCES `product_brands` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB AUTO_INCREMENT = 289 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `product_variants`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `product_variants` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) unsigned NOT NULL,
  `variant_sku` varchar(100) NOT NULL,
  `variant_name` varchar(255) NOT NULL,
  `variant_description` text DEFAULT NULL,
  `is_default_variant` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `variant_sku` (`variant_sku`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_variant_sku` (`variant_sku`),
  KEY `idx_is_default_variant` (`is_default_variant`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `product_variants_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 8571 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `product_variant_attributes`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `product_variant_attributes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_variant_id` bigint(20) unsigned NOT NULL,
  `attribute_id` bigint(20) unsigned NOT NULL,
  `attribute_value_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Para atributos SELECT',
  `text_value` text DEFAULT NULL COMMENT 'Para atributos TEXT/NUMBER',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_variant_attribute` (`product_variant_id`, `attribute_id`),
  KEY `attribute_value_id` (`attribute_value_id`),
  KEY `idx_product_variant_id` (`product_variant_id`),
  KEY `idx_attribute_id` (`attribute_id`),
  CONSTRAINT `product_variant_attributes_ibfk_1` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_variant_attributes_ibfk_2` FOREIGN KEY (`attribute_id`) REFERENCES `attributes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_variant_attributes_ibfk_3` FOREIGN KEY (`attribute_value_id`) REFERENCES `attribute_values` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB AUTO_INCREMENT = 17122 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `promotions`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `promotions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `promotion_code` varchar(50) NOT NULL,
  `promotion_name` varchar(150) NOT NULL,
  `promotion_type` enum(
    'QUANTITY_DISCOUNT',
    'BUY_X_GET_Y',
    'PERCENTAGE_OFF',
    'FIXED_AMOUNT'
  ) NOT NULL,
  `target_type` enum('PRODUCT', 'CATEGORY', 'ALL') DEFAULT 'PRODUCT',
  `min_quantity` decimal(15, 4) DEFAULT NULL COMMENT 'Cantidad mínima para activar promoción',
  `discount_percentage` decimal(5, 2) DEFAULT NULL,
  `discount_amount` decimal(15, 4) DEFAULT NULL,
  `buy_quantity` decimal(15, 4) DEFAULT NULL COMMENT 'Para promociones 3x2',
  `get_quantity` decimal(15, 4) DEFAULT NULL COMMENT 'Para promociones 3x2',
  `valid_from` datetime NOT NULL,
  `valid_to` datetime NOT NULL,
  `is_combinable` tinyint(1) DEFAULT 0 COMMENT 'Si se puede combinar con otras promociones',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `promotion_code` (`promotion_code`),
  KEY `idx_promotion_code` (`promotion_code`),
  KEY `idx_promotion_type` (`promotion_type`),
  KEY `idx_valid_from` (`valid_from`),
  KEY `idx_valid_to` (`valid_to`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `promotion_items`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `promotion_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `promotion_id` bigint(20) unsigned NOT NULL,
  `product_variant_id` bigint(20) unsigned DEFAULT NULL,
  `category_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_promotion_id` (`promotion_id`),
  KEY `idx_product_variant_id` (`product_variant_id`),
  KEY `idx_category_id` (`category_id`),
  CONSTRAINT `promotion_items_ibfk_1` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `promotion_items_ibfk_2` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `promotion_items_ibfk_3` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `CONSTRAINT_1` CHECK (
    `product_variant_id` is not null
    and `category_id` is null
    or `product_variant_id` is null
    and `category_id` is not null
  )
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `purchase_orders`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `purchase_orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `purchase_order_code` varchar(50) NOT NULL,
  `supplier_id` bigint(20) unsigned NOT NULL,
  `warehouse_id` bigint(20) unsigned NOT NULL,
  `document_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Documento interno asociado si existe',
  `order_date` date NOT NULL,
  `expected_delivery_date` date DEFAULT NULL,
  `currency_code` char(3) DEFAULT 'CLP',
  `exchange_rate` decimal(15, 6) DEFAULT 1.000000,
  `subtotal` decimal(15, 4) DEFAULT 0.0000,
  `tax_amount` decimal(15, 4) DEFAULT 0.0000,
  `discount_amount` decimal(15, 4) DEFAULT 0.0000,
  `total_amount` decimal(15, 4) DEFAULT 0.0000,
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned NOT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_order_code` (`purchase_order_code`),
  KEY `document_id` (`document_id`),
  KEY `created_by_user_id` (`created_by_user_id`),
  KEY `approved_by_user_id` (`approved_by_user_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_order_date` (`order_date`),
  KEY `idx_status_id` (`status_id`),
  KEY `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `purchase_orders_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
  CONSTRAINT `purchase_orders_ibfk_3` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `purchase_orders_ibfk_4` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `purchase_orders_ibfk_5` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`),
    CONSTRAINT `purchase_orders_ibfk_6` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `purchase_order_items`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `purchase_order_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `purchase_order_id` bigint(20) unsigned NOT NULL,
  `line_number` smallint(5) unsigned NOT NULL,
  `product_variant_id` bigint(20) unsigned NOT NULL,
  `measurement_unit_id` bigint(20) unsigned NOT NULL,
  `ordered_quantity` decimal(15, 4) NOT NULL,
  `received_quantity` decimal(15, 4) DEFAULT 0.0000,
  `pending_quantity` decimal(15, 4) GENERATED ALWAYS AS (`ordered_quantity` - `received_quantity`) VIRTUAL,
  `unit_cost` decimal(15, 4) NOT NULL,
  `discount_percentage` decimal(5, 2) DEFAULT 0.00,
  `tax_rate` decimal(5, 2) DEFAULT 19.00,
  `line_total` decimal(15, 4) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_purchase_order_line` (`purchase_order_id`, `line_number`),
  KEY `measurement_unit_id` (`measurement_unit_id`),
  KEY `idx_product_variant_id` (`product_variant_id`),
  KEY `idx_pending_quantity` (`pending_quantity`),
  CONSTRAINT `purchase_order_items_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_order_items_ibfk_2` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`),
  CONSTRAINT `purchase_order_items_ibfk_3` FOREIGN KEY (`measurement_unit_id`) REFERENCES `measurement_units` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `purchase_receipts`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `purchase_receipts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `receipt_code` varchar(50) NOT NULL,
  `purchase_order_id` bigint(20) unsigned DEFAULT NULL,
  `supplier_id` bigint(20) unsigned NOT NULL,
  `warehouse_id` bigint(20) unsigned NOT NULL,
  `document_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Documento de entrada o factura de compra',
  `supplier_document_number` varchar(100) DEFAULT NULL,
  `receipt_date` date NOT NULL,
  `received_by_user_id` bigint(20) unsigned NOT NULL,
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `receipt_code` (`receipt_code`),
  KEY `document_id` (`document_id`),
  KEY `received_by_user_id` (`received_by_user_id`),
  KEY `idx_purchase_order_id` (`purchase_order_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_receipt_date` (`receipt_date`),
  KEY `idx_status_id` (`status_id`),
  KEY `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `purchase_receipts_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `purchase_receipts_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
    CONSTRAINT `purchase_receipts_ibfk_3` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
    CONSTRAINT `purchase_receipts_ibfk_4` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `purchase_receipts_ibfk_5` FOREIGN KEY (`received_by_user_id`) REFERENCES `users` (`id`),
    CONSTRAINT `purchase_receipts_ibfk_6` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `purchase_receipt_items`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `purchase_receipt_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `purchase_receipt_id` bigint(20) unsigned NOT NULL,
  `purchase_order_item_id` bigint(20) unsigned DEFAULT NULL,
  `line_number` smallint(5) unsigned NOT NULL,
  `product_variant_id` bigint(20) unsigned NOT NULL,
  `measurement_unit_id` bigint(20) unsigned NOT NULL,
  `received_quantity` decimal(15, 4) NOT NULL,
  `accepted_quantity` decimal(15, 4) NOT NULL,
  `rejected_quantity` decimal(15, 4) DEFAULT 0.0000,
  `unit_cost` decimal(15, 4) NOT NULL,
  `batch_lot_number` varchar(100) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `warehouse_zone_id` bigint(20) unsigned DEFAULT NULL,
  `quality_status` enum('PENDING', 'ACCEPTED', 'REJECTED', 'PARTIAL') DEFAULT 'ACCEPTED',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_purchase_receipt_line` (`purchase_receipt_id`, `line_number`),
  KEY `purchase_order_item_id` (`purchase_order_item_id`),
  KEY `measurement_unit_id` (`measurement_unit_id`),
  KEY `warehouse_zone_id` (`warehouse_zone_id`),
  KEY `idx_product_variant_id` (`product_variant_id`),
  KEY `idx_quality_status` (`quality_status`),
  CONSTRAINT `purchase_receipt_items_ibfk_1` FOREIGN KEY (`purchase_receipt_id`) REFERENCES `purchase_receipts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_receipt_items_ibfk_2` FOREIGN KEY (`purchase_order_item_id`) REFERENCES `purchase_order_items` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `purchase_receipt_items_ibfk_3` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`),
    CONSTRAINT `purchase_receipt_items_ibfk_4` FOREIGN KEY (`measurement_unit_id`) REFERENCES `measurement_units` (`id`),
    CONSTRAINT `purchase_receipt_items_ibfk_5` FOREIGN KEY (`warehouse_zone_id`) REFERENCES `warehouse_zones` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `reorder_suggestions`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `reorder_suggestions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_variant_id` bigint(20) unsigned NOT NULL,
  `warehouse_id` bigint(20) unsigned NOT NULL,
  `current_stock` decimal(15, 4) NOT NULL,
  `minimum_stock` decimal(15, 4) NOT NULL,
  `safety_stock` decimal(15, 4) NOT NULL,
  `suggested_order_quantity` decimal(15, 4) NOT NULL,
  `avg_daily_consumption` decimal(15, 4) NOT NULL,
  `lead_time_days` int(10) unsigned NOT NULL,
  `stockout_risk_percentage` decimal(5, 2) NOT NULL COMMENT 'Porcentaje de riesgo de quiebre',
  `estimated_unit_cost` decimal(15, 2) DEFAULT NULL,
  `estimated_total_cost` decimal(15, 2) DEFAULT NULL,
  `priority_score` int(10) unsigned NOT NULL DEFAULT 50 COMMENT 'Puntuación de prioridad (0-100)',
  `urgency_level` enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
  `suggestion_status` enum(
    'PENDING',
    'REVIEWED',
    'ORDERED',
    'REJECTED',
    'EXPIRED'
  ) DEFAULT 'PENDING',
  `valid_until` date NOT NULL COMMENT 'Fecha de expiración de la sugerencia',
  `generated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reviewed_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `review_notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `reviewed_by_user_id` (`reviewed_by_user_id`),
  KEY `idx_product_variant_id` (`product_variant_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_priority_score` (`priority_score`),
  KEY `idx_urgency_level` (`urgency_level`),
  KEY `idx_suggestion_status` (`suggestion_status`),
  KEY `idx_valid_until` (`valid_until`),
  KEY `idx_generated_at` (`generated_at`),
  CONSTRAINT `reorder_suggestions_ibfk_1` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reorder_suggestions_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reorder_suggestions_ibfk_3` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `return_documents`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `return_documents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `return_number` varchar(50) NOT NULL,
  `original_document_id` bigint(20) unsigned NOT NULL COMMENT 'Documento original de venta',
  `customer_id` bigint(20) unsigned DEFAULT NULL,
  `return_reason_id` bigint(20) unsigned NOT NULL,
  `return_type` enum('REFUND', 'EXCHANGE', 'CREDIT_NOTE', 'STORE_CREDIT') NOT NULL,
  `total_return_amount` decimal(15, 2) NOT NULL DEFAULT 0.00,
  `refund_amount` decimal(15, 2) DEFAULT 0.00 COMMENT 'Monto a reembolsar',
  `exchange_amount` decimal(15, 2) DEFAULT 0.00 COMMENT 'Valor de productos de intercambio',
  `difference_amount` decimal(15, 2) DEFAULT 0.00 COMMENT 'Diferencia a pagar/devolver',
  `return_date` date NOT NULL,
  `original_sale_date` date NOT NULL,
  `days_since_sale` int(10) unsigned GENERATED ALWAYS AS (
    to_days(`return_date`) - to_days(`original_sale_date`)
  ) VIRTUAL,
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `requires_supervisor_approval` tinyint(1) DEFAULT 0,
  `processed_by_user_id` bigint(20) unsigned NOT NULL,
  `approved_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `supervisor_comments` text DEFAULT NULL,
  `customer_comments` text DEFAULT NULL COMMENT 'Comentarios del cliente',
  `internal_notes` text DEFAULT NULL COMMENT 'Notas internas',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `approved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `return_number` (`return_number`),
  KEY `approved_by_user_id` (`approved_by_user_id`),
  KEY `idx_return_number` (`return_number`),
  KEY `idx_original_document_id` (`original_document_id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_return_reason_id` (`return_reason_id`),
  KEY `idx_return_type` (`return_type`),
  KEY `idx_return_date` (`return_date`),
  KEY `idx_processed_by_user_id` (`processed_by_user_id`),
  KEY `idx_requires_supervisor_approval` (`requires_supervisor_approval`),
  KEY `idx_status_id` (`status_id`),
  CONSTRAINT `fk_return_documents_status` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`),
  CONSTRAINT `return_documents_ibfk_1` FOREIGN KEY (`original_document_id`) REFERENCES `documents` (`id`),
  CONSTRAINT `return_documents_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `return_documents_ibfk_3` FOREIGN KEY (`return_reason_id`) REFERENCES `return_reasons` (`id`),
    CONSTRAINT `return_documents_ibfk_4` FOREIGN KEY (`processed_by_user_id`) REFERENCES `users` (`id`),
    CONSTRAINT `return_documents_ibfk_5` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `return_document_items`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `return_document_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `return_document_id` bigint(20) unsigned NOT NULL,
  `original_document_item_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Línea original de venta',
  `product_variant_id` bigint(20) unsigned NOT NULL,
  `original_quantity` decimal(15, 4) NOT NULL COMMENT 'Cantidad original vendida',
  `return_quantity` decimal(15, 4) NOT NULL COMMENT 'Cantidad a devolver',
  `original_unit_price` decimal(15, 2) NOT NULL,
  `return_unit_price` decimal(15, 2) NOT NULL COMMENT 'Precio para el cálculo de devolución',
  `return_line_total` decimal(15, 2) NOT NULL,
  `product_condition` enum('NEW', 'USED', 'DAMAGED', 'DEFECTIVE') DEFAULT 'USED',
  `condition_notes` text DEFAULT NULL,
  `return_to_stock` tinyint(1) DEFAULT 1 COMMENT 'Si se devuelve al inventario',
  `warehouse_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Bodega donde se devuelve',
  `exchange_product_variant_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Producto de intercambio',
  `exchange_quantity` decimal(15, 4) DEFAULT NULL,
  `exchange_unit_price` decimal(15, 2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `idx_return_document_id` (`return_document_id`),
  KEY `idx_original_document_item_id` (`original_document_item_id`),
  KEY `idx_product_variant_id` (`product_variant_id`),
  KEY `idx_exchange_product_variant_id` (`exchange_product_variant_id`),
  KEY `idx_product_condition` (`product_condition`),
  KEY `idx_return_to_stock` (`return_to_stock`),
  CONSTRAINT `return_document_items_ibfk_1` FOREIGN KEY (`return_document_id`) REFERENCES `return_documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `return_document_items_ibfk_2` FOREIGN KEY (`original_document_item_id`) REFERENCES `document_items` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `return_document_items_ibfk_3` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`),
    CONSTRAINT `return_document_items_ibfk_4` FOREIGN KEY (`exchange_product_variant_id`) REFERENCES `product_variants` (`id`),
    CONSTRAINT `return_document_items_ibfk_5` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `return_reasons`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `return_reasons` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `reason_code` varchar(20) NOT NULL,
  `reason_name` varchar(100) NOT NULL,
  `reason_description` text DEFAULT NULL,
  `requires_approval` tinyint(1) DEFAULT 0 COMMENT 'Si requiere aprobación de supervisor',
  `affects_stock` tinyint(1) DEFAULT 1 COMMENT 'Si devuelve stock al inventario',
  `allows_exchange` tinyint(1) DEFAULT 1 COMMENT 'Si permite intercambio',
  `allows_refund` tinyint(1) DEFAULT 1 COMMENT 'Si permite reembolso',
  `max_days_after_sale` int(10) unsigned DEFAULT NULL COMMENT 'Días máximos después de la venta',
  `default_account_code` varchar(20) DEFAULT NULL COMMENT 'Cuenta contable por defecto',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reason_code` (`reason_code`),
  KEY `idx_reason_code` (`reason_code`),
  KEY `idx_requires_approval` (`requires_approval`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE = InnoDB AUTO_INCREMENT = 13 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `return_refunds`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `return_refunds` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `return_document_id` bigint(20) unsigned NOT NULL,
  `payment_method_id` bigint(20) unsigned NOT NULL,
  `refund_amount` decimal(15, 2) NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL COMMENT 'Número de referencia del reembolso',
  `transaction_id` varchar(100) DEFAULT NULL COMMENT 'ID de transacción de reversión',
  `refund_status` enum('PENDING', 'PROCESSED', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
  `processed_by_user_id` bigint(20) unsigned NOT NULL,
  `processed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_return_document_id` (`return_document_id`),
  KEY `idx_payment_method_id` (`payment_method_id`),
  KEY `idx_refund_status` (`refund_status`),
  KEY `idx_processed_by_user_id` (`processed_by_user_id`),
  CONSTRAINT `return_refunds_ibfk_1` FOREIGN KEY (`return_document_id`) REFERENCES `return_documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `return_refunds_ibfk_2` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`),
  CONSTRAINT `return_refunds_ibfk_3` FOREIGN KEY (`processed_by_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `roles`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `roles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `role_code` varchar(50) NOT NULL,
  `role_name` varchar(100) NOT NULL,
  `role_description` text DEFAULT NULL,
  `is_system_role` tinyint(1) DEFAULT 0 COMMENT 'No editable si es true',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_code` (`role_code`),
  KEY `idx_role_code` (`role_code`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE = InnoDB AUTO_INCREMENT = 7 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `role_permissions`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `role_permissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `role_id` bigint(20) unsigned NOT NULL,
  `permission_id` bigint(20) unsigned NOT NULL,
  `granted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Fecha de creacion del registro',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Fecha de ultima actualizacion del registro',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT 'Fecha de eliminacion logica',
  `granted_by_user_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`),
  KEY `granted_by_user_id` (`granted_by_user_id`),
  KEY `idx_role_id` (`role_id`),
  KEY `idx_permission_id` (`permission_id`),
  KEY `idx_role_permissions_role_id` (`role_id`),
  KEY `idx_role_permissions_composite` (`role_id`, `permission_id`),
  CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_ibfk_3` FOREIGN KEY (`granted_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB AUTO_INCREMENT = 543 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `sales_points`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `sales_points` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sales_point_code` varchar(20) NOT NULL COMMENT 'Codigo unico del punto de venta',
  `sales_point_name` varchar(100) NOT NULL COMMENT 'Nombre descriptivo del punto de venta',
  `warehouse_id` bigint(20) unsigned NOT NULL COMMENT 'Sucursal/bodega asociada',
  `default_cash_register_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Caja destino por defecto',
  `channel_type` varchar(30) NOT NULL DEFAULT 'STORE' COMMENT 'Canal: STORE, WEB, WHATSAPP, PHONE, OTHER',
  `location_description` varchar(255) DEFAULT NULL COMMENT 'Ubicacion o referencia operacional',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_point_code` (`sales_point_code`),
  KEY `idx_sales_point_code` (`sales_point_code`),
  KEY `idx_sales_point_warehouse_id` (`warehouse_id`),
  KEY `idx_sales_point_default_cash_register_id` (`default_cash_register_id`),
  KEY `idx_sales_point_channel_type` (`channel_type`),
  KEY `idx_sales_point_is_active` (`is_active`),
  KEY `idx_sales_point_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_sales_points_default_cash_register` FOREIGN KEY (`default_cash_register_id`) REFERENCES `cash_registers` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `fk_sales_points_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `sales_point_user_assignments`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `sales_point_user_assignments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sales_point_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `operator_role` varchar(30) NOT NULL DEFAULT 'SELLER',
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `valid_from` date DEFAULT NULL,
  `valid_until` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sales_point_user_assignment` (`sales_point_id`, `user_id`),
  KEY `idx_spua_sales_point_id` (`sales_point_id`),
  KEY `idx_spua_user_id` (`user_id`),
  KEY `idx_spua_operator_role` (`operator_role`),
  KEY `idx_spua_is_active` (`is_active`),
  KEY `idx_spua_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_spua_sales_point` FOREIGN KEY (`sales_point_id`) REFERENCES `sales_points` (`id`),
  CONSTRAINT `fk_spua_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `status_change_history`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

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
  KEY `status_change_history_ibfk_1` (`from_status_id`),
  KEY `status_change_history_ibfk_2` (`to_status_id`),
  KEY `status_change_history_ibfk_3` (`changed_by_user_id`),
  CONSTRAINT `status_change_history_ibfk_1` FOREIGN KEY (`from_status_id`) REFERENCES `system_statuses` (`id`),
  CONSTRAINT `status_change_history_ibfk_2` FOREIGN KEY (`to_status_id`) REFERENCES `system_statuses` (`id`),
  CONSTRAINT `status_change_history_ibfk_3` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `stock`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `stock` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_variant_id` bigint(20) unsigned NOT NULL,
  `warehouse_id` bigint(20) unsigned NOT NULL,
  `warehouse_zone_id` bigint(20) unsigned DEFAULT NULL,
  `warehouse_zone_location_id` bigint(20) unsigned DEFAULT NULL,
  `batch_lot_number` varchar(100) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `current_quantity` decimal(15, 4) NOT NULL DEFAULT 0.0000,
  `reserved_quantity` decimal(15, 4) NOT NULL DEFAULT 0.0000 COMMENT 'Stock reservado para órdenes',
  `available_quantity` decimal(15, 4) GENERATED ALWAYS AS (`current_quantity` - `reserved_quantity`) VIRTUAL,
  `minimum_stock` decimal(15, 4) DEFAULT 0.0000,
  `maximum_stock` decimal(15, 4) DEFAULT 0.0000,
  `last_movement_date` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `days_until_stockout` decimal(5, 2) DEFAULT NULL COMMENT 'Días estimados hasta agotamiento',
  `last_movement_type` enum('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT') DEFAULT NULL COMMENT 'Último tipo de movimiento',
  `rotation_category` enum('FAST', 'MEDIUM', 'SLOW', 'NO_MOVEMENT') DEFAULT NULL COMMENT 'Categoría de rotación',
  `last_sale_date` date DEFAULT NULL COMMENT 'Fecha de última venta',
  `avg_monthly_sales` decimal(15, 4) DEFAULT 0.0000 COMMENT 'Promedio mensual de ventas',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_stock_inventory_dimensions` (
    `product_variant_id`,
    `warehouse_id`,
    `warehouse_zone_id`,
    `warehouse_zone_location_id`,
    `batch_lot_number`,
    `expiry_date`
  ),
  KEY `idx_product_variant_id` (`product_variant_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_warehouse_zone_id` (`warehouse_zone_id`),
  KEY `idx_current_quantity` (`current_quantity`),
  KEY `idx_available_quantity` (`available_quantity`),
  KEY `idx_last_movement_date` (`last_movement_date`),
  KEY `idx_days_until_stockout` (`days_until_stockout`),
  KEY `idx_rotation_category` (`rotation_category`),
  KEY `idx_last_sale_date` (`last_sale_date`),
  KEY `idx_warehouse_zone_location_id` (`warehouse_zone_location_id`),
  KEY `idx_batch_lot_number` (`batch_lot_number`),
  KEY `idx_expiry_date` (`expiry_date`),
  CONSTRAINT `fk_stock_zone_location` FOREIGN KEY (`warehouse_zone_location_id`) REFERENCES `warehouse_zone_locations` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `stock_ibfk_1` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE,
    CONSTRAINT `stock_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE,
    CONSTRAINT `stock_ibfk_3` FOREIGN KEY (`warehouse_zone_id`) REFERENCES `warehouse_zones` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB AUTO_INCREMENT = 8571 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `stock_alerts`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `stock_alerts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_variant_id` bigint(20) unsigned NOT NULL,
  `warehouse_id` bigint(20) unsigned NOT NULL,
  `alert_type` enum(
    'LOW_STOCK',
    'OUT_OF_STOCK',
    'REORDER_POINT',
    'EXCESS_STOCK',
    'NO_MOVEMENT'
  ) NOT NULL,
  `alert_level` enum('INFO', 'WARNING', 'CRITICAL', 'URGENT') DEFAULT 'WARNING',
  `current_stock` decimal(15, 4) NOT NULL,
  `minimum_stock` decimal(15, 4) DEFAULT NULL,
  `reorder_point` decimal(15, 4) DEFAULT NULL,
  `days_until_stockout` decimal(5, 2) DEFAULT NULL COMMENT 'Días estimados hasta agotamiento',
  `alert_title` varchar(255) NOT NULL,
  `alert_message` text NOT NULL,
  `suggested_action` text DEFAULT NULL,
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `assigned_to_user_id` bigint(20) unsigned DEFAULT NULL,
  `acknowledged_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `acknowledged_at` timestamp NULL DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolution_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `acknowledged_by_user_id` (`acknowledged_by_user_id`),
  KEY `idx_product_variant_id` (`product_variant_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_alert_type` (`alert_type`),
  KEY `idx_alert_level` (`alert_level`),
  KEY `idx_assigned_to_user_id` (`assigned_to_user_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_status_id` (`status_id`),
  CONSTRAINT `fk_stock_alerts_status` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`),
  CONSTRAINT `stock_alerts_ibfk_1` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_alerts_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_alerts_ibfk_3` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `stock_alerts_ibfk_4` FOREIGN KEY (`acknowledged_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `stock_critical_config`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `stock_critical_config` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_variant_id` bigint(20) unsigned NOT NULL,
  `warehouse_id` bigint(20) unsigned NOT NULL,
  `minimum_stock` decimal(15, 4) NOT NULL DEFAULT 0.0000 COMMENT 'Stock mínimo (punto de reorden)',
  `maximum_stock` decimal(15, 4) DEFAULT NULL COMMENT 'Stock máximo recomendado',
  `safety_stock` decimal(15, 4) DEFAULT 0.0000 COMMENT 'Stock de seguridad',
  `reorder_point` decimal(15, 4) GENERATED ALWAYS AS (`minimum_stock` + `safety_stock`) VIRTUAL,
  `reorder_quantity` decimal(15, 4) DEFAULT NULL COMMENT 'Cantidad sugerida para reorden',
  `lead_time_days` int(10) unsigned DEFAULT 7 COMMENT 'Días de lead time del proveedor',
  `avg_daily_sales` decimal(15, 4) DEFAULT 0.0000 COMMENT 'Promedio de ventas diarias',
  `last_calculated_date` date DEFAULT NULL COMMENT 'Última fecha de cálculo de promedios',
  `alert_enabled` tinyint(1) DEFAULT 1,
  `last_alert_sent` timestamp NULL DEFAULT NULL,
  `alert_frequency_hours` int(10) unsigned DEFAULT 24 COMMENT 'Frecuencia de alertas en horas',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_product_warehouse_critical` (`product_variant_id`, `warehouse_id`),
  KEY `idx_product_variant_id` (`product_variant_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_minimum_stock` (`minimum_stock`),
  KEY `idx_reorder_point` (`reorder_point`),
  KEY `idx_alert_enabled` (`alert_enabled`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `stock_critical_config_ibfk_1` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_critical_config_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `stock_movements`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `stock_movements` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_variant_id` bigint(20) unsigned NOT NULL,
  `warehouse_id` bigint(20) unsigned NOT NULL,
  `warehouse_zone_id` bigint(20) unsigned DEFAULT NULL,
  `warehouse_zone_location_id` bigint(20) unsigned DEFAULT NULL,
  `movement_type` enum('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT') NOT NULL,
  `reference_type` enum(
    'PURCHASE',
    'SALE',
    'TRANSFER',
    'ADJUSTMENT',
    'RETURN',
    'DAMAGE'
  ) NOT NULL,
  `manual_movement_type` varchar(50) DEFAULT NULL,
  `measurement_unit_id` bigint(20) unsigned DEFAULT NULL,
  `movement_unit_quantity` decimal(15, 4) DEFAULT NULL,
  `reference_document_id` bigint(20) unsigned DEFAULT NULL COMMENT 'ID del documento que generó el movimiento',
  `quantity` decimal(15, 4) NOT NULL COMMENT 'Cantidad del movimiento (+ o -)',
  `quantity_before` decimal(15, 4) NOT NULL,
  `quantity_after` decimal(15, 4) NOT NULL,
  `unit_cost` decimal(15, 4) DEFAULT NULL,
  `total_cost` decimal(15, 4) DEFAULT NULL,
  `batch_lot_number` varchar(100) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `warehouse_zone_id` (`warehouse_zone_id`),
  KEY `idx_product_variant_id` (`product_variant_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_movement_type` (`movement_type`),
  KEY `idx_reference_type` (`reference_type`),
  KEY `idx_reference_document_id` (`reference_document_id`),
  KEY `idx_batch_lot_number` (`batch_lot_number`),
  KEY `idx_serial_number` (`serial_number`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_created_by_user_id` (`created_by_user_id`),
  KEY `idx_warehouse_zone_location_id` (`warehouse_zone_location_id`),
  KEY `idx_manual_movement_type` (`manual_movement_type`),
  KEY `fk_stock_movements_measurement_unit` (`measurement_unit_id`),
  CONSTRAINT `fk_stock_movements_measurement_unit` FOREIGN KEY (`measurement_unit_id`) REFERENCES `measurement_units` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `fk_stock_movements_zone_location` FOREIGN KEY (`warehouse_zone_location_id`) REFERENCES `warehouse_zone_locations` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `stock_movements_ibfk_1` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`),
    CONSTRAINT `stock_movements_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
    CONSTRAINT `stock_movements_ibfk_3` FOREIGN KEY (`warehouse_zone_id`) REFERENCES `warehouse_zones` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `stock_movements_ibfk_4` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 8572 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `stock_transfers`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `stock_transfers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `transfer_code` varchar(50) NOT NULL,
  `source_warehouse_id` bigint(20) unsigned NOT NULL,
  `target_warehouse_id` bigint(20) unsigned NOT NULL,
  `status` enum(
    'DRAFT',
    'SHIPPED',
    'RECEIVED',
    'LOCATED',
    'CANCELLED'
  ) DEFAULT 'DRAFT',
  `requested_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `shipped_at` timestamp NULL DEFAULT NULL,
  `received_at` timestamp NULL DEFAULT NULL,
  `located_at` timestamp NULL DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned NOT NULL,
  `shipped_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `received_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `located_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_stock_transfer_code` (`transfer_code`),
  KEY `created_by_user_id` (`created_by_user_id`),
  KEY `shipped_by_user_id` (`shipped_by_user_id`),
  KEY `received_by_user_id` (`received_by_user_id`),
  KEY `located_by_user_id` (`located_by_user_id`),
  KEY `idx_source_warehouse_id` (`source_warehouse_id`),
  KEY `idx_target_warehouse_id` (`target_warehouse_id`),
  KEY `idx_status` (`status`),
  KEY `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `stock_transfers_ibfk_1` FOREIGN KEY (`source_warehouse_id`) REFERENCES `warehouses` (`id`),
  CONSTRAINT `stock_transfers_ibfk_2` FOREIGN KEY (`target_warehouse_id`) REFERENCES `warehouses` (`id`),
  CONSTRAINT `stock_transfers_ibfk_3` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `stock_transfers_ibfk_4` FOREIGN KEY (`shipped_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `stock_transfers_ibfk_5` FOREIGN KEY (`received_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `stock_transfers_ibfk_6` FOREIGN KEY (`located_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `stock_transfer_items`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `stock_transfer_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `stock_transfer_id` bigint(20) unsigned NOT NULL,
  `product_variant_id` bigint(20) unsigned NOT NULL,
  `measurement_unit_id` bigint(20) unsigned NOT NULL,
  `quantity` decimal(15, 4) NOT NULL,
  `received_quantity` decimal(15, 4) DEFAULT NULL,
  `reception_status` varchar(20) DEFAULT NULL,
  `reception_notes` text DEFAULT NULL,
  `pending_putaway_quantity` decimal(15, 4) GENERATED ALWAYS AS (
    coalesce(`received_quantity`, 0) - `putaway_quantity`
  ) VIRTUAL,
  `putaway_quantity` decimal(15, 4) NOT NULL DEFAULT 0.0000,
  `source_warehouse_zone_id` bigint(20) unsigned DEFAULT NULL,
  `source_warehouse_zone_location_id` bigint(20) unsigned DEFAULT NULL,
  `batch_lot_number` varchar(100) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `target_pending_warehouse_zone_id` bigint(20) unsigned DEFAULT NULL,
  `target_pending_warehouse_zone_location_id` bigint(20) unsigned DEFAULT NULL,
  `unit_cost` decimal(15, 4) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `measurement_unit_id` (`measurement_unit_id`),
  KEY `source_warehouse_zone_location_id` (`source_warehouse_zone_location_id`),
  KEY `target_pending_warehouse_zone_location_id` (`target_pending_warehouse_zone_location_id`),
  KEY `idx_stock_transfer_id` (`stock_transfer_id`),
  KEY `idx_product_variant_id` (`product_variant_id`),
  KEY `idx_source_location` (
    `source_warehouse_zone_id`,
    `source_warehouse_zone_location_id`
  ),
  KEY `idx_target_pending_location` (
    `target_pending_warehouse_zone_id`,
    `target_pending_warehouse_zone_location_id`
  ),
  KEY `idx_transfer_batch_lot_number` (`batch_lot_number`),
  KEY `idx_transfer_expiry_date` (`expiry_date`),
  CONSTRAINT `stock_transfer_items_ibfk_1` FOREIGN KEY (`stock_transfer_id`) REFERENCES `stock_transfers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_transfer_items_ibfk_2` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`),
  CONSTRAINT `stock_transfer_items_ibfk_3` FOREIGN KEY (`measurement_unit_id`) REFERENCES `measurement_units` (`id`),
  CONSTRAINT `stock_transfer_items_ibfk_4` FOREIGN KEY (`source_warehouse_zone_id`) REFERENCES `warehouse_zones` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `stock_transfer_items_ibfk_5` FOREIGN KEY (`source_warehouse_zone_location_id`) REFERENCES `warehouse_zone_locations` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `stock_transfer_items_ibfk_6` FOREIGN KEY (`target_pending_warehouse_zone_id`) REFERENCES `warehouse_zones` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `stock_transfer_items_ibfk_7` FOREIGN KEY (`target_pending_warehouse_zone_location_id`) REFERENCES `warehouse_zone_locations` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `stock_transfer_putaways`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `stock_transfer_putaways` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `stock_transfer_item_id` bigint(20) unsigned NOT NULL,
  `warehouse_zone_id` bigint(20) unsigned DEFAULT NULL,
  `warehouse_zone_location_id` bigint(20) unsigned DEFAULT NULL,
  `quantity` decimal(15, 4) NOT NULL,
  `located_by_user_id` bigint(20) unsigned NOT NULL,
  `located_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `warehouse_zone_location_id` (`warehouse_zone_location_id`),
  KEY `located_by_user_id` (`located_by_user_id`),
  KEY `idx_stock_transfer_item_id` (`stock_transfer_item_id`),
  KEY `idx_putaway_location` (`warehouse_zone_id`, `warehouse_zone_location_id`),
  KEY `idx_located_at` (`located_at`),
  CONSTRAINT `stock_transfer_putaways_ibfk_1` FOREIGN KEY (`stock_transfer_item_id`) REFERENCES `stock_transfer_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_transfer_putaways_ibfk_2` FOREIGN KEY (`warehouse_zone_id`) REFERENCES `warehouse_zones` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `stock_transfer_putaways_ibfk_3` FOREIGN KEY (`warehouse_zone_location_id`) REFERENCES `warehouse_zone_locations` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `stock_transfer_putaways_ibfk_4` FOREIGN KEY (`located_by_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `suppliers`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `suppliers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `supplier_code` varchar(50) NOT NULL,
  `supplier_type` enum('COMPANY', 'INDIVIDUAL', 'FOREIGN') DEFAULT 'COMPANY',
  `tax_id` varchar(20) DEFAULT NULL,
  `legal_name` varchar(255) NOT NULL,
  `commercial_name` varchar(255) DEFAULT NULL,
  `business_activity` varchar(255) DEFAULT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `mobile` varchar(30) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `default_currency_code` char(3) DEFAULT 'CLP',
  `default_payment_terms_days` int(10) unsigned DEFAULT 30,
  `default_tax_rate` decimal(5, 2) DEFAULT 19.00,
  `credit_limit` decimal(15, 2) DEFAULT 0.00,
  `current_balance` decimal(15, 2) DEFAULT 0.00,
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `internal_notes` text DEFAULT NULL,
  `logo_media_asset_id` bigint(20) unsigned DEFAULT NULL,
  `banner_media_asset_id` bigint(20) unsigned DEFAULT NULL,
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplier_code` (`supplier_code`),
  UNIQUE KEY `uk_suppliers_tax_id` (`tax_id`),
  KEY `created_by_user_id` (`created_by_user_id`),
  KEY `idx_supplier_code` (`supplier_code`),
  KEY `idx_tax_id` (`tax_id`),
  KEY `idx_legal_name` (`legal_name`),
  KEY `idx_status_id` (`status_id`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `fk_suppliers_default_currency` (`default_currency_code`),
  KEY `idx_suppliers_logo_media_asset_id` (`logo_media_asset_id`),
  KEY `idx_suppliers_banner_media_asset_id` (`banner_media_asset_id`),
  CONSTRAINT `fk_suppliers_default_currency` FOREIGN KEY (`default_currency_code`) REFERENCES `currencies` (`currency_code`),
  CONSTRAINT `suppliers_ibfk_1` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `suppliers_ibfk_2` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB AUTO_INCREMENT = 3 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `supplier_addresses`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `supplier_addresses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `supplier_id` bigint(20) unsigned NOT NULL,
  `address_type` enum('BILLING', 'SHIPPING', 'OFFICE', 'OTHER') DEFAULT 'BILLING',
  `address_line` text NOT NULL,
  `city` varchar(100) DEFAULT NULL,
  `region` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT 'Chile',
  `postal_code` varchar(20) DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_address_type` (`address_type`),
  KEY `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `supplier_addresses_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `supplier_contacts`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `supplier_contacts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `supplier_id` bigint(20) unsigned NOT NULL,
  `contact_name` varchar(255) NOT NULL,
  `position` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `mobile` varchar(30) DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `is_purchase_contact` tinyint(1) DEFAULT 1,
  `is_payment_contact` tinyint(1) DEFAULT 0,
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_is_primary` (`is_primary`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `supplier_contacts_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `supplier_payments`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `supplier_payments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `payment_code` varchar(50) NOT NULL,
  `supplier_id` bigint(20) unsigned NOT NULL,
  `payment_method_id` bigint(20) unsigned NOT NULL,
  `payment_amount` decimal(15, 2) NOT NULL,
  `allocated_amount` decimal(15, 2) DEFAULT 0.00,
  `unallocated_amount` decimal(15, 2) GENERATED ALWAYS AS (`payment_amount` - `allocated_amount`) VIRTUAL,
  `payment_date` date NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `bank_name` varchar(100) DEFAULT NULL,
  `account_number` varchar(50) DEFAULT NULL,
  `check_date` date DEFAULT NULL,
  `check_status` enum('PENDING', 'DEPOSITED', 'CLEARED', 'BOUNCED') DEFAULT NULL,
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `is_prepayment` tinyint(1) DEFAULT 0,
  `notes` text DEFAULT NULL,
  `processed_by_user_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_code` (`payment_code`),
  KEY `processed_by_user_id` (`processed_by_user_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_payment_method_id` (`payment_method_id`),
  KEY `idx_payment_date` (`payment_date`),
  KEY `idx_status_id` (`status_id`),
  KEY `idx_check_date` (`check_date`),
  CONSTRAINT `supplier_payments_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `supplier_payments_ibfk_2` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`),
  CONSTRAINT `supplier_payments_ibfk_3` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `supplier_payments_ibfk_4` FOREIGN KEY (`processed_by_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `supplier_payment_allocations`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `supplier_payment_allocations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `supplier_payment_id` bigint(20) unsigned NOT NULL,
  `accounts_payable_id` bigint(20) unsigned NOT NULL,
  `allocated_amount` decimal(15, 2) NOT NULL,
  `allocation_date` date NOT NULL,
  `allocation_type` enum('AUTOMATIC', 'MANUAL') DEFAULT 'MANUAL',
  `applied_by_user_id` bigint(20) unsigned NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `applied_by_user_id` (`applied_by_user_id`),
  KEY `idx_supplier_payment_id` (`supplier_payment_id`),
  KEY `idx_accounts_payable_id` (`accounts_payable_id`),
  KEY `idx_allocation_date` (`allocation_date`),
  CONSTRAINT `supplier_payment_allocations_ibfk_1` FOREIGN KEY (`supplier_payment_id`) REFERENCES `supplier_payments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `supplier_payment_allocations_ibfk_2` FOREIGN KEY (`accounts_payable_id`) REFERENCES `accounts_payable` (`id`) ON DELETE CASCADE,
  CONSTRAINT `supplier_payment_allocations_ibfk_3` FOREIGN KEY (`applied_by_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `supplier_products`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `supplier_products` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `supplier_id` bigint(20) unsigned NOT NULL,
  `product_variant_id` bigint(20) unsigned NOT NULL,
  `supplier_sku` varchar(100) DEFAULT NULL,
  `supplier_barcode` varchar(255) DEFAULT NULL,
  `supplier_product_name` varchar(255) DEFAULT NULL,
  `measurement_unit_id` bigint(20) unsigned DEFAULT NULL,
  `minimum_order_quantity` decimal(15, 4) DEFAULT 1.0000,
  `package_quantity` decimal(15, 4) DEFAULT 1.0000,
  `last_purchase_cost` decimal(15, 4) DEFAULT NULL,
  `lead_time_days` int(10) unsigned DEFAULT 7,
  `is_preferred` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_supplier_product` (`supplier_id`, `product_variant_id`),
  KEY `measurement_unit_id` (`measurement_unit_id`),
  KEY `idx_product_variant_id` (`product_variant_id`),
  KEY `idx_supplier_sku` (`supplier_sku`),
  KEY `idx_is_preferred` (`is_preferred`),
  KEY `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `supplier_products_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `supplier_products_ibfk_2` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `supplier_products_ibfk_3` FOREIGN KEY (`measurement_unit_id`) REFERENCES `measurement_units` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `system_features`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `system_features` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `feature_code` varchar(100) NOT NULL,
  `feature_name` varchar(150) NOT NULL,
  `feature_description` text DEFAULT NULL,
  `feature_type` enum('BOOLEAN', 'STRING', 'INTEGER', 'JSON') DEFAULT 'BOOLEAN',
  `default_value` text DEFAULT NULL,
  `current_value` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by_user_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `feature_code` (`feature_code`),
  KEY `updated_by_user_id` (`updated_by_user_id`),
  KEY `idx_feature_code` (`feature_code`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `system_features_ibfk_1` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB AUTO_INCREMENT = 36 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `system_statuses`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

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
) ENGINE = InnoDB AUTO_INCREMENT = 81 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `tax_book_entries`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `tax_book_entries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tax_period_id` bigint(20) unsigned NOT NULL,
  `book_type` enum('SALES', 'PURCHASES') NOT NULL,
  `document_id` bigint(20) unsigned NOT NULL,
  `document_type_code` varchar(50) NOT NULL,
  `document_number` varchar(50) NOT NULL,
  `document_date` date NOT NULL,
  `counterparty_tax_id` varchar(20) DEFAULT NULL,
  `counterparty_name` varchar(255) DEFAULT NULL,
  `net_amount` decimal(15, 2) DEFAULT 0.00,
  `exempt_amount` decimal(15, 2) DEFAULT 0.00,
  `tax_amount` decimal(15, 2) DEFAULT 0.00,
  `total_amount` decimal(15, 2) DEFAULT 0.00,
  `dte_type_code` varchar(10) DEFAULT NULL,
  `dte_folio` bigint(20) unsigned DEFAULT NULL,
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tax_book_document` (`book_type`, `document_id`),
  KEY `document_id` (`document_id`),
  KEY `status_id` (`status_id`),
  KEY `idx_tax_period_id` (`tax_period_id`),
  KEY `idx_book_type` (`book_type`),
  KEY `idx_document_date` (`document_date`),
  KEY `idx_counterparty_tax_id` (`counterparty_tax_id`),
  CONSTRAINT `tax_book_entries_ibfk_1` FOREIGN KEY (`tax_period_id`) REFERENCES `tax_periods` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tax_book_entries_ibfk_2` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`),
  CONSTRAINT `tax_book_entries_ibfk_3` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `tax_periods`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `tax_periods` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tax_year` smallint(5) unsigned NOT NULL,
  `tax_month` tinyint(3) unsigned NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `closed_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `closed_at` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tax_period` (`tax_year`, `tax_month`),
  KEY `closed_by_user_id` (`closed_by_user_id`),
  KEY `idx_period_dates` (`period_start`, `period_end`),
  KEY `idx_status_id` (`status_id`),
  CONSTRAINT `tax_periods_ibfk_1` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `tax_periods_ibfk_2` FOREIGN KEY (`closed_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `tax_rates`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `tax_rates` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tax_code` varchar(20) NOT NULL,
  `tax_name` varchar(100) NOT NULL,
  `tax_type` enum(
    'VAT',
    'EXEMPT',
    'ADDITIONAL',
    'WITHHOLDING',
    'OTHER'
  ) NOT NULL DEFAULT 'VAT',
  `rate_percentage` decimal(7, 4) NOT NULL DEFAULT 0.0000,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `valid_from` date NOT NULL,
  `valid_to` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_code` (`tax_code`),
  KEY `idx_tax_code` (`tax_code`),
  KEY `idx_tax_type` (`tax_type`),
  KEY `idx_tax_valid_from` (`valid_from`),
  KEY `idx_tax_is_active` (`is_active`),
  KEY `idx_tax_deleted_at` (`deleted_at`)
) ENGINE = InnoDB AUTO_INCREMENT = 6 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `transfer_receptions`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `transfer_receptions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `transfer_document_id` bigint(20) unsigned NOT NULL,
  `reception_code` varchar(50) NOT NULL,
  `source_warehouse_id` bigint(20) unsigned NOT NULL,
  `target_warehouse_id` bigint(20) unsigned NOT NULL,
  `shipped_at` timestamp NULL DEFAULT NULL,
  `received_at` timestamp NULL DEFAULT NULL,
  `received_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `status_id` bigint(20) unsigned DEFAULT NULL,
  `has_differences` tinyint(1) DEFAULT 0,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `reception_code` (`reception_code`),
  KEY `source_warehouse_id` (`source_warehouse_id`),
  KEY `received_by_user_id` (`received_by_user_id`),
  KEY `idx_transfer_document_id` (`transfer_document_id`),
  KEY `idx_target_warehouse_id` (`target_warehouse_id`),
  KEY `idx_status_id` (`status_id`),
  KEY `idx_has_differences` (`has_differences`),
  CONSTRAINT `transfer_receptions_ibfk_1` FOREIGN KEY (`transfer_document_id`) REFERENCES `documents` (`id`),
  CONSTRAINT `transfer_receptions_ibfk_2` FOREIGN KEY (`source_warehouse_id`) REFERENCES `warehouses` (`id`),
  CONSTRAINT `transfer_receptions_ibfk_3` FOREIGN KEY (`target_warehouse_id`) REFERENCES `warehouses` (`id`),
  CONSTRAINT `transfer_receptions_ibfk_4` FOREIGN KEY (`received_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL,
    CONSTRAINT `transfer_receptions_ibfk_5` FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `transfer_reception_items`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `transfer_reception_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `transfer_reception_id` bigint(20) unsigned NOT NULL,
  `document_item_id` bigint(20) unsigned NOT NULL,
  `product_variant_id` bigint(20) unsigned NOT NULL,
  `measurement_unit_id` bigint(20) unsigned NOT NULL,
  `shipped_quantity` decimal(15, 4) NOT NULL,
  `received_quantity` decimal(15, 4) NOT NULL,
  `difference_quantity` decimal(15, 4) GENERATED ALWAYS AS (`received_quantity` - `shipped_quantity`) VIRTUAL,
  `difference_reason` enum(
    'NONE',
    'SHORTAGE',
    'OVERAGE',
    'DAMAGED',
    'WRONG_PRODUCT',
    'OTHER'
  ) DEFAULT 'NONE',
  `target_warehouse_zone_id` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `document_item_id` (`document_item_id`),
  KEY `measurement_unit_id` (`measurement_unit_id`),
  KEY `target_warehouse_zone_id` (`target_warehouse_zone_id`),
  KEY `idx_transfer_reception_id` (`transfer_reception_id`),
  KEY `idx_product_variant_id` (`product_variant_id`),
  KEY `idx_difference_reason` (`difference_reason`),
  CONSTRAINT `transfer_reception_items_ibfk_1` FOREIGN KEY (`transfer_reception_id`) REFERENCES `transfer_receptions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transfer_reception_items_ibfk_2` FOREIGN KEY (`document_item_id`) REFERENCES `document_items` (`id`),
  CONSTRAINT `transfer_reception_items_ibfk_3` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`),
  CONSTRAINT `transfer_reception_items_ibfk_4` FOREIGN KEY (`measurement_unit_id`) REFERENCES `measurement_units` (`id`),
  CONSTRAINT `transfer_reception_items_ibfk_5` FOREIGN KEY (`target_warehouse_zone_id`) REFERENCES `warehouse_zones` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `users`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL COMMENT 'bcrypt password hash',
  `secret` varchar(64) DEFAULT NULL COMMENT 'Secret individual del usuario para JWT doble secreto',
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `last_login_ip` varchar(45) DEFAULT NULL,
  `password_changed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  `petty_cash_limit` decimal(15, 2) DEFAULT NULL COMMENT 'Límite máximo para gastos de caja chica individual',
  `avatar_media_asset_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `idx_secret` (`secret`),
  KEY `idx_users_secret` (`secret`),
  KEY `idx_users_login_lookup` (`username`, `email`, `is_active`, `deleted_at`),
  KEY `idx_users_active_status` (`is_active`, `deleted_at`)
) ENGINE = InnoDB AUTO_INCREMENT = 10 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `user_menu_favorites`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `user_menu_favorites` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `menu_item_id` bigint(20) unsigned NOT NULL,
  `favorite_order` int(10) unsigned DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_favorite` (`user_id`, `menu_item_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_menu_item_id` (`menu_item_id`),
  KEY `idx_favorite_order` (`favorite_order`),
  CONSTRAINT `user_menu_favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_menu_favorites_ibfk_2` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 17 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `user_notifications`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `user_notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `notification_type_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `title` varchar(180) NOT NULL,
  `message` text NOT NULL,
  `action_url` varchar(500) DEFAULT NULL,
  `action_label` varchar(80) DEFAULT NULL,
  `source_table` varchar(100) DEFAULT NULL,
  `source_id` bigint(20) unsigned DEFAULT NULL,
  `source_label` varchar(120) DEFAULT NULL,
  `priority` enum('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `read_at` timestamp NULL DEFAULT NULL,
  `delivered_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_read` (`user_id`, `is_read`),
  KEY `idx_user_delivered` (`user_id`, `delivered_at`),
  KEY `idx_notification_type_id` (`notification_type_id`),
  KEY `idx_priority` (`priority`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `idx_user_notifications_source_label` (`source_label`),
  CONSTRAINT `user_notifications_ibfk_1` FOREIGN KEY (`notification_type_id`) REFERENCES `notification_types` (`id`),
  CONSTRAINT `user_notifications_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 3 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `user_notification_preferences`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `user_notification_preferences` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `notification_type_id` bigint(20) unsigned NOT NULL,
  `receive_in_app` tinyint(1) DEFAULT 1,
  `receive_email` tinyint(1) DEFAULT 0,
  `receive_push` tinyint(1) DEFAULT 0,
  `muted_until` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_notification_preference` (`user_id`, `notification_type_id`),
  KEY `idx_user_notification_preference_user` (`user_id`),
  KEY `idx_user_notification_preference_type` (`notification_type_id`),
  KEY `idx_user_notification_preference_active` (`is_active`),
  CONSTRAINT `user_notification_preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_notification_preferences_ibfk_2` FOREIGN KEY (`notification_type_id`) REFERENCES `notification_types` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `user_permissions`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `user_permissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `permission_id` bigint(20) unsigned NOT NULL,
  `permission_type` enum('GRANT', 'DENY') DEFAULT 'GRANT',
  `granted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `granted_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_permission` (`user_id`, `permission_id`),
  KEY `granted_by_user_id` (`granted_by_user_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_permission_id` (`permission_id`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_user_permissions_user_id` (`user_id`),
  KEY `idx_user_permissions_composite` (`user_id`, `permission_id`, `permission_type`),
  KEY `idx_user_permissions_deleted_at` (`deleted_at`),
  CONSTRAINT `user_permissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_permissions_ibfk_3` FOREIGN KEY (`granted_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB AUTO_INCREMENT = 45 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `user_preferences`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `user_preferences` (
  `user_id` bigint(20) unsigned NOT NULL,
  `theme` varchar(20) DEFAULT NULL,
  `timezone` varchar(80) DEFAULT NULL,
  `hour_format` enum('24h', '12h') DEFAULT '24h',
  `table_page_size` int(10) unsigned DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_user_preferences_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `user_roles`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `user_roles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `role_id` bigint(20) unsigned NOT NULL,
  `assigned_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Fecha de creacion del registro',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Fecha de ultima actualizacion del registro',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT 'Fecha de eliminacion logica',
  `assigned_by_user_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
  KEY `assigned_by_user_id` (`assigned_by_user_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_role_id` (`role_id`),
  KEY `idx_user_roles_user_id` (`user_id`),
  KEY `idx_user_roles_composite` (`user_id`, `role_id`),
  CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_roles_ibfk_3` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
    NULL
) ENGINE = InnoDB AUTO_INCREMENT = 10 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `user_session_history`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `user_session_history` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `session_id` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `login_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `logout_at` timestamp NULL DEFAULT NULL,
  `last_seen_at` timestamp NULL DEFAULT NULL,
  `login_method` varchar(40) DEFAULT NULL,
  `logout_method` varchar(40) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `browser_name` varchar(80) DEFAULT NULL,
  `browser_version` varchar(80) DEFAULT NULL,
  `os_name` varchar(80) DEFAULT NULL,
  `device_type` varchar(40) DEFAULT NULL,
  `client_timezone` varchar(80) DEFAULT NULL,
  `client_language` varchar(120) DEFAULT NULL,
  `client_platform` varchar(120) DEFAULT NULL,
  `client_vendor` varchar(120) DEFAULT NULL,
  `hardware_concurrency` int(10) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_session_history_session` (`session_id`),
  KEY `idx_user_session_history_user_login` (`user_id`, `login_at`),
  KEY `idx_user_session_history_active` (`user_id`, `is_active`),
  KEY `idx_user_session_history_ip` (`ip_address`),
  CONSTRAINT `fk_user_session_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 6 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `user_warehouse_access`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `user_warehouse_access` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `warehouse_id` bigint(20) unsigned NOT NULL,
  `access_type` enum('FULL', 'READ_ONLY', 'DENIED') DEFAULT 'READ_ONLY',
  `granted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `granted_by_user_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_warehouse` (`user_id`, `warehouse_id`),
  KEY `granted_by_user_id` (`granted_by_user_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_access_type` (`access_type`),
  CONSTRAINT `user_warehouse_access_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_warehouse_access_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_warehouse_access_ibfk_3` FOREIGN KEY (`granted_by_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 6 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `warehouses`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `warehouses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `warehouse_code` varchar(20) NOT NULL,
  `warehouse_name` varchar(150) NOT NULL,
  `warehouse_type` enum('WAREHOUSE', 'STORE', 'OUTLET') DEFAULT 'WAREHOUSE',
  `responsible_user_id` bigint(20) unsigned NOT NULL COMMENT 'Usuario responsable único',
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `warehouse_code` (`warehouse_code`),
  KEY `idx_warehouse_code` (`warehouse_code`),
  KEY `idx_warehouse_type` (`warehouse_type`),
  KEY `idx_responsible_user_id` (`responsible_user_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `warehouses_ibfk_1` FOREIGN KEY (`responsible_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 6 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `warehouse_zones`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `warehouse_zones` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `warehouse_id` bigint(20) unsigned NOT NULL,
  `zone_code` varchar(20) NOT NULL,
  `zone_name` varchar(100) NOT NULL,
  `zone_description` text DEFAULT NULL,
  `is_location_tracking_enabled` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_warehouse_zone` (`warehouse_id`, `zone_code`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_zone_code` (`zone_code`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `warehouse_zones_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 20 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

DROP TABLE IF EXISTS `warehouse_zone_locations`;

/*!40101 SET @saved_cs_client     = @@character_set_client */
;

/*!40101 SET character_set_client = utf8mb4 */
;

CREATE TABLE `warehouse_zone_locations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `warehouse_zone_id` bigint(20) unsigned NOT NULL,
  `location_code` varchar(24) NOT NULL,
  `location_name` varchar(120) NOT NULL,
  `location_description` text DEFAULT NULL,
  `location_type` enum(
    'GENERAL',
    'AISLE',
    'RACK',
    'SHELF',
    'BIN',
    'DISPLAY',
    'OTHER'
  ) DEFAULT 'GENERAL',
  `sort_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_zone_location_code` (`warehouse_zone_id`, `location_code`),
  KEY `idx_warehouse_zone_id` (`warehouse_zone_id`),
  KEY `idx_location_code` (`location_code`),
  KEY `idx_location_type` (`location_type`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `warehouse_zone_locations_ibfk_1` FOREIGN KEY (`warehouse_zone_id`) REFERENCES `warehouse_zones` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 18 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */
;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */
;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */
;

/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */
;

/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */
;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */
;

/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */
;

/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */
;

/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */
;
