import React, { useState } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import { formatCurrency, formatDateTime } from "@/utils/formats";
import SessionMovementsTable from "./SessionMovementsTable";
import CashDenominationsForm from "./CashDenominationsForm";

/**
 * SessionDetailModal
 * Modal con tabs para ver detalles de sesión - estilos corregidos (tema claro)
 */
const SessionDetailModal = ({
  session,
  movements,
  paymentMethods,
  cashDenominationsCatalog,
  onClose,
  onCloseSession,
}) => {
  const [activeTab, setActiveTab] = useState("general");

  const calculateSummary = () => {
    const totalIncome = movements
      .filter((m) => m.amount > 0)
      .reduce((sum, m) => sum + m.amount, 0);

    const totalExpenses = movements
      .filter((m) => m.amount < 0)
      .reduce((sum, m) => sum + Math.abs(m.amount), 0);

    const cashMovements = movements.filter((m) => m.payment_method_id === 1);
    const cashIncome = cashMovements
      .filter((m) => m.amount > 0)
      .reduce((sum, m) => sum + m.amount, 0);
    const cashExpenses = cashMovements
      .filter((m) => m.amount < 0)
      .reduce((sum, m) => sum + Math.abs(m.amount), 0);

    const theoreticalCash =
      session.opening_amount + cashIncome - cashExpenses;

    return {
      totalIncome,
      totalExpenses,
      cashIncome,
      cashExpenses,
      theoreticalCash,
      movementsCount: movements.length,
    };
  };

  const summary = calculateSummary();

  const handleCloseSession = (closingData) => {
    onCloseSession(session.id, closingData);
  };

  const tabs = [
    { id: "general", label: "Información General", icon: "FaInfoCircle" },
    { id: "movements", label: "Movimientos", icon: "FaList" },
    ...(session.status_code === "OPEN"
      ? [{ id: "reconciliation", label: "Cerrar Sesión", icon: "FaCheckCircle" }]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              <Icon name={tab.icon} className="text-base" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido de tabs */}
      <div className="min-h-[400px]">
        {activeTab === "general" && (
          <div className="space-y-4">
            {/* Información básica */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Información de la Sesión
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Sucursal:</span>
                  <p className="font-medium text-gray-900 mt-1">
                    {session.branch_name}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Caja:</span>
                  <p className="font-medium text-gray-900 mt-1">
                    {session.cash_register_name}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Cajero:</span>
                  <p className="font-medium text-gray-900 mt-1">
                    {session.cashier_name}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Fecha Apertura:</span>
                  <p className="font-medium text-gray-900 mt-1">
                    {formatDateTime(session.opening_datetime)}
                  </p>
                </div>
              </div>
            </div>

            {/* Resumen de movimientos */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs text-blue-600 font-medium">
                  Monto Apertura
                </div>
                <div className="text-lg font-semibold text-blue-900 mt-1">
                  {formatCurrency(session.opening_amount)}
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-xs text-green-600 font-medium">
                  Total Ingresos
                </div>
                <div className="text-lg font-semibold text-green-900 mt-1">
                  {formatCurrency(summary.totalIncome)}
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-xs text-red-600 font-medium">
                  Total Egresos
                </div>
                <div className="text-lg font-semibold text-red-900 mt-1">
                  {formatCurrency(summary.totalExpenses)}
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="text-xs text-purple-600 font-medium">
                  Efectivo Teórico
                </div>
                <div className="text-lg font-semibold text-purple-900 mt-1">
                  {formatCurrency(summary.theoreticalCash)}
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-600 font-medium">
                  N° Movimientos
                </div>
                <div className="text-lg font-semibold text-gray-900 mt-1">
                  {summary.movementsCount}
                </div>
              </div>

              {session.status_code !== "OPEN" && (
                <div
                  className={`border rounded-lg p-3 ${
                    session.difference_amount === 0
                      ? "bg-green-50 border-green-200"
                      : session.difference_amount > 0
                      ? "bg-blue-50 border-blue-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div
                    className={`text-xs font-medium ${
                      session.difference_amount === 0
                        ? "text-green-600"
                        : session.difference_amount > 0
                        ? "text-blue-600"
                        : "text-red-600"
                    }`}
                  >
                    Diferencia
                  </div>
                  <div
                    className={`text-lg font-semibold mt-1 ${
                      session.difference_amount === 0
                        ? "text-green-900"
                        : session.difference_amount > 0
                        ? "text-blue-900"
                        : "text-red-900"
                    }`}
                  >
                    {formatCurrency(session.difference_amount)}
                  </div>
                </div>
              )}
            </div>

            {/* Notas */}
            {(session.opening_notes || session.closing_notes) && (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <div className="text-sm font-semibold text-gray-900 mb-3">
                  Notas y Observaciones
                </div>
                <div className="space-y-3 text-sm">
                  {session.opening_notes && (
                    <div>
                      <div className="text-gray-600 font-medium">
                        Notas de Apertura:
                      </div>
                      <p className="text-gray-900 mt-1">
                        {session.opening_notes}
                      </p>
                    </div>
                  )}
                  {session.closing_notes && (
                    <div>
                      <div className="text-gray-600 font-medium">
                        Notas de Cierre:
                      </div>
                      <p className="text-gray-900 mt-1">
                        {session.closing_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "movements" && (
          <div>
            <SessionMovementsTable
              movements={movements}
              paymentMethods={paymentMethods}
            />
          </div>
        )}

        {activeTab === "reconciliation" && session.status_code === "OPEN" && (
          <div>
            <CashDenominationsForm
              session={session}
              theoreticalCash={summary.theoreticalCash}
              cashDenominationsCatalog={cashDenominationsCatalog}
              onSave={handleCloseSession}
              onCancel={onClose}
            />
          </div>
        )}

        {activeTab === "reconciliation" && session.status_code !== "OPEN" && (
          <div className="text-center py-12">
            <Icon name="FaCheckCircle" className="mx-auto text-4xl text-gray-400 mb-3" />
            <p className="text-sm text-gray-600">Esta sesión ya ha sido cerrada</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          <Icon name="FaTimes" />
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default SessionDetailModal;