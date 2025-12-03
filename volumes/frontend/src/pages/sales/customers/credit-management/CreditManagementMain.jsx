import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import CreditManagementSummary from "./CreditManagementSummary";
import CreditManagementFilters from "./CreditManagementFilters";
import CreditManagementTable from "./CreditManagementTable";
import CreditManagementDetail from "./CreditManagementDetail";
import mockData from "./data.json";

const CreditManagementMain = () => {
  // Datos del sistema
  const [customers, setCustomers] = useState([]);
  const [creditConfigs, setCreditConfigs] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [statuses, setStatuses] = useState([]);

  // Estados de visualización
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  // Filtros
  const [filters, setFilters] = useState({
    search: "",
    risk: "ALL",
    creditStatus: "ALL",
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  // Aplicar filtros cuando cambien
  useEffect(() => {
    applyFilters();
  }, [filters, customers, creditConfigs, receivables]);

  const loadData = () => {
    setCustomers(mockData.customers);
    setCreditConfigs(mockData.customer_credit_config);
    setReceivables(mockData.accounts_receivable);
    setExceptions(mockData.credit_limit_exceptions);
    setStatuses(mockData.system_statuses || []);
  };

  const applyFilters = () => {
    let filtered = customers.filter((customer) => {
      // Solo clientes con crédito
      return creditConfigs.some((config) => config.customer_id === customer.id);
    });

    // Filtro de búsqueda (nombre, razón social, RUT)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (customer) =>
          customer.legal_name.toLowerCase().includes(searchLower) ||
          customer.commercial_name.toLowerCase().includes(searchLower) ||
          customer.tax_id.toLowerCase().includes(searchLower) ||
          customer.customer_code.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por nivel de riesgo
    if (filters.risk !== "ALL") {
      filtered = filtered.filter((customer) => {
        const config = creditConfigs.find((c) => c.customer_id === customer.id);
        return config && config.risk_level === filters.risk;
      });
    }

    // Filtro por estado de crédito
    if (filters.creditStatus !== "ALL") {
      filtered = filtered.filter((customer) => {
        const creditStatus = getCreditStatus(customer.id);
        return creditStatus === filters.creditStatus;
      });
    }

    setFilteredCustomers(filtered);
  };

  const getCreditStatus = (customerId) => {
    const customerReceivables = receivables.filter(
      (r) => r.customer_id === customerId
    );

    const hasOverdue = customerReceivables.some(
      (r) => r.status === "OVERDUE" || r.status === "IN_COLLECTION"
    );

    const config = creditConfigs.find((c) => c.customer_id === customerId);
    const isBlocked =
      config &&
      config.auto_block_on_overdue &&
      customerReceivables.some((r) => r.days_overdue > 30);

    if (isBlocked) return "BLOQUEADO";
    if (hasOverdue) return "EN_MORA";
    return "NORMAL";
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      risk: "ALL",
      creditStatus: "ALL",
    });
  };

  const handleViewDetail = (customer) => {
    setSelectedCustomer(customer);
    setShowDetail(true);
  };

  const handleBackToList = () => {
    setShowDetail(false);
    setSelectedCustomer(null);
  };

  // Calcular KPIs
  const calculateKPIs = () => {
    const creditCustomers = customers.filter((customer) =>
      creditConfigs.some((config) => config.customer_id === customer.id)
    );

    const totalCreditLimit = creditConfigs.reduce(
      (sum, config) => sum + (config.credit_limit || 0),
      0
    );

    const totalCreditUsed = creditConfigs.reduce(
      (sum, config) => sum + (config.used_credit || 0),
      0
    );

    const blockedCustomers = creditCustomers.filter(
      (customer) => getCreditStatus(customer.id) === "BLOQUEADO"
    ).length;

    return {
      totalCreditCustomers: creditCustomers.length,
      totalCreditLimit,
      totalCreditUsed,
      blockedCustomers,
    };
  };

  const kpis = calculateKPIs();

  return (
    <div className="min-h-screen pt-2 -mt-10">
      <div className="max-w-[100%] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b-2 border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Icon name="credit-card" className="text-blue-600 text-3xl" />
              Gestión de Créditos
            </h1>
            <p className="text-gray-500 text-sm">
              Administra los límites de crédito, exposición y estado de cuentas
              por cobrar de tus clientes
            </p>
          </div>
        </div>

        {!showDetail ? (
          <>
            {/* KPI Cards */}
            <CreditManagementSummary kpis={kpis} />

            {/* Filtros */}
            <CreditManagementFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
            />

            {/* Tabla de clientes con crédito */}
            <CreditManagementTable
              customers={filteredCustomers}
              creditConfigs={creditConfigs}
              receivables={receivables}
              onViewDetail={handleViewDetail}
              getCreditStatus={getCreditStatus}
            />
          </>
        ) : (
          <>
            {/* Vista de detalle */}
            <CreditManagementDetail
              customer={selectedCustomer}
              creditConfig={creditConfigs.find(
                (c) => c.customer_id === selectedCustomer?.id
              )}
              receivables={receivables.filter(
                (r) => r.customer_id === selectedCustomer?.id
              )}
              exceptions={exceptions.filter(
                (e) => e.customer_id === selectedCustomer?.id
              )}
              onBack={handleBackToList}
              getCreditStatus={getCreditStatus}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default CreditManagementMain;
