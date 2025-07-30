// ====================================
// HEADER STORE - ZUSTAND
// Manejo completo de dropdowns, notificaciones y funcionalidades del header
// ====================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ====================================
// DATOS INICIALES Y CONFIGURACIÓN
// ====================================

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    type: 'warning',
    icon: '⚠️',
    title: 'Stock Crítico Detectado',
    message: 'El producto "Teclado Mecánico" tiene solo 3 unidades en stock.',
    time: 'Hace 5 min',
    status: 'urgent',
    unread: true,
    timestamp: Date.now() - 5 * 60 * 1000
  },
  {
    id: 2,
    type: 'danger',
    icon: '💰',
    title: 'Cliente Excedió Límite',
    message: 'Empresa ABC ha superado su límite de crédito autorizado.',
    time: 'Hace 15 min',
    status: 'urgent',
    unread: true,
    timestamp: Date.now() - 15 * 60 * 1000
  },
  {
    id: 3,
    type: 'info',
    icon: '📊',
    title: 'Reporte Mensual Listo',
    message: 'El reporte de ventas de diciembre está disponible para descargar.',
    time: 'Hace 2 horas',
    status: 'normal',
    unread: false,
    timestamp: Date.now() - 2 * 60 * 60 * 1000
  },
  {
    id: 4,
    type: 'system',
    icon: '🔄',
    title: 'Actualización del Sistema',
    message: 'Nueva versión 2.1.1 disponible con mejoras de seguridad.',
    time: 'Ayer',
    status: 'low',
    unread: false,
    timestamp: Date.now() - 24 * 60 * 60 * 1000
  }
];

const INITIAL_MESSAGES = [
  {
    id: 1,
    sender: 'María García',
    avatar: 'MG',
    message: '¿Podrías revisar el inventario de la bodega norte? Creo que hay discrepancias...',
    time: 'Hace 10 min',
    status: 'normal',
    unread: true,
    timestamp: Date.now() - 10 * 60 * 1000
  },
  {
    id: 2,
    sender: 'Carlos López',
    avatar: 'CL',
    message: 'El cliente Empresa XYZ está solicitando una cotización urgente para 500 unidades.',
    time: 'Hace 30 min',
    status: 'urgent',
    unread: true,
    timestamp: Date.now() - 30 * 60 * 1000
  },
  {
    id: 3,
    sender: 'Ana Rodríguez',
    avatar: 'AR',
    message: 'He completado el cierre de caja. Todo cuadra perfecto.',
    time: 'Hace 1 hora',
    status: 'normal',
    unread: true,
    timestamp: Date.now() - 60 * 60 * 1000
  }
];

const INITIAL_CONFIG = {
  notifications: true,
  sounds: false,
  autosave: true,
  theme: 'light',
  autoRefresh: true,
  compactMode: false
};

// ====================================
// STORE PRINCIPAL
// ====================================

export const useHeaderStore = create()(
  devtools(
    persist(
      immer((set, get) => ({
        // ================================
        // ESTADO PRINCIPAL
        // ================================
        
        // Dropdowns
        activeDropdown: null,
        dropdownHistory: [],
        
        // Notificaciones
        notifications: INITIAL_NOTIFICATIONS,
        unreadNotifications: INITIAL_NOTIFICATIONS.filter(n => n.unread).length,
        
        // Mensajes
        messages: INITIAL_MESSAGES,
        unreadMessages: INITIAL_MESSAGES.filter(m => m.unread).length,
        
        // Configuración
        config: INITIAL_CONFIG,
        
        // Search
        searchQuery: '',
        searchHistory: [],
        searchSuggestions: [],
        
        // UI State
        isLoading: false,
        lastUpdate: Date.now(),
        
        // ================================
        // ACCIONES DE DROPDOWNS
        // ================================
        
        openDropdown: (dropdownId) => set((state) => {
          // Agregar a historial si es diferente
          if (state.activeDropdown !== dropdownId) {
            state.dropdownHistory.push(state.activeDropdown);
            if (state.dropdownHistory.length > 5) {
              state.dropdownHistory.shift();
            }
          }
          
          state.activeDropdown = dropdownId;
          
          // Log para debugging
          console.log(`🔽 Dropdown abierto: ${dropdownId}`);
        }),
        
        closeDropdown: () => set((state) => {
          const previousDropdown = state.activeDropdown;
          state.activeDropdown = null;
          
          if (previousDropdown) {
            console.log(`🔼 Dropdown cerrado: ${previousDropdown}`);
          }
        }),
        
        toggleDropdown: (dropdownId) => set((state) => {
          if (state.activeDropdown === dropdownId) {
            state.activeDropdown = null;
            console.log(`🔼 Dropdown cerrado: ${dropdownId}`);
          } else {
            // Agregar a historial
            if (state.activeDropdown) {
              state.dropdownHistory.push(state.activeDropdown);
              if (state.dropdownHistory.length > 5) {
                state.dropdownHistory.shift();
              }
            }
            
            state.activeDropdown = dropdownId;
            console.log(`🔽 Dropdown abierto: ${dropdownId}`);
          }
        }),
        
        closeAllDropdowns: () => set((state) => {
          state.activeDropdown = null;
          console.log('🔼 Todos los dropdowns cerrados');
        }),
        
        // ================================
        // ACCIONES DE NOTIFICACIONES
        // ================================
        
        addNotification: (notification) => set((state) => {
          const newNotification = {
            ...notification,
            id: Date.now() + Math.random(),
            timestamp: Date.now(),
            unread: true,
            time: 'Ahora'
          };
          
          // Agregar al inicio
          state.notifications.unshift(newNotification);
          
          // Mantener máximo 50 notificaciones
          if (state.notifications.length > 50) {
            state.notifications = state.notifications.slice(0, 50);
          }
          
          // Actualizar contadores
          state.unreadNotifications = state.notifications.filter(n => n.unread).length;
          state.lastUpdate = Date.now();
          
          console.log('🔔 Nueva notificación agregada:', newNotification.title);
        }),
        
        markNotificationRead: (notificationId) => set((state) => {
          const notification = state.notifications.find(n => n.id === notificationId);
          if (notification && notification.unread) {
            notification.unread = false;
            state.unreadNotifications = state.notifications.filter(n => n.unread).length;
            
            console.log(`✅ Notificación marcada como leída: ${notification.title}`);
          }
        }),
        
        markAllNotificationsRead: () => set((state) => {
          const unreadCount = state.notifications.filter(n => n.unread).length;
          
          state.notifications.forEach(notification => {
            notification.unread = false;
          });
          
          state.unreadNotifications = 0;
          
          console.log(`✅ ${unreadCount} notificaciones marcadas como leídas`);
        }),
        
        removeNotification: (notificationId) => set((state) => {
          const index = state.notifications.findIndex(n => n.id === notificationId);
          if (index > -1) {
            const removed = state.notifications.splice(index, 1)[0];
            state.unreadNotifications = state.notifications.filter(n => n.unread).length;
            
            console.log(`🗑️ Notificación eliminada: ${removed.title}`);
          }
        }),
        
        clearAllNotifications: () => set((state) => {
          const count = state.notifications.length;
          state.notifications = [];
          state.unreadNotifications = 0;
          
          console.log(`🗑️ ${count} notificaciones eliminadas`);
        }),
        
        // ================================
        // ACCIONES DE MENSAJES
        // ================================
        
        addMessage: (message) => set((state) => {
          const newMessage = {
            ...message,
            id: Date.now() + Math.random(),
            timestamp: Date.now(),
            unread: true,
            time: 'Ahora'
          };
          
          // Agregar al inicio
          state.messages.unshift(newMessage);
          
          // Mantener máximo 30 mensajes
          if (state.messages.length > 30) {
            state.messages = state.messages.slice(0, 30);
          }
          
          // Actualizar contadores
          state.unreadMessages = state.messages.filter(m => m.unread).length;
          state.lastUpdate = Date.now();
          
          console.log('💬 Nuevo mensaje agregado de:', newMessage.sender);
        }),
        
        markMessageRead: (messageId) => set((state) => {
          const message = state.messages.find(m => m.id === messageId);
          if (message && message.unread) {
            message.unread = false;
            state.unreadMessages = state.messages.filter(m => m.unread).length;
            
            console.log(`✅ Mensaje marcado como leído de: ${message.sender}`);
          }
        }),
        
        markAllMessagesRead: () => set((state) => {
          const unreadCount = state.messages.filter(m => m.unread).length;
          
          state.messages.forEach(message => {
            message.unread = false;
          });
          
          state.unreadMessages = 0;
          
          console.log(`✅ ${unreadCount} mensajes marcados como leídos`);
        }),
        
        removeMessage: (messageId) => set((state) => {
          const index = state.messages.findIndex(m => m.id === messageId);
          if (index > -1) {
            const removed = state.messages.splice(index, 1)[0];
            state.unreadMessages = state.messages.filter(m => m.unread).length;
            
            console.log(`🗑️ Mensaje eliminado de: ${removed.sender}`);
          }
        }),
        
        // ================================
        // ACCIONES DE CONFIGURACIÓN
        // ================================
        
        updateConfig: (key, value) => set((state) => {
          state.config[key] = value;
          console.log(`⚙️ Configuración actualizada: ${key} = ${value}`);
        }),
        
        toggleConfig: (key) => set((state) => {
          state.config[key] = !state.config[key];
          console.log(`⚙️ Configuración toggled: ${key} = ${state.config[key]}`);
        }),
        
        resetConfig: () => set((state) => {
          state.config = { ...INITIAL_CONFIG };
          console.log('⚙️ Configuración restablecida');
        }),
        
        // ================================
        // ACCIONES DE BÚSQUEDA
        // ================================
        
        setSearchQuery: (query) => set((state) => {
          state.searchQuery = query;
          
          // Agregar a historial si es nueva y no está vacía
          if (query && !state.searchHistory.includes(query)) {
            state.searchHistory.unshift(query);
            
            // Mantener máximo 10 búsquedas
            if (state.searchHistory.length > 10) {
              state.searchHistory.pop();
            }
          }
        }),
        
        clearSearch: () => set((state) => {
          state.searchQuery = '';
          state.searchSuggestions = [];
        }),
        
        clearSearchHistory: () => set((state) => {
          state.searchHistory = [];
          console.log('🔍 Historial de búsqueda limpiado');
        }),
        
        // ================================
        // SIMULADORES DE DATOS EN TIEMPO REAL
        // ================================
        
        simulateNewNotification: () => {
          const notifications = [
            {
              type: 'warning',
              icon: '⚠️',
              title: 'Stock Bajo Detectado',
              message: 'El producto "Cable USB" tiene solo 5 unidades restantes.',
              status: 'urgent'
            },
            {
              type: 'success',
              icon: '💰',
              title: 'Pago Recibido',
              message: 'Cliente XYZ ha realizado un pago de $25,000.',
              status: 'normal'
            },
            {
              type: 'info',
              icon: '📦',
              title: 'Nueva Orden',
              message: 'Se ha registrado una nueva orden de compra #12345.',
              status: 'normal'
            },
            {
              type: 'system',
              icon: '🔄',
              title: 'Sincronización Completa',
              message: 'Datos sincronizados correctamente con el servidor.',
              status: 'low'
            }
          ];
          
          const randomNotification = notifications[Math.floor(Math.random() * notifications.length)];
          get().addNotification(randomNotification);
        },
        
        simulateNewMessage: () => {
          const messages = [
            {
              sender: 'Luis Morales',
              avatar: 'LM',
              message: 'El inventario de la bodega sur está listo para revisión.',
              status: 'normal'
            },
            {
              sender: 'Patricia Silva',
              avatar: 'PS',
              message: '¿Podemos programar una reunión para revisar las ventas?',
              status: 'normal'
            },
            {
              sender: 'Roberto Vargas',
              avatar: 'RV',
              message: 'Necesito autorización para el descuento especial del cliente VIP.',
              status: 'urgent'
            },
            {
              sender: 'Sofia Martinez',
              avatar: 'SM',
              message: 'Los reportes del mes están listos para tu revisión.',
              status: 'normal'
            }
          ];
          
          const randomMessage = messages[Math.floor(Math.random() * messages.length)];
          get().addMessage(randomMessage);
        },
        
        // ================================
        // UTILIDADES Y HELPERS
        // ================================
        
        getNotificationsByType: (type) => {
          return get().notifications.filter(notification => notification.type === type);
        },
        
        getUnreadNotificationsByType: (type) => {
          return get().notifications.filter(notification => 
            notification.type === type && notification.unread
          );
        },
        
        getMessagesBySender: (sender) => {
          return get().messages.filter(message => message.sender === sender);
        },
        
        getUnreadMessages: () => {
          return get().messages.filter(message => message.unread);
        },
        
        getRecentActivity: (hours = 24) => {
          const cutoff = Date.now() - (hours * 60 * 60 * 1000);
          
          const recentNotifications = get().notifications
            .filter(n => n.timestamp > cutoff)
            .map(n => ({ ...n, type: 'notification' }));
            
          const recentMessages = get().messages
            .filter(m => m.timestamp > cutoff)
            .map(m => ({ ...m, type: 'message' }));
          
          return [...recentNotifications, ...recentMessages]
            .sort((a, b) => b.timestamp - a.timestamp);
        },
        
        // ================================
        // ACCIONES DE SISTEMA
        // ================================
        
        setLoading: (isLoading) => set((state) => {
          state.isLoading = isLoading;
        }),
        
        updateLastUpdate: () => set((state) => {
          state.lastUpdate = Date.now();
        }),
        
        // ================================
        // RESET Y LIMPIEZA
        // ================================
        
        reset: () => set((state) => {
          state.activeDropdown = null;
          state.dropdownHistory = [];
          state.notifications = [...INITIAL_NOTIFICATIONS];
          state.unreadNotifications = INITIAL_NOTIFICATIONS.filter(n => n.unread).length;
          state.messages = [...INITIAL_MESSAGES];
          state.unreadMessages = INITIAL_MESSAGES.filter(m => m.unread).length;
          state.config = { ...INITIAL_CONFIG };
          state.searchQuery = '';
          state.searchHistory = [];
          state.searchSuggestions = [];
          state.isLoading = false;
          state.lastUpdate = Date.now();
          
          console.log('🔄 Header store restablecido');
        }),
        
        // ================================
        // DEBUGGING Y DESARROLLO
        // ================================
        
        getState: () => {
          const state = get();
          return {
            activeDropdown: state.activeDropdown,
            notificationsCount: state.notifications.length,
            unreadNotifications: state.unreadNotifications,
            messagesCount: state.messages.length,
            unreadMessages: state.unreadMessages,
            config: state.config,
            lastUpdate: new Date(state.lastUpdate).toLocaleString()
          };
        },
        
        logState: () => {
          console.log('📊 Header Store State:', get().getState());
        }
      })),
      {
        name: 'header-store',
        partialize: (state) => ({
          config: state.config,
          searchHistory: state.searchHistory,
          // Persistir solo configuración y historial, no notificaciones temporales
        }),
      }
    ),
    {
      name: 'header-store',
    }
  )
);

// ====================================
// HOOKS ESPECÍFICOS PARA COMPONENTES
// ====================================

// Hook para dropdowns
export const useDropdowns = () => {
  const {
    activeDropdown,
    openDropdown,
    closeDropdown,
    toggleDropdown,
    closeAllDropdowns
  } = useHeaderStore();
  
  return {
    activeDropdown,
    openDropdown,
    closeDropdown,
    toggleDropdown,
    closeAllDropdowns,
    isOpen: (dropdownId) => activeDropdown === dropdownId
  };
};

// Hook para notificaciones
export const useNotifications = () => {
  const {
    notifications,
    unreadNotifications,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    removeNotification,
    clearAllNotifications,
    simulateNewNotification
  } = useHeaderStore();
  
  return {
    notifications,
    unreadNotifications,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    removeNotification,
    clearAllNotifications,
    simulateNewNotification,
    hasUnread: unreadNotifications > 0
  };
};

// Hook para mensajes
export const useMessages = () => {
  const {
    messages,
    unreadMessages,
    addMessage,
    markMessageRead,
    markAllMessagesRead,
    removeMessage,
    simulateNewMessage
  } = useHeaderStore();
  
  return {
    messages,
    unreadMessages,
    addMessage,
    markMessageRead,
    markAllMessagesRead,
    removeMessage,
    simulateNewMessage,
    hasUnread: unreadMessages > 0
  };
};

// Hook para configuración
export const useHeaderConfig = () => {
  const {
    config,
    updateConfig,
    toggleConfig,
    resetConfig
  } = useHeaderStore();
  
  return {
    config,
    updateConfig,
    toggleConfig,
    resetConfig,
    isEnabled: (key) => config[key]
  };
};

// Hook para búsqueda
export const useHeaderSearch = () => {
  const {
    searchQuery,
    searchHistory,
    searchSuggestions,
    setSearchQuery,
    clearSearch,
    clearSearchHistory
  } = useHeaderStore();
  
  return {
    searchQuery,
    searchHistory,
    searchSuggestions,
    setSearchQuery,
    clearSearch,
    clearSearchHistory,
    hasQuery: searchQuery.length > 0,
    hasHistory: searchHistory.length > 0
  };
};

// ====================================
// SIMULADOR AUTOMÁTICO PARA DEMO
// ====================================

export const startHeaderSimulation = () => {
  // Simular notificaciones cada 30 segundos
  const notificationInterval = setInterval(() => {
    if (Math.random() > 0.7) { // 30% probabilidad
      useHeaderStore.getState().simulateNewNotification();
    }
  }, 30000);
  
  // Simular mensajes cada 45 segundos
  const messageInterval = setInterval(() => {
    if (Math.random() > 0.8) { // 20% probabilidad
      useHeaderStore.getState().simulateNewMessage();
    }
  }, 45000);
  
  // Retornar función de limpieza
  return () => {
    clearInterval(notificationInterval);
    clearInterval(messageInterval);
  };
};

export default useHeaderStore;