import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const SalesHistorySummary = ({ summary }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
      {/* Total Documentos */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Documentos</p>
            <p className="text-2xl font-bold text-blue-600">
              {summary.totalDocuments}
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Icon name="document" className="text-blue-600 text-xl" />
          </div>
        </div>
      </div>

      {/* Total Ventas */}
      <div className="bg-green-50 rounded-lg p-4 border border-green-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Ventas</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalSales)}
            </p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <Icon name="money" className="text-green-600 text-xl" />
          </div>
        </div>
      </div>

      {/* Total IVA */}
      <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total IVA</p>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(summary.totalTax)}
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <Icon name="receipt" className="text-purple-600 text-xl" />
          </div>
        </div>
      </div>

      {/* Total Descuentos */}
      <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Descuentos</p>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(summary.totalDiscount)}
            </p>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <Icon name="discount" className="text-orange-600 text-xl" />
          </div>
        </div>
      </div>

      {/* Promedio por Venta */}
      <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Promedio por Venta</p>
            <p className="text-2xl font-bold text-indigo-600">
              {formatCurrency(summary.averageSale)}
            </p>
          </div>
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Icon name="chart" className="text-indigo-600 text-xl" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesHistorySummary;