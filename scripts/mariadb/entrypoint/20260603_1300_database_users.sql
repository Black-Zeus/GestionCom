-- =====================================================
-- Usuarios de base de datos
-- Archivo: 20260603_1300_database_users.sql
-- =====================================================

-- =============================================
-- USUARIOS DE APLICACIÓN
-- =============================================

-- Usuario principal de la aplicación (solo remoto para Docker)
CREATE USER IF NOT EXISTS 'inventario_user'@'%' IDENTIFIED BY 'inventario_pass_2024';
GRANT ALL PRIVILEGES ON inventario.* TO 'inventario_user'@'%';

-- =============================================
-- USUARIOS DE DESARROLLO (solo desarrollo)
-- =============================================

-- Usuario para debugging/herramientas externas (solo en desarrollo)
CREATE USER IF NOT EXISTS 'dev_debug'@'%' IDENTIFIED BY 'dev_debug_pass_2024';
GRANT ALL PRIVILEGES ON inventario.* TO 'dev_debug'@'%';

-- Aplicar cambios
FLUSH PRIVILEGES;

-- =============================================
-- CONFIGURACIÓN PARA PRODUCCIÓN
-- Descomentar las siguientes líneas en PRD
-- =============================================

-- Eliminar usuario de debugging en producción
-- DROP USER IF EXISTS 'dev_debug'@'%';
--
-- Cambiar permisos del usuario de aplicación (más restrictivos)
-- REVOKE ALL PRIVILEGES ON inventario.* FROM 'inventario_user'@'%';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON inventario.* TO 'inventario_user'@'%';
--
-- FLUSH PRIVILEGES;

-- =============================================
-- VERIFICACIÓN (opcional para debugging)
-- =============================================

-- SELECT 'Usuarios creados exitosamente' AS status;
