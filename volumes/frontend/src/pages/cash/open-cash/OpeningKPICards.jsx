import React from "react";
import { Icon } from "@components/ui/icon/iconManager";
import { formatCurrency } from "@/utils/formats";

/**
 * OpeningKPICards
 * Componente para mostrar las 4 tarjetas KPI del encabezado
 */
const OpeningKPICards = ({ kpis }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Sesiones abiertas hoy */}
      <div className="bg-blue-50 rounded-lg border border-blue-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">Sesiones abiertas hoy</div>
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Icon name="FaFileInvoice" className="text-blue-600 text-lg" />
          </div>
        </div>
        <div className="text-3xl font-bold text-gray-900">
          {kpis.sessionsOpenToday}
        </div>
      </div>

      {/* Sesiones cerradas año en curso */}
      <div className="bg-green-50 rounded-lg border border-green-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">Sesiones cerradas año en curso</div>
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Icon name="FaMoneyBillWave" className="text-green-600 text-lg" />
          </div>
        </div>
        <div className="text-3xl font-bold text-gray-900">
          {kpis.sessionsClosedYear}
        </div>
      </div>

      {/* Diferencia acumulada año */}
      <div className="bg-purple-50 rounded-lg border border-purple-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">Diferencia acumulada año</div>
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Icon name="FaReceipt" className="text-purple-600 text-lg" />
          </div>
        </div>
        <div
          className={`text-3xl font-bold ${
            kpis.diffYear >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {formatCurrency(kpis.diffYear)}
        </div>
      </div>

      {/* Indicador libre */}
      <div className="bg-orange-50 rounded-lg border border-orange-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">Indicador libre</div>
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Icon name="FaChartBar" className="text-orange-600 text-lg" />
          </div>
        </div>
        <div className="text-3xl font-bold text-gray-400">—</div>
      </div>
    </div>
  );
};

export default OpeningKPICards;