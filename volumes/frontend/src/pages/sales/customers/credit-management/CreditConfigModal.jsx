import React, { useState } from "react";
import ModalManager from "@/components/ui/modal/ModalManager";

const CreditConfigModal = ({ customer, creditConfig, onSave }) => {
  const [formData, setFormData] = useState({
    credit_limit: creditConfig?.credit_limit || 0,
    payment_terms_days: creditConfig?.payment_terms_days || 30,
    grace_period_days: creditConfig?.grace_period_days || 0,
    minimum_payment_percentage: creditConfig?.minimum_payment_percentage || 100,
    penalty_rate: creditConfig?.penalty_rate || 0,
    max_overdue_amount: creditConfig?.max_overdue_amount || 0,
    allows_cash: creditConfig?.allows_cash ?? true,
    allows_check: creditConfig?.allows_check ?? true,
    allows_postdated_check: creditConfig?.allows_postdated_check ?? false,
    allows_transfer: creditConfig?.allows_transfer ?? true,
    allows_installments: creditConfig?.allows_installments ?? false,
    risk_level: creditConfig?.risk_level || "MEDIUM",
    requires_guarantor: creditConfig?.requires_guarantor ?? false,
    auto_block_on_overdue: creditConfig?.auto_block_on_overdue ?? false,
  });

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleCheckboxChange = (field) => {
    setFormData({ ...formData, [field]: !formData[field] });
  };

  const handleSubmit = () => {
    if (onSave) {
      onSave(formData);
    }
    ModalManager.close();
    ModalManager.success({
      title: "Configuración actualizada",
      message: "La configuración de crédito ha sido actualizada exitosamente.",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      {/* Información del cliente */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Cliente</h3>
        <p className="text-sm text-gray-700">
          {customer.commercial_name || customer.legal_name}
        </p>
        <p className="text-xs text-gray-500">{customer.tax_id}</p>
      </div>

      {/* Límites y plazos */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Límites y plazos
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              Límite de crédito (CLP)
            </label>
            <input
              type="number"
              value={formData.credit_limit}
              onChange={(e) =>
                handleChange("credit_limit", parseInt(e.target.value) || 0)
              }
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-xs text-gray-500">
              {formatCurrency(formData.credit_limit)}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              Plazo de pago (días)
            </label>
            <input
              type="number"
              value={formData.payment_terms_days}
              onChange={(e) =>
                handleChange(
                  "payment_terms_days",
                  parseInt(e.target.value) || 0
                )
              }
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              Período de gracia (días)
            </label>
            <input
              type="number"
              value={formData.grace_period_days}
              onChange={(e) =>
                handleChange("grace_period_days", parseInt(e.target.value) || 0)
              }
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              Pago mínimo (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.minimum_payment_percentage}
              onChange={(e) =>
                handleChange(
                  "minimum_payment_percentage",
                  parseInt(e.target.value) || 0
                )
              }
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              Tasa de penalización (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.penalty_rate}
              onChange={(e) =>
                handleChange("penalty_rate", parseFloat(e.target.value) || 0)
              }
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              Máx. mora permitida (CLP)
            </label>
            <input
              type="number"
              value={formData.max_overdue_amount}
              onChange={(e) =>
                handleChange(
                  "max_overdue_amount",
                  parseInt(e.target.value) || 0
                )
              }
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-xs text-gray-500">
              {formatCurrency(formData.max_overdue_amount)}
            </span>
          </div>
        </div>
      </div>

      {/* Nivel de riesgo */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Nivel de riesgo
        </h3>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Riesgo</label>
          <select
            value={formData.risk_level}
            onChange={(e) => handleChange("risk_level", e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="LOW">Bajo</option>
            <option value="MEDIUM">Medio</option>
            <option value="HIGH">Alto</option>
          </select>
        </div>
      </div>

      {/* Formas de pago permitidas */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Formas de pago permitidas
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.allows_cash}
              onChange={() => handleCheckboxChange("allows_cash")}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Efectivo</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.allows_check}
              onChange={() => handleCheckboxChange("allows_check")}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Cheque</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.allows_postdated_check}
              onChange={() => handleCheckboxChange("allows_postdated_check")}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Cheque a fecha</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.allows_transfer}
              onChange={() => handleCheckboxChange("allows_transfer")}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Transferencia</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.allows_installments}
              onChange={() => handleCheckboxChange("allows_installments")}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Cuotas</span>
          </label>
        </div>
      </div>

      {/* Opciones adicionales */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Opciones adicionales
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requires_guarantor}
              onChange={() => handleCheckboxChange("requires_guarantor")}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Requiere aval</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.auto_block_on_overdue}
              onChange={() => handleCheckboxChange("auto_block_on_overdue")}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Bloqueo automático por mora
            </span>
          </label>
        </div>
      </div>

      {/* Botones */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={() => ModalManager.close()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Guardar cambios
        </button>
      </div>
    </div>
  );
};

export default CreditConfigModal;
