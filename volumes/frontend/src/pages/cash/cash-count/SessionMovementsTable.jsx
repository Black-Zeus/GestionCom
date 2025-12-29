import React from "react";
import { Icon } from "@components/ui/icon/iconManager";
import { formatCurrency, formatDateTime } from "@/utils/formats";

/**
 * SessionMovementsTable
 * Tabla de movimientos de una sesión con estilos corregidos (tema claro)
 */
const SessionMovementsTable = ({ movements, paymentMethods }) => {
  const getMovementTypeColor = (type) => {
    const colors = {
      OPENING: "text-blue-600",
      SALE: "text-green-600",
      REFUND: "text-orange-600",
      PETTY_CASH: "text-red-600",
      WITHDRAWAL: "text-red-600",
      DEPOSIT: "text-green-600",
    };
    return colors[type] || "text-gray-900";
  };

  if (movements.length === 0) {
    return (
      <div className="text-center py-12">
        <Icon name="FaInbox" className="mx-auto text-4xl text-gray-400 mb-3" />
        <p className="text-sm text-gray-600">
          No hay movimientos registrados en esta sesión
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto max-h-[400px]">
      <table className="w-full">
        <thead className="sticky top-0 bg-gray-50 border-b-2 border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
              Fecha/Hora
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
              Tipo
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
              Documento
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
              Método Pago
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
              Descripción
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
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {movements.map((movement) => (
            <tr key={movement.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-sm text-gray-600">
                {formatDateTime(movement.created_at)}
              </td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`font-medium ${getMovementTypeColor(
                    movement.movement_type
                  )}`}
                >
                  {movement.movement_type_label}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                {movement.reference_number ? (
                  <span className="font-mono text-gray-900">
                    {movement.reference_number}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {movement.payment_method_name}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {movement.description}
              </td>
              <td className="px-4 py-3 text-sm text-right text-gray-900">
                {movement.received_amount > 0 ? (
                  formatCurrency(movement.received_amount)
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                {movement.change_amount > 0 ? (
                  <span className="text-orange-600">
                    {formatCurrency(movement.change_amount)}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-right font-semibold">
                <span
                  className={
                    movement.amount >= 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  {formatCurrency(movement.amount)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200">
          <tr>
            <td
              colSpan="7"
              className="px-4 py-3 text-right text-sm font-medium text-gray-700"
            >
              Total:
            </td>
            <td className="px-4 py-3 text-sm text-right font-bold">
              <span
                className={
                  movements.reduce((sum, m) => sum + m.amount, 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {formatCurrency(
                  movements.reduce((sum, m) => sum + m.amount, 0)
                )}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default SessionMovementsTable;