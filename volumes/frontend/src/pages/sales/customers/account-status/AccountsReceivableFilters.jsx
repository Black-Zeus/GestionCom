import React from "react";

const AccountsReceivableFilters = ({
  filters,
  onFilterChange,
  onClearFilters,
  disabled,
}) => {
  const handleChange = (field, value) => {
    onFilterChange({ ...filters, [field]: value });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          Parámetros de consulta
        </h2>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Fecha de corte */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Fecha de corte
          </label>
          <input
            type="date"
            value={filters.cutoffDate}
            onChange={(e) => handleChange("cutoffDate", e.target.value)}
            disabled={disabled}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Ver documentos */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Ver documentos
          </label>
          <select
            value={filters.view}
            onChange={(e) => handleChange("view", e.target.value)}
            disabled={disabled}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="OPEN">Pendientes (incluye vencidos)</option>
            <option value="OVERDUE">Solo vencidos</option>
            <option value="ALL">Todos (histórico)</option>
          </select>
        </div>

        {/* Espaciador */}
        <div></div>

        {/* Botón limpiar */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 invisible">
            Acción
          </label>
          <button
            onClick={onClearFilters}
            disabled={disabled}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Limpiar parámetros
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountsReceivableFilters;