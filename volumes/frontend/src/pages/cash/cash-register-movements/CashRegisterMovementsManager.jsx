import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@/components/ui/modal/ModalManager";
import MovementsKPICards from "./MovementsKPICards";
import MovementsFilters from "./MovementsFilters";
import SessionsTable from "./SessionsTable";
import MovementsDetailModal from "./MovementsDetailModal";
import SquareModal from "./SquareModal";
import cashMovementsData from "./data.json";

/**
 * CashRegisterMovementsManager
 * Componente de gestión de movimientos de caja
 */
const CashRegisterMovementsManager = () => {

  // Estados principales
  const [currentUser] = useState(cashMovementsData.currentUser);
  const [currentBranch] = useState(cashMovementsData.currentBranch);
  const [branches] = useState(cashMovementsData.branches);
  const [registers] = useState(cashMovementsData.registers);
  const [sessionStatuses] = useState(cashMovementsData.sessionStatuses);
  const [sessions] = useState(cashMovementsData.sessions);
  const [cashMovements] = useState(cashMovementsData.cashMovements);
  const [movementTypes] = useState(cashMovementsData.movementTypes);
  const [paymentMethods] = useState(cashMovementsData.paymentMethods);

  // Estados de UI
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    branchId: "",
    registerId: "",
    statusCode: "",
  });

  // Cargar sesiones filtradas
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

    // Filtro por estado
    if (filters.statusCode) {
      filtered = filtered.filter(
        (session) => session.status_code === filters.statusCode
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
      statusCode: "",
    });
  };

  /**
   * Ver movimientos de una sesión
   */
  const handleViewMovements = (session) => {
    ModalManager.custom({
      title: "Detalle de movimientos",
      size: "xlarge",
      content: (
        <MovementsDetailModal
          session={session}
          cashMovements={cashMovements}
          movementTypes={movementTypes}
          paymentMethods={paymentMethods}
        />
      ),
    });
  };

  /**
   * Ver cuadratura de una sesión
   */
  const handleViewSquare = (session) => {
    ModalManager.custom({
      title: "Cuadratura de caja",
      size: "xlarge",
      content: (<SquareModal
        session={session}
        cashMovements={cashMovements}
        paymentMethods={paymentMethods}
      />
      ),
    });
  };

  /**
   * Calcular KPIs
   */
  const calculateKPIs = () => {
    const userSessions = sessions.filter(
      (s) => s.cashier_user_id === currentUser.id
    );

    // Total sesiones
    const totalSessions = userSessions.length;

    // Total movimientos
    const totalMovements = cashMovements.filter((m) =>
      userSessions.some((s) => s.id === m.cash_register_session_id)
    ).length;

    // Monto total ventas (solo efectivo)
    const totalSales = cashMovements
      .filter(
        (m) =>
          userSessions.some((s) => s.id === m.cash_register_session_id) &&
          m.movement_type === "SALE" &&
          m.payment_method_id === 1
      )
      .reduce((sum, m) => sum + m.amount, 0);

    // Sesiones abiertas
    const openSessions = userSessions.filter((s) => s.status_code === "OPEN")
      .length;

    return {
      totalSessions,
      totalMovements,
      totalSales,
      openSessions,
    };
  };

  const kpis = calculateKPIs();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Encabezado */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Icon name="FaList" className="text-blue-600 text-3xl" />
            <h1 className="text-2xl font-semibold text-gray-900">
              Movimientos de Caja
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Consulte el detalle de todos los movimientos registrados en sus
            sesiones de caja y genere cuadraturas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-sm font-medium">
            {currentUser.full_name}
          </span>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <MovementsKPICards kpis={kpis} />

      {/* Filtros */}
      <MovementsFilters
        filters={filters}
        branches={branches}
        registers={registers}
        sessionStatuses={sessionStatuses}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* Tabla de sesiones */}
      <SessionsTable
        sessions={filteredSessions}
        sessionStatuses={sessionStatuses}
        onViewMovements={handleViewMovements}
        onViewSquare={handleViewSquare}
      />
    </div>
  );
};

export default CashRegisterMovementsManager;