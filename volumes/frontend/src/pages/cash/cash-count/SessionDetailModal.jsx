import React, { useState } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import SessionMovementsTable from "./SessionMovementsTable";
import CashDenominationsForm from "./CashDenominationsForm";

const SessionDetailModal = ({
  session,
  movements,
  paymentMethods,
  cashDenominationsCatalog,
  onClose,
  onCloseSession,
}) => {
  const [activeTab, setActiveTab] = useState("general");

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
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

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
    onClose();
  };

  const tabs = [
    { id: "general", label: "Información General", icon: "info" },
    { id: "movements", label: "Movimientos", icon: "list" },
    { id: "reconciliation", label: "Arqueo", icon: "calculator" },
  ];

  return (
    <div className="space-y-4">
      {/* Resumen de contexto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div className="p-3 rounded-xl border border-slate-700/90 bg-gradient-to-br from-slate-800/70 to-slate-950">
          <div className="text-xs text-indigo-300 mb-2 font-medium">
            Información de Sesión
          </div>
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-gray-400">Código Sesión</div>
                <div className="text-gray-200 font-mono mt-0.5">
                  {session.session_code}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Sucursal</div>
                <div className="text-gray-200 mt-0.5">
                  {session.branch_name}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Caja</div>
                <div className="text-gray-200 mt-0.5">
                  {session.cash_register_name}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Cajero</div>
                <div className="text-gray-200 mt-0.5">
                  {session.cashier_name}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-slate-700/90 bg-gradient-to-br from-slate-800/70 to-slate-950">
          <div className="text-xs text-indigo-300 mb-2 font-medium">
            Resumen de Caja
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-400">Monto Inicial</div>
              <div className="text-gray-200 font-mono mt-0.5">
                {formatCurrency(session.opening_amount)}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Teórico Efectivo</div>
              <div className="text-green-400 font-mono mt-0.5">
                {formatCurrency(summary.theoreticalCash)}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Ingresos</div>
              <div className="text-green-400 font-mono mt-0.5">
                {formatCurrency(summary.totalIncome)}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Egresos</div>
              <div className="text-red-400 font-mono mt-0.5">
                {formatCurrency(summary.totalExpenses)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-800/90 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-colors
              ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-blue-500 to-green-500 border-blue-600/90 text-slate-900 font-medium"
                  : "bg-slate-900/90 border-slate-700/90 text-gray-200 hover:border-blue-500/80"
              }
            `}
          >
            <Icon name={tab.icon} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido de tabs */}
      <div className="mt-2">
        {activeTab === "general" && (
          <div className="space-y-3">
            {/* Fechas */}
            <div className="p-3 rounded-xl border border-slate-700/90 bg-gradient-to-br from-slate-800/70 to-slate-950">
              <div className="text-sm font-medium text-indigo-300 mb-2">
                Fechas y Horarios
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <div className="text-gray-400">Fecha/Hora Apertura</div>
                  <div className="text-gray-200 mt-0.5">
                    {formatDateTime(session.opening_datetime)}
                  </div>
                </div>
                {session.closing_datetime && (
                  <div>
                    <div className="text-gray-400">Fecha/Hora Cierre</div>
                    <div className="text-gray-200 mt-0.5">
                      {formatDateTime(session.closing_datetime)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Montos */}
            <div className="p-3 rounded-xl border border-slate-700/90 bg-gradient-to-br from-slate-800/70 to-slate-950">
              <div className="text-sm font-medium text-indigo-300 mb-2">
                Detalle de Montos
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div>
                  <div className="text-gray-400">Apertura</div>
                  <div className="text-gray-200 font-mono mt-0.5">
                    {formatCurrency(session.opening_amount)}
                  </div>
                </div>
                {session.theoretical_amount !== null && (
                  <div>
                    <div className="text-gray-400">Teórico</div>
                    <div className="text-gray-200 font-mono mt-0.5">
                      {formatCurrency(session.theoretical_amount)}
                    </div>
                  </div>
                )}
                {session.physical_amount !== null && (
                  <div>
                    <div className="text-gray-400">Físico</div>
                    <div className="text-gray-200 font-mono mt-0.5">
                      {formatCurrency(session.physical_amount)}
                    </div>
                  </div>
                )}
                {session.difference_amount !== null && (
                  <div>
                    <div className="text-gray-400">Diferencia</div>
                    <div
                      className={`font-mono mt-0.5 ${
                        session.difference_amount === 0
                          ? "text-green-400"
                          : session.difference_amount > 0
                          ? "text-blue-400"
                          : "text-red-400"
                      }`}
                    >
                      {formatCurrency(session.difference_amount)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notas */}
            {(session.opening_notes || session.closing_notes) && (
              <div className="p-3 rounded-xl border border-slate-700/90 bg-gradient-to-br from-slate-800/70 to-slate-950">
                <div className="text-sm font-medium text-indigo-300 mb-2">
                  Notas y Observaciones
                </div>
                <div className="space-y-2 text-xs">
                  {session.opening_notes && (
                    <div>
                      <div className="text-gray-400">Notas de Apertura:</div>
                      <p className="text-gray-300 mt-1">
                        {session.opening_notes}
                      </p>
                    </div>
                  )}
                  {session.closing_notes && (
                    <div>
                      <div className="text-gray-400">Notas de Cierre:</div>
                      <p className="text-gray-300 mt-1">
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

        {activeTab === "reconciliation" &&
          session.status_code === "OPEN" && (
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

        {activeTab === "reconciliation" &&
          session.status_code !== "OPEN" && (
            <div className="text-center py-12 text-gray-400 text-sm">
              <Icon
                name="check-circle"
                className="mx-auto mb-2 text-3xl opacity-50"
              />
              <p>Esta sesión ya ha sido cerrada</p>
            </div>
          )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-3 border-t border-slate-800/90">
        <button
          onClick={onClose}
          className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-slate-800/96 text-gray-200 border border-slate-700/80 rounded-full text-sm hover:bg-slate-700/90 transition-colors"
        >
          <Icon name="x" />
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default SessionDetailModal;