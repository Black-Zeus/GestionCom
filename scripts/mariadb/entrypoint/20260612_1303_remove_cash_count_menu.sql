-- Oculta "Arqueo de caja" del menu lateral.
-- El arqueo es ahora un sub-modulo de Apertura / cierre de caja.
USE inventario;

UPDATE `menu_items`
SET `is_active` = 0, `is_visible` = 0
WHERE `menu_code` = 'cash_count';
