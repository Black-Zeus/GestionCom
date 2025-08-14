// ====================================
// volumes/frontend/src/pages/profile/Forms/PasswordChangeForm.jsx
// Formulario para cambio de contraseña
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
      } else if (confirmPassword && newPassword === confirmPassword) {
        setErrors((prev) => ({ ...prev, confirmPassword: "" }));
      }
    }

    setSuccess(false);
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // Validaciones
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = "La contraseña actual es requerida";
    }

    if (!formData.newPassword) {
      newErrors.newPassword = "La nueva contraseña es requerida";
    } else if (!isPasswordValid) {
      newErrors.newPassword = "La contraseña no cumple con los requisitos";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirma tu nueva contraseña";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword =
        "La nueva contraseña debe ser diferente a la actual";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      // Simulación de API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simular éxito
      setSuccess(true);
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setErrors({
        submit: "Error al cambiar la contraseña. Intenta nuevamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getValidationIcon = (isValid) => {
    return isValid ? "✅" : "❌";
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
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
      <form onSubmit={handleSubmit} className="space-y-6">
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
              className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.currentPassword ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Ingresa tu contraseña actual"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility("current")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPasswords.current ? "🙈" : "👁️"}
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
              className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.newPassword ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Ingresa tu nueva contraseña"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility("new")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPasswords.new ? "🙈" : "👁️"}
            </button>
          </div>
          {errors.newPassword && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.newPassword}
            </p>
          )}

          {/* Validaciones de contraseña */}
          {formData.newPassword && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Requisitos de la contraseña:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                <div className="flex items-center space-x-2">
                  <span>
                    {getValidationIcon(passwordValidations.minLength)}
                  </span>
                  <span
                    className={
                      passwordValidations.minLength
                        ? "text-green-600 dark:text-green-400"
                        : "text-gray-500 dark:text-gray-400"
                    }
                  >
                    Mínimo 8 caracteres
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>
                    {getValidationIcon(passwordValidations.hasUppercase)}
                  </span>
                  <span
                    className={
                      passwordValidations.hasUppercase
                        ? "text-green-600 dark:text-green-400"
                        : "text-gray-500 dark:text-gray-400"
                    }
                  >
                    Mayúscula
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>
                    {getValidationIcon(passwordValidations.hasLowercase)}
                  </span>
                  <span
                    className={
                      passwordValidations.hasLowercase
                        ? "text-green-600 dark:text-green-400"
                        : "text-gray-500 dark:text-gray-400"
                    }
                  >
                    Minúscula
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>
                    {getValidationIcon(passwordValidations.hasNumber)}
                  </span>
                  <span
                    className={
                      passwordValidations.hasNumber
                        ? "text-green-600 dark:text-green-400"
                        : "text-gray-500 dark:text-gray-400"
                    }
                  >
                    Número
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>
                    {getValidationIcon(passwordValidations.hasSpecial)}
                  </span>
                  <span
                    className={
                      passwordValidations.hasSpecial
                        ? "text-green-600 dark:text-green-400"
                        : "text-gray-500 dark:text-gray-400"
                    }
                  >
                    Carácter especial
                  </span>
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
              className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.confirmPassword ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Confirma tu nueva contraseña"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility("confirm")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPasswords.confirm ? "🙈" : "👁️"}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {/* Error de envío */}
        {errors.submit && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">
              {errors.submit}
            </p>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => {
              setFormData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
              });
              setErrors({});
              setSuccess(false);
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={
              isLoading ||
              !isPasswordValid ||
              formData.newPassword !== formData.confirmPassword
            }
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading && (
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            <span>{isLoading ? "Actualizando..." : "Cambiar Contraseña"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default PasswordChangeForm;
