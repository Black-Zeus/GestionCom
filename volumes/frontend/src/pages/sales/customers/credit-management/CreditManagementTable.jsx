import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const CreditManagementTable = ({
  customers,
  creditConfigs,
  receivables,
  onViewDetail,
  getCreditStatus,
}) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getRiskBadge = (riskLevel) => {
    const riskConfig = {
      LOW: { label: "Bajo", color: "green" },
      MEDIUM: { label: "Medio", color: "blue" },
      HIGH: { label: "Alto", color: "red" },
    };

    const config = riskConfig[riskLevel] || riskConfig.LOW;

    return (
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full bg-${config.color}-500`}></span>
        <span className="text-sm text-gray-900">{config.label}</span>
      </div>
    );
  };

  const getCreditStatusBadge = (customerId) => {
    const status = getCreditStatus(customerId);
    const statusConfig = {
      NORMAL: { label: "Normal", color: "green" },
      EN_MORA: { label: "Con mora", color: "yellow" },
      BLOQUEADO: { label: "Bloqueado", color: "red" },
    };

    const config = statusConfig[status] || statusConfig.NORMAL;

    return (
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full bg-${config.color}-500`}></span>
        <span className="text-sm text-gray-900">{config.label}</span>
      </div>
    );
  };

  const getOverdueAmount = (customerId) => {
    return receivables
      .filter(
        (r) =>
          r.customer_id === customerId &&
          (r.status === "OVERDUE" || r.status === "IN_COLLECTION")
      )
      .reduce((sum, r) => sum + (r.balance_amount || 0), 0);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900">
          Clientes con Crédito
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Código
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                RUT
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Riesgo
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Límite
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Utilizado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Disponible
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                En mora
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado crédito
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customers.length === 0 ? (
              <tr>
                <td
                  colSpan="10"
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  No hay clientes con crédito que coincidan con los filtros
                  aplicados
                </td>
              </tr>
            ) : (
              customers.map((customer) => {
                const config = creditConfigs.find(
                  (c) => c.customer_id === customer.id
                );
                const overdueAmount = getOverdueAmount(customer.id);

                return (
                  <tr
                    key={customer.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* Código */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {customer.customer_code}
                    </td>

                    {/* Cliente */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {customer.commercial_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {customer.legal_name}
                        </span>
                      </div>
                    </td>

                    {/* RUT */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.tax_id}
                    </td>

                    {/* Riesgo */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {config && getRiskBadge(config.risk_level)}
                    </td>

                    {/* Límite */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                      {config && formatCurrency(config.credit_limit)}
                    </td>

                    {/* Utilizado */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {config && formatCurrency(config.used_credit)}
                    </td>

                    {/* Disponible */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600">
                      {config && formatCurrency(config.available_credit)}
                    </td>

                    {/* En mora */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-red-600">
                      {formatCurrency(overdueAmount)}
                    </td>

                    {/* Estado crédito */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getCreditStatusBadge(customer.id)}
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => onViewDetail(customer)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Ver detalle"
                      >
                        <Icon name="info" className="text-lg" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CreditManagementTable;
