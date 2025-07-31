// ====================================
// FOOTER STORE - ZUSTAND
// Manejo de información de sesión, sucursal, notificaciones del sistema
// ====================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ====================================
// DATOS INICIALES Y CONFIGURACIÓN
// ====================================

const INITIAL_SESSION_INFO = {
  branch: 'Central',
  branchId: 'BR001',
  cashRegister: '#1234',
  cashRegisterId: 'CR001',
  user: 'vsoto',
  userId: 'USR001',
  userRole: 'Admin',
  shift: 'Mañana',
  shiftId: 'SH001',
  shiftStatus: 'active', // active, warning, danger
  shiftStartTime: '08:00',
  shiftEndTime: '16:00',
  sessionStartTime: Date.now(),
  lastActivity: Date.now()
};

const INITIAL_SYSTEM_STATUS = {
  apiConnection: 'connected', // connected, checking, error
  databaseStatus: 'online',   // online, slow, offline
  backupStatus: 'completed',  // completed, running, failed
  lastBackup: Date.now() - 2 * 60 * 60 * 1000, // 2 horas atrás
  systemLoad: 'normal',       // low, normal, high, critical
  activeUsers: 12,
  totalTransactions: 2547,
  todayRevenue: 125000.50
};

const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  INFO: 'info',
  SYSTEM: 'system'
};

// ====================================
// STORE PRINCIPAL
// ====================================

export const useFooterStore = create()(
  devtools(
    persist(
      immer((set, get) => ({
        // ================================
        // ESTADO PRINCIPAL
        // ================================

        // Información de sesión
        sessionInfo: { ...INITIAL_SESSION_INFO },

        // Estado del sistema
        systemStatus: { ...INITIAL_SYSTEM_STATUS },

        // Notificaciones del footer
        footerNotification: null,
        notificationQueue: [],

        // Estadísticas en tiempo real
        realtimeStats: {
          connectedUsers: 12,
          pendingTasks: 5,
          systemUptime: '99.9%',
          responseTime: '120ms'
        },

        // Configuración del footer
        footerConfig: {
          showSystemStatus: true,
          showRealtimeStats: true,
          showNotifications: true,
          autoHideNotifications: true,
          notificationDuration: 3000,
          updateInterval: 30000
        },

        // Estado UI
        isVisible: true,
        isMinimized: false,
        lastUpdate: Date.now(),

        // ================================
        // ACCIONES DE SESIÓN
        // ================================

        updateSessionInfo: (newInfo) => set((state) => {
          Object.assign(state.sessionInfo, newInfo);
          state.sessionInfo.lastActivity = Date.now();
          state.lastUpdate = Date.now();

          //console.log('👤 Información de sesión actualizada:', newInfo);
        }),

        updateBranch: (branchName, branchId = null) => set((state) => {
          state.sessionInfo.branch = branchName;
          if (branchId) state.sessionInfo.branchId = branchId;
          state.sessionInfo.lastActivity = Date.now();

          //console.log(`🏢 Sucursal actualizada: ${branchName}`);
        }),

        updateCashRegister: (cashRegister, cashRegisterId = null) => set((state) => {
          state.sessionInfo.cashRegister = cashRegister;
          if (cashRegisterId) state.sessionInfo.cashRegisterId = cashRegisterId;
          state.sessionInfo.lastActivity = Date.now();

          //console.log(`💰 Caja registradora actualizada: ${cashRegister}`);
        }),

        updateUser: (username, userId = null, role = null) => set((state) => {
          state.sessionInfo.user = username;
          if (userId) state.sessionInfo.userId = userId;
          if (role) state.sessionInfo.userRole = role;
          state.sessionInfo.lastActivity = Date.now();

          //console.log(`👤 Usuario actualizado: ${username} (${role || state.sessionInfo.userRole})`);
        }),

        updateShift: (shiftName, shiftId = null, status = 'active') => set((state) => {
          state.sessionInfo.shift = shiftName;
          if (shiftId) state.sessionInfo.shiftId = shiftId;
          state.sessionInfo.shiftStatus = status;
          state.sessionInfo.lastActivity = Date.now();

          //console.log(`🕐 Turno actualizado: ${shiftName} (${status})`);
        }),

        startNewSession: (sessionData) => set((state) => {
          state.sessionInfo = {
            ...INITIAL_SESSION_INFO,
            ...sessionData,
            sessionStartTime: Date.now(),
            lastActivity: Date.now()
          };

          //console.log('🚀 Nueva sesión iniciada:', sessionData);
        }),

        endSession: () => set((state) => {
          const sessionDuration = Date.now() - state.sessionInfo.sessionStartTime;
          //console.log(`🏁 Sesión terminada. Duración: ${Math.round(sessionDuration / 1000 / 60)} minutos`);

          // Mantener algunos datos básicos
          state.sessionInfo = {
            ...INITIAL_SESSION_INFO,
            sessionStartTime: Date.now(),
            lastActivity: Date.now()
          };
        }),

        // ================================
        // ACCIONES DE ESTADO DEL SISTEMA
        // ================================

        updateSystemStatus: (statusUpdate) => set((state) => {
          Object.assign(state.systemStatus, statusUpdate);
          state.lastUpdate = Date.now();

          //console.log('🖥️ Estado del sistema actualizado:', statusUpdate);
        }),

        setApiConnection: (status) => set((state) => {
          const previousStatus = state.systemStatus.apiConnection;
          state.systemStatus.apiConnection = status;

          if (previousStatus !== status) {
            const statusMessages = {
              connected: '✅ API conectada correctamente',
              checking: '🔄 Verificando conexión API...',
              error: '❌ Error de conexión API'
            };

            get().showNotification(statusMessages[status], status === 'error' ? 'error' : 'info');
          }
        }),

        setDatabaseStatus: (status) => set((state) => {
          const previousStatus = state.systemStatus.databaseStatus;
          state.systemStatus.databaseStatus = status;

          if (previousStatus !== status) {
            const statusMessages = {
              online: '✅ Base de datos en línea',
              slow: '⚠️ Base de datos responde lentamente',
              offline: '❌ Base de datos no disponible'
            };

            get().showNotification(statusMessages[status], status === 'offline' ? 'error' : 'warning');
          }
        }),

        updateRealtimeStats: (stats) => set((state) => {
          Object.assign(state.realtimeStats, stats);
          state.lastUpdate = Date.now();
        }),

        // ================================
        // ACCIONES DE NOTIFICACIONES
        // ================================

        showNotification: (message, type = 'info', duration = null) => set((state) => {
          const notification = {
            id: Date.now() + Math.random(),
            message,
            type,
            timestamp: Date.now(),
            duration: duration || state.footerConfig.notificationDuration
          };

          // Si hay una notificación activa, agregarla a la cola
          if (state.footerNotification) {
            state.notificationQueue.push(notification);
          } else {
            state.footerNotification = notification;
          }

          //console.log(`📢 Notificación del footer: ${message}`);
        }),

        hideNotification: () => set((state) => {
          state.footerNotification = null;

          // Mostrar siguiente notificación de la cola
          if (state.notificationQueue.length > 0) {
            state.footerNotification = state.notificationQueue.shift();
          }
        }),

        clearNotificationQueue: () => set((state) => {
          state.notificationQueue = [];
          state.footerNotification = null;

          //console.log('🗑️ Cola de notificaciones del footer limpiada');
        }),

        // ================================
        // ACCIONES DE CONFIGURACIÓN
        // ================================

        updateFooterConfig: (configUpdate) => set((state) => {
          Object.assign(state.footerConfig, configUpdate);
          //console.log('⚙️ Configuración del footer actualizada:', configUpdate);
        }),

        toggleFooterVisibility: () => set((state) => {
          state.isVisible = !state.isVisible;
          //console.log(`👁️ Footer ${state.isVisible ? 'mostrado' : 'oculto'}`);
        }),

        toggleFooterMinimized: () => set((state) => {
          state.isMinimized = !state.isMinimized;
          //console.log(`📐 Footer ${state.isMinimized ? 'minimizado' : 'expandido'}`);
        }),

        // ================================
        // ACCIONES AUTOMÁTICAS Y HELPERS
        // ================================

        updateLastActivity: () => set((state) => {
          state.sessionInfo.lastActivity = Date.now();
        }),

        getSessionDuration: () => {
          const { sessionStartTime } = get().sessionInfo;
          return Date.now() - sessionStartTime;
        },

        getFormattedSessionDuration: () => {
          const duration = get().getSessionDuration();
          const hours = Math.floor(duration / (1000 * 60 * 60));
          const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

          if (hours > 0) {
            return `${hours}h ${minutes}m`;
          }
          return `${minutes}m`;
        },

        getLastActivityTime: () => {
          const { lastActivity } = get().sessionInfo;
          const elapsed = Date.now() - lastActivity;
          const minutes = Math.floor(elapsed / (1000 * 60));

          if (minutes === 0) return 'Ahora';
          if (minutes === 1) return 'Hace 1 minuto';
          if (minutes < 60) return `Hace ${minutes} minutos`;

          const hours = Math.floor(minutes / 60);
          if (hours === 1) return 'Hace 1 hora';
          return `Hace ${hours} horas`;
        },

        // ================================
        // SIMULADORES Y DEMOS
        // ================================

        simulateSystemActivity: () => {
          const activities = [
            { type: 'info', message: '✅ Backup completado exitosamente' },
            { type: 'info', message: '📊 Reportes diarios generados' },
            { type: 'success', message: '🔄 Sincronización completada' },
            { type: 'info', message: '👥 5 usuarios conectados' },
            { type: 'success', message: '💾 Datos guardados automáticamente' }
          ];

          const randomActivity = activities[Math.floor(Math.random() * activities.length)];
          get().showNotification(randomActivity.message, randomActivity.type);
        },

        simulateShiftChange: () => {
          const shifts = [
            { name: 'Mañana', status: 'active' },
            { name: 'Tarde', status: 'active' },
            { name: 'Noche', status: 'warning' }
          ];

          const randomShift = shifts[Math.floor(Math.random() * shifts.length)];
          get().updateShift(randomShift.name, null, randomShift.status);
          get().showNotification(`🕐 Cambio de turno: ${randomShift.name}`, 'info');
        },

        simulateBranchChange: () => {
          const branches = ['Central', 'Norte', 'Sur', 'Oriente', 'Poniente'];
          const randomBranch = branches[Math.floor(Math.random() * branches.length)];

          get().updateBranch(randomBranch);
          get().showNotification(`🏢 Sucursal cambiada: ${randomBranch}`, 'info');
        },

        simulateRealtimeUpdate: () => set((state) => {
          // Simular cambios realistas en las estadísticas
          state.realtimeStats.connectedUsers = Math.max(1,
            state.realtimeStats.connectedUsers + Math.floor(Math.random() * 6) - 3
          );

          state.realtimeStats.pendingTasks = Math.max(0,
            state.realtimeStats.pendingTasks + Math.floor(Math.random() * 4) - 2
          );

          state.realtimeStats.responseTime = `${Math.floor(80 + Math.random() * 100)}ms`;

          // Actualizar estadísticas del sistema
          state.systemStatus.activeUsers = state.realtimeStats.connectedUsers;
          state.systemStatus.totalTransactions += Math.floor(Math.random() * 3);
          state.systemStatus.todayRevenue += Math.floor(Math.random() * 1000);

          state.lastUpdate = Date.now();
        }),

        // ================================
        // ACCIONES DE RESETEO Y LIMPIEZA
        // ================================

        resetSessionInfo: () => set((state) => {
          state.sessionInfo = { ...INITIAL_SESSION_INFO };
          //console.log('🔄 Información de sesión restablecida');
        }),

        resetSystemStatus: () => set((state) => {
          state.systemStatus = { ...INITIAL_SYSTEM_STATUS };
          //console.log('🔄 Estado del sistema restablecido');
        }),

        resetFooter: () => set((state) => {
          state.sessionInfo = { ...INITIAL_SESSION_INFO };
          state.systemStatus = { ...INITIAL_SYSTEM_STATUS };
          state.footerNotification = null;
          state.notificationQueue = [];
          state.realtimeStats = {
            connectedUsers: 12,
            pendingTasks: 5,
            systemUptime: '99.9%',
            responseTime: '120ms'
          };
          state.isVisible = true;
          state.isMinimized = false;
          state.lastUpdate = Date.now();

          //console.log('🔄 Footer completamente restablecido');
        }),

        // ================================
        // UTILIDADES Y ESTADO
        // ================================

        getFooterState: () => {
          const state = get();
          return {
            sessionInfo: state.sessionInfo,
            systemStatus: state.systemStatus,
            hasNotification: !!state.footerNotification,
            notificationQueue: state.notificationQueue.length,
            sessionDuration: state.getFormattedSessionDuration(),
            lastActivity: state.getLastActivityTime(),
            isVisible: state.isVisible,
            isMinimized: state.isMinimized
          };
        },

        logFooterState: () => {
          //console.log('📊 Footer Store State:', get().getFooterState());
        },

        // ================================
        // ACCIONES DE NEGOCIO ESPECÍFICAS
        // ================================

        recordTransaction: (amount, type = 'sale') => set((state) => {
          state.systemStatus.totalTransactions += 1;
          state.systemStatus.todayRevenue += amount;
          state.sessionInfo.lastActivity = Date.now();

          const message = type === 'sale'
            ? `💰 Venta registrada: $${amount.toLocaleString()}`
            : `📝 Transacción registrada: $${amount.toLocaleString()}`;

          get().showNotification(message, 'success');
        }),

        handleCashRegisterChange: (newRegister, reason = 'manual') => {
          get().updateCashRegister(newRegister);

          const reasons = {
            manual: 'Cambio manual',
            automatic: 'Cambio automático',
            maintenance: 'Mantenimiento',
            shift: 'Cambio de turno'
          };

          get().showNotification(
            `💰 ${reasons[reason] || 'Cambio'} de caja: ${newRegister}`,
            'info'
          );
        },

        handleSystemMaintenance: (message, type = 'info') => {
          get().showNotification(`🔧 Mantenimiento: ${message}`, type);

          // Simular impacto en performance durante mantenimiento
          if (type === 'warning') {
            get().updateSystemStatus({
              systemLoad: 'high',
              databaseStatus: 'slow'
            });
          }
        }
      })),
      {
        name: 'footer-store',
        partialize: (state) => ({
          sessionInfo: {
            // Persistir solo datos no sensibles
            branch: state.sessionInfo.branch,
            shift: state.sessionInfo.shift,
            userRole: state.sessionInfo.userRole
          },
          footerConfig: state.footerConfig,
          isVisible: state.isVisible,
          isMinimized: state.isMinimized
        }),
      }
    ),
    {
      name: 'footer-store',
    }
  )
);

// ====================================
// HOOKS ESPECÍFICOS PARA COMPONENTES
// ====================================

// Hook para información de sesión
export const useSessionInfo = () => {
  const {
    sessionInfo,
    updateSessionInfo,
    updateBranch,
    updateCashRegister,
    updateUser,
    updateShift,
    getSessionDuration,
    getFormattedSessionDuration,
    getLastActivityTime,
    updateLastActivity
  } = useFooterStore();

  return {
    sessionInfo,
    updateSessionInfo,
    updateBranch,
    updateCashRegister,
    updateUser,
    updateShift,
    getSessionDuration,
    getFormattedSessionDuration,
    getLastActivityTime,
    updateLastActivity
  };
};

// Hook para estado del sistema
export const useSystemStatus = () => {
  const {
    systemStatus,
    realtimeStats,
    updateSystemStatus,
    setApiConnection,
    setDatabaseStatus,
    updateRealtimeStats
  } = useFooterStore();

  return {
    systemStatus,
    realtimeStats,
    updateSystemStatus,
    setApiConnection,
    setDatabaseStatus,
    updateRealtimeStats,
    isOnline: systemStatus.apiConnection === 'connected' && systemStatus.databaseStatus === 'online'
  };
};

// Hook para notificaciones del footer
export const useFooterNotifications = () => {
  const {
    footerNotification,
    notificationQueue,
    showNotification,
    hideNotification,
    clearNotificationQueue
  } = useFooterStore();

  return {
    currentNotification: footerNotification,
    queueLength: notificationQueue.length,
    showNotification,
    hideNotification,
    clearNotificationQueue,
    hasNotification: !!footerNotification,
    hasQueue: notificationQueue.length > 0
  };
};

// Hook para configuración del footer
export const useFooterConfig = () => {
  const {
    footerConfig,
    updateFooterConfig,
    isVisible,
    isMinimized,
    toggleFooterVisibility,
    toggleFooterMinimized
  } = useFooterStore();

  return {
    config: footerConfig,
    updateConfig: updateFooterConfig,
    isVisible,
    isMinimized,
    toggleVisibility: toggleFooterVisibility,
    toggleMinimized: toggleFooterMinimized
  };
};

// ====================================
// SIMULADOR AUTOMÁTICO PARA DEMO
// ====================================

export const startFooterSimulation = () => {
  // Actualizar estadísticas en tiempo real cada 10 segundos
  const statsInterval = setInterval(() => {
    useFooterStore.getState().simulateRealtimeUpdate();
  }, 10000);

  // Simular actividad del sistema cada 45 segundos
  const activityInterval = setInterval(() => {
    if (Math.random() > 0.6) { // 40% probabilidad
      useFooterStore.getState().simulateSystemActivity();
    }
  }, 45000);

  // Simular cambios ocasionales cada 2 minutos
  const changesInterval = setInterval(() => {
    const random = Math.random();

    if (random > 0.9) {
      useFooterStore.getState().simulateShiftChange();
    } else if (random > 0.8) {
      useFooterStore.getState().simulateBranchChange();
    }
  }, 120000);

  // Actualizar actividad cada 30 segundos
  const activityUpdateInterval = setInterval(() => {
    useFooterStore.getState().updateLastActivity();
  }, 30000);

  //console.log('🎬 Simulación del footer iniciada');

  // Retornar función de limpieza
  return () => {
    clearInterval(statsInterval);
    clearInterval(activityInterval);
    clearInterval(changesInterval);
    clearInterval(activityUpdateInterval);
    //console.log('🛑 Simulación del footer detenida');
  };
};

// ====================================
// CONSTANTES EXPORTADAS
// ====================================

export { NOTIFICATION_TYPES };

export default useFooterStore;