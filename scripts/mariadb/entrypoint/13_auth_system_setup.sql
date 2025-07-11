-- ==========================================
-- Migration: 12_auth_system_setup.sql
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

-- ==========================================
-- PARTE 3: POBLAR SECRETS PARA USUARIOS EXISTENTES
-- ==========================================

-- Actualizar usuarios que no tienen secret válido
UPDATE users 
SET 
    secret = generate_user_secret_temp(),
    updated_at = CURRENT_TIMESTAMP
WHERE 
    (secret IS NULL OR secret = '' OR LENGTH(secret) != 64)
    AND deleted_at IS NULL;

-- Verificar el resultado
SELECT 
    COUNT(*) as total_active_users,
    COUNT(CASE WHEN secret IS NOT NULL AND LENGTH(secret) = 64 THEN 1 END) as users_with_secret
FROM users 
WHERE deleted_at IS NULL;

-- ==========================================
-- PARTE 4: ÍNDICES OPTIMIZADOS PARA AUTENTICACIÓN
-- ==========================================

-- Índice para búsqueda de secret (validación de tokens)
CREATE INDEX idx_users_secret  ON users (secret);

-- Índice compuesto para login por username/email
CREATE INDEX idx_users_login_lookup 
ON users (username, email, is_active, deleted_at);

-- Índice para usuarios activos (queries frecuentes)
CREATE INDEX idx_users_active_status 
ON users (is_active, deleted_at);

-- ==========================================
-- ÍNDICES PARA TABLAS DE ROLES Y PERMISOS (si existen)
-- ==========================================

-- Índices para user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
ON user_roles (user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_composite 
ON user_roles (user_id, role_id);

-- Índices para user_permissions  
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id 
ON user_permissions (user_id);

CREATE INDEX IF NOT EXISTS idx_user_permissions_composite 
ON user_permissions (user_id, permission_id, permission_type);

-- Índices para role_permissions
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id 
ON role_permissions (role_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_composite 
ON role_permissions (role_id, permission_id);

-- ==========================================
-- PARTE 5: LIMPIEZA
-- ==========================================

-- Eliminar función temporal
DROP FUNCTION generate_user_secret_temp;

-- ==========================================
-- PARTE 6: VERIFICACIÓN FINAL
-- ==========================================

-- Verificar que todos los usuarios activos tienen secret
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'ÉXITO: Todos los usuarios tienen secret válido'
        ELSE CONCAT('ERROR: ', COUNT(*), ' usuarios sin secret válido')
    END as resultado
FROM users 
WHERE 
    deleted_at IS NULL 
    AND is_active = 1 
    AND (secret IS NULL OR secret = '' OR LENGTH(secret) != 64);

-- Mostrar estadísticas finales
SELECT 
    COUNT(*) as total_usuarios_activos,
    COUNT(CASE WHEN LENGTH(secret) = 64 THEN 1 END) as usuarios_con_secret,
    COUNT(CASE WHEN LENGTH(secret) = 64 THEN 1 END) / COUNT(*) * 100 as porcentaje_completado
FROM users 
WHERE deleted_at IS NULL AND is_active = 1;

-- ==========================================
-- NOTAS PARA EL DESARROLLADOR:
-- ==========================================

/*
ESTA MIGRACIÓN:
✅ Pobla secrets para usuarios existentes sin secret válido
✅ Crea índices optimizados para consultas de autenticación
✅ Verifica que la operación fue exitosa
✅ Limpia funciones temporales

POST-MIGRACIÓN:
1. Verificar que todos los usuarios tienen secret válido
2. Configurar variables de entorno JWT_SECRET_SYSTEM
3. Ejecutar tests de autenticación
4. Los nuevos usuarios obtendrán secret automáticamente via tu UserSecretService

ÍNDICES CREADOS:
- idx_users_secret: Para validación rápida de tokens
- idx_users_login_lookup: Para login por username/email
- idx_users_active_status: Para consultas de usuarios activos
- Índices en tablas de roles/permisos para joins eficientes
*/