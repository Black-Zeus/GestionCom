import React from 'react'

  const BranchItem = ({ branch, isSelected, isCurrent }) => {
    const statusColors = {
      active: 'text-green-600 bg-green-50',
      maintenance: 'text-yellow-600 bg-yellow-50',
      inactive: 'text-red-600 bg-red-50'
    };

    const statusLabels = {
      active: 'Activa',
      maintenance: 'Mantenimiento',
      inactive: 'Inactiva'
    };

    return (
      <button
        onClick={() => handleBranchSelect(branch)}
        disabled={branch.status !== 'active' || isChanging}
        className={cn(
          // Layout base
          "w-full p-4 text-left transition-all duration-200",
          "border border-transparent rounded-lg",
          "focus:outline-none focus:ring-2 focus:ring-blue-500",
          
          // Estados base
          "hover:bg-gray-50 dark:hover:bg-gray-700",
          
          // Estado seleccionado
          isSelected && [
            "bg-blue-50 dark:bg-blue-900/20",
            "border-blue-200 dark:border-blue-700"
          ],
          
          // Estado actual
          isCurrent && [
            "bg-green-50 dark:bg-green-900/20",
            "border-green-200 dark:border-green-700"
          ],
          
          // Estado deshabilitado
          branch.status !== 'active' && [
            "opacity-50 cursor-not-allowed",
            "hover:bg-transparent dark:hover:bg-transparent"
          ],
          
          // Estado cargando
          isChanging && "opacity-50 cursor-wait"
        )}
      >
        <div className="flex items-start justify-between">
          
          {/* Información principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              
              {/* Nombre de la sucursal */}
              <h4 className={cn(
                "font-semibold text-gray-900 dark:text-gray-100",
                "truncate",
                isCurrent && "text-green-700 dark:text-green-400"
              )}>
                {branch.name}
              </h4>
              
              {/* Código */}
              <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">
                {branch.code}
              </span>
              
              {/* Indicador de sucursal actual */}
              {isCurrent && (
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400 px-2 py-1 rounded font-medium">
                  Actual
                </span>
              )}
            </div>
            
            {/* Dirección */}
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 truncate">
              📍 {branch.address}
            </p>
            
            {/* Información adicional */}
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
              <span>👤 {branch.manager}</span>
              <span>📞 {branch.phone}</span>
            </div>
          </div>
          
          {/* Estado de la sucursal */}
          <div className="flex flex-col items-end gap-1 ml-2">
            <span className={cn(
              "text-xs px-2 py-1 rounded-full font-medium",
              statusColors[branch.status]
            )}>
              {statusLabels[branch.status]}
            </span>
            
            {/* Tipo de sucursal */}
            <span className="text-xs text-gray-400 capitalize">
              {branch.type}
            </span>
          </div>
        </div>
      </button>
    );
  };

export default BranchItem