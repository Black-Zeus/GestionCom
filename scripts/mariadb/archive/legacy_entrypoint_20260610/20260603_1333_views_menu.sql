-- =====================================================
-- Vistas menu
-- Archivo: 20260603_1333_views_menu.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- SECCIÓN 2: CREACIÓN DE VISTAS
-- =====================================================

-- Vista menú completo con permisos
CREATE VIEW v_menu_hierarchy AS
WITH RECURSIVE menu_tree AS (
    -- Menús raíz
    SELECT
        m.id,
        m.parent_id,
        m.menu_code,
        m.menu_name,
        m.menu_description,
        m.icon_name,
        m.icon_color,
        m.menu_url,
        m.menu_type,
        m.required_permission_id,
        p.permission_code as required_permission_code,
        m.is_active,
        m.is_visible,
        m.sort_order,
        m.menu_level,
        m.menu_path,
        m.target_window,
        m.css_classes,
        CAST(m.menu_name AS CHAR(1000)) as full_path
    FROM menu_items m
    LEFT JOIN permissions p ON m.required_permission_id = p.id
    WHERE m.parent_id IS NULL
        AND m.deleted_at IS NULL

    UNION ALL

    -- Menús hijos (recursivo)
    SELECT
        m.id,
        m.parent_id,
        m.menu_code,
        m.menu_name,
        m.menu_description,
        m.icon_name,
        m.icon_color,
        m.menu_url,
        m.menu_type,
        m.required_permission_id,
        p.permission_code as required_permission_code,
        m.is_active,
        m.is_visible,
        m.sort_order,
        m.menu_level,
        m.menu_path,
        m.target_window,
        m.css_classes,
        CONCAT(mt.full_path, ' > ', m.menu_name) as full_path
    FROM menu_items m
    JOIN menu_tree mt ON m.parent_id = mt.id
    LEFT JOIN permissions p ON m.required_permission_id = p.id
    WHERE m.deleted_at IS NULL
)
SELECT * FROM menu_tree
ORDER BY menu_level, sort_order, menu_name;

-- Vista menú por usuario (con permisos aplicados)
CREATE VIEW v_user_menu AS
SELECT DISTINCT
    u.id as user_id,
    u.username,
    m.id as menu_item_id,
    m.parent_id,
    m.menu_code,
    m.menu_name,
    m.menu_description,
    m.icon_name,
    m.icon_color,
    m.menu_url,
    m.menu_type,
    m.sort_order,
    m.menu_level,
    m.menu_path,
    m.target_window,
    m.css_classes,
    m.data_attributes,

    -- Información de permisos
    m.required_permission_id,
    p.permission_code as required_permission,

    -- Favoritos
    CASE WHEN umf.id IS NOT NULL THEN TRUE ELSE FALSE END as is_favorite,
    umf.favorite_order,

    -- Estado
    CASE
        WHEN m.required_permission_id IS NULL THEN TRUE
        WHEN user_perms.has_permission = TRUE THEN TRUE
        ELSE FALSE
    END as has_access

FROM users u
CROSS JOIN menu_items m
LEFT JOIN permissions p ON m.required_permission_id = p.id
LEFT JOIN user_menu_favorites umf ON u.id = umf.user_id AND m.id = umf.menu_item_id

-- Verificar permisos del usuario (rol + permisos adicionales)
LEFT JOIN (
    -- Permisos por rol
    SELECT DISTINCT
        u.id as user_id,
        rp.permission_id,
        TRUE as has_permission
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.deleted_at IS NULL

    UNION

    -- Permisos adicionales específicos del usuario
    SELECT DISTINCT
        up.user_id,
        up.permission_id,
        CASE WHEN up.permission_type = 'GRANT' THEN TRUE ELSE FALSE END as has_permission
    FROM user_permissions up
    WHERE (up.expires_at IS NULL OR up.expires_at > NOW())
) user_perms ON u.id = user_perms.user_id AND m.required_permission_id = user_perms.permission_id

WHERE u.deleted_at IS NULL
    AND m.deleted_at IS NULL
    AND m.is_active = TRUE
    AND m.is_visible = TRUE
    AND (
        m.required_permission_id IS NULL
        OR user_perms.has_permission = TRUE
    )
ORDER BY u.id, m.menu_level, m.sort_order, m.menu_name;

-- Vista estadísticas de uso del menú
CREATE VIEW v_menu_usage_stats AS
SELECT
    m.menu_code,
    m.menu_name,
    m.menu_url,
    COUNT(mal.id) as total_accesses,
    COUNT(DISTINCT mal.user_id) as unique_users,
    COUNT(DISTINCT DATE(mal.access_timestamp)) as active_days,
    MAX(mal.access_timestamp) as last_access,
    AVG(daily_access.daily_count) as avg_daily_accesses
FROM menu_items m
LEFT JOIN menu_access_log mal ON m.id = mal.menu_item_id
LEFT JOIN (
    SELECT
        menu_item_id,
        DATE(access_timestamp) as access_date,
        COUNT(*) as daily_count
    FROM menu_access_log
    GROUP BY menu_item_id, DATE(access_timestamp)
) daily_access ON m.id = daily_access.menu_item_id
WHERE m.deleted_at IS NULL
GROUP BY m.id
ORDER BY total_accesses DESC;

-- =====================================================

-- SECCIÓN 5: VISTAS ADICIONALES PARA FRONTEND
-- =====================================================

-- Vista menú jerárquico para React Tree Component
CREATE VIEW v_menu_tree_structure AS
WITH RECURSIVE menu_hierarchy AS (
    -- Nivel raíz
    SELECT
        m.id,
        m.parent_id,
        m.menu_code,
        m.menu_name,
        m.icon_name,
        m.icon_color,
        m.menu_url,
        m.menu_type,
        m.sort_order,
        m.menu_level,
        CAST(m.id AS CHAR(200)) as path,
        JSON_OBJECT(
            'id', m.id,
            'code', m.menu_code,
            'name', m.menu_name,
            'icon', m.icon_name,
            'iconColor', m.icon_color,
            'url', m.menu_url,
            'type', m.menu_type,
            'level', m.menu_level,
            'children', JSON_ARRAY()
        ) as menu_node
    FROM menu_items m
    WHERE m.parent_id IS NULL
        AND m.deleted_at IS NULL
        AND m.is_active = TRUE
        AND m.is_visible = TRUE

    UNION ALL

    -- Niveles hijos
    SELECT
        m.id,
        m.parent_id,
        m.menu_code,
        m.menu_name,
        m.icon_name,
        m.icon_color,
        m.menu_url,
        m.menu_type,
        m.sort_order,
        m.menu_level,
        CONCAT(mh.path, '->', m.id) as path,
        JSON_OBJECT(
            'id', m.id,
            'code', m.menu_code,
            'name', m.menu_name,
            'icon', m.icon_name,
            'iconColor', m.icon_color,
            'url', m.menu_url,
            'type', m.menu_type,
            'level', m.menu_level,
            'children', JSON_ARRAY()
        ) as menu_node
    FROM menu_items m
    JOIN menu_hierarchy mh ON m.parent_id = mh.id
    WHERE m.deleted_at IS NULL
        AND m.is_active = TRUE
        AND m.is_visible = TRUE
)
SELECT * FROM menu_hierarchy
ORDER BY menu_level, sort_order;

-- Vista menús favoritos por usuario
CREATE VIEW v_user_favorites_menu AS
SELECT
    u.id as user_id,
    u.username,
    m.id as menu_item_id,
    m.menu_code,
    m.menu_name,
    m.icon_name,
    m.icon_color,
    m.menu_url,
    umf.favorite_order,
    umf.created_at as favorited_at
FROM users u
JOIN user_menu_favorites umf ON u.id = umf.user_id
JOIN menu_items m ON umf.menu_item_id = m.id
WHERE u.deleted_at IS NULL
    AND m.deleted_at IS NULL
    AND m.is_active = TRUE
ORDER BY u.id, umf.favorite_order;

-- =====================================================
-- PROCEDIMIENTOS PARA API/FRONTEND
-- =====================================================

-- Procedimiento para obtener menú completo del usuario (para API)

SET FOREIGN_KEY_CHECKS = 1;
