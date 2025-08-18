// ====================================
// volumes/frontend/src/pages/profile/Cards/RolesCard.jsx
// Card de roles y permisos del usuario - IMPLEMENTACIÓN COMPLETA CON API REAL
// ====================================

import React, { useState } from "react";
import { useUserProfile, useProfileLoading } from "@/store/authStore";
import moduleTranslations from "@/data/moduleTranslate.json";

const RolesCard = () => {
  const userProfile = useUserProfile();
  const isProfileLoading = useProfileLoading();
  
  const [showAllPermissions, setShowAllPermissions] = useState(false);

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================

  const getRoleIcon = (roleCode) => {
    // Icono genérico para todos los roles
    return "👤";
  };

  const getPermissionModule = (permissionCode) => {
    // Buscar el módulo más específico primero
    // Ordenar las claves por longitud descendente para encontrar matches más largos primero
    const moduleKeys = Object.keys(moduleTranslations.modules).sort((a, b) => b.length - a.length);
    
    for (const moduleKey of moduleKeys) {
      if (permissionCode.startsWith(moduleKey + '_') || permissionCode === moduleKey) {
        return moduleTranslations.modules[moduleKey];
      }
    }
    
    // Si no encuentra ningún módulo, extraer el primer segmento
    const parts = permissionCode.split('_');
    const moduleCode = parts[0] || 'General';
    return moduleTranslations.modules[moduleCode] || moduleCode;
  };

  const getPermissionLevel = (permissionCode) => {
    // Encontrar el módulo más específico primero
    const moduleKeys = Object.keys(moduleTranslations.modules).sort((a, b) => b.length - a.length);
    
    let moduleFound = '';
    for (const moduleKey of moduleKeys) {
      if (permissionCode.startsWith(moduleKey + '_') || permissionCode === moduleKey) {
        moduleFound = moduleKey;
        break;
      }
    }
    
    let levelCode = '';
    if (moduleFound && permissionCode.startsWith(moduleFound + '_')) {
      // Extraer todo después del módulo encontrado + '_'
      levelCode = permissionCode.substring(moduleFound.length + 1);
    } else if (moduleFound && permissionCode === moduleFound) {
      // Si el código es exactamente el módulo, no hay nivel
      levelCode = permissionCode;
    } else {
      // Fallback: usar todo el código
      levelCode = permissionCode;
    }
    
    // Buscar traducción, si no existe usar el código original
    return moduleTranslations.levels[levelCode] || levelCode;
  };

  const categorizePermissions = (permissions) => {
    const categories = {
      user: [],
      warehouse: [],
      returns: [],
      menu: [],
      other: []
    };

    permissions.forEach(permission => {
      const code = permission.code || permission.permission_code || '';
      
      if (code.startsWith('USER_')) {
        categories.user.push(permission);
      } else if (code.startsWith('WAREHOUSE_')) {
        categories.warehouse.push(permission);
      } else if (code.startsWith('RETURNS_')) {
        categories.returns.push(permission);
      } else if (code.includes('MENU')) {
        categories.menu.push(permission);
      } else {
        categories.other.push(permission);
      }
    });

    return categories;
  };

  const getSourceBadge = (source) => {
    if (source === 'role') {
      return (
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
          👥 Rol
        </span>
      );
    }
    
    if (source === 'direct') {
      return (
        <span className="text-xs font-medium text-green-600 dark:text-green-400">
          👤 User
        </span>
      );
    }
    
    return (
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
        ❓ {source}
      </span>
    );
  };

  // ==========================================
  // LOADING STATE
  // ==========================================

  if (isProfileLoading && !userProfile) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <span className="text-gray-400 text-xl">⚠️</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No se pudo cargar la información de roles
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // DATA PREPARATION
  // ==========================================

  const roles = userProfile.roleDetails || [];
  const permissions = userProfile.permissionDetails || [];
  
  // Función para obtener permisos agrupados por módulo (solo 1 por módulo cuando está colapsado)
  const getDisplayedPermissions = () => {
    if (showAllPermissions) {
      // Cuando está expandido, mostrar todos ordenados alfabéticamente por módulo y luego por nivel
      return permissions.sort((a, b) => {
        const moduleA = getPermissionModule(a.code || a.permission_code);
        const moduleB = getPermissionModule(b.code || b.permission_code);
        
        // Primero ordenar por módulo
        const moduleComparison = moduleA.localeCompare(moduleB);
        if (moduleComparison !== 0) {
          return moduleComparison;
        }
        
        // Si el módulo es el mismo, ordenar por nivel de acceso
        const levelA = getPermissionLevel(a.code || a.permission_code);
        const levelB = getPermissionLevel(b.code || b.permission_code);
        return levelA.localeCompare(levelB);
      });
    }
    
    // Agrupar por módulo y tomar solo el primero de cada módulo (orden alfabético)
    const moduleGroups = {};
    
    permissions.forEach(permission => {
      const moduleCode = getPermissionModuleCode(permission.code || permission.permission_code);
      
      if (!moduleGroups[moduleCode]) {
        moduleGroups[moduleCode] = [];
      }
      moduleGroups[moduleCode].push(permission);
    });
    
    // Ordenar permisos dentro de cada módulo alfabéticamente y tomar el primero
    const onePerModule = [];
    Object.keys(moduleGroups).forEach(moduleCode => {
      const sortedPermissions = moduleGroups[moduleCode].sort((a, b) => {
        const codeA = a.code || a.permission_code || '';
        const codeB = b.code || b.permission_code || '';
        return codeA.localeCompare(codeB);
      });
      
      onePerModule.push(sortedPermissions[0]);
    });
    
    // Ordenar los módulos alfabéticamente
    return onePerModule.sort((a, b) => {
      const moduleA = getPermissionModule(a.code || a.permission_code);
      const moduleB = getPermissionModule(b.code || b.permission_code);
      return moduleA.localeCompare(moduleB);
    });
  };

  // Función helper para obtener el código del módulo (sin traducir)
  const getPermissionModuleCode = (permissionCode) => {
    const moduleKeys = Object.keys(moduleTranslations.modules).sort((a, b) => b.length - a.length);
    
    for (const moduleKey of moduleKeys) {
      if (permissionCode.startsWith(moduleKey + '_') || permissionCode === moduleKey) {
        return moduleKey;
      }
    }
    
    const parts = permissionCode.split('_');
    return parts[0] || 'General';
  };

  const displayedPermissions = getDisplayedPermissions();

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      {/* Header del Card */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 dark:text-purple-400 text-lg">
                👥
              </span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Roles y Permisos
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {userProfile.roleCount || 0} roles • {userProfile.permissionCount || 0} permisos
            </p>
          </div>
        </div>
        
        {/* Quick info badges */}
        <div className="flex space-x-2">
          {userProfile.roleCount > 1 && (
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Múltiples roles
            </span>
          )}
        </div>
      </div>

      {/* Contenido sin pestañas */}
      <div className="space-y-6">
        {/* Sección de Roles */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
            <span className="mr-2">👥</span>
            Roles ({roles.length})
          </h4>
          
          {roles.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-600 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <span className="text-gray-400 text-lg">👥</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No tienes roles asignados
              </p>
            </div>
          ) : (
            <>
              {/* Lista de roles */}
              <div className="space-y-3">
                {roles.map((role, index) => (
                  <div
                    key={role.id || index}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {getRoleIcon(role.code || role.role_code)}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {role.name || role.role_name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Código: {role.code || role.role_code}
                        </p>
                        {role.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            {role.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {role.level && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Nivel {role.level}
                        </span>
                      )}
                      <span className={`text-xs font-medium ${
                        role.is_active
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {role.is_active ? '✅ Activo' : '❌ Inactivo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumen de roles activos - Solo si hay más de 1 rol */}
              {roles.length > 1 && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h5 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-3">
                    Resumen de Roles
                  </h5>
                  {roles.filter(role => role.is_active).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {roles.filter(role => role.is_active).map((role, index) => (
                        <span 
                          key={role.id || index}
                          className="text-xs font-medium text-blue-700 dark:text-blue-300"
                        >
                          {getRoleIcon(role.code || role.role_code)} {role.name || role.role_name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No hay roles activos asignados
                    </p>
                  )}
                  
                  {roles.filter(role => !role.is_active).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                      <h6 className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-2">
                        Roles Inactivos:
                      </h6>
                      <div className="flex flex-wrap gap-2">
                        {roles.filter(role => !role.is_active).map((role, index) => (
                          <span 
                            key={role.id || index}
                            className="text-xs font-medium text-gray-500 dark:text-gray-400"
                          >
                            {getRoleIcon(role.code || role.role_code)} {role.name || role.role_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Separador */}
        <div className="border-t border-gray-200 dark:border-gray-700"></div>

        {/* Sección de Permisos */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
            <span className="mr-2">🔐</span>
            Permisos ({permissions.length})
          </h4>
          
          {permissions.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-600 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <span className="text-gray-400 text-lg">🔐</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No tienes permisos asignados
              </p>
            </div>
          ) : (
            <>
              {/* Botón para mostrar más/menos - ARRIBA de la tabla */}
              <div className="flex justify-between items-center pb-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {showAllPermissions ? (
                    `Mostrando todos los ${permissions.length} permisos`
                  ) : (
                    `Mostrando 1 permiso por módulo (${displayedPermissions.length} de ${permissions.length} permisos)`
                  )}
                </span>
                {permissions.length > 1 && (
                  <button
                    onClick={() => setShowAllPermissions(!showAllPermissions)}
                    className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    {showAllPermissions ? (
                      <>
                        <span className="mr-1">🔼</span>
                        Contraer
                      </>
                    ) : (
                      <>
                        <span className="mr-1">🔽</span>
                        Expandir
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Tabla de permisos */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Módulo
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Nivel de Acceso
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Descripción
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Origen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {displayedPermissions.map((permission, index) => (
                      <tr key={permission.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {getPermissionModule(permission.code || permission.permission_code)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {getPermissionLevel(permission.code || permission.permission_code)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {permission.name || permission.permission_name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {permission.code || permission.permission_code}
                            </div>
                            {permission.description && (
                              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                {permission.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getSourceBadge(permission.source)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer con información adicional */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
          <span>
            Total: {userProfile.roleCount || 0} roles, {userProfile.permissionCount || 0} permisos
          </span>
          <span>
            Permisos heredados de roles: {permissions.filter(p => p.source === 'role').length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RolesCard;