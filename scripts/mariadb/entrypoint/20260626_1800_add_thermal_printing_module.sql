-- ============================================================
-- Módulo de impresión térmica: permisos y menú
-- Fecha: 2026-06-26
-- Descripción: Agrega permisos y entradas de menú para el
--              sistema de impresión térmica (templates y jobs).
--              Idempotente: usa ON DUPLICATE KEY UPDATE / IGNORE.
-- ============================================================

-- ─── 1. Permisos ────────────────────────────────────────────
INSERT INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active)
VALUES ('PRINT_TEMPLATES_ACCESS', 'Ver Templates de Impresion', 'PRINTING', 'Acceso al modulo de gestion de templates de impresion termica y historial de trabajos', 1)
ON DUPLICATE KEY UPDATE permission_name = VALUES(permission_name), permission_group = VALUES(permission_group);

-- ─── 2. Asignar permiso al rol SUPER_ADMIN ──────────────────
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.role_code = 'SUPER_ADMIN'
  AND p.permission_code = 'PRINT_TEMPLATES_ACCESS';

-- ─── 3. Menú: Templates de impresión (bajo Caja, parent=cash) ───
INSERT INTO menu_items
    (parent_id, menu_code, menu_name, menu_description, icon_name, menu_url,
     menu_type, required_permission_id, is_active, is_visible, sort_order, menu_level)
SELECT
    (SELECT id FROM menu_items WHERE menu_code = 'cash' LIMIT 1),
    'print_templates',
    'Templates de impresion',
    'Configuracion de templates para tickets termicos',
    'Printer',
    '/admin/print/templates',
    'LINK',
    (SELECT id FROM permissions WHERE permission_code = 'PRINT_TEMPLATES_ACCESS' LIMIT 1),
    1, 1, 90, 2
ON DUPLICATE KEY UPDATE
    parent_id       = VALUES(parent_id),
    menu_name       = VALUES(menu_name),
    menu_url        = VALUES(menu_url),
    icon_name       = VALUES(icon_name),
    required_permission_id = VALUES(required_permission_id),
    is_active       = 1,
    is_visible      = 1,
    sort_order      = VALUES(sort_order);

-- ─── 4. Menú: Historial de impresiones (bajo Caja) ──────────
INSERT INTO menu_items
    (parent_id, menu_code, menu_name, menu_description, icon_name, menu_url,
     menu_type, required_permission_id, is_active, is_visible, sort_order, menu_level)
SELECT
    (SELECT id FROM menu_items WHERE menu_code = 'cash' LIMIT 1),
    'print_jobs',
    'Historial de impresiones',
    'Seguimiento de trabajos de impresion termica',
    'FileText',
    '/admin/print/jobs',
    'LINK',
    (SELECT id FROM permissions WHERE permission_code = 'PRINT_TEMPLATES_ACCESS' LIMIT 1),
    1, 1, 95, 2
ON DUPLICATE KEY UPDATE
    parent_id       = VALUES(parent_id),
    menu_name       = VALUES(menu_name),
    menu_url        = VALUES(menu_url),
    icon_name       = VALUES(icon_name),
    required_permission_id = VALUES(required_permission_id),
    is_active       = 1,
    is_visible      = 1,
    sort_order      = VALUES(sort_order);
