import React, { useState, useEffect } from "react";

const RolePermissionsModal = ({
  role,
  permissions,
  rolePermissions,
  onSave,
  onClose,
}) => {
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  useEffect(() => {
    // Cargar permisos actuales del rol
    const rolePerms = rolePermissions.find((rp) => rp.role_id === role.id);
    if (rolePerms) {
      setSelectedPermissions(rolePerms.permission_ids);
    }
  }, [role, rolePermissions]);

  const handleTogglePermission = (permissionId) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(permissionId)) {
        return prev.filter((id) => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const handleSelectAll = (category) => {
    const categoryPermissions = permissions
      .filter((p) => p.category === category)
      .map((p) => p.id);

    const allSelected = categoryPermissions.every((id) =>
      selectedPermissions.includes(id)
    );

    if (allSelected) {
      setSelectedPermissions((prev) =>
        prev.filter((id) => !categoryPermissions.includes(id))
      );
    } else {
      setSelectedPermissions((prev) => [
        ...new Set([...prev, ...categoryPermissions]),
      ]);
    }
  };

  const handleSubmit = () => {
    onSave(selectedPermissions);
  };

  // Agrupar permisos por categoría
  const categories = [...new Set(permissions.map((p) => p.category))];

  return (
    <div className="space-y-6">
      {/* Info del Rol */}
      <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Rol</p>
            <p className="text-sm font-semibold text-gray-900">
              {role.role_name}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Descripción</p>
            <p className="text-sm text-gray-700">{role.role_description}</p>
          </div>
        </div>
      </div>

      {/* Permisos por Categoría */}
      <div className="max-h-[500px] overflow-y-auto space-y-4">
        {categories.map((category) => {
          const categoryPerms = permissions.filter(
            (p) => p.category === category
          );
          const allSelected = categoryPerms.every((p) =>
            selectedPermissions.includes(p.id)
          );

          return (
            <div
              key={category}
              className="border-2 border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Header de Categoría */}
              <div className="bg-gray-100 px-4 py-3 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 text-sm">
                  {category}
                </h3>
                <button
                  type="button"
                  onClick={() => handleSelectAll(category)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  {allSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
              </div>

              {/* Lista de Permisos */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryPerms.map((permission) => (
                  <label
                    key={permission.id}
                    className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-gray-50 transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(permission.id)}
                      onChange={() => handleTogglePermission(permission.id)}
                      className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-4 focus:ring-blue-100 mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {permission.permission_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {permission.permission_description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumen */}
      <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
        <p className="text-sm text-gray-700">
          <span className="font-semibold text-blue-900">
            {selectedPermissions.length}
          </span>{" "}
          permisos seleccionados de {permissions.length} disponibles
        </p>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all"
        >
          Cerrar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          Guardar Cambios
        </button>
      </div>
    </div>
  );
};

export default RolePermissionsModal;