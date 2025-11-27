import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import Pagination from "./Pagination";

const PermissionsTab = ({ data }) => {
  const [permissions, setPermissions] = useState([]);
  const [filteredPermissions, setFilteredPermissions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ search: "", category: "" });
  const itemsPerPage = 10;

  useEffect(() => {
    setPermissions(data.permissions);
    setFilteredPermissions(data.permissions);
  }, [data]);

  useEffect(() => {
    applyFilters();
  }, [filters, permissions]);

  const applyFilters = () => {
    const filtered = permissions.filter((permission) => {
      const matchSearch =
        !filters.search ||
        permission.permission_code
          .toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        permission.permission_name
          .toLowerCase()
          .includes(filters.search.toLowerCase());

      const matchCategory =
        !filters.category || permission.category === filters.category;

      return matchSearch && matchCategory;
    });

    setFilteredPermissions(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: "", category: "" });
  };

  // Obtener categorías únicas
  const categories = [...new Set(permissions.map((p) => p.category))];

  // Paginación
  const totalPages = Math.ceil(filteredPermissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPermissions = filteredPermissions.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Permisos del Sistema
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Vista de solo lectura de todos los permisos disponibles
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="flex-1 min-w-[250px] relative">
          <Icon
            name="search"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Buscar por código o nombre..."
            className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>

        <div className="flex gap-3">
          <select
            value={filters.category}
            onChange={(e) =>
              setFilters({ ...filters, category: e.target.value })
            }
            className="px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-white cursor-pointer focus:outline-none focus:border-blue-600 transition-all"
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <button
            onClick={clearFilters}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-all hover:-translate-y-0.5 flex items-center gap-2"
          >
            <Icon name="close" className="text-sm" />
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      {paginatedPermissions.length === 0 ? (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 mb-6">
          <div className="text-center py-16 text-gray-400">
            <Icon name="inbox" className="text-5xl mb-4" />
            <p>No se encontraron permisos</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 mb-6">
          <table className="w-full">
            <thead className="bg-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedPermissions.map((permission) => (
                <tr
                  key={permission.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-150"
                >
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <strong>{permission.permission_code}</strong>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {permission.permission_name}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-3 py-1 text-xs font-bold">
                      {permission.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {permission.permission_description}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          permission.is_active ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                      <span className="text-sm text-gray-700">
                        {permission.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default PermissionsTab;