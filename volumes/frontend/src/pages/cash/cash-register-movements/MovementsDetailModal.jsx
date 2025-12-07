import React, { useMemo } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import { formatCurrency, formatDateTime } from "@/utils/formats";

/**
 * MovementsDetailModal
 * Modal para mostrar todos los movimientos de una sesión
 */
const MovementsDetailModal = ({
  session,
  cashMovements,
  movementTypes,
  paymentMethods,
}) => {
  // Filtrar movimientos de esta sesión
  const sessionMovements = useMemo(() => {
    return cashMovements
      .filter((m) => m.cash_register_session_id === session.id)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  }, [cashMovements, session.id]);

  /**
   * Obtener ícono y color del tipo de movimiento
   */
  const getMovementIcon = (movementType) => {
    const type = movementTypes.find((t) => t.code === movementType);
    if (!type) return { icon: "FaCircle", color: "text-gray-500" };

    const colorMap = {
      blue: "text-blue-600",
      green: "text-green-600",
      orange: "text-orange-600",
      red: "text-red-600",
      purple: "text-purple-600",
      teal: "text-teal-600",
      gray: "text-gray-600",
    };

    return {
      icon: type.icon,
      color: colorMap[type.color] || "text-gray-500",
    };
  };

  return (
    <div className="flex flex-col max-h-[85vh]">
      {/* Subtítulo */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          {session.session_code} · {session.cash_register_name}
        </p>
      </div>

      {/* Información de sesión */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Fecha apertura</span>
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
          <div>
            <span className="text-gray-600">Estado</span>
            <div className="font-medium text-gray-900">
              {session.status_code === "OPEN"
                ? "Abierta"
                : session.status_code === "CLOSED"
                ? "Cerrada"
                : "Arqueada"}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Total movimientos</span>
            <div className="font-medium text-gray-900">
              {sessionMovements.length}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de movimientos */}
      <div className="flex-1 overflow-y-auto">
        {sessionMovements.length === 0 ? (
          <div className="text-center py-12">
            <Icon
              name="FaInbox"
              className="mx-auto text-4xl text-gray-400 mb-3"
            />
            <p className="text-sm text-gray-600">
              No hay movimientos registrados en esta sesión.
            </p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Hora
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Documento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Medio pago
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                    Recibido
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                    Vuelto
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                    Monto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Descripción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessionMovements.map((movement) => {
                  const { icon, color } = getMovementIcon(
                    movement.movement_type
                  );
                  return (
                    <tr
                      key={movement.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDateTime(movement.created_at)
                          .split(",")[1]
                          ?.trim() || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon name={icon} className={`${color} text-sm`} />
                          <span className="text-gray-900">
                            {movement.movement_type_label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {movement.document_number || "—"}
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
                        className={`px-4 py-3 text-right font-semibold ${
                          movement.amount >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(movement.amount)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {movement.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovementsDetailModal;