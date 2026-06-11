-- =====================================================
-- Schema estados centralizados
-- Archivo: 20260603_1347_schema_status.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

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

SET FOREIGN_KEY_CHECKS = 1;
