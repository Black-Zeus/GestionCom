-- =====================================================
-- Rutinas caja
-- Archivo: 20260603_1322_routines_cash.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- SECCIÓN 5: FUNCIONES Y PROCEDIMIENTOS
-- =====================================================

-- Función para obtener saldo actual de caja
DELIMITER //
CREATE FUNCTION get_cash_register_balance(session_id BIGINT UNSIGNED)
RETURNS DECIMAL(15,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE current_balance DECIMAL(15,2) DEFAULT 0;

    SELECT
        COALESCE(opening_amount, 0) + COALESCE(SUM(cm.amount), 0)
    INTO current_balance
    FROM cash_register_sessions crs
    LEFT JOIN cash_movements cm ON crs.id = cm.cash_register_session_id
    WHERE crs.id = session_id
    GROUP BY crs.id;

    RETURN COALESCE(current_balance, 0);
END//
DELIMITER ;

-- Función para validar límite de caja chica
DELIMITER //
CREATE FUNCTION validate_petty_cash_limit(user_id BIGINT UNSIGNED, expense_amount DECIMAL(15,2))
RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE user_limit DECIMAL(15,2) DEFAULT NULL;
    DECLARE is_valid BOOLEAN DEFAULT TRUE;

    SELECT petty_cash_limit INTO user_limit
    FROM users
    WHERE id = user_id AND deleted_at IS NULL;

    IF user_limit IS NOT NULL AND expense_amount > user_limit THEN
        SET is_valid = FALSE;
    END IF;

    RETURN is_valid;
END//
DELIMITER ;

-- Procedimiento para cerrar sesión de caja
DELIMITER //
CREATE PROCEDURE close_cash_register_session(
    IN p_session_id BIGINT UNSIGNED,
    IN p_physical_amount DECIMAL(15,2),
    IN p_closing_notes TEXT,
    IN p_supervisor_user_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_theoretical_amount DECIMAL(15,2);
    DECLARE v_difference DECIMAL(15,2);
    DECLARE v_max_difference DECIMAL(15,2);
    DECLARE v_requires_approval BOOLEAN DEFAULT FALSE;

    -- Calcular monto teórico
    SELECT get_cash_register_balance(p_session_id) INTO v_theoretical_amount;

    -- Calcular diferencia
    SET v_difference = p_physical_amount - v_theoretical_amount;

    -- Verificar si requiere aprobación
    SELECT cr.max_difference_amount INTO v_max_difference
    FROM cash_register_sessions crs
    JOIN cash_registers cr ON crs.cash_register_id = cr.id
    WHERE crs.id = p_session_id;

    IF ABS(v_difference) > v_max_difference THEN
        SET v_requires_approval = TRUE;
    END IF;

    -- Actualizar sesión
    UPDATE cash_register_sessions
    SET
        closing_datetime = NOW(),
        theoretical_amount = v_theoretical_amount,
        physical_amount = p_physical_amount,
        difference_amount = v_difference,
        closing_notes = p_closing_notes,
        session_status = IF(v_requires_approval, 'PENDING_CLOSE', 'CLOSED'),
        requires_supervisor_approval = v_requires_approval,
        supervisor_user_id = p_supervisor_user_id,
        is_approved = IF(v_requires_approval, FALSE, TRUE),
        approved_datetime = IF(v_requires_approval, NULL, NOW())
    WHERE id = p_session_id;

    -- Registrar movimiento de cierre
    INSERT INTO cash_movements (
        cash_register_session_id,
        movement_type,
        payment_method_id,
        amount,
        description,
        created_by_user_id
    ) VALUES (
        p_session_id,
        'CLOSING',
        (SELECT id FROM payment_methods WHERE method_code = 'CASH'),
        v_difference,
        CONCAT('Cierre de caja - Diferencia: ', v_difference),
        p_supervisor_user_id
    );

END//
DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
