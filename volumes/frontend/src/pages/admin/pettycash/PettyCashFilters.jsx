import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const PettyCashFilters = ({ filters, onFilterChange, onClearFilters, warehouses }) => {
  const handleSearchChange = (e) => {
    onFilterChange("search", e.target.value);
  };

  const handleWarehouseChange = (e) => {
    onFilterChange("warehouse", e.target.value);
  };

  const handleStatusChange = (e) => {
    onFilterChange("status", e.target.value);
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
          value={filters.search || ""}
          onChange={handleSearchChange}
          placeholder="Buscar por código, responsable o bodega..."
          className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all"
        />
      </div>

      {/* Selects + botón */}
      <div className="flex gap-3 flex-wrap items-center">
        {/* Bodega */}
        <select
          value={filters.warehouse}
          onChange={handleWarehouseChange}
          className="px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-white cursor-pointer focus:outline-none focus:border-green-600 transition-all min-w-[180px]"
        >
          <option value="">Todas las bodegas</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>

        {/* Estado */}
        <select
          value={filters.status}
          onChange={handleStatusChange}
          className="px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-white cursor-pointer focus:outline-none focus:border-green-600 transition-all min-w-[180px]"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activos</option>
          <option value="SUSPENDED">Suspendidos</option>
          <option value="PENDING_ACCEPTANCE">Pendiente Aceptación</option>
          <option value="CLOSED">Cerrados</option>
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

export default PettyCashFilters;
