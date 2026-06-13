-- Crea historial de observaciones por etapa para sesiones de caja.
USE inventario;

CREATE TABLE IF NOT EXISTS `cash_session_observations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `cash_register_session_id` bigint(20) unsigned NOT NULL,
  `observation_type` enum('OPENING','CLOSING','CASH_COUNT','APPROVAL','REJECTION') NOT NULL,
  `observation_text` text NOT NULL,
  `observed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_cso_session_id` (`cash_register_session_id`),
  KEY `idx_cso_observation_type` (`observation_type`),
  KEY `idx_cso_observed_at` (`observed_at`),
  KEY `idx_cso_created_by_user_id` (`created_by_user_id`),
  CONSTRAINT `fk_cso_session` FOREIGN KEY (`cash_register_session_id`) REFERENCES `cash_register_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cso_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `cash_session_observations` (
  `cash_register_session_id`,
  `observation_type`,
  `observation_text`,
  `observed_at`,
  `created_by_user_id`,
  `created_at`,
  `updated_at`
)
SELECT
  crs.id,
  'OPENING',
  crs.opening_notes,
  COALESCE(crs.opening_datetime, crs.created_at, CURRENT_TIMESTAMP),
  crs.cashier_user_id,
  COALESCE(crs.created_at, CURRENT_TIMESTAMP),
  COALESCE(crs.updated_at, CURRENT_TIMESTAMP)
FROM cash_register_sessions crs
WHERE crs.opening_notes IS NOT NULL
  AND TRIM(crs.opening_notes) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM cash_session_observations cso
    WHERE cso.cash_register_session_id = crs.id
      AND cso.observation_type = 'OPENING'
      AND cso.observation_text = crs.opening_notes
  );

INSERT INTO `cash_session_observations` (
  `cash_register_session_id`,
  `observation_type`,
  `observation_text`,
  `observed_at`,
  `created_by_user_id`,
  `created_at`,
  `updated_at`
)
SELECT
  crs.id,
  'CLOSING',
  TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(crs.closing_notes, '\n[Supervisor]:', 1), '\n[Rechazado por supervisor]:', 1)),
  COALESCE(crs.closing_datetime, crs.updated_at, CURRENT_TIMESTAMP),
  crs.cashier_user_id,
  COALESCE(crs.created_at, CURRENT_TIMESTAMP),
  COALESCE(crs.updated_at, CURRENT_TIMESTAMP)
FROM cash_register_sessions crs
WHERE crs.closing_notes IS NOT NULL
  AND TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(crs.closing_notes, '\n[Supervisor]:', 1), '\n[Rechazado por supervisor]:', 1)) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM cash_session_observations cso
    WHERE cso.cash_register_session_id = crs.id
      AND cso.observation_type = 'CLOSING'
  );

INSERT INTO `cash_session_observations` (
  `cash_register_session_id`,
  `observation_type`,
  `observation_text`,
  `observed_at`,
  `created_by_user_id`,
  `created_at`,
  `updated_at`
)
SELECT
  crs.id,
  'APPROVAL',
  TRIM(SUBSTRING_INDEX(crs.closing_notes, '\n[Supervisor]:', -1)),
  COALESCE(crs.approved_datetime, crs.updated_at, CURRENT_TIMESTAMP),
  crs.supervisor_user_id,
  COALESCE(crs.created_at, CURRENT_TIMESTAMP),
  COALESCE(crs.updated_at, CURRENT_TIMESTAMP)
FROM cash_register_sessions crs
WHERE crs.closing_notes LIKE '%\n[Supervisor]:%'
  AND TRIM(SUBSTRING_INDEX(crs.closing_notes, '\n[Supervisor]:', -1)) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM cash_session_observations cso
    WHERE cso.cash_register_session_id = crs.id
      AND cso.observation_type = 'APPROVAL'
  );

INSERT INTO `cash_session_observations` (
  `cash_register_session_id`,
  `observation_type`,
  `observation_text`,
  `observed_at`,
  `created_by_user_id`,
  `created_at`,
  `updated_at`
)
SELECT
  crs.id,
  'REJECTION',
  TRIM(SUBSTRING_INDEX(crs.closing_notes, '[Rechazado por supervisor]:', -1)),
  COALESCE(crs.approved_datetime, crs.updated_at, CURRENT_TIMESTAMP),
  crs.supervisor_user_id,
  COALESCE(crs.created_at, CURRENT_TIMESTAMP),
  COALESCE(crs.updated_at, CURRENT_TIMESTAMP)
FROM cash_register_sessions crs
WHERE crs.closing_notes LIKE '%[Rechazado por supervisor]:%'
  AND TRIM(SUBSTRING_INDEX(crs.closing_notes, '[Rechazado por supervisor]:', -1)) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM cash_session_observations cso
    WHERE cso.cash_register_session_id = crs.id
      AND cso.observation_type = 'REJECTION'
  );
