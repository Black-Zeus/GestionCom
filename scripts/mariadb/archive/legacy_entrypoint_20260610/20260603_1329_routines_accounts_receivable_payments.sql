-- =====================================================
-- Rutinas documentos y pagos por cobrar
-- Archivo: 20260603_1329_routines_accounts_receivable_payments.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

DELIMITER //
CREATE PROCEDURE create_accounts_receivable(
    IN p_document_id BIGINT UNSIGNED,
    IN p_customer_id BIGINT UNSIGNED,
    IN p_amount DECIMAL(15,2),
    IN p_terms_days INT UNSIGNED
)
BEGIN
    DECLARE v_invoice_date DATE;
    DECLARE v_due_date DATE;

    -- Obtener fecha del documento
    SELECT document_date INTO v_invoice_date
    FROM documents
    WHERE id = p_document_id;

    -- Calcular fecha de vencimiento
    SET v_due_date = DATE_ADD(v_invoice_date, INTERVAL p_terms_days DAY);

    -- Crear cuenta por cobrar
    INSERT INTO accounts_receivable (
        document_id,
        customer_id,
        original_amount,
        current_balance,
        invoice_date,
        due_date,
        status
    ) VALUES (
        p_document_id,
        p_customer_id,
        p_amount,
        p_amount,
        v_invoice_date,
        v_due_date,
        'PENDING'
    );

    -- Actualizar crédito usado del cliente
    UPDATE customer_credit_config
    SET
        used_credit = used_credit + p_amount,
        available_credit = credit_limit - (used_credit + p_amount)
    WHERE customer_id = p_customer_id;

END//
DELIMITER ;

-- Procedimiento para aplicar pago a facturas
DELIMITER //
CREATE PROCEDURE apply_payment_to_invoices(
    IN p_payment_id BIGINT UNSIGNED,
    IN p_allocation_strategy ENUM('OLDEST_FIRST', 'MANUAL', 'PROPORTIONAL')
)
BEGIN
    DECLARE v_remaining_amount DECIMAL(15,2);
    DECLARE v_customer_id BIGINT UNSIGNED;
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_ar_id BIGINT UNSIGNED;
    DECLARE v_ar_balance DECIMAL(15,2);
    DECLARE v_allocation_amount DECIMAL(15,2);

    -- Cursor para facturas pendientes (ordenadas por antigüedad)
    DECLARE ar_cursor CURSOR FOR
        SELECT ar.id, ar.current_balance
        FROM accounts_receivable ar
        WHERE ar.customer_id = v_customer_id
            AND ar.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
            AND ar.current_balance > 0
        ORDER BY ar.due_date ASC, ar.invoice_date ASC;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Obtener datos del pago
    SELECT customer_id, unallocated_amount
    INTO v_customer_id, v_remaining_amount
    FROM customer_payments
    WHERE id = p_payment_id;

    -- Solo procesar si hay monto disponible
    IF v_remaining_amount > 0 AND p_allocation_strategy = 'OLDEST_FIRST' THEN

        OPEN ar_cursor;

        payment_loop: LOOP
            FETCH ar_cursor INTO v_ar_id, v_ar_balance;

            IF done THEN
                LEAVE payment_loop;
            END IF;

            -- Determinar monto a aplicar
            SET v_allocation_amount = LEAST(v_remaining_amount, v_ar_balance);

            -- Crear asignación
            INSERT INTO payment_allocations (
                customer_payment_id,
                accounts_receivable_id,
                allocated_amount,
                allocation_date,
                allocation_type,
                applied_by_user_id
            ) VALUES (
                p_payment_id,
                v_ar_id,
                v_allocation_amount,
                CURDATE(),
                'AUTOMATIC',
                1 -- Asumiendo usuario sistema
            );

            -- Actualizar saldo de cuenta por cobrar
            UPDATE accounts_receivable
            SET
                current_balance = current_balance - v_allocation_amount,
                paid_amount = paid_amount + v_allocation_amount,
                status = CASE
                    WHEN (current_balance - v_allocation_amount) = 0 THEN 'PAID'
                    WHEN (current_balance - v_allocation_amount) < original_amount THEN 'PARTIAL'
                    ELSE status
                END
            WHERE id = v_ar_id;

            -- Reducir monto restante
            SET v_remaining_amount = v_remaining_amount - v_allocation_amount;

            -- Si no queda monto, salir
            IF v_remaining_amount <= 0 THEN
                LEAVE payment_loop;
            END IF;

        END LOOP;

        CLOSE ar_cursor;

        -- Actualizar monto aplicado en el pago
        UPDATE customer_payments
        SET allocated_amount = payment_amount - v_remaining_amount
        WHERE id = p_payment_id;

        -- Actualizar crédito disponible del cliente
        UPDATE customer_credit_config
        SET
            used_credit = used_credit - (payment_amount - v_remaining_amount),
            available_credit = credit_limit - used_credit
        WHERE customer_id = v_customer_id;

    END IF;

END//
DELIMITER ;

-- Procedimiento para calcular multas por mora

SET FOREIGN_KEY_CHECKS = 1;
