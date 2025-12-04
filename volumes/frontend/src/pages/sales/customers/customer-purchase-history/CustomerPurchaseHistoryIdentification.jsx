import React from "react";

const CustomerPurchaseHistoryIdentification = ({
  selectedCustomer,
  onOpenSearch,
}) => {
  const getCustomerDisplayName = () => {
    if (!selectedCustomer) return "Ningún cliente seleccionado";
    return (
      selectedCustomer.commercial_name || selectedCustomer.legal_name || "-"
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          Identificación del cliente
        </h2>
      </div>

      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Cliente seleccionado
          </label>
          <div className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900">
            {getCustomerDisplayName()}
          </div>
        </div>
        <button
          onClick={onOpenSearch}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          Seleccionar Cliente
        </button>
      </div>
    </div>
  );
};

export default CustomerPurchaseHistoryIdentification;
