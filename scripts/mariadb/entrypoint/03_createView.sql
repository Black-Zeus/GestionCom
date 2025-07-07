
-- =====================================================
-- SISTEMA DE INVENTARIO COMPLETO
-- Base de datos: MariaDB 10.6.22
-- Convención: snake_case, soft delete, auditoría completa
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de productos con stock consolidado
CREATE VIEW v_products_stock AS
SELECT 
    p.id as product_id,
    p.product_code,
    p.product_name,
    pv.id as product_variant_id,
    pv.variant_sku,
    pv.variant_name,
    c.category_name,
    w.warehouse_code,
    w.warehouse_name,
    s.current_quantity,
    s.reserved_quantity,
    s.available_quantity,
    s.minimum_stock,
    s.maximum_stock,
    CASE 
        WHEN s.available_quantity <= s.minimum_stock THEN 'LOW'
        WHEN s.available_quantity = 0 THEN 'OUT_OF_STOCK'
        ELSE 'OK'
    END as stock_status,
    s.last_movement_date
FROM products p
JOIN product_variants pv ON p.id = pv.product_id
JOIN categories c ON p.category_id = c.id
LEFT JOIN stock s ON pv.id = s.product_variant_id
LEFT JOIN warehouses w ON s.warehouse_id = w.id
WHERE p.deleted_at IS NULL 
    AND pv.deleted_at IS NULL 
    AND c.deleted_at IS NULL
    AND (w.deleted_at IS NULL OR w.id IS NULL);

-- Vista de precios vigentes por producto
CREATE VIEW v_current_prices AS
SELECT 
    pv.id as product_variant_id,
    pv.variant_sku,
    p.product_name,
    pl.price_list_code,
    pl.price_list_name,
    mu.unit_code,
    mu.unit_name,
    pli.sale_price,
    pli.cost_price,
    pli.margin_percentage,
    pl.valid_from,
    pl.valid_to
FROM product_variants pv
JOIN products p ON pv.product_id = p.id
JOIN price_list_items pli ON pv.id = pli.product_variant_id
JOIN price_lists pl ON pli.price_list_id = pl.id
JOIN measurement_units mu ON pli.measurement_unit_id = mu.id
WHERE p.deleted_at IS NULL 
    AND pv.deleted_at IS NULL
    AND pl.deleted_at IS NULL
    AND mu.deleted_at IS NULL
    AND pl.is_active = TRUE
    AND pli.is_active = TRUE
    AND CURDATE() BETWEEN pl.valid_from AND COALESCE(pl.valid_to, '9999-12-31');

-- Vista de movimientos de stock recientes
CREATE VIEW v_recent_stock_movements AS
SELECT 
    sm.id,
    p.product_code,
    p.product_name,
    pv.variant_sku,
    w.warehouse_code,
    wz.zone_code,
    sm.movement_type,
    sm.reference_type,
    sm.quantity,
    sm.quantity_before,
    sm.quantity_after,
    sm.batch_lot_number,
    sm.expiry_date,
    u.username as created_by,
    sm.created_at
FROM stock_movements sm
JOIN product_variants pv ON sm.product_variant_id = pv.id
JOIN products p ON pv.product_id = p.id
JOIN warehouses w ON sm.warehouse_id = w.id
LEFT JOIN warehouse_zones wz ON sm.warehouse_zone_id = wz.id
JOIN users u ON sm.created_by_user_id = u.id
WHERE p.deleted_at IS NULL 
    AND pv.deleted_at IS NULL
    AND w.deleted_at IS NULL
    AND u.deleted_at IS NULL
ORDER BY sm.created_at DESC;


SET FOREIGN_KEY_CHECKS = 1;