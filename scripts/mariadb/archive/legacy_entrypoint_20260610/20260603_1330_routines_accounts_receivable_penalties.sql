-- =====================================================
-- Rutinas mora y excepciones de credito
-- Archivo: 20260603_1330_routines_accounts_receivable_penalties.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

DELIMITER //
CREATE PROCEDURE calculate_penalties_for_customer(
    IN p_customer_id BIGINT UNSIGNED,
    IN p_calculation_date DATE
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_ar_id BIGINT UNSIGNED;
    DECLARE v_current_balance DECIMAL(15,2);
    DECLARE v_days_overdue INT;
    DECLARE v_penalty_rate DECIMAL(5,2);
    DECLARE v_penalty_amount DECIMAL(15,2);
    DECLARE v_grace_period INT;

    -- Cursor para facturas vencidas
    DECLARE overdue_cursor CURSOR FOR
        SELECT
            ar.id,
            ar.current_balance,
            DATEDIFF(p_calculation_date, ar.due_date) as days_overdue
        FROM accounts_receivable ar
        WHERE ar.customer_id = p_customer_id
            AND ar.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
            AND ar.current_balance > 0
            AND ar.due_date < p_calculation_date;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Obtener configuración de multas del cliente
    SELECT penalty_rate, grace_period_days
    INTO v_penalty_rate, v_grace_period
    FROM customer_credit_config
    WHERE customer_id = p_customer_id;

    OPEN overdue_cursor;

    penalty_loop: LOOP
        FETCH overdue_cursor INTO v_ar_id, v_current_balance, v_days_overdue;

        IF done THEN
            LEAVE penalty_loop;
        END IF;

        -- Solo aplicar multa si excede el período de gracia
        IF v_days_overdue > v_grace_period THEN

            -- Calcular multa (por mes de mora)
            SET v_penalty_amount = v_current_balance * (v_penalty_rate / 100) * (v_days_overdue / 30);

            -- Verificar si ya existe multa para este período
            IF NOT EXISTS (
                SELECT 1 FROM customer_penalties
                WHERE accounts_receivable_id = v_ar_id
                    AND period_to >= p_calculation_date
                    AND is_applied = FALSE
            ) THEN

                -- Insertar nueva multa
                INSERT INTO customer_penalties (
                    accounts_receivable_id,
                    customer_id,
                    penalty_amount,
                    penalty_rate,
                    days_overdue,
                    calculation_base,
                    penalty_description,
                    period_from,
                    period_to,
                    created_by_user_id
                ) VALUES (
                    v_ar_id,
                    p_customer_id,
                    v_penalty_amount,
                    v_penalty_rate,
                    v_days_overdue,
                    v_current_balance,
                    CONCAT('Multa por ', v_days_overdue, ' días de mora'),
                    DATE_SUB(p_calculation_date, INTERVAL 30 DAY),
                    p_calculation_date,
                    1 -- Usuario sistema
                );

                -- Actualizar días de mora en cuenta por cobrar
                UPDATE accounts_receivable
                SET
                    days_overdue = v_days_overdue,
                    status = 'OVERDUE',
                    first_overdue_date = COALESCE(first_overdue_date, due_date)
                WHERE id = v_ar_id;

            END IF;

        END IF;

    END LOOP;

    CLOSE overdue_cursor;

END//
DELIMITER ;

-- Procedimiento para generar excepción de límite de crédito
DELIMITER //
CREATE PROCEDURE create_credit_limit_exception(
    IN p_customer_id BIGINT UNSIGNED,
    IN p_document_id BIGINT UNSIGNED,
    IN p_exception_amount DECIMAL(15,2),
    IN p_reason TEXT,
    IN p_authorized_by_user_id BIGINT UNSIGNED,
    IN p_is_temporary BOOLEAN,
    IN p_expires_days INT UNSIGNED
)
BEGIN
    DECLARE v_current_limit DECIMAL(15,2);
    DECLARE v_new_limit DECIMAL(15,2);
    DECLARE v_expires_date DATE DEFAULT NULL;

    -- Obtener límite actual
    SELECT credit_limit INTO v_current_limit
    FROM customer_credit_config
    WHERE customer_id = p_customer_id;

    -- Calcular nuevo límite
    SET v_new_limit = v_current_limit + p_exception_amount;

    -- Calcular fecha de expiración si es temporal
    IF p_is_temporary THEN
        SET v_expires_date = DATE_ADD(CURDATE(), INTERVAL p_expires_days DAY);
    END IF;

    -- Crear excepción
    INSERT INTO credit_limit_exceptions (
        customer_id,
        document_id,
        original_limit,
        exception_amount,
        new_effective_limit,
        reason,
        is_temporary,
        expires_at,
        authorized_by_user_id,
        authorization_level
    ) VALUES (
        p_customer_id,
        p_document_id,
        v_current_limit,
        p_exception_amount,
        v_new_limit,
        p_reason,
        p_is_temporary,
        v_expires_date,
        p_authorized_by_user_id,
        'SUPERVISOR' -- Por defecto, puede ajustarse según el usuario
    );

    -- Actualizar límite temporalmente
    UPDATE customer_credit_config
    SET
        credit_limit = v_new_limit,
        available_credit = v_new_limit - used_credit
    WHERE customer_id = p_customer_id;

END//
DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
