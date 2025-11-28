import React, { useState, useEffect } from "react";
import PettyCashTable from "./PettyCashTable";
import PettyCashFilters from "./PettyCashFilters";
import PettyCashModal from "./PettyCashModal";
import ExpensesModal from "./ExpensesModal";
import ReplenishmentsModal from "./ReplenishmentsModal";
import CategoriesModal from "./CategoriesModal";
import Pagination from "@components/common/pagination/Pagination"
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@/components/ui/modal/ModalManager";
import mockData from "./data.json";

const PettyCashManagement = () => {
  const [funds, setFunds] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [replenishments, setReplenishments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [users, setUsers] = useState([]);

  const [filters, setFilters] = useState({
    search: "",
    warehouse: "",
    status: "",
  });

  const [modals, setModals] = useState({
    fund: false,
    expenses: false,
    replenishments: false,
    categories: false,
  });

  const [selectedFund, setSelectedFund] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setFunds(mockData.funds);
    setExpenses(mockData.expenses);
    setReplenishments(mockData.replenishments);
    setCategories(mockData.categories);
    setWarehouses(mockData.warehouses);
    setUsers(mockData.users);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const openModal = (modalName, fund = null) => {
    setSelectedFund(fund);
    setModals((prev) => ({ ...prev, [modalName]: true }));
  };

  const closeModal = (modalName) => {
    setModals((prev) => ({ ...prev, [modalName]: false }));
    setSelectedFund(null);
  };

  const clearFilters = () => {
    setFilters({ search: "", warehouse: "", status: "" });
  };

  const handleSaveFund = (fundData) => {
    if (selectedFund) {
      // Editar fondo existente
      setFunds((prev) =>
        prev.map((fund) =>
          fund.id === selectedFund.id
            ? {
                ...fund,
                ...fundData,
                warehouse_name:
                  warehouses.find(
                    (w) => w.id === parseInt(fundData.warehouse_id, 10)
                  )?.name || fund.warehouse_name,
                responsible_user_name:
                  users.find(
                    (u) =>
                      u.id === parseInt(fundData.responsible_user_id, 10)
                  )?.name || fund.responsible_user_name,
                updated_at: new Date().toISOString(),
              }
            : fund
        )
      );
      ModalManager.success("Fondo actualizado correctamente");
    } else {
      // Crear nuevo fondo
      const newFund = {
        id: funds.length + 1,
        ...fundData,
        warehouse_name: warehouses.find(
          (w) => w.id === parseInt(fundData.warehouse_id, 10)
        )?.name,
        responsible_user_name: users.find(
          (u) => u.id === parseInt(fundData.responsible_user_id, 10)
        )?.name,
        current_balance: fundData.initial_amount,
        total_expenses: 0,
        total_replenishments: 0,
        last_replenishment_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setFunds((prev) => [...prev, newFund]);
      ModalManager.success("Fondo creado correctamente");
    }
    closeModal("fund");
  };

  const handleSaveExpense = (expenseData) => {
    const newExpense = {
      id: expenses.length + 1,
      expense_code: `EXP-${String(expenses.length + 1).padStart(
        3,
        "0"
      )}-${new Date().getFullYear()}`,
      ...expenseData,
      fund_code: selectedFund.fund_code,
      category_name: categories.find(
        (c) => c.id === parseInt(expenseData.category_id, 10)
      )?.category_name,
      status: "PENDING",
      has_receipt: expenseData.has_receipt || false,
      evidence_file_hash: expenseData.evidence_file
        ? "hash-" + Date.now()
        : null,
      evidence_file_extension: expenseData.evidence_file
        ? expenseData.evidence_file.name.split(".").pop()
        : null,
      evidence_file_size: expenseData.evidence_file
        ? expenseData.evidence_file.size
        : null,
      approved_by_user_name: null,
      approved_datetime: null,
      rejection_reason: null,
      created_by_user_name: selectedFund.responsible_user_name,
      created_at: new Date().toISOString(),
    };

    setExpenses((prev) => [...prev, newExpense]);
    setFunds((prev) =>
      prev.map((fund) =>
        fund.id === selectedFund.id
          ? {
              ...fund,
              total_expenses: fund.total_expenses + expenseData.expense_amount,
              current_balance:
                fund.current_balance - expenseData.expense_amount,
              updated_at: new Date().toISOString(),
            }
          : fund
      )
    );
    ModalManager.success("Gasto registrado correctamente");
  };

  const handleSaveReplenishment = (replenishmentData) => {
    const newReplenishment = {
      id: replenishments.length + 1,
      replenishment_code: `REP-${String(
        replenishments.length + 1
      ).padStart(3, "0")}-${new Date().getFullYear()}`,
      ...replenishmentData,
      fund_code: selectedFund.fund_code,
      authorized_by_user_name: "Jorge Soto",
      created_by_user_name: selectedFund.responsible_user_name,
      created_at: new Date().toISOString(),
    };

    setReplenishments((prev) => [...prev, newReplenishment]);
    setFunds((prev) =>
      prev.map((fund) =>
        fund.id === selectedFund.id
          ? {
              ...fund,
              current_balance: replenishmentData.new_balance,
              total_replenishments:
                fund.total_replenishments +
                replenishmentData.replenishment_amount,
              last_replenishment_date: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          : fund
      )
    );
    ModalManager.success("Reposición registrada correctamente");
  };

  const handleSaveCategory = (categoryData) => {
    if (categoryData.id) {
      // Editar categoría
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === categoryData.id
            ? { ...cat, ...categoryData, updated_at: new Date().toISOString() }
            : cat
        )
      );
      ModalManager.success("Categoría actualizada correctamente");
    } else {
      // Nueva categoría
      const newCategory = {
        id: categories.length + 1,
        ...categoryData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCategories((prev) => [...prev, newCategory]);
      ModalManager.success("Categoría creada correctamente");
    }
  };

  const handleToggleCategory = (category) => {
    ModalManager.confirm(
      `¿Estás seguro de ${
        category.is_active ? "desactivar" : "activar"
      } la categoría "${category.category_name}"?`,
      () => {
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === category.id
              ? {
                  ...cat,
                  is_active: !cat.is_active,
                  updated_at: new Date().toISOString(),
                }
              : cat
          )
        );
        ModalManager.success(
          `Categoría ${
            category.is_active ? "desactivada" : "activada"
          } correctamente`
        );
      }
    );
  };

  const handleToggleStatus = (fund) => {
    // Simplificado: ACTIVE -> SUSPENDED, resto -> ACTIVE
    const newStatus = fund.fund_status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const action = newStatus === "SUSPENDED" ? "suspender" : "activar";

    ModalManager.confirm(
      `¿Estás seguro de ${action} el fondo "${fund.fund_code}"?`,
      () => {
        setFunds((prev) =>
          prev.map((f) =>
            f.id === fund.id
              ? {
                  ...f,
                  fund_status: newStatus,
                  updated_at: new Date().toISOString(),
                }
              : f
          )
        );
        ModalManager.success(
          `Fondo ${
            newStatus === "SUSPENDED" ? "suspendido" : "activado"
          } correctamente`
        );
      }
    );
  };

  const handleCloseFund = (fund) => {
    ModalManager.confirm(
      `¿Estás seguro de cerrar el fondo "${fund.fund_code}"? Esta acción no se puede deshacer.`,
      () => {
        setFunds((prev) =>
          prev.map((f) =>
            f.id === fund.id
              ? {
                  ...f,
                  fund_status: "CLOSED",
                  updated_at: new Date().toISOString(),
                }
              : f
          )
        );
        ModalManager.success("Fondo cerrado correctamente");
      }
    );
  };

  const getFilteredFunds = () => {
    const term = filters.search.trim().toLowerCase();

    return funds.filter((fund) => {
      // Filtro por bodega
      if (
        filters.warehouse &&
        fund.warehouse_id !== parseInt(filters.warehouse, 10)
      ) {
        return false;
      }

      // Filtro por estado
      if (filters.status && fund.fund_status !== filters.status) {
        return false;
      }

      // Filtro por texto: código, responsable, bodega
      if (term) {
        const haystack = [
          fund.fund_code,
          fund.responsible_user_name,
          fund.warehouse_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(term)) {
          return false;
        }
      }

      return true;
    });
  };

  const getPaginatedFunds = () => {
    const filtered = getFilteredFunds();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getStatistics = () => {
    const filteredFunds = getFilteredFunds();
    return {
      totalFunds: filteredFunds.length,
      activeFunds: filteredFunds.filter((f) => f.fund_status === "ACTIVE")
        .length,
      suspendedFunds: filteredFunds.filter(
        (f) => f.fund_status === "SUSPENDED"
      ).length,
      totalSpent: filteredFunds.reduce((sum, f) => sum + f.total_expenses, 0),
      availableBalance: filteredFunds.reduce(
        (sum, f) => sum + f.current_balance,
        0
      ),
    };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const stats = getStatistics();
  const paginatedFunds = getPaginatedFunds();
  const totalPages = Math.ceil(getFilteredFunds().length / itemsPerPage);

  return (
    <div className="min-h-screen pt-2 -mt-10">
      <div className="max-w-[100%] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b-2 border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Icon name="cash" className="text-blue-600 text-3xl" />
              Gestión de Caja Chica
            </h1>
            <p className="text-gray-500 text-sm">
              Administra fondos, gastos y reposiciones de caja chica
            </p>
          </div>

          {/* Botones de acción (agrupados a la derecha) */}
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={() => openModal("categories")}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all hover:-translate-y-0.5 hover:shadow-lg whitespace-nowrap"
            >
              <Icon name="folder" className="text-lg" />
              Gestionar Categorías
            </button>

            <button
              onClick={() => openModal("fund")}
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-all hover:-translate-y-0.5 hover:shadow-lg whitespace-nowrap"
            >
              <Icon name="plus" className="text-lg" />
              Crear Nuevo Fondo
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Fondos</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.totalFunds}
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
                <p className="text-sm text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.activeFunds}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Icon name="checkCircle" className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Suspendidos</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.suspendedFunds}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Icon name="ban" className="text-yellow-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4 border border-red-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Gastado</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats.totalSpent)}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Icon name="warning" className="text-red-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Saldo Disponible</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(stats.availableBalance)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icon name="cash" className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <PettyCashFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          warehouses={warehouses}
        />

        {/* Tabla */}
        <PettyCashTable
          funds={paginatedFunds}
          onEdit={(fund) => openModal("fund", fund)}
          onViewExpenses={(fund) => openModal("expenses", fund)}
          onReplenish={(fund) => openModal("replenishments", fund)}
          onToggleStatus={handleToggleStatus}
          onClose={handleCloseFund}
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

      {/* Modales */}
      <PettyCashModal
        isOpen={modals.fund}
        onClose={() => closeModal("fund")}
        onSave={handleSaveFund}
        fund={selectedFund}
        warehouses={warehouses}
        users={users}
      />
      <ExpensesModal
        isOpen={modals.expenses}
        onClose={() => closeModal("expenses")}
        fund={selectedFund}
        expenses={expenses}
        categories={categories}
        onSaveExpense={handleSaveExpense}
      />
      <ReplenishmentsModal
        isOpen={modals.replenishments}
        onClose={() => closeModal("replenishments")}
        fund={selectedFund}
        replenishments={replenishments}
        onSaveReplenishment={handleSaveReplenishment}
        currentUser={{ name: "Jorge Soto" }}
      />
      <CategoriesModal
        isOpen={modals.categories}
        onClose={() => closeModal("categories")}
        categories={categories}
        onSaveCategory={handleSaveCategory}
        onToggleCategory={handleToggleCategory}
      />
    </div>
  );
};

export default PettyCashManagement;
