import React from 'react'

  const BranchSelectorContent = () => (
    <div className={cn(
      displayMode === 'modal' ? [
        // Estilos de modal
        "bg-white dark:bg-gray-800",
        "rounded-lg shadow-xl",
        "w-full max-w-md mx-4",
        "max-h-[80vh] overflow-hidden"
      ] : [
        // Estilos de dropdown
        "bg-white dark:bg-gray-800",
        "rounded-lg shadow-xl border border-gray-200 dark:border-gray-700",
        "w-80",
        "max-h-96 overflow-hidden"
      ]
    )}>
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Cambiar Sucursal
          </h3>
          <button
            onClick={handleClose}
            disabled={isChanging}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* Buscador */}
        <div className="mt-3 relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar sucursal..."
            value={searchTerm}
            onChange={handleSearchChange}
            disabled={isChanging}
            className={cn(
              "w-full px-3 py-2 pl-9",
              "border border-gray-300 dark:border-gray-600",
              "rounded-md bg-white dark:bg-gray-700",
              "text-gray-900 dark:text-gray-100",
              "placeholder-gray-500 dark:placeholder-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-blue-500",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>
      
      {/* Lista de sucursales */}
      <div className="max-h-64 overflow-y-auto p-4 space-y-2">
        {filteredBranches.length > 0 ? (
          filteredBranches.map((branch) => (
            <BranchItem
              key={branch.id}
              branch={branch}
              isSelected={selectedBranch === branch.name}
              isCurrent={currentBranch === branch.name}
            />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <span className="text-2xl mb-2 block">🔍</span>
            <p>No se encontraron sucursales</p>
            <p className="text-sm">Intenta con otro término de búsqueda</p>
          </div>
        )}
      </div>
      
      {/* Footer con información */}
      {displayMode === 'modal' && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-600 dark:text-gray-400">
          💡 Tip: Usa las teclas ↑↓ para navegar, Enter para seleccionar, Esc para cerrar
        </div>
      )}
    </div>
  );

export default BranchSelectorContent