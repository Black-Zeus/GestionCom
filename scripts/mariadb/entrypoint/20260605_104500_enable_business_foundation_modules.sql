-- Habilita mantenedores base para ventas e inventario:
-- productos/SKU, listas de precios, impuestos y configuracion de empresa.

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

CREATE TABLE IF NOT EXISTS tax_rates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tax_code VARCHAR(20) UNIQUE NOT NULL,
    tax_name VARCHAR(100) NOT NULL,
    tax_type ENUM('VAT', 'EXEMPT', 'ADDITIONAL', 'WITHHOLDING', 'OTHER') NOT NULL DEFAULT 'VAT',
    rate_percentage DECIMAL(7,4) NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    valid_from DATE NOT NULL,
    valid_to DATE NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_tax_code (tax_code),
    INDEX idx_tax_type (tax_type),
    INDEX idx_tax_valid_from (valid_from),
    INDEX idx_tax_is_active (is_active),
    INDEX idx_tax_deleted_at (deleted_at)
);

ALTER TABLE price_list_items
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_price_list_items_deleted_at ON price_list_items (deleted_at);

INSERT IGNORE INTO tax_rates (
  tax_code, tax_name, tax_type, rate_percentage, is_default, valid_from, is_active
) VALUES
('TAX_0001', 'IVA 19%', 'VAT', 19.0000, TRUE, '2026-01-01', TRUE),
('TAX_0002', 'Exento', 'EXEMPT', 0.0000, FALSE, '2026-01-01', TRUE);

INSERT IGNORE INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active) VALUES
('PRODUCTS_ACCESS', 'Acceder a Productos', 'PRODUCTS', 'Permite visualizar productos y SKU.', TRUE),
('PRODUCTS_MANAGE', 'Gestionar Productos', 'PRODUCTS', 'Permite crear, editar, activar y eliminar productos y SKU.', TRUE),
('PRICE_LISTS_ACCESS', 'Acceder a Listas de Precios', 'PRICING', 'Permite visualizar listas de precios.', TRUE),
('PRICE_LISTS_MANAGE', 'Gestionar Listas de Precios', 'PRICING', 'Permite crear, editar, activar y eliminar listas de precios.', TRUE),
('TAX_CONFIG_ACCESS', 'Acceder a Configuracion de Impuestos', 'SETTINGS', 'Permite visualizar impuestos.', TRUE),
('TAX_CONFIG_MANAGE', 'Gestionar Configuracion de Impuestos', 'SETTINGS', 'Permite crear, editar, activar y eliminar impuestos.', TRUE),
('COMPANY_CONFIG_ACCESS', 'Acceder a Configuracion de Empresa', 'SETTINGS', 'Permite visualizar la configuracion de empresa.', TRUE),
('COMPANY_CONFIG_MANAGE', 'Gestionar Configuracion de Empresa', 'SETTINGS', 'Permite editar la configuracion de empresa.', TRUE);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN (
  'PRODUCTS_ACCESS',
  'PRODUCTS_MANAGE',
  'PRICE_LISTS_ACCESS',
  'PRICE_LISTS_MANAGE',
  'TAX_CONFIG_ACCESS',
  'TAX_CONFIG_MANAGE',
  'COMPANY_CONFIG_ACCESS',
  'COMPANY_CONFIG_MANAGE'
)
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN');

UPDATE menu_items
SET required_permission_id = (SELECT id FROM permissions WHERE permission_code = 'PRODUCTS_ACCESS')
WHERE menu_code = 'products';

UPDATE menu_items
SET required_permission_id = (SELECT id FROM permissions WHERE permission_code = 'PRICE_LISTS_ACCESS')
WHERE menu_code = 'price_lists';

UPDATE menu_items
SET required_permission_id = (SELECT id FROM permissions WHERE permission_code = 'TAX_CONFIG_ACCESS')
WHERE menu_code = 'tax_config';

UPDATE menu_items
SET required_permission_id = (SELECT id FROM permissions WHERE permission_code = 'COMPANY_CONFIG_ACCESS')
WHERE menu_code = 'company_config';
