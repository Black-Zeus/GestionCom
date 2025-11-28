import React, { useState, useEffect } from "react";
import CustomerTable from "./CustomerTable";
import CustomerFiltersBar from "./CustomerFiltersBar";
import CustomerModal from "./CustomerModal";
import Pagination from "@components/common/pagination/Pagination"
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@/components/ui/modal/ModalManager";
import customersData from "./data.json";

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    customer_type: "",
    status: "",
    is_credit_customer: "",
    price_list: "",
    sales_rep: "",
    region: "",
    city: "",
    date_from: "",
    date_to: "",
  });
  const itemsPerPage = 10;

  useEffect(() => {
    setCustomers(customersData.customers);
    setFilteredCustomers(customersData.customers);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, customers]);

  const applyFilters = () => {
    let filtered = [...customers];

    // Filtro de búsqueda (código, RUT, razón social, nombre comercial)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.customer_code.toLowerCase().includes(searchLower) ||
          c.tax_id.toLowerCase().includes(searchLower) ||
          c.legal_name.toLowerCase().includes(searchLower) ||
          c.commercial_name?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por tipo de cliente
    if (filters.customer_type) {
      filtered = filtered.filter((c) => c.customer_type === filters.customer_type);
    }

    // Filtro por estado
    if (filters.status) {
      filtered = filtered.filter(
        (c) => c.status_id === parseInt(filters.status, 10)
      );
    }

    // Filtro por cliente de crédito
    if (filters.is_credit_customer !== "") {
      const isCreditValue = filters.is_credit_customer === "true";
      filtered = filtered.filter((c) => c.is_credit_customer === isCreditValue);
    }

    // Filtro por lista de precios
    if (filters.price_list) {
      filtered = filtered.filter(
        (c) => c.price_list_id === parseInt(filters.price_list, 10)
      );
    }

    // Filtro por vendedor
    if (filters.sales_rep) {
      filtered = filtered.filter(
        (c) => c.sales_rep_user_id === parseInt(filters.sales_rep, 10)
      );
    }

    // Filtro por región
    if (filters.region) {
      const regionLower = filters.region.toLowerCase();
      filtered = filtered.filter((c) =>
        c.region.toLowerCase().includes(regionLower)
      );
    }

    // Filtro por ciudad
    if (filters.city) {
      const cityLower = filters.city.toLowerCase();
      filtered = filtered.filter((c) =>
        c.city.toLowerCase().includes(cityLower)
      );
    }

    // Filtro por rango de fechas
    if (filters.date_from) {
      filtered = filtered.filter(
        (c) => new Date(c.registration_date) >= new Date(filters.date_from)
      );
    }
    if (filters.date_to) {
      filtered = filtered.filter(
        (c) => new Date(c.registration_date) <= new Date(filters.date_to)
      );
    }

    setFilteredCustomers(filtered);
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      customer_type: "",
      status: "",
      is_credit_customer: "",
      price_list: "",
      sales_rep: "",
      region: "",
      city: "",
      date_from: "",
      date_to: "",
    });
  };

  const handleSaveCustomer = (customerData) => {
    if (customerData.id) {
      // Editar cliente existente
      setCustomers(
        customers.map((c) =>
          c.id === customerData.id ? { ...c, ...customerData } : c
        )
      );
    } else {
      // Crear nuevo cliente
      const newCustomer = {
        id: Math.max(...customers.map((c) => c.id)) + 1,
        customer_code: `CLI-${String(Math.max(...customers.map((c) => c.id)) + 1).padStart(3, "0")}`,
        ...customerData,
      };
      setCustomers([...customers, newCustomer]);
    }
  };

  const handleEditCustomer = (customer) => {
    ModalManager.custom({
      title: customer ? `Editar Cliente: ${customer.legal_name}` : "Nuevo Cliente",
      content: (
        <CustomerModal
          customer={customer}
          priceLists={customersData.price_lists}
          users={customersData.users}
          statuses={customersData.system_statuses}
          authorizedUsers={customersData.customer_authorized_users}
          creditConfigs={customersData.customer_credit_config}
          penalties={customersData.customer_penalties}
          exceptions={customersData.credit_limit_exceptions}
          onSave={(data) => {
            handleSaveCustomer(data);
            ModalManager.closeAll();
          }}
          onClose={() => ModalManager.closeAll()}
        />
      ),
      size: "xlarge",
    });
  };

  const handleNewCustomer = () => {
    handleEditCustomer(null);
  };

  const handleDeleteCustomer = (customer) => {
    ModalManager.confirm({
      title: "Confirmar Eliminación",
      message: `¿Está seguro que desea eliminar el cliente "${customer.legal_name}"?`,
      onConfirm: () => {
        setCustomers(customers.filter((c) => c.id !== customer.id));
      },
    });
  };

  // Paginación
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Estadísticas
  const stats = {
    totalCustomers: filteredCustomers.length,
    activeCustomers: filteredCustomers.filter((c) => c.status_id === 1).length,
    creditCustomers: filteredCustomers.filter((c) => c.is_credit_customer)
      .length,
    inactiveCustomers: filteredCustomers.filter((c) => c.status_id !== 1)
      .length,
  };

  return (
    <div className="min-h-screen pt-2 -mt-10">
      <div className="max-w-[100%] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b-2 border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Icon name="users" className="text-blue-600 text-3xl" />
              Gestión de Clientes
            </h1>
            <p className="text-gray-500 text-sm">
              Administra tus clientes, contactos autorizados y configuración de
              crédito
            </p>
          </div>
          <button
            onClick={handleNewCustomer}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all hover:-translate-y-0.5 hover:shadow-lg flex items-center gap-2"
          >
            <Icon name="plus" className="text-xl" />
            Nuevo Cliente
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clientes</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.totalCustomers}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon name="users" className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clientes Activos</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.activeCustomers}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Icon name="check" className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Con Crédito</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.creditCustomers}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icon name="dollar" className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactivos</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.inactiveCustomers}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Icon name="cancel" className="text-orange-600 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <CustomerFiltersBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          priceLists={customersData.price_lists}
          users={customersData.users}
          statuses={customersData.system_statuses}
        />

        {/* Tabla */}
        <CustomerTable
          customers={paginatedCustomers}
          priceLists={customersData.price_lists}
          users={customersData.users}
          statuses={customersData.system_statuses}
          creditConfigs={customersData.customer_credit_config}
          onEdit={handleEditCustomer}
          onDelete={handleDeleteCustomer}
        />

        {/* Paginación */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
};

export default CustomerManagement;