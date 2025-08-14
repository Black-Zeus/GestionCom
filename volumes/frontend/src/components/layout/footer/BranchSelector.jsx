// ====================================
// BRANCH SELECTOR COMPONENT - VERSIÓN SIMPLE FUNCIONAL
// Modal/Dropdown para selección y cambio de sucursal
// ====================================

import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";

/**
 * Componente para seleccionar y cambiar la sucursal activa
 * Versión simple que funciona tanto como modal como dropdown
 */
function BranchSelector({
  isOpen = false,
  onClose,
  onBranchChange,
  currentBranch = "Central",
  displayMode = "dropdown", // 'modal' | 'dropdown'
  branches = [],
  position = { x: 0, y: 0 },
  className,
  ...props
}) {
  // ====================================
  // ESTADOS Y REFS
  // ====================================
  const selectorRef = useRef(null);
  const searchInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  // ====================================
  // DATOS DE PRUEBA - Sucursales ficticias
  // ====================================
  const defaultBranches =
    branches.length > 0
      ? branches
      : [
          { id: 1, name: "Central", code: "CEN", status: "active" },
          { id: 2, name: "Mall Plaza", code: "MPZ", status: "active" },
          { id: 3, name: "Centro Histórico", code: "CHI", status: "active" },
          { id: 4, name: "Zona Norte", code: "ZNO", status: "maintenance" },
          { id: 5, name: "Aeropuerto", code: "AER", status: "active" },
        ];

  // ====================================
  // FILTRADO DE SUCURSALES
  // ====================================
  const filteredBranches = defaultBranches.filter(
    (branch) =>
      branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ====================================
  // EFECTOS
  // ====================================

  // Auto-focus en el input de búsqueda al abrir
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  // Cerrar al hacer click fuera (solo en modo dropdown)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        displayMode === "dropdown" &&
        isOpen &&
        selectorRef.current &&
        !selectorRef.current.contains(e.target)
      ) {
        onClose?.();
      }
    };

    if (isOpen && displayMode === "dropdown") {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, displayMode, onClose]);

  // ====================================
  // HANDLERS
  // ====================================

  const handleClose = () => {
    if (!isChanging) {
      onClose?.();
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleBranchSelect = async (branch) => {
    if (branch.status !== "active" || isChanging) return;

    setIsChanging(true);
    console.log("🏢 Cambiando a sucursal:", branch.name);

    try {
      // Simular delay de cambio
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Llamar callback
      onBranchChange?.(branch);

      console.log("✅ Sucursal cambiada exitosamente");
    } catch (error) {
      console.error("❌ Error cambiando sucursal:", error);
    } finally {
      setIsChanging(false);
    }
  };

  // ====================================
  // RENDER CONDICIONAL
  // ====================================

  if (!isOpen) return null;

  // ====================================
  // CONTENIDO DEL SELECTOR
  // ====================================

  const SelectorContent = () => (
    <div
      className={cn(
        displayMode === "modal"
          ? [
              // Estilos de modal
              "bg-white dark:bg-gray-800",
              "rounded-lg shadow-xl",
              "w-full max-w-md mx-4",
              "max-h-[80vh] overflow-hidden",
            ]
          : [
              // Estilos de dropdown
              "bg-white dark:bg-gray-800",
              "rounded-lg shadow-xl border border-gray-200 dark:border-gray-700",
              "w-80",
              "max-h-96 overflow-hidden",
            ]
      )}
    >
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
          filteredBranches.map((branch) => {
            const isSelected = branch.name === currentBranch;
            const isActive = branch.status === "active";

            return (
              <button
                key={branch.id}
                onClick={() => handleBranchSelect(branch)}
                disabled={!isActive || isChanging}
                className={cn(
                  // Layout base
                  "w-full p-3 text-left transition-all duration-200",
                  "border border-transparent rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500",

                  // Estados base
                  isActive && "hover:bg-gray-50 dark:hover:bg-gray-700",

                  // Estado seleccionado
                  isSelected && [
                    "bg-blue-50 dark:bg-blue-900/20",
                    "border-blue-200 dark:border-blue-700",
                  ],

                  // Estado deshabilitado
                  !isActive && [
                    "opacity-50 cursor-not-allowed",
                    "bg-gray-50 dark:bg-gray-800",
                  ],

                  // Estado cargando
                  isChanging && "opacity-50 cursor-wait"
                )}
              >
                <div className="flex items-center justify-between">
                  {/* Información principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {/* Nombre de la sucursal */}
                      <h4
                        className={cn(
                          "font-semibold",
                          isSelected
                            ? "text-blue-700 dark:text-blue-400"
                            : "text-gray-900 dark:text-gray-100",
                          "truncate"
                        )}
                      >
                        {branch.name}
                      </h4>

                      {/* Código */}
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">
                        {branch.code}
                      </span>

                      {/* Indicador actual */}
                      {isSelected && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded font-medium">
                          Actual
                        </span>
                      )}
                    </div>

                    {/* Estado */}
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          branch.status === "active" && "bg-green-500",
                          branch.status === "maintenance" && "bg-yellow-500",
                          branch.status === "inactive" && "bg-red-500"
                        )}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {branch.status === "active" && "Activa"}
                        {branch.status === "maintenance" && "Mantenimiento"}
                        {branch.status === "inactive" && "Inactiva"}
                      </span>
                    </div>
                  </div>

                  {/* Icono de selección */}
                  {isSelected && (
                    <div className="text-blue-500 dark:text-blue-400">✓</div>
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No se encontraron sucursales
          </div>
        )}
      </div>

      {/* Footer con información */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {filteredBranches.length} sucursal
          {filteredBranches.length !== 1 ? "es" : ""}
          {searchTerm
            ? ` encontrada${filteredBranches.length !== 1 ? "s" : ""}`
            : " disponible" + (filteredBranches.length !== 1 ? "s" : "")}
        </p>
      </div>
    </div>
  );

  // ====================================
  // RENDER SEGÚN MODO
  // ====================================

  if (displayMode === "modal") {
    // Modo Modal - El contenido se renderiza directamente
    return <SelectorContent />;
  }

  // Modo Dropdown - Posicionamiento absoluto
  return (
    <div
      ref={selectorRef}
      className="fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, 8px)",
      }}
      {...props}
    >
      <SelectorContent />

      {/* Loading Overlay para dropdown */}
      {isChanging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-gray-800 bg-opacity-90 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span>Cambiando...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default BranchSelector;
