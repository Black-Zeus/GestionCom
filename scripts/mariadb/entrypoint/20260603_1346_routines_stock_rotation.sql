-- =====================================================
-- Rutinas rotacion de stock
-- Archivo: 20260603_1346_routines_stock_rotation.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

DELIMITER //

CREATE PROCEDURE update_stock_rotation_stats(
    IN p_days_to_analyze INT
)
BEGIN
    -- TODAS las declaraciones de variables PRIMERO
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_product_variant_id BIGINT;
    DECLARE v_warehouse_id BIGINT;
    DECLARE v_total_sales DECIMAL(15,4);
    DECLARE v_avg_daily_sales DECIMAL(15,4);
    DECLARE v_avg_monthly_sales DECIMAL(15,4);
    DECLARE v_last_sale_date DATE;
    DECLARE v_rotation_category VARCHAR(20);
    DECLARE v_days_since_last_sale INT;
    DECLARE v_current_quantity DECIMAL(15,4);
    DECLARE v_days_until_stockout INT;

    -- LUEGO todas las declaraciones de CURSOR
    DECLARE rotation_cursor CURSOR FOR
        SELECT DISTINCT s.product_variant_id, s.warehouse_id, s.current_quantity
        FROM stock s
        WHERE s.current_quantity >= 0;

    -- FINALMENTE todos los HANDLERS
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Establecer valor predeterminado si p_days_to_analyze es NULL o menor a 1
    IF p_days_to_analyze IS NULL OR p_days_to_analyze < 1 THEN
        SET p_days_to_analyze = 90; -- Valor predeterminado
    END IF;

    -- Abrir el cursor
    OPEN rotation_cursor;

    rotation_loop: LOOP
        FETCH rotation_cursor INTO v_product_variant_id, v_warehouse_id, v_current_quantity;

        IF done THEN
            LEAVE rotation_loop;
        END IF;

        -- Calcular ventas en el período
        SELECT
            COALESCE(SUM(ABS(sm.quantity)), 0),
            COALESCE(SUM(ABS(sm.quantity)) / p_days_to_analyze, 0),
            COALESCE(SUM(ABS(sm.quantity)) / (p_days_to_analyze / 30.0), 0),
            MAX(DATE(sm.created_at))
        INTO v_total_sales, v_avg_daily_sales, v_avg_monthly_sales, v_last_sale_date
        FROM stock_movements sm
        WHERE sm.product_variant_id = v_product_variant_id
            AND sm.warehouse_id = v_warehouse_id
            AND sm.movement_type = 'OUT'
            AND sm.reference_type IN ('SALE', 'TRANSFER')
            AND sm.created_at >= DATE_SUB(CURDATE(), INTERVAL p_days_to_analyze DAY);

        -- Calcular días desde última venta
        IF v_last_sale_date IS NOT NULL THEN
            SET v_days_since_last_sale = DATEDIFF(CURDATE(), v_last_sale_date);
        ELSE
            SET v_days_since_last_sale = NULL;
        END IF;

        -- Categorizar rotación
        IF v_last_sale_date IS NULL OR v_days_since_last_sale > 180 THEN
            SET v_rotation_category = 'NO_MOVEMENT';
        ELSEIF v_avg_daily_sales >= 1 THEN
            SET v_rotation_category = 'FAST';
        ELSEIF v_avg_daily_sales >= 0.1 THEN
            SET v_rotation_category = 'MEDIUM';
        ELSEIF v_avg_daily_sales > 0 THEN
            SET v_rotation_category = 'SLOW';
        ELSE
            SET v_rotation_category = 'NO_MOVEMENT';
        END IF;

        -- Calcular días hasta agotamiento
        IF v_avg_daily_sales > 0 AND v_current_quantity > 0 THEN
            SET v_days_until_stockout = CEIL(v_current_quantity / v_avg_daily_sales);
            -- Limitar a un máximo razonable
            IF v_days_until_stockout > 9999 THEN
                SET v_days_until_stockout = 9999;
            END IF;
        ELSE
            SET v_days_until_stockout = NULL;
        END IF;

        -- Actualizar estadísticas en la tabla stock
        UPDATE stock
        SET
            avg_monthly_sales = v_avg_monthly_sales,
            last_sale_date = v_last_sale_date,
            rotation_category = v_rotation_category,
            days_until_stockout = v_days_until_stockout
        WHERE product_variant_id = v_product_variant_id
            AND warehouse_id = v_warehouse_id;

        -- Verificar si existe registro en stock_critical_config antes de actualizar
        IF EXISTS (
            SELECT 1 FROM stock_critical_config
            WHERE product_variant_id = v_product_variant_id
                AND warehouse_id = v_warehouse_id
        ) THEN
            -- Actualizar configuración crítica existente
            UPDATE stock_critical_config
            SET
                avg_daily_sales = v_avg_daily_sales,
                last_calculated_date = CURDATE()
            WHERE product_variant_id = v_product_variant_id
                AND warehouse_id = v_warehouse_id;
        END IF;

    END LOOP;

    CLOSE rotation_cursor;

END//

DELIMITER ;

-- =====================================================

SET FOREIGN_KEY_CHECKS = 1;
