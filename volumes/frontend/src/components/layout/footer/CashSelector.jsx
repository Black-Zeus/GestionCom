// ====================================
// CASH SELECTOR COMPONENT - USA STORE (sin mocks)
// Modal/Dropdown para selección y cambio de caja registradora
// ====================================

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { useLayoutStore } from "@/store/layoutStore";
import { useHeaderUser } from "@/store/headerStore";

/**
 * Normaliza una caja desde distintas estructuras posibles del store/props.
 */
const normalizeCash = (raw = {}) => ({
  id:
    raw.id ??
    raw.cash_id ??
    raw.cashRegisterId ??
    raw.register_id ??
    null,
  name:
    raw.name ??
    raw.label ??
    raw.register_name ??
    raw.display_name ??
    "",
  code:
    raw.code ??
    raw.pos_code ??
    raw.register_code ??
    "",
  status:
    raw.status ??
    raw.state ??
    "active",
  location:
    raw.location ??
    raw.branch ??
    raw.site ??
    raw.area ??
    "",
});

function CashSelector({
  isOpen = false,
  onClose,
  onCashChange,
  currentCash = "#1234",
  displayMode = "dropdown", // 'modal' | 'dropdown'
  cashRegisters = [], // si vienen por props, tienen prioridad
  position = { x: 0, y: 0 },
  className,
  ...props
}) {
  // ================================
  // STORE SOURCES
  // ================================
  const layoutContext = useLayoutStore((s) => s.layoutContext);
  const { company } = useHeaderUser() || {};

  // Posibles ubicaciones en store
  const storeCashRaw =
    cashRegisters?.length
      ? cashRegisters
      : layoutContext?.cashRegisters ??
        layoutContext?.availableCashRegisters ??
        layoutContext?.posRegisters ??
        company?.cashRegisters ??
        company?.posRegisters ??
        [];

  // Normalizar
  const dataCashRegisters = useMemo(
    () => (Array.isArray(storeCashRaw) ? storeCashRaw.map(normalizeCash) : []),
    [storeCashRaw]
  );

  // ================================
  // ESTADOS / REFS
  // ================================
  const selectorRef = useRef(null);
  const searchInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  // ================================
  // FILTRADO
  // ================================
  const filteredCashRegisters = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return dataCashRegisters;
    return dataCashRegisters.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const code = (c.code || "").toLowerCase();
      const loc = (c.location || "").toLowerCase();
      return name.includes(q) || code.includes(q) || loc.includes(q);
    });
  }, [dataCashRegisters, searchTerm]);

  // ================================
  // EFECTOS
  // ================================
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

  // ================================
  // HANDLERS
  // ================================
  const handleClose = () => {
    if (!isChanging) onClose?.();
  };

  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  const handleCashSelect = async (cash) => {
    if (cash.status !== "active" || isChanging) return;
    setIsChanging(true);
    try {
      // si necesitas latencia real, aquí iría la llamada al backend
      await new Promise((r) => setTimeout(r, 300));
      onCashChange?.(cash);
    } finally {
      setIsChanging(false);
    }
  };

  // ================================
  // EARLY RETURN
  // ================================
  if (!isOpen) return null;

  // ================================
  // UI
  // ================================
  const SelectorContent = () => (
    <div
      className={cn(
        displayMode === "modal"
          ? [
              "bg-white dark:bg-gray-800",
              "rounded-lg shadow-xl",
              "w-full max-w-md mx-4",
              "max-h-[80vh] overflow-hidden",
            ]
          : [
              "bg-white dark:bg-gray-800",
              "rounded-lg shadow-xl border border-gray-200 dark:border-gray-700",
              "w-80",
              "max-h-96 overflow-hidden",
            ],
        className
      )}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Cambiar Caja Registradora
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
            placeholder="Buscar caja..."
            value={searchTerm}
            onChange={handleSearchChange}
            disabled={isChanging}
            className={cn(
              "w-full px-3 py-2 pl-9",
              "border border-gray-300 dark:border-gray-600",
              "rounded-md bg-white dark:bg-gray-700",
              "text-gray-900 dark:text-gray-100",
              "placeholder-gray-500 dark:placeholder-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-orange-500",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>

      {/* Lista */}
      <div className="max-h-64 overflow-y-auto p-4 space-y-2">
        {filteredCashRegisters.length > 0 ? (
          filteredCashRegisters.map((cash) => {
            const isSelected = cash.name === currentCash;
            const isActive = cash.status === "active";
            return (
              <button
                key={`${cash.id ?? cash.code ?? cash.name}`}
                onClick={() => handleCashSelect(cash)}
                disabled={!isActive || isChanging}
                className={cn(
                  "w-full p-3 text-left transition-all duration-200",
                  "border border-transparent rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-orange-500",
                  isActive && "hover:bg-gray-50 dark:hover:bg-gray-700",
                  isSelected && [
                    "bg-orange-50 dark:bg-orange-900/20",
                    "border-orange-200 dark:border-orange-700",
                  ],
                  !isActive && [
                    "opacity-50 cursor-not-allowed",
                    "bg-gray-50 dark:bg-gray-800",
                  ],
                  isChanging && "opacity-50 cursor-wait"
                )}
              >
                <div className="flex items-center justify-between">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className={cn(
                          "font-semibold truncate",
                          isSelected
                            ? "text-orange-700 dark:text-orange-400"
                            : "text-gray-900 dark:text-gray-100"
                        )}
                      >
                        {cash.name || "Sin nombre"}
                      </h4>

                      {cash.code ? (
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">
                          {cash.code}
                        </span>
                      ) : null}

                      {isSelected && (
                        <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-1 rounded font-medium">
                          Actual
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        📍 {cash.location || "—"}
                      </span>

                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full",
                            cash.status === "active" && "bg-green-500",
                            cash.status === "maintenance" && "bg-yellow-500",
                            cash.status === "inactive" && "bg-red-500"
                          )}
                        />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {cash.status === "active" && "Activa"}
                          {cash.status === "maintenance" && "Mantenimiento"}
                          {cash.status === "inactive" && "Inactiva"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="text-orange-500 dark:text-orange-400">✓</div>
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No hay cajas registradoras disponibles
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {filteredCashRegisters.length} caja
          {filteredCashRegisters.length !== 1 ? "s" : ""}
          {searchTerm
            ? ` encontrada${filteredCashRegisters.length !== 1 ? "s" : ""}`
            : " disponible" + (filteredCashRegisters.length !== 1 ? "s" : "")}
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
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, 8px)",
      }}
      {...props}
    >
      <SelectorContent />

      {isChanging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-gray-800 bg-opacity-90 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <div className="animate-spin w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full" />
            <span>Cambiando...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default CashSelector;
