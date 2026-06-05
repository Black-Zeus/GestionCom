-- Centro de notificaciones: catalogo extensible de tipos y bandeja por usuario.

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

CREATE TABLE IF NOT EXISTS notification_types (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type_code VARCHAR(80) UNIQUE NOT NULL,
    type_name VARCHAR(150) NOT NULL,
    type_description TEXT NULL,
    severity ENUM('INFO', 'SUCCESS', 'WARNING', 'ERROR') NOT NULL DEFAULT 'INFO',
    icon_name VARCHAR(80) NULL,
    default_action_label VARCHAR(80) NULL,
    is_user_visible BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_type_code (type_code),
    INDEX idx_severity (severity),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

CREATE TABLE IF NOT EXISTS user_notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    notification_type_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(180) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500) NULL,
    action_label VARCHAR(80) NULL,
    source_table VARCHAR(100) NULL,
    source_id BIGINT UNSIGNED NULL,
    priority ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP NULL DEFAULT NULL,
    delivered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (notification_type_id) REFERENCES notification_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, is_read),
    INDEX idx_user_delivered (user_id, delivered_at),
    INDEX idx_notification_type_id (notification_type_id),
    INDEX idx_priority (priority),
    INDEX idx_deleted_at (deleted_at)
);

INSERT IGNORE INTO notification_types (
  type_code, type_name, type_description, severity, icon_name, default_action_label, is_user_visible, is_active
) VALUES
('SYSTEM_INFO', 'Informacion del sistema', 'Mensajes informativos emitidos por el sistema.', 'INFO', 'bell-line', 'Ver detalle', TRUE, TRUE),
('SECURITY_ALERT', 'Alerta de seguridad', 'Eventos de seguridad o permisos que requieren atencion.', 'WARNING', 'shield-line', 'Revisar', TRUE, TRUE),
('INVENTORY_ALERT', 'Alerta de inventario', 'Alertas asociadas a stock, bodegas o productos.', 'WARNING', 'archive-line', 'Ver inventario', TRUE, TRUE),
('TASK_COMPLETED', 'Tarea completada', 'Procesos o tareas finalizadas correctamente.', 'SUCCESS', 'check-line', 'Ver resultado', TRUE, TRUE),
('PROCESS_ERROR', 'Error de proceso', 'Procesos que finalizaron con error.', 'ERROR', 'error-warning-line', 'Ver error', TRUE, TRUE);

INSERT IGNORE INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active) VALUES
('NOTIFICATIONS_ACCESS', 'Acceder a Notificaciones', 'SYSTEM', 'Permite ver el centro de notificaciones propio.', TRUE),
('NOTIFICATIONS_MANAGE_TYPES', 'Gestionar Tipos de Notificaciones', 'SYSTEM', 'Permite administrar el catalogo de tipos de notificaciones.', TRUE);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code IN ('NOTIFICATIONS_ACCESS', 'NOTIFICATIONS_MANAGE_TYPES')
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN');

UPDATE menu_items
SET required_permission_id = (SELECT id FROM permissions WHERE permission_code = 'NOTIFICATIONS_ACCESS')
WHERE menu_code = 'notifications'
  AND EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'NOTIFICATIONS_ACCESS');

INSERT INTO user_notifications (
  notification_type_id, user_id, title, message, action_url, action_label, priority
)
SELECT nt.id, @system_user_id, 'Centro de notificaciones disponible', 'Ya puedes revisar tus avisos del sistema desde la campanita y la bandeja de entrada.', '/notifications', 'Ir a la bandeja', 'NORMAL'
FROM notification_types nt
WHERE nt.type_code = 'SYSTEM_INFO'
  AND @system_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM user_notifications un
    WHERE un.user_id = @system_user_id
      AND un.title = 'Centro de notificaciones disponible'
  );

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.is_active = TRUE
WHERE r.role_code = 'SUPER_ADMIN';
