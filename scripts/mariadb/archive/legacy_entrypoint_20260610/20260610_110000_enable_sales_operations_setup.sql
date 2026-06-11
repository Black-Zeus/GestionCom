-- Configuracion operativa base para cajas, puntos de venta y operadores.

CREATE TABLE IF NOT EXISTS sales_points (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sales_point_code VARCHAR(20) NOT NULL UNIQUE COMMENT 'Codigo unico del punto de venta',
  sales_point_name VARCHAR(100) NOT NULL COMMENT 'Nombre descriptivo del punto de venta',
  warehouse_id BIGINT UNSIGNED NOT NULL COMMENT 'Sucursal/bodega asociada',
  default_cash_register_id BIGINT UNSIGNED NULL COMMENT 'Caja destino por defecto',
  channel_type VARCHAR(30) NOT NULL DEFAULT 'STORE' COMMENT 'Canal: STORE, WEB, WHATSAPP, PHONE, OTHER',
  location_description VARCHAR(255) NULL COMMENT 'Ubicacion o referencia operacional',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_sales_points_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  CONSTRAINT fk_sales_points_default_cash_register FOREIGN KEY (default_cash_register_id) REFERENCES cash_registers(id) ON DELETE SET NULL,
  INDEX idx_sales_point_code (sales_point_code),
  INDEX idx_sales_point_warehouse_id (warehouse_id),
  INDEX idx_sales_point_default_cash_register_id (default_cash_register_id),
  INDEX idx_sales_point_channel_type (channel_type),
  INDEX idx_sales_point_is_active (is_active),
  INDEX idx_sales_point_deleted_at (deleted_at)
);

CREATE TABLE IF NOT EXISTS cash_register_user_assignments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cash_register_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  operator_role VARCHAR(30) NOT NULL DEFAULT 'CASHIER',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  valid_from DATE NULL,
  valid_until DATE NULL,
  notes TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_crua_cash_register FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id),
  CONSTRAINT fk_crua_user FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY uk_cash_register_user_assignment (cash_register_id, user_id),
  INDEX idx_crua_cash_register_id (cash_register_id),
  INDEX idx_crua_user_id (user_id),
  INDEX idx_crua_operator_role (operator_role),
  INDEX idx_crua_is_active (is_active),
  INDEX idx_crua_deleted_at (deleted_at)
);

CREATE TABLE IF NOT EXISTS sales_point_user_assignments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sales_point_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  operator_role VARCHAR(30) NOT NULL DEFAULT 'SELLER',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  valid_from DATE NULL,
  valid_until DATE NULL,
  notes TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_spua_sales_point FOREIGN KEY (sales_point_id) REFERENCES sales_points(id),
  CONSTRAINT fk_spua_user FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY uk_sales_point_user_assignment (sales_point_id, user_id),
  INDEX idx_spua_sales_point_id (sales_point_id),
  INDEX idx_spua_user_id (user_id),
  INDEX idx_spua_operator_role (operator_role),
  INDEX idx_spua_is_active (is_active),
  INDEX idx_spua_deleted_at (deleted_at)
);

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

INSERT IGNORE INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active) VALUES
('SALES_POINTS_ACCESS', 'Ver Puntos de Venta', 'SALES_OPERATIONS', 'Permite ver el mantenedor de puntos de venta.', TRUE),
('SALES_POINTS_MANAGE', 'Gestionar Puntos de Venta', 'SALES_OPERATIONS', 'Permite crear, editar, activar y eliminar puntos de venta.', TRUE),
('OPERATOR_ASSIGNMENTS_ACCESS', 'Ver Asignaciones Operativas', 'SALES_OPERATIONS', 'Permite ver usuarios asignados a cajas y puntos de venta.', TRUE),
('OPERATOR_ASSIGNMENTS_MANAGE', 'Gestionar Asignaciones Operativas', 'SALES_OPERATIONS', 'Permite asignar usuarios a cajas y puntos de venta.', TRUE);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'SALES_POINTS_ACCESS',
  'SALES_POINTS_MANAGE',
  'OPERATOR_ASSIGNMENTS_ACCESS',
  'OPERATOR_ASSIGNMENTS_MANAGE'
)
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN');

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN ('SALES_POINTS_ACCESS', 'OPERATOR_ASSIGNMENTS_ACCESS')
WHERE r.role_code IN ('MANAGER', 'SUPERVISOR');

INSERT INTO menu_items (
  parent_id, menu_code, menu_name, menu_description, icon_name, menu_url,
  menu_type, required_permission_id, is_active, is_visible, sort_order, menu_level, menu_path
) VALUES
(
  (SELECT id FROM menu_items WHERE menu_code = 'cash'),
  'sales_points_admin',
  'Puntos de venta',
  'Mantenedor de puntos de venta para originar ventas pendientes.',
  'store-line',
  '/admin/sales-points',
  'LINK',
  (SELECT id FROM permissions WHERE permission_code = 'SALES_POINTS_ACCESS'),
  TRUE,
  TRUE,
  34,
  2,
  '/admin/sales-points'
)
ON DUPLICATE KEY UPDATE
  menu_name = VALUES(menu_name),
  menu_description = VALUES(menu_description),
  menu_url = VALUES(menu_url),
  required_permission_id = VALUES(required_permission_id),
  is_active = TRUE,
  is_visible = TRUE,
  sort_order = VALUES(sort_order),
  menu_path = VALUES(menu_path);

INSERT INTO menu_items (
  parent_id, menu_code, menu_name, menu_description, icon_name, menu_url,
  menu_type, required_permission_id, is_active, is_visible, sort_order, menu_level, menu_path
) VALUES
(
  (SELECT id FROM menu_items WHERE menu_code = 'cash'),
  'operator_assignments_admin',
  'Asignacion de operadores',
  'Relaciona usuarios con cajas y puntos de venta autorizados.',
  'team-line',
  '/admin/operator-assignments',
  'LINK',
  (SELECT id FROM permissions WHERE permission_code = 'OPERATOR_ASSIGNMENTS_ACCESS'),
  TRUE,
  TRUE,
  36,
  2,
  '/admin/operator-assignments'
)
ON DUPLICATE KEY UPDATE
  menu_name = VALUES(menu_name),
  menu_description = VALUES(menu_description),
  menu_url = VALUES(menu_url),
  required_permission_id = VALUES(required_permission_id),
  is_active = TRUE,
  is_visible = TRUE,
  sort_order = VALUES(sort_order),
  menu_path = VALUES(menu_path);
