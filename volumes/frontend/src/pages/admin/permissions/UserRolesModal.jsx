import React, { useState, useEffect } from "react";

const UserRolesModal = ({ user, roles, onSave, onClose }) => {
  const [selectedRoles, setSelectedRoles] = useState([]);

  useEffect(() => {
    // Cargar roles actuales del usuario
    if (user && user.assigned_roles) {
      setSelectedRoles(user.assigned_roles.map((r) => r.role_id));
    }
  }, [user]);

  const handleToggleRole = (roleId) => {
    setSelectedRoles((prev) => {
      if (prev.includes(roleId)) {
        return prev.filter((id) => id !== roleId);
      } else {
        return [...prev, roleId];
      }
    });
  };

  const handleSubmit = () => {
    onSave(selectedRoles);
  };

  return (
    <div className="space-y-6">
      {/* Info del Usuario */}
      <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Usuario</p>
            <p className="text-sm font-semibold text-gray-900">
              {user.first_name} {user.last_name}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">RUT</p>
            <p className="text-sm text-gray-700">{user.rut}</p>
          </div>
        </div>
      </div>

      {/* Selección de Roles */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Seleccionar Rol(es) *
        </label>
        <div className="max-h-[400px] overflow-y-auto border-2 border-gray-200 rounded-lg p-4 space-y-2">
          {roles.map((role) => (
            <label
              key={role.id}
              className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-all border-2 border-transparent hover:border-gray-200"
            >
              <input
                type="checkbox"
                checked={selectedRoles.includes(role.id)}
                onChange={() => handleToggleRole(role.id)}
                className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-4 focus:ring-blue-100 mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">
                    {role.role_name}
                  </p>
                  {role.is_system_role === 1 && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                      Sistema
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {role.role_description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Resumen */}
      {selectedRoles.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-blue-900">
              {selectedRoles.length}
            </span>{" "}
            {selectedRoles.length === 1 ? "rol seleccionado" : "roles seleccionados"}
          </p>
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={selectedRoles.length === 0}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          Guardar Cambios
        </button>
      </div>
    </div>
  );
};

export default UserRolesModal;