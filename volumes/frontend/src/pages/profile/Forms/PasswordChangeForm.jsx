// ====================================
// volumes/frontend/src/pages/profile/Forms/PasswordChangeForm.jsx
// Formulario para cambio de contraseña con API real
// Con revalidación silenciosa de sesión y UX simplificada
// ====================================

import React, { useState, useEffect, useCallback } from "react";
import { changeMyPassword } from "@/services/userService";
import { getTokensStatus, isSessionValid } from "@/services/authService";
import { reconnectSessionSilent, hasRefreshToken } from "@/services/axiosInterceptor";
import { shouldLog } from "@/utils/environment";

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

  const [tokenStatus, setTokenStatus] = useState({
    isValid: false,
    checked: false,
    error: null,
  });

  // ---------- utilidades locales ----------
  const validatePassword = (password) => ({
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  });

  const passwordValidations = validatePassword(formData.newPassword);
  const isPasswordValid = Object.values(passwordValidations).every(Boolean);

  // Revisión y revalidación silenciosa (una pasada por invocación)
  const checkAndMaybeReconnect = useCallback(async () => {
    try {
      const status = getTokensStatus();
      const valid = isSessionValid();
      if (shouldLog()) console.log("🔍 token pre", { status, valid });

      if (hasRefreshToken() && (!valid || !status.hasValid)) {
        try {
          // refresca si expira pronto o no hay access válido
          await reconnectSessionSilent(120);
        } catch (e) {
          if (shouldLog()) console.warn("⚠️ silent refresh falló:", e);
        }
      }

      const status2 = getTokensStatus();
      const valid2 = isSessionValid();
      setTokenStatus({ isValid: valid2 && status2.hasValid, checked: true, error: null });

      if (shouldLog()) console.log("🔍 token post", { status2, valid2 });
    } catch (err) {
      setTokenStatus({ isValid: false, checked: true, error: "Error al verificar la sesión" });
      if (shouldLog()) console.error("❌ check tokens", err);
    }
  }, []);

  useEffect(() => {
    // al montar
    checkAndMaybeReconnect();

    // reintentar al volver a foco / visibilidad
    const onFocus = () => checkAndMaybeReconnect();
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkAndMaybeReconnect();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [checkAndMaybeReconnect]);

  // ---------- handlers ----------
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
    if (errors.submit) setErrors((p) => ({ ...p, submit: "" }));

    // validación confirmación
    if (field === "confirmPassword" || field === "newPassword") {
      const newPwd = field === "newPassword" ? value : formData.newPassword;
      const confirmPwd = field === "confirmPassword" ? value : formData.confirmPassword;
      setErrors((p) => ({
        ...p,
        confirmPassword: confirmPwd && newPwd !== confirmPwd ? "Las contraseñas no coinciden" : "",
      }));
    }
  };

  const togglePasswordVisibility = (field) =>
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));

  const redirectToLogin = () => {
    if (shouldLog()) console.log("🔄 redirect login por sesión inválida");
    setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    window.location.href = "/login";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      // Garantizar token fresco antes de llamar al backend
      try {
        await reconnectSessionSilent(180); // si faltan ≤ 3 min, refrescar
      } catch {
        // si falla, seguimos y el interceptor/401 controlará
      }

      // Chequeo final
      if (!isSessionValid()) {
        setTokenStatus((s) => ({ ...s, isValid: false, checked: true }));
        setErrors({
          auth: {
            type: "auth",
            title: "Sesión No Válida",
            message: "Tu sesión no es válida. Es necesario iniciar sesión nuevamente.",
            action: "login",
          },
        });
        return;
      }

      // Validaciones locales
      const newErrors = {};
      if (!formData.currentPassword) newErrors.currentPassword = "La contraseña actual es requerida";
      if (!isPasswordValid) newErrors.newPassword = "La nueva contraseña no cumple los requisitos";
      if (formData.newPassword !== formData.confirmPassword)
        newErrors.confirmPassword = "Las contraseñas no coinciden";
      if (Object.keys(newErrors).length) {
        setErrors(newErrors);
        return;
      }

      if (shouldLog()) console.log("🔑 cambiando contraseña…");

      const response = await changeMyPassword({
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
        confirm_password: formData.confirmPassword,
      });

      if (response?.success) {
        setSuccess(true);
        setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setErrors({ submit: response?.message || "Error al cambiar la contraseña." });
      }
    } catch (error) {
      if (shouldLog()) console.error("❌ change password", error);

      if (error?.status === 401 || error?.response?.status === 401) {
        setErrors({
          auth: {
            type: "auth",
            title: "Sesión Expirada",
            message: "Tu sesión ha expirado. Serás redirigido al login.",
            action: "login",
          },
        });
        setTimeout(() => redirectToLogin(), 2500);
        return;
      }

      setErrors({ submit: error?.message || "Error al cambiar la contraseña." });
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- UI auxiliares ----------
  const EyeIcon = ({ show }) =>
    show ? (
      // Eye Off
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
      </svg>
    ) : (
      // Eye
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    );

  const BtnRefresh = () => {
    return (
      <button
        type="button"
        onClick={async () => {
          try {
            await reconnectSessionSilent(120);
            const status2 = getTokensStatus();
            const valid2 = isSessionValid();
            setTokenStatus({ isValid: valid2 && status2.hasValid, checked: true, error: null });
          } catch (err) {
            if (shouldLog()) console.warn("Revalidación manual falló:", err);
          }
        }}
        className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
      >
        Validar sesión
      </button>
    );
  };

  // Estado de sesión: intenta silencioso antes; si sigue inválida, muestra botón “Validar sesión”
  const SessionStatus = () => {
    // No mostrar nada mientras no se haya verificado (oculta el aviso azul)
    if (!tokenStatus.checked) return null;

    // Mostrar solo si la sesión NO es válida
    if (!tokenStatus.isValid) {
      return (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded">
          <p className="text-red-700 dark:text-red-300 mb-2">
            ⚠️ Sesión no válida. Es necesario iniciar sesión nuevamente para cambiar la contraseña.
          </p>

          {/* Renderiza el botón de revalidación solo si existe refresh token */}
          {hasRefreshToken() ? (
            <BtnRefresh />
          ) : (
            <button
              type="button"
              onClick={() => (window.location.href = "/login")}
              className="px-3 py-1 text-sm rounded bg-gray-700 text-white hover:bg-gray-800 focus:ring-2 focus:ring-gray-500"
            >
              Ir a iniciar sesión
            </button>
          )}
        </div>
      );
    }

    // Sesión válida: no mostrar nada (oculta el aviso verde)
    return null;
  };

  // ---------- render ----------
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
          <span className="text-orange-600 dark:text-orange-400 text-lg">🔑</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cambiar Contraseña</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza tu contraseña para mantener tu cuenta segura</p>
        </div>
      </div>

      <SessionStatus />

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300 font-medium">¡Contraseña actualizada exitosamente!</p>
        </div>
      )}

      {errors.auth && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">{errors.auth.title}</h4>
          <p className="text-sm text-red-600 dark:text-red-400">{errors.auth.message}</p>
          {errors.auth.action === "login" && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-2">Serás redirigido al login en unos segundos…</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 flex-1">
        {/* Contraseña actual */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contraseña Actual</label>
          <div className="relative">
            <input
              type={showPasswords.current ? "text" : "password"}
              value={formData.currentPassword}
              onChange={(e) => handleInputChange("currentPassword", e.target.value)}
              className={`w-full px-3 py-2 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.currentPassword ? "border-red-500" : "border-gray-300"
                }`}
              placeholder="Ingresa tu contraseña actual"
              disabled={isLoading || !tokenStatus.isValid}
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility("current")}
              disabled={isLoading || !tokenStatus.isValid}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-300 transition-all disabled:opacity-50"
              aria-label={showPasswords.current ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <EyeIcon show={showPasswords.current} />
            </button>
          </div>
          {errors.currentPassword && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.currentPassword}</p>}
        </div>

        {/* Nueva contraseña */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nueva Contraseña</label>
          <div className="relative">
            <input
              type={showPasswords.new ? "text" : "password"}
              value={formData.newPassword}
              onChange={(e) => handleInputChange("newPassword", e.target.value)}
              className={`w-full px-3 py-2 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.newPassword ? "border-red-500" : "border-gray-300"
                }`}
              placeholder="Mínimo 8 caracteres"
              disabled={isLoading || !tokenStatus.isValid}
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility("new")}
              disabled={isLoading || !tokenStatus.isValid}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-300 transition-all disabled:opacity-50"
              aria-label={showPasswords.new ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <EyeIcon show={showPasswords.new} />
            </button>
          </div>
          {errors.newPassword && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.newPassword}</p>}

          {/* Validaciones */}
          {formData.newPassword && (
            <div className="mt-3 space-y-2 text-xs">
              <div className={`flex items-center ${passwordValidations.minLength ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                <span className="mr-2">{passwordValidations.minLength ? "✅" : "❌"}</span>Mínimo 8 caracteres
              </div>
              <div className={`flex items-center ${passwordValidations.hasUppercase ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                <span className="mr-2">{passwordValidations.hasUppercase ? "✅" : "❌"}</span>Al menos una letra mayúscula
              </div>
              <div className={`flex items-center ${passwordValidations.hasLowercase ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                <span className="mr-2">{passwordValidations.hasLowercase ? "✅" : "❌"}</span>Al menos una letra minúscula
              </div>
              <div className={`flex items-center ${passwordValidations.hasNumber ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                <span className="mr-2">{passwordValidations.hasNumber ? "✅" : "❌"}</span>Al menos un número
              </div>
              <div className={`flex items-center ${passwordValidations.hasSpecial ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                <span className="mr-2">{passwordValidations.hasSpecial ? "✅" : "❌"}</span>Al menos un carácter especial
              </div>
            </div>
          )}
        </div>

        {/* Confirmar contraseña */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirmar Nueva Contraseña</label>
          <div className="relative">
            <input
              type={showPasswords.confirm ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
              className={`w-full px-3 py-2 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.confirmPassword ? "border-red-500" : "border-gray-300"
                }`}
              placeholder="Repite tu nueva contraseña"
              disabled={isLoading || !tokenStatus.isValid}
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility("confirm")}
              disabled={isLoading || !tokenStatus.isValid}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-300 transition-all disabled:opacity-50"
              aria-label={showPasswords.confirm ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <EyeIcon show={showPasswords.confirm} />
            </button>
          </div>
          {errors.confirmPassword && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>}
        </div>

        {/* Error general */}
        {errors.submit && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <pre className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap font-sans">
              {errors.submit}
            </pre>
          </div>
        )}

        {/* Botón */}
        <div className="flex justify-end mt-auto">
          <button
            type="submit"
            disabled={
              isLoading ||
              !tokenStatus.isValid ||
              !formData.currentPassword ||
              !isPasswordValid ||
              formData.newPassword !== formData.confirmPassword
            }
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
          >
            {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <span>{isLoading ? "Actualizando..." : tokenStatus.isValid ? "Cambiar Contraseña" : "Sesión No Válida"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default PasswordChangeForm;
