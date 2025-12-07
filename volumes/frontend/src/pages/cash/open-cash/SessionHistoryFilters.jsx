import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

/**
 * SessionHistoryFilters
 * Componente con los filtros de búsqueda del historial
 */
const SessionHistoryFilters = ({
  filters,
  branches,
  registers,
  onFilterChange,
  onClearFilters,
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 mb-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Icon name="FaFilter" className="text-blue-600 text-xl" />
          <h2 className="text-lg font-medium text-gray-900">
            Filtros de Búsqueda
          </h2>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Defina los parámetros para consultar el historial de aperturas de
          caja del usuario.
        </p>
      </div>

      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Desde */}
          <div>
            <label
              htmlFor="filterDateFrom"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Desde
            </label>
            <input
              type="date"
              id="filterDateFrom"
              value={filters.dateFrom}
              onChange={(e) => onFilterChange("dateFrom", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* Hasta */}
          <div>
            <label
              htmlFor="filterDateTo"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Hasta
            </label>
            <input
              type="date"
              id="filterDateTo"
              value={filters.dateTo}
              onChange={(e) => onFilterChange("dateTo", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* Sucursal */}
          <div>
            <label
              htmlFor="filterBranchSelect"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Sucursal
            </label>
            <select
              id="filterBranchSelect"
              value={filters.branchId}
              onChange={(e) => onFilterChange("branchId", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">Todas las sucursales</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_name}
                </option>
              ))}
            </select>
          </div>

          {/* Caja */}
          <div>
            <label
              htmlFor="filterRegisterSelect"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Caja
            </label>
            <select
              id="filterRegisterSelect"
              value={filters.registerId}
              onChange={(e) => onFilterChange("registerId", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">Todas las cajas</option>
              {registers.map((register) => (
                <option key={register.id} value={register.id}>
                  {register.register_code} - {register.register_name}
                </option>
              ))}
            </select>
          </div>

          {/* Botones */}
          <div className="flex items-end gap-2">
            <button
              onClick={onClearFilters}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="FaTimes" />
              Limpiar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionHistoryFilters;