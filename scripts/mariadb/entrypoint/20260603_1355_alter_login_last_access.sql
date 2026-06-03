-- =====================================================
-- Alter login ultimo acceso
-- Archivo: 20260603_1355_alter_login_last_access.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE users
ADD COLUMN last_login_ip VARCHAR(45) AFTER last_login_at;

SET FOREIGN_KEY_CHECKS = 1;
