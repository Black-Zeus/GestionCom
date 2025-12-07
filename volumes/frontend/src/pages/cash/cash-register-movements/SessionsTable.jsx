import React from "react";
import { Icon } from "@components/ui/icon/iconManager";
import { formatCurrency, formatDateTime } from "@/utils/formats";

/**
 * SessionsTable
 * Tabla con el listado de sesiones para ver movimientos
 */
const SessionsTable = ({
  sessions,
  sessionStatuses,
  onViewMovements,
  onViewSquare,
}) => {
  /**
   * Obtener badge de estado con semáforo
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
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Sesiones de caja
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Listado de sesiones de caja según los filtros definidos.
          </p>
        </div>
        <div className="px-6 py-12 text-center">
          <Icon name="FaInbox" className="mx-auto text-4xl text-gray-400 mb-3" />
          <p className="text-sm text-gray-600">
            No hay sesiones de caja para los filtros seleccionados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Sesiones de caja</h2>
        <p className="mt-1 text-sm text-gray-600">
          Listado de sesiones de caja según los filtros definidos.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Sesión
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Sucursal / Caja
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Monto apertura
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sessions.map((session) => (
              <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                {/* Columna Fecha */}
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500 w-16">Apertura:</span>
                    <span className="font-medium text-gray-900">
                      {formatDateTime(session.opening_datetime).split(",")[0]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-16">Cierre:</span>
                    <span className="text-gray-600">
                      {session.closing_datetime
                        ? formatDateTime(session.closing_datetime).split(",")[0]
                        : "—"}
                    </span>
                  </div>
                </td>

                {/* Columna Sesión */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-blue-600">
                    {session.session_code}
                  </div>
                </td>

                {/* Columna Sucursal / Caja */}
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500 w-16">Sucursal:</span>
                    <span className="font-medium text-gray-900">
                      {session.branch_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-16">Caja:</span>
                    <span className="text-gray-600">
                      {session.cash_register_name}
                    </span>
                  </div>
                </td>

                {/* Columna Estado */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(session.status_code)}
                </td>

                {/* Columna Monto apertura */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                  {formatCurrency(session.opening_amount)}
                </td>

                {/* Columna Acciones */}
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onViewMovements(session)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Ver movimientos"
                    >
                      <Icon name="FaList" className="text-base" />
                    </button>
                    <button
                      onClick={() => onViewSquare(session)}
                      className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                      title="Ver cuadratura"
                    >
                      <Icon name="FaCalculator" className="text-base" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SessionsTable;