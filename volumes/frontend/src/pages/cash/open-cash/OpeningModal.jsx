import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";

/**
 * OpeningModal
 * Modal para registrar nueva apertura de caja
 */
const OpeningModal = ({
  isOpen,
  onClose,
  onSave,
  currentBranch,
  currentUser,
  registers,
  sessions,
  selectedRegister,
}) => {
  const [formData, setFormData] = useState({
    cash_register_id: selectedRegister?.id || "",
    opening_amount: 0,
    opening_notes: "",
  });

  const [errors, setErrors] = useState({});
  const [registerInfo, setRegisterInfo] = useState("");
  const [isRegisterLocked, setIsRegisterLocked] = useState(false);

  useEffect(() => {
    if (selectedRegister) {
      setFormData((prev) => ({
        ...prev,
        cash_register_id: selectedRegister.id,
      }));
      // Si viene con una caja pre-seleccionada, bloquear el dropdown
      setIsRegisterLocked(true);
    } else {
      setIsRegisterLocked(false);
    }
  }, [selectedRegister]);

  useEffect(() => {
    if (formData.cash_register_id) {
      const register = registers.find(
        (r) => r.id === parseInt(formData.cash_register_id)
      );
      if (register) {
        const info = `${register.terminal_identifier} · IP: ${register.ip_address} · ${register.location_description}`;
        setRegisterInfo(info);
      }
    } else {
      setRegisterInfo("");
    }
  }, [formData.cash_register_id, registers]);

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

    if (!formData.cash_register_id) {
      newErrors.cash_register_id = "Debe seleccionar una caja";
    }

    if (formData.opening_amount < 0) {
      newErrors.opening_amount = "El monto no puede ser negativo";
    }

    // Validar que no exista sesión abierta
    if (formData.cash_register_id) {
      const existingSession = sessions.find(
        (s) =>
          s.cash_register_id === parseInt(formData.cash_register_id) &&
          s.cashier_user_id === currentUser.id &&
          s.status_code === "OPEN"
      );

      if (existingSession) {
        newErrors.cash_register_id =
          "Ya existe una sesión abierta para esta caja";
      }
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
      cash_register_id: parseInt(formData.cash_register_id),
      opening_amount: parseFloat(formData.opening_amount),
      opening_notes: formData.opening_notes,
    });

    // Reset form
    setFormData({
      cash_register_id: "",
      opening_amount: 0,
      opening_notes: "",
    });
    setErrors({});
    setIsRegisterLocked(false);
  };

  if (!isOpen) return null;

  // Obtener cajas autorizadas para el usuario en la sucursal actual
  const authorizedRegisters = registers.filter(
    (r) => r.authorized_for_current_user && r.branch_id === currentBranch.id
  );

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
              Registrar apertura de caja
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Inicie una nueva sesión de caja. Solo se permite una apertura
              activa por caja y usuario.
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
            {/* Contexto */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Contexto de la apertura
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Sucursal</span>
                  <div className="font-medium text-gray-900">
                    {currentBranch.branch_name}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Usuario</span>
                  <div className="font-medium text-gray-900">
                    {currentUser.full_name}
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
                {/* Caja */}
                <div>
                  <label
                    htmlFor="openingRegisterSelect"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Caja
                  </label>
                  <select
                    id="openingRegisterSelect"
                    value={formData.cash_register_id}
                    onChange={(e) =>
                      handleChange("cash_register_id", e.target.value)
                    }
                    disabled={isRegisterLocked}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                      errors.cash_register_id
                        ? "border-red-300"
                        : "border-gray-300"
                    } ${
                      isRegisterLocked
                        ? "bg-gray-100 cursor-not-allowed text-gray-600"
                        : ""
                    }`}
                  >
                    <option value="">Seleccione una caja...</option>
                    {authorizedRegisters.map((register) => (
                      <option key={register.id} value={register.id}>
                        {register.register_code} - {register.register_name}
                      </option>
                    ))}
                  </select>
                  {registerInfo && (
                    <p className="mt-1 text-xs text-gray-500">{registerInfo}</p>
                  )}
                  {isRegisterLocked && (
                    <p className="mt-1 text-xs text-blue-600">
                      Caja seleccionada automáticamente desde el estado actual
                    </p>
                  )}
                  {errors.cash_register_id && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.cash_register_id}
                    </p>
                  )}
                </div>

                {/* Monto de apertura */}
                <div>
                  <label
                    htmlFor="openingAmount"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Monto de apertura
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      id="openingAmount"
                      value={formData.opening_amount}
                      onChange={(e) =>
                        handleChange("opening_amount", e.target.value)
                      }
                      min="0"
                      step="1"
                      className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                        errors.opening_amount
                          ? "border-red-300"
                          : "border-gray-300"
                      }`}
                      placeholder="0"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Monto inicial entregado para vueltos y gastos menores. Puede
                    ser 0 o superior.
                  </p>
                  {errors.opening_amount && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.opening_amount}
                    </p>
                  )}
                </div>

                {/* Notas */}
                <div>
                  <label
                    htmlFor="openingNotes"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Notas de apertura (opcional)
                  </label>
                  <textarea
                    id="openingNotes"
                    value={formData.opening_notes}
                    onChange={(e) => handleChange("opening_notes", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Ej: Apertura turno mañana, punto de venta sala de ventas."
                  />
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-900">
                <strong>Regla de operación:</strong> Por cada caja y usuario
                solo se permite una sesión en estado <strong>Abierta</strong>.
                Para volver a abrir la misma caja, la sesión anterior debe
                estar en estado <strong>Cerrada</strong> o{" "}
                <strong>Arqueada</strong>.
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
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Confirmar apertura
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OpeningModal;