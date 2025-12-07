import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@/components/ui/modal/ModalManager";

const CustomerSearchModal = ({ customers, onSelectCustomer, onClose }) => {
  const [searchFilters, setSearchFilters] = useState({
    search: "",
    type: "ALL",
    segment: "ALL",
  });

  const [filteredCustomers, setFilteredCustomers] = useState(customers);

  // Aplicar filtros
  useEffect(() => {
    applyFilters();
  }, [searchFilters, customers]);

  const applyFilters = () => {
    let filtered = [...customers];

    // Filtro de búsqueda
    if (searchFilters.search) {
      const searchLower = searchFilters.search.toLowerCase();
      filtered = filtered.filter(
        (customer) =>
          customer.legal_name?.toLowerCase().includes(searchLower) ||
          customer.commercial_name?.toLowerCase().includes(searchLower) ||
          customer.tax_id?.toLowerCase().includes(searchLower) ||
          customer.customer_code?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por tipo
    if (searchFilters.type !== "ALL") {
      filtered = filtered.filter(
        (customer) => customer.customer_type === searchFilters.type
      );
    }

    // Filtro por segmento
    if (searchFilters.segment !== "ALL") {
      filtered = filtered.filter(
        (customer) => customer.segment === searchFilters.segment
      );
    }

    setFilteredCustomers(filtered);
  };

  const handleFilterChange = (field, value) => {
    setSearchFilters({ ...searchFilters, [field]: value });
  };

  const handleSelect = (customer) => {
    onSelectCustomer(customer);
    onClose();
  };

  return (
    <div className="flex flex-col" style={{ minHeight: "500px" }}>
      {/* Filtros */}
      <div className="mb-6">
        <div className="grid grid-cols-3 gap-4">
          {/* Búsqueda */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Buscar</label>
            <input
              type="text"
              value={searchFilters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              placeholder="Nombre, RUT o código"
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              autoFocus
            />
          </div>

          {/* Tipo */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Tipo</label>
            <select
              value={searchFilters.type}
              onChange={(e) => handleFilterChange("type", e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
            >
              <option value="ALL">Todos</option>
              <option value="COMPANY">Empresa</option>
              <option value="INDIVIDUAL">Persona Natural</option>
            </select>
          </div>

          {/* Segmento */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              Segmento
            </label>
            <select
              value={searchFilters.segment}
              onChange={(e) => handleFilterChange("segment", e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
            >
              <option value="ALL">Todos</option>
              <option value="PYME">PYME</option>
              <option value="Mayorista">Mayorista</option>
              <option value="Retail">Retail</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de clientes */}
      <div className="flex-1 overflow-auto">
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Código
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  RUT
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Segmento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ciudad / Región
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    No se encontraron clientes con los filtros aplicados
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {customer.customer_code}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {customer.commercial_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {customer.legal_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {customer.tax_id}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {customer.segment}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">
                        {customer.city}
                      </div>
                      <div className="text-xs text-gray-500">
                        {customer.region}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleSelect(customer)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Icon name="check" className="text-sm" />
                        Seleccionar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerSearchModal;