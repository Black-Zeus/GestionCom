import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@/components/ui/modal/ModalManager";
import MovementsModal from "./MovementsModal";
import CloseSessionModal from "./CloseSessionModal";
import cashPOSData from "./data.json";

const SessionsModal = ({ cashRegister, onClose }) => {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    // Filtrar sesiones de la caja actual
    const cashRegisterSessions = cashPOSData.sessions.filter(
      (s) => s.cashRegisterId === cashRegister.id
    );
    setSessions(cashRegisterSessions);
  }, [cashRegister.id]);

  const handleViewMovements = (session) => {
    ModalManager.custom({
      title: `Movimientos de Sesión: ${session.sessionCode}`,
      size: "xlarge",
      content: (
        <MovementsModal
          session={session}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  const handleCloseSession = (session) => {
    ModalManager.custom({
      title: `Cerrar Sesión: ${session.sessionCode}`,
      size: "large",
      content: (
        <CloseSessionModal
          session={session}
          cashRegister={cashRegister}
          onSave={(closureData) => {
            console.infolog("Sesión cerrada:", closureData);
            // Actualizar la sesión
            setSessions(
              sessions.map((s) =>
                s.id === session.id
                  ? {
                      ...s,
                      status: "Cerrada",
                      closingDatetime: new Date().toISOString(),
                      physicalAmount: closureData.physicalAmount,
                      differenceAmount: closureData.differenceAmount,
                      closingNotes: closureData.closingNotes,
                    }
                  : s
              )
            );
            ModalManager.closeAll();
          }}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("es-CL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Sesiones de {cashRegister.registerName}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Código: {cashRegister.registerCode}
          </p>
        </div>
      </div>

      {/* Tabla de Sesiones */}
      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Icon name="inbox" className="text-5xl text-gray-400 mb-3" />
          <p className="text-gray-500 text-lg">No hay sesiones registradas</p>
          <p className="text-gray-400 text-sm mt-2">
            Crea una nueva sesión para comenzar a operar
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Cajero
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Apertura
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Cierre
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Monto Inicial
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Diferencia
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.map((session) => (
                <tr
                  key={session.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900 font-mono text-sm">
                      {session.sessionCode}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">
                      {session.cashierName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">
                      {formatDate(session.openingDatetime)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">
                      {formatDate(session.closingDatetime)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm text-gray-900 font-medium">
                      {formatCurrency(session.openingAmount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {session.differenceAmount !== null ? (
                      <span
                        className={`text-sm font-semibold ${
                          session.differenceAmount === 0
                            ? "text-green-600"
                            : session.differenceAmount > 0
                            ? "text-blue-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(session.differenceAmount)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          session.status === "Abierta"
                            ? "bg-green-500"
                            : session.status === "Cerrada"
                            ? "bg-gray-400"
                            : "bg-yellow-500"
                        }`}
                      />
                      <span className="text-sm text-gray-700">
                        {session.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleViewMovements(session)}
                        title="Ver Movimientos"
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      >
                        <Icon name="list" className="text-sm" />
                      </button>
                      {session.status === "Abierta" && (
                        <button
                          onClick={() => handleCloseSession(session)}
                          title="Cerrar Sesión"
                          className="p-2 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
                        >
                          <Icon name="lock" className="text-sm" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Botón Cerrar */}
      <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={onClose}
          className="px-6 py-2.5 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-all"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default SessionsModal;