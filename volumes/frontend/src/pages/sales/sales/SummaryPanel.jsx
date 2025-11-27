import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const SummaryPanel = ({
  totals,
  documentDiscount,
  documentDiscountType,
  onDocumentDiscountChange,
  onDocumentDiscountTypeChange,
  onCompleteSale,
  maxDiscountPercentage,
}) => {
  const handleToggleDiscountType = () => {
    onDocumentDiscountTypeChange(
      documentDiscountType === "percent" ? "amount" : "percent"
    );
    onDocumentDiscountChange(0); // Reset al cambiar tipo
  };

  return (
    <div className="w-96 flex-shrink-0">
      <div className="sticky top-8 p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Icon name="receipt" className="text-blue-600" />
          Resumen
        </h3>

        {/* Totales */}
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">Items:</span>
            <span className="text-sm font-bold text-gray-900">
              {totals.totalItems}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">Subtotal:</span>
            <span className="text-sm font-bold text-gray-900">
              ${totals.subtotal.toLocaleString("es-CL")}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">Descuentos línea:</span>
            <span className="text-sm font-bold text-red-600">
              -${totals.lineDiscount.toLocaleString("es-CL")}
            </span>
          </div>

          {/* Descuento del Documento */}
          <div className="py-2 border-b border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">
                Descuento documento:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={documentDiscount}
                onChange={(e) =>
                  onDocumentDiscountChange(
                    Math.max(0, parseFloat(e.target.value) || 0)
                  )
                }
                onFocus={(e) => e.target.select()}
                min="0"
                max={
                  documentDiscountType === "percent"
                    ? maxDiscountPercentage
                    : totals.subtotal - totals.lineDiscount
                }
                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
              <button
                onClick={handleToggleDiscountType}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-200 transition-all"
                title={
                  documentDiscountType === "percent"
                    ? "Cambiar a monto fijo"
                    : "Cambiar a porcentaje"
                }
              >
                {documentDiscountType === "percent" ? "%" : "$"}
              </button>
              <span className="text-sm font-bold text-red-600 min-w-[80px] text-right">
                -${totals.docDiscountAmount.toLocaleString("es-CL")}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">Neto:</span>
            <span className="text-sm font-bold text-gray-900">
              ${totals.neto.toLocaleString("es-CL")}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">IVA (19%):</span>
            <span className="text-sm font-bold text-gray-900">
              ${totals.iva.toLocaleString("es-CL")}
            </span>
          </div>

          <div className="flex justify-between items-center py-3 bg-blue-50 rounded-lg px-4 border-2 border-blue-200">
            <span className="text-base font-bold text-gray-900">TOTAL:</span>
            <span className="text-xl font-bold text-blue-600">
              ${totals.total.toLocaleString("es-CL")}
            </span>
          </div>
        </div>

        {/* Botón Completar Venta */}
        <button
          onClick={onCompleteSale}
          disabled={totals.totalItems === 0}
          className="w-full px-6 py-4 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
        >
          <Icon name="checkCircle" className="text-xl" />
          Completar Venta
        </button>
      </div>
    </div>
  );
};

export default SummaryPanel;