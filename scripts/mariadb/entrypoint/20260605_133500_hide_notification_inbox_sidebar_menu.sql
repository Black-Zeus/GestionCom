-- Oculta la bandeja de notificaciones del menu lateral.
-- La bandeja sigue disponible desde la campanita del header.

UPDATE menu_items
SET is_visible = FALSE,
    is_active = FALSE
WHERE menu_code = 'notifications'
   OR menu_url = '/notifications';
