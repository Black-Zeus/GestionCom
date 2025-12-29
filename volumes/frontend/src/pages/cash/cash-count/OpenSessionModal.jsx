import React, { useState } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import { formatCurrency } from "@/utils/formats";

/**
 * OpenSessionModal
 * Modal para abrir nueva sesión de caja - estilos corregidos (tema claro)
 */
const OpenSessionModal = ({
  registers,
  currentUser,
  currentBranch,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    cash_register_id: "",
    cash_register_code: "",
    cash_register_name: "",
    opening_amount: "",
    opening_notes: "",
  });

  const [errors, setErrors] = useState({});

  const handleRegisterChange = (e) => {
    const registerId = parseInt(e.target.value);
    const register = registers.find((r) => r.id === registerId);

    if (register) {
      setFormData({
        ...formData,
        cash_register_id: register.id,
        cash_register_code: register.register_code,
        cash_register_name: register.register_name,
      });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.cash_register_id) {
      newErrors.cash_register_id = "Debe seleccionar una caja registradora";
    }

    if (!formData.opening_amount || parseFloat(formData.opening_amount) < 0) {
      newErrors.opening_amount = "El monto de apertura no puede ser negativo";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    const sessionData = {
      branch_id: currentBranch.id,
      branch_code: currentBranch.branch_code,
      branch_name: currentBranch.branch_name,
      cash_register_id: formData.cash_register_id,
      cash_register_code: formData.cash_register_code,
      cash_register_name: formData.cash_register_name,
      cashier_user_id: currentUser.id,
      cashier_name: currentUser.full_name,
      supervisor_user_id: 20,
      supervisor_name: "Supervisor General",
      opening_amount: parseFloat(formData.opening_amount),
      opening_datetime: new Date().toISOString(),
      opening_notes: formData.opening_notes,
    };

    onSave(sessionData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Información de contexto */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          Contexto de la apertura
        </h3>
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div>
            <span className="text-xs text-gray-600">Sucursal</span>
            <div className="font-medium text-gray-900 mt-1">
              {currentBranch.branch_name}
            </div>
            <div className="text-xs text-gray-500 font-mono">
              {currentBranch.branch_code}
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-600">Cajero</span>
            <div className="font-medium text-gray-900 mt-1">
              {currentUser.full_name}
            </div>
            <div className="text-xs text-gray-500">
              Usuario: {currentUser.username}
            </div>
          </div>
        </div>
      </div>

      {/* Datos de apertura */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          Datos de la apertura
        </h3>

        <div className="space-y-4">
          {/* Selección de caja */}
          <div>
            <label
              htmlFor="cash_register_id"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Caja Registradora *
            </label>
            <select
              id="cash_register_id"
              value={formData.cash_register_id}
              onChange={handleRegisterChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.cash_register_id
                  ? "border-red-300"
                  : "border-gray-300"
              }`}
            >
              <option value="">Seleccione una caja...</option>
              {registers.map((register) => (
                <option key={register.id} value={register.id}>
                  {register.register_code} - {register.register_name}
                </option>
              ))}
            </select>
            {errors.cash_register_id && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <Icon name="FaExclamationCircle" className="text-sm" />
                {errors.cash_register_id}
              </p>
            )}
          </div>

          {/* Monto de apertura */}
          <div>
            <label
              htmlFor="opening_amount"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Monto de Apertura (CLP) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                type="number"
                id="opening_amount"
                value={formData.opening_amount}
                onChange={(e) =>
                  handleInputChange("opening_amount", e.target.value)
                }
                placeholder="0"
                min="0"
                step="100"
                className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.opening_amount
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
              />
            </div>
            {formData.opening_amount && (
              <p className="mt-1 text-xs text-gray-600">
                {formatCurrency(parseFloat(formData.opening_amount))}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Monto inicial entregado para vueltos y gastos menores. Puede ser 0 o
              superior.
            </p>
            {errors.opening_amount && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <Icon name="FaExclamationCircle" className="text-sm" />
                {errors.opening_amount}
              </p>
            )}
          </div>

          {/* Notas de apertura */}
          <div>
            <label
              htmlFor="opening_notes"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Notas de Apertura (opcional)
            </label>
            <textarea
              id="opening_notes"
              value={formData.opening_notes}
              onChange={(e) =>
                handleInputChange("opening_notes", e.target.value)
              }
              placeholder="Observaciones adicionales sobre la apertura..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Información adicional sobre esta apertura de sesión
            </p>
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-900">
          <strong>Regla de operación:</strong> Por cada caja y usuario solo se
          permite una sesión en estado <strong>Abierta</strong>. Para volver a
          abrir la misma caja, la sesión anterior debe estar en estado{" "}
          <strong>Cerrada</strong> o <strong>Arqueada</strong>.
        </p>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Icon name="FaCheck" />
          Abrir Sesión
        </button>
      </div>
    </form>
  );
};

export default OpenSessionModal;