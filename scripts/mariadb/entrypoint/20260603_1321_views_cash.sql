-- =====================================================
-- Vistas caja
-- Archivo: 20260603_1321_views_cash.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- SECCIÓN 3: CREACIÓN DE VISTAS
-- =====================================================

-- Vista resumen diario por cajero
CREATE VIEW v_daily_cash_summary AS
SELECT
    DATE(crs.opening_datetime) as session_date,
    cr.register_code,
    cr.register_name,
    u.username as cashier_name,
    crs.session_code,
    crs.opening_amount,
    crs.theoretical_amount,
    crs.physical_amount,
    crs.difference_amount,
    CASE
        WHEN crs.difference_amount > 0 THEN 'SOBRANTE'
        WHEN crs.difference_amount < 0 THEN 'FALTANTE'
        ELSE 'CUADRADO'
    END as difference_type,
    ABS(crs.difference_amount) as difference_abs,
    crs.session_status,
    crs.is_approved,
    supervisor.username as supervisor_name,
    COUNT(cm.id) as total_transactions,
    SUM(CASE WHEN cm.movement_type = 'SALE' THEN cm.amount ELSE 0 END) as total_sales,
    SUM(CASE WHEN cm.movement_type = 'RETURN' THEN ABS(cm.amount) ELSE 0 END) as total_returns,
    SUM(CASE WHEN cm.movement_type = 'PETTY_CASH' THEN ABS(cm.amount) ELSE 0 END) as total_petty_cash,
    crs.opening_datetime,
    crs.closing_datetime
FROM cash_register_sessions crs
JOIN cash_registers cr ON crs.cash_register_id = cr.id
JOIN users u ON crs.cashier_user_id = u.id
LEFT JOIN users supervisor ON crs.supervisor_user_id = supervisor.id
LEFT JOIN cash_movements cm ON crs.id = cm.cash_register_session_id
WHERE crs.deleted_at IS NULL
    AND cr.deleted_at IS NULL
    AND u.deleted_at IS NULL
GROUP BY crs.id
ORDER BY crs.opening_datetime DESC;

-- Vista estado actual de cajas
CREATE VIEW v_cash_register_status AS
SELECT
    cr.id,
    cr.register_code,
    cr.register_name,
    w.warehouse_name,
    CASE
        WHEN crs.session_status = 'OPEN' THEN 'ABIERTA'
        WHEN crs.session_status = 'PENDING_CLOSE' THEN 'PENDIENTE CIERRE'
        WHEN crs.session_status = 'CLOSED' THEN 'CERRADA'
        ELSE 'DISPONIBLE'
    END as current_status,
    u.username as current_cashier,
    crs.opening_datetime as session_start,
    crs.opening_amount,
    COALESCE(SUM(cm.amount), 0) as current_theoretical_balance,
    cr.terminal_identifier,
    cr.is_active
FROM cash_registers cr
JOIN warehouses w ON cr.warehouse_id = w.id
LEFT JOIN cash_register_sessions crs ON cr.id = crs.cash_register_id
    AND crs.session_status IN ('OPEN', 'PENDING_CLOSE')
LEFT JOIN users u ON crs.cashier_user_id = u.id
LEFT JOIN cash_movements cm ON crs.id = cm.cash_register_session_id
WHERE cr.deleted_at IS NULL
    AND w.deleted_at IS NULL
GROUP BY cr.id, crs.id
ORDER BY cr.register_code;

-- Vista resumen caja chica
CREATE VIEW v_petty_cash_summary AS
SELECT
    pcf.fund_code,
    w.warehouse_name,
    u.username as responsible_user,
    pcf.initial_amount,
    pcf.current_balance,
    pcf.total_expenses,
    pcf.total_replenishments,
    ROUND((pcf.current_balance / pcf.initial_amount) * 100, 2) as balance_percentage,
    pcf.fund_status,
    pcf.last_replenishment_date,
    COUNT(pce.id) as total_expense_count,
    COUNT(CASE WHEN pce.expense_status = 'PENDING' THEN 1 END) as pending_expenses,
    COUNT(CASE WHEN pce.has_receipt = TRUE THEN 1 END) as expenses_with_receipt,
    MAX(pce.expense_date) as last_expense_date
FROM petty_cash_funds pcf
JOIN warehouses w ON pcf.warehouse_id = w.id
JOIN users u ON pcf.responsible_user_id = u.id
LEFT JOIN petty_cash_expenses pce ON pcf.id = pce.petty_cash_fund_id
WHERE w.deleted_at IS NULL
    AND u.deleted_at IS NULL
GROUP BY pcf.id
ORDER BY pcf.fund_code;

-- Vista análisis de diferencias
CREATE VIEW v_cashier_performance AS
SELECT
    u.username as cashier_name,
    DATE_FORMAT(crs.opening_datetime, '%Y-%m') as month_year,
    COUNT(crs.id) as total_sessions,
    COUNT(CASE WHEN crs.difference_amount = 0 THEN 1 END) as perfect_sessions,
    COUNT(CASE WHEN crs.difference_amount > 0 THEN 1 END) as surplus_sessions,
    COUNT(CASE WHEN crs.difference_amount < 0 THEN 1 END) as deficit_sessions,
    ROUND((COUNT(CASE WHEN crs.difference_amount = 0 THEN 1 END) / COUNT(crs.id)) * 100, 2) as accuracy_percentage,
    SUM(CASE WHEN crs.difference_amount > 0 THEN crs.difference_amount ELSE 0 END) as total_surplus,
    SUM(CASE WHEN crs.difference_amount < 0 THEN ABS(crs.difference_amount) ELSE 0 END) as total_deficit,
    AVG(ABS(crs.difference_amount)) as avg_difference,
    COUNT(CASE WHEN crs.requires_supervisor_approval = TRUE THEN 1 END) as sessions_requiring_approval
FROM users u
JOIN cash_register_sessions crs ON u.id = crs.cashier_user_id
WHERE u.deleted_at IS NULL
    AND crs.session_status = 'CLOSED'
GROUP BY u.id, DATE_FORMAT(crs.opening_datetime, '%Y-%m')
ORDER BY month_year DESC, accuracy_percentage DESC;

-- Vista flujo de efectivo por período
CREATE VIEW v_cash_flow_period AS
SELECT
    DATE(cm.created_at) as movement_date,
    cr.register_code,
    w.warehouse_name,
    cm.movement_type,
    pm.method_name as payment_method,
    COUNT(cm.id) as transaction_count,
    SUM(cm.amount) as total_amount,
    SUM(cm.change_amount) as total_change,
    SUM(cm.received_amount) as total_received
FROM cash_movements cm
JOIN cash_register_sessions crs ON cm.cash_register_session_id = crs.id
JOIN cash_registers cr ON crs.cash_register_id = cr.id
JOIN warehouses w ON cr.warehouse_id = w.id
JOIN payment_methods pm ON cm.payment_method_id = pm.id
WHERE cr.deleted_at IS NULL
    AND w.deleted_at IS NULL
    AND pm.deleted_at IS NULL
GROUP BY DATE(cm.created_at), cr.id, cm.movement_type, pm.id
ORDER BY movement_date DESC, cr.register_code;

SET FOREIGN_KEY_CHECKS = 1;
