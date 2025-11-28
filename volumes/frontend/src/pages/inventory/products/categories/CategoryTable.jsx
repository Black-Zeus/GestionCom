import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const CategoryTable = ({
  categories,
  allCategories,
  onEdit,
  onCreateSubcategory,
  onToggleStatus,
  onDelete,
}) => {
  const getParentName = (parentId) => {
    if (!parentId) return "Raíz";
    const parent = allCategories.find((c) => c.id === parentId);
    return parent ? parent.category_name : "—";
  };

  const getLevelBadge = (level) => {
    const colors = {
      0: "bg-purple-100 text-purple-700",
      1: "bg-blue-100 text-blue-700",
      2: "bg-green-100 text-green-700",
      3: "bg-orange-100 text-orange-700",
    };
    return colors[level] || "bg-gray-100 text-gray-700";
  };

  if (categories.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <Icon name="inbox" className="text-6xl text-gray-300 mb-4 block" />
        <p className="text-gray-500 text-lg mb-2">
          No se encontraron categorías
        </p>
        <p className="text-gray-400 text-sm">
          Ajusta los filtros o crea una nueva categoría
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border-2 border-gray-200 mb-6">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Código
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Nombre
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Categoría Padre
            </th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Nivel
            </th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Orden
            </th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Estado
            </th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {categories.map((category) => (
            <tr
              key={category.id}
              className="hover:bg-gray-50 transition-colors duration-150"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-mono font-medium text-gray-900">
                  {category.category_code}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900">
                  {category.category_name}
                </div>
                {category.category_description && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                    {category.category_description}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-900">
                  {getParentName(category.parent_id)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getLevelBadge(
                    category.category_level
                  )}`}
                >
                  Nivel {category.category_level}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className="text-sm text-gray-900">
                  {category.sort_order}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <div className="flex items-center justify-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      category.is_active ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className="text-sm text-gray-900 font-medium">
                    {category.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <div className="flex items-center justify-center gap-2">
                  {/* Botón Crear Subcategoría */}
                  <button
                    onClick={() => onCreateSubcategory(category)}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors duration-150"
                    title="Crear Subcategoría"
                  >
                    <Icon name="plus" className="text-lg" />
                  </button>

                  {/* Botón Editar */}
                  <button
                    onClick={() => onEdit(category)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150"
                    title="Editar"
                  >
                    <Icon name="edit" className="text-lg" />
                  </button>

                  {/* Botón Cambiar Estado */}
                  <button
                    onClick={() => onToggleStatus(category)}
                    className={`p-2 rounded-lg transition-colors duration-150 ${
                      category.is_active
                        ? "text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                        : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                    }`}
                    title={category.is_active ? "Desactivar" : "Activar"}
                  >
                    <Icon
                      name={category.is_active ? "ban" : "checkCircle"}
                      className="text-lg"
                    />
                  </button>

                  {/* Botón Eliminar */}
                  <button
                    onClick={() => onDelete(category)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
                    title="Eliminar"
                  >
                    <Icon name="delete" className="text-lg" />
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

export default CategoryTable;