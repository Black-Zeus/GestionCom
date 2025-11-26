import React, { useState } from "react";
import { Icon } from "@components/ui/icon/iconManager";

const ChangePasswordModal = ({ user, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
    reason: "",
  });

  const [showPassword, setShowPassword] = useState({
    new: false,
    confirm: false,
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.newPassword) {
      newErrors.newPassword = "La nueva contraseña es requerida";
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = "La contraseña debe tener al menos 6 caracteres";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirme la nueva contraseña";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }

    if (!formData.reason.trim()) {
      newErrors.reason = "El motivo del cambio es requerido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      {/* Info del usuario */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-gray-900 font-medium">
          <strong>Usuario:</strong> {user?.fullName || user?.username}
        </p>
        <p className="text-sm text-gray-600">{user?.email}</p>
      </div>

      {/* Nueva contraseña */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Nueva Contraseña *
        </label>
        <div className="relative">
          <input
            type={showPassword.new ? "text" : "password"}
            value={formData.newPassword}
            onChange={(e) => handleChange("newPassword", e.target.value)}
            className={`w-full px-3 py-2.5 pr-10 border-2 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all ${
              errors.newPassword ? "border-red-500" : "border-gray-200"
            }`}
            placeholder="Ingrese la nueva contraseña"
          />
          <button
            type="button"
            onClick={() =>
              setShowPassword({ ...showPassword, new: !showPassword.new })
            }
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <Icon
              name={showPassword.new ? "eyeSlash" : "eye"}
              className="text-sm"
            />
          </button>
        </div>
        {errors.newPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
        )}
      </div>

      {/* Confirmar contraseña */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Confirmar Contraseña *
        </label>
        <div className="relative">
          <input
            type={showPassword.confirm ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={(e) => handleChange("confirmPassword", e.target.value)}
            className={`w-full px-3 py-2.5 pr-10 border-2 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all ${
              errors.confirmPassword ? "border-red-500" : "border-gray-200"
            }`}
            placeholder="Confirme la nueva contraseña"
          />
          <button
            type="button"
            onClick={() =>
              setShowPassword({
                ...showPassword,
                confirm: !showPassword.confirm,
              })
            }
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <Icon
              name={showPassword.confirm ? "eyeSlash" : "eye"}
              className="text-sm"
            />
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Motivo del cambio */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Motivo del Cambio *
        </label>
        <textarea
          value={formData.reason}
          onChange={(e) => handleChange("reason", e.target.value)}
          rows={3}
          className={`w-full px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all resize-none ${
            errors.reason ? "border-red-500" : "border-gray-200"
          }`}
          placeholder="Indique el motivo del cambio de contraseña..."
        />
        {errors.reason && (
          <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
        )}
      </div>

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
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
        >
          Cambiar Contraseña
        </button>
      </div>
    </form>
  );
};

export default ChangePasswordModal;
