import React, { useState } from "react";
import { Icon } from "@components/ui/icon/iconManager";

const CustomerFiltersBar = ({
    filters,
    onFilterChange,
    onClearFilters,
    priceLists,
    users,
    statuses,
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const handleInputChange = (field, value) => {
        onFilterChange({ ...filters, [field]: value });
    };

    return (
        <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
            {/* Header de Filtros */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Icon name="filter" className="text-gray-600 text-xl" />
                    <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <Icon name={isExpanded ? "chevron-up" : "chevron-down"} />
                </button>
            </div>

            {isExpanded && (
                <>
                    {/* Fila 1: Búsqueda y Tipo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        {/* Búsqueda */}
                        <div className="lg:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Buscar
                            </label>
                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => handleInputChange("search", e.target.value)}
                                placeholder="Código, RUT, Razón Social..."
                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                            />
                        </div>

                        {/* Tipo de Cliente */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tipo de Cliente
                            </label>
                            <select
                                value={filters.customer_type}
                                onChange={(e) =>
                                    handleInputChange("customer_type", e.target.value)
                                }
                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                            >
                                <option value="">Todos</option>
                                <option value="COMPANY">Empresa</option>
                                <option value="INDIVIDUAL">Persona</option>
                            </select>
                        </div>

                        {/* Estado */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Estado
                            </label>
                            <select
                                value={filters.status}
                                onChange={(e) => handleInputChange("status", e.target.value)}
                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                            >
                                <option value="">Todos</option>
                                {statuses.map((status) => (
                                    <option key={status.id} value={status.id}>
                                        {status.status_display_es}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Región */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Región
                            </label>
                            <input
                                type="text"
                                value={filters.region}
                                onChange={(e) => handleInputChange("region", e.target.value)}
                                placeholder="Región"
                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                            />
                        </div>

                        {/* Ciudad */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Ciudad
                            </label>
                            <input
                                type="text"
                                value={filters.city}
                                onChange={(e) => handleInputChange("city", e.target.value)}
                                placeholder="Ciudad"
                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                            />
                        </div>

                        {/* Botón Limpiar Filtros */}
                        <div className="flex items-end">
                            <button
                                onClick={onClearFilters}
                                className="w-full px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all flex items-center justify-center gap-2"
                            >
                                <Icon name="refresh" className="text-lg" />
                                Limpiar Filtros
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default CustomerFiltersBar;