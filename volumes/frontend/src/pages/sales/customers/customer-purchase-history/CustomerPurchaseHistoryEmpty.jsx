import React from "react";

const CustomerPurchaseHistoryEmpty = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div className="text-center py-12">
        <div className="text-6xl mb-4">👥</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Selecciona un cliente
        </h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Para visualizar el historial de compras, utiliza el botón{" "}
          <strong>"Seleccionar Cliente"</strong> y elige un cliente desde el
          buscador.
        </p>
      </div>
    </div>
  );
};

export default CustomerPurchaseHistoryEmpty;
