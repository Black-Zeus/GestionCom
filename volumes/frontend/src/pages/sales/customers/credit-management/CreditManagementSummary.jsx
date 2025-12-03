import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const CreditManagementSummary = ({ kpis }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Clientes con crédito */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Clientes con crédito</p>
            <p className="text-2xl font-bold text-blue-600">
              {kpis.totalCreditCustomers}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Clientes con configuración activa
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Icon name="users" className="text-blue-600 text-xl" />
          </div>
        </div>
      </div>

      {/* Crédito asignado */}
      <div className="bg-green-50 rounded-lg p-4 border border-green-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Crédito asignado</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(kpis.totalCreditLimit)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Suma de límites de crédito
            </p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <Icon name="credit-card" className="text-green-600 text-xl" />
          </div>
        </div>
      </div>

      {/* Crédito utilizado */}
      <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Crédito utilizado</p>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(kpis.totalCreditUsed)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Monto utilizado por todos los clientes
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <Icon name="money" className="text-purple-600 text-xl" />
          </div>
        </div>
      </div>

      {/* Clientes bloqueados */}
      <div className="bg-red-50 rounded-lg p-4 border border-red-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Clientes bloqueados</p>
            <p className="text-2xl font-bold text-red-600">
              {kpis.blockedCustomers}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Según reglas de bloqueo por mora
            </p>
          </div>
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <Icon name="ban" className="text-red-600 text-xl" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditManagementSummary;
