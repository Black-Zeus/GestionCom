import React, { useState, useEffect } from "react";
import AuthorizedPersonsFilters from "./AuthorizedPersonsFilters";
import AuthorizedPersonsTable from "./AuthorizedPersonsTable";
import AuthorizedPersonsDetail from "./AuthorizedPersonsDetail";
import AuthorizedPersonModal from "./AuthorizedPersonModal";
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@/components/ui/modal/ModalManager";
import mockData from "./data.json";

const AuthorizedPersonsManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [authorizedUsers, setAuthorizedUsers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [statuses, setStatuses] = useState([]);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    type: "",
    region: "",
    city: "",
  });

  // Cargar datos iniciales
  useEffect(() => {
    setCustomers(mockData.customers);
    setAuthorizedUsers(mockData.customer_authorized_users);
    setFilteredCustomers(mockData.customers);
    setStatuses(mockData.system_statuses);
  }, []);

  // Aplicar filtros
  useEffect(() => {
    applyFilters();
  }, [filters, customers]);

  const applyFilters = () => {
    let filtered = [...customers];

    // Filtro de búsqueda
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.customer_code.toLowerCase().includes(searchLower) ||
          c.tax_id.toLowerCase().includes(searchLower) ||
          c.legal_name.toLowerCase().includes(searchLower) ||
          c.contact_person?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por estado
    if (filters.status) {
      if (filters.status === "ACTIVE") {
        filtered = filtered.filter((c) => c.status_id === 1);
      } else if (filters.status === "INACTIVE") {
        filtered = filtered.filter((c) => c.status_id === 2);
      }
    }

    // Filtro por tipo
    if (filters.type) {
      filtered = filtered.filter((c) => c.customer_type === filters.type);
    }

    // Filtro por región
    if (filters.region && filters.region !== "ALL") {
      filtered = filtered.filter((c) => c.region === filters.region);
    }

    // Filtro por ciudad
    if (filters.city && filters.city !== "ALL") {
      filtered = filtered.filter((c) => c.city === filters.city);
    }

    setFilteredCustomers(filtered);
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "",
      type: "",
      region: "",
      city: "",
    });
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowDetail(true);
  };

  const handleBackToList = () => {
    setSelectedCustomer(null);
    setShowDetail(false);
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleDeleteUser = (userId) => {
    ModalManager.confirm({
      title: "Confirmar eliminación",
      message: "¿Está seguro de eliminar esta persona autorizada?",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      type: "danger",
      onConfirm: () => {
        setAuthorizedUsers((prev) => prev.filter((u) => u.id !== userId));
        ModalManager.success({
          title: "Persona eliminada",
          message: "La persona autorizada ha sido eliminada exitosamente.",
        });
      },
    });
  };

  const handleSaveUser = (userData) => {
    if (editingUser) {
      // Editar
      setAuthorizedUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id ? { ...userData, id: u.id } : u
        )
      );
      ModalManager.success({
        title: "Persona actualizada",
        message: "Los datos de la persona autorizada han sido actualizados.",
      });
    } else {
      // Agregar
      const newUser = {
        ...userData,
        id: Math.max(...authorizedUsers.map((u) => u.id), 0) + 1,
        customer_id: selectedCustomer.id,
      };
      setAuthorizedUsers((prev) => [...prev, newUser]);
      ModalManager.success({
        title: "Persona agregada",
        message: "La persona autorizada ha sido agregada exitosamente.",
      });
    }
    setShowModal(false);
    setEditingUser(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  // Obtener personas autorizadas del cliente seleccionado
  const getCustomerAuthorizedUsers = () => {
    if (!selectedCustomer) return [];
    return authorizedUsers.filter((u) => u.customer_id === selectedCustomer.id);
  };

  // Obtener regiones únicas
  const getUniqueRegions = () => {
    const regions = [...new Set(customers.map((c) => c.region))];
    return regions.sort();
  };

  // Obtener ciudades únicas
  const getUniqueCities = () => {
    const cities = [...new Set(customers.map((c) => c.city))];
    return cities.sort();
  };

  // Calcular métricas
  const calculateMetrics = () => {
    const totalClients = customers.length;
    const activeClients = customers.filter((c) => c.status_id === 1).length;
    const creditClients = customers.filter((c) => c.is_credit_customer).length;
    const inactiveClients = customers.filter((c) => c.status_id === 2).length;

    return {
      totalClients,
      activeClients,
      creditClients,
      inactiveClients,
    };
  };

  const metrics = calculateMetrics();
  const customerUsers = getCustomerAuthorizedUsers();

  return (
    <div className="min-h-screen pt-2 -mt-10">
      <div className="max-w-[100%] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b-2 border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Icon name="users" className="text-blue-600 text-3xl" />
              Gestión de Clientes
            </h1>
            <p className="text-gray-500 text-sm">
              Administra tus clientes, contactos autorizados y configuración de
              crédito.
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clientes</p>
                <p className="text-2xl font-bold text-blue-600">
                  {metrics.totalClients}
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
                  {metrics.activeClients}
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
                  {metrics.creditClients}
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
                  {metrics.inactiveClients}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Icon name="cancel" className="text-orange-600 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros - Solo mostrar cuando no hay detalle */}
        {!showDetail && (
          <AuthorizedPersonsFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
            regions={getUniqueRegions()}
            cities={getUniqueCities()}
          />
        )}

        {/* Tabla de clientes o detalle */}
        {!showDetail ? (
          <AuthorizedPersonsTable
            customers={filteredCustomers}
            authorizedUsers={authorizedUsers}
            statuses={statuses}
            onSelectCustomer={handleSelectCustomer}
          />
        ) : (
          <AuthorizedPersonsDetail
            customer={selectedCustomer}
            authorizedUsers={customerUsers}
            onBack={handleBackToList}
            onAddUser={handleAddUser}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
          />
        )}

        {/* Modal */}
        {showModal && (
          <AuthorizedPersonModal
            user={editingUser}
            onSave={handleSaveUser}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </div>
  );
};

export default AuthorizedPersonsManagement;
