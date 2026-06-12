-- ============================================================
-- Migración: Cajas, puntos de venta y asignaciones para root
--
-- Crea 1 caja por locación (Cecilia ya tiene POS_0001).
-- Crea 2 puntos de venta por locación (Cecilia ya tiene PV_0001).
-- Asigna root (id=9) a todas las cajas (CASHIER) y
-- a todos los puntos de venta (SELLER), sin restricción de fechas.
-- ============================================================

-- ── 1. Cajas nuevas (una por locación sin caja aún) ─────────

INSERT IGNORE INTO `cash_registers`
    (`id`, `register_code`, `register_name`, `warehouse_id`,
     `is_active`, `requires_supervisor_approval`, `max_difference_amount`,
     `created_at`, `updated_at`)
VALUES
    (2, 'POS_0002', 'Caja Taller',          1, 1, 1, 1000.00, NOW(), NOW()),
    (3, 'POS_0003', 'Caja PYME',            2, 1, 1, 1000.00, NOW(), NOW()),
    (4, 'POS_0004', 'Caja Santa Filomena',  3, 1, 1, 1000.00, NOW(), NOW()),
    (5, 'POS_0005', 'Caja Patronato',       4, 1, 1, 1000.00, NOW(), NOW());

-- ── 2. Puntos de venta nuevos (2 por locación) ───────────────
-- Cecilia (warehouse_id=5, caja id=1): añade un segundo PV
-- Resto (warehouse_ids 1-4): 2 PVs cada uno

INSERT IGNORE INTO `sales_points`
    (`id`, `sales_point_code`, `sales_point_name`, `warehouse_id`,
     `default_cash_register_id`, `channel_type`, `is_active`,
     `created_at`, `updated_at`)
VALUES
    -- Cecilia (warehouse 5, caja 1)
    (2,  'PV_0002', 'PV Cecilia 2',          5, 1, 'STORE', 1, NOW(), NOW()),
    -- Taller (warehouse 1, caja 2)
    (3,  'PV_0003', 'PV Taller 1',           1, 2, 'STORE', 1, NOW(), NOW()),
    (4,  'PV_0004', 'PV Taller 2',           1, 2, 'STORE', 1, NOW(), NOW()),
    -- PYME (warehouse 2, caja 3)
    (5,  'PV_0005', 'PV PYME 1',             2, 3, 'STORE', 1, NOW(), NOW()),
    (6,  'PV_0006', 'PV PYME 2',             2, 3, 'STORE', 1, NOW(), NOW()),
    -- Santa Filomena (warehouse 3, caja 4)
    (7,  'PV_0007', 'PV Santa Filomena 1',   3, 4, 'STORE', 1, NOW(), NOW()),
    (8,  'PV_0008', 'PV Santa Filomena 2',   3, 4, 'STORE', 1, NOW(), NOW()),
    -- Patronato (warehouse 4, caja 5)
    (9,  'PV_0009', 'PV Patronato 1',        4, 5, 'STORE', 1, NOW(), NOW()),
    (10, 'PV_0010', 'PV Patronato 2',        4, 5, 'STORE', 1, NOW(), NOW());

-- ── 3. Asignaciones de caja para root (CASHIER, sin vencimiento) ─

INSERT IGNORE INTO `cash_register_user_assignments`
    (`id`, `cash_register_id`, `user_id`, `operator_role`,
     `is_default`, `valid_from`, `valid_until`, `is_active`,
     `created_at`, `updated_at`)
VALUES
    -- Taller
    (8,  2, 9, 'CASHIER', 1, NULL, NULL, 1, NOW(), NOW()),
    -- PYME
    (9,  3, 9, 'CASHIER', 1, NULL, NULL, 1, NOW(), NOW()),
    -- Santa Filomena
    (10, 4, 9, 'CASHIER', 1, NULL, NULL, 1, NOW(), NOW()),
    -- Patronato
    (11, 5, 9, 'CASHIER', 1, NULL, NULL, 1, NOW(), NOW());

-- Cecilia (caja id=1) ya tiene asignación CASHIER para root.
-- Extiende valid_until a NULL para que no expire.
UPDATE `cash_register_user_assignments`
    SET `valid_until` = NULL, `updated_at` = NOW()
    WHERE `cash_register_id` = 1
      AND `user_id` = 9
      AND `deleted_at` IS NULL;

-- ── 4. Asignaciones de punto de venta para root (SELLER) ─────

INSERT IGNORE INTO `sales_point_user_assignments`
    (`id`, `sales_point_id`, `user_id`, `operator_role`,
     `is_default`, `valid_from`, `valid_until`, `is_active`,
     `created_at`, `updated_at`)
VALUES
    -- Cecilia
    (1,  1,  9, 'SELLER', 1, NULL, NULL, 1, NOW(), NOW()),
    (2,  2,  9, 'SELLER', 0, NULL, NULL, 1, NOW(), NOW()),
    -- Taller
    (3,  3,  9, 'SELLER', 1, NULL, NULL, 1, NOW(), NOW()),
    (4,  4,  9, 'SELLER', 0, NULL, NULL, 1, NOW(), NOW()),
    -- PYME
    (5,  5,  9, 'SELLER', 1, NULL, NULL, 1, NOW(), NOW()),
    (6,  6,  9, 'SELLER', 0, NULL, NULL, 1, NOW(), NOW()),
    -- Santa Filomena
    (7,  7,  9, 'SELLER', 1, NULL, NULL, 1, NOW(), NOW()),
    (8,  8,  9, 'SELLER', 0, NULL, NULL, 1, NOW(), NOW()),
    -- Patronato
    (9,  9,  9, 'SELLER', 1, NULL, NULL, 1, NOW(), NOW()),
    (10, 10, 9, 'SELLER', 0, NULL, NULL, 1, NOW(), NOW());
