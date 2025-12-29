import React from "react";
import { Icon } from "@components/ui/icon/iconManager";
import { formatCurrency, formatDateTime } from "@/utils/formats";

/**
 * SessionsTable
 * Tabla de sesiones de caja con estilos corregidos (tema claro)
 */
const SessionsTable = ({
  sessions,
  sessionStatuses,
  onViewSession,
  onReconcileSession,
}) => {
  /**
   * Obtener badge de estado con semáforo simple
   */
  const getStatusBadge = (statusCode) => {
    const status = sessionStatuses.find((s) => s.code === statusCode);
    if (!status) return null;

    const dotColors = {
      OPEN: "bg-green-600",
      CLOSED: "bg-blue-600",
      RECONCILED: "bg-yellow-600",
    };

    return (
      <span className="inline-flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dotColors[statusCode]}`}></span>
        <span className="text-sm text-gray-900">{status.label}</span>
      </span>
    );
  };

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <Icon name="FaInbox" className="mx-auto text-4xl text-gray-400 mb-3" />
        <p className="text-sm text-gray-600">
          No se encontraron sesiones con los filtros aplicados
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b-2 border-gray-200">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Código Sesión
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Sucursal
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Caja
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Cajero
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Apertura
            </th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Monto Inicial
            </th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Diferencia
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sessions.map((session) => (
            <tr key={session.id} className="hover:bg-gray-50 transition-colors">
              {/* Columna Código Sesión */}
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-medium text-blue-600 font-mono">
                  {session.session_code}
                </span>
              </td>

              {/* Columna Sucursal */}
              <td className="px-6 py-4 text-sm">
                <div className="font-medium text-gray-900">
                  {session.branch_name}
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  {session.branch_code}
                </div>
              </td>

              {/* Columna Caja */}
              <td className="px-6 py-4 text-sm">
                <div className="font-medium text-gray-900">
                  {session.cash_register_name}
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  {session.cash_register_code}
                </div>
              </td>

              {/* Columna Cajero */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {session.cashier_name}
              </td>

              {/* Columna Apertura */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {formatDateTime(session.opening_datetime)}
              </td>

              {/* Columna Monto Inicial */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                {formatCurrency(session.opening_amount)}
              </td>

              {/* Columna Diferencia */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                {session.difference_amount !== null &&
                session.difference_amount !== undefined ? (
                  <span
                    className={
                      session.difference_amount === 0
                        ? "text-green-600"
                        : session.difference_amount > 0
                        ? "text-blue-600"
                        : "text-red-600"
                    }
                  >
                    {formatCurrency(session.difference_amount)}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>

              {/* Columna Estado */}
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(session.status_code)}
              </td>

              {/* Columna Acciones */}
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onViewSession(session)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Ver detalle"
                  >
                    <Icon name="FaEye" className="text-base" />
                  </button>
                  
                    <button
                      onClick={() => onReconcileSession(session)}
                      className="p-2 text-gray-400 hover:text-yellow-600 transition-colors"
                      title="Arquear sesión"
                    >
                      <Icon name="FaCheckCircle" className="text-base" />
                    </button>
                  
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