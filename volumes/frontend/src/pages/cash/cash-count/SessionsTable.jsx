import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const SessionsTable = ({
  sessions,
  sessionStatuses,
  onViewSession,
  onReconcileSession,
}) => {
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);
  };

  const formatDateTime = (datetime) => {
    if (!datetime) return "-";
    return new Date(datetime).toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const getStatusBadge = (statusCode) => {
    const status = sessionStatuses.find((s) => s.code === statusCode);
    if (!status) return null;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.badgeClass}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
        {status.label}
      </span>
    );
  };

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        <Icon name="inbox" className="mx-auto mb-2 text-3xl opacity-50" />
        <p>No se encontraron sesiones con los filtros aplicados</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-slate-900/95 to-blue-900/50">
            <th className="text-left p-2.5 font-medium text-gray-300 whitespace-nowrap border-b border-slate-700/50">
              Código Sesión
            </th>
            <th className="text-left p-2.5 font-medium text-gray-300 whitespace-nowrap border-b border-slate-700/50">
              Sucursal
            </th>
            <th className="text-left p-2.5 font-medium text-gray-300 whitespace-nowrap border-b border-slate-700/50">
              Caja
            </th>
            <th className="text-left p-2.5 font-medium text-gray-300 whitespace-nowrap border-b border-slate-700/50">
              Cajero
            </th>
            <th className="text-left p-2.5 font-medium text-gray-300 whitespace-nowrap border-b border-slate-700/50">
              Apertura
            </th>
            <th className="text-right p-2.5 font-medium text-gray-300 whitespace-nowrap border-b border-slate-700/50">
              Monto Inicial
            </th>
            <th className="text-right p-2.5 font-medium text-gray-300 whitespace-nowrap border-b border-slate-700/50">
              Diferencia
            </th>
            <th className="text-center p-2.5 font-medium text-gray-300 whitespace-nowrap border-b border-slate-700/50">
              Estado
            </th>
            <th className="text-center p-2.5 font-medium text-gray-300 whitespace-nowrap border-b border-slate-700/50">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session, index) => (
            <tr
              key={session.id}
              className={`
                ${index % 2 === 0 ? "bg-slate-900/98" : "bg-slate-900/92"}
                hover:bg-blue-900/35 transition-colors
              `}
            >
              <td className="p-2 border-b border-slate-800/90">
                <span className="font-mono text-xs text-blue-300">
                  {session.session_code}
                </span>
              </td>
              <td className="p-2 border-b border-slate-800/90">
                <div className="text-xs">
                  <div className="font-medium text-gray-200">
                    {session.branch_name}
                  </div>
                  <div className="text-gray-500 font-mono">
                    {session.branch_code}
                  </div>
                </div>
              </td>
              <td className="p-2 border-b border-slate-800/90">
                <div className="text-xs">
                  <div className="font-medium text-gray-200">
                    {session.cash_register_name}
                  </div>
                  <div className="text-gray-500 font-mono">
                    {session.cash_register_code}
                  </div>
                </div>
              </td>
              <td className="p-2 border-b border-slate-800/90">
                <span className="text-xs text-gray-300">
                  {session.cashier_name}
                </span>
              </td>
              <td className="p-2 border-b border-slate-800/90">
                <span className="text-xs text-gray-400">
                  {formatDateTime(session.opening_datetime)}
                </span>
              </td>
              <td className="p-2 border-b border-slate-800/90 text-right font-mono text-xs text-gray-300">
                {formatCurrency(session.opening_amount)}
              </td>
              <td className="p-2 border-b border-slate-800/90 text-right font-mono text-xs">
                {session.difference_amount !== null &&
                session.difference_amount !== undefined ? (
                  <span
                    className={
                      session.difference_amount === 0
                        ? "text-green-400"
                        : session.difference_amount > 0
                        ? "text-blue-400"
                        : "text-red-400"
                    }
                  >
                    {formatCurrency(session.difference_amount)}
                  </span>
                ) : (
                  <span className="text-gray-500">-</span>
                )}
              </td>
              <td className="p-2 border-b border-slate-800/90 text-center">
                {getStatusBadge(session.status_code)}
              </td>
              <td className="p-2 border-b border-slate-800/90">
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => onViewSession(session)}
                    className="w-7 h-7 rounded-full bg-slate-800/90 border border-slate-700/80 flex items-center justify-center hover:bg-blue-600/50 transition-colors"
                    title="Ver detalle"
                  >
                    <Icon name="eye" className="text-xs" />
                  </button>
                  {session.status_code === "CLOSED" && (
                    <button
                      onClick={() => onReconcileSession(session)}
                      className="w-7 h-7 rounded-full bg-slate-800/90 border border-slate-700/80 flex items-center justify-center hover:bg-yellow-600/50 transition-colors"
                      title="Arquear sesión"
                    >
                      <Icon name="check-circle" className="text-xs" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SessionsTable;