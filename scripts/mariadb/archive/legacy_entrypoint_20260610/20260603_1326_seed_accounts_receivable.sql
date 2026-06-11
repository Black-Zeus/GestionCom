-- =====================================================
-- Seed cuentas por cobrar
-- Archivo: 20260603_1326_seed_accounts_receivable.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO permissions (permission_code, permission_name, permission_group) VALUES
('CUSTOMERS_VIEW', 'Ver Clientes', 'ACCOUNTS_RECEIVABLE'),
('CUSTOMERS_CREATE', 'Crear Clientes', 'ACCOUNTS_RECEIVABLE'),
('CUSTOMERS_EDIT', 'Editar Clientes', 'ACCOUNTS_RECEIVABLE'),
('CUSTOMERS_DELETE', 'Eliminar Clientes', 'ACCOUNTS_RECEIVABLE'),
('CREDIT_LIMITS_VIEW', 'Ver Límites de Crédito', 'ACCOUNTS_RECEIVABLE'),
('CREDIT_LIMITS_EDIT', 'Modificar Límites de Crédito', 'ACCOUNTS_RECEIVABLE'),
('CREDIT_EXCEPTIONS_AUTHORIZE', 'Autorizar Excepciones de Crédito', 'ACCOUNTS_RECEIVABLE'),
('PAYMENTS_RECEIVE', 'Recibir Pagos', 'ACCOUNTS_RECEIVABLE'),
('PAYMENTS_ALLOCATE', 'Aplicar Pagos a Facturas', 'ACCOUNTS_RECEIVABLE'),
('PENALTIES_APPLY', 'Aplicar Multas por Mora', 'ACCOUNTS_RECEIVABLE'),
('PENALTIES_WAIVE', 'Condonar Multas', 'ACCOUNTS_RECEIVABLE'),
('AR_REPORTS_VIEW', 'Ver Reportes Cuentas por Cobrar', 'ACCOUNTS_RECEIVABLE'),
('AGING_REPORTS_VIEW', 'Ver Reportes de Antigüedad', 'ACCOUNTS_RECEIVABLE'),
('CUSTOMER_STATEMENTS_GENERATE', 'Generar Estados de Cuenta', 'ACCOUNTS_RECEIVABLE');

-- =====================================================
-- SECCIÓN 4: INSERCIÓN DE DATOS MAESTROS
-- =====================================================

-- Actualizar métodos de pago existentes para cuenta corriente
UPDATE payment_methods SET
    allows_postdated = TRUE,
    requires_bank_info = TRUE,
    default_terms_days = 30
WHERE method_code = 'CHECK';

UPDATE payment_methods SET
    requires_bank_info = TRUE,
    default_terms_days = 0
WHERE method_code = 'TRANSFER';

-- Insertar nuevos métodos de pago específicos para cuenta corriente
INSERT INTO payment_methods (method_code, method_name, method_type, affects_cash_flow, requires_bank_info, allows_postdated, currency_code) VALUES
('CREDIT_TERMS', 'Crédito Empresa', 'OTHER', FALSE, FALSE, FALSE, 'CLP'),
('POSTDATED_CHECK', 'Cheque a Fecha', 'OTHER', FALSE, TRUE, TRUE, 'CLP'),
('WIRE_TRANSFER', 'Transferencia Bancaria', 'TRANSFER', FALSE, TRUE, FALSE, 'CLP'),
('PROMISSORY_NOTE', 'Pagaré', 'OTHER', FALSE, FALSE, TRUE, 'CLP');

-- Insertar rol específico para contabilidad
INSERT INTO roles (role_code, role_name, role_description, is_system_role) VALUES
('ACCOUNTANT', 'Contador', 'Gestión completa de cuentas por cobrar y contabilidad', TRUE);

-- Asignar permisos al rol de contador
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE role_code = 'ACCOUNTANT'),
    id
FROM permissions
WHERE permission_group IN ('ACCOUNTS_RECEIVABLE', 'CASH_CONTROL', 'REPORTS');

-- Configuración del sistema para cuenta corriente
INSERT INTO system_features (feature_code, feature_name, feature_description, feature_type, default_value, current_value) VALUES
('AR_AUTO_AGING_DAYS', 'Días para Aging Automático', 'Días para clasificación automática de antigüedad', 'STRING', '30,60,90,120', '30,60,90,120'),
('AR_AUTO_PENALTY_RATE', 'Tasa de Multa Automática', 'Porcentaje de multa por mora por defecto', 'STRING', '2.0', '2.0'),
('AR_GRACE_PERIOD_DAYS', 'Días de Gracia por Defecto', 'Días de gracia antes de aplicar mora', 'INTEGER', '5', '5'),
('AR_DEFAULT_CREDIT_LIMIT', 'Límite de Crédito por Defecto', 'Límite de crédito para nuevos clientes', 'STRING', '100000', '100000'),
('AR_REQUIRE_SUPERVISOR_OVER_LIMIT', 'Requiere Supervisor para Exceso', 'Si requiere autorización para exceder límite', 'BOOLEAN', 'true', 'true'),
('AR_AUTO_BLOCK_OVERDUE', 'Bloqueo Automático por Mora', 'Bloquear clientes automáticamente por mora', 'BOOLEAN', 'true', 'true'),
('AR_MIN_PAYMENT_PERCENTAGE', 'Porcentaje Mínimo de Pago', 'Porcentaje mínimo para pago en cuotas', 'STRING', '30', '30');

SET FOREIGN_KEY_CHECKS = 1;
