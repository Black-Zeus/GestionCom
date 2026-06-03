-- =====================================================
-- Vistas legacy coverage
-- Archivo: 20260603_1410_views_legacy_coverage.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE OR REPLACE VIEW v_supplier_balance AS
SELECT
    s.id AS supplier_id,
    s.supplier_code,
    s.legal_name,
    s.tax_id,
    COALESCE(SUM(ap.original_amount), 0) AS total_invoiced,
    COALESCE(SUM(ap.paid_amount), 0) AS total_paid,
    COALESCE(SUM(ap.current_balance), 0) AS current_balance,
    COALESCE(SUM(CASE WHEN ap.due_date < CURDATE() AND ap.current_balance > 0 THEN ap.current_balance ELSE 0 END), 0) AS overdue_balance,
    COUNT(ap.id) AS payable_count
FROM suppliers s
LEFT JOIN accounts_payable ap ON ap.supplier_id = s.id
WHERE s.deleted_at IS NULL
GROUP BY s.id, s.supplier_code, s.legal_name, s.tax_id;

CREATE OR REPLACE VIEW v_purchase_receipt_summary AS
SELECT
    pr.id AS purchase_receipt_id,
    pr.receipt_code,
    po.purchase_order_code,
    s.supplier_code,
    s.legal_name AS supplier_name,
    w.warehouse_code,
    w.warehouse_name,
    pr.receipt_date,
    ss.status_display_es AS status_name,
    COUNT(pri.id) AS item_count,
    COALESCE(SUM(pri.accepted_quantity * pri.unit_cost), 0) AS accepted_cost_total,
    COALESCE(SUM(pri.rejected_quantity), 0) AS rejected_quantity_total
FROM purchase_receipts pr
JOIN suppliers s ON s.id = pr.supplier_id
JOIN warehouses w ON w.id = pr.warehouse_id
LEFT JOIN purchase_orders po ON po.id = pr.purchase_order_id
LEFT JOIN purchase_receipt_items pri ON pri.purchase_receipt_id = pr.id
LEFT JOIN system_statuses ss ON ss.id = pr.status_id
WHERE pr.deleted_at IS NULL
GROUP BY pr.id, pr.receipt_code, po.purchase_order_code, s.supplier_code, s.legal_name,
         w.warehouse_code, w.warehouse_name, pr.receipt_date, ss.status_display_es;

CREATE OR REPLACE VIEW v_physical_inventory_differences AS
SELECT
    pic.id AS count_id,
    pic.count_code,
    w.warehouse_code,
    w.warehouse_name,
    pv.variant_sku,
    pv.variant_name,
    p.product_code,
    p.product_name,
    pici.system_quantity,
    pici.counted_quantity,
    pici.difference_quantity,
    pici.difference_cost,
    pici.review_status
FROM physical_inventory_count_items pici
JOIN physical_inventory_counts pic ON pic.id = pici.physical_inventory_count_id
JOIN warehouses w ON w.id = pic.warehouse_id
JOIN product_variants pv ON pv.id = pici.product_variant_id
JOIN products p ON p.id = pv.product_id
WHERE pici.difference_quantity <> 0;

CREATE OR REPLACE VIEW v_transfer_reception_differences AS
SELECT
    tr.id AS transfer_reception_id,
    tr.reception_code,
    tr.transfer_document_id,
    sw.warehouse_code AS source_warehouse_code,
    tw.warehouse_code AS target_warehouse_code,
    pv.variant_sku,
    pv.variant_name,
    tri.shipped_quantity,
    tri.received_quantity,
    tri.difference_quantity,
    tri.difference_reason
FROM transfer_reception_items tri
JOIN transfer_receptions tr ON tr.id = tri.transfer_reception_id
JOIN warehouses sw ON sw.id = tr.source_warehouse_id
JOIN warehouses tw ON tw.id = tr.target_warehouse_id
JOIN product_variants pv ON pv.id = tri.product_variant_id
WHERE tri.difference_quantity <> 0;

CREATE OR REPLACE VIEW v_tax_book_summary AS
SELECT
    tp.tax_year,
    tp.tax_month,
    tbe.book_type,
    COUNT(tbe.id) AS document_count,
    COALESCE(SUM(tbe.net_amount), 0) AS net_amount,
    COALESCE(SUM(tbe.exempt_amount), 0) AS exempt_amount,
    COALESCE(SUM(tbe.tax_amount), 0) AS tax_amount,
    COALESCE(SUM(tbe.total_amount), 0) AS total_amount
FROM tax_book_entries tbe
JOIN tax_periods tp ON tp.id = tbe.tax_period_id
GROUP BY tp.tax_year, tp.tax_month, tbe.book_type;

-- =====================================================
-- PROCEDIMIENTOS DE APOYO
-- =====================================================

SET FOREIGN_KEY_CHECKS = 1;
