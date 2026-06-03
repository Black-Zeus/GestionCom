-- =====================================================
-- Vistas retail critico
-- Archivo: 20260603_1341_views_critical_retail.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE VIEW v_critical_stock_products AS
SELECT
    p.product_code,
    p.product_name,
    pv.variant_sku,
    pv.variant_name,
    w.warehouse_code,
    w.warehouse_name,
    s.current_quantity,
    s.available_quantity,
    scc.minimum_stock,
    scc.safety_stock,
    scc.reorder_point,
    scc.reorder_quantity,

    -- Cálculos de criticidad
    CASE
        WHEN s.available_quantity = 0 THEN 'OUT_OF_STOCK'
        WHEN s.available_quantity <= scc.safety_stock THEN 'CRITICAL'
        WHEN s.available_quantity <= scc.minimum_stock THEN 'LOW'
        WHEN s.available_quantity <= scc.reorder_point THEN 'REORDER'
        ELSE 'OK'
    END AS stock_status,

    s.days_until_stockout,
    s.rotation_category,
    s.last_sale_date,
    s.avg_monthly_sales,

    -- Datos de configuración
    scc.lead_time_days,
    scc.alert_enabled,
    scc.last_alert_sent,

    -- Alertas activas
    COUNT(CASE WHEN sa.id IS NOT NULL THEN 1 END) AS active_alerts,  -- Cuenta solo alertas activas
    MAX(sa.alert_level) AS highest_alert_level

FROM products p
JOIN product_variants pv ON p.id = pv.product_id
JOIN stock s ON pv.id = s.product_variant_id
JOIN warehouses w ON s.warehouse_id = w.id
LEFT JOIN stock_critical_config scc ON pv.id = scc.product_variant_id AND w.id = scc.warehouse_id
LEFT JOIN stock_alerts sa ON pv.id = sa.product_variant_id AND w.id = sa.warehouse_id AND sa.alert_status IN ('NEW', 'ACKNOWLEDGED')

WHERE p.deleted_at IS NULL
    AND pv.deleted_at IS NULL
    AND w.deleted_at IS NULL
    AND (scc.is_active = TRUE OR scc.is_active IS NULL)

GROUP BY p.product_code, p.product_name, pv.variant_sku, pv.variant_name, w.warehouse_code, w.warehouse_name,
         s.current_quantity, s.available_quantity, scc.minimum_stock, scc.safety_stock, scc.reorder_point,
         scc.reorder_quantity, s.days_until_stockout, s.rotation_category, s.last_sale_date, s.avg_monthly_sales,
         scc.lead_time_days, scc.alert_enabled, scc.last_alert_sent

HAVING stock_status IN ('OUT_OF_STOCK', 'CRITICAL', 'LOW', 'REORDER')

ORDER BY
    CASE stock_status
        WHEN 'OUT_OF_STOCK' THEN 1
        WHEN 'CRITICAL' THEN 2
        WHEN 'LOW' THEN 3
        WHEN 'REORDER' THEN 4
        ELSE 5
    END,
    CASE
        WHEN s.days_until_stockout IS NULL THEN 9999999
        ELSE s.days_until_stockout
    END ASC;

-- Vista de devoluciones por período
CREATE VIEW v_returns_analysis AS
SELECT
    DATE_FORMAT(rd.return_date, '%Y-%m') as return_period,
    rr.reason_name,
    rd.return_type,

    -- Cantidades
    COUNT(rd.id) as total_returns,
    SUM(rd.total_return_amount) as total_return_amount,
    AVG(rd.total_return_amount) as avg_return_amount,

    -- Por estado
    COUNT(CASE WHEN rd.return_status = 'APPROVED' THEN 1 END) as approved_returns,
    COUNT(CASE WHEN rd.return_status = 'CANCELLED' THEN 1 END) as cancelled_returns,

    -- Productos más devueltos
    COUNT(DISTINCT rdi.product_variant_id) as unique_products_returned,
    SUM(rdi.return_quantity) as total_quantity_returned,

    -- Tiempos
    AVG(rd.days_since_sale) as avg_days_since_sale,
    MAX(rd.days_since_sale) as max_days_since_sale,

    -- Por usuario
    COUNT(DISTINCT rd.processed_by_user_id) as processors_involved

FROM return_documents rd
JOIN return_reasons rr ON rd.return_reason_id = rr.id
LEFT JOIN return_document_items rdi ON rd.id = rdi.return_document_id

WHERE rd.return_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)

GROUP BY
    DATE_FORMAT(rd.return_date, '%Y-%m'),
    rr.id,
    rd.return_type

ORDER BY return_period DESC, total_return_amount DESC;

-- Vista de pagos fraccionados por documento
CREATE VIEW v_document_payment_breakdown AS
SELECT
    d.id as document_id,
    d.document_number,
    d.document_date,
    d.total_amount,

    -- Resumen de pagos
    COUNT(dpd.id) as payment_methods_count,
    SUM(dpd.payment_amount) as total_paid,
    SUM(dpd.change_amount) as total_change,

    -- Por método
    GROUP_CONCAT(
        CONCAT(pm.method_name, ': $', FORMAT(dpd.payment_amount, 2))
        ORDER BY dpd.payment_order
        SEPARATOR ' | '
    ) as payment_breakdown,

    -- Validación
    CASE
        WHEN ABS(d.total_amount - SUM(dpd.payment_amount)) < 0.01 THEN 'BALANCED'
        WHEN d.total_amount > SUM(dpd.payment_amount) THEN 'UNDERPAID'
        ELSE 'OVERPAID'
    END as payment_status,

    (d.total_amount - SUM(dpd.payment_amount)) as balance_difference

FROM documents d
JOIN document_payment_details dpd ON d.id = dpd.document_id
JOIN payment_methods pm ON dpd.payment_method_id = pm.id

WHERE d.deleted_at IS NULL
    AND pm.deleted_at IS NULL

GROUP BY d.id
ORDER BY d.document_date DESC;

-- =====================================================

SET FOREIGN_KEY_CHECKS = 1;
