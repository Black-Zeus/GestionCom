// ====================================
// NOTIFICATIONS DROPDOWN COMPONENT
// ====================================

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useNotifications } from '@/store/headerStore';

/**
 * Componente dropdown de notificaciones
 * Muestra lista de notificaciones con acciones y filtros
 */
function NotificationsDropdown({ isOpen, onClose }) {
  const [filter, setFilter] = useState('all');
  const [hoveredItem, setHoveredItem] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const {
    notifications,
    metadata,
    unreadCount,
    markRead,
    markAllRead,
    remove,
    simulate
  } = useNotifications();

  // ====================================
  // FILTROS Y DATOS PROCESADOS
  // ====================================

  const filterOptions = [
    { id: 'all', label: 'Todas', count: notifications.length },
    { id: 'unread', label: 'No leídas', count: unreadCount },
    { id: 'urgent', label: 'Urgentes', count: notifications.filter(n => n.priority === 'urgent').length },
    { id: 'system', label: 'Sistema', count: notifications.filter(n => n.category === 'system').length }
  ];

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'urgent':
        return notification.priority === 'urgent';
      case 'system':
        return notification.category === 'system';
      default:
        return true;
    }
  });

  // ====================================
  // EFECTOS
  // ====================================

  // Auto-scroll al abrir
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      dropdownRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  // ====================================
  // HANDLERS
  // ====================================

  const handleNotificationClick = (notification) => {
    // Marcar como leída si no lo está
    if (!notification.read) {
      markRead(notification.id);
    }

    //console.log('🔔 Notificación clickeada:', notification.title);

    // Ejecutar acción principal si existe
    if (notification.actions?.length > 0) {
      const primaryAction = notification.actions.find(a => a.type === 'primary') || notification.actions[0];
      handleActionClick(notification, primaryAction);
    }

    // Cerrar dropdown en móvil
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const handleActionClick = (notification, action) => {
    //console.log('⚡ Acción ejecutada:', action.label, 'para:', notification.title);

    if (action.url) {
      navigate(action.url);
      onClose();
    } else if (action.action) {
      // Simular acciones personalizadas
      switch (action.action) {
        case 'open_order_modal':
          //console.log('📋 Abriendo modal de orden...');
          break;
        case 'download_file':
          //console.log('💾 Descargando archivo...');
          break;
        case 'approve_order':
          //console.log('✅ Aprobando orden...');
          break;
        case 'reject_order':
          //console.log('❌ Rechazando orden...');
          break;
        default:
          //console.log('🔧 Acción no implementada:', action.action);
      }
    }
  };

  const handleMarkAllRead = () => {
    markAllRead();
    //console.log('✅ Todas las notificaciones marcadas como leídas');
  };

  const handleRemoveNotification = (e, notificationId) => {
    e.stopPropagation();
    remove(notificationId);
    //console.log('🗑️ Notificación eliminada:', notificationId);
  };

  const handleSimulateNew = () => {
    simulate();
    //console.log('🧪 Nueva notificación simulada');
  };

  // ====================================
  // RENDER HELPERS
  // ====================================

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return time.toLocaleDateString();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'normal':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      inventory: '📦',
      finance: '💰',
      reports: '📊',
      system: '⚙️',
      orders: '📋',
      security: '🔐'
    };
    return icons[category] || '📄';
  };

  // ====================================
  // RENDER PRINCIPAL
  // ====================================

  if (!isOpen) return null;

  return (
    <div className={cn(
      // Posición
      "absolute top-full right-0 mt-2",
      "z-dropdown",
      
      // Tamaño
      "w-80 lg:w-96",
      "max-h-[32rem]",
      
      // Estilos
      "bg-white rounded-xl shadow-xl border border-gray-200",
      "backdrop-blur-sm",
      "overflow-hidden",
      
      // Modo oscuro
      "dark:bg-gray-900 dark:border-gray-700",
      
      // Animación
      "animate-slide-in-up"
    )}>
      
      {/* ================================ */}
      {/* HEADER DEL DROPDOWN */}
      {/* ================================ */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 z-10">
        
        {/* Título y acciones */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔔</span>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Notificaciones
            </h3>
            {unreadCount > 0 && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
              )}>
                {unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Botón marcar todas como leídas */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium",
                  "text-blue-600 hover:bg-blue-50",
                  "dark:text-blue-400 dark:hover:bg-blue-900/20",
                  "transition-colors duration-150"
                )}
                title="Marcar todas como leídas"
              >
                ✓ Todas
              </button>
            )}

            {/* Botón simular nueva (solo desarrollo) */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={handleSimulateNew}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium",
                  "text-green-600 hover:bg-green-50",
                  "dark:text-green-400 dark:hover:bg-green-900/20",
                  "transition-colors duration-150"
                )}
                title="Simular nueva notificación"
              >
                + Test
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="px-4 pb-3">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setFilter(option.id)}
                className={cn(
                  "flex-1 px-2 py-1.5 rounded-md text-xs font-medium",
                  "transition-all duration-150",
                  filter === option.id
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                )}
              >
                {option.label}
                {option.count > 0 && (
                  <span className="ml-1 opacity-60">({option.count})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================================ */}
      {/* CONTENIDO DEL DROPDOWN */}
      {/* ================================ */}
      <div 
        ref={dropdownRef}
        className="max-h-80 overflow-y-auto scrollbar-thin"
      >
        {filteredNotifications.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredNotifications.map((notification, index) => (
              <div
                key={notification.id}
                onMouseEnter={() => setHoveredItem(notification.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={cn(
                  // Layout
                  "relative px-4 py-3 cursor-pointer",
                  "transition-all duration-150",
                  
                  // Estados
                  "hover:bg-gray-50 dark:hover:bg-gray-800",
                  !notification.read && "bg-blue-50/50 dark:bg-blue-900/10",
                  
                  // Animación de entrada
                  "animate-fade-in",
                  { animationDelay: `${index * 50}ms` }
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                {/* Indicador de no leída */}
                {!notification.read && (
                  <div className="absolute left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full" />
                )}

                <div className="flex gap-3">
                  {/* Icono de la notificación */}
                  <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-lg",
                    "flex items-center justify-center text-lg",
                    "bg-gray-100 dark:bg-gray-800"
                  )}>
                    {notification.icon || getCategoryIcon(notification.category)}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    {/* Título y prioridad */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className={cn(
                        "font-medium text-sm leading-tight",
                        !notification.read ? "text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"
                      )}>
                        {notification.title}
                      </h4>
                      
                      {notification.priority === 'urgent' && (
                        <span className={cn(
                          "flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-medium",
                          getPriorityColor(notification.priority)
                        )}>
                          Urgente
                        </span>
                      )}
                    </div>

                    {/* Mensaje */}
                    <p className={cn(
                      "text-sm text-gray-600 dark:text-gray-400 mb-2",
                      "line-clamp-2"
                    )}>
                      {notification.message}
                    </p>

                    {/* Footer con tiempo y acciones */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {formatTimeAgo(notification.timestamp)}
                      </span>

                      {/* Acciones */}
                      {hoveredItem === notification.id && notification.actions?.length > 0 && (
                        <div className="flex gap-1">
                          {notification.actions.slice(0, 2).map((action) => (
                            <button
                              key={action.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActionClick(notification, action);
                              }}
                              className={cn(
                                "px-2 py-1 rounded text-xs font-medium",
                                "transition-colors duration-150",
                                action.type === 'primary'
                                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400"
                                  : action.type === 'success'
                                  ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400"
                                  : action.type === 'danger'
                                  ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                              )}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Botón eliminar */}
                      {hoveredItem === notification.id && (
                        <button
                          onClick={(e) => handleRemoveNotification(e, notification.id)}
                          className={cn(
                            "p-1 rounded text-gray-400 hover:text-red-500",
                            "transition-colors duration-150"
                          )}
                          title="Eliminar notificación"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Estado vacío */
          <div className="px-4 py-8 text-center">
            <div className="text-gray-400 dark:text-gray-500 mb-3">
              <span className="text-4xl">🔔</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {filter === 'all' ? 'No hay notificaciones' : `No hay notificaciones ${filterOptions.find(f => f.id === filter)?.label.toLowerCase()}`}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Las nuevas notificaciones aparecerán aquí
            </p>
          </div>
        )}
      </div>

      {/* ================================ */}
      {/* FOOTER DEL DROPDOWN */}
      {/* ================================ */}
      {filteredNotifications.length > 0 && (
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-4 py-2">
          <button
            onClick={() => {
              navigate('/notifications');
              onClose();
            }}
            className={cn(
              "w-full text-center text-sm font-medium",
              "text-blue-600 hover:text-blue-700",
              "dark:text-blue-400 dark:hover:text-blue-300",
              "transition-colors duration-150"
            )}
          >
            Ver todas las notificaciones
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationsDropdown;