import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const WarehouseTable = ({
  warehouses,
  onEdit,
  onManageZones,
  onManageUsers,
  onDelete,
}) => {
  const getWarehouseTypeLabel = (type) => {
    const labels = {
      WAREHOUSE: "Bodega",
      STORE: "Tienda",
      OUTLET: "Outlet",
    };
    return labels[type] || type;
  };

  if (warehouses.length === 0) {
    return (
      <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 mb-6">
        <div className="text-center py-16 text-gray-400">
          <Icon name="inbox" className="text-5xl mb-4 block" />
          <p>No se encontraron bodegas</p>
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
              Código
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Nombre
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Tipo
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Responsable
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Ciudad
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Usuarios
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Zonas
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {warehouses.map((warehouse) => (
            <tr
              key={warehouse.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-150"
            >
              <td className="px-4 py-4 text-sm text-gray-900">
                <strong>{warehouse.warehouse_code}</strong>
              </td>
              <td className="px-4 py-4 text-sm text-gray-900">
                {warehouse.warehouse_name}
              </td>
              <td className="px-4 py-4 text-sm">
                <span className="font-medium text-gray-900">
                  {getWarehouseTypeLabel(warehouse.warehouse_type)}
                </span>
              </td>
              <td className="px-4 py-4 text-sm text-gray-900">
                {warehouse.responsible_name}
              </td>
              <td className="px-4 py-4 text-sm text-gray-900">
                {warehouse.city}
              </td>
              <td className="px-4 py-4 text-sm">
                <span className="font-medium text-gray-600">
                  {warehouse.users_count}
                </span>
              </td>
              <td className="px-4 py-4 text-sm">
                <span className="font-medium text-gray-600">
                  {warehouse.zones_count}
                </span>
              </td>
              <td className="px-4 py-4 text-sm">
                <span
                  className={`font-medium ${
                    warehouse.is_active ? "text-gray-900" : "text-red-600"
                  }`}
                >
                  {warehouse.is_active ? "Activo" : "Inactivo"}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(warehouse)}
                    title="Editar"
                    className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                  >
                    <Icon name="edit" />
                  </button>
                  <button
                    onClick={() => onManageZones(warehouse)}
                    title="Gestionar Zonas"
                    className="p-2 rounded-lg text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 transition-all"
                  >
                    <Icon name="zones" />
                  </button>
                  <button
                    onClick={() => onManageUsers(warehouse)}
                    title="Asignar Usuarios"
                    className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all"
                  >
                    <Icon name="users" />
                  </button>
                  <button
                    onClick={() => onDelete(warehouse)}
                    title="Eliminar"
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                  >
                    <Icon name="delete" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WarehouseTable;
