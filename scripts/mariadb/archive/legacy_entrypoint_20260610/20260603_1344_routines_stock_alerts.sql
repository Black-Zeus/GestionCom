-- =====================================================
-- Rutinas alertas de stock
-- Archivo: 20260603_1344_routines_stock_alerts.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

DELIMITER //

CREATE PROCEDURE generate_stock_alerts()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_product_variant_id BIGINT UNSIGNED;
    DECLARE v_warehouse_id BIGINT UNSIGNED;
    DECLARE v_current_stock DECIMAL(15,4);
    DECLARE v_minimum_stock DECIMAL(15,4);
    DECLARE v_reorder_point DECIMAL(15,4);
    DECLARE v_avg_daily_sales DECIMAL(15,4);
    DECLARE v_days_until_stockout DECIMAL(5,2);
    DECLARE v_alert_type VARCHAR(20);
    DECLARE v_alert_level VARCHAR(20);
    DECLARE v_alert_title VARCHAR(255);
    DECLARE v_alert_message TEXT;

    -- Cursor para productos con configuración crítica
    DECLARE stock_cursor CURSOR FOR
        SELECT
            s.product_variant_id,
            s.warehouse_id,
            s.current_quantity,
            scc.minimum_stock,
            scc.reorder_point,
            scc.avg_daily_sales,
            calculate_stockout_days(s.current_quantity, scc.avg_daily_sales) as days_until_stockout
        FROM stock s
        JOIN stock_critical_config scc ON s.product_variant_id = scc.product_variant_id
            AND s.warehouse_id = scc.warehouse_id
        WHERE scc.is_active = TRUE
            AND scc.alert_enabled = TRUE
            AND (scc.last_alert_sent IS NULL
                OR scc.last_alert_sent < DATE_SUB(NOW(), INTERVAL scc.alert_frequency_hours HOUR));

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN stock_cursor;

    alert_loop: LOOP
        FETCH stock_cursor INTO v_product_variant_id, v_warehouse_id, v_current_stock,
                                v_minimum_stock, v_reorder_point, v_avg_daily_sales, v_days_until_stockout;

        IF done THEN
            LEAVE alert_loop;
        END IF;

        -- Determinar tipo y nivel de alerta
        IF v_current_stock = 0 THEN
            SET v_alert_type = 'OUT_OF_STOCK';
            SET v_alert_level = 'CRITICAL';
            SET v_alert_title = 'Producto Agotado';
            SET v_alert_message = 'El producto está completamente agotado en esta bodega';
        ELSEIF v_current_stock <= (v_minimum_stock * 0.5) THEN
            SET v_alert_type = 'LOW_STOCK';
            SET v_alert_level = 'URGENT';
            SET v_alert_title = 'Stock Crítico';
            SET v_alert_message = CONCAT('Stock muy bajo: ', v_current_stock, ' unidades restantes');
        ELSEIF v_current_stock <= v_minimum_stock THEN
            SET v_alert_type = 'LOW_STOCK';
            SET v_alert_level = 'WARNING';
            SET v_alert_title = 'Stock Bajo';
            SET v_alert_message = CONCAT('Stock por debajo del mínimo: ', v_current_stock, '/', v_minimum_stock);
        ELSEIF v_current_stock <= v_reorder_point THEN
            SET v_alert_type = 'REORDER_POINT';
            SET v_alert_level = 'INFO';
            SET v_alert_title = 'Punto de Reorden Alcanzado';
            SET v_alert_message = CONCAT('Se recomienda realizar pedido. Stock actual: ', v_current_stock);
        END IF;

        -- Solo crear alerta si hay problema
        IF v_current_stock <= v_reorder_point THEN
            -- Verificar si ya existe alerta activa similar
            IF NOT EXISTS (
                SELECT 1 FROM stock_alerts
                WHERE product_variant_id = v_product_variant_id
                    AND warehouse_id = v_warehouse_id
                    AND alert_type = v_alert_type
                    AND alert_status IN ('NEW', 'ACKNOWLEDGED')
                    AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
            ) THEN
                -- Crear nueva alerta
                INSERT INTO stock_alerts (
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
                ) VALUES (
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
                        ELSE 'Programar pedido según lead time'
                    END
                );

                -- Actualizar fecha de última alerta
                UPDATE stock_critical_config
                SET last_alert_sent = NOW()
                WHERE product_variant_id = v_product_variant_id
                    AND warehouse_id = v_warehouse_id;
            END IF;
        END IF;

    END LOOP;

    CLOSE stock_cursor;

END//

DELIMITER ;

-- Procedimiento para calcular sugerencias de reorden

SET FOREIGN_KEY_CHECKS = 1;
