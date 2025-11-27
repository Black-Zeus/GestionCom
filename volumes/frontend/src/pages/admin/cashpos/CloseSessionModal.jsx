import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";

const CloseSessionModal = ({ session, cashRegister, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    physicalAmount: "",
    closingNotes: "",
    requiresApproval: false,
  });

  const [calculatedData, setCalculatedData] = useState({
    theoreticalAmount: 0,
    differenceAmount: 0,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Calcular monto teórico (en producción vendría del backend)
    const theoretical = calculateTheoreticalAmount();
    setCalculatedData((prev) => ({
      ...prev,
      theoreticalAmount: theoretical,
    }));
  }, []);

  useEffect(() => {
    // Calcular diferencia cuando cambie el monto físico
    if (formData.physicalAmount !== "") {
      const physical = parseFloat(formData.physicalAmount) || 0;
      const difference = physical - calculatedData.theoreticalAmount;

      setCalculatedData((prev) => ({
        ...prev,
        differenceAmount: difference,
      }));

      // Verificar si requiere aprobación
      const requiresApproval =
        Math.abs(difference) > cashRegister.maxDifferenceAmount;
      setFormData((prev) => ({
        ...prev,
        requiresApproval,
      }));
    }
  }, [formData.physicalAmount, calculatedData.theoreticalAmount, cashRegister]);

  const calculateTheoreticalAmount = () => {
    // Aquí se calcularía el monto teórico basado en los movimientos
    // Por ahora retornamos un valor de ejemplo
    return session.openingAmount + 150000; // Monto de apertura + ventas
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Limpiar error del campo
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.physicalAmount || formData.physicalAmount === "") {
      newErrors.physicalAmount = "El monto físico es requerido";
    } else if (parseFloat(formData.physicalAmount) < 0) {
      newErrors.physicalAmount = "El monto no puede ser negativo";
    }

    if (
      formData.requiresApproval &&
      cashRegister.requiresSupervisorApproval &&
      !formData.closingNotes.trim()
    ) {
      newErrors.closingNotes =
        "Las notas son obligatorias cuando se requiere aprobación";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      const closureData = {
        ...formData,
        theoreticalAmount: calculatedData.theoreticalAmount,
        differenceAmount: calculatedData.differenceAmount,
        physicalAmount: parseFloat(formData.physicalAmount),
      };
      onSave(closureData);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);
  };

  const getDifferenceColor = (difference) => {
    if (difference === 0) return "text-green-600";
    if (difference > 0) return "text-blue-600";
    return "text-red-600";
  };

  const getDifferenceLabel = (difference) => {
    if (difference === 0) return "Cuadrado";
    if (difference > 0) return "Sobrante";
    return "Faltante";
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      {/* Información de la Sesión */}
      <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          Información de la Sesión
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-blue-700 font-medium">Código:</span>{" "}
            <span className="text-blue-900">{session.sessionCode}</span>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Cajero:</span>{" "}
            <span className="text-blue-900">{session.cashierName}</span>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Monto Apertura:</span>{" "}
            <span className="text-blue-900">
              {formatCurrency(session.openingAmount)}
            </span>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Caja:</span>{" "}
            <span className="text-blue-900">{cashRegister.registerName}</span>
          </div>
        </div>
      </div>

      {/* Arqueo de Caja */}
      <div className="space-y-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Arqueo de Caja</h3>

        {/* Monto Teórico */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <label className="text-sm text-gray-600 block mb-1">
            Monto Teórico (Calculado por el Sistema)
          </label>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(calculatedData.theoreticalAmount)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Basado en monto de apertura + ventas - devoluciones
          </p>
        </div>

        {/* Monto Físico */}
        <div className="flex flex-col">
          <label className="mb-2 text-gray-900 font-medium text-sm">
            Monto Físico Contado *
          </label>
          <input
            type="number"
            name="physicalAmount"
            value={formData.physicalAmount}
            onChange={handleChange}
            required
            step="0.01"
            min="0"
            className={`px-4 py-3 border-2 rounded-lg text-lg font-semibold focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all ${
              errors.physicalAmount ? "border-red-500" : "border-gray-200"
            }`}
            placeholder="Ingrese el monto contado..."
          />
          {errors.physicalAmount && (
            <p className="mt-1 text-sm text-red-600">{errors.physicalAmount}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Cuente todo el efectivo y medios de pago presentes en la caja
          </p>
        </div>

        {/* Diferencia */}
        {formData.physicalAmount !== "" && (
          <div
            className={`rounded-lg p-4 border-2 ${
              calculatedData.differenceAmount === 0
                ? "bg-green-50 border-green-200"
                : Math.abs(calculatedData.differenceAmount) >
                  cashRegister.maxDifferenceAmount
                ? "bg-red-50 border-red-200"
                : "bg-yellow-50 border-yellow-200"
            }`}
          >
            <label
              className={`text-sm font-medium block mb-1 ${getDifferenceColor(
                calculatedData.differenceAmount
              )}`}
            >
              Diferencia: {getDifferenceLabel(calculatedData.differenceAmount)}
            </label>
            <p
              className={`text-3xl font-bold ${getDifferenceColor(
                calculatedData.differenceAmount
              )}`}
            >
              {formatCurrency(calculatedData.differenceAmount)}
            </p>
            {Math.abs(calculatedData.differenceAmount) >
              cashRegister.maxDifferenceAmount && (
              <p className="text-xs text-red-700 mt-2 font-medium">
                ⚠️ La diferencia supera el límite permitido ($
                {cashRegister.maxDifferenceAmount.toLocaleString()}). Se
                requiere aprobación de supervisor.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Notas de Cierre */}
      <div className="flex flex-col mb-6">
        <label className="mb-2 text-gray-900 font-medium text-sm">
          Notas de Cierre
          {formData.requiresApproval &&
            cashRegister.requiresSupervisorApproval &&
            " *"}
        </label>
        <textarea
          name="closingNotes"
          value={formData.closingNotes}
          onChange={handleChange}
          rows="4"
          className={`px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all resize-none ${
            errors.closingNotes ? "border-red-500" : "border-gray-200"
          }`}
          placeholder="Observaciones, incidencias o justificación de diferencias..."
        />
        {errors.closingNotes && (
          <p className="mt-1 text-sm text-red-600">{errors.closingNotes}</p>
        )}
      </div>

      {/* Advertencia de Aprobación */}
      {formData.requiresApproval && cashRegister.requiresSupervisorApproval && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Icon name="warning" className="text-orange-600 text-xl mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-orange-900 mb-1">
                Requiere Aprobación de Supervisor
              </h4>
              <p className="text-xs text-orange-700">
                Esta sesión deberá ser revisada y aprobada por un supervisor
                antes de cerrarse definitivamente debido a que la diferencia
                supera el monto máximo permitido.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all"
        >
          {formData.requiresApproval
            ? "Enviar para Aprobación"
            : "Cerrar Sesión"}
        </button>
      </div>
    </form>
  );
};

export default CloseSessionModal;