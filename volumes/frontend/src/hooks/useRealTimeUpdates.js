// ====================================
// useRealTimeUpdates.js
// Hook para actualizaciones en tiempo real del header
// ====================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { useHeaderStore } from '@/store/headerStore';

/**
 * Hook especializado para manejar actualizaciones en tiempo real
 * Proporciona funcionalidades para polling, WebSockets, y actualizaciones automáticas
 * 
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.enablePolling - Habilitar polling automático
 * @param {number} options.pollingInterval - Intervalo de polling en ms
 * @param {boolean} options.enableWebSocket - Habilitar WebSocket si está disponible
 * @param {string} options.websocketUrl - URL del WebSocket
 * @param {boolean} options.pauseOnInactive - Pausar cuando la ventana no está activa
 * @param {number} options.retryAttempts - Intentos de reconexión
 * @param {number} options.retryDelay - Delay entre intentos de reconexión
 * @returns {Object} - Estados y funciones para manejar actualizaciones en tiempo real
 */
export const useRealTimeUpdates = (options = {}) => {
    const {
        enablePolling = true,
        pollingInterval = 30000, // 30 segundos
        enableWebSocket = false,
        websocketUrl = null,
        pauseOnInactive = true,
        retryAttempts = 3,
        retryDelay = 5000
    } = options;

    // Estados locales
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [lastUpdate, setLastUpdate] = useState(null);
    const [isPolling, setIsPolling] = useState(false);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    // Referencias
    const pollingInterval_ref = useRef(null);
    const websocket = useRef(null);
    const isWindowActive = useRef(true);
    const isComponentMounted = useRef(true);

    // Store actions
    const {
        simulateNewNotification,
        simulateNewMessage,
        updateLastUpdate: updateStoreLastUpdate,
        config
    } = useHeaderStore();

    // ====================================
    // VISIBILITY AND ACTIVITY MANAGEMENT
    // ====================================

    /**
     * Maneja cambios de visibilidad de la ventana
     */
    const handleVisibilityChange = useCallback(() => {
        isWindowActive.current = !document.hidden;

        if (pauseOnInactive) {
            if (document.hidden) {
                //console.log('🔄 Pausando actualizaciones - ventana inactiva');
                stopPolling();
            } else {
                //console.log('🔄 Reanudando actualizaciones - ventana activa');
                if (enablePolling && config.autoRefresh) {
                    startPolling();
                }
                // Actualización inmediata al volver a la ventana
                performUpdate();
            }
        }
    }, [pauseOnInactive, enablePolling, config.autoRefresh]);

    /**
     * Maneja eventos de focus/blur de la ventana
     */
    const handleWindowFocus = useCallback(() => {
        isWindowActive.current = true;
        if (enablePolling && config.autoRefresh && pauseOnInactive) {
            performUpdate();
        }
    }, [enablePolling, config.autoRefresh, pauseOnInactive]);

    const handleWindowBlur = useCallback(() => {
        isWindowActive.current = false;
    }, []);

    // ====================================
    // POLLING MANAGEMENT
    // ====================================

    /**
     * Inicia el polling automático
     */
    const startPolling = useCallback(() => {
        if (pollingInterval_ref.current || !isComponentMounted.current) return;

        setIsPolling(true);
        setError(null);

        //console.log(`🔄 Iniciando polling cada ${pollingInterval}ms`);

        pollingInterval_ref.current = setInterval(() => {
            if (isWindowActive.current || !pauseOnInactive) {
                performUpdate();
            }
        }, pollingInterval);

        // Primera actualización inmediata
        performUpdate();
    }, [pollingInterval, pauseOnInactive]);

    /**
     * Detiene el polling
     */
    const stopPolling = useCallback(() => {
        if (pollingInterval_ref.current) {
            clearInterval(pollingInterval_ref.current);
            pollingInterval_ref.current = null;
            setIsPolling(false);
            //console.log('🛑 Polling detenido');
        }
    }, []);

    /**
     * Reinicia el polling
     */
    const restartPolling = useCallback(() => {
        stopPolling();
        if (enablePolling && config.autoRefresh) {
            setTimeout(startPolling, 1000);
        }
    }, [stopPolling, startPolling, enablePolling, config.autoRefresh]);

    // ====================================
    // WEBSOCKET MANAGEMENT
    // ====================================

    /**
     * Conecta WebSocket
     */
    const connectWebSocket = useCallback(() => {
        if (!enableWebSocket || !websocketUrl || websocket.current) return;

        try {
            setConnectionStatus('connecting');
            websocket.current = new WebSocket(websocketUrl);

            websocket.current.onopen = () => {
                //console.log('🔌 WebSocket conectado');
                setConnectionStatus('connected');
                setError(null);
                setRetryCount(0);
            };

            websocket.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleWebSocketMessage(data);
                } catch (err) {
                    console.error('Error procesando mensaje WebSocket:', err);
                }
            };

            websocket.current.onclose = (event) => {
                //console.log('🔌 WebSocket desconectado:', event.code, event.reason);
                setConnectionStatus('disconnected');
                websocket.current = null;

                // Intentar reconectar si no fue cerrado intencionalmente
                if (event.code !== 1000 && retryCount < retryAttempts && isComponentMounted.current) {
                    setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                        connectWebSocket();
                    }, retryDelay);
                }
            };

            websocket.current.onerror = (error) => {
                console.error('Error WebSocket:', error);
                setError('Error de conexión WebSocket');
                setConnectionStatus('error');
            };

        } catch (err) {
            console.error('Error conectando WebSocket:', err);
            setError(err.message);
            setConnectionStatus('error');
        }
    }, [enableWebSocket, websocketUrl, retryCount, retryAttempts, retryDelay]);

    /**
     * Desconecta WebSocket
     */
    const disconnectWebSocket = useCallback(() => {
        if (websocket.current) {
            websocket.current.close(1000, 'Desconexión intencional');
            websocket.current = null;
            setConnectionStatus('disconnected');
        }
    }, []);

    /**
     * Maneja mensajes recibidos por WebSocket
     */
    const handleWebSocketMessage = useCallback((data) => {
        const { type, payload } = data;

        switch (type) {
            case 'notification':
                simulateNewNotification();
                break;

            case 'message':
                simulateNewMessage();
                break;

            case 'update':
                if (payload?.component === 'header') {
                    performUpdate();
                }
                break;

            case 'ping':
                // Responder al ping para mantener conexión viva
                if (websocket.current?.readyState === WebSocket.OPEN) {
                    websocket.current.send(JSON.stringify({ type: 'pong' }));
                }
                break;

            default:
            //console.log('Mensaje WebSocket no manejado:', type, payload);
        }
    }, [simulateNewNotification, simulateNewMessage]);

    // ====================================
    // UPDATE LOGIC
    // ====================================

    /**
     * Realiza una actualización de datos
     */
    const performUpdate = useCallback(async () => {
        if (!isComponentMounted.current) return;

        try {
            setError(null);

            // Simular actualización de datos (en producción, harías fetch a API)
            const shouldAddNotification = Math.random() > 0.85; // 15% probabilidad
            const shouldAddMessage = Math.random() > 0.9; // 10% probabilidad

            if (shouldAddNotification) {
                simulateNewNotification();
            }

            if (shouldAddMessage) {
                simulateNewMessage();
            }

            // Actualizar timestamp
            const now = new Date();
            setLastUpdate(now);
            updateStoreLastUpdate();

            //console.log('🔄 Actualización completada:', now.toLocaleTimeString());

        } catch (err) {
            console.error('Error en actualización:', err);
            setError(err.message);
        }
    }, [simulateNewNotification, simulateNewMessage, updateStoreLastUpdate]);

    /**
     * Fuerza una actualización manual
     */
    const forceUpdate = useCallback(() => {
        //console.log('🔄 Forzando actualización manual');
        performUpdate();
    }, [performUpdate]);

    /**
     * Actualización en lote para optimizar rendimiento
     */
    const batchUpdate = useCallback((updates = []) => {
        if (!isComponentMounted.current || updates.length === 0) return;

        //console.log(`🔄 Ejecutando ${updates.length} actualizaciones en lote`);

        updates.forEach(update => {
            switch (update.type) {
                case 'notification':
                    simulateNewNotification();
                    break;
                case 'message':
                    simulateNewMessage();
                    break;
                default:
                //console.warn('Tipo de actualización no reconocido:', update.type);
            }
        });

        setLastUpdate(new Date());
        updateStoreLastUpdate();
    }, [simulateNewNotification, simulateNewMessage, updateStoreLastUpdate]);

    // ====================================
    // CONNECTION MONITORING
    // ====================================

    /**
     * Verifica el estado de la conexión
     */
    const checkConnectionHealth = useCallback(() => {
        const isHealthy = {
            polling: isPolling && enablePolling,
            websocket: !enableWebSocket || connectionStatus === 'connected',
            overall: true
        };

        isHealthy.overall = isHealthy.polling || isHealthy.websocket;

        return isHealthy;
    }, [isPolling, enablePolling, enableWebSocket, connectionStatus]);

    /**
     * Obtiene estadísticas de conexión
     */
    const getConnectionStats = useCallback(() => {
        return {
            status: connectionStatus,
            isPolling,
            lastUpdate,
            retryCount,
            error,
            uptime: lastUpdate ? Date.now() - lastUpdate.getTime() : 0,
            health: checkConnectionHealth()
        };
    }, [connectionStatus, isPolling, lastUpdate, retryCount, error, checkConnectionHealth]);

    // ====================================
    // EFFECTS
    // ====================================

    // Inicialización
    useEffect(() => {
        isComponentMounted.current = true;

        // Iniciar según configuración
        if (enablePolling && config.autoRefresh) {
            startPolling();
        }

        if (enableWebSocket && websocketUrl) {
            connectWebSocket();
        }

        return () => {
            isComponentMounted.current = false;
        };
    }, [enablePolling, config.autoRefresh, enableWebSocket, websocketUrl, startPolling, connectWebSocket]);

    // Event listeners para visibilidad
    useEffect(() => {
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleWindowFocus);
        window.addEventListener('blur', handleWindowBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleWindowFocus);
            window.removeEventListener('blur', handleWindowBlur);
        };
    }, [handleVisibilityChange, handleWindowFocus, handleWindowBlur]);

    // Cleanup al desmontar
    useEffect(() => {
        return () => {
            stopPolling();
            disconnectWebSocket();
        };
    }, [stopPolling, disconnectWebSocket]);

    // Reiniciar cuando cambia la configuración
    useEffect(() => {
        if (config.autoRefresh && enablePolling && !isPolling) {
            startPolling();
        } else if (!config.autoRefresh && isPolling) {
            stopPolling();
        }
    }, [config.autoRefresh, enablePolling, isPolling, startPolling, stopPolling]);

    // ====================================
    // DEBUGGING
    // ====================================

    const debugRealTimeUpdates = useCallback(() => {
        //console.log('🔄 Real Time Updates Debug:', {
        //  polling: { enabled: enablePolling, active: isPolling, interval: pollingInterval },
        //  websocket: { enabled: enableWebSocket, status: connectionStatus, url: websocketUrl },
        //  connection: getConnectionStats(),
        //  window: { active: isWindowActive.current, pauseOnInactive },
        //  lastUpdate: lastUpdate?.toISOString()
        //});
    }, [enablePolling, isPolling, pollingInterval, enableWebSocket, connectionStatus,
        websocketUrl, getConnectionStats, pauseOnInactive, lastUpdate]);

    // ====================================
    // PUBLIC API
    // ====================================

    return {
        // Estados
        connectionStatus,
        isPolling,
        lastUpdate,
        error,
        retryCount,
        isConnected: connectionStatus === 'connected' || isPolling,

        // Polling controls
        startPolling,
        stopPolling,
        restartPolling,

        // WebSocket controls
        connectWebSocket,
        disconnectWebSocket,

        // Update controls
        performUpdate,
        forceUpdate,
        batchUpdate,

        // Monitoring
        checkConnectionHealth,
        getConnectionStats,

        // Utilities
        isWindowActive: isWindowActive.current,

        // Debugging
        debugRealTimeUpdates
    };
};

export default useRealTimeUpdates;