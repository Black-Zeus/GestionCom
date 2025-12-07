import React, { useEffect, useState } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import { formatCurrency, formatDateTime } from "@/utils/formats";

/**
 * CurrentRegisterStatus
 * Componente para mostrar el estado actual de la caja seleccionada
 */
const CurrentRegisterStatus = ({
  currentBranch,
  currentUser,
  registers,
  sessions,
  selectedRegister,
  onRegisterChange,
  onOpenModal,
  onCloseModal,
}) => {
  const [currentSession, setCurrentSession] = useState(null);
  const [registerInfo, setRegisterInfo] = useState("");
  const [canOpenRegister, setCanOpenRegister] = useState(false);

  useEffect(() => {
    if (selectedRegister) {
      // Buscar sesión actual para este registro y usuario
      const session = sessions.find(
        (s) =>
          s.cash_register_id === selectedRegister.id &&
          s.cashier_user_id === currentUser.id &&
          s.status_code === "OPEN"
      );

      setCurrentSession(session);

      // Determinar si se puede aperturar
      setCanOpenRegister(!session && selectedRegister.authorized_for_current_user);

      // Info del registro
      const info = `${selectedRegister.terminal_identifier} · IP: ${selectedRegister.ip_address} · ${selectedRegister.location_description}`;
      setRegisterInfo(info);
    } else {
      setCurrentSession(null);
      setCanOpenRegister(false);
      setRegisterInfo("");
    }
  }, [selectedRegister, sessions, currentUser]);

  // Obtener registros autorizados para el usuario actual
  const authorizedRegisters = registers.filter(
    (r) => r.authorized_for_current_user && r.branch_id === currentBranch.id
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 mb-6">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">
          Estado actual de la caja seleccionada
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Seleccione la caja y visualice su estado. Desde aquí se realiza la
          apertura de caja.
        </p>
      </div>

      {/* Body */}
      <div className="px-6 py-4">
        {/* Contexto: Sucursal y Usuario */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <span className="text-gray-600">Sucursal actual</span>
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

        {/* Selector de caja */}
        <div className="mb-4">
          <label
            htmlFor="statusRegisterSelect"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Caja
          </label>
          <select
            id="statusRegisterSelect"
            value={selectedRegister?.id || ""}
            onChange={(e) => onRegisterChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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
        </div>

        {/* Resumen de estado */}
        {selectedRegister && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            {currentSession ? (
              // Hay sesión abierta
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">
                    Sesión activa
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                      <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                      Abierta
                    </span>
                    <button
                      onClick={() => onCloseModal(currentSession, selectedRegister)}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-xs font-medium"
                    >
                      <Icon name="FaLock" />
                      Cerrar caja
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Sesión</span>
                    <div className="font-medium text-gray-900">
                      {currentSession.session_code}
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

                {currentSession.opening_notes && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-sm">
                    <span className="text-gray-600">Notas: </span>
                    <span className="text-gray-900">
                      {currentSession.opening_notes}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              // No hay sesión abierta
              <div className="text-center py-4">
                <p className="text-sm text-gray-600 mb-4">
                  {selectedRegister.authorized_for_current_user
                    ? "No hay sesión abierta para esta caja. Presione 'Aperturar caja' para iniciar una nueva sesión."
                    : "No tiene autorización para abrir esta caja."}
                </p>
                {selectedRegister.authorized_for_current_user && (
                  <button
                    onClick={() => onOpenModal(selectedRegister)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Icon name="FaPlus" />
                    Aperturar caja
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrentRegisterStatus;