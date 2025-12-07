import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";

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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);
  };

  const handleDenominationChange = (value, quantity) => {
    const qty = parseInt(quantity) || 0;
    setDenominations({ ...denominations, [value]: qty });
  };

  const calculateTotalPhysical = () => {
    return Object.entries(denominations).reduce(
      (total, [value, quantity]) => total + value * quantity,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Resumen de arqueo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-gradient-to-br from-slate-700/65 to-slate-950 border border-slate-600/50">
          <div className="text-xs text-gray-400">Teórico en Efectivo</div>
          <div className="text-lg font-mono text-gray-200 mt-1">
            {formatCurrency(theoreticalCash)}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-900/40 to-slate-950 border border-blue-500/50">
          <div className="text-xs text-gray-400">Físico Contado</div>
          <div className="text-lg font-mono text-blue-300 mt-1">
            {formatCurrency(totalPhysical)}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-gradient-to-br from-slate-700/65 to-slate-950 border border-slate-600/50">
          <div className="text-xs text-gray-400">Diferencia</div>
          <div
            className={`text-lg font-mono mt-1 ${
              difference === 0
                ? "text-green-400"
                : difference > 0
                ? "text-blue-400"
                : "text-red-400"
            }`}
          >
            {formatCurrency(difference)}
          </div>
        </div>
      </div>

      {/* Formulario de denominaciones */}
      <div className="p-3 rounded-xl border border-slate-700/90 bg-gradient-to-br from-slate-800/70 to-slate-950">
        <div className="text-sm font-medium text-indigo-300 mb-3">
          Conteo de Billetes y Monedas
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {cashDenominationsCatalog.map((denom) => {
            const quantity = denominations[denom.value] || 0;
            const subtotal = denom.value * quantity;

            return (
              <div
                key={denom.value}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-700/50"
              >
                <div className="flex-1">
                  <div className="text-xs text-gray-400">Denominación</div>
                  <div className="text-sm font-medium text-gray-200">
                    {denom.label}
                  </div>
                </div>

                <div className="w-20">
                  <div className="text-xs text-gray-400 text-center">Cant.</div>
                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) =>
                      handleDenominationChange(denom.value, e.target.value)
                    }
                    className="w-full rounded border border-slate-700/90 bg-slate-900/95 px-2 py-1 text-gray-200 text-sm text-center focus:outline-2 focus:outline-blue-500/80 focus:outline-offset-0"
                  />
                </div>

                <div className="w-28 text-right">
                  <div className="text-xs text-gray-400">Subtotal</div>
                  <div className="text-sm font-mono text-gray-200">
                    {formatCurrency(subtotal)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total físico */}
        <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-between items-center">
          <span className="text-sm font-medium text-gray-300">
            Total Físico Contado:
          </span>
          <span className="text-lg font-mono text-blue-300">
            {formatCurrency(totalPhysical)}
          </span>
        </div>
      </div>

      {/* Notas de cierre */}
      <div className="flex flex-col gap-1 text-sm">
        <label className="text-xs text-gray-300 flex items-center gap-1.5">
          <Icon name="file-text" className="text-gray-400" />
          Notas de Cierre
        </label>
        <textarea
          value={closingNotes}
          onChange={(e) => setClosingNotes(e.target.value)}
          placeholder="Observaciones sobre el cierre y arqueo..."
          rows={3}
          className="resize-vertical min-h-[70px] rounded-lg border border-slate-700/90 bg-slate-900/95 px-2 py-1.5 text-gray-200 text-sm focus:outline-2 focus:outline-blue-500/80 focus:outline-offset-0"
        />
        <span className="text-xs text-gray-400">
          Incluya cualquier diferencia detectada y su justificación
        </span>
      </div>

      {/* Alerta si hay diferencia */}
      {difference !== 0 && (
        <div
          className={`p-3 rounded-lg border ${
            difference > 0
              ? "bg-blue-900/12 border-blue-500/40 text-blue-300"
              : "bg-red-900/12 border-red-500/40 text-red-300"
          } text-sm`}
        >
          <div className="flex items-start gap-2">
            <Icon
              name="alert-circle"
              className={difference > 0 ? "text-blue-400" : "text-red-400"}
            />
            <div>
              <div className="font-medium">
                {difference > 0 ? "Sobrante detectado" : "Faltante detectado"}
              </div>
              <div className="text-xs mt-1 opacity-90">
                {difference > 0
                  ? "Hay más efectivo del esperado. Verifique el conteo y registre la justificación en las notas."
                  : "Hay menos efectivo del esperado. Verifique el conteo y registre la justificación en las notas."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-end gap-2 pt-3 border-t border-slate-800/90">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-transparent text-gray-200 border border-slate-700/80 rounded-full text-sm hover:bg-slate-800/50 transition-colors"
        >
          <Icon name="x" />
          Cancelar
        </button>
        <button
          type="submit"
          className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-green-500 to-blue-500 text-slate-900 border border-green-600/80 rounded-full text-sm font-medium hover:shadow-lg transition-all"
        >
          <Icon name="check" />
          Cerrar Sesión
        </button>
      </div>
    </form>
  );
};

export default CashDenominationsForm;