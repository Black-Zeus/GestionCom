-- =====================================================
-- Rutinas sugerencias de reorden
-- Archivo: 20260603_1345_routines_reorder_suggestions.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

DELIMITER //

CREATE PROCEDURE generate_reorder_suggestions()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_product_variant_id BIGINT UNSIGNED;
    DECLARE v_warehouse_id BIGINT UNSIGNED;
    DECLARE v_current_stock DECIMAL(15,4);
    DECLARE v_minimum_stock DECIMAL(15,4);
    DECLARE v_safety_stock DECIMAL(15,4);
    DECLARE v_reorder_quantity DECIMAL(15,4);
    DECLARE v_avg_daily_consumption DECIMAL(15,4);
    DECLARE v_lead_time_days INT UNSIGNED;
    DECLARE v_stockout_risk DECIMAL(5,2);
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
        FROM stock s
        JOIN stock_critical_config scc ON s.product_variant_id = scc.product_variant_id
            AND s.warehouse_id = scc.warehouse_id
        WHERE scc.is_active = TRUE
            AND s.current_quantity <= scc.reorder_point
            AND NOT EXISTS (
                SELECT 1 FROM reorder_suggestions rs
                WHERE rs.product_variant_id = s.product_variant_id
                    AND rs.warehouse_id = s.warehouse_id
                    AND rs.suggestion_status = 'PENDING'
                    AND rs.valid_until > CURDATE()
            );

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Limpiar sugerencias expiradas
    DELETE FROM reorder_suggestions
    WHERE valid_until < CURDATE()
        AND suggestion_status = 'PENDING';

    OPEN reorder_cursor;

    suggestion_loop: LOOP
        FETCH reorder_cursor INTO v_product_variant_id, v_warehouse_id, v_current_stock,
                                  v_minimum_stock, v_safety_stock, v_reorder_quantity,
                                  v_avg_daily_consumption, v_lead_time_days;

        IF done THEN
            LEAVE suggestion_loop;
        END IF;

        -- Calcular cantidad sugerida si no está configurada
        IF v_reorder_quantity IS NULL OR v_reorder_quantity <= 0 THEN
            SET v_reorder_quantity = (v_avg_daily_consumption * v_lead_time_days) + v_safety_stock - v_current_stock;
            SET v_reorder_quantity = GREATEST(v_reorder_quantity, v_minimum_stock);
        END IF;

        -- Calcular riesgo de quiebre de stock
        IF v_avg_daily_consumption > 0 THEN
            SET v_stockout_risk = GREATEST(0, 100 - ((v_current_stock / (v_avg_daily_consumption * v_lead_time_days)) * 100));
        ELSE
            SET v_stockout_risk = 0;
        END IF;

        -- Calcular prioridad (0-100)
        SET v_priority_score = CASE
            WHEN v_current_stock = 0 THEN 100
            WHEN v_current_stock <= (v_minimum_stock * 0.25) THEN 90
            WHEN v_current_stock <= (v_minimum_stock * 0.5) THEN 80
            WHEN v_current_stock <= v_minimum_stock THEN 70
            ELSE GREATEST(50, ROUND(v_stockout_risk))
        END;

        -- Determinar urgencia
        SET v_urgency_level = CASE
            WHEN v_priority_score >= 90 THEN 'CRITICAL'
            WHEN v_priority_score >= 80 THEN 'HIGH'
            WHEN v_priority_score >= 70 THEN 'MEDIUM'
            ELSE 'LOW'
        END;

        -- Crear sugerencia de reorden
        INSERT INTO reorder_suggestions (
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
        ) VALUES (
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

-- Procedimiento para actualizar estadísticas de rotación

SET FOREIGN_KEY_CHECKS = 1;
