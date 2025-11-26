import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";

const UsersModal = ({ warehouse, availableUsers, onSave, onClose }) => {
  const [assignedUserIds, setAssignedUserIds] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    if (warehouse && warehouse.assigned_users) {
      setAssignedUserIds(warehouse.assigned_users);
    }
  }, [warehouse]);

  const handleAddUser = () => {
    const userId = parseInt(selectedUserId, 10);

    if (!userId) {
      alert("Por favor seleccione un usuario");
      return;
    }

    if (assignedUserIds.includes(userId)) {
      alert("El usuario ya está asignado a esta bodega");
      return;
    }

    setAssignedUserIds([...assignedUserIds, userId]);
    setSelectedUserId("");
  };

  const handleRemoveUser = (userId) => {
    if (confirm("¿Está seguro de quitar este usuario?")) {
      setAssignedUserIds(assignedUserIds.filter((id) => id !== userId));
    }
  };

  const handleSave = () => {
    onSave(assignedUserIds);
  };

  const assignedUsers = availableUsers.filter((u) =>
    assignedUserIds.includes(u.id)
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg text-gray-900 font-semibold mb-4">
          Bodega: {warehouse?.warehouse_name}
        </h3>

        <div className="flex flex-col mb-4">
          <label className="mb-2 text-gray-900 font-medium text-sm">
            Seleccionar Usuario
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 transition-all"
          >
            <option value="">Buscar usuario...</option>
            {availableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleAddUser}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
        >
          <Icon name="addUser" className="text-sm" />
          Agregar Usuario
        </button>
      </div>

      {assignedUsers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Icon name="users" className="text-4xl mb-4 block" />
          <p>No hay usuarios asignados</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-h-80 overflow-y-auto mb-6">
          {assignedUsers.map((user) => (
            <div
              key={user.id}
              className="bg-gray-50 p-3 rounded-lg border-2 border-gray-200 flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-gray-900 font-medium text-sm">
                    {user.name}
                  </h4>
                  <p className="text-gray-500 text-xs">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => handleRemoveUser(user.id)}
                title="Quitar"
                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
              >
                <Icon name="close" className="text-sm" />
              </button>
            </div>
          ))}
        </div>
      )}

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
          type="button"
          onClick={handleSave}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
        >
          Guardar Cambios
        </button>
      </div>
    </div>
  );
};

export default UsersModal;
