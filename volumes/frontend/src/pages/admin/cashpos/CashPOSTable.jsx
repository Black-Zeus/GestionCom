import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const CashPOSTable = ({
  cashRegisters,
  onEdit,
  onManageSessions,
  onToggleStatus,
  onDelete,
}) => {
  if (cashRegisters.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <Icon name="inbox" className="text-5xl text-gray-400 mb-3" />
        <p className="text-gray-500 text-lg">No se encontraron cajas POS</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full">
        <thead className="bg-gray-50 border-b-2 border-gray-200">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Código
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Nombre
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Bodega
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Terminal
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              IP
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Sesión
            </th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {cashRegisters.map((cashRegister) => {
            return (
              <tr
                key={cashRegister.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Icon
                        name="cash"
                        className="text-green-600 text-lg"
                      />
                    </div>
                    <span className="font-semibold text-gray-900">
                      {cashRegister.registerCode}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900">
                      {cashRegister.registerName}
                    </div>
                    {cashRegister.locationDescription && (
                      <div className="text-xs text-gray-500">
                        {cashRegister.locationDescription}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">
                    {cashRegister.warehouseName}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700 font-mono">
                    {cashRegister.terminalIdentifier || "-"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700 font-mono">
                    {cashRegister.ipAddress || "-"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        cashRegister.isActive ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <span className="text-sm text-gray-700">
                      {cashRegister.isActive ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        cashRegister.hasOpenSession
                          ? "bg-blue-500"
                          : "bg-gray-400"
                      }`}
                    />
                    <span className="text-sm text-gray-700">
                      {cashRegister.hasOpenSession ? "Abierta" : "Cerrada"}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEdit(cashRegister)}
                      title="Editar"
                      className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      <Icon name="edit" className="text-sm" />
                    </button>
                    <button
                      onClick={() => onManageSessions(cashRegister)}
                      title="Gestionar Sesiones"
                      className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
                    >
                      <Icon name="folder" className="text-sm" />
                    </button>
                    <button
                      onClick={() => onToggleStatus(cashRegister.id)}
                      title={cashRegister.isActive ? "Desactivar" : "Activar"}
                      className={`p-2 rounded-lg transition-all ${
                        cashRegister.isActive
                          ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                          : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                      }`}
                    >
                      <Icon
                        name={cashRegister.isActive ? "ban" : "checkCircle"}
                        className="text-sm"
                      />
                    </button>
                    <button
                      onClick={() => onDelete(cashRegister)}
                      title="Eliminar"
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                    >
                      <Icon name="delete" className="text-sm" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CashPOSTable;