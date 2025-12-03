import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const AuthorizedPersonsTable = ({
  customers,
  authorizedUsers,
  statuses,
  onSelectCustomer,
}) => {
  const getStatus = (statusId) => {
    const status = statuses.find((s) => s.id === statusId);
    return status || { status_display_es: "—", status_color: "gray" };
  };

  const getAuthorizedCount = (customerId) => {
    return authorizedUsers.filter((u) => u.customer_id === customerId).length;
  };

  if (customers.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
        <Icon name="inbox" className="text-5xl text-gray-300 mb-4" />
        <p className="text-gray-400">No se encontraron clientes</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-5 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900">Clientes</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b-2 border-gray-200">
            <tr>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Código
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                RUT
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Razón Social
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Ciudad / Región
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Autorizados
              </th>
              <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => {
              const status = getStatus(customer.status_id);
              const authorizedCount = getAuthorizedCount(customer.id);

              return (
                <tr
                  key={customer.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-150"
                >
                  {/* Código */}
                  <td className="px-4 py-4">
                    <span className="text-sm font-medium text-gray-900">
                      {customer.customer_code}
                    </span>
                  </td>

                  {/* Tipo */}
                  <td className="px-4 py-4">
                    <span className="text-xs font-medium text-gray-700">
                      {customer.customer_type === "COMPANY"
                        ? "Empresa"
                        : "Persona"}
                    </span>
                  </td>

                  {/* RUT */}
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-600">
                      {customer.tax_id}
                    </span>
                  </td>

                  {/* Razón Social */}
                  <td className="px-4 py-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {customer.legal_name}
                      </div>
                      {customer.commercial_name &&
                        customer.commercial_name !== customer.legal_name && (
                          <div className="text-xs text-gray-500">
                            {customer.commercial_name}
                          </div>
                        )}
                    </div>
                  </td>

                  {/* Ciudad / Región */}
                  <td className="px-4 py-4">
                    <div>
                      <div className="text-sm text-gray-900">
                        {customer.city}
                      </div>
                      <div className="text-xs text-gray-500">
                        {customer.region}
                      </div>
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          status.status_color === "green"
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      ></span>
                      <span className="text-sm text-gray-900">
                        {status.status_display_es}
                      </span>
                    </div>
                  </td>

                  {/* Autorizados */}
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm text-gray-900">
                      {authorizedCount}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onSelectCustomer(customer)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Ver detalle"
                      >
                        <Icon name="list" className="text-lg" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuthorizedPersonsTable;
