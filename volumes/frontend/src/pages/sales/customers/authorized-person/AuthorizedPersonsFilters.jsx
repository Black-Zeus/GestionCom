import React from "react";

const AuthorizedPersonsFilters = ({
  filters,
  onFilterChange,
  onClearFilters,
  regions,
  cities,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Filtros</h2>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Fila 1 */}
        {/* Búsqueda */}
        <div className="col-span-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Buscar
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            placeholder="Código, RUT, Razón Social, Contacto..."
            className="w-full px-3 py-2 rounded-full border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Estado */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Estado
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange("status", e.target.value)}
            className="w-full px-3 py-2 rounded-full border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
          </select>
        </div>

        {/* Tipo de Cliente */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Tipo de Cliente
          </label>
          <select
            value={filters.type}
            onChange={(e) => onFilterChange("type", e.target.value)}
            className="w-full px-3 py-2 rounded-full border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            <option value="COMPANY">Empresa</option>
            <option value="INDIVIDUAL">Persona</option>
          </select>
        </div>

        {/* Fila 2 */}
        {/* Región */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Región
          </label>
          <select
            value={filters.region}
            onChange={(e) => onFilterChange("region", e.target.value)}
            className="w-full px-3 py-2 rounded-full border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">Todas</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        {/* Ciudad */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Ciudad
          </label>
          <select
            value={filters.city}
            onChange={(e) => onFilterChange("city", e.target.value)}
            className="w-full px-3 py-2 rounded-full border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">Todas</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Botón limpiar filtros */}
        <div className="flex items-end">
          <button
            onClick={onClearFilters}
            className="w-full px-4 py-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium transition-colors"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthorizedPersonsFilters;
