// ====================================
// volumes/frontend/src/pages/profile/Cards/RolesCard.jsx
// Card de roles y permisos del usuario con tabla
// ====================================

import React, { useState } from "react";
import { mockUserData } from "@/data/mockData";

const RolesCard = () => {
  const { roles } = mockUserData;
  const [showAllPermissions, setShowAllPermissions] = useState(false);

  // Función para parsear y estructurar los permisos
  const parsePermissions = (permissionCodes) => {
    const permissionDescriptions = {
      // Usuarios
      USER_READ: "Permite visualizar información de usuarios del sistema",
      USER_WRITE: "Permite crear nuevos usuarios y modificar existentes",
      USER_MANAGER: "Permite gestión completa de usuarios y asignación de roles",
      
      // Productos
      PRODUCT_READ: "Permite consultar el catálogo de productos y sus detalles",
      PRODUCT_WRITE: "Permite crear, editar y gestionar productos del inventario",
      
      // Inventario
      INVENTORY_READ: "Permite consultar niveles de stock y movimientos de inventario",
      INVENTORY_WRITE: "Permite realizar ajustes de inventario y transferencias entre bodegas",
      
      // Ventas
      SALES_READ: "Permite consultar historial de ventas y transacciones",
      SALES_WRITE: "Permite procesar ventas y generar documentos comerciales",
      
      // Reportes
      REPORTS_READ: "Permite acceder a reportes del sistema y exportar información",
      
      // Bodegas
      WAREHOUSE_ACCESS: "Permite acceder y operar en bodegas específicas asignadas",
      
      // Caja
      CASH_REGISTER: "Permite operar caja registradora y procesar pagos",
    };

    const permissions = permissionCodes.map(code => {
      const parts = code.split('_');
      const module = parts[0];
      const permission = parts.slice(1).join('_');
      
      return {
        module: module.charAt(0).toUpperCase() + module.slice(1).toLowerCase(),
        permission: permission.charAt(0).toUpperCase() + permission.slice(1).toLowerCase().replace('_', ' '),
        description: permissionDescriptions[code] || "Descripción no disponible",
        fullCode: code
      };
    });

    // Ordenar por módulo alfabéticamente, luego por permiso
    return permissions.sort((a, b) => {
      if (a.module === b.module) {
        return a.permission.localeCompare(b.permission);
      }
      return a.module.localeCompare(b.module);
    });
  };

  const permissionsData = parsePermissions(roles.permission_codes);
  
  // Función para obtener permisos únicos por módulo (solo el primero de cada grupo)
  const getUniquePermissionsByModule = (permissions) => {
    const modulesSeen = new Set();
    return permissions.filter(permission => {
      if (!modulesSeen.has(permission.module)) {
        modulesSeen.add(permission.module);
        return true;
      }
      return false;
    });
  };
  
  const uniquePermissions = getUniquePermissionsByModule(permissionsData);
  const displayedPermissions = showAllPermissions
    ? permissionsData
    : uniquePermissions;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <span className="text-purple-600 dark:text-purple-400 text-lg">
              👑
            </span>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Roles y Permisos
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nivel de acceso y funcionalidades disponibles
          </p>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {roles.role_names.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Roles</div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {roles.permission_codes.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Permisos
          </div>
        </div>
      </div>

      {/* Roles asignados */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Roles Asignados
        </h4>
        
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Descripción
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {roles.role_names.map((role, index) => {
                const roleDescriptions = {
                  "Administrador": "Acceso completo al sistema con permisos de configuración y gestión de usuarios",
                  "Gerente": "Gestión operativa con acceso a reportes, supervisión de ventas y control de inventario",
                  "Supervisor": "Supervisión de operaciones diarias, autorización de transacciones y gestión de personal",
                  "Cajero": "Procesamiento de ventas, manejo de caja registradora y atención al cliente",
                  "Vendedor": "Gestión de ventas, atención al cliente y consulta de productos e inventario",
                  "Bodeguero": "Gestión de inventario, recepción de mercadería y control de stock en bodega"
                };

                return (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {role}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {roleDescriptions[role] || "Descripción no disponible"}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla de Permisos */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Permisos Asignados
          </h4>
          {roles.permission_codes.length > uniquePermissions.length && (
            <button
              onClick={() => setShowAllPermissions(!showAllPermissions)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium"
            >
              {showAllPermissions
                ? "Ver menos"
                : `Ver todos (${roles.permission_codes.length})`}
            </button>
          )}
        </div>

        {/* Tabla responsive */}
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Módulo
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Permiso
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                  Descripción
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {displayedPermissions.map((permission, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      
                        {permission.module}
                     
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {permission.permission}
                    </div>
                  </td>
                  <td className="px-3 py-2 hidden sm:table-cell">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {permission.description}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Descripción en móvil */}
        <div className="sm:hidden mt-3 space-y-2">
          {displayedPermissions.map((permission, index) => (
            <div key={index} className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <strong>{permission.module} - {permission.permission}:</strong> {permission.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Límite de caja chica */}
      {roles.petty_cash_limit && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Límite de caja chica:
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              ${roles.petty_cash_limit?.toLocaleString("es-CL")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesCard;