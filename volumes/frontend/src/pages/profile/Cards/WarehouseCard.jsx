// ====================================
// volumes/frontend/src/pages/profile/Cards/WarehouseCard.jsx
// Card de acceso a bodegas del usuario (usa store -> userProfile)
// ====================================

import React, { useMemo, useState } from "react";
import { useUserProfile } from "@/store/authStore";
import { shouldLog } from "@/utils/environment";

const WarehouseCard = () => {
  const userProfile = useUserProfile();
  const [showAllWarehouses, setShowAllWarehouses] = useState(false);

  // -----------------------------
  // Normalizadores y utilidades
  // -----------------------------

  const toAccessCode = (raw) => {
    if (!raw) return "DENIED";
    const s = String(raw).toUpperCase();
    if (["FULL", "READ_ONLY", "DENIED"].includes(s)) return s;
    // Alias comunes
    if (["READ", "RO"].includes(s)) return "READ_ONLY";
    if (["RW", "WRITE", "MANAGER", "ADMIN", "OWNER"].includes(s)) return "FULL";
    return "DENIED";
  };

  const normalizeAccess = (a) => {
    // Admite formatos variados de backend
    const w = a.warehouse || {};
    const warehouse = {
      id: w.id ?? a.warehouse_id ?? a.id ?? null,
      name: w.name ?? a.warehouse_name ?? a.name ?? "Bodega",
      type: (w.type ?? a.warehouse_type ?? "BRANCH").toUpperCase(),
      location: w.location ?? a.warehouse_location ?? a.location ?? "—",
    };

    return {
      warehouse,
      access_type: toAccessCode(a.access_type ?? a.accessType),
      granted_at: a.granted_at ?? a.grantedAt ?? null,
      reason: a.reason ?? a.notes ?? null,
      is_responsible:
        a.is_responsible ??
        a.responsible ??
        a.role === "RESPONSIBLE" ??
        false,
      role: a.role ?? null,
    };
  };

  const normalizeResponsible = (r) => {
    const w = r.warehouse || r;
    return {
      name: w.name ?? "Bodega",
      location: w.location ?? "—",
      type: (w.type ?? "BRANCH").toUpperCase(),
    };
  };

  // -----------------------------
  // Datos derivados del store
  // -----------------------------

  const accesses = useMemo(() => {
    const list = Array.isArray(userProfile?.warehouseAccesses)
      ? userProfile.warehouseAccesses
      : [];
    const norm = list.map(normalizeAccess);
    if (shouldLog()) console.log("🏬 Accesses (norm):", norm);
    return norm;
  }, [userProfile]);

  const stats = useMemo(() => {
    const total =
      userProfile?.warehouseCount != null
        ? userProfile.warehouseCount
        : accesses.length;

    const full = accesses.filter((x) => x.access_type === "FULL").length;
    const readOnly = accesses.filter((x) => x.access_type === "READ_ONLY").length;
    const denied = accesses.filter((x) => x.access_type === "DENIED").length;

    return {
      total,
      full_access_count: full,
      read_only_count: readOnly,
      denied_count: denied,
    };
  }, [userProfile, accesses]);

  const responsibleWarehouses = useMemo(() => {
    // Si el backend entrega un arreglo explícito
    if (Array.isArray(userProfile?.responsibleWarehouses)) {
      return userProfile.responsibleWarehouses.map(normalizeResponsible);
    }
    // Derivar desde los accesos marcados como responsables
    return accesses
      .filter((a) => a.is_responsible)
      .map((a) => normalizeResponsible({ warehouse: a.warehouse }));
  }, [userProfile, accesses]);

  const displayedWarehouses = showAllWarehouses
    ? accesses
    : accesses.slice(0, 4);

  // -----------------------------
  // UI helpers
  // -----------------------------

  const getAccessTypeBadge = (accessType) => {
    const types = {
      FULL: { color: "text-green-800 dark:text-green-300", icon: "✅", text: "Completo" },
      READ_ONLY: { color: "text-blue-800 dark:text-blue-300", icon: "👁️", text: "Solo lectura" },
      DENIED: { color: "text-red-800 dark:text-red-300", icon: "❌", text: "Denegado" },
    };
    const type = types[accessType] || types.DENIED;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${type.color}`}>
        <span className="mr-1">{type.icon}</span>
        {type.text}
      </span>
    );
  };

  const getWarehouseIcon = (warehouseType) => {
    const t = String(warehouseType || "").toUpperCase();
    const icons = {
      MAIN: "🏢",
      BRANCH: "🏪",
      STORAGE: "📦",
      TRANSIT: "🚚",
      VIRTUAL: "💾",
    };
    return icons[t] || "🏪";
  };

  // -----------------------------
  // Empty states
  // -----------------------------

  if (!userProfile) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Cargando perfil de usuario…
        </div>
      </div>
    );
  }

  // -----------------------------
  // Render
  // -----------------------------

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
            <span className="text-indigo-600 dark:text-indigo-400 text-lg">🏪</span>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Acceso a Bodegas</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Bodegas asignadas y nivel de acceso</p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
        </div>
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.full_access_count}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Completo</div>
        </div>
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.read_only_count}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Lectura</div>
        </div>
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-xl font-bold text-red-600 dark:text-red-400">{stats.denied_count}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Denegado</div>
        </div>
      </div>

      {/* Bodegas responsable */}
      {responsibleWarehouses.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Bodegas bajo tu responsabilidad
          </h4>
          <div className="space-y-2">
            {responsibleWarehouses.map((w, idx) => (
              <div
                key={`resp-${idx}`}
                className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getWarehouseIcon(w.type)}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{w.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{w.location}</div>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-yellow-800 dark:text-yellow-200">
                  👑 Responsable
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de accesos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Todos los Accesos</h4>
          {accesses.length > 4 && (
            <button
              onClick={() => setShowAllWarehouses((v) => !v)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium"
            >
              {showAllWarehouses ? "Ver menos" : `Ver todas (${accesses.length})`}
            </button>
          )}
        </div>

        {accesses.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg">
            No tienes accesos a bodegas asignados.
          </div>
        ) : (
          <div className="space-y-3">
            {displayedWarehouses.map((access, index) => (
              <div
                key={`acc-${index}`}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getWarehouseIcon(access.warehouse.type)}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {access.warehouse.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {access.warehouse.location} • {access.warehouse.type}
                    </div>
                    {access.reason && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{access.reason}</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {getAccessTypeBadge(access.access_type)}
                  {access.granted_at && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Desde: {new Date(access.granted_at).toLocaleDateString("es-CL")}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Información adicional */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Accesos actualizados automáticamente</span>
          <span>
            {responsibleWarehouses.length > 0 &&
              `Responsable de ${responsibleWarehouses.length} bodega${responsibleWarehouses.length !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WarehouseCard;
