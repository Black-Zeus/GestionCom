import React, { useState } from "react";

const ToggleStatusContent = ({
  user,
  isDeactivating,
  action,
  onClose,
  onConfirm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");

  const currentStatus = user?.isActive ? "active" : "inactive";

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError("Por favor indique el motivo del cambio");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onConfirm(user.id, currentStatus, reason);
      // No cerramos aquí porque onConfirm ya maneja el cierre del modal
    } catch (err) {
      // Mostrar error en el modal si falla
      setError(err?.message || `Error al ${action} usuario`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusInfo = () => {
    if (isDeactivating) {
      return {
        icon: "🔴",
        color: "red",
        message: `¿Está seguro que desea desactivar al usuario "${
          user?.fullName || user?.username
        }"?`,
        warning:
          "El usuario no podrá acceder al sistema hasta que sea reactivado.",
        buttonText: "Desactivar",
        buttonClass: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
        reasonPlaceholder: "Indique el motivo de la desactivación...",
      };
    } else {
      return {
        icon: "🟢",
        color: "green",
        message: `¿Está seguro que desea activar al usuario "${
          user?.fullName || user?.username
        }"?`,
        warning: "El usuario podrá acceder nuevamente al sistema.",
        buttonText: "Activar",
        buttonClass: "bg-green-600 hover:bg-green-700 focus:ring-green-500",
        reasonPlaceholder: "Indique el motivo de la activación...",
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="space-y-4">
      {/* Icono y mensaje principal */}
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
          <span className="text-2xl">{statusInfo.icon}</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {statusInfo.message}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {statusInfo.warning}
        </p>
      </div>

      {/* Info del usuario */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {user?.avatar ? (
              <img
                className="h-10 w-10 rounded-full object-cover"
                src={user.avatar}
                alt={user.fullName}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.initials || user?.fullName?.charAt(0) || "?"}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.fullName || user?.username}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {user?.email}
            </p>
            <div className="flex items-center mt-1">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user?.isActive
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                }`}
              >
                {user?.isActive ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Motivo del cambio - NUEVO */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Motivo del cambio <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className={`block w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
            error && !reason.trim()
              ? "border-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
          placeholder={statusInfo.reasonPlaceholder}
        />
        {error && !reason.trim() && (
          <p className="mt-1 text-sm text-red-600">El motivo es requerido</p>
        )}
      </div>

      {/* Error si existe */}
      {error && reason.trim() && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg p-3">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting || !reason.trim()}
          className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg transition-colors disabled:opacity-50 ${statusInfo.buttonClass}`}
        >
          {isSubmitting ? "Procesando..." : statusInfo.buttonText}
        </button>
      </div>
    </div>
  );
};

export default ToggleStatusContent;
