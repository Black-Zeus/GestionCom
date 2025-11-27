import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";

const CustomerSearchModal = ({ customers, onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState(customers);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, customerType, customers]);

  const applyFilters = () => {
    let filtered = customers;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (customer) =>
          customer.tax_id.toLowerCase().includes(term) ||
          customer.legal_name.toLowerCase().includes(term) ||
          customer.email.toLowerCase().includes(term) ||
          (customer.commercial_name &&
            customer.commercial_name.toLowerCase().includes(term))
      );
    }

    if (customerType) {
      filtered = filtered.filter(
        (customer) => customer.customer_type === customerType
      );
    }

    setFilteredCustomers(filtered);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") {
      applyFilters();
    }
  };

  return (
    <div>
      {/* Filtros de Búsqueda */}
      <div className="grid grid-cols-12 gap-4 mb-6">
        <div className="col-span-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar por RUT, Nombre o Email
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            placeholder="Ingrese término de búsqueda"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>

        <div className="col-span-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo
          </label>
          <select
            value={customerType}
            onChange={(e) => setCustomerType(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-white cursor-pointer focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
          >
            <option value="">Todos</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="COMPANY">Empresa</option>
          </select>
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="overflow-hidden rounded-xl border-2 border-gray-200 max-h-[500px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                RUT
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                Nombre/Razón Social
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                Tipo
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                Email
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                Teléfono
              </th>
              <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">
                Crédito
              </th>
              <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Icon
                      name="search"
                      className="text-gray-400 text-4xl mb-2"
                    />
                    <p className="text-gray-600 font-medium">
                      No se encontraron clientes
                    </p>
                    <p className="text-sm text-gray-500">
                      Intente con otros términos de búsqueda
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer, index) => (
                <tr
                  key={customer.tax_id}
                  className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                    index === filteredCustomers.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {customer.tax_id}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {customer.legal_name}
                      </p>
                      {customer.commercial_name && (
                        <p className="text-xs text-gray-500">
                          {customer.commercial_name}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {customer.customer_type === "INDIVIDUAL"
                      ? "Individual"
                      : "Empresa"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {customer.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {customer.phone}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          customer.is_credit_customer
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }`}
                      />
                      <span className="text-sm text-gray-700">
                        {customer.is_credit_customer ? "Sí" : "No"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => onSelect(customer)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all text-sm"
                    >
                      Seleccionar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer con información */}
      {filteredCustomers.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Mostrando {filteredCustomers.length} de {customers.length} clientes
        </div>
      )}
    </div>
  );
};

export default CustomerSearchModal;