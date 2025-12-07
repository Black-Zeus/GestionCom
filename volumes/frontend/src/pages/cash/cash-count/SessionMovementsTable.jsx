import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const SessionMovementsTable = ({ movements, paymentMethods }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);
  };

  const formatDateTime = (datetime) => {
    return new Date(datetime).toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const getMovementTypeColor = (type) => {
    const colors = {
      OPENING: "text-blue-400",
      SALE: "text-green-400",
      REFUND: "text-orange-400",
      PETTY_CASH: "text-red-400",
      WITHDRAWAL: "text-red-400",
      DEPOSIT: "text-green-400",
    };
    return colors[type] || "text-gray-400";
  };

  if (movements.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        <Icon name="inbox" className="mx-auto mb-2 text-3xl opacity-50" />
        <p>No hay movimientos registrados en esta sesión</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto max-h-[380px]">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 bg-gradient-to-r from-slate-900/95 to-blue-900/50 z-10">
          <tr>
            <th className="text-left p-2 font-medium text-gray-300 whitespace-nowrap border-b border-slate-700/50">
              Fecha/Hora
            </th>
            <th className="text-left p-2 font-medium text-gray-300 whitespace-nowrap border-b border-slate-700/50">
              Tipo
            </th>
            <th className="text-left p-2 font-medium text-gray-300 whitespace-nowrap border-b border-slate-700/50">
              Documento
            </th>
            <th className="text-left p-2 font-medium text-gray-300 whitespace-nowrap border-b border-slate-700/50">
              Método Pago
            </th>
            <th className="text-left p-2 font-medium text-gray-300 whitespace-nowrap border-b border-slate-700/50">
              Descripción
            </th>
            <th className="text-right p-2 font-medium text-gray-300 whitespace-nowrap border-b border-slate-700/50">
              Recibido
            </th>
            <th className="text-right p-2 font-medium text-gray-300 whitespace-nowrap border-b border-slate-700/50">
              Vuelto
            </th>
            <th className="text-right p-2 font-medium text-gray-300 whitespace-nowrap border-b border-slate-700/50">
              Monto
            </th>
          </tr>
        </thead>
        <tbody>
          {movements.map((movement, index) => (
            <tr
              key={movement.id}
              className={`
                ${index % 2 === 0 ? "bg-slate-900/98" : "bg-slate-900/92"}
                hover:bg-blue-900/35 transition-colors
              `}
            >
              <td className="p-1.5 border-b border-slate-800/90">
                <span className="text-gray-400">
                  {formatDateTime(movement.created_at)}
                </span>
              </td>
              <td className="p-1.5 border-b border-slate-800/90">
                <span
                  className={`font-medium ${getMovementTypeColor(
                    movement.movement_type
                  )}`}
                >
                  {movement.movement_type_label}
                </span>
              </td>
              <td className="p-1.5 border-b border-slate-800/90">
                {movement.reference_number ? (
                  <span className="font-mono text-gray-300">
                    {movement.reference_number}
                  </span>
                ) : (
                  <span className="text-gray-500">-</span>
                )}
              </td>
              <td className="p-1.5 border-b border-slate-800/90">
                <span className="text-gray-300">
                  {movement.payment_method_name}
                </span>
              </td>
              <td className="p-1.5 border-b border-slate-800/90">
                <span className="text-gray-400">{movement.description}</span>
              </td>
              <td className="p-1.5 border-b border-slate-800/90 text-right font-mono">
                {movement.received_amount > 0 ? (
                  <span className="text-gray-300">
                    {formatCurrency(movement.received_amount)}
                  </span>
                ) : (
                  <span className="text-gray-500">-</span>
                )}
              </td>
              <td className="p-1.5 border-b border-slate-800/90 text-right font-mono">
                {movement.change_amount > 0 ? (
                  <span className="text-orange-400">
                    {formatCurrency(movement.change_amount)}
                  </span>
                ) : (
                  <span className="text-gray-500">-</span>
                )}
              </td>
              <td className="p-1.5 border-b border-slate-800/90 text-right font-mono">
                <span
                  className={
                    movement.amount >= 0 ? "text-green-400" : "text-red-400"
                  }
                >
                  {formatCurrency(movement.amount)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="sticky bottom-0 bg-gradient-to-r from-slate-900/95 to-blue-900/50">
          <tr>
            <td
              colSpan="7"
              className="p-2 border-t border-slate-700/50 text-right font-medium text-gray-300"
            >
              Total:
            </td>
            <td className="p-2 border-t border-slate-700/50 text-right font-mono font-medium">
              <span
                className={
                  movements.reduce((sum, m) => sum + m.amount, 0) >= 0
                    ? "text-green-400"
                    : "text-red-400"
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