// ====================================
// HEADER STORE - ZUSTAND STATE MANAGEMENT
// ====================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ====================================
// CONFIGURACIÓN Y CONSTANTES
// ====================================

const DROPDOWN_TYPES = {
  NOTIFICATIONS: 'notifications',
  MESSAGES: 'messages',
  SETTINGS: 'settings',
  USER_PROFILE: 'userProfile'
};

const NOTIFICATION_TYPES = {
  STOCK_ALERT: 'stock_alert',
  CREDIT_LIMIT: 'credit_limit',
  REPORT_READY: 'report_ready',
  SYSTEM_UPDATE: 'system_update',
  PAYMENT_RECEIVED: 'payment_received',
  ORDER_PENDING: 'order_pending',
  BACKUP_COMPLETED: 'backup_completed',
  USER_LOGIN: 'user_login'
};

const MESSAGE_TYPES = {
  WORK: 'work',
  INFO: 'info',
  SYSTEM: 'system',
  APPROVAL: 'approval',
  REPORT: 'report',
  REMINDER: 'reminder'
};

const PRIORITY_LEVELS = {
  URGENT: 'urgent',
  NORMAL: 'normal',
  LOW: 'low'
};

// Datos iniciales mock
const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif_001',
    type: 'stock_alert',
    priority: 'urgent',
    title: 'Stock Crítico Detectado',
    message: 'El producto "Teclado Mecánico RGB" tiene solo 3 unidades en stock.',
    icon: '⚠️',
    category: 'inventory',
    timestamp: Date.now() - (5 * 60 * 1000), // 5 min ago
    read: false,
    actions: [
      { id: 'view_product', label: 'Ver Producto', type: 'primary', url: '/inventory/products/PROD_001' },
      { id: 'order_stock', label: 'Ordenar Stock', type: 'secondary', action: 'open_order_modal' }
    ]
  },
  {
    id: 'notif_002',
    type: 'payment_received',
    priority: 'normal',
    title: 'Pago Recibido',
    message: 'Cliente XYZ Ltda. ha realizado un pago de $125,000.',
    icon: '💳',
    category: 'finance',
    timestamp: Date.now() - (30 * 60 * 1000), // 30 min ago
    read: false,
    actions: [
      { id: 'view_payment', label: 'Ver Pago', type: 'primary', url: '/finance/payments/001' }
    ]
  }
];

const INITIAL_MESSAGES = [
  {
    id: 'msg_001',
    sender: {
      id: 'USR_002',
      name: 'María García',
      avatar: 'MG',
      role: 'Supervisora de Inventario',
      department: 'Logística',
      status: 'online'
    },
    subject: 'Discrepancias en Inventario - Bodega Norte',
    preview: '¿Podrías revisar el inventario de la bodega norte? Creo que hay discrepancias...',
    timestamp: Date.now() - (10 * 60 * 1000), // 10 min ago
    read: false,
    priority: 'normal',
    type: 'work',
    attachments: [],
    reply_count: 0
  },
  {
    id: 'msg_002',
    sender: {
      id: 'USR_003',
      name: 'Carlos López',
      avatar: 'CL',
      role: 'Ejecutivo de Ventas',
      department: 'Ventas',
      status: 'online'
    },
    subject: 'Cotización Urgente - Empresa XYZ',
    preview: 'El cliente Empresa XYZ está solicitando una cotización urgente para 500 unidades...',
    timestamp: Date.now() - (25 * 60 * 1000), // 25 min ago
    read: false,
    priority: 'urgent',
    type: 'work',
    attachments: [],
    reply_count: 0
  }
];

// ====================================
// STORE PRINCIPAL
// ====================================

export const useHeaderStore = create(
  devtools(
    persist(
      (set, get) => ({
        // ================================
        // ESTADO INICIAL
        // ================================

        // Dropdowns
        activeDropdown: null,
        dropdownHistory: [],

        // Notificaciones
        notifications: INITIAL_NOTIFICATIONS,
        notificationsMetadata: {
          total_count: INITIAL_NOTIFICATIONS.length,
          unread_count: INITIAL_NOTIFICATIONS.filter(n => !n.read).length,
          last_update: new Date().toISOString()
        },
        notificationsSettings: {
          auto_refresh_interval: 30000,
          max_notifications: 50,
          show_read_notifications: true,
          sound_enabled: true,
          desktop_notifications: true
        },

        // Mensajes
        messages: INITIAL_MESSAGES,
        messagesMetadata: {
          total_count: INITIAL_MESSAGES.length,
          unread_count: INITIAL_MESSAGES.filter(m => !m.read).length,
          last_update: new Date().toISOString()
        },
        messagesSettings: {
          auto_refresh_interval: 45000,
          max_messages: 100,
          show_read_messages: true,
          sound_enabled: true,
          desktop_notifications: true
        },

        // Usuario
        user: {
          id: 'USR_001',
          username: 'admin',
          email: 'admin@sistema-inventario.cl',
          profile: {
            first_name: 'Juan',
            last_name: 'Díaz',
            full_name: 'Juan Díaz',
            display_name: 'Juan D.',
            avatar: 'JD',
            avatar_url: null
          },
          role: {
            id: 'ROLE_001',
            name: 'Administrador',
            level: 'admin'
          },
          status: {
            online: true,
            availability: 'available',
            last_seen: new Date().toISOString()
          }
        },
        company: {
          id: 'COMP_001',
          name: 'Sistema de Inventario y Punto de Venta',
          short_name: 'SIPV'
        },
        currentSession: {
          id: 'SESS_001',
          login_time: new Date().toISOString(),
          last_activity: new Date().toISOString()
        },
        quickActions: [
          { id: 'new_sale', label: 'Nueva Venta', icon: '💰', url: '/pos/new-sale' },
          { id: 'search_product', label: 'Buscar Producto', icon: '🔍', url: '/inventory/search' }
        ],
        recentActivity: [],

        // Búsqueda
        searchQuery: '',
        searchHistory: [],
        searchSuggestions: [],
        searchResults: [],
        isSearching: false,

        // Configuración general
        config: {
          autoRefresh: true,
          refreshInterval: 30000,
          soundEnabled: true,
          desktopNotifications: true,
          theme: 'light',
          compactMode: false,
          showReadItems: true
        },

        // UI State
        isLoading: false,
        lastUpdate: Date.now(),

        // ================================
        // ACCIONES DE DROPDOWNS
        // ================================

        openDropdown: (dropdownId) => set((state) => {
          const newHistory = state.activeDropdown && state.activeDropdown !== dropdownId
            ? [state.activeDropdown, ...state.dropdownHistory.slice(0, 4)]
            : state.dropdownHistory;

          return {
            activeDropdown: dropdownId,
            dropdownHistory: newHistory
          };
        }),

        closeDropdown: () => set(() => ({
          activeDropdown: null
        })),

        toggleDropdown: (dropdownId) => {
          const current = get().activeDropdown;
          if (current === dropdownId) {
            get().closeDropdown();
          } else {
            get().openDropdown(dropdownId);
          }
        },

        closeAllDropdowns: () => set(() => ({
          activeDropdown: null,
          dropdownHistory: []
        })),

        // ================================
        // ACCIONES DE NOTIFICACIONES
        // ================================

        addNotification: (notification) => set((state) => {
          const newNotification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            read: false,
            priority: 'normal',
            type: 'info',
            ...notification
          };

          const newNotifications = [newNotification, ...state.notifications];
          const unreadCount = newNotifications.filter(n => !n.read).length;

          return {
            notifications: newNotifications,
            notificationsMetadata: {
              ...state.notificationsMetadata,
              total_count: newNotifications.length,
              unread_count: unreadCount,
              last_update: new Date().toISOString()
            }
          };
        }),

        markNotificationRead: (notificationId) => set((state) => {
          const notifications = state.notifications.map(notification =>
            notification.id === notificationId
              ? { ...notification, read: true }
              : notification
          );

          const unreadCount = notifications.filter(n => !n.read).length;

          return {
            notifications,
            notificationsMetadata: {
              ...state.notificationsMetadata,
              unread_count: unreadCount
            }
          };
        }),

        markAllNotificationsRead: () => set((state) => {
          const notifications = state.notifications.map(notification => ({
            ...notification,
            read: true
          }));

          return {
            notifications,
            notificationsMetadata: {
              ...state.notificationsMetadata,
              unread_count: 0
            }
          };
        }),

        removeNotification: (notificationId) => set((state) => {
          const notifications = state.notifications.filter(n => n.id !== notificationId);

          return {
            notifications,
            notificationsMetadata: {
              ...state.notificationsMetadata,
              total_count: notifications.length,
              unread_count: notifications.filter(n => !n.read).length
            }
          };
        }),

        clearAllNotifications: () => set((state) => ({
          notifications: [],
          notificationsMetadata: {
            ...state.notificationsMetadata,
            total_count: 0,
            unread_count: 0
          }
        })),

        // ================================
        // ACCIONES DE MENSAJES
        // ================================

        addMessage: (message) => set((state) => {
          const newMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            read: false,
            priority: 'normal',
            type: 'work',
            attachments: [],
            reply_count: 0,
            ...message
          };

          const newMessages = [newMessage, ...state.messages];
          const unreadCount = newMessages.filter(m => !m.read).length;

          return {
            messages: newMessages,
            messagesMetadata: {
              ...state.messagesMetadata,
              total_count: newMessages.length,
              unread_count: unreadCount,
              last_update: new Date().toISOString()
            }
          };
        }),

        markMessageRead: (messageId) => set((state) => {
          const messages = state.messages.map(message =>
            message.id === messageId
              ? { ...message, read: true }
              : message
          );

          const unreadCount = messages.filter(m => !m.read).length;

          return {
            messages,
            messagesMetadata: {
              ...state.messagesMetadata,
              unread_count: unreadCount
            }
          };
        }),

        markAllMessagesRead: () => set((state) => {
          const messages = state.messages.map(message => ({
            ...message,
            read: true
          }));

          return {
            messages,
            messagesMetadata: {
              ...state.messagesMetadata,
              unread_count: 0
            }
          };
        }),

        removeMessage: (messageId) => set((state) => {
          const messages = state.messages.filter(m => m.id !== messageId);

          return {
            messages,
            messagesMetadata: {
              ...state.messagesMetadata,
              total_count: messages.length,
              unread_count: messages.filter(m => !m.read).length
            }
          };
        }),

        replyToMessage: (messageId, replyContent) => set((state) => {
          const messages = state.messages.map(message =>
            message.id === messageId
              ? { ...message, reply_count: (message.reply_count || 0) + 1 }
              : message
          );

          return { messages };
        }),

        // ================================
        // ACCIONES DE BÚSQUEDA
        // ================================

        setSearchQuery: (query) => set((state) => {
          const updates = { searchQuery: query };

          // Agregar al historial si no está vacío
          if (query.trim() && !state.searchHistory.includes(query)) {
            updates.searchHistory = [query, ...state.searchHistory.slice(0, 9)];
          }

          return updates;
        }),

        performSearch: async (query) => {
          set({ isSearching: true, searchQuery: query });

          try {
            // Simular búsqueda
            await new Promise(resolve => setTimeout(resolve, 500));

            const mockResults = [
              { id: 1, type: 'product', title: `Producto relacionado con "${query}"`, url: '/products/1' },
              { id: 2, type: 'client', title: `Cliente que contiene "${query}"`, url: '/clients/1' },
              { id: 3, type: 'sale', title: `Venta #001 - ${query}`, url: '/sales/1' }
            ];

            set({
              searchResults: mockResults,
              isSearching: false
            });

          } catch (error) {
            console.error('Error en búsqueda:', error);
            set({
              searchResults: [],
              isSearching: false
            });
          }
        },

        clearSearch: () => set({
          searchQuery: '',
          searchResults: [],
          isSearching: false
        }),

        // ================================
        // ACCIONES DE CONFIGURACIÓN
        // ================================

        updateConfig: (newConfig) => set((state) => ({
          config: { ...state.config, ...newConfig }
        })),

        toggleConfigOption: (option) => set((state) => {
          if (state.config.hasOwnProperty(option)) {
            return {
              config: {
                ...state.config,
                [option]: !state.config[option]
              }
            };
          }
          return state;
        }),

        // ================================
        // SIMULACIÓN DE DATOS EN TIEMPO REAL
        // ================================

        simulateNewNotification: () => {
          const mockNotifications = [
            {
              type: NOTIFICATION_TYPES.STOCK_ALERT,
              priority: PRIORITY_LEVELS.URGENT,
              title: 'Stock Crítico - Mouse Inalámbrico',
              message: 'Solo quedan 2 unidades en stock.',
              icon: '⚠️',
              category: 'inventory'
            },
            {
              type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
              priority: PRIORITY_LEVELS.NORMAL,
              title: 'Pago Procesado',
              message: 'Pago de $75,000 procesado exitosamente.',
              icon: '💳',
              category: 'finance'
            },
            {
              type: NOTIFICATION_TYPES.ORDER_PENDING,
              priority: PRIORITY_LEVELS.NORMAL,
              title: 'Nueva Orden Pendiente',
              message: 'Orden #OC-2025-019 requiere aprobación.',
              icon: '📋',
              category: 'orders'
            }
          ];

          const randomNotification = mockNotifications[Math.floor(Math.random() * mockNotifications.length)];
          get().addNotification(randomNotification);
        },

        simulateNewMessage: () => {
          const mockSenders = [
            { id: 'USR_009', name: 'Patricia Morales', avatar: 'PM', role: 'Vendedora', department: 'Ventas' },
            { id: 'USR_010', name: 'Diego Castillo', avatar: 'DC', role: 'Bodeguero', department: 'Logística' },
            { id: 'USR_011', name: 'Carmen López', avatar: 'CL', role: 'Contadora', department: 'Finanzas' }
          ];

          const mockMessages = [
            'Necesito revisar el inventario de productos de temporada.',
            '¿Podemos coordinar la entrega para mañana?',
            'El cliente pregunta por descuentos en compras al por mayor.',
            'Hay un problema con la impresora de la caja 2.',
            'Los reportes de ayer están listos para revisión.'
          ];

          const randomSender = mockSenders[Math.floor(Math.random() * mockSenders.length)];
          const randomMessage = mockMessages[Math.floor(Math.random() * mockMessages.length)];

          get().addMessage({
            sender: randomSender,
            subject: randomMessage.substring(0, 30) + '...',
            preview: randomMessage,
            content: randomMessage + ' Por favor, confirma cuando puedas revisar esto.',
            priority: Math.random() > 0.7 ? PRIORITY_LEVELS.URGENT : PRIORITY_LEVELS.NORMAL,
            type: MESSAGE_TYPES.WORK
          });
        },

        // ================================
        // ACCIONES DE USUARIO
        // ================================

        updateUserPreferences: (preferences) => set((state) => ({
          user: {
            ...state.user,
            preferences: { ...state.user.preferences, ...preferences }
          }
        })),

        updateUserStatus: (status) => set((state) => ({
          user: {
            ...state.user,
            status: { ...state.user.status, ...status }
          }
        })),

        updateLastUpdate: () => set({
          lastUpdate: Date.now()
        }),

        // ================================
        // UTILIDADES Y HELPERS
        // ================================

        getUnreadCounts: () => {
          const state = get();
          return {
            notifications: state.notifications.filter(n => !n.read).length,
            messages: state.messages.filter(m => !m.read).length
          };
        },

        isDropdownOpen: (dropdownId) => {
          return get().activeDropdown === dropdownId;
        },

        getNotificationsByCategory: (category) => {
          return get().notifications.filter(n => n.category === category);
        },

        getMessagesByType: (type) => {
          return get().messages.filter(m => m.type === type);
        },

        getRecentActivity: (limit = 5) => {
          return get().recentActivity.slice(0, limit);
        },

        // ================================
        // DEBUGGING Y DESARROLLO
        // ================================

        getState: () => {
          const state = get();
          return {
            dropdowns: {
              active: state.activeDropdown,
              history: state.dropdownHistory
            },
            notifications: {
              total: state.notifications.length,
              unread: state.notifications.filter(n => !n.read).length
            },
            messages: {
              total: state.messages.length,
              unread: state.messages.filter(m => !m.read).length
            },
            search: {
              query: state.searchQuery,
              results: state.searchResults.length,
              searching: state.isSearching
            }
          };
        },

        resetStore: () => set(() => ({
          activeDropdown: null,
          dropdownHistory: [],
          searchQuery: '',
          searchResults: [],
          isSearching: false,
          notifications: [...INITIAL_NOTIFICATIONS],
          messages: [...INITIAL_MESSAGES],
          lastUpdate: Date.now()
        }))

      }),
      {
        name: 'header-store',
        partialize: (state) => ({
          config: state.config,
          searchHistory: state.searchHistory,
          user: {
            preferences: state.user.preferences
          }
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
  const store = useHeaderStore();
  return {
    activeDropdown: store.activeDropdown,
    dropdownHistory: store.dropdownHistory,
    openDropdown: store.openDropdown,
    closeDropdown: store.closeDropdown,
    toggleDropdown: store.toggleDropdown,
    closeAllDropdowns: store.closeAllDropdowns,
    isOpen: store.isDropdownOpen
  };
};

// Hook para notificaciones
export const useNotifications = () => {
  const store = useHeaderStore();
  return {
    notifications: store.notifications,
    metadata: store.notificationsMetadata,
    settings: store.notificationsSettings,
    addNotification: store.addNotification,
    markRead: store.markNotificationRead,
    markAllRead: store.markAllNotificationsRead,
    remove: store.removeNotification,
    clearAll: store.clearAllNotifications,
    simulate: store.simulateNewNotification,
    unreadCount: store.notifications.filter(n => !n.read).length,
    stats: {
      total: store.notifications.length,
      unread: store.notifications.filter(n => !n.read).length
    }
  };
};

// Hook para mensajes
export const useMessages = () => {
  const store = useHeaderStore();
  return {
    messages: store.messages,
    metadata: store.messagesMetadata,
    settings: store.messagesSettings,
    addMessage: store.addMessage,
    markRead: store.markMessageRead,
    markAllRead: store.markAllMessagesRead,
    remove: store.removeMessage,
    reply: store.replyToMessage,
    simulate: store.simulateNewMessage,
    unreadCount: store.messages.filter(m => !m.read).length
  };
};

// Hook para búsqueda
export const useSearch = () => {
  const store = useHeaderStore();
  return {
    query: store.searchQuery,
    results: store.searchResults,
    history: store.searchHistory,
    isSearching: store.isSearching,
    setQuery: store.setSearchQuery,
    performSearch: store.performSearch,
    clear: store.clearSearch
  };
};

// Hook para usuario
export const useHeaderUser = () => {
  const store = useHeaderStore();
  return {
    user: store.user,
    company: store.company,
    session: store.currentSession,
    quickActions: store.quickActions,
    recentActivity: store.recentActivity,
    updatePreferences: store.updateUserPreferences,
    updateStatus: store.updateUserStatus
  };
};

// ====================================
// CONSTANTES EXPORTADAS
// ====================================

export { DROPDOWN_TYPES, NOTIFICATION_TYPES, MESSAGE_TYPES, PRIORITY_LEVELS };

// ====================================
// EXPORT POR DEFECTO
// ====================================

export default useHeaderStore;