-- =====================================================
-- Rutinas auth secret
-- Archivo: 20260603_1352_routines_auth_secret.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ==========================================
-- Migration: 20260603_1312_auth_system_setup.sql
-- Descripción: Migración para sistema de autenticación JWT
-- - Poblado de secrets para usuarios existentes
-- - Índices optimizados para autenticación
-- ==========================================

-- ==========================================
-- PARTE 1: VERIFICAR Y ACTUALIZAR ESQUEMA
-- ==========================================

-- Asegurar que el campo secret existe y tiene el tamaño correcto
ALTER TABLE users
MODIFY COLUMN secret VARCHAR(64) NULL
COMMENT 'Secret individual del usuario para JWT doble secreto';

-- ==========================================
-- PARTE 2: FUNCIÓN TEMPORAL PARA GENERAR SECRETS
-- ==========================================

DELIMITER //

-- Función temporal para generar secret aleatorio (solo para esta migración)
CREATE FUNCTION generate_user_secret_temp()
RETURNS VARCHAR(64)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE secret_hex VARCHAR(64);

    -- Generar secret usando UUID y timestamp para aleatoriedad
    SET secret_hex = CONCAT(
        REPLACE(UUID(), '-', ''),
        HEX(UNIX_TIMESTAMP()),
        HEX(RAND() * 4294967295)
    );

    -- Tomar exactamente 64 caracteres
    RETURN LEFT(secret_hex, 64);
END//

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
