// ====================================
// MESSAGES DROPDOWN COMPONENT
// ====================================

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useMessages } from '@/store/headerStore';

/**
 * Componente dropdown de mensajes
 * Muestra lista de mensajes con filtros, búsqueda y acciones
 */
function MessagesDropdown({ isOpen, onClose }) {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredItem, setHoveredItem] = useState(null);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const {
    messages,
    metadata,
    unreadCount,
    markRead,
    markAllRead,
    remove,
    reply,
    simulate
  } = useMessages();

  // ====================================
  // FILTROS Y DATOS PROCESADOS
  // ====================================

  const filterOptions = [
    { id: 'all', label: 'Todos', count: messages.length },
    { id: 'unread', label: 'No leídos', count: unreadCount },
    { id: 'urgent', label: 'Urgentes', count: messages.filter(m => m.priority === 'urgent').length },
    { id: 'work', label: 'Trabajo', count: messages.filter(m => m.type === 'work').length }
  ];

  const filteredMessages = messages.filter(message => {
    // Filtro por tipo
    let passesFilter = true;
    switch (filter) {
      case 'unread':
        passesFilter = !message.read;
        break;
      case 'urgent':
        passesFilter = message.priority === 'urgent';
        break;
      case 'work':
        passesFilter = message.type === 'work';
        break;
      default:
        passesFilter = true;
    }

    // Filtro por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        message.sender?.name?.toLowerCase().includes(query) ||
        message.subject?.toLowerCase().includes(query) ||
        message.preview?.toLowerCase().includes(query);
      passesFilter = passesFilter && matchesSearch;
    }

    return passesFilter;
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

  // Focus en búsqueda al abrir
  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => {
        searchRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // ====================================
  // HANDLERS
  // ====================================

  const handleMessageClick = (message) => {
    // Marcar como leído si no lo está
    if (!message.read) {
      markRead(message.id);
    }

    //console.log('💬 Mensaje clickeado de:', message.sender?.name);

    // Navegar al detalle del mensaje o abrir modal
    navigate(`/messages/${message.id}`);
    onClose();
  };

  const handleReplyClick = (e, message) => {
    e.stopPropagation();
    //console.log('📧 Respondiendo a:', message.sender?.name);
    
    // Simular respuesta
    reply(message.id, 'Respuesta simulada');
    
    // Aquí abrirías un modal o navegarías al composer
    // navigate(`/messages/compose?reply=${message.id}`);
  };

  const handleRemoveMessage = (e, messageId) => {
    e.stopPropagation();
    remove(messageId);
    //console.log('🗑️ Mensaje eliminado:', messageId);
  };

  const handleMarkAllRead = () => {
    markAllRead();
    //console.log('✅ Todos los mensajes marcados como leídos');
  };

  const handleNewMessage = () => {
    //console.log('✏️ Redactando nuevo mensaje');
    navigate('/messages/compose');
    onClose();
  };

  const handleSimulateNew = () => {
    simulate();
    //console.log('🧪 Nuevo mensaje simulado');
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    searchRef.current?.focus();
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
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return time.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'normal':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      work: '💼',
      info: 'ℹ️',
      system: '⚙️',
      approval: '✅',
      report: '📊',
      reminder: '⏰'
    };
    return icons[type] || '💬';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
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
      {/* HEADER DEL DROPDOWN */}
      {/* ================================ */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 z-10">
        
        {/* Título y acciones */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">✉️</span>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Mensajes
            </h3>
            {unreadCount > 0 && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
              )}>
                {unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Botón nuevo mensaje */}
            <button
              onClick={handleNewMessage}
              className={cn(
                "px-2 py-1 rounded-md text-xs font-medium",
                "text-blue-600 hover:bg-blue-50",
                "dark:text-blue-400 dark:hover:bg-blue-900/20",
                "transition-colors duration-150"
              )}
              title="Redactar mensaje"
            >
              ✏️ Nuevo
            </button>

            {/* Botón marcar todos como leídos */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium",
                  "text-green-600 hover:bg-green-50",
                  "dark:text-green-400 dark:hover:bg-green-900/20",
                  "transition-colors duration-150"
                )}
                title="Marcar todos como leídos"
              >
                ✓ Todos
              </button>
            )}

            {/* Botón simular nuevo (solo desarrollo) */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={handleSimulateNew}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium",
                  "text-purple-600 hover:bg-purple-50",
                  "dark:text-purple-400 dark:hover:bg-purple-900/20",
                  "transition-colors duration-150"
                )}
                title="Simular nuevo mensaje"
              >
                + Test
              </button>
            )}
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="px-4 pb-3">
          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Buscar mensajes..."
              className={cn(
                "w-full pl-8 pr-8 py-2",
                "bg-gray-100 dark:bg-gray-800",
                "border-0 rounded-lg",
                "text-sm placeholder-gray-500 dark:placeholder-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-blue-500"
              )}
            />
            
            {/* Icono de búsqueda */}
            <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Botón limpiar búsqueda */}
            {searchQuery && (
              <button
                onClick={handleSearchClear}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
        {filteredMessages.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredMessages.map((message, index) => (
              <div
                key={message.id}
                onMouseEnter={() => setHoveredItem(message.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={cn(
                  // Layout
                  "relative px-4 py-3 cursor-pointer",
                  "transition-all duration-150",
                  
                  // Estados
                  "hover:bg-gray-50 dark:hover:bg-gray-800",
                  !message.read && "bg-green-50/50 dark:bg-green-900/10",
                  
                  // Animación de entrada
                  "animate-fade-in",
                  { animationDelay: `${index * 50}ms` }
                )}
                onClick={() => handleMessageClick(message)}
              >
                {/* Indicador de no leído */}
                {!message.read && (
                  <div className="absolute left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-green-500 rounded-full" />
                )}

                <div className="flex gap-3">
                  {/* Avatar del remitente */}
                  <div className="relative flex-shrink-0">
                    <div className={cn(
                      "w-10 h-10 rounded-full",
                      "flex items-center justify-center",
                      "bg-gradient-to-r from-blue-500 to-purple-500",
                      "text-white font-semibold text-sm"
                    )}>
                      {message.sender?.avatar || message.sender?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>

                    {/* Indicador de estado */}
                    {message.sender?.status && (
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5",
                        "w-3 h-3 rounded-full border-2 border-white dark:border-gray-900",
                        getStatusColor(message.sender.status)
                      )} />
                    )}
                  </div>

                  {/* Contenido del mensaje */}
                  <div className="flex-1 min-w-0">
                    {/* Header con remitente, tiempo y tipo */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <h4 className={cn(
                          "font-medium text-sm leading-tight truncate",
                          !message.read ? "text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"
                        )}>
                          {message.sender?.name || 'Usuario desconocido'}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {message.sender?.role} • {message.sender?.department}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Tipo de mensaje */}
                        <span className="text-sm" title={message.type}>
                          {getTypeIcon(message.type)}
                        </span>
                        
                        {/* Prioridad urgente */}
                        {message.priority === 'urgent' && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-xs font-medium",
                            getPriorityColor(message.priority)
                          )}>
                            !
                          </span>
                        )}
                        
                        {/* Tiempo */}
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {formatTimeAgo(message.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* Asunto */}
                    <h5 className={cn(
                      "text-sm font-medium mb-1 truncate",
                      !message.read ? "text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"
                    )}>
                      {message.subject}
                    </h5>

                    {/* Preview del mensaje */}
                    <p className={cn(
                      "text-sm text-gray-600 dark:text-gray-400 mb-2",
                      "line-clamp-2"
                    )}>
                      {message.preview}
                    </p>

                    {/* Footer con adjuntos y acciones */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Indicador de adjuntos */}
                        {message.attachments?.length > 0 && (
                          <span className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                            📎 {message.attachments.length}
                          </span>
                        )}

                        {/* Contador de respuestas */}
                        {message.reply_count > 0 && (
                          <span className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                            💬 {message.reply_count}
                          </span>
                        )}

                        {/* Tags */}
                        {message.tags?.slice(0, 2).map((tag) => (
                          <span 
                            key={tag}
                            className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Acciones en hover */}
                      {hoveredItem === message.id && (
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => handleReplyClick(e, message)}
                            className={cn(
                              "p-1.5 rounded text-blue-600 hover:bg-blue-100",
                              "dark:text-blue-400 dark:hover:bg-blue-900/20",
                              "transition-colors duration-150"
                            )}
                            title="Responder"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                          </button>

                          <button
                            onClick={(e) => handleRemoveMessage(e, message.id)}
                            className={cn(
                              "p-1.5 rounded text-gray-400 hover:text-red-500",
                              "transition-colors duration-150"
                            )}
                            title="Eliminar mensaje"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
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
              <span className="text-4xl">
                {searchQuery ? '🔍' : '✉️'}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {searchQuery 
                ? `No se encontraron mensajes para "${searchQuery}"`
                : filter === 'all' 
                ? 'No hay mensajes' 
                : `No hay mensajes ${filterOptions.find(f => f.id === filter)?.label.toLowerCase()}`
              }
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {searchQuery 
                ? 'Intenta con términos diferentes'
                : 'Los nuevos mensajes aparecerán aquí'
              }
            </p>
          </div>
        )}
      </div>

      {/* ================================ */}
      {/* FOOTER DEL DROPDOWN */}
      {/* ================================ */}
      {filteredMessages.length > 0 && (
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-4 py-2">
          <button
            onClick={() => {
              navigate('/messages');
              onClose();
            }}
            className={cn(
              "w-full text-center text-sm font-medium",
              "text-blue-600 hover:text-blue-700",
              "dark:text-blue-400 dark:hover:text-blue-300",
              "transition-colors duration-150"
            )}
          >
            Ver todos los mensajes
          </button>
        </div>
      )}
    </div>
  );
}

export default MessagesDropdown;