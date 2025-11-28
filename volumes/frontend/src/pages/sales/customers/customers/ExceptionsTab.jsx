import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const ExceptionsTab = ({ exceptions }) => {
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
      ACTIVE: "Activa",
      EXPIRED: "Expirada",
      REVOKED: "Revocada",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      ACTIVE: "green",
      EXPIRED: "gray",
      REVOKED: "red",
    };
    return colors[status] || "gray";
  };

  const getAuthLevelLabel = (level) => {
    const labels = {
      SUPERVISOR: "Supervisor",
      MANAGER: "Gerente",
      DIRECTOR: "Director",
    };
    return labels[level] || level;
  };

  if (exceptions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Icon name="check" className="text-5xl mb-4 block" />
        <p>No hay excepciones de crédito registradas para este cliente</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Excepciones de Límite de Crédito
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Historial de excepciones aprobadas para aumentos temporales o
          permanentes del límite de crédito
        </p>
      </div>

      <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Límite Original
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Excepción
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Nuevo Límite
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Motivo
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Expira
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Nivel Auth
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
              {exceptions.map((exception) => (
                <tr
                  key={exception.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-150"
                >
                  <td className="px-4 py-4">
                    <span className="text-sm font-medium text-gray-900">
                      #{exception.document_id || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-700">
                      {formatCurrency(exception.original_limit)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-bold text-blue-600">
                      +{formatCurrency(exception.exception_amount)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-bold text-green-600">
                      {formatCurrency(exception.new_effective_limit)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs text-gray-600 max-w-xs truncate block">
                      {exception.reason || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs font-medium text-gray-700">
                      {exception.is_temporary ? "Temporal" : "Permanente"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-700">
                      {exception.is_temporary
                        ? formatDate(exception.expires_at)
                        : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs font-medium text-gray-700">
                      {getAuthLevelLabel(exception.authorization_level)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full bg-${getStatusColor(
                          exception.exception_status
                        )}-500`}
                      />
                      <span className="text-sm text-gray-700">
                        {getStatusLabel(exception.exception_status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-xs text-gray-600">
                      <div>{formatDate(exception.created_at)}</div>
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

export default ExceptionsTab;