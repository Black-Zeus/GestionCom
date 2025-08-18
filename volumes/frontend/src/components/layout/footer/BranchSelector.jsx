// ====================================
// BRANCH SELECTOR COMPONENT - USA STORE (headerStore.company)
// Modal/Dropdown para selección y cambio de sucursal
// ====================================

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { useHeaderUser } from "@/store/headerStore"; // ← tomamos company del store

/**
 * Normaliza una sucursal a { id, name, code, status }
 */
const normalizeBranch = (b = {}) => {
  // intenta deducir status
  let status = b.status || b.state || b.is_active;
  if (typeof status === "boolean") status = status ? "active" : "inactive";
  status = String(status || "active").toLowerCase(); // active | inactive | maintenance

  return {
    id: b.id ?? b.branch_id ?? b.code ?? b.name ?? Math.random().toString(36).slice(2),
    name: b.name ?? b.branch_name ?? "Sucursal",
    code: b.code ?? b.short_code ?? (b.name ? b.name.slice(0, 3).toUpperCase() : "N/A"),
    status,
  };
};

function BranchSelector({
  isOpen = false,
  onClose,
  onBranchChange,
  currentBranch,           // opcional: nombre de la sucursal actual
  displayMode = "dropdown", // 'modal' | 'dropdown'
  branches = [],            // opcional: si lo pasas por props tendrá prioridad
  position = { x: 0, y: 0 },
  className,
  ...props
}) {
  const selectorRef = useRef(null);
  const searchInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  // ===============================
  // Datos desde el STORE
  // ===============================
  const { company } = useHeaderUser() || {};

  // Lista de sucursales del store con varios posibles nombres de clave
  const storeBranchesRaw =
    company?.branches ??
    company?.availableBranches ??
    company?.sites ??
    company?.locations ??
    [];

  // Normaliza sucursales (store)
  const storeBranches = useMemo(
    () => (Array.isArray(storeBranchesRaw) ? storeBranchesRaw.map(normalizeBranch) : []),
    [storeBranchesRaw]
  );

  // Si vienen por props, tienen prioridad (y también se normalizan)
  const dataBranches = useMemo(
    () => (branches?.length ? branches.map(normalizeBranch) : storeBranches),
    [branches, storeBranches]
  );

  // Sucursal actual: props > store (varios posibles lugares/nombres)
  const currentBranchName =
    currentBranch ??
    company?.activeBranch?.name ??
    company?.current_branch?.name ??
    company?.currentBranch?.name ??
    company?.branch?.name ??
    "";

  // ===============================
  // Filtrado de sucursales
  // ===============================
  const filteredBranches = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return dataBranches;
    return dataBranches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        String(b.code).toLowerCase().includes(q)
    );
  }, [dataBranches, searchTerm]);

  // ===============================
  // Efectos
  // ===============================
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) onClose?.();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  // Cerrar al hacer click fuera (solo dropdown)
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
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, displayMode, onClose]);

  // ===============================
  // Handlers
  // ===============================
  const handleClose = () => {
    if (!isChanging) onClose?.();
  };

  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  const handleBranchSelect = async (branch) => {
    if (branch.status !== "active" || isChanging) return;
    setIsChanging(true);
    try {
      // Si necesitas llamar a un endpoint aquí, hazlo antes del callback.
      await new Promise((r) => setTimeout(r, 300)); // pequeño feedback
      onBranchChange?.(branch);
    } catch (err) {
      console.error("❌ Error cambiando sucursal:", err);
    } finally {
      setIsChanging(false);
    }
  };

  // ===============================
  // UI helpers
  // ===============================
  const statusDot = (status) =>
    cn(
      "w-2 h-2 rounded-full",
      status === "active" && "bg-green-500",
      status === "maintenance" && "bg-yellow-500",
      status === "inactive" && "bg-red-500"
    );

  const statusLabel = (status) =>
    status === "active"
      ? "Activa"
      : status === "maintenance"
      ? "Mantenimiento"
      : "Inactiva";

  if (!isOpen) return null;

  const SelectorContent = () => (
    <div
      className={cn(
        displayMode === "modal"
          ? [
              "bg-white dark:bg-gray-800",
              "rounded-lg shadow-xl",
              "w-full max-w-md mx-4",
              "max-h-[80vh] overflow-hidden",
              className,
            ]
          : [
              "bg-white dark:bg-gray-800",
              "rounded-lg shadow-xl border border-gray-200 dark:border-gray-700",
              "w-80",
              "max-h-96 overflow-hidden",
              className,
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

      {/* Lista */}
      <div className="max-h-64 overflow-y-auto p-4 space-y-2">
        {filteredBranches.length > 0 ? (
          filteredBranches.map((branch) => {
            const isSelected =
              branch.name === currentBranchName ||
              branch.code === currentBranchName;

            const isActive = branch.status === "active";

            return (
              <button
                key={branch.id}
                onClick={() => handleBranchSelect(branch)}
                disabled={!isActive || isChanging}
                className={cn(
                  "w-full p-3 text-left transition-all duration-200",
                  "border border-transparent rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500",
                  isActive && "hover:bg-gray-50 dark:hover:bg-gray-700",
                  isSelected && [
                    "bg-blue-50 dark:bg-blue-900/20",
                    "border-blue-200 dark:border-blue-700",
                  ],
                  !isActive && ["opacity-50 cursor-not-allowed", "bg-gray-50 dark:bg-gray-800"],
                  isChanging && "opacity-50 cursor-wait"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className={cn(
                          "font-semibold truncate",
                          isSelected ? "text-blue-700 dark:text-blue-400" : "text-gray-900 dark:text-gray-100"
                        )}
                      >
                        {branch.name}
                      </h4>
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">
                        {branch.code}
                      </span>
                      {isSelected && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded font-medium">
                          Actual
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={statusDot(branch.status)} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {statusLabel(branch.status)}
                      </span>
                    </div>
                  </div>

                  {isSelected && <div className="text-blue-500 dark:text-blue-400">✓</div>}
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

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {filteredBranches.length} sucursal
          {filteredBranches.length !== 1 ? "es" : ""}
          {searchTerm
            ? ` encontrada${filteredBranches.length !== 1 ? "s" : ""}`
            : ` disponible${filteredBranches.length !== 1 ? "s" : ""}`}
        </p>
      </div>
    </div>
  );

  // Render según modo
  if (displayMode === "modal") {
    return <SelectorContent />;
  }

  return (
    <div
      ref={selectorRef}
      className="fixed z-50"
      style={{ left: position.x, top: position.y, transform: "translate(-50%, 8px)" }}
      {...props}
    >
      <SelectorContent />

      {/* Loading overlay (dropdown) */}
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
