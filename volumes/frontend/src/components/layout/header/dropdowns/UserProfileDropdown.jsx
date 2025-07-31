// ====================================
// USER PROFILE DROPDOWN COMPONENT
// ====================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useHeaderUser } from '@/store/headerStore';

/**
 * Componente dropdown del perfil de usuario
 * Muestra información del usuario, acciones de cuenta y opciones de sesión
 */
function UserProfileDropdown({ isOpen, onClose }) {
  const [hoveredItem, setHoveredItem] = useState(null);
  const navigate = useNavigate();

  const { user, company, session, quickActions, recentActivity, updateStatus } = useHeaderUser();

  // ====================================
  // OPCIONES DEL MENÚ
  // ====================================

  const profileActions = [
    {
      id: 'view_profile',
      label: 'Ver Perfil',
      icon: '👤',
      description: 'Gestionar información personal',
      url: '/profile',
      color: 'blue'
    },
    {
      id: 'edit_profile',
      label: 'Editar Perfil',
      icon: '✏️',
      description: 'Modificar datos personales',
      url: '/profile/edit',
      color: 'green'
    },
    {
      id: 'account_settings',
      label: 'Configuración de Cuenta',
      icon: '⚙️',
      description: 'Preferencias y configuraciones',
      url: '/profile/settings',
      color: 'purple'
    },
    {
      id: 'notifications_settings',
      label: 'Configurar Notificaciones',
      icon: '🔔',
      description: 'Gestionar alertas y avisos',
      url: '/profile/notifications',
      color: 'orange'
    },
    {
      id: 'security',
      label: 'Seguridad',
      icon: '🔐',
      description: 'Contraseña y autenticación',
      url: '/profile/security',
      color: 'red'
    }
  ];

  const statusOptions = [
    {
      id: 'available',
      label: 'Disponible',
      icon: '🟢',
      color: 'green'
    },
    {
      id: 'busy',
      label: 'Ocupado',
      icon: '🔴',
      color: 'red'
    },
    {
      id: 'away',
      label: 'Ausente',
      icon: '🟡',
      color: 'yellow'
    }
  ];

  // ====================================
  // HANDLERS
  // ====================================

  const handleProfileAction = (action) => {
    //console.log('👤 Acción de perfil:', action.label);
    navigate(action.url);
    onClose();
  };

  const handleStatusChange = (newStatus) => {
    updateStatus({ 
      availability: newStatus.id,
      last_seen: new Date().toISOString()
    });
    //console.log('🟢 Estado cambiado a:', newStatus.label);
    showFeedback(`Estado cambiado a ${newStatus.label}`, 'success');
  };

  const handleQuickAction = (action) => {
    //console.log('⚡ Acción rápida:', action.label);
    
    if (action.url) {
      navigate(action.url);
      onClose();
    } else if (action.shortcut) {
      // Simular acción por shortcut
      showFeedback(`Ejecutando: ${action.label}`, 'info');
    }
  };

  const handleLogout = () => {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      //console.log('🚪 Cerrando sesión...');
      
      // Simular proceso de logout
      showFeedback('Cerrando sesión...', 'info');
      
      setTimeout(() => {
        // Aquí harías la limpieza real y redirección
        navigate('/login');
        onClose();
      }, 1500);
    }
  };

  const handleSwitchAccount = () => {
    //console.log('🔄 Cambiando cuenta...');
    navigate('/switch-account');
    onClose();
  };

  const showFeedback = (message, type = 'info') => {
    // Crear elemento de feedback temporal
    const feedback = document.createElement('div');
    feedback.className = `fixed top-4 right-4 z-modal px-4 py-2 rounded-lg text-white font-medium animate-slide-in-right ${
      type === 'success' ? 'bg-green-500' : 
      type === 'warning' ? 'bg-yellow-500' : 
      type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    }`;
    feedback.textContent = message;
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      feedback.style.animation = 'slideOutRight 0.3s ease forwards';
      setTimeout(() => {
        if (document.body.contains(feedback)) {
          document.body.removeChild(feedback);
        }
      }, 300);
    }, 3000);
  };

  // ====================================
  // RENDER HELPERS
  // ====================================

  const formatSessionTime = (loginTime) => {
    const now = new Date();
    const login = new Date(loginTime);
    const diffMs = now - login;
    const diffHours = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m`;
    }
    return `${diffMins}m`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'busy':
        return 'bg-red-500';
      case 'away':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  const renderActionItem = (item, onClick) => {
    return (
      <button
        key={item.id}
        onClick={() => onClick(item)}
        onMouseEnter={() => setHoveredItem(item.id)}
        onMouseLeave={() => setHoveredItem(null)}
        className={cn(
          "w-full flex items-center gap-3 p-3",
          "hover:bg-gray-50 dark:hover:bg-gray-800",
          "transition-colors duration-150",
          "text-left"
        )}
      >
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center text-sm",
          `text-${item.color}-600 bg-${item.color}-100`,
          "dark:bg-gray-700 dark:text-gray-300"
        )}>
          {item.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {item.label}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {item.description}
          </div>
        </div>

        {hoveredItem === item.id && (
          <div className="flex-shrink-0">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </button>
    );
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
      "max-h-[36rem]",
      
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
      {/* HEADER CON INFO DEL USUARIO */}
      {/* ================================ */}
      <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white z-10">
        <div className="p-4">
          <div className="flex items-center gap-3">
            {/* Avatar grande */}
            <div className="relative">
              <div className={cn(
                "w-16 h-16 rounded-full",
                "flex items-center justify-center",
                "bg-white/20 backdrop-blur-sm",
                "text-white font-bold text-xl",
                "border-2 border-white/30"
              )}>
                {user?.profile?.avatar_url ? (
                  <img 
                    src={user.profile.avatar_url} 
                    alt={user.profile.full_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span>
                    {user?.profile?.avatar || user?.profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>

              {/* Indicador de estado */}
              <div className={cn(
                "absolute -bottom-1 -right-1",
                "w-5 h-5 rounded-full border-2 border-white",
                getStatusColor(user?.status?.availability)
              )}>
                {user?.status?.availability === 'available' && (
                  <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                )}
              </div>
            </div>

            {/* Info del usuario */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-white truncate">
                {user?.profile?.full_name || 'Usuario'}
              </h3>
              <p className="text-white/80 text-sm truncate">
                {user?.role?.name || 'Sin rol'}
              </p>
              <p className="text-white/60 text-xs truncate">
                {user?.department?.name || company?.name}
              </p>
            </div>
          </div>

          {/* Info de sesión */}
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center justify-between text-xs text-white/80">
              <span>Sesión activa: {formatSessionTime(session?.login_time)}</span>
              <span>{session?.branch?.name || 'Sin sucursal'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================================ */}
      {/* CONTENIDO */}
      {/* ================================ */}
      <div className="max-h-80 overflow-y-auto scrollbar-thin">
        
        {/* Cambiar Estado */}
        <div className="border-b border-gray-100 dark:border-gray-700">
          <div className="px-4 py-2">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Estado
            </h4>
          </div>
          <div className="px-4 pb-3">
            <div className="flex gap-2">
              {statusOptions.map((status) => (
                <button
                  key={status.id}
                  onClick={() => handleStatusChange(status)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-3",
                    "rounded-lg text-xs font-medium transition-all duration-150",
                    user?.status?.availability === status.id
                      ? `bg-${status.color}-100 text-${status.color}-700 ring-2 ring-${status.color}-500 dark:bg-${status.color}-900/20 dark:text-${status.color}-400`
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  )}
                >
                  <span>{status.icon}</span>
                  <span>{status.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Acciones Rápidas */}
        {quickActions?.length > 0 && (
          <div className="border-b border-gray-100 dark:border-gray-700">
            <div className="px-4 py-2">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Acciones Rápidas
              </h4>
            </div>
            <div className="px-4 pb-3">
              <div className="grid grid-cols-2 gap-2">
                {quickActions.slice(0, 4).map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3",
                      "bg-gray-50 hover:bg-gray-100 rounded-lg",
                      "dark:bg-gray-800 dark:hover:bg-gray-700",
                      "transition-colors duration-150"
                    )}
                    title={action.label}
                  >
                    <span className="text-lg">{action.icon}</span>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Opciones de Perfil */}
        <div className="border-b border-gray-100 dark:border-gray-700">
          <div className="px-4 py-2">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Perfil y Cuenta
            </h4>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {profileActions.map(action => renderActionItem(action, handleProfileAction))}
          </div>
        </div>

        {/* Actividad Reciente */}
        {recentActivity?.length > 0 && (
          <div className="border-b border-gray-100 dark:border-gray-700">
            <div className="px-4 py-2">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Actividad Reciente
              </h4>
            </div>
            <div className="px-4 pb-3">
              <div className="space-y-2">
                {recentActivity.slice(0, 3).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400 truncate">
                      {activity.description}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">
                      {new Date(activity.timestamp).toLocaleTimeString('es-ES', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Opciones de Sesión */}
        <div>
          <div className="px-4 py-2">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Sesión
            </h4>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            <button
              onClick={handleSwitchAccount}
              className={cn(
                "w-full flex items-center gap-3 p-3",
                "hover:bg-gray-50 dark:hover:bg-gray-800",
                "transition-colors duration-150",
                "text-left"
              )}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-blue-100 text-blue-600 dark:bg-gray-700 dark:text-gray-300">
                🔄
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  Cambiar Cuenta
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Alternar entre cuentas disponibles
                </div>
              </div>
            </button>

            <button
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-3 p-3",
                "hover:bg-red-50 dark:hover:bg-red-900/20",
                "transition-colors duration-150",
                "text-left group"
              )}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-red-100 text-red-600 group-hover:bg-red-200 dark:bg-gray-700 dark:text-gray-300">
                🚪
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-red-600 group-hover:text-red-700 dark:text-red-400">
                  Cerrar Sesión
                </div>
                <div className="text-xs text-red-500 group-hover:text-red-600 dark:text-red-500">
                  Salir del sistema de forma segura
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ================================ */}
      {/* FOOTER */}
      {/* ================================ */}
      <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            {session?.device?.browser} • {session?.location?.city}
          </span>
          <span>
            IP: {session?.ip_address}
          </span>
        </div>
      </div>
    </div>
  );
}

export default UserProfileDropdown;