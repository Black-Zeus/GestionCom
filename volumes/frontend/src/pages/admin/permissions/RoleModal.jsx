import React, { useState, useEffect } from "react";

const RoleModal = ({ role, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    role_code: "",
    role_name: "",
    role_description: "",
    is_system_role: 0,
    is_active: 1,
  });

  useEffect(() => {
    if (role) {
      setFormData({
        role_code: role.role_code,
        role_name: role.role_name,
        role_description: role.role_description || "",
        is_system_role: role.is_system_role,
        is_active: role.is_active,
      });
    }
  }, [role]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Código del Rol */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Código del Rol *
        </label>
        <input
          type="text"
          value={formData.role_code}
          onChange={(e) =>
            setFormData({ ...formData, role_code: e.target.value.toUpperCase() })
          }
          required
          disabled={role && role.is_system_role}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Ej: GERENTE"
        />
      </div>

      {/* Nombre del Rol */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nombre del Rol *
        </label>
        <input
          type="text"
          value={formData.role_name}
          onChange={(e) =>
            setFormData({ ...formData, role_name: e.target.value })
          }
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
          placeholder="Ej: Gerente de Sucursal"
        />
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Descripción
        </label>
        <textarea
          value={formData.role_description}
          onChange={(e) =>
            setFormData({ ...formData, role_description: e.target.value })
          }
          rows={3}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
          placeholder="Descripción del rol..."
        />
      </div>

      {/* Checkboxes */}
      <div className="space-y-3">
        {/* Rol del Sistema */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_system_role === 1}
            onChange={(e) =>
              setFormData({
                ...formData,
                is_system_role: e.target.checked ? 1 : 0,
              })
            }
            disabled={role && role.is_system_role}
            className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed"
          />
          <span className="text-sm text-gray-700">
            Rol del Sistema (no editable)
          </span>
        </label>

        {/* Activo */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_active === 1}
            onChange={(e) =>
              setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })
            }
            className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-4 focus:ring-blue-100"
          />
          <span className="text-sm text-gray-700">Activo</span>
        </label>
      </div>

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
          type="submit"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          Guardar
        </button>
      </div>
    </form>
  );
};

export default RoleModal;