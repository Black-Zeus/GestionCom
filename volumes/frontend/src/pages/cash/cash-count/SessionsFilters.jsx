import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const SessionsFilters = ({
  filters,
  onFilterChange,
  onClearFilters,
  branches,
  registers,
  sessionStatuses,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Búsqueda general */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Búsqueda
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            placeholder="Código, cajero, caja..."
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Sucursal */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Sucursal
          </label>
          <select
            value={filters.branch}
            onChange={(e) => onFilterChange("branch", e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todas las sucursales</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.branch_code}>
                {branch.branch_name}
              </option>
            ))}
          </select>
        </div>

        {/* Caja */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Caja
          </label>
          <select
            value={filters.register}
            onChange={(e) => onFilterChange("register", e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todas las cajas</option>
            {registers.map((register) => (
              <option key={register.id} value={register.register_code}>
                {register.register_name}
              </option>
            ))}
          </select>
        </div>

        {/* Estado */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Estado
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange("status", e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            {sessionStatuses.map((status) => (
              <option key={status.code} value={status.code}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* Botón limpiar */}
        <div className="flex items-end">
          <button
            onClick={onClearFilters}
            className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="x" className="w-4 h-4" />
            Limpiar
          </button>
        </div>

      </div>

      {/* Filtros de fecha */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Fecha desde */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Fecha desde
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFilterChange("dateFrom", e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Fecha hasta */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Fecha hasta
          </label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFilterChange("dateTo", e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

      </div>
    </div>
  );
};

export default SessionsFilters;