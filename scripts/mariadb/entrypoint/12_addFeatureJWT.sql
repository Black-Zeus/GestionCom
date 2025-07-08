-- =====================================================
-- JWT AUTH SYSTEM - MINIMAL DATABASE MIGRATION
-- Fecha: 2025-07-08
-- Descripción: Solo los ALTERs necesarios para JWT con doble secreto
-- =====================================================

-- =====================================================
-- 1. AGREGAR CAMPO SECRET A TABLA USERS
-- =====================================================

-- Agregar campo secret para JWT doble secreto
ALTER TABLE `users` 
ADD COLUMN `secret` CHAR(64) DEFAULT NULL COMMENT 'Secret individual del usuario para JWT doble secreto' 
AFTER `password_hash`;

-- Agregar índice para performance
ALTER TABLE `users` 
ADD INDEX `idx_secret` (`secret`);

-- =====================================================
-- 2. GENERAR SECRETS PARA USUARIOS EXISTENTES
-- =====================================================

-- Generar secrets para usuarios existentes usando una función simple
UPDATE `users` 
SET `secret` = SHA2(CONCAT(
    id, 
    '-', 
    UNIX_TIMESTAMP(NOW(6)), 
    '-', 
    email,
    '-',
    UUID()
), 256) 
WHERE `secret` IS NULL AND `deleted_at` IS NULL;

-- =====================================================
-- 3. VERIFICACIÓN
-- =====================================================

-- Verificar que todos los usuarios activos tienen secret
SELECT 
    COUNT(*) as total_active_users,
    COUNT(secret) as users_with_secret,
    COUNT(*) - COUNT(secret) as users_without_secret
FROM users 
WHERE deleted_at IS NULL;

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================