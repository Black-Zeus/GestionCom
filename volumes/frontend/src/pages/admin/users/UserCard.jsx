// ====================================
// volumes/frontend/src/pages/admin/users/UserCard.jsx
// Componente de tarjeta para mostrar usuarios en vista de cards
// ====================================

import React from 'react';

const UserCard = ({ user, onEdit, onChangePassword, onToggleStatus }) => {
  
  // ====================================
  // HELPERS PARA RENDERIZADO (COHERENTES CON USERSTABLE)
  // ====================================
  
  const getRoleColor = (roles) => {
    if (!roles || roles.length === 0) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    
    const role = roles[0].toLowerCase();
    switch (role) {
      case 'administrador':
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'jefe de bodega':
      case 'warehouse_manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'supervisor':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'vendedor':
      case 'sales_person':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'cajero':
      case 'cashier':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'contador':
      case 'accountant':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      case 'consultor':
      case 'viewer':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getStatusColor = (isActive, status) => {
    if (!isActive) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'away':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'offline':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    }
  };

  const getStatusIndicator = (isActive, status) => {
    if (!isActive) return '🔴';
    
    switch (status) {
      case 'online': return '🟢';
      case 'away': return '🟡';
      case 'offline': return '⚫';
      default: return '🟢';
    }
  };

  const getStatusText = (isActive, status) => {
    if (!isActive) return 'Inactivo';
    
    switch (status) {
      case 'online': return 'En línea';
      case 'away': return 'Ausente';
      case 'offline': return 'Desconectado';
      default: return 'Activo';
    }
  };

  const formatLastLogin = (lastLogin) => {
    if (!lastLogin) return 'Nunca';
    
    const date = new Date(lastLogin);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Hace menos de 1 hora';
    if (diffInHours < 24) return `Hace ${diffInHours} horas`;
    if (diffInHours < 48) return 'Ayer';
    if (diffInHours < 168) return `Hace ${Math.floor(diffInHours / 24)} días`;
    
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getCompletionColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600 dark:text-green-400';
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getSecurityScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 75) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // ====================================
  // RENDERIZADO DEL COMPONENTE
  // ====================================
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
      
      {/* Header de la tarjeta */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          
          {/* Avatar y info básica */}
          <div className="flex items-center space-x-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {user.avatar ? (
                <img 
                  className="h-12 w-12 rounded-full object-cover" 
                  src={user.avatar} 
                  alt={user.fullName}
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-lg font-semibold text-white">
                    {user.initials || user.fullName?.charAt(0) || '?'}
                  </span>
                </div>
              )}
            </div>
            
            {/* Nombre y username */}
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                {user.fullName}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                @{user.username}
              </p>
            </div>
          </div>

          {/* Indicador de estado */}
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getStatusIndicator(user.isActive, user.status)}</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.isActive, user.status)}`}>
              {getStatusText(user.isActive, user.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Información de contacto */}
      <div className="px-6 pb-4">
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <span className="mr-2">📧</span>
            <span className="truncate">{user.email}</span>
          </div>
          
          {user.phone && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span className="mr-2">📱</span>
              <span>{user.phone}</span>
            </div>
          )}
          
          {user.department && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span className="mr-2">🏢</span>
              <span>{user.department}</span>
            </div>
          )}
          
          {user.position && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span className="mr-2">💼</span>
              <span>{user.position}</span>
            </div>
          )}
        </div>
      </div>

      {/* Roles */}
      <div className="px-6 pb-4">
        <div className="flex flex-wrap gap-2">
          {user.roles && user.roles.length > 0 ? (
            user.roles.slice(0, 2).map((role, index) => (
              <span
                key={index}
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor([role])}`}
              >
                {role}
              </span>
            ))
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-400">Sin rol</span>
          )}
          {user.roles && user.roles.length > 2 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
              +{user.roles.length - 2} más
            </span>
          )}
        </div>
      </div>

      {/* Bodegas */}
      {user.warehouses && user.warehouses.length > 0 && (
        <div className="px-6 pb-4">
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Bodegas
            </h4>
            <div className="space-y-1">
              {user.warehouses.slice(0, 2).map((warehouse, index) => (
                <div 
                  key={index} 
                  className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded truncate"
                >
                  {warehouse}
                </div>
              ))}
              {user.warehouses.length > 2 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  +{user.warehouses.length - 2} más
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Métricas de perfil (si están disponibles) */}
      {(user.profileCompleteness !== undefined || user.securityScore !== undefined) && (
        <div className="px-6 pb-4">
          <div className="grid grid-cols-2 gap-4">
            
            {/* Completitud del perfil */}
            {user.profileCompleteness !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Perfil</span>
                  <span className={`text-xs font-medium ${getCompletionColor(user.profileCompleteness)}`}>
                    {user.profileCompleteness}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      user.profileCompleteness >= 90 ? 'bg-green-600' :
                      user.profileCompleteness >= 70 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${user.profileCompleteness}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Score de seguridad */}
            {user.securityScore !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Seguridad</span>
                  <span className={`text-xs font-medium ${getSecurityScoreColor(user.securityScore)}`}>
                    {user.securityScore}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      user.securityScore >= 90 ? 'bg-green-600' :
                      user.securityScore >= 75 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${user.securityScore}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Último acceso */}
      <div className="px-6 pb-4">
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <span className="mr-2">⏰</span>
          <span>Último acceso: {formatLastLogin(user.lastLogin)}</span>
        </div>
      </div>

      {/* Footer con acciones */}
      <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-b-lg">
        <div className="flex items-center justify-between">
          
          {/* Información adicional */}
          <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
            <span title="Permisos">
              🔑 {user.permissions ? user.permissions.length : 0}
            </span>
            <span title="Fecha de creación">
              📅 {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-CL') : 'N/A'}
            </span>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center space-x-2">
            
            {/* Botón editar */}
            <button
              onClick={() => onEdit && onEdit(user)}
              className="inline-flex items-center p-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              title="Editar usuario"
            >
              ✏️
            </button>

            {/* Botón cambiar contraseña */}
            <button
              onClick={() => onChangePassword && onChangePassword(user)}
              className="inline-flex items-center p-2 text-sm text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
              title="Cambiar contraseña"
            >
              🔑
            </button>

            {/* Toggle estado */}
            <button
              onClick={() => onToggleStatus && onToggleStatus(user.id)}
              className={`inline-flex items-center p-2 text-sm rounded-lg transition-colors ${
                user.isActive 
                  ? 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30' 
                  : 'text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30'
              }`}
              title={user.isActive ? 'Desactivar usuario' : 'Activar usuario'}
            >
              {user.isActive ? '🔴' : '🟢'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserCard;