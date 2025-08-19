// ====================================
// volumes/frontend/src/pages/admin/users/UsersHeader.jsx
// Header con métricas, título y acciones para usuarios
// ====================================

import React from 'react';

const UsersHeader = ({ 
  stats, 
  onAddUser, 
  currentView, 
  onViewChange, 
  totalUsers 
}) => {
  return (
    <div className="mb-8">
      {/* Título y descripción */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Gestión de Usuarios
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Administra usuarios, roles y permisos del sistema
        </p>
      </div>

      {/* Métricas en tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total de usuarios */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Usuarios
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalUsers}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 text-xl">👥</span>
            </div>
          </div>
        </div>

        {/* Usuarios activos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Usuarios Activos
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.activeUsers}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <span className="text-green-600 dark:text-green-400 text-xl">✅</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {stats.inactiveUsers} inactivos
            </span>
          </div>
        </div>

        {/* Nuevos este mes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Nuevos este mes
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.newUsersThisMonth}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 dark:text-purple-400 text-xl">🆕</span>
            </div>
          </div>
        </div>

        {/* Conectados hoy */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Conectados hoy
              </p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.lastLoginToday}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 dark:text-orange-400 text-xl">🔗</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        
        {/* Información de resultados */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando {totalUsers} usuarios
          </span>
          
          {/* Distribución por roles */}
          <div className="hidden lg:flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>👑 {stats.adminUsers} admin</span>
            <span>🏢 {stats.managerUsers} manager</span>
            <span>👤 {stats.regularUsers} regulares</span>
          </div>
        </div>

        {/* Controles de vista y acciones */}
        <div className="flex items-center gap-3">
          
          {/* Toggle de vista (tabla/tarjetas) */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => onViewChange('table')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                currentView === 'table'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              📋 Tabla
            </button>
            <button
              onClick={() => onViewChange('cards')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                currentView === 'cards'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              🃏 Tarjetas
            </button>
          </div>

          {/* Botón exportar */}
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            📊 Exportar
          </button>

          {/* Botón agregar usuario */}
          <button
            onClick={onAddUser}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <span className="mr-2">➕</span>
            Agregar Usuario
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsersHeader;