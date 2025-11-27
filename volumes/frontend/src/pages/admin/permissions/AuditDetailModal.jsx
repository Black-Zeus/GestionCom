import React from "react";

const AuditDetailModal = ({ log, onClose }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getActionBadge = (actionType) => {
    const badges = {
      ASSIGN_ROLE: { bg: "bg-green-100", text: "text-green-800" },
      REVOKE_ROLE: { bg: "bg-red-100", text: "text-red-800" },
      GRANT_PERMISSION: { bg: "bg-blue-100", text: "text-blue-800" },
      REVOKE_PERMISSION: { bg: "bg-orange-100", text: "text-orange-800" },
    };

    const badge = badges[actionType] || { bg: "bg-gray-100", text: "text-gray-800" };

    return (
      <span className={`px-3 py-1 ${badge.bg} ${badge.text} rounded text-xs font-medium uppercase`}>
        {actionType}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Grid simple de 2 columnas */}
      <div className="space-y-4">
        {/* Fecha y Hora */}
        <div className="grid grid-cols-[160px_1fr] gap-4 items-start">
          <span className="text-sm font-semibold text-gray-700">Fecha y Hora:</span>
          <span className="text-sm text-gray-900">{formatDate(log.created_at)}</span>
        </div>

        {/* Tipo de Acción */}
        <div className="grid grid-cols-[160px_1fr] gap-4 items-start">
          <span className="text-sm font-semibold text-gray-700">Tipo de Acción:</span>
          <div>{getActionBadge(log.action_type)}</div>
        </div>

        {/* Realizado Por */}
        <div className="grid grid-cols-[160px_1fr] gap-4 items-start">
          <span className="text-sm font-semibold text-gray-700">Realizado Por:</span>
          <div>
            <p className="text-sm text-gray-900">{log.actor_name}</p>
            {log.actor_email && (
              <p className="text-xs text-gray-500 mt-0.5">({log.actor_email})</p>
            )}
          </div>
        </div>

        {/* Usuario Afectado */}
        {log.target_user_name && (
          <div className="grid grid-cols-[160px_1fr] gap-4 items-start">
            <span className="text-sm font-semibold text-gray-700">Usuario Afectado:</span>
            <div>
              <p className="text-sm text-gray-900">{log.target_user_name}</p>
              {log.target_user_email && (
                <p className="text-xs text-gray-500 mt-0.5">({log.target_user_email})</p>
              )}
            </div>
          </div>
        )}

        {/* Rol Afectado */}
        {log.role_name && (
          <div className="grid grid-cols-[160px_1fr] gap-4 items-start">
            <span className="text-sm font-semibold text-gray-700">Rol Afectado:</span>
            <span className="text-sm text-gray-900">{log.role_name}</span>
          </div>
        )}

        {/* Permiso Afectado */}
        {log.permission_name && (
          <div className="grid grid-cols-[160px_1fr] gap-4 items-start">
            <span className="text-sm font-semibold text-gray-700">Permiso Afectado:</span>
            <span className="text-sm text-gray-900">{log.permission_name}</span>
          </div>
        )}

        {/* Descripción */}
        <div className="grid grid-cols-[160px_1fr] gap-4 items-start">
          <span className="text-sm font-semibold text-gray-700">Descripción:</span>
          <span className="text-sm text-gray-900 leading-relaxed">{log.description}</span>
        </div>

        {/* Metadata (si existe) */}
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <div className="grid grid-cols-[160px_1fr] gap-4 items-start">
            <span className="text-sm font-semibold text-gray-700">Metadata:</span>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Botón Cerrar */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default AuditDetailModal;