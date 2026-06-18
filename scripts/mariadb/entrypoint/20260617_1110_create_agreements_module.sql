-- Modulo de convenios: maestro, beneficiarios y menu.

CREATE TABLE IF NOT EXISTS agreements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  agreement_code VARCHAR(40) NOT NULL,
  agreement_name VARCHAR(180) NOT NULL,
  agreement_type ENUM('CREDIT', 'DISCOUNT') NOT NULL,
  company_tax_id VARCHAR(30) NOT NULL,
  company_name VARCHAR(180) NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE NULL,
  discount_percent DECIMAL(7,4) NULL,
  benefit_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  single_purchase TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_agreements_code (agreement_code),
  KEY idx_agreements_company_tax_id (company_tax_id),
  KEY idx_agreements_type (agreement_type),
  KEY idx_agreements_active_dates (is_active, valid_from, valid_to),
  CONSTRAINT chk_agreements_discount_percent CHECK (
    agreement_type <> 'DISCOUNT' OR (discount_percent IS NOT NULL AND discount_percent > 0 AND discount_percent <= 100)
  )
);

CREATE TABLE IF NOT EXISTS agreement_beneficiaries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  agreement_id BIGINT UNSIGNED NOT NULL,
  identifier_type ENUM('RUT', 'CODE') NOT NULL,
  beneficiary_identifier VARCHAR(80) NOT NULL,
  beneficiary_name VARCHAR(180) NOT NULL,
  benefit_amount DECIMAL(15,2) NULL,
  consumed_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  interactions_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_consumed_at TIMESTAMP NULL DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_agreement_beneficiary_identifier (agreement_id, identifier_type, beneficiary_identifier),
  KEY idx_agreement_beneficiaries_identifier (beneficiary_identifier),
  KEY idx_agreement_beneficiaries_active (is_active),
  CONSTRAINT fk_agreement_beneficiaries_agreement
    FOREIGN KEY (agreement_id) REFERENCES agreements(id)
    ON DELETE CASCADE
);

ALTER TABLE agreement_usage_records
  ADD COLUMN IF NOT EXISTS agreement_id BIGINT UNSIGNED NULL AFTER id,
  ADD COLUMN IF NOT EXISTS agreement_beneficiary_id BIGINT UNSIGNED NULL AFTER agreement_id;

CREATE INDEX IF NOT EXISTS idx_agreement_usage_agreement_id ON agreement_usage_records (agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_usage_beneficiary_id ON agreement_usage_records (agreement_beneficiary_id);

INSERT INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active)
VALUES
  ('AGREEMENTS_ACCESS', 'Acceder a Convenios', 'SALES', 'Permite ver convenios, beneficiarios y consumo.', TRUE),
  ('AGREEMENTS_MANAGE', 'Gestionar Convenios', 'SALES', 'Permite crear y editar convenios y beneficiarios.', TRUE)
ON DUPLICATE KEY UPDATE
  permission_name = VALUES(permission_name),
  permission_group = VALUES(permission_group),
  permission_description = VALUES(permission_description),
  is_active = TRUE;

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_at)
SELECT r.id, p.id, NOW()
FROM roles r
JOIN permissions p ON p.permission_code IN ('AGREEMENTS_ACCESS', 'AGREEMENTS_MANAGE')
WHERE r.role_code IN ('ROOT', 'ADMIN', 'SUPER_ADMIN');

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_at)
SELECT r.id, p.id, NOW()
FROM roles r
JOIN permissions p ON p.permission_code = 'AGREEMENTS_ACCESS'
WHERE r.role_code IN ('SELLER', 'CASHIER');

INSERT INTO menu_items (
  parent_id, menu_code, menu_name, menu_description, icon_name, icon_color, menu_url,
  menu_type, required_permission_id, alternative_permissions, is_active, is_visible,
  requires_feature, feature_code, sort_order, menu_level, menu_path, target_window,
  css_classes, data_attributes, created_at, updated_at, created_by_user_id, deleted_at
)
SELECT
  NULL,
  'agreements',
  'Convenios',
  'Convenios comerciales, beneficiarios y consumo.',
  'handshake-line',
  '#2563EB',
  '/sales/agreements',
  'LINK',
  (SELECT id FROM permissions WHERE permission_code = 'AGREEMENTS_ACCESS' LIMIT 1),
  NULL,
  TRUE,
  TRUE,
  FALSE,
  NULL,
  35,
  1,
  '/sales/agreements',
  'SELF',
  NULL,
  NULL,
  NOW(),
  NOW(),
  NULL,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM menu_items WHERE menu_code = 'agreements' AND deleted_at IS NULL
);

UPDATE menu_items
SET menu_name = 'Convenios',
    menu_description = 'Convenios comerciales, beneficiarios y consumo.',
    menu_url = '/sales/agreements',
    menu_path = '/sales/agreements',
    required_permission_id = (SELECT id FROM permissions WHERE permission_code = 'AGREEMENTS_ACCESS' LIMIT 1),
    is_active = TRUE,
    is_visible = TRUE,
    updated_at = NOW()
WHERE menu_code = 'agreements'
  AND deleted_at IS NULL;
