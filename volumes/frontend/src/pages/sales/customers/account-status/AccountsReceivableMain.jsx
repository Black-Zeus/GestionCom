import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@/components/ui/modal/ModalManager";
import AccountsReceivableIdentification from "./AccountsReceivableIdentification";
import AccountsReceivableFilters from "./AccountsReceivableFilters";
import AccountsReceivableEmpty from "./AccountsReceivableEmpty";
import AccountsReceivableDetail from "./AccountsReceivableDetail";
import CustomerSearchModal from "./CustomerSearchModal";
import mockData from "./data.json";

const AccountsReceivableMain = () => {
  // Datos del sistema
  const [customers, setCustomers] = useState([]);
  const [receivables, setReceivables] = useState([]);

  // Estado de selección
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Filtros
  const [filters, setFilters] = useState({
    cutoffDate: new Date().toISOString().split("T")[0],
    view: "OPEN", // OPEN, OVERDUE, ALL
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setCustomers(mockData.customers || []);
    setReceivables(mockData.receivables || []);
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
  };

  const handleOpenSearchModal = () => {
    ModalManager.custom({
      title: "Buscar cliente",
      size: "xlarge",
      content: (
        <CustomerSearchModal
          customers={customers}
          onSelectCustomer={handleSelectCustomer}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      cutoffDate: new Date().toISOString().split("T")[0],
      view: "OPEN",
    });
  };

  return (
    <div className="min-h-screen pt-2 -mt-10">
      <div className="max-w-[100%] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b-2 border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Icon name="receipt" className="text-blue-600 text-3xl" />
              Estado de Cuenta del Cliente
            </h1>
            <p className="text-gray-500 text-sm">
              Consulta el saldo pendiente, crédito utilizado, monto vencido y
              antigüedad de saldos a una fecha de corte
            </p>
          </div>
        </div>

        {/* Identificación del cliente */}
        <AccountsReceivableIdentification
          selectedCustomer={selectedCustomer}
          onOpenSearch={handleOpenSearchModal}
        />

        {/* Filtros / Parámetros */}
        <AccountsReceivableFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          disabled={!selectedCustomer}
        />

        {/* Estado vacío o detalle */}
        {!selectedCustomer ? (
          <AccountsReceivableEmpty />
        ) : (
          <AccountsReceivableDetail
            customer={selectedCustomer}
            receivables={receivables.filter(
              (r) => r.customer_id === selectedCustomer.id
            )}
            filters={filters}
          />
        )}
      </div>
    </div>
  );
};

export default AccountsReceivableMain;