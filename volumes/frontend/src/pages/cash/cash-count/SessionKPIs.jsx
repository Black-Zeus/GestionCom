import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const SessionKPIs = ({ sessions }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);
  };

  const calculateKPIs = () => {
    const openSessions = sessions.filter((s) => s.status_code === "OPEN");
    const closedSessions = sessions.filter((s) => s.status_code === "CLOSED");
    const reconciledSessions = sessions.filter((s) => s.status_code === "RECONCILED");

    const totalOpenAmount = openSessions.reduce((sum, s) => sum + (s.opening_amount || 0), 0);

    const totalDifferences = sessions
      .filter((s) => s.difference_amount !== null)
      .reduce((sum, s) => sum + s.difference_amount, 0);

    const sessionsWithDifferences = sessions.filter(
      (s) => s.difference_amount !== null && s.difference_amount !== 0
    ).length;

    return {
      openSessions: openSessions.length,
      closedSessions: closedSessions.length,
      reconciledSessions: reconciledSessions.length,
      totalOpenAmount,
      totalDifferences,
      sessionsWithDifferences,
    };
  };

  const kpis = calculateKPIs();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Sesiones Abiertas */}
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30">
          <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5 mb-2">
            <Icon name="lock-open" className="text-green-600 dark:text-green-400" />
            Sesiones Abiertas
          </div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">
            {kpis.openSessions}
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Monto total: {formatCurrency(kpis.totalOpenAmount)}
          </div>
        </div>

        {/* Sesiones Cerradas */}
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30">
          <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5 mb-2">
            <Icon name="lock" className="text-blue-600 dark:text-blue-400" />
            Sesiones Cerradas
          </div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">
            {kpis.closedSessions}
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Pendientes de arqueo
          </div>
        </div>

        {/* Sesiones Arqueadas */}
        <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30">
          <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5 mb-2">
            <Icon name="check-circle" className="text-yellow-600 dark:text-yellow-400" />
            Sesiones Arqueadas
          </div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">
            {kpis.reconciledSessions}
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Completamente cerradas
          </div>
        </div>

        {/* Diferencias Totales */}
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
          <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5 mb-2">
            <Icon name="trending-up" className="text-gray-600 dark:text-gray-400" />
            Diferencias Totales
          </div>
          <div className={`text-2xl font-semibold ${
            kpis.totalDifferences === 0
              ? "text-green-600 dark:text-green-400"
              : kpis.totalDifferences > 0
              ? "text-blue-600 dark:text-blue-400"
              : "text-red-600 dark:text-red-400"
          }`}>
            {formatCurrency(kpis.totalDifferences)}
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {kpis.sessionsWithDifferences} sesiones con diferencias
          </div>
        </div>

      </div>
    </div>
  );
};

export default SessionKPIs;