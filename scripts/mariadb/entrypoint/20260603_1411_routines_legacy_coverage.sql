-- =====================================================
-- Rutinas legacy coverage
-- Archivo: 20260603_1411_routines_legacy_coverage.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

DELIMITER //

CREATE PROCEDURE create_accounts_payable_from_document(
    IN p_document_id BIGINT UNSIGNED,
    IN p_supplier_id BIGINT UNSIGNED,
    IN p_due_date DATE
)
BEGIN
    DECLARE v_total DECIMAL(15,2);
    DECLARE v_document_date DATE;
    DECLARE v_status_id BIGINT UNSIGNED;

    SELECT total_amount, document_date
      INTO v_total, v_document_date
      FROM documents
     WHERE id = p_document_id;

    SELECT id INTO v_status_id
      FROM system_statuses
     WHERE status_group = 'PAYABLE' AND status_code = 'PENDING'
     LIMIT 1;

    INSERT INTO accounts_payable (
        document_id, supplier_id, original_amount, current_balance,
        invoice_date, due_date, status_id
    ) VALUES (
        p_document_id, p_supplier_id, v_total, v_total,
        v_document_date, p_due_date, v_status_id
    );
END//

CREATE PROCEDURE close_tax_period(
    IN p_tax_year SMALLINT UNSIGNED,
    IN p_tax_month TINYINT UNSIGNED,
    IN p_user_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_status_id BIGINT UNSIGNED;

    SELECT id INTO v_status_id
      FROM system_statuses
     WHERE status_group = 'TAX_BOOK' AND status_code = 'CLOSED'
     LIMIT 1;

    UPDATE tax_periods
       SET status_id = v_status_id,
           closed_by_user_id = p_user_id,
           closed_at = CURRENT_TIMESTAMP
     WHERE tax_year = p_tax_year
       AND tax_month = p_tax_month;
END//

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
