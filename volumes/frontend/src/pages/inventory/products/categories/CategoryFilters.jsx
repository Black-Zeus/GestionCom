import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const CategoryFilters = ({
  filters,
  onFilterChange,
  onClearFilters,
  parentCategories,
}) => {
  const hasActiveFilters =
    filters.search ||
    filters.parentCategory ||
    filters.status !== "" ||
    filters.level !== "";

  return (
    <div className="bg-gray-50 rounded-lg p-6 mb-6 border-2 border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Filtros de Búsqueda
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Primera fila - 4 columnas */}

        {/* Búsqueda por texto */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar
          </label>
          <div className="relative">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
            />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange("search", e.target.value)}
              placeholder="Código o nombre..."
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
            />
          </div>
        </div>

        {/* Filtro por categoría padre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoría Padre
          </label>
          <select
            value={filters.parentCategory}
            onChange={(e) => onFilterChange("parentCategory", e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
          >
            <option value="">Todas las categorías</option>
            <option value="root">Solo categorías raíz</option>
            {parentCategories
              .filter((cat) => !cat.parent_id) // Solo categorías raíz
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.category_name}
                </option>
              ))}
          </select>
        </div>

        {/* Filtro por nivel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nivel
          </label>
          <select
            value={filters.level}
            onChange={(e) => onFilterChange("level", e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
          >
            <option value="">Todos los niveles</option>
            <option value="0">Nivel 0 (Raíz)</option>
            <option value="1">Nivel 1</option>
            <option value="2">Nivel 2</option>
            <option value="3">Nivel 3</option>
          </select>
        </div>

        {/* Filtro por estado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange("status", e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
          >
            <option value="">Todos</option>
            <option value="1">Activos</option>
            <option value="0">Inactivos</option>
          </select>
        </div>       

        {/* Botón Limpiar Filtros */}
        <div className="flex items-end">
          <button
            onClick={onClearFilters}
            disabled={!hasActiveFilters}
            className={`w-full px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              hasActiveFilters
                ? "bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-lg"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Icon name="close" className="text-lg" />
            Limpiar Filtros
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryFilters;