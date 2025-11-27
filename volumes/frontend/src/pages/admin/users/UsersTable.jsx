import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const UsersTable = ({
  users,
  onEdit,
  onChangePassword,
  onToggleStatus,
  onDelete,
}) => {
  // Estado de la cuenta (Activa / Inactiva) con dot + texto gris
  const getAccountStatus = (isActive) => {
    if (isActive) {
      return {
        label: "Activa",
        dotClass: "bg-green-500",
      };
    }

    return {
      label: "Inactiva",
      dotClass: "bg-red-500",
    };
  };

  // Estado de sesión (online / offline / sin sesión)
  const getPresenceStatus = (isActive, status) => {
    // Si la cuenta está inactiva, la sesión no aplica
    if (!isActive) {
      return {
        label: "Sin sesión",
        dotClass: "bg-gray-400",
      };
    }

    if (status === "online") {
      return {
        label: "Online",
        dotClass: "bg-green-500",
      };
    }

    // Todo lo que no sea "online" lo tratamos como offline
    return {
      label: "Offline",
      dotClass: "bg-gray-500",
    };
  };

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 mb-6">
        <div className="text-center py-16 text-gray-400">
          <Icon name="usersEmpty" className="text-5xl mb-4 block" />
          <p>No se encontraron usuarios</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 mb-6">
      <table className="w-full">
        <thead className="bg-gray-100 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Usuario
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Contacto
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Rol
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Bodegas
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Sesión
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Cuenta
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const account = getAccountStatus(user.isActive);
            const presence = getPresenceStatus(user.isActive, user.status);

            return (
              <tr
                key={user.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-150"
              >
                {/* Usuario */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                      {user.initials || user.fullName?.charAt(0) || "?"}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.fullName}
                      </div>
                      <div className="text-xs text-gray-500">
                        @{user.username}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Contacto */}
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900">{user.email}</div>
                  {user.phone && (
                    <div className="text-xs text-gray-500">{user.phone}</div>
                  )}
                </td>

                {/* Rol (sin colores por rol, todo gris) */}
                <td className="px-4 py-4">
                  {user.roles && user.roles.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {user.roles.slice(0, 2).map((role, index) => (
                        <span
                          key={index}
                          className="text-xs font-medium text-gray-700"
                        >
                          {role}
                        </span>
                      ))}
                      {user.roles.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{user.roles.length - 2} más
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Sin rol</span>
                  )}
                </td>

                {/* Bodegas */}
                <td className="px-4 py-4">
                  {user.warehouses && user.warehouses.length > 0 ? (
                    <div className="text-xs text-gray-600">
                      {user.warehouses.slice(0, 2).join(", ")}
                      {user.warehouses.length > 2 &&
                        ` +${user.warehouses.length - 2}`}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">Sin asignar</span>
                  )}
                </td>

                {/* Sesión (dot + texto gris) */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span
                      className={`w-2 h-2 rounded-full ${presence.dotClass}`}
                    />
                    <span>{presence.label}</span>
                  </div>
                </td>

                {/* Cuenta (dot + texto gris) */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${account.dotClass}`}
                    />
                    <span className="text-sm text-gray-700">
                      {account.label}
                    </span>
                  </div>
                </td>

                {/* Acciones */}
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEdit(user)}
                      title="Editar"
                      className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      <Icon name="edit" className="text-sm" />
                    </button>
                    <button
                      onClick={() => onChangePassword(user)}
                      title="Cambiar Contraseña"
                      className="p-2 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
                    >
                      <Icon name="password" className="text-sm" />
                    </button>
                    <button
                      onClick={() => onToggleStatus(user.id)}
                      title={user.isActive ? "Desactivar" : "Activar"}
                      className={`p-2 rounded-lg transition-all ${
                        user.isActive
                          ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                          : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                      }`}
                    >
                      <Icon
                        name={user.isActive ? "ban" : "checkCircle"}
                        className="text-sm"
                      />
                    </button>
                    <button
                      onClick={() => onDelete(user)}
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

export default UsersTable;
