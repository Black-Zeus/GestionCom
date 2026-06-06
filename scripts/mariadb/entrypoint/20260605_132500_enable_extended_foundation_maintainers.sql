-- Habilita mantenedores maestros adicionales para preparar inventario, ventas, finanzas y sistema.

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

CREATE TABLE IF NOT EXISTS document_templates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  template_code VARCHAR(50) UNIQUE NOT NULL,
  template_name VARCHAR(150) NOT NULL,
  document_type_id BIGINT UNSIGNED NULL,
  template_channel ENUM('PRINT', 'EMAIL', 'PDF', 'THERMAL', 'OTHER') DEFAULT 'PDF',
  template_subject VARCHAR(255) NULL,
  template_body MEDIUMTEXT NULL,
  paper_size VARCHAR(30) DEFAULT 'A4',
  orientation ENUM('PORTRAIT', 'LANDSCAPE') DEFAULT 'PORTRAIT',
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (document_type_id) REFERENCES document_types(id) ON DELETE SET NULL,
  INDEX idx_document_template_code (template_code),
  INDEX idx_document_type_id (document_type_id),
  INDEX idx_document_template_active (is_active),
  INDEX idx_document_template_deleted_at (deleted_at)
);

CREATE TABLE IF NOT EXISTS bank_reconciliation_settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_code VARCHAR(50) UNIQUE NOT NULL,
  bank_account_id BIGINT UNSIGNED NULL,
  match_reference_enabled BOOLEAN DEFAULT TRUE,
  match_amount_enabled BOOLEAN DEFAULT TRUE,
  match_date_tolerance_days INT UNSIGNED DEFAULT 3,
  amount_tolerance DECIMAL(15,2) DEFAULT 0,
  auto_match_enabled BOOLEAN DEFAULT FALSE,
  require_review_over_amount DECIMAL(15,2) NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL,
  INDEX idx_bank_reconciliation_setting_code (setting_code),
  INDEX idx_bank_account_id (bank_account_id),
  INDEX idx_bank_reconciliation_setting_active (is_active),
  INDEX idx_bank_reconciliation_setting_deleted_at (deleted_at)
);

CREATE TABLE IF NOT EXISTS notification_emission_rules (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rule_code VARCHAR(50) UNIQUE NOT NULL,
  rule_name VARCHAR(150) NOT NULL,
  source_label VARCHAR(120) NOT NULL,
  notification_type_id BIGINT UNSIGNED NOT NULL,
  severity_override ENUM('INFO', 'SUCCESS', 'WARNING', 'ERROR') NULL,
  min_priority TINYINT UNSIGNED DEFAULT 1,
  max_per_user_per_day INT UNSIGNED NULL,
  emit_in_app BOOLEAN DEFAULT TRUE,
  emit_email BOOLEAN DEFAULT FALSE,
  emit_push BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (notification_type_id) REFERENCES notification_types(id) ON DELETE RESTRICT,
  INDEX idx_notification_rule_code (rule_code),
  INDEX idx_notification_rule_source (source_label),
  INDEX idx_notification_rule_type (notification_type_id),
  INDEX idx_notification_rule_active (is_active),
  INDEX idx_notification_rule_deleted_at (deleted_at)
);

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  notification_type_id BIGINT UNSIGNED NOT NULL,
  receive_in_app BOOLEAN DEFAULT TRUE,
  receive_email BOOLEAN DEFAULT FALSE,
  receive_push BOOLEAN DEFAULT FALSE,
  muted_until TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (notification_type_id) REFERENCES notification_types(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_notification_preference (user_id, notification_type_id),
  INDEX idx_user_notification_preference_user (user_id),
  INDEX idx_user_notification_preference_type (notification_type_id),
  INDEX idx_user_notification_preference_active (is_active)
);

INSERT IGNORE INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active) VALUES
('INVENTORY_MAINTAINERS_ACCESS', 'Acceder a Mantenedores de Inventario', 'INVENTORY', 'Permite visualizar mantenedores auxiliares de inventario.', TRUE),
('INVENTORY_MAINTAINERS_MANAGE', 'Gestionar Mantenedores de Inventario', 'INVENTORY', 'Permite gestionar zonas, codigos, unidades y reglas de inventario.', TRUE),
('SALES_MAINTAINERS_ACCESS', 'Acceder a Mantenedores de Ventas', 'SALES', 'Permite visualizar mantenedores comerciales no transaccionales.', TRUE),
('SALES_MAINTAINERS_MANAGE', 'Gestionar Mantenedores de Ventas', 'SALES', 'Permite gestionar promociones y motivos de devolucion.', TRUE),
('FINANCE_MAINTAINERS_ACCESS', 'Acceder a Mantenedores Financieros', 'FINANCE', 'Permite visualizar bancos, cuentas, monedas y reglas de conciliacion.', TRUE),
('FINANCE_MAINTAINERS_MANAGE', 'Gestionar Mantenedores Financieros', 'FINANCE', 'Permite gestionar bancos, cuentas, monedas y reglas de conciliacion.', TRUE),
('DOCUMENT_TEMPLATES_ACCESS', 'Acceder a Plantillas de Documentos', 'DOCUMENTS', 'Permite visualizar plantillas documentales.', TRUE),
('DOCUMENT_TEMPLATES_MANAGE', 'Gestionar Plantillas de Documentos', 'DOCUMENTS', 'Permite crear, editar y eliminar plantillas documentales.', TRUE),
('NOTIFICATION_SETTINGS_ACCESS', 'Acceder a Configuracion de Notificaciones', 'SYSTEM', 'Permite visualizar tipos, reglas y preferencias de notificacion.', TRUE),
('NOTIFICATION_SETTINGS_MANAGE', 'Gestionar Configuracion de Notificaciones', 'SYSTEM', 'Permite gestionar tipos, reglas y preferencias de notificacion.', TRUE);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'INVENTORY_MAINTAINERS_ACCESS',
  'INVENTORY_MAINTAINERS_MANAGE',
  'SALES_MAINTAINERS_ACCESS',
  'SALES_MAINTAINERS_MANAGE',
  'FINANCE_MAINTAINERS_ACCESS',
  'FINANCE_MAINTAINERS_MANAGE',
  'DOCUMENT_TEMPLATES_ACCESS',
  'DOCUMENT_TEMPLATES_MANAGE',
  'NOTIFICATION_SETTINGS_ACCESS',
  'NOTIFICATION_SETTINGS_MANAGE',
  'FOUNDATION_MAINTAINERS_ACCESS',
  'FOUNDATION_MAINTAINERS_MANAGE'
)
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN');

INSERT INTO menu_items (
  parent_id, menu_code, menu_name, menu_description, icon_name, menu_url,
  menu_type, required_permission_id, is_active, is_visible, sort_order, menu_level, menu_path
) VALUES
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'warehouse_zones', 'Zonas de bodega', 'Zonas operativas dentro de bodegas.', 'map-pin-line', '/inventory/warehouse-zones', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'INVENTORY_MAINTAINERS_ACCESS'), TRUE, TRUE, 35, 2, '/inventory/warehouse-zones'),
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'stock_critical_config', 'Stock critico y reposicion', 'Reglas de stock minimo, seguridad y reorden.', 'alarm-warning-line', '/inventory/stock-critical', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'INVENTORY_MAINTAINERS_ACCESS'), TRUE, TRUE, 36, 2, '/inventory/stock-critical'),
((SELECT id FROM menu_items WHERE menu_code = 'inventory'), 'product_units', 'Unidades por producto', 'Unidades alternativas de compra, venta e inventario.', 'ruler-line', '/products/units', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'INVENTORY_MAINTAINERS_ACCESS'), TRUE, TRUE, 82, 2, '/products/units'),
((SELECT id FROM menu_items WHERE menu_code = 'sales'), 'promotions', 'Promociones comerciales', 'Promociones y reglas comerciales sin venta directa.', 'price-tag-line', '/sales/promotions', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SALES_MAINTAINERS_ACCESS'), TRUE, TRUE, 40, 2, '/sales/promotions'),
((SELECT id FROM menu_items WHERE menu_code = 'documents'), 'return_reasons', 'Motivos de devolucion', 'Catalogo de motivos y reglas para devoluciones.', 'refund-2-line', '/returns/reasons', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'SALES_MAINTAINERS_ACCESS'), TRUE, TRUE, 22, 2, '/returns/reasons'),
((SELECT id FROM menu_items WHERE menu_code = 'documents'), 'document_templates', 'Plantillas de documentos', 'Plantillas de impresion, PDF o correo.', 'file-text-line', '/config/document-templates', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'DOCUMENT_TEMPLATES_ACCESS'), TRUE, TRUE, 50, 2, '/config/document-templates'),
((SELECT id FROM menu_items WHERE menu_code = 'finance'), 'finance_banking', 'Bancos y cuentas bancarias', 'Bancos y cuentas internas.', 'bank-card-line', '/finance/banking', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'FINANCE_MAINTAINERS_ACCESS'), TRUE, TRUE, 42, 2, '/finance/banking'),
((SELECT id FROM menu_items WHERE menu_code = 'finance'), 'finance_currencies', 'Monedas y tipos de cambio', 'Monedas y tasas de cambio.', 'exchange-dollar-line', '/finance/currencies', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'FINANCE_MAINTAINERS_ACCESS'), TRUE, TRUE, 44, 2, '/finance/currencies'),
((SELECT id FROM menu_items WHERE menu_code = 'finance'), 'bank_reconciliation_settings', 'Configuracion de conciliacion bancaria', 'Parametros para conciliacion bancaria.', 'settings-4-line', '/finance/bank-reconciliation/settings', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'FINANCE_MAINTAINERS_ACCESS'), TRUE, TRUE, 46, 2, '/finance/bank-reconciliation/settings'),
((SELECT id FROM menu_items WHERE menu_code = 'settings'), 'notification_settings', 'Configuracion de notificaciones', 'Tipos, reglas y preferencias de notificacion.', 'notification-3-line', '/config/notifications', 'LINK', (SELECT id FROM permissions WHERE permission_code = 'NOTIFICATION_SETTINGS_ACCESS'), TRUE, TRUE, 58, 2, '/config/notifications')
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  menu_name = VALUES(menu_name),
  menu_description = VALUES(menu_description),
  icon_name = VALUES(icon_name),
  menu_url = VALUES(menu_url),
  menu_type = VALUES(menu_type),
  required_permission_id = VALUES(required_permission_id),
  is_active = VALUES(is_active),
  is_visible = VALUES(is_visible),
  sort_order = VALUES(sort_order),
  menu_level = VALUES(menu_level),
  menu_path = VALUES(menu_path);

UPDATE menu_items
SET required_permission_id = (SELECT id FROM permissions WHERE permission_code = 'INVENTORY_MAINTAINERS_ACCESS')
WHERE menu_code IN ('barcodes', 'warehouse_zones', 'stock_critical_config', 'product_units');

-- Root hereda SUPER_ADMIN; este refuerzo mantiene SUPER_ADMIN con todos los permisos activos.
INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.is_active = TRUE
WHERE r.role_code = 'SUPER_ADMIN';
