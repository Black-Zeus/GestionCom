import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import { formatCurrency, formatDateTime } from "@/utils/formats";

/**
 * ClosingModal
 * Modal para registrar cierre de caja
 */
const ClosingModal = ({
  isOpen,
  onClose,
  onSave,
  currentSession,
  register,
  cashMovements,
}) => {
  const [formData, setFormData] = useState({
    physical_amount: 0,
    closing_notes: "",
  });

  const [errors, setErrors] = useState({});
  const [theoreticalAmount, setTheoreticalAmount] = useState(0);

  useEffect(() => {
    if (currentSession) {
      // Calcular monto teórico basado en apertura y movimientos
      const calculated = calculateTheoreticalAmount(currentSession, cashMovements);
      setTheoreticalAmount(calculated);
      
      // Pre-cargar con el monto teórico calculado
      setFormData({
        physical_amount: calculated,
        closing_notes: "",
      });
    }
  }, [currentSession, cashMovements]);

  /**
   * Calcular monto teórico de cierre
   */
  const calculateTheoreticalAmount = (session, movements) => {
    // Monto inicial de apertura
    let theoretical = session.opening_amount;

    // Filtrar movimientos de esta sesión
    const sessionMovements = movements.filter(
      (m) => m.cash_register_session_id === session.id
    );

    // Sumar/restar movimientos de efectivo
    sessionMovements.forEach((movement) => {
      // Solo considerar movimientos en efectivo (payment_method_id === 1)
      if (movement.payment_method_id === 1) {
        theoretical += movement.amount;
      }
    });

    return Math.max(0, theoretical); // No permitir negativos
  };

  /**
   * Cambiar campo del formulario
   */
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Limpiar error del campo
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  /**
   * Validar formulario
   */
  const validateForm = () => {
    const newErrors = {};

    if (formData.physical_amount < 0) {
      newErrors.physical_amount = "El monto no puede ser negativo";
    }

    if (formData.physical_amount === 0 || formData.physical_amount === "") {
      newErrors.physical_amount = "Debe ingresar el monto de cierre";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Enviar formulario
   */
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSave({
      physical_amount: parseFloat(formData.physical_amount),
      closing_notes: formData.closing_notes,
    });

    // Reset form
    setFormData({
      physical_amount: 0,
      closing_notes: "",
    });
    setErrors({});
  };

  if (!isOpen || !currentSession) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Registrar cierre de caja
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Declare el monto de efectivo en caja al momento del cierre.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon name="FaTimes" className="text-xl" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Body */}
          <div className="px-6 py-4 space-y-6">
            {/* Información de la sesión */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Información de la sesión
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Sesión</span>
                  <div className="font-medium text-gray-900">
                    {currentSession.session_code}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Caja</span>
                  <div className="font-medium text-gray-900">
                    {register?.register_name || currentSession.cash_register_name}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Fecha apertura</span>
                  <div className="font-medium text-gray-900">
                    {formatDateTime(currentSession.opening_datetime)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Monto inicial</span>
                  <div className="font-medium text-gray-900">
                    {formatCurrency(currentSession.opening_amount)}
                  </div>
                </div>
              </div>

              {/* Monto teórico calculado - destacado */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    Monto teórico calculado:
                  </span>
                  <span className="text-lg font-bold text-blue-900">
                    {formatCurrency(theoreticalAmount)}
                  </span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  Calculado: Monto inicial + movimientos de efectivo del día
                </p>
              </div>
            </div>

            {/* Datos del cierre */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Datos del cierre
              </h3>

              <div className="space-y-4">
                {/* Monto físico en caja */}
                <div>
                  <label
                    htmlFor="physicalAmount"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Monto de cierre (Efectivo físico contado) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      id="physicalAmount"
                      value={formData.physical_amount}
                      onChange={(e) =>
                        handleChange("physical_amount", e.target.value)
                      }
                      min="0"
                      step="1"
                      className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                        errors.physical_amount
                          ? "border-red-300"
                          : "border-gray-300"
                      }`}
                      placeholder="0"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Este campo está pre-cargado con el monto teórico calculado.
                    Ajuste el valor según el efectivo físico real contado en caja.
                  </p>
                  {errors.physical_amount && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.physical_amount}
                    </p>
                  )}
                </div>

                {/* Notas de cierre */}
                <div>
                  <label
                    htmlFor="closingNotes"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Notas de cierre (opcional)
                  </label>
                  <textarea
                    id="closingNotes"
                    value={formData.closing_notes}
                    onChange={(e) =>
                      handleChange("closing_notes", e.target.value)
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Ej: Cierre turno tarde, sin incidencias."
                  />
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-900">
                <strong>Importante:</strong> El monto de cierre corresponde al
                efectivo físico contado en la caja. El sistema calculará la
                diferencia con el monto teórico durante el proceso de arqueo.
                El estado de la sesión cambiará a <strong>Cerrada</strong>.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Icon name="FaLock" />
              Confirmar cierre
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClosingModal;