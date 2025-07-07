-- =============================================
-- Crear usuario remoto para debugging/desarrollo
-- =============================================

-- Usuario específico para debugging con acceso remoto
CREATE USER IF NOT EXISTS 'dev_remote'@'%' IDENTIFIED BY 'dev_remote_pass_2024';
GRANT ALL PRIVILEGES ON inventario.* TO 'dev_remote'@'%';

CREATE USER IF NOT EXISTS 'inventario_user'@'localhost' IDENTIFIED BY 'inventario_pass_2024';
GRANT ALL PRIVILEGES ON inventario.* TO 'inventario_user'@'localhost';

-- Aplicar cambios
FLUSH PRIVILEGES;


-- =============================================
-- Eliminar usuario de debugging (solo PRD)
-- Descomentar siguientes Lineas
-- =============================================

-- DROP USER IF EXISTS 'dev_remote'@'%';
-- FLUSH PRIVILEGES;
-- SELECT 'Usuario de debugging eliminado' AS resultado;


-- Mostrar todos los usuarios del sistema
-- SELECT 'Listado completo de usuarios del sistema:' AS info;
-- SELECT User, Host, 
--        CASE 
--            WHEN Host = 'localhost' THEN 'Local'
--            WHEN Host = '%' THEN 'Remoto'
--            ELSE Host 
--        END AS Tipo_Acceso
-- FROM mysql.user 
-- ORDER BY User, Host;