-- =====================================================
-- Seed passwords demo
-- Archivo: 20260603_1354_seed_demo_passwords.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- PATRÓN DE CONTRASEÑAS:
-- - admin.demo      -> admin.demo1
-- - contador.demo   -> contador.demo1
-- - jefe.bodega     -> jefe.bodega1
-- - vendedor.centro -> vendedor.centro1
-- - vendedor.mall   -> vendedor.mall1
-- - cajero.demo     -> cajero.demo1
-- - consultor.demo  -> consultor.demo1
-- - supervisor.demo -> supervisor.demo1

-- Actualizar contraseñas
UPDATE users SET password_hash = '$2b$12$GJwjcMJpY.k3PjB9pwG9mePxRG5FymNnRFOYiZCdDLPbF.9c9CGLm', password_changed_at = NOW(), updated_at = NOW() WHERE username = 'admin.demo';
UPDATE users SET password_hash = '$2b$12$A4TxmFH.8ZL2VGt/vBJFIOBuEuUJnhEtl/XSv0Zrff4uj34kotmwC', password_changed_at = NOW(), updated_at = NOW() WHERE username = 'contador.demo';
UPDATE users SET password_hash = '$2b$12$ZH6CK0cuVAJFRjYv8jX0dOWLKlS0Wjo124wlujPH60lwp1p4wDc42', password_changed_at = NOW(), updated_at = NOW() WHERE username = 'jefe.bodega';
UPDATE users SET password_hash = '$2b$12$2aWNQuHFExYh4Bca3dL0dO3xv72rWZSBzFQJK2ljLc97tYhBxCx8K', password_changed_at = NOW(), updated_at = NOW() WHERE username = 'vendedor.centro';
UPDATE users SET password_hash = '$2b$12$xE4SPV5Y6lGfFCwYkZgNHuQ/3c56InAqWWiTqSggDVgg6KQfcOgBC', password_changed_at = NOW(), updated_at = NOW() WHERE username = 'vendedor.mall';
UPDATE users SET password_hash = '$2b$12$XuvsSdw1ZVQKVhBIGePPZuBOHay.Aq58rjvFujHBF4hhdb8CfxwrG', password_changed_at = NOW(), updated_at = NOW() WHERE username = 'cajero.demo';
UPDATE users SET password_hash = '$2b$12$GS2iDtNwdNoqo1DQvM4ZEufjoDBsLV0UpKs275x0Lz7BWwxc6ATfe', password_changed_at = NOW(), updated_at = NOW() WHERE username = 'consultor.demo';
UPDATE users SET password_hash = '$2b$12$tOWtYs1w.c.CM4vBYMTaC.jUPiFo/JqrBjcSQRreJx8G0MEmATI46', password_changed_at = NOW(), updated_at = NOW() WHERE username = 'supervisor.demo';

SET FOREIGN_KEY_CHECKS = 1;
