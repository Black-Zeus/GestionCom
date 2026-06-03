-- =====================================================
-- Rutinas calculo quiebre stock
-- Archivo: 20260603_1342_routines_critical_stockout.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- SECCIÓN 6: FUNCIONES Y PROCEDIMIENTOS
-- =====================================================

-- Función para calcular días hasta agotamiento de stock
DELIMITER //

CREATE FUNCTION calculate_stockout_days(
    current_stock DECIMAL(15,4),
    avg_daily_sales DECIMAL(15,4)
)
RETURNS DECIMAL(5,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE days_until_stockout DECIMAL(5,2);

    IF avg_daily_sales <= 0 OR current_stock <= 0 THEN
        RETURN NULL;
    END IF;

    SET days_until_stockout = current_stock / avg_daily_sales;

    RETURN ROUND(days_until_stockout, 2);
END//

DELIMITER ;

-- Procedimiento para procesar devolución completa

SET FOREIGN_KEY_CHECKS = 1;
