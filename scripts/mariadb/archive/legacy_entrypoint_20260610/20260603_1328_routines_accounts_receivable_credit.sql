-- =====================================================
-- Rutinas credito clientes
-- Archivo: 20260603_1328_routines_accounts_receivable_credit.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- SECCIÓN 5: FUNCIONES Y PROCEDIMIENTOS
-- =====================================================

-- Función para calcular días de mora
DELIMITER //
CREATE FUNCTION calculate_overdue_days(due_date DATE)
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE overdue_days INT DEFAULT 0;

    IF due_date < CURDATE() THEN
        SET overdue_days = DATEDIFF(CURDATE(), due_date);
    END IF;

    RETURN overdue_days;
END//
DELIMITER ;

-- Función para validar límite de crédito
DELIMITER //
CREATE FUNCTION validate_credit_limit(customer_id BIGINT UNSIGNED, new_amount DECIMAL(15,2))
RETURNS JSON
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE result JSON;
    DECLARE current_used DECIMAL(15,2) DEFAULT 0;
    DECLARE credit_limit DECIMAL(15,2) DEFAULT 0;
    DECLARE available_credit DECIMAL(15,2) DEFAULT 0;
    DECLARE total_after_purchase DECIMAL(15,2) DEFAULT 0;
    DECLARE is_valid BOOLEAN DEFAULT FALSE;
    DECLARE message VARCHAR(255) DEFAULT '';

    -- Obtener configuración de crédito
    SELECT
        COALESCE(ccc.used_credit, 0),
        COALESCE(ccc.credit_limit, 0),
        COALESCE(ccc.available_credit, 0)
    INTO current_used, credit_limit, available_credit
    FROM customer_credit_config ccc
    WHERE ccc.customer_id = customer_id;

    -- Calcular total después de la compra
    SET total_after_purchase = current_used + new_amount;

    -- Validar límite
    IF total_after_purchase <= credit_limit THEN
        SET is_valid = TRUE;
        SET message = 'Transacción aprobada dentro del límite de crédito';
    ELSE
        SET is_valid = FALSE;
        SET message = CONCAT('Excede límite de crédito. Límite: ', credit_limit, ', Usado: ', total_after_purchase);
    END IF;

    -- Construir resultado JSON
    SET result = JSON_OBJECT(
        'is_valid', is_valid,
        'message', message,
        'credit_limit', credit_limit,
        'current_used', current_used,
        'available_credit', available_credit,
        'amount_requested', new_amount,
        'total_after_purchase', total_after_purchase,
        'excess_amount', GREATEST(0, total_after_purchase - credit_limit)
    );

    RETURN result;
END//
DELIMITER ;

-- Procedimiento para crear cuenta por cobrar automáticamente

SET FOREIGN_KEY_CHECKS = 1;
