-- =====================================================
-- Rutinas devoluciones y pagos de documentos
-- Archivo: 20260603_1343_routines_returns_payments.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

DELIMITER //

CREATE PROCEDURE process_return_document(
    IN p_return_document_id BIGINT UNSIGNED,
    IN p_approved_by_user_id BIGINT UNSIGNED
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_product_variant_id BIGINT UNSIGNED;
    DECLARE v_return_quantity DECIMAL(15,4);
    DECLARE v_warehouse_id BIGINT UNSIGNED;
    DECLARE v_return_to_stock BOOLEAN;
    DECLARE v_original_document_id BIGINT UNSIGNED;
    DECLARE v_return_type VARCHAR(50);
    DECLARE v_total_return_amount DECIMAL(15,2);

    -- Cursor para items de devolución
    DECLARE return_cursor CURSOR FOR
        SELECT
            rdi.product_variant_id,
            rdi.return_quantity,
            rdi.warehouse_id,
            rdi.return_to_stock
        FROM return_document_items rdi
        WHERE rdi.return_document_id = p_return_document_id;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Obtener datos de la devolución
    SELECT original_document_id, return_type, total_return_amount
    INTO v_original_document_id, v_return_type, v_total_return_amount
    FROM return_documents
    WHERE id = p_return_document_id;

    -- Actualizar estado de la devolución
    UPDATE return_documents
    SET
        return_status = 'PROCESSED',
        approved_by_user_id = p_approved_by_user_id,
        approved_at = NOW()
    WHERE id = p_return_document_id;

    -- Procesar cada item de devolución
    OPEN return_cursor;

    return_loop: LOOP
        FETCH return_cursor INTO v_product_variant_id, v_return_quantity, v_warehouse_id, v_return_to_stock;

        IF done THEN
            LEAVE return_loop;
        END IF;

        -- Si se devuelve al stock
        IF v_return_to_stock THEN
            -- Actualizar stock
            UPDATE stock
            SET current_quantity = current_quantity + v_return_quantity,
                last_movement_date = NOW(),
                last_movement_type = 'IN'
            WHERE product_variant_id = v_product_variant_id
                AND warehouse_id = v_warehouse_id;

            -- Crear movimiento de stock
            INSERT INTO stock_movements (
                product_variant_id,
                warehouse_id,
                movement_type,
                reference_type,
                reference_document_id,
                quantity,
                quantity_before,
                quantity_after,
                notes,
                created_by_user_id
            ) VALUES (
                v_product_variant_id,
                v_warehouse_id,
                'IN',
                'RETURN',
                p_return_document_id,
                v_return_quantity,
                (SELECT current_quantity FROM stock WHERE product_variant_id = v_product_variant_id AND warehouse_id = v_warehouse_id) - v_return_quantity,
                (SELECT current_quantity FROM stock WHERE product_variant_id = v_product_variant_id AND warehouse_id = v_warehouse_id),
                CONCAT('Devolución procesada - Documento: ', p_return_document_id),
                p_approved_by_user_id
            );
        END IF;

    END LOOP;

    CLOSE return_cursor;

    -- Si es reembolso, crear documento de nota de crédito automáticamente
    IF v_return_type IN ('REFUND', 'CREDIT_NOTE') THEN
        INSERT INTO documents (
            document_type_id,
            document_series_id,
            document_number,
            document_date,
            source_warehouse_id,
            total_amount,
            document_status,
            is_return,
            original_document_id,
            return_type,
            created_by_user_id,
            notes
        ) VALUES (
            (SELECT id FROM document_types WHERE document_type_code = 'CREDIT_NOTE'),
            (SELECT id FROM document_series WHERE document_type_id = (SELECT id FROM document_types WHERE document_type_code = 'CREDIT_NOTE') LIMIT 1),
            CONCAT('NC-', LPAD(p_return_document_id, 8, '0')),
            CURDATE(),
            v_warehouse_id,
            v_total_return_amount,
            'APPROVED',
            TRUE,
            v_original_document_id,
            v_return_type,
            p_approved_by_user_id,
            CONCAT('Nota de crédito por devolución ID: ', p_return_document_id)
        );
    END IF;

END//

DELIMITER ;

-- Procedimiento para validar pagos fraccionados
DELIMITER //

CREATE PROCEDURE validate_document_payments(
    IN p_document_id BIGINT UNSIGNED,
    OUT p_is_valid BOOLEAN,
    OUT p_total_paid DECIMAL(15,2),
    OUT p_difference DECIMAL(15,2),
    OUT p_validation_message VARCHAR(255)
)
BEGIN
    DECLARE v_document_total DECIMAL(15,2);
    DECLARE v_payments_total DECIMAL(15,2);

    -- Obtener total del documento
    SELECT total_amount INTO v_document_total
    FROM documents
    WHERE id = p_document_id;

    -- Obtener total de pagos
    SELECT COALESCE(SUM(payment_amount), 0) INTO v_payments_total
    FROM document_payment_details
    WHERE document_id = p_document_id
        AND payment_status = 'APPROVED';

    -- Calcular diferencia
    SET p_total_paid = v_payments_total;
    SET p_difference = v_document_total - v_payments_total;

    -- Validar (tolerancia de 1 centavo)
    IF ABS(p_difference) <= 0.01 THEN
        SET p_is_valid = TRUE;
        SET p_validation_message = 'Pagos balanceados correctamente';
    ELSEIF p_difference > 0.01 THEN
        SET p_is_valid = FALSE;
        SET p_validation_message = CONCAT('Falta pagar: ', FORMAT(p_difference, 2));
    ELSE
        SET p_is_valid = FALSE;
        SET p_validation_message = CONCAT('Exceso de pago: ', FORMAT(ABS(p_difference), 2));
    END IF;

END//

DELIMITER ;

-- Procedimiento para generar alertas de stock crítico

SET FOREIGN_KEY_CHECKS = 1;
