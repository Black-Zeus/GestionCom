-- =====================================================
-- Rutinas menu
-- Archivo: 20260603_1334_routines_menu.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

DELIMITER //

CREATE PROCEDURE get_user_menu_api(
    IN p_user_id BIGINT UNSIGNED,
    IN p_include_favorites BOOLEAN
)
BEGIN
    -- Si no se pasa el valor para p_include_favorites, establecerlo en TRUE por defecto
    IF p_include_favorites IS NULL THEN
        SET p_include_favorites = TRUE;
    END IF;

    -- Menú principal
    SELECT
        menu_item_id AS id,
        parent_id,
        menu_code AS code,
        menu_name AS name,
        menu_description AS description,
        icon_name AS icon,
        icon_color AS iconColor,
        menu_url AS url,
        menu_type AS type,
        sort_order AS sortOrder,
        menu_level AS level,
        menu_path AS path,
        target_window AS target,
        css_classes AS cssClasses,
        data_attributes AS dataAttributes,
        is_favorite AS isFavorite,
        favorite_order AS favoriteOrder
    FROM v_user_menu
    WHERE user_id = p_user_id
        AND has_access = TRUE
    ORDER BY menu_level, sort_order, menu_name;

    -- Menús favoritos (si se solicitan)
    IF p_include_favorites THEN
        SELECT
            menu_item_id AS id,
            menu_code AS code,
            menu_name AS name,
            icon_name AS icon,
            icon_color AS iconColor,
            menu_url AS url,
            favorite_order AS orderReg,
            favorited_at AS favoritedAt
        FROM v_user_favorites_menu
        WHERE user_id = p_user_id
        ORDER BY favorite_order;
    END IF;
END//

DELIMITER ;

-- Procedimiento para búsqueda de menús
DELIMITER //

CREATE PROCEDURE search_menu_items(
    IN p_user_id BIGINT UNSIGNED,
    IN p_search_term VARCHAR(255)
)
BEGIN
    SELECT
        menu_item_id AS id,
        menu_code AS code,
        menu_name AS name,
        menu_description AS description,
        icon_name AS icon,
        icon_color AS iconColor,
        menu_url AS url,
        menu_path AS path,
        MATCH(menu_name, menu_description) AGAINST(p_search_term IN BOOLEAN MODE) AS relevance
    FROM v_user_menu
    WHERE user_id = p_user_id
        AND has_access = TRUE
        AND MATCH(menu_name, menu_description) AGAINST(p_search_term IN BOOLEAN MODE)
    ORDER BY relevance DESC, menu_name ASC
    LIMIT 20;
END//

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
