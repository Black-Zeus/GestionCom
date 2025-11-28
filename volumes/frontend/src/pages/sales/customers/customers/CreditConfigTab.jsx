import React, { useState } from "react";
import { Icon } from "@components/ui/icon/iconManager";

const CreditConfigTab = ({ customerId, creditConfig, isNewCustomer }) => {
  const [config, setConfig] = useState(
    creditConfig || {
      credit_limit: 0,
      available_credit: 0,
      used_credit: 0,
      payment_terms_days: 30,
      grace_period_days: 5,
      minimum_payment_percentage: 10,
      penalty_rate: 1.5,
      max_overdue_amount: 0,
      risk_level: "LOW",
      is_blocked: false,
      requires_guarantor: false,
      auto_block_on_overdue: true,
    }
  );

  const [hasConfig, setHasConfig] = useState(!!creditConfig);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);
  };

  const getRiskColor = (level) => {
    const colors = {
      LOW: "green",
      MEDIUM: "yellow",
      HIGH: "orange",
      CRITICAL: "red",
    };
    return colors[level] || "gray";
  };

  const getRiskLabel = (level) => {
    const labels = {
      LOW: "Bajo",
      MEDIUM: "Medio",
      HIGH: "Alto",
      CRITICAL: "Crítico",
    };
    return labels[level] || level;
  };

  const handleInputChange = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateConfig = () => {
    setHasConfig(true);
  };

  if (isNewCustomer) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Icon name="info" className="text-5xl mb-4 block" />
        <p>
          Debe guardar el cliente primero antes de configurar el crédito.
        </p>
      </div>
    );
  }

  if (!hasConfig) {
    return (
      <div className="text-center py-12">
        <Icon name="dollar" className="text-5xl mb-4 block text-gray-300" />
        <p className="text-gray-500 mb-6">
          Este cliente no tiene configuración de crédito
        </p>
        <button
          onClick={handleCreateConfig}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center gap-2 mx-auto"
        >
          <Icon name="plus" />
          Configurar Crédito por Primera Vez
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cards de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <div>
            <p className="text-sm text-gray-600 mb-1">Límite de Crédito</p>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(config.credit_limit)}
            </p>
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
          <div>
            <p className="text-sm text-gray-600 mb-1">Crédito Usado</p>
            <p className="text-xl font-bold text-orange-600">
              {formatCurrency(config.used_credit)}
            </p>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <div>
            <p className="text-sm text-gray-600 mb-1">Crédito Disponible</p>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(config.available_credit)}
            </p>
          </div>
        </div>

        <div
          className={`bg-${getRiskColor(
            config.risk_level
          )}-50 rounded-lg p-4 border border-${getRiskColor(
            config.risk_level
          )}-100`}
        >
          <div>
            <p className="text-sm text-gray-600 mb-1">Nivel de Riesgo</p>
            <p
              className={`text-xl font-bold text-${getRiskColor(
                config.risk_level
              )}-600`}
            >
              {getRiskLabel(config.risk_level)}
            </p>
          </div>
        </div>
      </div>

      {/* Formulario de Configuración */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
          Parámetros de Crédito
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Límite de Crédito */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Límite de Crédito (CLP)
            </label>
            <input
              type="number"
              value={config.credit_limit}
              onChange={(e) =>
                handleInputChange("credit_limit", parseInt(e.target.value))
              }
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Días de Plazo de Pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plazo de Pago (días)
            </label>
            <input
              type="number"
              value={config.payment_terms_days}
              onChange={(e) =>
                handleInputChange("payment_terms_days", parseInt(e.target.value))
              }
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Días de Gracia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Días de Gracia
            </label>
            <input
              type="number"
              value={config.grace_period_days}
              onChange={(e) =>
                handleInputChange("grace_period_days", parseInt(e.target.value))
              }
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* % Pago Mínimo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pago Mínimo (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={config.minimum_payment_percentage}
              onChange={(e) =>
                handleInputChange(
                  "minimum_payment_percentage",
                  parseFloat(e.target.value)
                )
              }
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Tasa de Penalidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tasa de Penalidad (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={config.penalty_rate}
              onChange={(e) =>
                handleInputChange("penalty_rate", parseFloat(e.target.value))
              }
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Monto Máximo Vencido */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto Máximo Vencido (CLP)
            </label>
            <input
              type="number"
              value={config.max_overdue_amount}
              onChange={(e) =>
                handleInputChange("max_overdue_amount", parseInt(e.target.value))
              }
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Nivel de Riesgo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nivel de Riesgo
            </label>
            <select
              value={config.risk_level}
              onChange={(e) => handleInputChange("risk_level", e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            >
              <option value="LOW">Bajo</option>
              <option value="MEDIUM">Medio</option>
              <option value="HIGH">Alto</option>
              <option value="CRITICAL">Crítico</option>
            </select>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="mt-6 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.is_blocked}
              onChange={(e) => handleInputChange("is_blocked", e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Cliente Bloqueado
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.requires_guarantor}
              onChange={(e) =>
                handleInputChange("requires_guarantor", e.target.checked)
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Requiere Aval
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.auto_block_on_overdue}
              onChange={(e) =>
                handleInputChange("auto_block_on_overdue", e.target.checked)
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Bloqueo Automático por Mora
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default CreditConfigTab;