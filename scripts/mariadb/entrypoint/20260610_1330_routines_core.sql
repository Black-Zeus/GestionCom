USE inventario;

-- Consolidated routines generated from legacy entrypoint routine scripts.
-- Source: 20260603_1317_routines_dte.sql
-- =====================================================
-- Rutinas DTE
-- Archivo: 20260603_1317_routines_dte.sql
-- =====================================================
SET
    FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- FUNCIONES ÃšTILES PARA DTE
-- =====================================================
-- FunciÃ³n para obtener siguiente folio
DELIMITER //
CREATE FUNCTION get_next_dte_folio(
    company_rut_param VARCHAR(12),
    dte_type VARCHAR(10)
) RETURNS BIGINT UNSIGNED READS SQL DATA DETERMINISTIC BEGIN DECLARE next_folio BIGINT UNSIGNED DEFAULT 1;

CASE
    dte_type
    WHEN '33' THEN
    SELECT
        current_folio_33 + 1 INTO next_folio
    FROM
        dte_company_config
    WHERE
        company_rut = company_rut_param
        AND is_active = TRUE;

UPDATE
    dte_company_config
SET
    current_folio_33 = next_folio
WHERE
    company_rut = company_rut_param;

WHEN '39' THEN
SELECT
    current_folio_39 + 1 INTO next_folio
FROM
    dte_company_config
WHERE
    company_rut = company_rut_param
    AND is_active = TRUE;

UPDATE
    dte_company_config
SET
    current_folio_39 = next_folio
WHERE
    company_rut = company_rut_param;

WHEN '52' THEN
SELECT
    current_folio_52 + 1 INTO next_folio
FROM
    dte_company_config
WHERE
    company_rut = company_rut_param
    AND is_active = TRUE;

UPDATE
    dte_company_config
SET
    current_folio_52 = next_folio
WHERE
    company_rut = company_rut_param;

WHEN '61' THEN
SELECT
    current_folio_61 + 1 INTO next_folio
FROM
    dte_company_config
WHERE
    company_rut = company_rut_param
    AND is_active = TRUE;

UPDATE
    dte_company_config
SET
    current_folio_61 = next_folio
WHERE
    company_rut = company_rut_param;

END CASE
;

RETURN next_folio;

END//
DELIMITER ;

SET
    FOREIGN_KEY_CHECKS = 1;

-- Source: 20260603_1322_routines_cash.sql
-- =====================================================
-- Rutinas caja
-- Archivo: 20260603_1322_routines_cash.sql
-- =====================================================
SET
    FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- SECCIÃ“N 5: FUNCIONES Y PROCEDIMIENTOS
-- =====================================================
-- FunciÃ³n para obtener saldo actual de caja
DELIMITER //
CREATE FUNCTION get_cash_register_balance(session_id BIGINT UNSIGNED) RETURNS DECIMAL(15, 2) READS SQL DATA DETERMINISTIC BEGIN DECLARE current_balance DECIMAL(15, 2) DEFAULT 0;

SELECT
    COALESCE(opening_amount, 0) + COALESCE(SUM(cm.amount), 0) INTO current_balance
FROM
    cash_register_sessions crs
    LEFT JOIN cash_movements cm ON crs.id = cm.cash_register_session_id
WHERE
    crs.id = session_id
GROUP BY
    crs.id;

RETURN COALESCE(current_balance, 0);

END//
DELIMITER ;

-- FunciÃ³n para validar lÃ­mite de caja chica
DELIMITER //
CREATE FUNCTION validate_petty_cash_limit(
    user_id BIGINT UNSIGNED,
    expense_amount DECIMAL(15, 2)
) RETURNS BOOLEAN READS SQL DATA DETERMINISTIC BEGIN DECLARE user_limit DECIMAL(15, 2) DEFAULT NULL;

DECLARE is_valid BOOLEAN DEFAULT TRUE;

SELECT
    petty_cash_limit INTO user_limit
FROM
    users
WHERE
    id = user_id
    AND deleted_at IS NULL;

IF user_limit IS NOT NULL
AND expense_amount > user_limit THEN
SET
    is_valid = FALSE;

END IF;

RETURN is_valid;

END//
DELIMITER ;

-- Procedimiento para cerrar sesiÃ³n de caja
DELIMITER //
CREATE PROCEDURE close_cash_register_session(
    IN p_session_id BIGINT UNSIGNED,
    IN p_physical_amount DECIMAL(15, 2),
    IN p_closing_notes TEXT,
    IN p_supervisor_user_id BIGINT UNSIGNED
) BEGIN DECLARE v_theoretical_amount DECIMAL(15, 2);

DECLARE v_difference DECIMAL(15, 2);

DECLARE v_max_difference DECIMAL(15, 2);

DECLARE v_requires_approval BOOLEAN DEFAULT FALSE;

-- Calcular monto teÃ³rico
SELECT
    get_cash_register_balance(p_session_id) INTO v_theoretical_amount;

-- Calcular diferencia
SET
    v_difference = p_physical_amount - v_theoretical_amount;

-- Verificar si requiere aprobaciÃ³n
SELECT
    cr.max_difference_amount INTO v_max_difference
FROM
    cash_register_sessions crs
    JOIN cash_registers cr ON crs.cash_register_id = cr.id
WHERE
    crs.id = p_session_id;

IF ABS(v_difference) > v_max_difference THEN
SET
    v_requires_approval = TRUE;

END IF;

-- Actualizar sesiÃ³n
UPDATE
    cash_register_sessions
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
WHERE
    id = p_session_id;

-- Registrar movimiento de cierre
INSERT INTO
    cash_movements (
        cash_register_session_id,
        movement_type,
        payment_method_id,
        amount,
        description,
        created_by_user_id
    )
VALUES
    (
        p_session_id,
        'CLOSING',
        (
            SELECT
                id
            FROM
                payment_methods
            WHERE
                method_code = 'CASH'
        ),
        v_difference,
        CONCAT('Cierre de caja - Diferencia: ', v_difference),
        p_supervisor_user_id
    );

END//
DELIMITER ;

SET
    FOREIGN_KEY_CHECKS = 1;

-- Source: 20260603_1328_routines_accounts_receivable_credit.sql
-- =====================================================
-- Rutinas credito clientes
-- Archivo: 20260603_1328_routines_accounts_receivable_credit.sql
-- =====================================================
SET
    FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- SECCIÃ“N 5: FUNCIONES Y PROCEDIMIENTOS
-- =====================================================
-- FunciÃ³n para calcular dÃ­as de mora
DELIMITER //
CREATE FUNCTION calculate_overdue_days(due_date DATE) RETURNS INT READS SQL DATA DETERMINISTIC BEGIN DECLARE overdue_days INT DEFAULT 0;

IF due_date < CURDATE() THEN
SET
    overdue_days = DATEDIFF(CURDATE(), due_date);

END IF;

RETURN overdue_days;

END//
DELIMITER ;

-- FunciÃ³n para validar lÃ­mite de crÃ©dito
DELIMITER //
CREATE FUNCTION validate_credit_limit(
    customer_id BIGINT UNSIGNED,
    new_amount DECIMAL(15, 2)
) RETURNS JSON READS SQL DATA DETERMINISTIC BEGIN DECLARE result JSON;

DECLARE current_used DECIMAL(15, 2) DEFAULT 0;

DECLARE credit_limit DECIMAL(15, 2) DEFAULT 0;

DECLARE available_credit DECIMAL(15, 2) DEFAULT 0;

DECLARE total_after_purchase DECIMAL(15, 2) DEFAULT 0;

DECLARE is_valid BOOLEAN DEFAULT FALSE;

DECLARE message VARCHAR(255) DEFAULT '';

-- Obtener configuraciÃ³n de crÃ©dito
SELECT
    COALESCE(ccc.used_credit, 0),
    COALESCE(ccc.credit_limit, 0),
    COALESCE(ccc.available_credit, 0) INTO current_used,
    credit_limit,
    available_credit
FROM
    customer_credit_config ccc
WHERE
    ccc.customer_id = customer_id;

-- Calcular total despuÃ©s de la compra
SET
    total_after_purchase = current_used + new_amount;

-- Validar lÃ­mite
IF total_after_purchase <= credit_limit THEN
SET
    is_valid = TRUE;

SET
    message = 'TransacciÃ³n aprobada dentro del lÃ­mite de crÃ©dito';

ELSE
SET
    is_valid = FALSE;

SET
    message = CONCAT(
        'Excede lÃ­mite de crÃ©dito. LÃ­mite: ',
        credit_limit,
        ', Usado: ',
        total_after_purchase
    );

END IF;

-- Construir resultado JSON
SET
    result = JSON_OBJECT(
        'is_valid',
        is_valid,
        'message',
        message,
        'credit_limit',
        credit_limit,
        'current_used',
        current_used,
        'available_credit',
        available_credit,
        'amount_requested',
        new_amount,
        'total_after_purchase',
        total_after_purchase,
        'excess_amount',
        GREATEST(0, total_after_purchase - credit_limit)
    );

RETURN result;

END//
DELIMITER ;

-- Procedimiento para crear cuenta por cobrar automÃ¡ticamente
SET
    FOREIGN_KEY_CHECKS = 1;

-- Source: 20260603_1329_routines_accounts_receivable_payments.sql
-- =====================================================
-- Rutinas documentos y pagos por cobrar
-- Archivo: 20260603_1329_routines_accounts_receivable_payments.sql
-- =====================================================
SET
    FOREIGN_KEY_CHECKS = 0;

DELIMITER //
CREATE PROCEDURE create_accounts_receivable(
    IN p_document_id BIGINT UNSIGNED,
    IN p_customer_id BIGINT UNSIGNED,
    IN p_amount DECIMAL(15, 2),
    IN p_terms_days INT UNSIGNED
) BEGIN DECLARE v_invoice_date DATE;

DECLARE v_due_date DATE;

-- Obtener fecha del documento
SELECT
    document_date INTO v_invoice_date
FROM
    documents
WHERE
    id = p_document_id;

-- Calcular fecha de vencimiento
SET
    v_due_date = DATE_ADD(v_invoice_date, INTERVAL p_terms_days DAY);

-- Crear cuenta por cobrar
INSERT INTO
    accounts_receivable (
        document_id,
        customer_id,
        original_amount,
        current_balance,
        invoice_date,
        due_date,
        status
    )
VALUES
    (
        p_document_id,
        p_customer_id,
        p_amount,
        p_amount,
        v_invoice_date,
        v_due_date,
        'PENDING'
    );

-- Actualizar crÃ©dito usado del cliente
UPDATE
    customer_credit_config
SET
    used_credit = used_credit + p_amount,
    available_credit = credit_limit - (used_credit + p_amount)
WHERE
    customer_id = p_customer_id;

END//
DELIMITER ;

-- Procedimiento para aplicar pago a facturas
DELIMITER //
CREATE PROCEDURE apply_payment_to_invoices(
    IN p_payment_id BIGINT UNSIGNED,
    IN p_allocation_strategy ENUM('OLDEST_FIRST', 'MANUAL', 'PROPORTIONAL')
) BEGIN DECLARE v_remaining_amount DECIMAL(15, 2);

DECLARE v_customer_id BIGINT UNSIGNED;

DECLARE done INT DEFAULT FALSE;

DECLARE v_ar_id BIGINT UNSIGNED;

DECLARE v_ar_balance DECIMAL(15, 2);

DECLARE v_allocation_amount DECIMAL(15, 2);

-- Cursor para facturas pendientes (ordenadas por antigÃ¼edad)
DECLARE ar_cursor CURSOR FOR
SELECT
    ar.id,
    ar.current_balance
FROM
    accounts_receivable ar
WHERE
    ar.customer_id = v_customer_id
    AND ar.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
    AND ar.current_balance > 0
ORDER BY
    ar.due_date ASC,
    ar.invoice_date ASC;

DECLARE CONTINUE HANDLER FOR NOT FOUND
SET
    done = TRUE;

-- Obtener datos del pago
SELECT
    customer_id,
    unallocated_amount INTO v_customer_id,
    v_remaining_amount
FROM
    customer_payments
WHERE
    id = p_payment_id;

-- Solo procesar si hay monto disponible
IF v_remaining_amount > 0
AND p_allocation_strategy = 'OLDEST_FIRST' THEN OPEN ar_cursor;

payment_loop: LOOP FETCH ar_cursor INTO v_ar_id,
v_ar_balance;

IF done THEN LEAVE payment_loop;

END IF;

-- Determinar monto a aplicar
SET
    v_allocation_amount = LEAST(v_remaining_amount, v_ar_balance);

-- Crear asignaciÃ³n
INSERT INTO
    payment_allocations (
        customer_payment_id,
        accounts_receivable_id,
        allocated_amount,
        allocation_date,
        allocation_type,
        applied_by_user_id
    )
VALUES
    (
        p_payment_id,
        v_ar_id,
        v_allocation_amount,
        CURDATE(),
        'AUTOMATIC',
        1 -- Asumiendo usuario sistema
    );

-- Actualizar saldo de cuenta por cobrar
UPDATE
    accounts_receivable
SET
    current_balance = current_balance - v_allocation_amount,
    paid_amount = paid_amount + v_allocation_amount,
    status = CASE
        WHEN (current_balance - v_allocation_amount) = 0 THEN 'PAID'
        WHEN (current_balance - v_allocation_amount) < original_amount THEN 'PARTIAL'
        ELSE status
    END
WHERE
    id = v_ar_id;

-- Reducir monto restante
SET
    v_remaining_amount = v_remaining_amount - v_allocation_amount;

-- Si no queda monto, salir
IF v_remaining_amount <= 0 THEN LEAVE payment_loop;

END IF;

END LOOP;

CLOSE ar_cursor;

-- Actualizar monto aplicado en el pago
UPDATE
    customer_payments
SET
    allocated_amount = payment_amount - v_remaining_amount
WHERE
    id = p_payment_id;

-- Actualizar crÃ©dito disponible del cliente
UPDATE
    customer_credit_config
SET
    used_credit = used_credit - (payment_amount - v_remaining_amount),
    available_credit = credit_limit - used_credit
WHERE
    customer_id = v_customer_id;

END IF;

END//
DELIMITER ;

-- Procedimiento para calcular multas por mora
SET
    FOREIGN_KEY_CHECKS = 1;

-- Source: 20260603_1330_routines_accounts_receivable_penalties.sql
-- =====================================================
-- Rutinas mora y excepciones de credito
-- Archivo: 20260603_1330_routines_accounts_receivable_penalties.sql
-- =====================================================
SET
    FOREIGN_KEY_CHECKS = 0;

DELIMITER //
CREATE PROCEDURE calculate_penalties_for_customer(
    IN p_customer_id BIGINT UNSIGNED,
    IN p_calculation_date DATE
) BEGIN DECLARE done INT DEFAULT FALSE;

DECLARE v_ar_id BIGINT UNSIGNED;

DECLARE v_current_balance DECIMAL(15, 2);

DECLARE v_days_overdue INT;

DECLARE v_penalty_rate DECIMAL(5, 2);

DECLARE v_penalty_amount DECIMAL(15, 2);

DECLARE v_grace_period INT;

-- Cursor para facturas vencidas
DECLARE overdue_cursor CURSOR FOR
SELECT
    ar.id,
    ar.current_balance,
    DATEDIFF(p_calculation_date, ar.due_date) as days_overdue
FROM
    accounts_receivable ar
WHERE
    ar.customer_id = p_customer_id
    AND ar.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
    AND ar.current_balance > 0
    AND ar.due_date < p_calculation_date;

DECLARE CONTINUE HANDLER FOR NOT FOUND
SET
    done = TRUE;

-- Obtener configuraciÃ³n de multas del cliente
SELECT
    penalty_rate,
    grace_period_days INTO v_penalty_rate,
    v_grace_period
FROM
    customer_credit_config
WHERE
    customer_id = p_customer_id;

OPEN overdue_cursor;

penalty_loop: LOOP FETCH overdue_cursor INTO v_ar_id,
v_current_balance,
v_days_overdue;

IF done THEN LEAVE penalty_loop;

END IF;

-- Solo aplicar multa si excede el perÃ­odo de gracia
IF v_days_overdue > v_grace_period THEN -- Calcular multa (por mes de mora)
SET
    v_penalty_amount = v_current_balance * (v_penalty_rate / 100) * (v_days_overdue / 30);

-- Verificar si ya existe multa para este perÃ­odo
IF NOT EXISTS (
    SELECT
        1
    FROM
        customer_penalties
    WHERE
        accounts_receivable_id = v_ar_id
        AND period_to >= p_calculation_date
        AND is_applied = FALSE
) THEN -- Insertar nueva multa
INSERT INTO
    customer_penalties (
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
    )
VALUES
    (
        v_ar_id,
        p_customer_id,
        v_penalty_amount,
        v_penalty_rate,
        v_days_overdue,
        v_current_balance,
        CONCAT('Multa por ', v_days_overdue, ' dÃ­as de mora'),
        DATE_SUB(p_calculation_date, INTERVAL 30 DAY),
        p_calculation_date,
        1 -- Usuario sistema
    );

-- Actualizar dÃ­as de mora en cuenta por cobrar
UPDATE
    accounts_receivable
SET
    days_overdue = v_days_overdue,
    status = 'OVERDUE',
    first_overdue_date = COALESCE(first_overdue_date, due_date)
WHERE
    id = v_ar_id;

END IF;

END IF;

END LOOP;

CLOSE overdue_cursor;

END//
DELIMITER ;

-- Procedimiento para generar excepciÃ³n de lÃ­mite de crÃ©dito
DELIMITER //
CREATE PROCEDURE create_credit_limit_exception(
    IN p_customer_id BIGINT UNSIGNED,
    IN p_document_id BIGINT UNSIGNED,
    IN p_exception_amount DECIMAL(15, 2),
    IN p_reason TEXT,
    IN p_authorized_by_user_id BIGINT UNSIGNED,
    IN p_is_temporary BOOLEAN,
    IN p_expires_days INT UNSIGNED
) BEGIN DECLARE v_current_limit DECIMAL(15, 2);

DECLARE v_new_limit DECIMAL(15, 2);

DECLARE v_expires_date DATE DEFAULT NULL;

-- Obtener lÃ­mite actual
SELECT
    credit_limit INTO v_current_limit
FROM
    customer_credit_config
WHERE
    customer_id = p_customer_id;

-- Calcular nuevo lÃ­mite
SET
    v_new_limit = v_current_limit + p_exception_amount;

-- Calcular fecha de expiraciÃ³n si es temporal
IF p_is_temporary THEN
SET
    v_expires_date = DATE_ADD(CURDATE(), INTERVAL p_expires_days DAY);

END IF;

-- Crear excepciÃ³n
INSERT INTO
    credit_limit_exceptions (
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
    )
VALUES
    (
        p_customer_id,
        p_document_id,
        v_current_limit,
        p_exception_amount,
        v_new_limit,
        p_reason,
        p_is_temporary,
        v_expires_date,
        p_authorized_by_user_id,
        'SUPERVISOR' -- Por defecto, puede ajustarse segÃºn el usuario
    );

-- Actualizar lÃ­mite temporalmente
UPDATE
    customer_credit_config
SET
    credit_limit = v_new_limit,
    available_credit = v_new_limit - used_credit
WHERE
    customer_id = p_customer_id;

END//
DELIMITER ;

SET
    FOREIGN_KEY_CHECKS = 1;

-- Source: 20260603_1334_routines_menu.sql
-- =====================================================
-- Rutinas menu
-- Archivo: 20260603_1334_routines_menu.sql
-- =====================================================
SET
    FOREIGN_KEY_CHECKS = 0;

DELIMITER //
CREATE PROCEDURE get_user_menu_api(
    IN p_user_id BIGINT UNSIGNED,
    IN p_include_favorites BOOLEAN
) BEGIN -- Si no se pasa el valor para p_include_favorites, establecerlo en TRUE por defecto
IF p_include_favorites IS NULL THEN
SET
    p_include_favorites = TRUE;

END IF;

-- MenÃº principal
SELECT
    menu_item_id AS id,
    parent_id,
    menu_code AS code,
    menu_name AS name,
    menu_description AS description,
    icon_name AS icon,
    icon_color AS iconColor,
    menu_url AS url,
    menu_type AS type,
    sort_order AS sortOrder,
    menu_level AS level,
    menu_path AS path,
    target_window AS target,
    css_classes AS cssClasses,
    data_attributes AS dataAttributes,
    is_favorite AS isFavorite,
    favorite_order AS favoriteOrder
FROM
    v_user_menu
WHERE
    user_id = p_user_id
    AND has_access = TRUE
ORDER BY
    menu_level,
    sort_order,
    menu_name;

-- MenÃºs favoritos (si se solicitan)
IF p_include_favorites THEN
SELECT
    menu_item_id AS id,
    menu_code AS code,
    menu_name AS name,
    icon_name AS icon,
    icon_color AS iconColor,
    menu_url AS url,
    favorite_order AS orderReg,
    favorited_at AS favoritedAt
FROM
    v_user_favorites_menu
WHERE
    user_id = p_user_id
ORDER BY
    favorite_order;

END IF;

END//
DELIMITER ;

-- Procedimiento para bÃºsqueda de menÃºs
DELIMITER //
CREATE PROCEDURE search_menu_items(
    IN p_user_id BIGINT UNSIGNED,
    IN p_search_term VARCHAR(255)
) BEGIN
SELECT
    menu_item_id AS id,
    menu_code AS code,
    menu_name AS name,
    menu_description AS description,
    icon_name AS icon,
    icon_color AS iconColor,
    menu_url AS url,
    menu_path AS path,
    MATCH(menu_name, menu_description) AGAINST(p_search_term IN BOOLEAN MODE) AS relevance
FROM
    v_user_menu
WHERE
    user_id = p_user_id
    AND has_access = TRUE
    AND MATCH(menu_name, menu_description) AGAINST(p_search_term IN BOOLEAN MODE)
ORDER BY
    relevance DESC,
    menu_name ASC
LIMIT
    20;

END//
DELIMITER ;

SET
    FOREIGN_KEY_CHECKS = 1;

-- Source: 20260603_1342_routines_critical_stockout.sql
-- =====================================================
-- Rutinas calculo quiebre stock
-- Archivo: 20260603_1342_routines_critical_stockout.sql
-- =====================================================
SET
    FOREIGN_KEY_CHECKS = 0;

-- SECCIÃ“N 6: FUNCIONES Y PROCEDIMIENTOS
-- =====================================================
-- FunciÃ³n para calcular dÃ­as hasta agotamiento de stock
DELIMITER //
CREATE FUNCTION calculate_stockout_days(
    current_stock DECIMAL(15, 4),
    avg_daily_sales DECIMAL(15, 4)
) RETURNS DECIMAL(5, 2) READS SQL DATA DETERMINISTIC BEGIN DECLARE days_until_stockout DECIMAL(5, 2);

IF avg_daily_sales <= 0
OR current_stock <= 0 THEN RETURN NULL;

END IF;

SET
    days_until_stockout = current_stock / avg_daily_sales;

RETURN ROUND(days_until_stockout, 2);

END//
DELIMITER ;

-- Procedimiento para procesar devoluciÃ³n completa
SET
    FOREIGN_KEY_CHECKS = 1;

-- Source: 20260603_1343_routines_returns_payments.sql
-- =====================================================
-- Rutinas devoluciones y pagos de documentos
-- Archivo: 20260603_1343_routines_returns_payments.sql
-- =====================================================
SET
    FOREIGN_KEY_CHECKS = 0;

DELIMITER //
CREATE PROCEDURE process_return_document(
    IN p_return_document_id BIGINT UNSIGNED,
    IN p_approved_by_user_id BIGINT UNSIGNED
) BEGIN DECLARE done INT DEFAULT FALSE;

DECLARE v_product_variant_id BIGINT UNSIGNED;

DECLARE v_return_quantity DECIMAL(15, 4);

DECLARE v_warehouse_id BIGINT UNSIGNED;

DECLARE v_return_to_stock BOOLEAN;

DECLARE v_original_document_id BIGINT UNSIGNED;

DECLARE v_return_type VARCHAR(50);

DECLARE v_total_return_amount DECIMAL(15, 2);

-- Cursor para items de devoluciÃ³n
DECLARE return_cursor CURSOR FOR
SELECT
    rdi.product_variant_id,
    rdi.return_quantity,
    rdi.warehouse_id,
    rdi.return_to_stock
FROM
    return_document_items rdi
WHERE
    rdi.return_document_id = p_return_document_id;

DECLARE CONTINUE HANDLER FOR NOT FOUND
SET
    done = TRUE;

-- Obtener datos de la devoluciÃ³n
SELECT
    original_document_id,
    return_type,
    total_return_amount INTO v_original_document_id,
    v_return_type,
    v_total_return_amount
FROM
    return_documents
WHERE
    id = p_return_document_id;

-- Actualizar estado de la devoluciÃ³n
UPDATE
    return_documents
SET
    return_status = 'PROCESSED',
    approved_by_user_id = p_approved_by_user_id,
    approved_at = NOW()
WHERE
    id = p_return_document_id;

-- Procesar cada item de devoluciÃ³n
OPEN return_cursor;

return_loop: LOOP FETCH return_cursor INTO v_product_variant_id,
v_return_quantity,
v_warehouse_id,
v_return_to_stock;

IF done THEN LEAVE return_loop;

END IF;

-- Si se devuelve al stock
IF v_return_to_stock THEN -- Actualizar stock
UPDATE
    stock
SET
    current_quantity = current_quantity + v_return_quantity,
    last_movement_date = NOW(),
    last_movement_type = 'IN'
WHERE
    product_variant_id = v_product_variant_id
    AND warehouse_id = v_warehouse_id;

-- Crear movimiento de stock
INSERT INTO
    stock_movements (
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
    )
VALUES
    (
        v_product_variant_id,
        v_warehouse_id,
        'IN',
        'RETURN',
        p_return_document_id,
        v_return_quantity,
        (
            SELECT
                current_quantity
            FROM
                stock
            WHERE
                product_variant_id = v_product_variant_id
                AND warehouse_id = v_warehouse_id
        ) - v_return_quantity,
        (
            SELECT
                current_quantity
            FROM
                stock
            WHERE
                product_variant_id = v_product_variant_id
                AND warehouse_id = v_warehouse_id
        ),
        CONCAT(
            'DevoluciÃ³n procesada - Documento: ',
            p_return_document_id
        ),
        p_approved_by_user_id
    );

END IF;

END LOOP;

CLOSE return_cursor;

-- Si es reembolso, crear documento de nota de crÃ©dito automÃ¡ticamente
IF v_return_type IN ('REFUND', 'CREDIT_NOTE') THEN
INSERT INTO
    documents (
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
    )
VALUES
    (
        (
            SELECT
                id
            FROM
                document_types
            WHERE
                document_type_code = 'CREDIT_NOTE'
        ),
        (
            SELECT
                id
            FROM
                document_series
            WHERE
                document_type_id = (
                    SELECT
                        id
                    FROM
                        document_types
                    WHERE
                        document_type_code = 'CREDIT_NOTE'
                )
            LIMIT
                1
        ), CONCAT('NC-', LPAD(p_return_document_id, 8, '0')), CURDATE(), v_warehouse_id, v_total_return_amount, 'APPROVED', TRUE,
        v_original_document_id,
        v_return_type,
        p_approved_by_user_id,
        CONCAT(
            'Nota de crÃ©dito por devoluciÃ³n ID: ',
            p_return_document_id
        )
    );

END IF;

END//
DELIMITER ;

-- Procedimiento para validar pagos fraccionados
DELIMITER //
CREATE PROCEDURE validate_document_payments(
    IN p_document_id BIGINT UNSIGNED,
    OUT p_is_valid BOOLEAN,
    OUT p_total_paid DECIMAL(15, 2),
    OUT p_difference DECIMAL(15, 2),
    OUT p_validation_message VARCHAR(255)
) BEGIN DECLARE v_document_total DECIMAL(15, 2);

DECLARE v_payments_total DECIMAL(15, 2);

-- Obtener total del documento
SELECT
    total_amount INTO v_document_total
FROM
    documents
WHERE
    id = p_document_id;

-- Obtener total de pagos
SELECT
    COALESCE(SUM(payment_amount), 0) INTO v_payments_total
FROM
    document_payment_details
WHERE
    document_id = p_document_id
    AND payment_status = 'APPROVED';

-- Calcular diferencia
SET
    p_total_paid = v_payments_total;

SET
    p_difference = v_document_total - v_payments_total;

-- Validar (tolerancia de 1 centavo)
IF ABS(p_difference) <= 0.01 THEN
SET
    p_is_valid = TRUE;

SET
    p_validation_message = 'Pagos balanceados correctamente';

ELSEIF p_difference > 0.01 THEN
SET
    p_is_valid = FALSE;

SET
    p_validation_message = CONCAT('Falta pagar: ', FORMAT(p_difference, 2));

ELSE
SET
    p_is_valid = FALSE;

SET
    p_validation_message = CONCAT('Exceso de pago: ', FORMAT(ABS(p_difference), 2));

END IF;

END//
DELIMITER ;

-- Procedimiento para generar alertas de stock crÃ­tico
SET
    FOREIGN_KEY_CHECKS = 1;

-- Source: 20260603_1344_routines_stock_alerts.sql
-- =====================================================
-- Rutinas alertas de stock
-- Archivo: 20260603_1344_routines_stock_alerts.sql
-- =====================================================
SET
    FOREIGN_KEY_CHECKS = 0;

DELIMITER //
CREATE PROCEDURE generate_stock_alerts() BEGIN DECLARE done INT DEFAULT FALSE;

DECLARE v_product_variant_id BIGINT UNSIGNED;

DECLARE v_warehouse_id BIGINT UNSIGNED;

DECLARE v_current_stock DECIMAL(15, 4);

DECLARE v_minimum_stock DECIMAL(15, 4);

DECLARE v_reorder_point DECIMAL(15, 4);

DECLARE v_avg_daily_sales DECIMAL(15, 4);

DECLARE v_days_until_stockout DECIMAL(5, 2);

DECLARE v_alert_type VARCHAR(20);

DECLARE v_alert_level VARCHAR(20);

DECLARE v_alert_title VARCHAR(255);

DECLARE v_alert_message TEXT;

-- Cursor para productos con configuraciÃ³n crÃ­tica
DECLARE stock_cursor CURSOR FOR
SELECT
    s.product_variant_id,
    s.warehouse_id,
    s.current_quantity,
    scc.minimum_stock,
    scc.reorder_point,
    scc.avg_daily_sales,
    calculate_stockout_days(s.current_quantity, scc.avg_daily_sales) as days_until_stockout
FROM
    stock s
    JOIN stock_critical_config scc ON s.product_variant_id = scc.product_variant_id
    AND s.warehouse_id = scc.warehouse_id
WHERE
    scc.is_active = TRUE
    AND scc.alert_enabled = TRUE
    AND (
        scc.last_alert_sent IS NULL
        OR scc.last_alert_sent < DATE_SUB(NOW(), INTERVAL scc.alert_frequency_hours HOUR)
    );

DECLARE CONTINUE HANDLER FOR NOT FOUND
SET
    done = TRUE;

OPEN stock_cursor;

alert_loop: LOOP FETCH stock_cursor INTO v_product_variant_id,
v_warehouse_id,
v_current_stock,
v_minimum_stock,
v_reorder_point,
v_avg_daily_sales,
v_days_until_stockout;

IF done THEN LEAVE alert_loop;

END IF;

-- Determinar tipo y nivel de alerta
IF v_current_stock = 0 THEN
SET
    v_alert_type = 'OUT_OF_STOCK';

SET
    v_alert_level = 'CRITICAL';

SET
    v_alert_title = 'Producto Agotado';

SET
    v_alert_message = 'El producto estÃ¡ completamente agotado en esta bodega';

ELSEIF v_current_stock <= (v_minimum_stock * 0.5) THEN
SET
    v_alert_type = 'LOW_STOCK';

SET
    v_alert_level = 'URGENT';

SET
    v_alert_title = 'Stock CrÃ­tico';

SET
    v_alert_message = CONCAT(
        'Stock muy bajo: ',
        v_current_stock,
        ' unidades restantes'
    );

ELSEIF v_current_stock <= v_minimum_stock THEN
SET
    v_alert_type = 'LOW_STOCK';

SET
    v_alert_level = 'WARNING';

SET
    v_alert_title = 'Stock Bajo';

SET
    v_alert_message = CONCAT(
        'Stock por debajo del mÃ­nimo: ',
        v_current_stock,
        '/',
        v_minimum_stock
    );

ELSEIF v_current_stock <= v_reorder_point THEN
SET
    v_alert_type = 'REORDER_POINT';

SET
    v_alert_level = 'INFO';

SET
    v_alert_title = 'Punto de Reorden Alcanzado';

SET
    v_alert_message = CONCAT(
        'Se recomienda realizar pedido. Stock actual: ',
        v_current_stock
    );

END IF;

-- Solo crear alerta si hay problema
IF v_current_stock <= v_reorder_point THEN -- Verificar si ya existe alerta activa similar
IF NOT EXISTS (
    SELECT
        1
    FROM
        stock_alerts
    WHERE
        product_variant_id = v_product_variant_id
        AND warehouse_id = v_warehouse_id
        AND alert_type = v_alert_type
        AND alert_status IN ('NEW', 'ACKNOWLEDGED')
        AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
) THEN -- Crear nueva alerta
INSERT INTO
    stock_alerts (
        product_variant_id,
        warehouse_id,
        alert_type,
        alert_level,
        current_stock,
        minimum_stock,
        reorder_point,
        days_until_stockout,
        alert_title,
        alert_message,
        suggested_action
    )
VALUES
    (
        v_product_variant_id,
        v_warehouse_id,
        v_alert_type,
        v_alert_level,
        v_current_stock,
        v_minimum_stock,
        v_reorder_point,
        v_days_until_stockout,
        v_alert_title,
        v_alert_message,
        CASE
            WHEN v_alert_type = 'OUT_OF_STOCK' THEN 'Realizar pedido urgente al proveedor'
            WHEN v_alert_type = 'LOW_STOCK' THEN 'Considerar pedido inmediato'
            ELSE 'Programar pedido segÃºn lead time'
        END
    );

-- Actualizar fecha de Ãºltima alerta
UPDATE
    stock_critical_config
SET
    last_alert_sent = NOW()
WHERE
    product_variant_id = v_product_variant_id
    AND warehouse_id = v_warehouse_id;

END IF;

END IF;

END LOOP;

CLOSE stock_cursor;

END//
DELIMITER ;

-- Procedimiento para calcular sugerencias de reorden
SET
    FOREIGN_KEY_CHECKS = 1;

-- Source: 20260603_1345_routines_reorder_suggestions.sql
-- =====================================================
-- Rutinas sugerencias de reorden
-- Archivo: 20260603_1345_routines_reorder_suggestions.sql
-- =====================================================
SET
    FOREIGN_KEY_CHECKS = 0;

DELIMITER //
CREATE PROCEDURE generate_reorder_suggestions() BEGIN DECLARE done INT DEFAULT FALSE;

DECLARE v_product_variant_id BIGINT UNSIGNED;

DECLARE v_warehouse_id BIGINT UNSIGNED;

DECLARE v_current_stock DECIMAL(15, 4);

DECLARE v_minimum_stock DECIMAL(15, 4);

DECLARE v_safety_stock DECIMAL(15, 4);

DECLARE v_reorder_quantity DECIMAL(15, 4);

DECLARE v_avg_daily_consumption DECIMAL(15, 4);

DECLARE v_lead_time_days INT UNSIGNED;

DECLARE v_stockout_risk DECIMAL(5, 2);

DECLARE v_priority_score INT UNSIGNED;

DECLARE v_urgency_level VARCHAR(20);

-- Cursor para productos que necesitan reorden
DECLARE reorder_cursor CURSOR FOR
SELECT
    s.product_variant_id,
    s.warehouse_id,
    s.current_quantity,
    scc.minimum_stock,
    scc.safety_stock,
    scc.reorder_quantity,
    scc.avg_daily_sales,
    scc.lead_time_days
FROM
    stock s
    JOIN stock_critical_config scc ON s.product_variant_id = scc.product_variant_id
    AND s.warehouse_id = scc.warehouse_id
WHERE
    scc.is_active = TRUE
    AND s.current_quantity <= scc.reorder_point
    AND NOT EXISTS (
        SELECT
            1
        FROM
            reorder_suggestions rs
        WHERE
            rs.product_variant_id = s.product_variant_id
            AND rs.warehouse_id = s.warehouse_id
            AND rs.suggestion_status = 'PENDING'
            AND rs.valid_until > CURDATE()
    );

DECLARE CONTINUE HANDLER FOR NOT FOUND
SET
    done = TRUE;

-- Limpiar sugerencias expiradas
DELETE FROM
    reorder_suggestions
WHERE
    valid_until < CURDATE()
    AND suggestion_status = 'PENDING';

OPEN reorder_cursor;

suggestion_loop: LOOP FETCH reorder_cursor INTO v_product_variant_id,
v_warehouse_id,
v_current_stock,
v_minimum_stock,
v_safety_stock,
v_reorder_quantity,
v_avg_daily_consumption,
v_lead_time_days;

IF done THEN LEAVE suggestion_loop;

END IF;

-- Calcular cantidad sugerida si no estÃ¡ configurada
IF v_reorder_quantity IS NULL
OR v_reorder_quantity <= 0 THEN
SET
    v_reorder_quantity = (v_avg_daily_consumption * v_lead_time_days) + v_safety_stock - v_current_stock;

SET
    v_reorder_quantity = GREATEST(v_reorder_quantity, v_minimum_stock);

END IF;

-- Calcular riesgo de quiebre de stock
IF v_avg_daily_consumption > 0 THEN
SET
    v_stockout_risk = GREATEST(
        0,
        100 - (
            (
                v_current_stock / (v_avg_daily_consumption * v_lead_time_days)
            ) * 100
        )
    );

ELSE
SET
    v_stockout_risk = 0;

END IF;

-- Calcular prioridad (0-100)
SET
    v_priority_score = CASE
        WHEN v_current_stock = 0 THEN 100
        WHEN v_current_stock <= (v_minimum_stock * 0.25) THEN 90
        WHEN v_current_stock <= (v_minimum_stock * 0.5) THEN 80
        WHEN v_current_stock <= v_minimum_stock THEN 70
        ELSE GREATEST(50, ROUND(v_stockout_risk))
    END;

-- Determinar urgencia
SET
    v_urgency_level = CASE
        WHEN v_priority_score >= 90 THEN 'CRITICAL'
        WHEN v_priority_score >= 80 THEN 'HIGH'
        WHEN v_priority_score >= 70 THEN 'MEDIUM'
        ELSE 'LOW'
    END;

-- Crear sugerencia de reorden
INSERT INTO
    reorder_suggestions (
        product_variant_id,
        warehouse_id,
        current_stock,
        minimum_stock,
        safety_stock,
        suggested_order_quantity,
        avg_daily_consumption,
        lead_time_days,
        stockout_risk_percentage,
        priority_score,
        urgency_level,
        valid_until
    )
VALUES
    (
        v_product_variant_id,
        v_warehouse_id,
        v_current_stock,
        v_minimum_stock,
        v_safety_stock,
        v_reorder_quantity,
        v_avg_daily_consumption,
        v_lead_time_days,
        v_stockout_risk,
        v_priority_score,
        v_urgency_level,
        DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    );

END LOOP;

CLOSE reorder_cursor;

END//
DELIMITER ;

-- Procedimiento para actualizar estadÃ­sticas de rotaciÃ³n
SET
    FOREIGN_KEY_CHECKS = 1;

-- Source: 20260603_1346_routines_stock_rotation.sql
-- =====================================================
-- Rutinas rotacion de stock
-- Archivo: 20260603_1346_routines_stock_rotation.sql
-- =====================================================
SET
    FOREIGN_KEY_CHECKS = 0;

DELIMITER //
CREATE PROCEDURE update_stock_rotation_stats(IN p_days_to_analyze INT) BEGIN -- TODAS las declaraciones de variables PRIMERO
DECLARE done INT DEFAULT FALSE;

DECLARE v_product_variant_id BIGINT;

DECLARE v_warehouse_id BIGINT;

DECLARE v_total_sales DECIMAL(15, 4);

DECLARE v_avg_daily_sales DECIMAL(15, 4);

DECLARE v_avg_monthly_sales DECIMAL(15, 4);

DECLARE v_last_sale_date DATE;

DECLARE v_rotation_category VARCHAR(20);

DECLARE v_days_since_last_sale INT;

DECLARE v_current_quantity DECIMAL(15, 4);

DECLARE v_days_until_stockout INT;

-- LUEGO todas las declaraciones de CURSOR
DECLARE rotation_cursor CURSOR FOR
SELECT
    DISTINCT s.product_variant_id,
    s.warehouse_id,
    s.current_quantity
FROM
    stock s
WHERE
    s.current_quantity >= 0;

-- FINALMENTE todos los HANDLERS
DECLARE CONTINUE HANDLER FOR NOT FOUND
SET
    done = TRUE;

-- Establecer valor predeterminado si p_days_to_analyze es NULL o menor a 1
IF p_days_to_analyze IS NULL
OR p_days_to_analyze < 1 THEN
SET
    p_days_to_analyze = 90;

-- Valor predeterminado
END IF;

-- Abrir el cursor
OPEN rotation_cursor;

rotation_loop: LOOP FETCH rotation_cursor INTO v_product_variant_id,
v_warehouse_id,
v_current_quantity;

IF done THEN LEAVE rotation_loop;

END IF;

-- Calcular ventas en el perÃ­odo
SELECT
    COALESCE(SUM(ABS(sm.quantity)), 0),
    COALESCE(SUM(ABS(sm.quantity)) / p_days_to_analyze, 0),
    COALESCE(
        SUM(ABS(sm.quantity)) / (p_days_to_analyze / 30.0),
        0
    ),
    MAX(DATE(sm.created_at)) INTO v_total_sales,
    v_avg_daily_sales,
    v_avg_monthly_sales,
    v_last_sale_date
FROM
    stock_movements sm
WHERE
    sm.product_variant_id = v_product_variant_id
    AND sm.warehouse_id = v_warehouse_id
    AND sm.movement_type = 'OUT'
    AND sm.reference_type IN ('SALE', 'TRANSFER')
    AND sm.created_at >= DATE_SUB(CURDATE(), INTERVAL p_days_to_analyze DAY);

-- Calcular dÃ­as desde Ãºltima venta
IF v_last_sale_date IS NOT NULL THEN
SET
    v_days_since_last_sale = DATEDIFF(CURDATE(), v_last_sale_date);

ELSE
SET
    v_days_since_last_sale = NULL;

END IF;

-- Categorizar rotaciÃ³n
IF v_last_sale_date IS NULL
OR v_days_since_last_sale > 180 THEN
SET
    v_rotation_category = 'NO_MOVEMENT';

ELSEIF v_avg_daily_sales >= 1 THEN
SET
    v_rotation_category = 'FAST';

ELSEIF v_avg_daily_sales >= 0.1 THEN
SET
    v_rotation_category = 'MEDIUM';

ELSEIF v_avg_daily_sales > 0 THEN
SET
    v_rotation_category = 'SLOW';

ELSE
SET
    v_rotation_category = 'NO_MOVEMENT';

END IF;

-- Calcular dÃ­as hasta agotamiento
IF v_avg_daily_sales > 0
AND v_current_quantity > 0 THEN
SET
    v_days_until_stockout = CEIL(v_current_quantity / v_avg_daily_sales);

-- Limitar a un mÃ¡ximo razonable
IF v_days_until_stockout > 9999 THEN
SET
    v_days_until_stockout = 9999;

END IF;

ELSE
SET
    v_days_until_stockout = NULL;

END IF;

-- Actualizar estadÃ­sticas en la tabla stock
UPDATE
    stock
SET
    avg_monthly_sales = v_avg_monthly_sales,
    last_sale_date = v_last_sale_date,
    rotation_category = v_rotation_category,
    days_until_stockout = v_days_until_stockout
WHERE
    product_variant_id = v_product_variant_id
    AND warehouse_id = v_warehouse_id;

-- Verificar si existe registro en stock_critical_config antes de actualizar
IF EXISTS (
    SELECT
        1
    FROM
        stock_critical_config
    WHERE
        product_variant_id = v_product_variant_id
        AND warehouse_id = v_warehouse_id
) THEN -- Actualizar configuraciÃ³n crÃ­tica existente
UPDATE
    stock_critical_config
SET
    avg_daily_sales = v_avg_daily_sales,
    last_calculated_date = CURDATE()
WHERE
    product_variant_id = v_product_variant_id
    AND warehouse_id = v_warehouse_id;

END IF;

END LOOP;

CLOSE rotation_cursor;

END//
DELIMITER ;

-- =====================================================
SET
    FOREIGN_KEY_CHECKS = 1;

-- Source: 20260603_1352_routines_auth_secret.sql
-- =====================================================
-- Rutinas auth secret
-- Archivo: 20260603_1352_routines_auth_secret.sql
-- =====================================================
SET
    FOREIGN_KEY_CHECKS = 0;

-- ==========================================
-- Migration: 20260603_1312_auth_system_setup.sql
-- DescripciÃ³n: MigraciÃ³n para sistema de autenticaciÃ³n JWT
-- - Poblado de secrets para usuarios existentes
-- - Ãndices optimizados para autenticaciÃ³n
-- ==========================================
-- ==========================================
-- FUNCIÃ“N TEMPORAL PARA GENERAR SECRETS
-- ==========================================
DELIMITER //
-- FunciÃ³n temporal para generar secret aleatorio (solo para esta migraciÃ³n)
CREATE FUNCTION generate_user_secret_temp() RETURNS VARCHAR(64) READS SQL DATA DETERMINISTIC BEGIN DECLARE secret_hex VARCHAR(64);

-- Generar secret usando UUID y timestamp para aleatoriedad
SET
    secret_hex = CONCAT(
        REPLACE(UUID(), '-', ''),
        HEX(UNIX_TIMESTAMP()),
        HEX(RAND() * 4294967295)
    );

-- Tomar exactamente 64 caracteres
RETURN LEFT(secret_hex, 64);

END//
DELIMITER ;

SET
    FOREIGN_KEY_CHECKS = 1;

-- Source: 20260603_1411_routines_legacy_coverage.sql
-- =====================================================
-- Rutinas legacy coverage
-- Archivo: 20260603_1411_routines_legacy_coverage.sql
-- =====================================================
SET
    FOREIGN_KEY_CHECKS = 0;

DELIMITER //
CREATE PROCEDURE create_accounts_payable_from_document(
    IN p_document_id BIGINT UNSIGNED,
    IN p_supplier_id BIGINT UNSIGNED,
    IN p_due_date DATE
) BEGIN DECLARE v_total DECIMAL(15, 2);

DECLARE v_document_date DATE;

DECLARE v_status_id BIGINT UNSIGNED;

SELECT
    total_amount,
    document_date INTO v_total,
    v_document_date
FROM
    documents
WHERE
    id = p_document_id;

SELECT
    id INTO v_status_id
FROM
    system_statuses
WHERE
    status_group = 'PAYABLE'
    AND status_code = 'PENDING'
LIMIT
    1;

INSERT INTO
    accounts_payable (
        document_id,
        supplier_id,
        original_amount,
        current_balance,
        invoice_date,
        due_date,
        status_id
    )
VALUES
    (
        p_document_id,
        p_supplier_id,
        v_total,
        v_total,
        v_document_date,
        p_due_date,
        v_status_id
    );

END//
CREATE PROCEDURE close_tax_period(
    IN p_tax_year SMALLINT UNSIGNED,
    IN p_tax_month TINYINT UNSIGNED,
    IN p_user_id BIGINT UNSIGNED
) BEGIN DECLARE v_status_id BIGINT UNSIGNED;

SELECT
    id INTO v_status_id
FROM
    system_statuses
WHERE
    status_group = 'TAX_BOOK'
    AND status_code = 'CLOSED'
LIMIT
    1;

UPDATE
    tax_periods
SET
    status_id = v_status_id,
    closed_by_user_id = p_user_id,
    closed_at = CURRENT_TIMESTAMP
WHERE
    tax_year = p_tax_year
    AND tax_month = p_tax_month;

END//
DELIMITER ;

SET
    FOREIGN_KEY_CHECKS = 1;