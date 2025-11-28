import React, { useState, useEffect } from "react";
import CashPOSTable from "./CashPOSTable";
import CashPOSFilters from "./CashPOSFilters";
import CashPOSModal from "./CashPOSModal";
import SessionsModal from "./SessionsModal";
import Pagination from "@components/common/pagination/Pagination"
import ModalManager from "@/components/ui/modal/ModalManager";
import cashPOSData from "./data.json";

import { Icon } from "@components/ui/icon/iconManager";

const CashPOSManagement = () => {
  const [cashRegisters, setCashRegisters] = useState([]);
  const [filteredCashRegisters, setFilteredCashRegisters] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    warehouse: "",
    status: "",
  });
  const itemsPerPage = 10;

  useEffect(() => {
    setCashRegisters(cashPOSData.cashRegisters);
    setFilteredCashRegisters(cashPOSData.cashRegisters);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, cashRegisters]);

  const applyFilters = () => {
    const filtered = cashRegisters.filter((cashRegister) => {
      const matchSearch =
        !filters.search ||
        cashRegister.registerCode
          .toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        cashRegister.registerName
          .toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        cashRegister.terminalIdentifier
          ?.toLowerCase()
          .includes(filters.search.toLowerCase());

      const matchWarehouse =
        !filters.warehouse ||
        cashRegister.warehouseId === parseInt(filters.warehouse);

      const matchStatus =
        filters.status === "" ||
        (filters.status === "active" && cashRegister.isActive) ||
        (filters.status === "inactive" && !cashRegister.isActive);

      return matchSearch && matchWarehouse && matchStatus;
    });

    setFilteredCashRegisters(filtered);
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({ search: "", warehouse: "", status: "" });
  };

  const handleSaveCashRegister = (cashRegisterData) => {
    if (cashRegisterData.id) {
      // Editar
      setCashRegisters(
        cashRegisters.map((c) =>
          c.id === cashRegisterData.id ? { ...c, ...cashRegisterData } : c
        )
      );
    } else {
      // Crear
      const newCashRegister = {
        id: Math.max(...cashRegisters.map((c) => c.id)) + 1,
        ...cashRegisterData,
        hasOpenSession: false,
      };
      setCashRegisters([...cashRegisters, newCashRegister]);
    }
  };

  const handleDeleteCashRegister = (cashRegister) => {
    ModalManager.confirm({
      title: "Confirmar Eliminación",
      message: `¿Está seguro que desea eliminar la caja "${cashRegister.registerName}"?`,
      onConfirm: () => {
        setCashRegisters(cashRegisters.filter((c) => c.id !== cashRegister.id));
        
        // Modal de confirmación de éxito
        setTimeout(() => {
          ModalManager.success({
            title: "Operación Exitosa",
            message: `La caja "${cashRegister.registerName}" ha sido eliminada correctamente.`,
          });
        }, 300);
      },
    });
  };

  const handleEditCashRegister = (cashRegister) => {
    ModalManager.custom({
      title: cashRegister ? "Editar Caja POS" : "Nueva Caja POS",
      size: "xlarge",
      content: (
        <CashPOSModal
          cashRegister={cashRegister}
          onSave={handleSaveCashRegister}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  const handleNewCashRegister = () => {
    ModalManager.custom({
      title: "Nueva Caja POS",
      size: "xlarge",
      content: (
        <CashPOSModal
          cashRegister={null}
          onSave={handleSaveCashRegister}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  const handleManageSessions = (cashRegister) => {
    ModalManager.custom({
      title: `Sesiones de Caja: ${cashRegister.registerName}`,
      size: "fullscreenWide",
      content: (
        <SessionsModal
          cashRegister={cashRegister}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  const handleToggleStatus = (cashRegisterId) => {
    const cashRegister = cashRegisters.find((c) => c.id === cashRegisterId);
    if (!cashRegister) return;

    const action = cashRegister.isActive ? "desactivar" : "activar";
    ModalManager.confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Caja`,
      message: `¿Está seguro que desea ${action} la caja "${cashRegister.registerName}"?`,
      onConfirm: () => {
        setCashRegisters(
          cashRegisters.map((c) =>
            c.id === cashRegisterId ? { ...c, isActive: !c.isActive } : c
          )
        );
        
        // Modal de confirmación de éxito
        setTimeout(() => {
          ModalManager.success({
            title: "Operación Exitosa",
            message: `La caja "${cashRegister.registerName}" ha sido ${
              cashRegister.isActive ? "desactivada" : "activada"
            } correctamente.`,
          });
        }, 300);
      },
    });
  };

  // Paginación
  const totalPages = Math.ceil(filteredCashRegisters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCashRegisters = filteredCashRegisters.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Estadísticas
  const stats = {
    totalCashRegisters: filteredCashRegisters.length,
    activeCashRegisters: filteredCashRegisters.filter((c) => c.isActive)
      .length,
    inactiveCashRegisters: filteredCashRegisters.filter((c) => !c.isActive)
      .length,
    openSessions: filteredCashRegisters.filter((c) => c.hasOpenSession).length,
    cashRegistersWithSessions: filteredCashRegisters.filter(
      (c) => c.hasOpenSession
    ).length,
  };

  return (
    <div className="min-h-screen pt-2 -mt-10">
      <div className="max-w-[100%] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b-2 border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Icon name="cash" className="text-green-600 text-3xl" />
              Gestión de Cajas POS
            </h1>
            <p className="text-gray-500 text-sm">
              Administra cajas registradoras, sesiones y operaciones del punto
              de venta
            </p>
          </div>
          <button
            onClick={handleNewCashRegister}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-all hover:-translate-y-0.5 hover:shadow-lg flex items-center gap-2"
          >
            <Icon name="plus" className="text-lg" />
            Nueva Caja POS
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Cajas</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.totalCashRegisters}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon name="cash" className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activas</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.activeCashRegisters}
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
                  {stats.inactiveCashRegisters}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Icon name="ban" className="text-red-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sesiones Abiertas</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.openSessions}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icon name="folder" className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En Operación</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.cashRegistersWithSessions}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Icon name="activity" className="text-orange-600 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <CashPOSFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
        />

        {/* Tabla */}
        <CashPOSTable
          cashRegisters={paginatedCashRegisters}
          onEdit={handleEditCashRegister}
          onManageSessions={handleManageSessions}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDeleteCashRegister}
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

export default CashPOSManagement;