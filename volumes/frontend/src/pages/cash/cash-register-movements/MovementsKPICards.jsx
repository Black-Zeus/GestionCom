import React from "react";
import { Icon } from "@components/ui/icon/iconManager";
import { formatCurrency } from "@/utils/formats";

/**
 * MovementsKPICards
 * Tarjetas KPI para el módulo de movimientos
 */
const MovementsKPICards = ({ kpis }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total sesiones */}
      <div className="bg-blue-50 rounded-lg border border-blue-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">Total sesiones</div>
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Icon name="FaCashRegister" className="text-blue-600 text-lg" />
          </div>
        </div>
        <div className="text-3xl font-bold text-gray-900">
          {kpis.totalSessions}
        </div>
      </div>

      {/* Total movimientos */}
      <div className="bg-green-50 rounded-lg border border-green-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">Total movimientos</div>
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Icon name="FaList" className="text-green-600 text-lg" />
          </div>
        </div>
        <div className="text-3xl font-bold text-gray-900">
          {kpis.totalMovements}
        </div>
      </div>

      {/* Total ventas efectivo */}
      <div className="bg-purple-50 rounded-lg border border-purple-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">Total ventas (efectivo)</div>
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Icon name="FaMoneyBillWave" className="text-purple-600 text-lg" />
          </div>
        </div>
        <div className="text-3xl font-bold text-green-600">
          {formatCurrency(kpis.totalSales)}
        </div>
      </div>

      {/* Sesiones abiertas */}
      <div className="bg-orange-50 rounded-lg border border-orange-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">Sesiones abiertas</div>
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Icon name="FaDoorOpen" className="text-orange-600 text-lg" />
          </div>
        </div>
        <div className="text-3xl font-bold text-gray-900">
          {kpis.openSessions}
        </div>
      </div>
    </div>
  );
};

export default MovementsKPICards;