import React from "react";

const CreditManagementFilters = ({
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  const handleChange = (field, value) => {
    onFilterChange({ ...filters, [field]: value });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Filtros</h2>
      </div>

      {/* Primera fila: Búsqueda y Estado */}
      <div className="grid grid-cols-6 gap-4 mb-4">
        {/* Búsqueda - ocupa 2 columnas */}
        <div className="col-span-3 flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Buscar</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleChange("search", e.target.value)}
            placeholder="Código, RUT, Razón Social, Contacto..."
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Estado de crédito - ocupa 1 columna */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Estado</label>
          <select
            value={filters.creditStatus}
            onChange={(e) => handleChange("creditStatus", e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
          >
            <option value="ALL">Todos</option>
            <option value="NORMAL">Normal</option>
            <option value="EN_MORA">Con mora</option>
            <option value="BLOQUEADO">Bloqueado</option>
          </select>
        </div>

        {/* Riesgo - ocupa 1 columna */}
        <div className="flex flex-col gap-2 ">
          <label className="text-sm font-medium text-gray-700">Riesgo</label>
          <select
            value={filters.risk}
            onChange={(e) => handleChange("risk", e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
          >
            <option value="ALL">Todos</option>
            <option value="LOW">Bajo</option>
            <option value="MEDIUM">Medio</option>
            <option value="HIGH">Alto</option>
          </select>
        </div>

        {/* Botón limpiar filtros - ocupa 1 columna */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 invisible">
            Acción
          </label>
          <button
            onClick={onClearFilters}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreditManagementFilters;
