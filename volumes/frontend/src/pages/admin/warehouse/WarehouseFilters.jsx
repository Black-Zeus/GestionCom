import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const WarehouseFilters = ({ filters, onFilterChange, onClearFilters }) => {
  const handleSearchChange = (e) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  const handleTypeChange = (e) => {
    onFilterChange({ ...filters, type: e.target.value });
  };

  const handleStatusChange = (e) => {
    onFilterChange({ ...filters, status: e.target.value });
  };

  return (
    <div className="flex gap-4 mb-6 flex-wrap">
      {/* Búsqueda */}
      <div className="flex-1 min-w-[250px] relative">
        <Icon
          name="search"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={filters.search}
          onChange={handleSearchChange}
          placeholder="Buscar por código, nombre o ciudad..."
          className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
        />
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filters.type}
          onChange={handleTypeChange}
          className="px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-white cursor-pointer focus:outline-none focus:border-blue-600 transition-all"
        >
          <option value="">Todos los tipos</option>
          <option value="WAREHOUSE">Bodega</option>
          <option value="STORE">Tienda</option>
          <option value="OUTLET">Outlet</option>
        </select>

        <select
          value={filters.status}
          onChange={handleStatusChange}
          className="px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-white cursor-pointer focus:outline-none focus:border-blue-600 transition-all"
        >
          <option value="">Todos los estados</option>
          <option value="1">Activos</option>
          <option value="0">Inactivos</option>
        </select>

        <button
          onClick={onClearFilters}
          className="px-6 py-3 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-all hover:-translate-y-0.5 flex items-center gap-2"
        >
          <Icon name="close" className="text-sm" />
          Limpiar
        </button>
      </div>
    </div>
  );
};

export default WarehouseFilters;
