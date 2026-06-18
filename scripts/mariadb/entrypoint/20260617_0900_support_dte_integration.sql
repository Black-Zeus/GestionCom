-- Soporte base para integracion DTE.
-- Mantiene document_types como catalogo funcional de documentos internos/venta.
-- Los tipos DTE_* se relacionan con SII/LibreDTE mediante dte_document_type_settings,
-- evitando romper la logica actual que decide si una venta queda como ticket interno
-- o como documento especial.

ALTER TABLE dte_company_config
  ADD COLUMN IF NOT EXISTS dte_enabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Activa emision electronica DTE para la empresa' AFTER dte_environment,
  ADD COLUMN IF NOT EXISTS dte_provider ENUM('NONE', 'LIBREDTE', 'SII_DIRECT', 'OTHER') NOT NULL DEFAULT 'NONE' COMMENT 'Proveedor principal de emision DTE' AFTER dte_enabled,
  ADD COLUMN IF NOT EXISTS dte_emission_mode ENUM('MANUAL', 'AUTO_ON_CLOSE') NOT NULL DEFAULT 'MANUAL' COMMENT 'Modo de emision: manual o automatica al cerrar venta' AFTER dte_provider,
  ADD COLUMN IF NOT EXISTS allow_internal_ticket_when_dte_disabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Permite operar con ticket interno si DTE esta desactivado' AFTER dte_emission_mode,
  ADD COLUMN IF NOT EXISTS send_dte_email_by_default TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Enviar correo del DTE por defecto desde el proveedor' AFTER allow_internal_ticket_when_dte_disabled,
  ADD COLUMN IF NOT EXISTS dte_activation_notes TEXT NULL COMMENT 'Notas operativas del proceso de activacion DTE' AFTER send_dte_email_by_default,
  ADD INDEX IF NOT EXISTS idx_dte_company_enabled (dte_enabled),
  ADD INDEX IF NOT EXISTS idx_dte_company_provider (dte_provider),
  ADD INDEX IF NOT EXISTS idx_dte_company_emission_mode (dte_emission_mode);

CREATE TABLE IF NOT EXISTS dte_system_settings (
  id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  dte_enabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Switch global: 0 desactiva emision DTE en todo el sistema',
  default_provider ENUM('NONE', 'LIBREDTE', 'SII_DIRECT', 'OTHER') NOT NULL DEFAULT 'NONE',
  default_emission_mode ENUM('MANUAL', 'AUTO_ON_CLOSE') NOT NULL DEFAULT 'MANUAL',
  allow_internal_ticket_when_disabled TINYINT(1) NOT NULL DEFAULT 1,
  require_dte_for_dte_document_types TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Si esta activo, los document_types DTE_* exigen emision electronica cuando DTE este habilitado',
  retry_enabled TINYINT(1) NOT NULL DEFAULT 1,
  max_retry_attempts TINYINT UNSIGNED NOT NULL DEFAULT 3,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_dte_system_singleton CHECK (id = 1)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

INSERT INTO dte_system_settings (
  id,
  dte_enabled,
  default_provider,
  default_emission_mode,
  allow_internal_ticket_when_disabled,
  require_dte_for_dte_document_types,
  retry_enabled,
  max_retry_attempts
) VALUES (
  1,
  0,
  'NONE',
  'MANUAL',
  1,
  0,
  1,
  3
) ON DUPLICATE KEY UPDATE id = VALUES(id);

CREATE TABLE IF NOT EXISTS dte_provider_configs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_config_id BIGINT UNSIGNED NOT NULL,
  provider_code ENUM('LIBREDTE', 'SII_DIRECT', 'OTHER') NOT NULL DEFAULT 'LIBREDTE',
  provider_name VARCHAR(100) NOT NULL DEFAULT 'LibreDTE',
  environment ENUM('CERTIFICACION', 'PRODUCCION') NOT NULL DEFAULT 'CERTIFICACION',
  base_url VARCHAR(255) NOT NULL DEFAULT 'https://libredte.cl/api',
  api_token_secret_name VARCHAR(150) NULL COMMENT 'Nombre del secreto externo que contiene el token/hash',
  api_token_ciphertext TEXT NULL COMMENT 'Token/hash cifrado si se almacena en BD; nunca guardar texto plano',
  webhook_secret_ciphertext TEXT NULL,
  timeout_seconds SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  extra_config JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_dte_provider_company_env (company_config_id, provider_code, environment),
  KEY idx_dte_provider_company (company_config_id),
  KEY idx_dte_provider_code (provider_code),
  KEY idx_dte_provider_environment (environment),
  KEY idx_dte_provider_active (is_active),
  KEY idx_dte_provider_deleted_at (deleted_at),
  CONSTRAINT fk_dte_provider_company_config FOREIGN KEY (company_config_id) REFERENCES dte_company_config (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

INSERT IGNORE INTO dte_provider_configs (
  company_config_id,
  provider_code,
  provider_name,
  environment,
  base_url,
  is_active
)
SELECT
  id,
  'LIBREDTE',
  'LibreDTE',
  dte_environment,
  'https://libredte.cl/api',
  0
FROM dte_company_config
WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS dte_document_type_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  document_type_id BIGINT UNSIGNED NOT NULL,
  sii_dte_type SMALLINT UNSIGNED NOT NULL COMMENT 'Tipo DTE SII: 33, 34, 39, 41, 56, 61, etc.',
  sii_dte_name VARCHAR(120) NOT NULL,
  amount_mode ENUM('NET', 'GROSS') NOT NULL DEFAULT 'NET' COMMENT 'Boletas suelen enviarse en bruto; facturas en neto',
  is_electronic TINYINT(1) NOT NULL DEFAULT 1,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  emission_policy ENUM('MANUAL', 'AUTO_ON_CLOSE', 'NEVER') NOT NULL DEFAULT 'MANUAL',
  provider_code ENUM('LIBREDTE', 'SII_DIRECT', 'OTHER') NOT NULL DEFAULT 'LIBREDTE',
  extra_mapping JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_dte_doc_type_settings_document_type (document_type_id),
  UNIQUE KEY uk_dte_doc_type_settings_sii_type (sii_dte_type),
  KEY idx_dte_doc_type_sii_type (sii_dte_type),
  KEY idx_dte_doc_type_enabled (is_enabled),
  KEY idx_dte_doc_type_policy (emission_policy),
  KEY idx_dte_doc_type_deleted_at (deleted_at),
  CONSTRAINT fk_dte_doc_type_settings_document_type FOREIGN KEY (document_type_id) REFERENCES document_types (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

INSERT INTO dte_document_type_settings (
  document_type_id,
  sii_dte_type,
  sii_dte_name,
  amount_mode,
  emission_policy,
  provider_code
)
SELECT id, 33, 'Factura electronica', 'NET', 'MANUAL', 'LIBREDTE'
FROM document_types WHERE document_type_code = 'DTE_33'
ON DUPLICATE KEY UPDATE sii_dte_name = VALUES(sii_dte_name), amount_mode = VALUES(amount_mode);

INSERT INTO dte_document_type_settings (
  document_type_id,
  sii_dte_type,
  sii_dte_name,
  amount_mode,
  emission_policy,
  provider_code
)
SELECT id, 34, 'Factura no afecta o exenta electronica', 'NET', 'MANUAL', 'LIBREDTE'
FROM document_types WHERE document_type_code = 'DTE_34'
ON DUPLICATE KEY UPDATE sii_dte_name = VALUES(sii_dte_name), amount_mode = VALUES(amount_mode);

INSERT INTO dte_document_type_settings (
  document_type_id,
  sii_dte_type,
  sii_dte_name,
  amount_mode,
  emission_policy,
  provider_code
)
SELECT id, 39, 'Boleta electronica', 'GROSS', 'MANUAL', 'LIBREDTE'
FROM document_types WHERE document_type_code = 'DTE_39'
ON DUPLICATE KEY UPDATE sii_dte_name = VALUES(sii_dte_name), amount_mode = VALUES(amount_mode);

INSERT INTO dte_document_type_settings (
  document_type_id,
  sii_dte_type,
  sii_dte_name,
  amount_mode,
  emission_policy,
  provider_code
)
SELECT id, 41, 'Boleta exenta electronica', 'GROSS', 'MANUAL', 'LIBREDTE'
FROM document_types WHERE document_type_code = 'DTE_41'
ON DUPLICATE KEY UPDATE sii_dte_name = VALUES(sii_dte_name), amount_mode = VALUES(amount_mode);

INSERT INTO dte_document_type_settings (
  document_type_id,
  sii_dte_type,
  sii_dte_name,
  amount_mode,
  emission_policy,
  provider_code
)
SELECT id, 56, 'Nota de debito electronica', 'NET', 'MANUAL', 'LIBREDTE'
FROM document_types WHERE document_type_code = 'DTE_56'
ON DUPLICATE KEY UPDATE sii_dte_name = VALUES(sii_dte_name), amount_mode = VALUES(amount_mode);

INSERT INTO dte_document_type_settings (
  document_type_id,
  sii_dte_type,
  sii_dte_name,
  amount_mode,
  emission_policy,
  provider_code
)
SELECT id, 61, 'Nota de credito electronica', 'NET', 'MANUAL', 'LIBREDTE'
FROM document_types WHERE document_type_code = 'DTE_61'
ON DUPLICATE KEY UPDATE sii_dte_name = VALUES(sii_dte_name), amount_mode = VALUES(amount_mode);

INSERT INTO dte_document_type_settings (
  document_type_id,
  sii_dte_type,
  sii_dte_name,
  amount_mode,
  emission_policy,
  provider_code
)
SELECT id, 52, 'Guia de despacho electronica', 'NET', 'MANUAL', 'LIBREDTE'
FROM document_types WHERE document_type_code = 'DTE_52'
ON DUPLICATE KEY UPDATE sii_dte_name = VALUES(sii_dte_name), amount_mode = VALUES(amount_mode);

CREATE TABLE IF NOT EXISTS dte_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dte_code VARCHAR(50) NOT NULL,
  provider_config_id BIGINT UNSIGNED NULL,
  company_config_id BIGINT UNSIGNED NOT NULL,
  document_type_id BIGINT UNSIGNED NOT NULL,
  sale_document_id BIGINT UNSIGNED NULL,
  legacy_document_id BIGINT UNSIGNED NULL,
  source_dte_document_id BIGINT UNSIGNED NULL COMMENT 'DTE original para notas de credito/debito',
  provider_code ENUM('LIBREDTE', 'SII_DIRECT', 'OTHER') NOT NULL DEFAULT 'LIBREDTE',
  environment ENUM('CERTIFICACION', 'PRODUCCION') NOT NULL DEFAULT 'CERTIFICACION',
  sii_dte_type SMALLINT UNSIGNED NOT NULL,
  folio BIGINT UNSIGNED NULL,
  emitter_rut VARCHAR(12) NOT NULL,
  receiver_rut VARCHAR(12) NULL,
  receiver_name VARCHAR(255) NULL,
  issue_date DATE NOT NULL,
  net_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  exempt_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  currency_code CHAR(3) NOT NULL DEFAULT 'CLP',
  dte_status ENUM('DRAFT', 'TEMPORARY', 'GENERATED', 'SENT', 'ACCEPTED', 'REJECTED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  sii_status_code VARCHAR(30) NULL,
  sii_status_message TEXT NULL,
  provider_document_id VARCHAR(100) NULL,
  provider_external_id VARCHAR(100) NULL,
  provider_emitter_id VARCHAR(30) NULL,
  sii_track_id VARCHAR(100) NULL,
  pdf_media_asset_id BIGINT UNSIGNED NULL,
  xml_media_asset_id BIGINT UNSIGNED NULL,
  pdf_url VARCHAR(500) NULL,
  xml_url VARCHAR(500) NULL,
  request_payload JSON NULL,
  response_payload JSON NULL,
  last_error TEXT NULL,
  retry_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMP NULL DEFAULT NULL,
  accepted_at TIMESTAMP NULL DEFAULT NULL,
  rejected_at TIMESTAMP NULL DEFAULT NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_dte_documents_code (dte_code),
  UNIQUE KEY uk_dte_sale_document_type (sale_document_id, document_type_id),
  UNIQUE KEY uk_dte_legacy_document_type (legacy_document_id, document_type_id),
  UNIQUE KEY uk_dte_provider_folio (company_config_id, sii_dte_type, folio),
  KEY idx_dte_documents_provider_config (provider_config_id),
  KEY idx_dte_documents_company_config (company_config_id),
  KEY idx_dte_documents_document_type (document_type_id),
  KEY idx_dte_documents_sale_document (sale_document_id),
  KEY idx_dte_documents_legacy_document (legacy_document_id),
  KEY idx_dte_documents_source_dte (source_dte_document_id),
  KEY idx_dte_documents_status (dte_status),
  KEY idx_dte_documents_sii_type (sii_dte_type),
  KEY idx_dte_documents_folio (folio),
  KEY idx_dte_documents_track_id (sii_track_id),
  KEY idx_dte_documents_issue_date (issue_date),
  KEY idx_dte_documents_deleted_at (deleted_at),
  CONSTRAINT fk_dte_documents_provider_config FOREIGN KEY (provider_config_id) REFERENCES dte_provider_configs (id) ON DELETE SET NULL,
  CONSTRAINT fk_dte_documents_company_config FOREIGN KEY (company_config_id) REFERENCES dte_company_config (id),
  CONSTRAINT fk_dte_documents_document_type FOREIGN KEY (document_type_id) REFERENCES document_types (id),
  CONSTRAINT fk_dte_documents_sale_document FOREIGN KEY (sale_document_id) REFERENCES sale_documents (id) ON DELETE SET NULL,
  CONSTRAINT fk_dte_documents_legacy_document FOREIGN KEY (legacy_document_id) REFERENCES documents (id) ON DELETE SET NULL,
  CONSTRAINT fk_dte_documents_source_dte FOREIGN KEY (source_dte_document_id) REFERENCES dte_documents (id) ON DELETE SET NULL,
  CONSTRAINT fk_dte_documents_pdf_media FOREIGN KEY (pdf_media_asset_id) REFERENCES media_assets (id) ON DELETE SET NULL,
  CONSTRAINT fk_dte_documents_xml_media FOREIGN KEY (xml_media_asset_id) REFERENCES media_assets (id) ON DELETE SET NULL,
  CONSTRAINT fk_dte_documents_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS dte_document_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dte_document_id BIGINT UNSIGNED NOT NULL,
  event_type ENUM(
    'CREATED',
    'TEMPORARY_CREATED',
    'GENERATED',
    'SENT',
    'STATUS_QUERIED',
    'ACCEPTED',
    'REJECTED',
    'FAILED',
    'CANCELLED',
    'PDF_STORED',
    'XML_STORED',
    'EMAIL_SENT',
    'RETRY_SCHEDULED',
    'WEBHOOK_RECEIVED'
  ) NOT NULL,
  provider_code ENUM('LIBREDTE', 'SII_DIRECT', 'OTHER') NULL,
  status_from VARCHAR(30) NULL,
  status_to VARCHAR(30) NULL,
  external_reference VARCHAR(120) NULL,
  request_payload JSON NULL,
  response_payload JSON NULL,
  message TEXT NULL,
  is_success TINYINT(1) NOT NULL DEFAULT 0,
  processing_time_ms INT UNSIGNED NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dte_events_document (dte_document_id),
  KEY idx_dte_events_type (event_type),
  KEY idx_dte_events_success (is_success),
  KEY idx_dte_events_created_at (created_at),
  CONSTRAINT fk_dte_events_document FOREIGN KEY (dte_document_id) REFERENCES dte_documents (id) ON DELETE CASCADE,
  CONSTRAINT fk_dte_events_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

INSERT IGNORE INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active)
VALUES
  ('DTE_ACCESS', 'Acceder a DTE', 'DOCUMENTS', 'Permite acceder al modulo de documentos tributarios electronicos.', 1),
  ('DTE_VIEW', 'Ver DTE', 'DOCUMENTS', 'Permite consultar documentos tributarios electronicos emitidos.', 1),
  ('DTE_EMIT', 'Emitir DTE', 'DOCUMENTS', 'Permite emitir boletas, facturas y notas electronicas.', 1),
  ('DTE_RETRY', 'Reintentar DTE', 'DOCUMENTS', 'Permite reintentar emisiones DTE fallidas.', 1),
  ('DTE_CANCEL', 'Cancelar DTE', 'DOCUMENTS', 'Permite cancelar o anular flujos DTE cuando el proveedor lo permita.', 1),
  ('DTE_CONFIG_MANAGE', 'Configurar DTE', 'SETTINGS', 'Permite administrar parametros y credenciales de integracion DTE.', 1);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, NULL
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'DTE_ACCESS',
  'DTE_VIEW',
  'DTE_EMIT',
  'DTE_RETRY',
  'DTE_CANCEL',
  'DTE_CONFIG_MANAGE'
)
WHERE r.role_code = 'SUPER_ADMIN';
