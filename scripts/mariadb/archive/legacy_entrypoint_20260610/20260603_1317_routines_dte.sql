-- =====================================================
-- Rutinas DTE
-- Archivo: 20260603_1317_routines_dte.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- FUNCIONES ÚTILES PARA DTE
-- =====================================================

-- Función para obtener siguiente folio
DELIMITER //
CREATE FUNCTION get_next_dte_folio(company_rut_param VARCHAR(12), dte_type VARCHAR(10))
RETURNS BIGINT UNSIGNED
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE next_folio BIGINT UNSIGNED DEFAULT 1;

    CASE dte_type
        WHEN '33' THEN
            SELECT current_folio_33 + 1 INTO next_folio
            FROM dte_company_config
            WHERE company_rut = company_rut_param AND is_active = TRUE;

            UPDATE dte_company_config
            SET current_folio_33 = next_folio
            WHERE company_rut = company_rut_param;

        WHEN '39' THEN
            SELECT current_folio_39 + 1 INTO next_folio
            FROM dte_company_config
            WHERE company_rut = company_rut_param AND is_active = TRUE;

            UPDATE dte_company_config
            SET current_folio_39 = next_folio
            WHERE company_rut = company_rut_param;

        WHEN '52' THEN
            SELECT current_folio_52 + 1 INTO next_folio
            FROM dte_company_config
            WHERE company_rut = company_rut_param AND is_active = TRUE;

            UPDATE dte_company_config
            SET current_folio_52 = next_folio
            WHERE company_rut = company_rut_param;

        WHEN '61' THEN
            SELECT current_folio_61 + 1 INTO next_folio
            FROM dte_company_config
            WHERE company_rut = company_rut_param AND is_active = TRUE;

            UPDATE dte_company_config
            SET current_folio_61 = next_folio
            WHERE company_rut = company_rut_param;
    END CASE;

    RETURN next_folio;
END//
DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
