-- =====================================================
-- Vistas cuentas por cobrar
-- Archivo: 20260603_1327_views_accounts_receivable.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- SECCIÓN 3: CREACIÓN DE VISTAS
-- =====================================================

-- Vista saldo actual por cliente
CREATE VIEW v_customer_balance AS
SELECT
    c.id as customer_id,
    c.customer_code,
    c.legal_name,
    c.customer_type,
    c.customer_status,
    ccc.credit_limit,
    ccc.used_credit,
    ccc.available_credit,

    -- Saldos de cuenta corriente
    COALESCE(ar_summary.total_pending, 0) as total_pending,
    COALESCE(ar_summary.total_overdue, 0) as total_overdue,
    COALESCE(ar_summary.oldest_invoice_days, 0) as oldest_invoice_days,

    -- Prepagos
    COALESCE(prepay_summary.prepaid_balance, 0) as prepaid_balance,

    -- Estado financiero
    CASE
        WHEN COALESCE(ar_summary.total_overdue, 0) > 0 THEN 'OVERDUE'
        WHEN COALESCE(ar_summary.total_pending, 0) > ccc.credit_limit THEN 'OVER_LIMIT'
        WHEN c.customer_status = 'BLOCKED' THEN 'BLOCKED'
        ELSE 'CURRENT'
    END as financial_status,

    -- Información del vendedor
    sales_rep.username as sales_rep_name,

    -- Última actividad
    last_activity.last_invoice_date,
    last_activity.last_payment_date

FROM customers c
LEFT JOIN customer_credit_config ccc ON c.id = ccc.customer_id
LEFT JOIN users sales_rep ON c.sales_rep_user_id = sales_rep.id

-- Resumen de cuentas por cobrar
LEFT JOIN (
    SELECT
        customer_id,
        SUM(current_balance) as total_pending,
        SUM(CASE WHEN status = 'OVERDUE' THEN current_balance ELSE 0 END) as total_overdue,
        MAX(days_overdue) as oldest_invoice_days
    FROM accounts_receivable
    WHERE status IN ('PENDING', 'PARTIAL', 'OVERDUE')
    GROUP BY customer_id
) ar_summary ON c.id = ar_summary.customer_id

-- Resumen de prepagos
LEFT JOIN (
    SELECT
        customer_id,
        SUM(unallocated_amount) as prepaid_balance
    FROM customer_payments
    WHERE payment_status = 'CONFIRMED'
        AND is_prepayment = TRUE
        AND unallocated_amount > 0
    GROUP BY customer_id
) prepay_summary ON c.id = prepay_summary.customer_id

-- Última actividad
LEFT JOIN (
    SELECT
        customer_id,
        MAX(CASE WHEN doc_type = 'INVOICE' THEN activity_date END) as last_invoice_date,
        MAX(CASE WHEN doc_type = 'PAYMENT' THEN activity_date END) as last_payment_date
    FROM (
        SELECT customer_id, invoice_date as activity_date, 'INVOICE' as doc_type
        FROM accounts_receivable
        UNION ALL
        SELECT customer_id, payment_date as activity_date, 'PAYMENT' as doc_type
        FROM customer_payments
    ) activities
    GROUP BY customer_id
) last_activity ON c.id = last_activity.customer_id

WHERE c.deleted_at IS NULL
ORDER BY c.customer_code;

-- Vista análisis de antigüedad (aging)
CREATE VIEW v_aging_analysis AS
SELECT
    c.customer_code,
    c.legal_name,
    c.customer_type,

    -- Aging buckets
    SUM(CASE WHEN ar.days_overdue = 0 THEN ar.current_balance ELSE 0 END) as current_amount,
    SUM(CASE WHEN ar.days_overdue BETWEEN 1 AND 30 THEN ar.current_balance ELSE 0 END) as days_1_30,
    SUM(CASE WHEN ar.days_overdue BETWEEN 31 AND 60 THEN ar.current_balance ELSE 0 END) as days_31_60,
    SUM(CASE WHEN ar.days_overdue BETWEEN 61 AND 90 THEN ar.current_balance ELSE 0 END) as days_61_90,
    SUM(CASE WHEN ar.days_overdue > 90 THEN ar.current_balance ELSE 0 END) as days_over_90,

    -- Totales
    SUM(ar.current_balance) as total_balance,
    MAX(ar.days_overdue) as max_days_overdue,
    COUNT(ar.id) as invoice_count,

    -- Información de crédito
    ccc.credit_limit,
    ccc.payment_terms_days,

    -- Estado
    CASE
        WHEN MAX(ar.days_overdue) > 90 THEN 'CRITICAL'
        WHEN MAX(ar.days_overdue) > 60 THEN 'HIGH_RISK'
        WHEN MAX(ar.days_overdue) > 30 THEN 'MODERATE_RISK'
        WHEN MAX(ar.days_overdue) > 0 THEN 'LOW_RISK'
        ELSE 'CURRENT'
    END as risk_category

FROM customers c
JOIN accounts_receivable ar ON c.id = ar.customer_id
LEFT JOIN customer_credit_config ccc ON c.id = ccc.customer_id
WHERE c.deleted_at IS NULL
    AND ar.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
GROUP BY c.id
ORDER BY max_days_overdue DESC, total_balance DESC;

-- Vista clientes morosos
CREATE VIEW v_overdue_customers AS
SELECT
    c.customer_code,
    c.legal_name,
    c.tax_id,
    c.customer_status,

    -- Datos de contacto
    c.contact_person,
    c.email,
    c.phone,

    -- Información de mora
    SUM(ar.current_balance) as total_overdue_amount,
    MAX(ar.days_overdue) as max_days_overdue,
    MIN(ar.first_overdue_date) as first_overdue_date,
    COUNT(ar.id) as overdue_invoice_count,

    -- Multas
    COALESCE(penalty_summary.total_penalties, 0) as total_penalties,
    COALESCE(penalty_summary.applied_penalties, 0) as applied_penalties,

    -- Límite de crédito
    ccc.credit_limit,
    ccc.auto_block_on_overdue,

    -- Vendedor asignado
    sales_rep.username as sales_rep_name,
    sales_rep.email as sales_rep_email,

    -- Clasificación de riesgo
    CASE
        WHEN MAX(ar.days_overdue) > 120 THEN 'COLLECTION_AGENCY'
        WHEN MAX(ar.days_overdue) > 90 THEN 'LEGAL_ACTION'
        WHEN MAX(ar.days_overdue) > 60 THEN 'FINAL_NOTICE'
        WHEN MAX(ar.days_overdue) > 30 THEN 'SECOND_NOTICE'
        ELSE 'FIRST_NOTICE'
    END as collection_stage

FROM customers c
JOIN accounts_receivable ar ON c.id = ar.customer_id
LEFT JOIN customer_credit_config ccc ON c.id = ccc.customer_id
LEFT JOIN users sales_rep ON c.sales_rep_user_id = sales_rep.id

-- Resumen de multas
LEFT JOIN (
    SELECT
        customer_id,
        SUM(penalty_amount) as total_penalties,
        SUM(CASE WHEN is_applied = TRUE THEN penalty_amount ELSE 0 END) as applied_penalties
    FROM customer_penalties
    WHERE is_waived = FALSE
    GROUP BY customer_id
) penalty_summary ON c.id = penalty_summary.customer_id

WHERE c.deleted_at IS NULL
    AND ar.status = 'OVERDUE'
    AND ar.days_overdue > 0
GROUP BY c.id
ORDER BY max_days_overdue DESC, total_overdue_amount DESC;

-- Vista estado de cuenta detallado
CREATE VIEW v_customer_statement AS
SELECT
    c.customer_code,
    c.legal_name,
    'INVOICE' as transaction_type,
    d.document_number as reference,
    ar.invoice_date as transaction_date,
    ar.due_date,
    ar.original_amount as debit_amount,
    0 as credit_amount,
    ar.current_balance as balance,
    ar.status,
    ar.days_overdue,
    '' as notes

FROM customers c
JOIN accounts_receivable ar ON c.id = ar.customer_id
JOIN documents d ON ar.document_id = d.id
WHERE c.deleted_at IS NULL

UNION ALL

SELECT
    c.customer_code,
    c.legal_name,
    'PAYMENT' as transaction_type,
    cp.payment_code as reference,
    cp.payment_date as transaction_date,
    NULL as due_date,
    0 as debit_amount,
    cp.payment_amount as credit_amount,
    cp.unallocated_amount as balance,
    cp.payment_status as status,
    0 as days_overdue,
    cp.notes

FROM customers c
JOIN customer_payments cp ON c.id = cp.customer_id
WHERE c.deleted_at IS NULL

UNION ALL

SELECT
    c.customer_code,
    c.legal_name,
    'PENALTY' as transaction_type,
    CONCAT('PENALTY-', cp.id) as reference,
    DATE(cp.created_at) as transaction_date,
    NULL as due_date,
    cp.penalty_amount as debit_amount,
    0 as credit_amount,
    CASE WHEN cp.is_applied THEN 0 ELSE cp.penalty_amount END as balance,
    CASE WHEN cp.is_waived THEN 'WAIVED' WHEN cp.is_applied THEN 'APPLIED' ELSE 'PENDING' END as status,
    cp.days_overdue,
    cp.penalty_description as notes

FROM customers c
JOIN customer_penalties cp ON c.id = cp.customer_id
WHERE c.deleted_at IS NULL

ORDER BY customer_code, transaction_date DESC;

-- Vista proyección de flujo de caja
CREATE VIEW v_cash_flow_projection AS
SELECT
    projection_date,
    SUM(expected_amount) as expected_collections,
    COUNT(*) as invoice_count,

    -- Por tipo de cliente
    SUM(CASE WHEN customer_type = 'COMPANY' THEN expected_amount ELSE 0 END) as company_collections,
    SUM(CASE WHEN customer_type = 'INDIVIDUAL' THEN expected_amount ELSE 0 END) as individual_collections,

    -- Por riesgo
    SUM(CASE WHEN risk_level = 'LOW' THEN expected_amount ELSE 0 END) as low_risk_amount,
    SUM(CASE WHEN risk_level = 'MEDIUM' THEN expected_amount ELSE 0 END) as medium_risk_amount,
    SUM(CASE WHEN risk_level = 'HIGH' THEN expected_amount ELSE 0 END) as high_risk_amount,

    -- Probabilidad de cobro
    SUM(expected_amount * collection_probability) as weighted_collections

FROM (
    SELECT
        ar.due_date as projection_date,
        ar.current_balance as expected_amount,
        c.customer_type,
        ccc.risk_level,

        -- Probabilidad de cobro basada en historial
        CASE
            WHEN ar.days_overdue = 0 THEN 0.95
            WHEN ar.days_overdue BETWEEN 1 AND 15 THEN 0.85
            WHEN ar.days_overdue BETWEEN 16 AND 30 THEN 0.70
            WHEN ar.days_overdue BETWEEN 31 AND 60 THEN 0.50
            WHEN ar.days_overdue BETWEEN 61 AND 90 THEN 0.30
            ELSE 0.15
        END as collection_probability

    FROM accounts_receivable ar
    JOIN customers c ON ar.customer_id = c.id
    LEFT JOIN customer_credit_config ccc ON c.id = ccc.customer_id
    WHERE ar.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
        AND c.deleted_at IS NULL
) projections
GROUP BY projection_date
ORDER BY projection_date;

SET FOREIGN_KEY_CHECKS = 1;
