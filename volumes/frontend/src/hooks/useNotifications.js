// ====================================
// useNotifications.js
// Hook especializado para el manejo de notificaciones del header
// ====================================

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useHeaderStore } from '@/store/headerStore';

/**
 * Hook especializado para manejar notificaciones del header
 * Proporciona funcionalidades avanzadas como filtrado, agrupación,
 * notificaciones de escritorio y sonidos
 * 
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.enableDesktopNotifications - Habilitar notificaciones de escritorio
 * @param {boolean} options.enableSounds - Habilitar sonidos
 * @param {number} options.maxNotifications - Máximo número de notificaciones
 * @param {boolean} options.autoMarkRead - Marcar como leído automáticamente
 * @param {number} options.autoMarkReadDelay - Delay para auto marcar como leído (ms)
 * @returns {Object} - Funciones y estados para manejar notificaciones
 */
export const useNotifications = (options = {}) => {
    const {
        enableDesktopNotifications = true,
        enableSounds = true,
        maxNotifications = 50,
        autoMarkRead = false,
        autoMarkReadDelay = 3000
    } = options;

    const notificationSound = useRef(null);
    const lastNotificationId = useRef(null);

    // Estados del store
    const {
        notifications,
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        removeNotification,
        clearAllNotifications,
        simulateNewNotification
    } = useHeaderStore();

    // ====================================
    // COMPUTED VALUES
    // ====================================

    /**
     * Notificaciones filtradas y procesadas
     */
    const processedNotifications = useMemo(() => {
        return notifications.map(notification => ({
            ...notification,
            timeAgo: getTimeAgo(notification.timestamp),
            priorityColor: getPriorityColor(notification.priority || notification.status),
            typeIcon: getTypeIcon(notification.type),
            isRecent: Date.now() - notification.timestamp < 300000 // 5 minutos
        }));
    }, [notifications]);

    /**
     * Estadísticas de notificaciones
     */
    const notificationStats = useMemo(() => {
        const unread = notifications.filter(n => !n.read);
        const byPriority = notifications.reduce((acc, n) => {
            const priority = n.priority || n.status || 'normal';
            acc[priority] = (acc[priority] || 0) + 1;
            return acc;
        }, {});

        const byType = notifications.reduce((acc, n) => {
            acc[n.type] = (acc[n.type] || 0) + 1;
            return acc;
        }, {});

        return {
            total: notifications.length,
            unread: unread.length,
            urgent: byPriority.urgent || 0,
            normal: byPriority.normal || 0,
            low: byPriority.low || 0,
            byType,
            hasUnread: unread.length > 0,
            newestTimestamp: notifications.length > 0 ? notifications[0].timestamp : null
        };
    }, [notifications]);

    // ====================================
    // HELPER FUNCTIONS
    // ====================================

    /**
     * Convierte timestamp a formato "hace X tiempo"
     */
    const getTimeAgo = useCallback((timestamp) => {
        const now = Date.now();
        const diff = now - timestamp;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Ahora';
        if (minutes < 60) return `Hace ${minutes} min`;
        if (hours < 24) return `Hace ${hours}h`;
        if (days < 7) return `Hace ${days}d`;

        return new Date(timestamp).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
        });
    }, []);

    /**
     * Obtiene color basado en prioridad
     */
    const getPriorityColor = useCallback((priority) => {
        const colors = {
            urgent: 'red',
            high: 'orange',
            normal: 'blue',
            low: 'gray'
        };
        return colors[priority] || 'blue';
    }, []);

    /**
     * Obtiene icono basado en tipo
     */
    const getTypeIcon = useCallback((type) => {
        const icons = {
            warning: '⚠️',
            danger: '❌',
            info: 'ℹ️',
            success: '✅',
            system: '⚙️',
            finance: '💰',
            inventory: '📦',
            security: '🔐'
        };
        return icons[type] || '📄';
    }, []);

    // ====================================
    // NOTIFICATION ACTIONS
    // ====================================

    /**
     * Agrega una nueva notificación con configuraciones avanzadas
     */
    const addNotificationAdvanced = useCallback((notification, options = {}) => {
        const {
            showDesktop = enableDesktopNotifications,
            playSound = enableSounds,
            autoRead = autoMarkRead,
            persist = true
        } = options;

        const newNotification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            read: false,
            priority: 'normal',
            type: 'info',
            ...notification
        };

        // Agregar al store
        addNotification(newNotification);

        // Notificación de escritorio
        if (showDesktop && 'Notification' in window && Notification.permission === 'granted') {
            showDesktopNotification(newNotification);
        }

        // Reproducir sonido
        if (playSound) {
            playNotificationSound(newNotification.priority);
        }

        // Auto marcar como leída
        if (autoRead) {
            setTimeout(() => {
                markNotificationRead(newNotification.id);
            }, autoMarkReadDelay);
        }

        return newNotification.id;
    }, [addNotification, enableDesktopNotifications, enableSounds, autoMarkRead,
        autoMarkReadDelay, markNotificationRead]);

    /**
     * Filtra notificaciones por criterios
     */
    const filterNotifications = useCallback((filters = {}) => {
        const {
            type,
            priority,
            read,
            timeRange,
            searchTerm
        } = filters;

        return processedNotifications.filter(notification => {
            // Filtro por tipo
            if (type && notification.type !== type) return false;

            // Filtro por prioridad
            if (priority && (notification.priority || notification.status) !== priority) {
                return false;
            }

            // Filtro por estado de lectura
            if (read !== undefined && notification.read !== read) return false;

            // Filtro por rango de tiempo
            if (timeRange) {
                const now = Date.now();
                const notificationAge = now - notification.timestamp;
                const maxAge = timeRange * 60 * 60 * 1000; // timeRange en horas
                if (notificationAge > maxAge) return false;
            }

            // Filtro por término de búsqueda
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const titleMatch = notification.title?.toLowerCase().includes(term);
                const messageMatch = notification.message?.toLowerCase().includes(term);
                if (!titleMatch && !messageMatch) return false;
            }

            return true;
        });
    }, [processedNotifications]);

    /**
     * Agrupa notificaciones por criterio
     */
    const groupNotifications = useCallback((groupBy = 'type') => {
        return processedNotifications.reduce((groups, notification) => {
            let key;

            switch (groupBy) {
                case 'type':
                    key = notification.type;
                    break;
                case 'priority':
                    key = notification.priority || notification.status || 'normal';
                    break;
                case 'date':
                    key = new Date(notification.timestamp).toDateString();
                    break;
                case 'read':
                    key = notification.read ? 'Leídas' : 'No leídas';
                    break;
                default:
                    key = 'Todas';
            }

            if (!groups[key]) {
                groups[key] = [];
            }

            groups[key].push(notification);
            return groups;
        }, {});
    }, [processedNotifications]);

    // ====================================
    // DESKTOP NOTIFICATIONS
    // ====================================

    /**
     * Solicita permisos para notificaciones de escritorio
     */
    const requestDesktopPermission = useCallback(async () => {
        if (!('Notification' in window)) {
            console.warn('Este navegador no soporta notificaciones de escritorio');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    }, []);

    /**
     * Muestra notificación de escritorio
     */
    const showDesktopNotification = useCallback((notification) => {
        if (Notification.permission !== 'granted') return;

        const desktopNotif = new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico', // Ajustar según tu app
            tag: notification.id,
            renotify: false,
            requireInteraction: notification.priority === 'urgent'
        });

        desktopNotif.onclick = () => {
            window.focus();
            markNotificationRead(notification.id);
            desktopNotif.close();
        };

        // Auto cerrar después de 5 segundos (excepto urgentes)
        if (notification.priority !== 'urgent') {
            setTimeout(() => {
                desktopNotif.close();
            }, 5000);
        }
    }, [markNotificationRead]);

    // ====================================
    // SOUND MANAGEMENT
    // ====================================

    /**
     * Reproduce sonido de notificación
     */
    const playNotificationSound = useCallback((priority = 'normal') => {
        if (!enableSounds) return;

        try {
            // Crear audio element si no existe
            if (!notificationSound.current) {
                notificationSound.current = new Audio();
            }

            // Seleccionar sonido basado en prioridad
            const soundFiles = {
                urgent: '/sounds/urgent.mp3',
                high: '/sounds/high.mp3',
                normal: '/sounds/normal.mp3',
                low: '/sounds/low.mp3'
            };

            const soundFile = soundFiles[priority] || soundFiles.normal;

            notificationSound.current.src = soundFile;
            notificationSound.current.volume = 0.7;
            notificationSound.current.play().catch(error => {
                console.warn('No se pudo reproducir sonido de notificación:', error);
            });
        } catch (error) {
            console.warn('Error al reproducir sonido:', error);
        }
    }, [enableSounds]);

    // ====================================
    // BULK ACTIONS
    // ====================================

    /**
     * Marcar múltiples notificaciones como leídas
     */
    const markMultipleAsRead = useCallback((notificationIds) => {
        notificationIds.forEach(id => {
            markNotificationRead(id);
        });
    }, [markNotificationRead]);

    /**
     * Eliminar múltiples notificaciones
     */
    const removeMultiple = useCallback((notificationIds) => {
        notificationIds.forEach(id => {
            removeNotification(id);
        });
    }, [removeNotification]);

    /**
     * Limpia notificaciones antiguas
     */
    const cleanupOldNotifications = useCallback((maxAge = 7 * 24 * 60 * 60 * 1000) => {
        const now = Date.now();
        const oldNotifications = notifications.filter(n =>
            n.read && (now - n.timestamp) > maxAge
        );

        removeMultiple(oldNotifications.map(n => n.id));

        return oldNotifications.length;
    }, [notifications, removeMultiple]);

    // ====================================
    // EFFECTS
    // ====================================

    // Solicitar permisos al montar
    useEffect(() => {
        if (enableDesktopNotifications) {
            requestDesktopPermission();
        }
    }, [enableDesktopNotifications, requestDesktopPermission]);

    // Detectar nuevas notificaciones para sonidos/desktop
    useEffect(() => {
        if (notifications.length > 0) {
            const latestNotification = notifications[0];

            // Verificar si es una notificación nueva
            if (latestNotification.id !== lastNotificationId.current) {
                lastNotificationId.current = latestNotification.id;

                // Solo para notificaciones realmente nuevas (no al cargar la página)
                if (latestNotification.timestamp > Date.now() - 10000) {
                    if (enableSounds) {
                        playNotificationSound(latestNotification.priority || latestNotification.status);
                    }

                    if (enableDesktopNotifications) {
                        showDesktopNotification(latestNotification);
                    }
                }
            }
        }
    }, [notifications, enableSounds, enableDesktopNotifications,
        playNotificationSound, showDesktopNotification]);

    // ====================================
    // DEBUGGING
    // ====================================

    const debugNotifications = useCallback(() => {
        //console.log('🔔 Notifications Debug:', {
        //  total: notifications.length,
        //  stats: notificationStats,
        //  options: { enableDesktopNotifications, enableSounds, maxNotifications }
        //});
    }, [notifications, notificationStats, enableDesktopNotifications, enableSounds, maxNotifications]);

    // ====================================
    // RETURN OBJECT
    // ====================================

    return {
        // Datos básicos
        notifications: processedNotifications,
        stats: notificationStats,

        // Acciones básicas
        addNotification: addNotificationAdvanced,
        markAsRead: markNotificationRead,
        markAllAsRead: markAllNotificationsRead,
        removeNotification,
        clearAll: clearAllNotifications,

        // Acciones avanzadas
        filterNotifications,
        groupNotifications,
        markMultipleAsRead,
        removeMultiple,
        cleanupOldNotifications,

        // Desktop notifications
        requestDesktopPermission,
        showDesktopNotification,
        hasDesktopPermission: () => 'Notification' in window && Notification.permission === 'granted',

        // Sound management
        playNotificationSound,

        // Utilidades
        getTimeAgo,
        getPriorityColor,
        getTypeIcon,

        // Simulación (desarrollo)
        simulate: simulateNewNotification,

        // Debugging
        debugNotifications
    };
};

export default useNotifications;