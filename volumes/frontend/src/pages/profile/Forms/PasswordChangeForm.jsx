// ====================================
// volumes/frontend/src/pages/profile/Forms/PasswordChangeForm.jsx
// Formulario para cambio de contraseña con iconos del login
// ====================================

import React, { useState } from "react";

const PasswordChangeForm = () => {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validaciones en tiempo real
  const validatePassword = (password) => {
    const validations = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    return validations;
  };

  const passwordValidations = validatePassword(formData.newPassword);
  const isPasswordValid = Object.values(passwordValidations).every(Boolean);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Limpiar errores cuando el usuario escriba
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    // Validar confirmación de contraseña
    if (field === "confirmPassword" || field === "newPassword") {
      const newPassword =
        field === "newPassword" ? value : formData.newPassword;
      const confirmPassword =
        field === "confirmPassword" ? value : formData.confirmPassword;

      if (confirmPassword && newPassword !== confirmPassword) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: "Las contraseñas no coinciden",
        }));
      } else {
        setErrors((prev) => ({ ...prev, confirmPassword: "" }));
      }
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validar datos antes de enviar
      const newErrors = {};

      if (!formData.currentPassword) {
        newErrors.currentPassword = "La contraseña actual es requerida";
      }

      if (!isPasswordValid) {
        newErrors.newPassword = "La nueva contraseña no cumple los requisitos";
      }

      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = "Las contraseñas no coinciden";
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      // Simular API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Éxito
      setSuccess(true);
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      // Ocultar mensaje de éxito después de 5 segundos
      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      setErrors({
        submit:
          "Error al cambiar la contraseña. Verifica tu contraseña actual e intenta nuevamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getValidationIcon = (isValid) => {
    return isValid ? "✅" : "❌";
  };

  // Componente para el icono de mostrar/ocultar (igual que en login)
  const EyeIcon = ({ show }) => {
    if (show) {
      // Icono "Eye Off" (ocultar)
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
        </svg>
      );
    } else {
      // Icono "Eye" (mostrar)
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
            <span className="text-orange-600 dark:text-orange-400 text-lg">
              🔐
            </span>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cambiar Contraseña
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Actualiza tu contraseña para mantener tu cuenta segura
          </p>
        </div>
      </div>

      {/* Mensaje de éxito */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-green-600 dark:text-green-400 text-lg">
              ✅
            </span>
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">
              ¡Contraseña actualizada exitosamente!
            </p>
          </div>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6 flex-1">
        {/* Contraseña actual */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Contraseña Actual
          </label>
          <div className="relative">
            <input
              type={showPasswords.current ? "text" : "password"}
              value={formData.currentPassword}
              onChange={(e) =>
                handleInputChange("currentPassword", e.target.value)
              }
              className={`w-full px-3 py-2 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.currentPassword ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Ingresa tu contraseña actual"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility("current")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 focus:outline-none focus:scale-110"
              aria-label={showPasswords.current ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <EyeIcon show={showPasswords.current} />
            </button>
          </div>
          {errors.currentPassword && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.currentPassword}
            </p>
          )}
        </div>

        {/* Nueva contraseña */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nueva Contraseña
          </label>
          <div className="relative">
            <input
              type={showPasswords.new ? "text" : "password"}
              value={formData.newPassword}
              onChange={(e) => handleInputChange("newPassword", e.target.value)}
              className={`w-full px-3 py-2 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.newPassword ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Mínimo 8 caracteres"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility("new")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 focus:outline-none focus:scale-110"
              aria-label={showPasswords.new ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <EyeIcon show={showPasswords.new} />
            </button>
          </div>
          {errors.newPassword && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.newPassword}
            </p>
          )}

          {/* Validaciones de contraseña */}
          {formData.newPassword && (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div
                  className={`flex items-center space-x-2 ${
                    passwordValidations.minLength
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  <span>{getValidationIcon(passwordValidations.minLength)}</span>
                  <span>Mínimo 8 caracteres</span>
                </div>
                <div
                  className={`flex items-center space-x-2 ${
                    passwordValidations.hasUppercase
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  <span>{getValidationIcon(passwordValidations.hasUppercase)}</span>
                  <span>Al menos una letra mayúscula</span>
                </div>
                <div
                  className={`flex items-center space-x-2 ${
                    passwordValidations.hasLowercase
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  <span>{getValidationIcon(passwordValidations.hasLowercase)}</span>
                  <span>Al menos una letra minúscula</span>
                </div>
                <div
                  className={`flex items-center space-x-2 ${
                    passwordValidations.hasNumber
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  <span>{getValidationIcon(passwordValidations.hasNumber)}</span>
                  <span>Al menos un número</span>
                </div>
                <div
                  className={`flex items-center space-x-2 ${
                    passwordValidations.hasSpecial
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  <span>{getValidationIcon(passwordValidations.hasSpecial)}</span>
                  <span>Al menos un carácter especial</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirmar contraseña */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Confirmar Nueva Contraseña
          </label>
          <div className="relative">
            <input
              type={showPasswords.confirm ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) =>
                handleInputChange("confirmPassword", e.target.value)
              }
              className={`w-full px-3 py-2 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.confirmPassword ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Repite tu nueva contraseña"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility("confirm")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 focus:outline-none focus:scale-110"
              aria-label={showPasswords.confirm ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <EyeIcon show={showPasswords.confirm} />
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {/* Error general */}
        {errors.submit && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">
              {errors.submit}
            </p>
          </div>
        )}

        {/* Botón de envío */}
        <div className="flex justify-end mt-auto">
          <button
            type="submit"
            disabled={isLoading || !isPasswordValid || formData.newPassword !== formData.confirmPassword}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            <span>{isLoading ? "Actualizando..." : "Cambiar Contraseña"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default PasswordChangeForm;