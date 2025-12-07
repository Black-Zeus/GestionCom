import React, { useMemo } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import { formatCurrency, formatDateTime } from "@/utils/formats";

/**
 * SquareModal
 * Modal informativo con resumen de cuadratura por medios de pago
 */
const SquareModal = ({ session, cashMovements, paymentMethods }) => {
  // Calcular resumen de cuadratura
  const squareSummary = useMemo(() => {
    const sessionMovements = cashMovements.filter(
      (m) => m.cash_register_session_id === session.id
    );

    // Resumen por medio de pago
    const paymentSummary = paymentMethods.map((method) => {
      const movements = sessionMovements.filter(
        (m) =>
          m.payment_method_id === method.id &&
          (m.movement_type === "SALE" || m.movement_type === "REFUND")
      );

      const sales = movements
        .filter((m) => m.movement_type === "SALE")
        .reduce((sum, m) => sum + m.amount, 0);

      const refunds = movements
        .filter((m) => m.movement_type === "REFUND")
        .reduce((sum, m) => sum + Math.abs(m.amount), 0);

      const count = movements.filter((m) => m.movement_type === "SALE").length;

      return {
        method: method.name,
        code: method.code,
        count,
        sales,
        refunds,
        net: sales - refunds,
      };
    });

    // Resumen de gastos caja chica
    const pettyCashExpenses = sessionMovements
      .filter((m) => m.movement_type === "PETTY_CASH")
      .reduce((sum, m) => sum + Math.abs(m.amount), 0);

    const pettyCashCount = sessionMovements.filter(
      (m) => m.movement_type === "PETTY_CASH"
    ).length;

    // Retiros y depósitos
    const withdrawals = sessionMovements
      .filter((m) => m.movement_type === "WITHDRAWAL")
      .reduce((sum, m) => sum + Math.abs(m.amount), 0);

    const deposits = sessionMovements
      .filter((m) => m.movement_type === "DEPOSIT")
      .reduce((sum, m) => sum + m.amount, 0);

    // Totales
    const totalSales = paymentSummary.reduce((sum, p) => sum + p.sales, 0);
    const totalRefunds = paymentSummary.reduce((sum, p) => sum + p.refunds, 0);
    const totalNet = totalSales - totalRefunds;

    return {
      paymentSummary,
      pettyCashExpenses,
      pettyCashCount,
      withdrawals,
      deposits,
      totalSales,
      totalRefunds,
      totalNet,
    };
  }, [cashMovements, session.id, paymentMethods]);

  return (
    <div className="space-y-6">
      {/* Subtítulo */}
      <div>
        <p className="text-sm text-gray-600">
          {session.session_code} · {session.cash_register_name}
        </p>
      </div>

      {/* Información general */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-blue-900">Fecha apertura</span>
            <div className="font-medium text-blue-900">
              {formatDateTime(session.opening_datetime)}
            </div>
          </div>
          <div>
            <span className="text-blue-900">Monto inicial</span>
            <div className="font-medium text-blue-900">
              {formatCurrency(session.opening_amount)}
            </div>
          </div>
          <div>
            <span className="text-blue-900">Estado</span>
            <div className="font-medium text-blue-900">
              {session.status_code === "OPEN"
                ? "Abierta"
                : session.status_code === "CLOSED"
                ? "Cerrada"
                : "Arqueada"}
            </div>
          </div>
        </div>
      </div>

      {/* Resumen por medio de pago */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Icon name="FaCreditCard" className="text-purple-600" />
          Ventas por medio de pago
        </h3>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Medio de pago
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                  Cantidad
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Ventas
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Devoluciones
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Neto
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {squareSummary.paymentSummary.map((payment, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {payment.method}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-900">
                    {payment.count}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600 font-semibold">
                    {formatCurrency(payment.sales)}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600 font-semibold">
                    {payment.refunds > 0
                      ? `-${formatCurrency(payment.refunds)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 font-bold">
                    {formatCurrency(payment.net)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td className="px-4 py-3 text-gray-900 font-bold">TOTAL</td>
                <td className="px-4 py-3 text-center text-gray-900 font-bold">
                  {squareSummary.paymentSummary.reduce(
                    (sum, p) => sum + p.count,
                    0
                  )}
                </td>
                <td className="px-4 py-3 text-right text-green-600 font-bold">
                  {formatCurrency(squareSummary.totalSales)}
                </td>
                <td className="px-4 py-3 text-right text-red-600 font-bold">
                  {squareSummary.totalRefunds > 0
                    ? `-${formatCurrency(squareSummary.totalRefunds)}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right text-gray-900 font-bold text-lg">
                  {formatCurrency(squareSummary.totalNet)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Gastos de caja chica */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Icon name="FaReceipt" className="text-orange-600" />
          Gastos de caja chica
        </h3>
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-orange-900">Cantidad de gastos</span>
              <div className="font-bold text-orange-900 text-xl">
                {squareSummary.pettyCashCount}
              </div>
            </div>
            <div>
              <span className="text-orange-900">Total gastos</span>
              <div className="font-bold text-red-600 text-xl">
                {formatCurrency(squareSummary.pettyCashExpenses)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Retiros y depósitos */}
      {(squareSummary.withdrawals > 0 || squareSummary.deposits > 0) && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Icon name="FaExchangeAlt" className="text-teal-600" />
            Otros movimientos
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {squareSummary.withdrawals > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-red-900 text-sm">Retiros</span>
                <div className="font-bold text-red-600 text-xl">
                  {formatCurrency(squareSummary.withdrawals)}
                </div>
              </div>
            )}
            {squareSummary.deposits > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-green-900 text-sm">Depósitos</span>
                <div className="font-bold text-green-600 text-xl">
                  {formatCurrency(squareSummary.deposits)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nota informativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-900">
          <strong>Nota:</strong> Esta cuadratura es únicamente informativa y
          muestra un resumen de las operaciones del día. El arqueo de caja
          formal debe realizarse en el módulo correspondiente.
        </p>
      </div>
    </div>
  );
};

export default SquareModal;