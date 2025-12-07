import React, { useState, useMemo } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import { formatCurrency, formatDateTime } from "@/utils/formats";
import SessionDetailTabs from "./SessionDetailTabs";

/**
 * SessionDetailModal
 * Modal con tabs para ver detalles de sesión
 */
const SessionDetailModal = ({
  isOpen,
  onClose,
  session,
  cashMovements,
  pettyCashExpenses,
  pettyCashReplenishments,
}) => {
  const [activeTab, setActiveTab] = useState("summary");

  // Filtrar movimientos de esta sesión
  const sessionCashMovements = useMemo(() => {
    return cashMovements.filter(
      (m) => m.cash_register_session_id === session.id
    );
  }, [cashMovements, session.id]);

  // Filtrar gastos de caja chica de esta sesión
  const sessionPettyCashExpenses = useMemo(() => {
    return pettyCashExpenses.filter(
      (e) => e.cash_register_session_id === session.id
    );
  }, [pettyCashExpenses, session.id]);

  // Filtrar reposiciones de caja chica de esta sesión
  const sessionPettyCashReplenishments = useMemo(() => {
    return pettyCashReplenishments.filter(
      (r) => r.cash_register_session_id === session.id
    );
  }, [pettyCashReplenishments, session.id]);

  if (!isOpen) return null;

  /**
   * Obtener badge de estado
   */
  const getStatusBadge = (statusCode) => {
    const colors = {
      OPEN: "bg-green-100 text-green-800",
      CLOSED: "bg-blue-100 text-blue-800",
      RECONCILED: "bg-yellow-100 text-yellow-800",
    };

    const labels = {
      OPEN: "Abierta",
      CLOSED: "Cerrada",
      RECONCILED: "Arqueada",
    };

    const dotColors = {
      OPEN: "bg-green-600",
      CLOSED: "bg-blue-600",
      RECONCILED: "bg-yellow-600",
    };

    return (
      <span
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${colors[statusCode]}`}
      >
        <span className={`w-2 h-2 rounded-full ${dotColors[statusCode]}`}></span>
        {labels[statusCode]}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Detalle de sesión de caja
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {session.session_code} · {session.cash_register_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon name="FaTimes" className="text-xl" />
          </button>
        </div>

        {/* Tabs */}
        <SessionDetailTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Tab: Resumen */}
          {activeTab === "summary" && (
            <div className="space-y-6">
              {/* Identificación */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Identificación de la sesión
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Código de sesión</span>
                    <div className="font-medium text-gray-900">
                      {session.session_code}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Sucursal</span>
                    <div className="font-medium text-gray-900">
                      {session.branch_name}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Caja</span>
                    <div className="font-medium text-gray-900">
                      {session.cash_register_name}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Cajero</span>
                    <div className="font-medium text-gray-900">
                      {session.cashier_name}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Supervisor</span>
                    <div className="font-medium text-gray-900">
                      {session.supervisor_name}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Estado</span>
                    <div className="mt-1">
                      {getStatusBadge(session.status_code)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Apertura */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Apertura de caja
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Fecha y hora de apertura</span>
                    <div className="font-medium text-gray-900">
                      {formatDateTime(session.opening_datetime)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Monto inicial</span>
                    <div className="font-medium text-gray-900">
                      {formatCurrency(session.opening_amount)}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <span className="text-gray-600">Notas de apertura</span>
                    <div className="font-medium text-gray-900">
                      {session.opening_notes || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen de cierre */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Resumen de cierre y arqueo
                </h3>

                {session.status_code === "OPEN" ? (
                  <div className="text-center py-6 text-sm text-gray-600">
                    Esta sesión aún está abierta. No hay información de cierre
                    disponible.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      {/* Monto teórico */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">
                          Monto teórico
                        </div>
                        <div className="text-base font-semibold text-gray-900">
                          {session.theoretical_amount !== null
                            ? formatCurrency(session.theoretical_amount)
                            : "—"}
                        </div>
                      </div>

                      {/* Monto físico */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">
                          Monto físico
                        </div>
                        <div className="text-base font-semibold text-gray-900">
                          {session.physical_amount !== null
                            ? formatCurrency(session.physical_amount)
                            : "—"}
                        </div>
                      </div>

                      {/* Diferencia */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">
                          Diferencia
                        </div>
                        <div
                          className={`text-base font-semibold ${
                            session.difference_amount === null
                              ? "text-gray-400"
                              : session.difference_amount >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {session.difference_amount !== null
                            ? formatCurrency(session.difference_amount)
                            : "—"}
                        </div>
                      </div>

                      {/* Fecha cierre */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">
                          Fecha de cierre
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {session.closing_datetime
                            ? formatDateTime(session.closing_datetime)
                            : "—"}
                        </div>
                      </div>
                    </div>

                    {session.closing_notes && (
                      <p className="text-xs text-gray-600">
                        <strong>Notas de cierre:</strong>{" "}
                        {session.closing_notes}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Tab: Movimientos de caja */}
          {activeTab === "cash" && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Movimientos de caja
              </h3>

              {sessionCashMovements.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-600">
                  No hay movimientos de caja registrados en esta sesión.
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Tipo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Documento
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Medio pago
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                          Recibido
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                          Vuelto
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                          Monto
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Fecha
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Detalle
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sessionCashMovements.map((movement) => (
                        <tr key={movement.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900">
                            {movement.movement_type_label}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {movement.document_summary || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {movement.payment_method_name}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900">
                            {movement.received_amount > 0
                              ? formatCurrency(movement.received_amount)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900">
                            {movement.change_amount > 0
                              ? formatCurrency(movement.change_amount)
                              : "—"}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-medium ${
                              movement.amount >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(movement.amount)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatDateTime(movement.created_at)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {movement.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Caja chica */}
          {activeTab === "petty" && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Movimientos de caja chica
              </h3>

              {sessionPettyCashExpenses.length === 0 &&
              sessionPettyCashReplenishments.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-600">
                  No hay movimientos de caja chica en esta sesión.
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Tipo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Categoría / Fondo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Descripción
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                          Monto
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Fecha
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {/* Gastos */}
                      {sessionPettyCashExpenses.map((expense) => (
                        <tr key={`expense-${expense.id}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900">Gasto</td>
                          <td className="px-4 py-3 text-gray-600">
                            {expense.category_name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {expense.expense_description}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-red-600">
                            {formatCurrency(-expense.expense_amount)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {expense.expense_date}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              {expense.status_label}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {/* Reposiciones */}
                      {sessionPettyCashReplenishments.map((replenishment) => (
                        <tr
                          key={`replenishment-${replenishment.id}`}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 text-gray-900">
                            Reposición
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {replenishment.fund_code}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {replenishment.replenishment_description}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-green-600">
                            {formatCurrency(replenishment.replenishment_amount)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatDateTime(replenishment.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              {replenishment.status_label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionDetailModal;