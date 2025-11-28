import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const CustomerTable = ({
  customers,
  priceLists,
  users,
  statuses,
  creditConfigs,
  onEdit,
  onDelete,
}) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("es-CL");
  };

  const getPriceListName = (priceListId) => {
    const priceList = priceLists.find((pl) => pl.id === priceListId);
    return priceList ? priceList.price_list_name : "—";
  };

  const getSalesRepName = (userId) => {
    const user = users.find((u) => u.id === userId);
    return user ? user.full_name : "—";
  };

  const getStatus = (statusId) => {
    const status = statuses.find((s) => s.id === statusId);
    return status || { status_display_es: "—", status_color: "gray" };
  };

  const getCreditConfig = (customerId) => {
    return creditConfigs.find((cc) => cc.customer_id === customerId);
  };

  if (customers.length === 0) {
    return (
      <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 mb-6">
        <div className="text-center py-16 text-gray-400">
          <Icon name="inbox" className="text-5xl mb-4 block" />
          <p>No se encontraron clientes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 mb-6">
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
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => {
              const status = getStatus(customer.status_id);
              const creditConfig = getCreditConfig(customer.id);

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
                    <span className="text-sm text-gray-700">
                      {customer.tax_id}
                    </span>
                  </td>

                  {/* Razón Social */}
                  <td className="px-4 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {customer.legal_name}
                      </div>
                      {customer.commercial_name && (
                        <div className="text-xs text-gray-500">
                          {customer.commercial_name}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Ciudad / Región */}
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-700">{customer.city}</div>
                    <div className="text-xs text-gray-500">{customer.region}</div>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full bg-${status.status_color}-500`}
                      />
                      <span className="text-sm text-gray-700">
                        {status.status_display_es}
                      </span>
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(customer)}
                        title="Editar"
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      >
                        <Icon name="edit" />
                      </button>
                      <button
                        onClick={() => onDelete(customer)}
                        title="Eliminar"
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      >
                        <Icon name="delete" />
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

export default CustomerTable;