import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const PenaltiesTab = ({ penalties }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("es-CL");
  };

  const getStatusLabel = (status) => {
    const labels = {
      PENDING: "Pendiente",
      PAID: "Pagada",
      WAIVED: "Condonada",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: "yellow",
      PAID: "green",
      WAIVED: "gray",
    };
    return colors[status] || "gray";
  };

  if (penalties.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Icon name="check" className="text-5xl mb-4 block" />
        <p>No hay penalidades registradas para este cliente</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Penalidades del Cliente
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Historial de penalidades por mora o incumplimiento
        </p>
      </div>

      <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Cuenta/Doc
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Monto Penalidad
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Tasa
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Días Mora
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Base Cálculo
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Periodo
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Creado
                </th>
              </tr>
            </thead>
            <tbody>
              {penalties.map((penalty) => (
                <tr
                  key={penalty.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-150"
                >
                  <td className="px-4 py-4">
                    <span className="text-sm font-medium text-gray-900">
                      #{penalty.accounts_receivable_id}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-bold text-red-600">
                      {formatCurrency(penalty.penalty_amount)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-700">
                      {penalty.penalty_rate}%
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-700">
                      {penalty.days_overdue} días
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-700">
                      {formatCurrency(penalty.calculation_base)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs text-gray-600">
                      {penalty.penalty_description || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-xs text-gray-600">
                      <div>{formatDate(penalty.period_from)}</div>
                      <div>{formatDate(penalty.period_to)}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full bg-${getStatusColor(
                          penalty.status
                        )}-500`}
                      />
                      <span className="text-sm text-gray-700">
                        {getStatusLabel(penalty.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-xs text-gray-600">
                      <div>{formatDate(penalty.created_at)}</div>
                      {penalty.waived_at && (
                        <div className="text-green-600">
                          Condonada: {formatDate(penalty.waived_at)}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PenaltiesTab;