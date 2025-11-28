import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const SalesHistoryFilters = ({
  filters,
  onFilterChange,
  onClearFilters,
  documentTypes,
  customers,
  users,
  series,
  statuses,
}) => {
  const handleChange = (field, value) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const handleToggleReturns = () => {
    onFilterChange({ ...filters, includeReturns: !filters.includeReturns });
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="filter" className="text-blue-600 text-xl" />
          Filtros de Búsqueda
        </h3>
        <button
          onClick={onClearFilters}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-all"
        >
          <Icon name="close" className="text-base" />
          Limpiar Filtros
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        {/* Búsqueda general */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Búsqueda General
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleChange("search", e.target.value)}
            placeholder="N° Doc, Cliente, RUT..."
            className="px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Fecha desde */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Fecha Desde
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleChange("dateFrom", e.target.value)}
            className="px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Fecha hasta */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Fecha Hasta
          </label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleChange("dateTo", e.target.value)}
            className="px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Tipo de documento */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Tipo de Documento
          </label>
          <select
            value={filters.documentType}
            onChange={(e) => handleChange("documentType", e.target.value)}
            className="px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
          >
            <option value="">Todos los tipos</option>
            {documentTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.document_type_name}
              </option>
            ))}
          </select>
        </div>

        {/* Estado */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Estado</label>
          <select
            value={filters.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
          >
            <option value="">Todos los estados</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.status_display_es}
              </option>
            ))}
          </select>
        </div>

        {/* Usuario/Vendedor */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Vendedor
          </label>
          <select
            value={filters.user}
            onChange={(e) => handleChange("user", e.target.value)}
            className="px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
          >
            <option value="">Todos los vendedores</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Checkbox para incluir devoluciones */}
      <div className="flex items-center gap-2 mt-4">
        <input
          type="checkbox"
          id="includeReturns"
          checked={filters.includeReturns}
          onChange={handleToggleReturns}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label
          htmlFor="includeReturns"
          className="text-sm font-medium text-gray-700 cursor-pointer"
        >
          Incluir devoluciones en los resultados
        </label>
      </div>
    </div>
  );
};

export default SalesHistoryFilters;