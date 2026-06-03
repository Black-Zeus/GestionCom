-- =====================================================
-- Seed caja y medios de pago
-- Archivo: 20260603_1320_seed_cash.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- SECCIÓN 4: INSERCIÓN DE DATOS MAESTROS
-- =====================================================

-- Insertar métodos de pago básicos
INSERT INTO payment_methods (method_code, method_name, method_type, affects_cash_flow, currency_code) VALUES
('CASH', 'Efectivo', 'CASH', TRUE, 'CLP'),
('DEBIT', 'Tarjeta de Débito', 'CARD', FALSE, 'CLP'),
('CREDIT', 'Tarjeta de Crédito', 'CARD', FALSE, 'CLP'),
('TRANSFER', 'Transferencia Bancaria', 'TRANSFER', FALSE, 'CLP'),
('CHECK', 'Cheque', 'OTHER', FALSE, 'CLP'),
('VOUCHER', 'Vale Vista', 'OTHER', FALSE, 'CLP'),
('GIFT_CARD', 'Tarjeta Regalo', 'OTHER', FALSE, 'CLP'),
('STORE_CREDIT', 'Crédito de Tienda', 'OTHER', FALSE, 'CLP');

-- Insertar categorías de caja chica básicas
INSERT INTO petty_cash_categories (category_code, category_name, category_description, max_amount_per_expense, requires_evidence) VALUES
('FOOD', 'Alimentación', 'Gastos en comida y bebidas para personal', 15000.00, FALSE),
('SUPPLIES', 'Suministros', 'Materiales de oficina, limpieza, etc.', 25000.00, TRUE),
('TRANSPORT', 'Transporte', 'Pasajes, combustible, estacionamiento', 10000.00, TRUE),
('SERVICES', 'Servicios', 'Servicios menores, reparaciones pequeñas', 30000.00, TRUE),
('PACKAGING', 'Empaque', 'Bolsas, cajas, material de empaque', 20000.00, TRUE),
('UTILITIES', 'Servicios Básicos', 'Pagos menores de luz, agua, teléfono', 50000.00, TRUE),
('MAINTENANCE', 'Mantención', 'Reparaciones menores, mantención equipos', 40000.00, TRUE),
('OTHER', 'Otros', 'Gastos varios no categorizados', 5000.00, FALSE);

-- Insertar permisos específicos para control de caja
INSERT INTO permissions (permission_code, permission_name, permission_group) VALUES
('CASH_REGISTER_OPEN', 'Abrir Caja Registradora', 'CASH_CONTROL'),
('CASH_REGISTER_CLOSE', 'Cerrar Caja Registradora', 'CASH_CONTROL'),
('CASH_REGISTER_SUPERVISE', 'Supervisar Cierre de Caja', 'CASH_CONTROL'),
('CASH_MOVEMENTS_VIEW', 'Ver Movimientos de Caja', 'CASH_CONTROL'),
('PETTY_CASH_SPEND', 'Realizar Gastos Caja Chica', 'CASH_CONTROL'),
('PETTY_CASH_REPLENISH', 'Reponer Caja Chica', 'CASH_CONTROL'),
('PETTY_CASH_APPROVE', 'Aprobar Gastos Caja Chica', 'CASH_CONTROL'),
('CASH_REPORTS_VIEW', 'Ver Reportes de Caja', 'CASH_CONTROL'),
('CASH_SETTINGS_MANAGE', 'Gestionar Configuración de Cajas', 'CASH_CONTROL');

SET FOREIGN_KEY_CHECKS = 1;
