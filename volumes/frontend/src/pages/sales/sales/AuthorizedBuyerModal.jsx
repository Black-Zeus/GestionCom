import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const AuthorizedBuyerModal = ({ customer, buyers, onSelect, onClose }) => {
  const formatAmount = (amount) => {
    if (!amount) return "Sin límite";
    return `$${amount.toLocaleString("es-CL")}`;
  };

  const getAuthLevelColor = (level) => {
    switch (level) {
      case "FULL":
        return "bg-green-100 text-green-700 border-green-300";
      case "ADVANCED":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "BASIC":
        return "bg-orange-100 text-orange-700 border-orange-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getAuthLevelText = (level) => {
    switch (level) {
      case "FULL":
        return "Completo";
      case "ADVANCED":
        return "Avanzado";
      case "BASIC":
        return "Básico";
      default:
        return level;
    }
  };

  return (
    <div>
      {/* Información de la Empresa */}
      <div className="mb-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon name="business" className="text-blue-600 text-2xl" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">
              {customer.legal_name}
            </p>
            <p className="text-xs text-gray-600">RUT: {customer.tax_id}</p>
          </div>
        </div>
      </div>

      {/* Tabla de Personas Autorizadas */}
      {buyers.length === 0 ? (
        <div className="text-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Icon name="personOff" className="text-gray-400 text-4xl mb-2" />
            <p className="text-gray-600 font-medium">
              No hay personas autorizadas registradas
            </p>
            <p className="text-sm text-gray-500">
              Esta empresa no tiene personas autorizadas para realizar compras
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border-2 border-gray-200 max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                  Nombre
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                  RUT
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                  Cargo
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                  Email
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">
                  Nivel
                </th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                  Límite Compra
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {buyers.map((buyer, index) => (
                <tr
                  key={buyer.id}
                  className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                    index === buyers.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {buyer.authorized_name}
                      </p>
                      {buyer.is_primary_contact && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          Principal
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {buyer.authorized_tax_id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {buyer.position}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {buyer.email}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-3 py-1 text-xs font-bold rounded-full border ${getAuthLevelColor(
                        buyer.authorization_level
                      )}`}
                    >
                      {getAuthLevelText(buyer.authorization_level)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    {formatAmount(buyer.max_purchase_amount)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => onSelect(buyer)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all text-sm"
                    >
                      Seleccionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer con información */}
      {buyers.length > 0 && (
        <div className="mt-4">
          <div className="text-sm text-gray-600">
            {buyers.length} persona(s) autorizada(s)
          </div>
          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600">
              <strong>Nota:</strong> Seleccione la persona que realizará la
              compra. El límite de compra aplica según el nivel de autorización.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorizedBuyerModal;