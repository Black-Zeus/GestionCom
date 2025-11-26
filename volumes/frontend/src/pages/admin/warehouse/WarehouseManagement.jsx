import React, { useState, useEffect } from "react";
import WarehouseTable from "./WarehouseTable";
import WarehouseFilters from "./WarehouseFilters";
import WarehouseModal from "./WarehouseModal";
import ZonesModal from "./ZonesModal";
import UsersModal from "./UsersModal";
import Pagination from "./Pagination";
import ModalManager from "@/components/ui/modal/ModalManager";
import warehousesData from "./data.json";
import { Icon } from "@components/ui/icon/iconManager";

const WarehouseManagement = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [filteredWarehouses, setFilteredWarehouses] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ search: "", type: "", status: "" });
  const itemsPerPage = 10;

  useEffect(() => {
    setWarehouses(warehousesData.warehouses);
    setFilteredWarehouses(warehousesData.warehouses);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, warehouses]);

  const applyFilters = () => {
    const filtered = warehouses.filter((warehouse) => {
      const matchSearch =
        !filters.search ||
        warehouse.warehouse_code
          .toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        warehouse.warehouse_name
          .toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        warehouse.city.toLowerCase().includes(filters.search.toLowerCase());

      const matchType =
        !filters.type || warehouse.warehouse_type === filters.type;

      const matchStatus =
        filters.status === "" ||
        warehouse.is_active === parseInt(filters.status, 10);

      return matchSearch && matchType && matchStatus;
    });

    setFilteredWarehouses(filtered);
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({ search: "", type: "", status: "" });
  };

  const handleSaveWarehouse = (warehouseData) => {
    if (warehouseData.id) {
      // Editar
      setWarehouses(
        warehouses.map((w) =>
          w.id === warehouseData.id ? { ...w, ...warehouseData } : w
        )
      );
    } else {
      // Crear
      const newWarehouse = {
        id: Math.max(...warehouses.map((w) => w.id)) + 1,
        ...warehouseData,
        users_count: 0,
        zones_count: 0,
        assigned_users: [],
        zones: [],
      };
      setWarehouses([...warehouses, newWarehouse]);
    }
  };

  const handleDeleteWarehouse = (warehouse) => {
    ModalManager.confirm({
      title: "Confirmar Eliminación",
      message: `¿Está seguro que desea eliminar la bodega "${warehouse.warehouse_name}"?`,
      onConfirm: () => {
        setWarehouses(warehouses.filter((w) => w.id !== warehouse.id));
      },
    });
  };

  const handleEditWarehouse = (warehouse) => {
    ModalManager.custom({
      title: warehouse ? "Editar Bodega" : "Nueva Bodega",
      size: "large",
      content: (
        <WarehouseModal
          warehouse={warehouse}
          users={warehousesData.users}
          onSave={handleSaveWarehouse}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  const handleNewWarehouse = () => {
    ModalManager.custom({
      title: "Nueva Bodega",
      size: "large",
      content: (
        <WarehouseModal
          warehouse={null}
          users={warehousesData.users}
          onSave={handleSaveWarehouse}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  const handleManageZones = (warehouse) => {
    ModalManager.custom({
      title: "Zonas de Bodega",
      size: "large",
      content: (
        <ZonesModal
          warehouse={warehouse}
          onSave={(zones) => {
            setWarehouses(
              warehouses.map((w) =>
                w.id === warehouse.id
                  ? { ...w, zones, zones_count: zones.length }
                  : w
              )
            );
            ModalManager.closeAll();
          }}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  const handleManageUsers = (warehouse) => {
    ModalManager.custom({
      title: "Asignar Usuarios",
      size: "medium",
      content: (
        <UsersModal
          warehouse={warehouse}
          availableUsers={warehousesData.users}
          onSave={(users) => {
            setWarehouses(
              warehouses.map((w) =>
                w.id === warehouse.id
                  ? { ...w, assigned_users: users, users_count: users.length }
                  : w
              )
            );
            ModalManager.closeAll();
          }}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  // Paginación
  const totalPages = Math.ceil(filteredWarehouses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedWarehouses = filteredWarehouses.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Estadísticas (sobre el listado filtrado, igual que en users)
  const stats = {
    totalWarehouses: filteredWarehouses.length,
    activeWarehouses: filteredWarehouses.filter((w) => w.is_active).length,
    inactiveWarehouses: filteredWarehouses.filter((w) => !w.is_active).length,
    totalZones: filteredWarehouses.reduce(
      (acc, w) => acc + (w.zones_count || 0),
      0
    ),
    totalAssignedUsers: filteredWarehouses.reduce(
      (acc, w) => acc + (w.users_count || 0),
      0
    ),
  };

  return (
    <div className="min-h-screen p-8 -mt-10">
      <div className="max-w-[90%] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b-2 border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Icon name="warehouse" className="text-blue-600 text-3xl" />
              Gestión de Bodegas
            </h1>
            <p className="text-gray-500 text-sm">
              Administra tus bodegas, zonas y asignación de usuarios
            </p>
          </div>
          <button
            onClick={handleNewWarehouse}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all hover:-translate-y-0.5 hover:shadow-lg flex items-center gap-2"
          >
            <Icon name="plus" className="text-lg" />
            Nueva Bodega
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalWarehouses}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon name="warehouse" className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activas</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.activeWarehouses}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Icon name="checkCircle" className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4 border border-red-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactivas</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.inactiveWarehouses}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Icon name="error" className="text-red-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Zonas</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.totalZones}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icon name="zones" className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Usuarios asignados</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.totalAssignedUsers}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Icon name="users" className="text-orange-600 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <WarehouseFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
        />

        {/* Tabla */}
        <WarehouseTable
          warehouses={paginatedWarehouses}
          onEdit={handleEditWarehouse}
          onManageZones={handleManageZones}
          onManageUsers={handleManageUsers}
          onDelete={handleDeleteWarehouse}
        />

        {/* Paginación */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default WarehouseManagement;
