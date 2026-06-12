-- Agrega soporte de alcance por sucursal a las promociones.
-- applies_all_warehouses=1 (default) → aplica a todas.
-- applies_all_warehouses=0 → solo a las bodegas listadas en promotion_warehouses.
USE inventario;

ALTER TABLE promotions
  ADD COLUMN applies_all_warehouses TINYINT(1) NOT NULL DEFAULT 1
    COMMENT '1=todas las sucursales, 0=solo las indicadas en promotion_warehouses';

CREATE TABLE IF NOT EXISTS promotion_warehouses (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  promotion_id  BIGINT UNSIGNED NOT NULL,
  warehouse_id  BIGINT UNSIGNED NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_promotion_warehouse (promotion_id, warehouse_id),
  INDEX idx_pw_promotion_id (promotion_id),
  INDEX idx_pw_warehouse_id (warehouse_id),
  FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);
