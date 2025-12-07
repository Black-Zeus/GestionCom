import React, { useState } from "react";
import { Icon } from "@components/ui/icon/iconManager";

const OpenSessionModal = ({ registers, currentUser, currentBranch, onSave, onCancel }) => {
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

    if (!formData.opening_amount || parseFloat(formData.opening_amount) <= 0) {
      newErrors.opening_amount = "El monto de apertura debe ser mayor a cero";
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
      supervisor_user_id: 20, // Supervisor por defecto
      supervisor_name: "Supervisor General",
      opening_amount: parseFloat(formData.opening_amount),
      opening_datetime: new Date().toISOString(),
      opening_notes: formData.opening_notes,
    };

    onSave(sessionData);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(value || 0);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Información de contexto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 p-3 rounded-xl border border-slate-700/90 bg-gradient-to-br from-slate-800/70 to-slate-950">
        <div>
          <div className="text-xs text-gray-400">Sucursal</div>
          <div className="text-sm font-medium text-gray-200 mt-0.5">
            {currentBranch.branch_name}
          </div>
          <div className="text-xs text-gray-500 font-mono">
            {currentBranch.branch_code}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Cajero</div>
          <div className="text-sm font-medium text-gray-200 mt-0.5">
            {currentUser.full_name}
          </div>
          <div className="text-xs text-gray-500">Usuario: {currentUser.username}</div>
        </div>
      </div>

      {/* Selección de caja */}
      <div className="flex flex-col gap-1 text-sm">
        <label className="text-xs text-gray-300 flex items-center gap-1.5">
          <Icon name="cash-register" className="text-blue-400" />
          Caja Registradora *
        </label>
        <select
          value={formData.cash_register_id}
          onChange={handleRegisterChange}
          className={`rounded-lg border ${
            errors.cash_register_id
              ? "border-red-500/50"
              : "border-slate-700/90"
          } bg-slate-900/95 px-2 py-1.5 text-gray-200 text-sm focus:outline-2 focus:outline-blue-500/80 focus:outline-offset-0`}
        >
          <option value="">Seleccione una caja...</option>
          {registers.map((register) => (
            <option key={register.id} value={register.id}>
              {register.register_name} ({register.register_code})
            </option>
          ))}
        </select>
        {errors.cash_register_id && (
          <span className="text-xs text-red-400 flex items-center gap-1">
            <Icon name="alert-circle" />
            {errors.cash_register_id}
          </span>
        )}
      </div>

      {/* Monto de apertura */}
      <div className="flex flex-col gap-1 text-sm">
        <label className="text-xs text-gray-300 flex items-center gap-1.5">
          <Icon name="dollar-sign" className="text-green-400" />
          Monto de Apertura (CLP) *
        </label>
        <div
          className={`flex items-center rounded-lg border ${
            errors.opening_amount ? "border-red-500/50" : "border-slate-700/90"
          } bg-slate-900/95 overflow-hidden`}
        >
          <span className="px-2 py-1.5 text-sm text-gray-400 border-r border-slate-700/90">
            $
          </span>
          <input
            type="number"
            value={formData.opening_amount}
            onChange={(e) => handleInputChange("opening_amount", e.target.value)}
            placeholder="0"
            min="0"
            step="100"
            className="border-none rounded-none bg-transparent px-2 py-1.5 text-gray-200 text-sm focus:outline-none flex-1"
          />
        </div>
        {formData.opening_amount && (
          <span className="text-xs text-gray-400">
            {formatCurrency(parseFloat(formData.opening_amount))}
          </span>
        )}
        {errors.opening_amount && (
          <span className="text-xs text-red-400 flex items-center gap-1">
            <Icon name="alert-circle" />
            {errors.opening_amount}
          </span>
        )}
      </div>

      {/* Notas de apertura */}
      <div className="flex flex-col gap-1 text-sm">
        <label className="text-xs text-gray-300 flex items-center gap-1.5">
          <Icon name="file-text" className="text-gray-400" />
          Notas de Apertura
        </label>
        <textarea
          value={formData.opening_notes}
          onChange={(e) => handleInputChange("opening_notes", e.target.value)}
          placeholder="Observaciones adicionales sobre la apertura..."
          rows={3}
          className="resize-vertical min-h-[70px] rounded-lg border border-slate-700/90 bg-slate-900/95 px-2 py-1.5 text-gray-200 text-sm focus:outline-2 focus:outline-blue-500/80 focus:outline-offset-0"
        />
        <span className="text-xs text-gray-400">
          Información adicional sobre esta apertura de sesión
        </span>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/90">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-transparent text-gray-200 border border-slate-700/80 rounded-full text-sm hover:bg-slate-800/50 transition-colors"
        >
          <Icon name="x" />
          Cancelar
        </button>
        <button
          type="submit"
          className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-green-500 to-blue-500 text-slate-900 border border-green-600/80 rounded-full text-sm font-medium hover:shadow-lg transition-all"
        >
          <Icon name="check" />
          Abrir Sesión
        </button>
      </div>
    </form>
  );
};

export default OpenSessionModal;