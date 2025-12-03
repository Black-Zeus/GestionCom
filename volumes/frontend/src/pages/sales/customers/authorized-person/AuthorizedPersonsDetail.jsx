import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const AuthorizedPersonsDetail = ({
  customer,
  authorizedUsers,
  onBack,
  onAddUser,
  onEditUser,
  onDeleteUser,
}) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);
  };

  const getLevelBadge = (level) => {
    const badges = {
      FULL: { label: "Completo", color: "bg-blue-100 text-blue-700" },
      ADVANCED: { label: "Avanzado", color: "bg-yellow-100 text-yellow-700" },
      BASIC: { label: "Básico", color: "bg-gray-100 text-gray-700" },
    };
    return badges[level] || badges.BASIC;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Personas Autorizadas
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Seleccione un cliente para ver y administrar sus personas
              autorizadas.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium transition-colors"
            >
              ← Volver a clientes
            </button>
            {customer && (
              <div className="flex gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    customer.status_id === 1
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {customer.status_id === 1 ? "Activo" : "Inactivo"}
                </span>
                {customer.is_credit_customer && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    Con Crédito
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Resumen del cliente */}
        {customer && (
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Cliente
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {customer.legal_name}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                RUT
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {customer.tax_id}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Contacto
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {customer.contact_person}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Correo
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {customer.email}
              </div>
            </div>
            {customer.internal_notes && (
              <div className="col-span-4">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Notas internas
                </div>
                <div className="text-sm text-gray-700 italic">
                  {customer.internal_notes}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contenido */}
      {!customer ? (
        <div className="p-16 text-center">
          <Icon name="inbox" className="text-5xl text-gray-300 mb-4" />
          <p className="text-gray-400">
            No hay cliente seleccionado. Seleccione un cliente de la tabla de
            clientes.
          </p>
        </div>
      ) : (
        <div className="p-6">
          {/* Subsección header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Personas Autorizadas
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Defina quién puede comprar o autorizar operaciones en
                representación de este cliente.
              </p>
            </div>
            <button
              onClick={onAddUser}
              className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-500/30"
            >
              Agregar Persona
            </button>
          </div>

          {/* Tabla de personas autorizadas */}
          {authorizedUsers.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
              <Icon name="users" className="text-4xl text-gray-300 mb-3" />
              <p className="text-gray-400 mb-4">
                No hay personas autorizadas registradas
              </p>
              <button
                onClick={onAddUser}
                className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                Agregar primera persona
              </button>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
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
                  {authorizedUsers.map((user) => {
                    // const levelBadge = getLevelBadge(user.authorization_level);
                    const levelBadge = user.authorization_level;
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-150"
                      >
                        {/* Nombre */}
                        <td className="px-4 py-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {user.authorized_name}
                          </div>
                        </td>

                        {/* RUT */}
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-600">
                            {user.authorized_tax_id}
                          </span>
                        </td>

                        {/* Cargo */}
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-600">
                            {user.position || "—"}
                          </span>
                        </td>

                        {/* Contacto */}
                        <td className="px-4 py-4">
                          <div>
                            <div className="text-sm text-gray-900">
                              {user.email}
                            </div>
                            <div className="text-xs text-gray-500">
                              {user.phone}
                            </div>
                          </div>
                        </td>

                        {/* Nivel */}
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${levelBadge.color}`}
                          >
                            {levelBadge.label}
                          </span>
                        </td>

                        {/* Monto Máx */}
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-900">
                            {formatCurrency(user.max_purchase_amount)}
                          </span>
                        </td>

                        {/* Principal */}
                        <td className="px-4 py-4 text-center">
                          {user.is_primary_contact ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-green-500"></span>
                              <span className="text-sm text-gray-900">Sí</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>

                        {/* Activo */}
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                user.is_active ? "bg-green-500" : "bg-red-500"
                              }`}
                            ></span>
                            <span className="text-sm text-gray-900">
                              {user.is_active ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => onEditUser(user)}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Editar"
                            >
                              <Icon name="edit" className="text-lg" />
                            </button>
                            <button
                              onClick={() => onDeleteUser(user.id)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                              title="Eliminar"
                            >
                              <Icon name="delete" className="text-lg" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuthorizedPersonsDetail;
