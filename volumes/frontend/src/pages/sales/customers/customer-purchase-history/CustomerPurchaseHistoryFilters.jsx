import React from "react";

const CustomerPurchaseHistoryFilters = ({
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
          Filtros de compras
        </h2>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Fecha desde */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Desde</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleChange("dateFrom", e.target.value)}
            disabled={disabled}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Fecha hasta */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Hasta</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleChange("dateTo", e.target.value)}
            disabled={disabled}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Tipo documento */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Tipo documento
          </label>
          <select
            value={filters.documentType}
            onChange={(e) => handleChange("documentType", e.target.value)}
            disabled={disabled}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="ALL">Todos</option>
            <option value="FACTURA">Factura</option>
            <option value="BOLETA">Boleta</option>
            <option value="NC">Nota de Crédito</option>
          </select>
        </div>

        {/* Condición de pago */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Condición de pago
          </label>
          <select
            value={filters.paymentCondition}
            onChange={(e) => handleChange("paymentCondition", e.target.value)}
            disabled={disabled}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="ALL">Todas</option>
            <option value="CONTADO">Contado</option>
            <option value="CREDITO">Crédito</option>
          </select>
        </div>

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
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerPurchaseHistoryFilters;
