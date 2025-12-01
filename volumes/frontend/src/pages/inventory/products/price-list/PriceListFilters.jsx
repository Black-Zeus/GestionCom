import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const PriceListFilters = ({ filters, onFilterChange, onClearFilters }) => {
  const hasActiveFilters = filters.search || filters.active !== "ALL";

  return (
    <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Filtros de Búsqueda
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Búsqueda por texto */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar
          </label>
          <div className="relative">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
            />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange("search", e.target.value)}
              placeholder="Código, nombre, SKU..."
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
            />
          </div>
        </div>

        {/* Filtro por estado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado
          </label>
          <select
            value={filters.active}
            onChange={(e) => onFilterChange("active", e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
          >
            <option value="ALL">Todos</option>
            <option value="ACTIVE">Solo activos</option>
            <option value="INACTIVE">Solo inactivos</option>
          </select>
        </div>
      </div>

      {/* Botón Limpiar Filtros */}
      {hasActiveFilters && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClearFilters}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <Icon name="close" className="text-lg" />
            Limpiar Filtros
          </button>
        </div>
      )}
    </div>
  );
};

export default PriceListFilters;