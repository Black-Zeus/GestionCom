import React, { useState, useEffect } from "react";
import SessionsTable from "./SessionsTable";
import SessionsFilters from "./SessionsFilters";
import SessionDetailModal from "./SessionDetailModal";
import OpenSessionModal from "./OpenSessionModal";
import SessionKPIs from "./SessionKPIs";
import Pagination from "@components/common/pagination/Pagination";
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@/components/ui/modal/ModalManager";
import mockData from "./data.json";

const CashRegisterSessionsMain = () => {
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    branch: "",
    register: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  });
  const itemsPerPage = 10;

  const [branches] = useState(mockData.branches);
  const [registers] = useState(mockData.registers);
  const [paymentMethods] = useState(mockData.paymentMethods);
  const [sessionStatuses] = useState(mockData.sessionStatuses);
  const [cashMovements] = useState(mockData.cashMovements);
  const [currentUser] = useState(mockData.currentUser);
  const [currentBranch] = useState(mockData.currentBranch);
  const [cashDenominationsCatalog] = useState(mockData.cashDenominationsCatalog);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, sessions]);

  const loadData = () => {
    setSessions(mockData.sessions);
    setFilteredSessions(mockData.sessions);
  };

  const applyFilters = () => {
    const filtered = sessions.filter((session) => {
      const matchSearch =
        !filters.search ||
        session.session_code.toLowerCase().includes(filters.search.toLowerCase()) ||
        session.cashier_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        session.cash_register_code.toLowerCase().includes(filters.search.toLowerCase());

      const matchBranch = !filters.branch || session.branch_code === filters.branch;
      const matchRegister = !filters.register || session.cash_register_code === filters.register;
      const matchStatus = !filters.status || session.status_code === filters.status;

      const sessionDate = new Date(session.opening_datetime);
      const matchDateFrom = !filters.dateFrom || sessionDate >= new Date(filters.dateFrom);
      const matchDateTo = !filters.dateTo || sessionDate <= new Date(new Date(filters.dateTo).setHours(23, 59, 59, 999));

      return matchSearch && matchBranch && matchRegister && matchStatus && matchDateFrom && matchDateTo;
    });

    setFilteredSessions(filtered);
    setCurrentPage(1);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: "", branch: "", register: "", status: "", dateFrom: "", dateTo: "" });
  };

  const handleOpenSession = () => {
    ModalManager.custom({
      title: "Apertura de Sesión de Caja",
      size: "large",
      content: (
        <OpenSessionModal
          registers={registers.filter((r) => r.authorized_for_current_user)}
          currentUser={currentUser}
          currentBranch={currentBranch}
          onSave={handleSaveNewSession}
          onCancel={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  const handleSaveNewSession = (sessionData) => {
    const newSession = {
      id: Math.max(...sessions.map((s) => s.id)) + 1,
      session_code: `SES-${new Date().toISOString().split("T")[0]}-${String(sessions.length + 1).padStart(4, "0")}`,
      ...sessionData,
      status_code: "OPEN",
      closing_datetime: null,
      theoretical_amount: null,
      physical_amount: null,
      difference_amount: null,
      closing_notes: "",
    };

    setSessions([newSession, ...sessions]);
    ModalManager.success({
      title: "Sesión Abierta",
      message: `La sesión ${newSession.session_code} ha sido abierta exitosamente.`,
    });
  };

  const handleViewSession = (session) => {
    const sessionMovements = cashMovements.filter((m) => m.cash_register_session_id === session.id);

    ModalManager.custom({
      title: `Detalle de Sesión: ${session.session_code}`,
      size: "xlarge",
      content: (
        <SessionDetailModal
          session={session}
          movements={sessionMovements}
          paymentMethods={paymentMethods}
          cashDenominationsCatalog={cashDenominationsCatalog}
          onClose={() => ModalManager.closeAll()}
          onCloseSession={handleCloseSession}
        />
      ),
    });
  };

  const handleCloseSession = (sessionId, closingData) => {
    setSessions(
      sessions.map((s) =>
        s.id === sessionId ? { ...s, ...closingData, status_code: "CLOSED" } : s
      )
    );

    ModalManager.success({
      title: "Sesión Cerrada",
      message: "La sesión ha sido cerrada exitosamente.",
    });
  };

  const handleReconcileSession = (session) => {
    ModalManager.confirm({
      title: "Confirmar Arqueo",
      message: `¿Está seguro que desea marcar la sesión ${session.session_code} como arqueada?`,
      onConfirm: () => {
        setSessions(sessions.map((s) => (s.id === session.id ? { ...s, status_code: "RECONCILED" } : s)));
        ModalManager.success({
          title: "Sesión Arqueada",
          message: "La sesión ha sido marcada como arqueada exitosamente.",
        });
      },
    });
  };

  const paginatedSessions = filteredSessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Icon name="dollar-sign" className="text-blue-600 dark:text-blue-400" />
              Gestión de Sesiones de Caja
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Control y seguimiento de sesiones de caja registradora
            </p>
          </div>
          <button
            onClick={handleOpenSession}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Icon name="plus" />
            Abrir Sesión
          </button>
        </div>
      </div>

      {/* KPIs */}
      <SessionKPIs sessions={sessions} />

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Icon name="filter" className="text-gray-600 dark:text-gray-400" />
            Filtros de Búsqueda
          </h2>
        </div>
        <div className="p-4">
          <SessionsFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
            branches={branches}
            registers={registers}
            sessionStatuses={sessionStatuses}
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-gray-900 dark:text-white">
              Listado de Sesiones
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredSessions.length} sesiones encontradas
            </span>
          </div>
        </div>
        <div className="p-4">
          <SessionsTable
            sessions={paginatedSessions}
            sessionStatuses={sessionStatuses}
            onViewSession={handleViewSession}
            onReconcileSession={handleReconcileSession}
          />

          {filteredSessions.length > itemsPerPage && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredSessions.length / itemsPerPage)}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CashRegisterSessionsMain;