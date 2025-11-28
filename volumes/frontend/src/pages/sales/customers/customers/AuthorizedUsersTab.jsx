import React, { useState } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@/components/ui/modal/ModalManager";
import AuthorizedUserModal from "./AuthorizedUserModal";

const AuthorizedUsersTab = ({ customerId, authorizedUsers }) => {
  const [users, setUsers] = useState(authorizedUsers || []);

  const handleAddUser = () => {
    ModalManager.custom({
      title: "Agregar Contacto Autorizado",
      content: (
        <AuthorizedUserModal
          user={null}
          onSave={(userData) => {
            const newUser = {
              id: Math.max(0, ...users.map((u) => u.id)) + 1,
              customer_id: customerId,
              ...userData,
            };
            setUsers([...users, newUser]);
            ModalManager.closeAll();
          }}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  const handleEditUser = (user) => {
    ModalManager.custom({
      title: "Editar Contacto Autorizado",
      content: (
        <AuthorizedUserModal
          user={user}
          onSave={(userData) => {
            setUsers(users.map((u) => (u.id === user.id ? { ...u, ...userData } : u)));
            ModalManager.closeAll();
          }}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  const handleToggleActive = (userId) => {
    setUsers(
      users.map((u) =>
        u.id === userId ? { ...u, is_active: !u.is_active } : u
      )
    );
  };

  const handleSetPrimary = (userId) => {
    setUsers(
      users.map((u) => ({
        ...u,
        is_primary_contact: u.id === userId,
      }))
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);
  };

  const getAuthLevelLabel = (level) => {
    const labels = {
      BASIC: "Básico",
      ADVANCED: "Avanzado",
      FULL: "Completo",
    };
    return labels[level] || level;
  };

  if (!customerId) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Icon name="info" className="text-5xl mb-4 block" />
        <p>Debe guardar el cliente primero antes de agregar contactos.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Contactos Autorizados
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona las personas autorizadas para realizar compras
          </p>
        </div>
        <button
          onClick={handleAddUser}
          className="bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-all flex items-center gap-2"
        >
          <Icon name="plus" />
          Agregar Contacto
        </button>
      </div>

      {users.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center text-gray-400">
          <Icon name="users" className="text-5xl mb-4 block" />
          <p>No hay contactos autorizados registrados</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  RUT
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Cargo
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Nivel
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Monto Máx
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Principal
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Activo
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-150"
                >
                  <td className="px-4 py-4">
                    <span className="text-sm font-medium text-gray-900">
                      {user.authorized_name}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-700">
                      {user.authorized_tax_id}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-700">
                      {user.position || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-xs text-gray-600">
                      <div>{user.email}</div>
                      <div>{user.phone}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs font-medium text-gray-700">
                      {getAuthLevelLabel(user.authorization_level)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-700">
                      {formatCurrency(user.max_purchase_amount)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {user.is_primary_contact ? (
                      <Icon name="star" className="text-yellow-500" />
                    ) : (
                      <button
                        onClick={() => handleSetPrimary(user.id)}
                        className="text-gray-300 hover:text-yellow-500 transition-colors"
                        title="Marcar como principal"
                      >
                        <Icon name="star" />
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          user.is_active ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleEditUser(user)}
                        title="Editar"
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      >
                        <Icon name="edit" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(user.id)}
                        title={user.is_active ? "Desactivar" : "Activar"}
                        className={`p-2 rounded-lg transition-all ${
                          user.is_active
                            ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                            : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                        }`}
                      >
                        <Icon name={user.is_active ? "cancel" : "check"} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuthorizedUsersTab;