import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import { formatCurrency } from "@/utils/formats";

/**
 * CashDenominationsForm
 * Formulario para contar denominaciones de efectivo - estilos corregidos (tema claro)
 */
const CashDenominationsForm = ({
  session,
  theoreticalCash,
  cashDenominationsCatalog,
  onSave,
  onCancel,
}) => {
  const [denominations, setDenominations] = useState({});
  const [closingNotes, setClosingNotes] = useState("");

  useEffect(() => {
    // Inicializar denominaciones en 0
    const initialDenominations = {};
    cashDenominationsCatalog.forEach((denom) => {
      initialDenominations[denom.value] = 0;
    });
    setDenominations(initialDenominations);
  }, [cashDenominationsCatalog]);

  const handleDenominationChange = (value, quantity) => {
    const qty = parseInt(quantity) || 0;
    setDenominations({ ...denominations, [value]: qty });
  };

  const calculateTotalPhysical = () => {
    return Object.entries(denominations).reduce(
      (total, [value, quantity]) => total + parseInt(value) * quantity,
      0
    );
  };

  const calculateDifference = () => {
    return calculateTotalPhysical() - theoreticalCash;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const physicalAmount = calculateTotalPhysical();
    const difference = calculateDifference();

    const closingData = {
      closing_datetime: new Date().toISOString(),
      theoretical_amount: theoreticalCash,
      physical_amount: physicalAmount,
      difference_amount: difference,
      closing_notes: closingNotes,
    };

    onSave(closingData);
  };

  const totalPhysical = calculateTotalPhysical();
  const difference = calculateDifference();

  // Agrupar denominaciones
  const billsOver10k = cashDenominationsCatalog.filter((d) => d.value >= 10000);
  const billsUnder10k = cashDenominationsCatalog.filter(
    (d) => d.value >= 1000 && d.value < 10000
  );
  const coins = cashDenominationsCatalog.filter((d) => d.value < 1000);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Resumen de arqueo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-xs text-purple-600 font-medium">
            Teórico en Efectivo
          </div>
          <div className="text-lg font-semibold text-purple-900 mt-1">
            {formatCurrency(theoreticalCash)}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium">Físico Contado</div>
          <div className="text-lg font-semibold text-blue-900 mt-1">
            {formatCurrency(totalPhysical)}
          </div>
        </div>

        <div
          className={`border rounded-lg p-3 ${
            difference === 0
              ? "bg-green-50 border-green-200"
              : difference > 0
              ? "bg-blue-50 border-blue-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <div
            className={`text-xs font-medium ${
              difference === 0
                ? "text-green-600"
                : difference > 0
                ? "text-blue-600"
                : "text-red-600"
            }`}
          >
            Diferencia
          </div>
          <div
            className={`text-lg font-semibold mt-1 ${
              difference === 0
                ? "text-green-900"
                : difference > 0
                ? "text-blue-900"
                : "text-red-900"
            }`}
          >
            {formatCurrency(difference)}
          </div>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Icon name="FaInfoCircle" className="text-blue-600 text-base mt-0.5" />
          <div className="text-sm text-blue-900">
            Ingrese la cantidad de billetes y monedas contados físicamente en la
            caja. El sistema calculará automáticamente el total y la diferencia.
          </div>
        </div>
      </div>

      {/* Billetes mayores a $10.000 */}
      {billsOver10k.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Billetes mayores a $10.000
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {billsOver10k.map((denom) => (
              <div key={denom.value} className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  {denom.label}
                </label>
                <input
                  type="number"
                  min="0"
                  value={denominations[denom.value] || 0}
                  onChange={(e) =>
                    handleDenominationChange(denom.value, e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="text-xs text-gray-600">
                  = {formatCurrency(denom.value * (denominations[denom.value] || 0))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billetes menores a $10.000 */}
      {billsUnder10k.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Billetes menores a $10.000
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {billsUnder10k.map((denom) => (
              <div key={denom.value} className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  {denom.label}
                </label>
                <input
                  type="number"
                  min="0"
                  value={denominations[denom.value] || 0}
                  onChange={(e) =>
                    handleDenominationChange(denom.value, e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="text-xs text-gray-600">
                  = {formatCurrency(denom.value * (denominations[denom.value] || 0))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monedas */}
      {coins.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Monedas</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {coins.map((denom) => (
              <div key={denom.value} className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  {denom.label}
                </label>
                <input
                  type="number"
                  min="0"
                  value={denominations[denom.value] || 0}
                  onChange={(e) =>
                    handleDenominationChange(denom.value, e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="text-xs text-gray-600">
                  = {formatCurrency(denom.value * (denominations[denom.value] || 0))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notas de cierre */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Notas de Cierre (opcional)
        </label>
        <textarea
          value={closingNotes}
          onChange={(e) => setClosingNotes(e.target.value)}
          rows={3}
          placeholder="Ingrese cualquier observación relevante sobre el cierre de caja..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>
    </form>
  );
};

export default CashDenominationsForm;