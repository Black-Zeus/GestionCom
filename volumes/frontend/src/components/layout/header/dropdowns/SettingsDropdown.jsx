// ====================================
// SETTINGS DROPDOWN COMPONENT
// ====================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useHeaderStore } from '@/store/headerStore';
import { useSidebar } from '@/store/sidebarStore';

/**
 * Componente dropdown de configuración rápida
 * Permite cambiar settings del sistema, tema, y acceso a configuraciones
 */
function SettingsDropdown({ isOpen, onClose }) {
  const [hoveredItem, setHoveredItem] = useState(null);
  const navigate = useNavigate();

  // Store states
  const { config, updateConfig, toggleConfigOption } = useHeaderStore();
  const { isDarkMode, toggleTheme } = useSidebar();

  // ====================================
  // CONFIGURACIONES DISPONIBLES
  // ====================================

  const toggleSettings = [
    {
      id: 'autoRefresh',
      label: 'Actualización Automática',
      icon: '🔄',
      description: 'Actualizar datos cada 30 segundos',
      value: config.autoRefresh,
      color: 'blue'
    },
    {
      id: 'soundEnabled',
      label: 'Sonidos del Sistema',
      icon: '🔊',
      description: 'Reproducir sonidos para notificaciones',
      value: config.soundEnabled,
      color: 'green'
    },
    {
      id: 'desktopNotifications',
      label: 'Notificaciones de Escritorio',
      icon: '🔔',
      description: 'Mostrar notificaciones del navegador',
      value: config.desktopNotifications,
      color: 'purple'
    },
    {
      id: 'compactMode',
      label: 'Modo Compacto',
      icon: '📱',
      description: 'Interfaz más densa y compacta',
      value: config.compactMode,
      color: 'orange'
    },
    {
      id: 'showReadItems',
      label: 'Mostrar Elementos Leídos',
      icon: '👁️',
      description: 'Incluir notificaciones y mensajes leídos',
      value: config.showReadItems,
      color: 'indigo'
    }
  ];

  const quickActions = [
    {
      id: 'theme',
      label: 'Cambiar Tema',
      icon: isDarkMode ? '🌙' : '☀️',
      description: `Cambiar a modo ${isDarkMode ? 'claro' : 'oscuro'}`,
      action: 'toggle_theme',
      color: isDarkMode ? 'yellow' : 'blue'
    },
    {
      id: 'dashboard',
      label: 'Personalizar Dashboard',
      icon: '📊',
      description: 'Organizar widgets y métricas',
      action: 'customize_dashboard',
      color: 'green'
    },
    {
      id: 'shortcuts',
      label: 'Atajos de Teclado',
      icon: '⌨️',
      description: 'Ver y configurar atajos',
      action: 'keyboard_shortcuts',
      color: 'purple'
    },
    {
      id: 'backup',
      label: 'Respaldar Configuración',
      icon: '💾',
      description: 'Exportar configuraciones personalizadas',
      action: 'backup_settings',
      color: 'blue'
    }
  ];

  const navigationItems = [
    {
      id: 'full_settings',
      label: 'Configuración Completa',
      icon: '⚙️',
      description: 'Acceder a todas las configuraciones',
      url: '/settings',
      color: 'gray'
    },
    {
      id: 'user_preferences',
      label: 'Preferencias de Usuario',
      icon: '👤',
      description: 'Configurar perfil y preferencias',
      url: '/settings/profile',
      color: 'blue'
    },
    {
      id: 'system_info',
      label: 'Información del Sistema',
      icon: 'ℹ️',
      description: 'Ver versión y estado del sistema',
      url: '/settings/system',
      color: 'green'
    }
  ];

  // ====================================
  // HANDLERS
  // ====================================

  const handleToggleSetting = (settingId) => {
    toggleConfigOption(settingId);
    //console.log(`🔧 Configuración ${settingId} ${config[settingId] ? 'desactivada' : 'activada'}`);
    
    // Feedback visual
    const setting = toggleSettings.find(s => s.id === settingId);
    if (setting) {
      showFeedback(`${setting.label} ${!setting.value ? 'activado' : 'desactivado'}`, 'success');
    }
  };

  const handleQuickAction = (action) => {
    //console.log('⚡ Acción rápida:', action.action);

    switch (action.action) {
      case 'toggle_theme':
        toggleTheme();
        showFeedback(`Tema cambiado a modo ${!isDarkMode ? 'oscuro' : 'claro'}`, 'success');
        break;
        
      case 'customize_dashboard':
        navigate('/dashboard/customize');
        onClose();
        break;
        
      case 'keyboard_shortcuts':
        showShortcutsModal();
        break;
        
      case 'backup_settings':
        handleBackupSettings();
        break;
        
      default:
        showFeedback('Funcionalidad en desarrollo', 'info');
    }
  };

  const handleNavigationClick = (item) => {
    navigate(item.url);
    onClose();
    //console.log('🔗 Navegando a:', item.url);
  };

  const handleBackupSettings = () => {
    const settings = {
      config,
      theme: isDarkMode ? 'dark' : 'light',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };

    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `sistema-config-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showFeedback('Configuración exportada exitosamente', 'success');
  };

  const showShortcutsModal = () => {
    // Simular modal de atajos
    const shortcuts = [
      { key: 'Ctrl + B', action: 'Toggle Sidebar' },
      { key: 'Ctrl + K', action: 'Búsqueda Global' },
      { key: 'Ctrl + N', action: 'Nueva Venta' },
      { key: 'Ctrl + Shift + D', action: 'Toggle Tema' },
      { key: 'Esc', action: 'Cerrar Dropdowns' }
    ];
    
    const shortcutsList = shortcuts.map(s => `${s.key}: ${s.action}`).join('\n');
    alert(`Atajos de Teclado:\n\n${shortcutsList}`);
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

  const renderToggle = (setting) => {
    return (
      <div
        key={setting.id}
        onMouseEnter={() => setHoveredItem(setting.id)}
        onMouseLeave={() => setHoveredItem(null)}
        className={cn(
          "flex items-center justify-between p-3",
          "hover:bg-gray-50 dark:hover:bg-gray-800",
          "transition-colors duration-150",
          "cursor-pointer"
        )}
        onClick={() => handleToggleSetting(setting.id)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-sm",
            `text-${setting.color}-600 bg-${setting.color}-100`,
            "dark:bg-gray-700 dark:text-gray-300"
          )}>
            {setting.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
              {setting.label}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {setting.description}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 ml-3">
          <div className={cn(
            "w-10 h-6 rounded-full transition-all duration-200",
            "relative cursor-pointer",
            setting.value 
              ? `bg-${setting.color}-500` 
              : "bg-gray-300 dark:bg-gray-600"
          )}>
            <div className={cn(
              "absolute top-0.5 w-5 h-5 bg-white rounded-full",
              "transition-transform duration-200 shadow-sm",
              setting.value ? "transform translate-x-4" : "transform translate-x-0.5"
            )} />
          </div>
        </div>
      </div>
    );
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
      {/* HEADER */}
      {/* ================================ */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 z-10">
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="text-lg">⚙️</span>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Configuración Rápida
          </h3>
        </div>
      </div>

      {/* ================================ */}
      {/* CONTENIDO */}
      {/* ================================ */}
      <div className="max-h-80 overflow-y-auto scrollbar-thin">
        
        {/* Configuraciones Toggle */}
        <div className="border-b border-gray-100 dark:border-gray-700">
          <div className="px-4 py-2">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Configuraciones
            </h4>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {toggleSettings.map(renderToggle)}
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="border-b border-gray-100 dark:border-gray-700">
          <div className="px-4 py-2">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Acciones Rápidas
            </h4>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {quickActions.map(action => renderActionItem(action, handleQuickAction))}
          </div>
        </div>

        {/* Navegación */}
        <div>
          <div className="px-4 py-2">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Configuración Avanzada
            </h4>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {navigationItems.map(item => renderActionItem(item, handleNavigationClick))}
          </div>
        </div>
      </div>

      {/* ================================ */}
      {/* FOOTER */}
      {/* ================================ */}
      <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Sistema v2.1.1</span>
          <button
            onClick={() => {
              updateConfig({ 
                autoRefresh: true,
                soundEnabled: true,
                desktopNotifications: true,
                compactMode: false,
                showReadItems: true
              });
              showFeedback('Configuración restablecida', 'success');
            }}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Restablecer
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsDropdown;