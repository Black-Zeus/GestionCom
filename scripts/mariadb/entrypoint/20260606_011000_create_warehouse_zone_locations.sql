-- Normaliza el nivel de ubicaciones internas bajo zonas de bodega.
-- Jerarquia: Bodega -> Zona -> Ubicacion interna.

CREATE TABLE IF NOT EXISTS warehouse_zone_locations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    warehouse_zone_id BIGINT UNSIGNED NOT NULL,
    location_code VARCHAR(24) NOT NULL,
    location_name VARCHAR(120) NOT NULL,
    location_description TEXT NULL,
    location_type ENUM('GENERAL', 'AISLE', 'RACK', 'SHELF', 'BIN', 'DISPLAY', 'OTHER') DEFAULT 'GENERAL',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    FOREIGN KEY (warehouse_zone_id) REFERENCES warehouse_zones(id) ON DELETE CASCADE,
    UNIQUE KEY uk_zone_location_code (warehouse_zone_id, location_code),
    INDEX idx_warehouse_zone_id (warehouse_zone_id),
    INDEX idx_location_code (location_code),
    INDEX idx_location_type (location_type),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);
