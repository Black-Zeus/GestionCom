// ====================================
// volumes/frontend/src/pages/profile/Forms/PersonalInfoForm.jsx
// Formulario para editar información personal - INTEGRADO CON API REAL
// ====================================

import React, { useState, useEffect } from "react";
import { useAuth, useUserProfile, useProfileLoading } from "@/store/authStore";
import { updateMyProfile } from "@/services/userService";
import { shouldLog } from "@/utils/environment";

// Helper: construir displayName derivado
const buildDisplayName = (first, last, uname) => {
  const fn = (first || "").trim();
  const ln = (last || "").trim();
  const un = (uname || "").trim();
  const base = [fn, ln].filter(Boolean).join(" ").replace(/\s+/g, " ");
  return un ? `${base} (${un})` : base;
};

const PersonalInfoForm = () => {
  const { loadUserProfile } = useAuth(); // ya no usamos updateUserProfile aquí
  const userProfile = useUserProfile();
  const isProfileLoading = useProfileLoading();

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    displayName: "",
  });

  const [originalData, setOriginalData] = useState({});

  // ==========================================
  // EFFECTS - CARGAR DATOS DEL PERFIL
  // ==========================================

  useEffect(() => {
    if (userProfile) {
      const profileData = {
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        email: userProfile.email || "",
        phone: userProfile.phone || "",
        displayName: buildDisplayName(
          userProfile.firstName,
          userProfile.lastName,
          userProfile.username
        ),
      };

      setFormData(profileData);
      setOriginalData(profileData);

      if (shouldLog()) {
        console.log("📋 Personal info form loaded with profile data");
      }
    }
  }, [userProfile]);

  // Cargar perfil si no está disponible
  useEffect(() => {
    if (!userProfile && !isProfileLoading) {
      loadUserProfile();
    }
  }, [userProfile, isProfileLoading, loadUserProfile]);

  // Recalcular displayName cuando cambia first/last/username
  useEffect(() => {
    if (!userProfile) return;
    const computed = buildDisplayName(
      formData.firstName,
      formData.lastName,
      userProfile.username
    );
    if (formData.displayName !== computed) {
      setFormData((prev) => ({ ...prev, displayName: computed }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.firstName, formData.lastName, userProfile?.username]);

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
    setSuccess(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setSuccess(false);
    setErrors({});
  };

  const handleCancel = () => {
    setFormData({ ...originalData });
    setIsEditing(false);
    setErrors({});
    setSuccess(false);
  };

  // Solo considerar campos editables
  const hasChanges = () => {
    const keys = ["firstName", "lastName", "email", "phone"];
    return keys.some((k) => formData[k] !== originalData[k]);
  };

  // ==========================================
  // VALIDACIONES
  // ==========================================

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    if (!phone) return true; // opcional
    const phoneRegex = /^(\+56)?[0-9]{8,9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "El nombre es requerido";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "El apellido es requerido";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "El formato del email no es válido";
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone =
        "El formato del teléfono no es válido (+56 seguido de 8-9 dígitos)";
    }

    // displayName es derivado; no se valida como requerido aquí
    return newErrors;
  };

  // ==========================================
  // SUBMIT
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      if (shouldLog()) console.log("📝 Updating user profile...");

      // Payload solo con campos editables; omitir phone si queda vacío
      const trimmedPhone = (formData.phone || "").trim();
      const payload = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        ...(trimmedPhone ? { phone: trimmedPhone } : {}),
        // NO enviar display_name (derivado)
      };

      // PUT /users/{id}
      const response = await updateMyProfile({ id: userProfile.id, ...payload });

      if (response.success) {
        // No actualizamos el store aquí: userService se encarga de refrescar el perfil tras 200
        setSuccess(true);
        setIsEditing(false);

        if (shouldLog()) console.log("✅ Profile updated successfully");

        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (error) {
      if (shouldLog()) console.error("❌ Failed to update profile:", error);

      if (error.status === 422 && error.errors) {
        const backendErrors = {};
        Object.keys(error.errors).forEach((field) => {
          const fieldMap = {
            first_name: "firstName",
            last_name: "lastName",
            // display_name intencionalmente no mapeado (no editable)
          };
          const frontendField = fieldMap[field] || field;
          backendErrors[frontendField] = error.errors[field][0];
        });
        setErrors(backendErrors);
      } else {
        setErrors({
          submit:
            error.message ||
            "Error al actualizar la información. Intenta nuevamente.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // LOADING STATE
  // ==========================================

  if (isProfileLoading && !userProfile) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No se pudo cargar la información del perfil
          </p>
          <button
            onClick={() => loadUserProfile(true)}
            className="mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Información Personal
        </h2>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:ring-2 focus:ring-blue-500"
          >
            Editar
          </button>
        )}
      </div>

      {/* Success message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-green-700 dark:text-green-300">
              Información actualizada exitosamente
            </p>
          </div>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors ${
                errors.firstName ? "border-red-500" : "border-gray-300 dark:border-gray-600"
              }`}
              placeholder="Tu nombre"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.firstName}</p>
            )}
          </div>

          {/* Apellido */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Apellido <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors ${
                errors.lastName ? "border-red-500" : "border-gray-300 dark:border-gray-600"
              }`}
              placeholder="Tu apellido"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.lastName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors ${
                errors.email ? "border-red-500" : "border-gray-300 dark:border-gray-600"
              }`}
              placeholder="tu@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
            )}
          </div>

          {/* Usuario (solo lectura) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Usuario
            </label>
            <input
              type="text"
              value={userProfile.username || ""}
              readOnly
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 cursor-default"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Este identificador es de solo lectura.
            </p>
          </div>

          {/* Teléfono */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors ${
                errors.phone ? "border-red-500" : "border-gray-300 dark:border-gray-600"
              }`}
              placeholder="+56 9 1234 5678"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Formato: +56 seguido de 8-9 dígitos
            </p>
          </div>

          {/* Nombre para mostrar (solo lectura, derivado) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nombre para mostrar
            </label>
            <input
              type="text"
              value={formData.displayName}
              readOnly
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 cursor-default"
              placeholder="Se calcula automáticamente"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Se construye como: Nombre + Apellido + (usuario)
            </p>
          </div>
        </div>

        {/* Información adicional de solo lectura */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Nombre de usuario:</span>
              <div className="font-medium text-gray-900 dark:text-white">
                {userProfile.username}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Nombre completo:</span>
              <div className="font-medium text-gray-900 dark:text-white">
                {formData.firstName} {formData.lastName}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Iniciales:</span>
              <div className="font-medium text-gray-900 dark:text-white">
                {formData.firstName.charAt(0)}
                {formData.lastName.charAt(0)}
              </div>
            </div>
          </div>
        </div>

        {/* Error de envío */}
        {errors.submit && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{errors.submit}</p>
          </div>
        )}

        {/* Botones */}
        {isEditing && (
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !hasChanges()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
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
              <span>{isLoading ? "Guardando..." : "Guardar Cambios"}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default PersonalInfoForm;
