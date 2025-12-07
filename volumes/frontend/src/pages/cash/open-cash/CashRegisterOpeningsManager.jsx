import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@/components/ui/modal/ModalManager";
import OpeningKPICards from "./OpeningKPICards";
import CurrentRegisterStatus from "./CurrentRegisterStatus";
import SessionHistoryFilters from "./SessionHistoryFilters";
import SessionHistoryTable from "./SessionHistoryTable";
import OpeningModal from "./OpeningModal";
import ClosingModal from "./ClosingModal";
import SessionDetailModal from "./SessionDetailModal";
import cashRegisterData from "./data.json";

/**
 * CashRegisterOpeningsManager
 * Componente de gestión con toda la lógica de aperturas de caja
 */
const CashRegisterOpeningsManager = () => {
  // Estados principales
  const [currentUser] = useState(cashRegisterData.currentUser);
  const [currentBranch] = useState(cashRegisterData.currentBranch);
  const [branches] = useState(cashRegisterData.branches);
  const [registers] = useState(cashRegisterData.registers);
  const [sessionStatuses] = useState(cashRegisterData.sessionStatuses);
  const [sessions, setSessions] = useState(cashRegisterData.sessions);
  const [cashMovements] = useState(cashRegisterData.cashMovements);
  const [pettyCashExpenses] = useState(cashRegisterData.pettyCashExpenses);
  const [pettyCashReplenishments] = useState(
    cashRegisterData.pettyCashReplenishments
  );

  // Estados de UI
  const [selectedRegister, setSelectedRegister] = useState(null);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    branchId: "",
    registerId: "",
  });

  // Estados de modales
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  // Cargar sesiones filtradas al montar
  useEffect(() => {
    applyFilters();
  }, [sessions, filters]);

  /**
   * Aplicar filtros a las sesiones
   */
  const applyFilters = () => {
    let filtered = sessions.filter(
      (session) => session.cashier_user_id === currentUser.id
    );

    // Filtro por rango de fechas
    if (filters.dateFrom) {
      filtered = filtered.filter(
        (session) =>
          new Date(session.opening_datetime) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (session) => new Date(session.opening_datetime) <= dateTo
      );
    }

    // Filtro por sucursal
    if (filters.branchId) {
      filtered = filtered.filter(
        (session) => session.branch_id === parseInt(filters.branchId)
      );
    }

    // Filtro por caja
    if (filters.registerId) {
      filtered = filtered.filter(
        (session) => session.cash_register_id === parseInt(filters.registerId)
      );
    }

    // Ordenar por fecha de apertura descendente
    filtered.sort(
      (a, b) =>
        new Date(b.opening_datetime).getTime() -
        new Date(a.opening_datetime).getTime()
    );

    setFilteredSessions(filtered);
  };

  /**
   * Cambiar filtro
   */
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Limpiar filtros
   */
  const handleClearFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      branchId: "",
      registerId: "",
    });
  };

  /**
   * Cambiar caja seleccionada
   */
  const handleRegisterChange = (registerId) => {
    const register = registers.find((r) => r.id === parseInt(registerId));
    setSelectedRegister(register);
  };

  /**
   * Abrir modal de apertura
   */
  const handleOpenOpeningModal = (register = null) => {
    if (register) {
      setSelectedRegister(register);
    }
    setShowOpeningModal(true);
  };

  /**
   * Cerrar modal de apertura
   */
  const handleCloseOpeningModal = () => {
    setShowOpeningModal(false);
  };

  /**
   * Abrir modal de cierre
   */
  const handleOpenClosingModal = (session, register) => {
    setSelectedSession(session);
    setSelectedRegister(register);
    setShowClosingModal(true);
  };

  /**
   * Cerrar modal de cierre
   */
  const handleCloseClosingModal = () => {
    setShowClosingModal(false);
  };

  /**
   * Guardar cierre de caja
   */
  const handleSaveClosing = (closingData) => {
    if (!selectedSession) return;

    // Calcular monto teórico
    let theoreticalAmount = selectedSession.opening_amount;
    const sessionMovements = cashMovements.filter(
      (m) => m.cash_register_session_id === selectedSession.id && m.payment_method_id === 1
    );
    sessionMovements.forEach((movement) => {
      theoreticalAmount += movement.amount;
    });

    // Calcular diferencia
    const differenceAmount = closingData.physical_amount - theoreticalAmount;

    // Actualizar la sesión con los datos de cierre
    setSessions((prev) =>
      prev.map((s) =>
        s.id === selectedSession.id
          ? {
              ...s,
              closing_datetime: new Date().toISOString(),
              theoretical_amount: theoreticalAmount,
              physical_amount: closingData.physical_amount,
              difference_amount: differenceAmount,
              closing_notes: closingData.closing_notes,
              status_code: "CLOSED",
            }
          : s
      )
    );

    // Cerrar modal y mostrar éxito
    handleCloseClosingModal();
    
    const formatCurrency = (amount) => new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);

    ModalManager.success({
      title: "Cierre registrado",
      message: `Sesión ${selectedSession.session_code} cerrada exitosamente. 
        Monto teórico: ${formatCurrency(theoreticalAmount)} | 
        Monto declarado: ${formatCurrency(closingData.physical_amount)} | 
        Diferencia: ${formatCurrency(differenceAmount)}`,
    });

    // Limpiar selección
    setSelectedSession(null);
  };

  /**
   * Guardar nueva apertura
   */
  const handleSaveOpening = (openingData) => {
    // Validar que no exista sesión abierta para esta caja y usuario
    const existingOpenSession = sessions.find(
      (s) =>
        s.cash_register_id === openingData.cash_register_id &&
        s.cashier_user_id === currentUser.id &&
        s.status_code === "OPEN"
    );

    if (existingOpenSession) {
      ModalManager.error({
        title: "Error al aperturar caja",
        message:
          "Ya existe una sesión abierta para esta caja. Debe cerrarla antes de abrir una nueva.",
      });
      return;
    }

    // Generar nuevo ID
    const newId = Math.max(...sessions.map((s) => s.id), 0) + 1;

    // Generar código de sesión
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const sessionCode = `SES-${dateStr}-${String(newId).padStart(4, "0")}`;

    // Obtener información del registro
    const register = registers.find(
      (r) => r.id === openingData.cash_register_id
    );

    // Crear nueva sesión
    const newSession = {
      id: newId,
      session_code: sessionCode,
      branch_id: register.branch_id,
      branch_code: register.branch_code,
      branch_name: register.branch_name,
      cash_register_id: register.id,
      cash_register_code: register.register_code,
      cash_register_name: register.register_name,
      cashier_user_id: currentUser.id,
      cashier_name: currentUser.full_name,
      supervisor_user_id: 20, // Mock supervisor
      supervisor_name: "Supervisor General",
      opening_amount: openingData.opening_amount,
      opening_datetime: now.toISOString(),
      opening_notes: openingData.opening_notes || "",
      closing_datetime: null,
      theoretical_amount: null,
      physical_amount: null,
      difference_amount: null,
      closing_notes: "",
      status_code: "OPEN",
    };

    // Agregar sesión
    setSessions((prev) => [newSession, ...prev]);

    // Cerrar modal y mostrar éxito
    handleCloseOpeningModal();
    ModalManager.success({
      title: "Apertura registrada",
      message: `Sesión ${sessionCode} creada exitosamente para ${register.register_name}.`,
    });
  };

  /**
   * Abrir modal de detalle
   */
  const handleViewDetail = (session) => {
    setSelectedSession(session);
    setShowDetailModal(true);
  };

  /**
   * Cerrar modal de detalle
   */
  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedSession(null);
  };

  /**
   * Calcular KPIs
   */
  const calculateKPIs = () => {
    const userSessions = sessions.filter(
      (s) => s.cashier_user_id === currentUser.id
    );

    // Sesiones abiertas hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessionsOpenToday = userSessions.filter((s) => {
      const openDate = new Date(s.opening_datetime);
      openDate.setHours(0, 0, 0, 0);
      return openDate.getTime() === today.getTime() && s.status_code === "OPEN";
    }).length;

    // Sesiones cerradas año en curso
    const currentYear = new Date().getFullYear();
    const sessionsClosedYear = userSessions.filter((s) => {
      const openDate = new Date(s.opening_datetime);
      return (
        openDate.getFullYear() === currentYear &&
        (s.status_code === "CLOSED" || s.status_code === "RECONCILED")
      );
    }).length;

    // Diferencia acumulada año
    const diffYear = userSessions
      .filter((s) => {
        const openDate = new Date(s.opening_datetime);
        return (
          openDate.getFullYear() === currentYear &&
          s.difference_amount !== null
        );
      })
      .reduce((sum, s) => sum + (s.difference_amount || 0), 0);

    return {
      sessionsOpenToday,
      sessionsClosedYear,
      diffYear,
    };
  };

  const kpis = calculateKPIs();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Encabezado */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Icon name="FaCashRegister" className="text-blue-600 text-3xl" />
            <h1 className="text-2xl font-semibold text-gray-900">
              Módulo de Caja · Apertura / Cierre de caja
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Gestión de aperturas y cierres de caja, estado actual de la caja
            seleccionada e historial de sesiones del usuario.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-sm font-medium">
            {currentUser.full_name}
          </span>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <OpeningKPICards kpis={kpis} />

      {/* Estado actual de caja */}
      <CurrentRegisterStatus
        currentBranch={currentBranch}
        currentUser={currentUser}
        registers={registers}
        sessions={sessions}
        selectedRegister={selectedRegister}
        onRegisterChange={handleRegisterChange}
        onOpenModal={handleOpenOpeningModal}
        onCloseModal={handleOpenClosingModal}
      />

      {/* Filtros */}
      <SessionHistoryFilters
        filters={filters}
        branches={branches}
        registers={registers}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* Historial */}
      <SessionHistoryTable
        sessions={filteredSessions}
        sessionStatuses={sessionStatuses}
        onViewDetail={handleViewDetail}
      />

      {/* Modal de apertura */}
      {showOpeningModal && (
        <OpeningModal
          isOpen={showOpeningModal}
          onClose={handleCloseOpeningModal}
          onSave={handleSaveOpening}
          currentBranch={currentBranch}
          currentUser={currentUser}
          registers={registers}
          sessions={sessions}
          selectedRegister={selectedRegister}
        />
      )}

      {/* Modal de cierre */}
      {showClosingModal && selectedSession && (
        <ClosingModal
          isOpen={showClosingModal}
          onClose={handleCloseClosingModal}
          onSave={handleSaveClosing}
          currentSession={selectedSession}
          register={selectedRegister}
          cashMovements={cashMovements}
        />
      )}

      {/* Modal de detalle */}
      {showDetailModal && selectedSession && (
        <SessionDetailModal
          isOpen={showDetailModal}
          onClose={handleCloseDetailModal}
          session={selectedSession}
          cashMovements={cashMovements}
          pettyCashExpenses={pettyCashExpenses}
          pettyCashReplenishments={pettyCashReplenishments}
        />
      )}
    </div>
  );
};

export default CashRegisterOpeningsManager;