-- Aplica el módulo de denominaciones de efectivo a una BD ya inicializada.
-- Combina las migraciones del 20260612 que no fueron ejecutadas en caliente
-- y asegura que el usuario root (SUPER_ADMIN) tenga los permisos necesarios.
-- Todos los statements son idempotentes (IF NOT EXISTS / INSERT IGNORE / ON DUPLICATE KEY).
USE inventario;

-- ── 1. Tabla de denominaciones ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `currency_denominations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `denomination_value` int(11) NOT NULL COMMENT 'Valor en CLP',
  `denomination_type` enum('COIN','BILL') NOT NULL,
  `denomination_label` varchar(50) NOT NULL,
  `sort_order` int(10) unsigned NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_denomination_value` (`denomination_value`),
  KEY `idx_denomination_type` (`denomination_type`),
  KEY `idx_sort_order` (`sort_order`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO `currency_denominations`
  (`denomination_value`, `denomination_type`, `denomination_label`, `sort_order`, `is_active`)
VALUES
  (5,      'COIN', '$5',       10, 1),
  (10,     'COIN', '$10',      20, 1),
  (50,     'COIN', '$50',      30, 1),
  (100,    'COIN', '$100',     40, 1),
  (500,    'COIN', '$500',     50, 1),
  (1000,   'BILL', '$1.000',   60, 1),
  (2000,   'BILL', '$2.000',   70, 1),
  (5000,   'BILL', '$5.000',   80, 1),
  (10000,  'BILL', '$10.000',  90, 1),
  (20000,  'BILL', '$20.000', 100, 1);

-- ── 2. Tabla de conteos por sesión ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `cash_session_denomination_counts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `cash_register_session_id` bigint(20) unsigned NOT NULL,
  `currency_denomination_id` bigint(20) unsigned NOT NULL,
  `count_type` enum('OPENING','CLOSING') NOT NULL,
  `quantity` int(10) unsigned NOT NULL DEFAULT 0,
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_session_denom_type` (`cash_register_session_id`, `currency_denomination_id`, `count_type`),
  KEY `idx_csdc_session_id` (`cash_register_session_id`),
  KEY `idx_csdc_denomination_id` (`currency_denomination_id`),
  CONSTRAINT `fk_csdc_session` FOREIGN KEY (`cash_register_session_id`) REFERENCES `cash_register_sessions` (`id`),
  CONSTRAINT `fk_csdc_denomination` FOREIGN KEY (`currency_denomination_id`) REFERENCES `currency_denominations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── 3. Ítem de menú bajo Administración (parent_id=8) ────────────────────────

INSERT INTO `menu_items`
  (`menu_code`, `menu_name`, `menu_description`, `icon_name`, `menu_url`,
   `menu_type`, `parent_id`, `required_permission_id`,
   `is_active`, `is_visible`, `sort_order`, `menu_level`, `menu_path`, `target_window`)
VALUES
  ('cash_denominations_admin',
   'Denominaciones de efectivo',
   'Administracion de billetes y monedas para arqueo y apertura de caja.',
   'money-dollar-circle-line',
   '/admin/cash/denominations',
   'LINK',
   8,
   (SELECT id FROM permissions WHERE permission_code = 'FINANCE_MAINTAINERS_MANAGE'),
   1, 1, 45, 2, '/admin/cash/denominations', 'SELF')
ON DUPLICATE KEY UPDATE
  menu_name              = VALUES(menu_name),
  menu_url               = VALUES(menu_url),
  required_permission_id = VALUES(required_permission_id),
  is_active              = 1,
  is_visible             = 1,
  updated_at             = NOW();

-- ── 4. Permisos de SUPER_ADMIN para acceso a la API del mantenedor ────────────

INSERT IGNORE INTO `role_permissions`
  (`role_id`, `permission_id`, `granted_at`, `created_at`, `updated_at`)
SELECT 6, p.id, NOW(), NOW(), NOW()
FROM `permissions` p
WHERE p.permission_code IN ('FINANCE_MAINTAINERS_ACCESS', 'FINANCE_MAINTAINERS_MANAGE')
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.role_id = 6 AND rp.permission_id = p.id AND rp.deleted_at IS NULL
  );
