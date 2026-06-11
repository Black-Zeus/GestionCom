-- Migra permisos legacy del seed original a la nomenclatura actual.
-- Regla vigente: *_VISIBLE habilita secciones, *_ACCESS habilita opciones y *_MANAGE habilita mantenedores/acciones.

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

CREATE TEMPORARY TABLE tmp_legacy_permission_map (
  old_code VARCHAR(100) NOT NULL,
  new_code VARCHAR(100) NOT NULL,
  PRIMARY KEY (old_code, new_code)
);

INSERT IGNORE INTO tmp_legacy_permission_map (old_code, new_code) VALUES
('PRODUCTS_VIEW', 'PRODUCTS_ACCESS'),
('PRODUCTS_CREATE', 'PRODUCTS_MANAGE'),
('PRODUCTS_EDIT', 'PRODUCTS_MANAGE'),
('PRODUCTS_DELETE', 'PRODUCTS_MANAGE'),
('CATEGORIES_MANAGE', 'PRODUCT_CATEGORIES_MANAGE'),
('ATTRIBUTES_MANAGE', 'PRODUCT_ATTRIBUTES_MANAGE'),
('STOCK_VIEW', 'PRODUCTS_ACCESS'),
('STOCK_VIEW', 'STOCK_MOVEMENTS_ACCESS'),
('MOVEMENTS_VIEW', 'STOCK_MOVEMENTS_ACCESS'),
('STOCK_ADJUST', 'INVENTORY_ADJUSTMENTS_ACCESS'),
('STOCK_TRANSFER', 'TRANSFERS_ACCESS'),
('PRICES_VIEW', 'PRICE_LISTS_ACCESS'),
('PRICES_MANAGE', 'PRICE_LISTS_MANAGE'),
('DOCUMENTS_VIEW', 'COMMERCIAL_DOCUMENTS_ACCESS'),
('DOCUMENTS_CREATE', 'NEW_SALE_ACCESS'),
('DOCUMENTS_CREATE', 'COMMERCIAL_DOCUMENTS_ACCESS'),
('DOCUMENTS_CANCEL', 'COMMERCIAL_DOCUMENTS_ACCESS'),
('CUSTOMERS_VIEW', 'CUSTOMERS_ACCESS'),
('CUSTOMERS_CREATE', 'CUSTOMERS_ACCESS'),
('CUSTOMERS_CREATE', 'FOUNDATION_MAINTAINERS_MANAGE'),
('CUSTOMERS_EDIT', 'FOUNDATION_MAINTAINERS_MANAGE'),
('CUSTOMERS_DELETE', 'FOUNDATION_MAINTAINERS_MANAGE'),
('CREDIT_LIMITS_VIEW', 'CUSTOMER_CREDIT_ACCESS'),
('CREDIT_LIMITS_EDIT', 'FOUNDATION_MAINTAINERS_MANAGE'),
('AR_REPORTS_VIEW', 'ACCOUNT_STATUS_ACCESS'),
('AGING_REPORTS_VIEW', 'ACCOUNT_STATUS_ACCESS'),
('PAYMENTS_RECEIVE', 'ACCOUNT_STATUS_ACCESS'),
('CUSTOMER_STATEMENTS_GENERATE', 'ACCOUNT_STATUS_ACCESS'),
('CASH_REGISTER_OPEN', 'CASH_OPENING_ACCESS'),
('CASH_REGISTER_CLOSE', 'CASH_OPENING_ACCESS'),
('CASH_MOVEMENTS_VIEW', 'CASH_MOVEMENTS_ACCESS'),
('PETTY_CASH_SPEND', 'PETTY_CASH_ACCESS'),
('CASH_REGISTER_SUPERVISE', 'CASH_COUNT_ACCESS'),
('CASH_REPORTS_VIEW', 'CASH_METRICS_ACCESS'),
('REPORTS_VIEW', 'DAILY_SALES_ACCESS'),
('REPORTS_VIEW', 'SALES_BY_SELLER_ACCESS'),
('REPORTS_VIEW', 'TOP_PRODUCTS_ACCESS'),
('REPORTS_VIEW', 'LOW_STOCK_ACCESS'),
('REPORTS_VIEW', 'CASH_FLOW_ACCESS'),
('REPORTS_VIEW', 'PROFITABILITY_ACCESS'),
('USERS_MANAGE', 'USER_READ'),
('USERS_MANAGE', 'USER_WRITE'),
('USERS_MANAGE', 'USER_MANAGER'),
('ROLES_MANAGE', 'USER_MANAGER'),
('PERMISSIONS_MANAGE', 'USER_ADMIN'),
('AUDIT_VIEW', 'SYSTEM_AUDIT_ACCESS'),
('AUDIT_VIEW', 'SYSTEM_AUDIT_REPORT_ACCESS'),
('AUDIT_VIEW', 'USER_ACTIVITY_REPORT_ACCESS');

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT rp.role_id, new_permission.id, COALESCE(rp.granted_by_user_id, @system_user_id)
FROM role_permissions rp
JOIN permissions old_permission ON old_permission.id = rp.permission_id
JOIN tmp_legacy_permission_map map ON map.old_code = old_permission.permission_code
JOIN permissions new_permission ON new_permission.permission_code = map.new_code
WHERE rp.deleted_at IS NULL;

INSERT IGNORE INTO user_permissions (
  user_id, permission_id, permission_type, granted_by_user_id, expires_at
)
SELECT up.user_id, new_permission.id, up.permission_type, COALESCE(up.granted_by_user_id, @system_user_id), up.expires_at
FROM user_permissions up
JOIN permissions old_permission ON old_permission.id = up.permission_id
JOIN tmp_legacy_permission_map map ON map.old_code = old_permission.permission_code
JOIN permissions new_permission ON new_permission.permission_code = map.new_code
WHERE up.deleted_at IS NULL;

-- SYSTEM_CONFIG era un comodin legacy. Sus titulares heredan los permisos activos actuales.
INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT rp.role_id, current_permission.id, COALESCE(rp.granted_by_user_id, @system_user_id)
FROM role_permissions rp
JOIN permissions system_permission ON system_permission.id = rp.permission_id
JOIN permissions current_permission ON current_permission.is_active = TRUE
WHERE rp.deleted_at IS NULL
  AND system_permission.permission_code = 'SYSTEM_CONFIG'
  AND current_permission.permission_code NOT IN (
    SELECT old_code FROM tmp_legacy_permission_map
    UNION SELECT 'SYSTEM_CONFIG'
  );

INSERT IGNORE INTO user_permissions (
  user_id, permission_id, permission_type, granted_by_user_id, expires_at
)
SELECT up.user_id, current_permission.id, up.permission_type, COALESCE(up.granted_by_user_id, @system_user_id), up.expires_at
FROM user_permissions up
JOIN permissions system_permission ON system_permission.id = up.permission_id
JOIN permissions current_permission ON current_permission.is_active = TRUE
WHERE up.deleted_at IS NULL
  AND system_permission.permission_code = 'SYSTEM_CONFIG'
  AND current_permission.permission_code NOT IN (
    SELECT old_code FROM tmp_legacy_permission_map
    UNION SELECT 'SYSTEM_CONFIG'
  );

-- root/SUPER_ADMIN debe quedar con todos los permisos actuales activos.
INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.is_active = TRUE
WHERE r.role_code = 'SUPER_ADMIN'
  AND p.permission_code NOT IN (
    SELECT old_code FROM tmp_legacy_permission_map
    UNION SELECT 'SYSTEM_CONFIG'
  );

UPDATE role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
SET rp.deleted_at = COALESCE(rp.deleted_at, CURRENT_TIMESTAMP)
WHERE p.permission_code IN (
  SELECT old_code FROM tmp_legacy_permission_map
  UNION SELECT 'SYSTEM_CONFIG'
);

UPDATE user_permissions up
JOIN permissions p ON p.id = up.permission_id
SET up.deleted_at = COALESCE(up.deleted_at, CURRENT_TIMESTAMP)
WHERE p.permission_code IN (
  SELECT old_code FROM tmp_legacy_permission_map
  UNION SELECT 'SYSTEM_CONFIG'
);

UPDATE menu_items mi
JOIN permissions p ON p.id = mi.required_permission_id
SET mi.required_permission_id = NULL
WHERE mi.is_active = FALSE
  AND mi.is_visible = FALSE
  AND p.permission_code IN (
    SELECT old_code FROM tmp_legacy_permission_map
    UNION SELECT 'SYSTEM_CONFIG'
  );

UPDATE permissions
SET
  is_active = FALSE,
  permission_description = COALESCE(permission_description, 'Permiso legacy migrado a la nomenclatura actual.')
WHERE permission_code IN (
  SELECT old_code FROM tmp_legacy_permission_map
  UNION SELECT 'SYSTEM_CONFIG'
);

DROP TEMPORARY TABLE IF EXISTS tmp_legacy_permission_map;
