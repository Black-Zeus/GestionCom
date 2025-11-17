// ====================================
// volumes/frontend/src/pages/admin/Users.jsx
// Página principal de gestión de usuarios - Versión completa corregida
// ====================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import ModalManager from "@/components/ui/modal";
import {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  changeUserPassword,
} from "@/services/usersAdminService";
import { shouldLog } from "@/utils/environment";

// Importar toast helpers corregidos
import {
  showSuccessToast,
  showErrorToast,
} from "@/components/common/toast/toastHelpers";

// Componentes específicos de usuarios
import UsersHeader from "./users/UsersHeader";
import UsersFilters from "./users/UsersFilters";
import UsersTable from "./users/UsersTable";
import UserModal from "./users/UserModal";
import ChangePasswordModal from "./users/ChangePasswordModal";
import ToggleStatusModal from "./users/ToggleStatusModal";

const Users = () => {
  // ====================================
  // ESTADOS PRINCIPALES
  // ====================================
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de filtros
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    role: "all",
    sortBy: "recent",
    viewMode: "grid",
  });

  // Estados de modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordModalUser, setPasswordModalUser] = useState(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [toggleStatusUser, setToggleStatusUser] = useState(null);
  const [isToggleStatusModalOpen, setIsToggleStatusModalOpen] = useState(false);

  // Estados de vista
  const [currentView, setCurrentView] = useState("grid");

  // ====================================
  // FUNCIONES DE CARGA DE DATOS
  // ====================================
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getUsers();

      // El servicio devuelve directamente { users, stats, pagination, ... }
      if (response?.users) {
        setUsers(response.users || []);
        setStats(response.stats || null);

        if (shouldLog()) {
          console.log("✅ Users loaded successfully:", {
            count: response.users?.length || 0,
            stats: response.stats,
          });
        }
      } else {
        throw new Error("Invalid response format from getUsers");
      }
    } catch (err) {
      const errorMessage = err?.message || "Error al cargar usuarios";
      setError(errorMessage);
      showErrorToast(errorMessage);

      if (shouldLog()) {
        console.error("❌ Error loading users:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ====================================
  // EFECTOS
  // ====================================
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // ====================================
  // MANEJADORES DE EVENTOS
  // ====================================

  // Manejadores de filtros
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // Manejadores de vista
  const handleViewChange = useCallback((view) => {
    setCurrentView(view);
    setFilters((prev) => ({ ...prev, viewMode: view }));
  }, []);

  // Manejadores de modal de usuario
  const handleAddUser = useCallback(() => {
    setEditingUser(null);
    setIsModalOpen(true);
  }, []);

  const handleEditUser = useCallback((user) => {
    setEditingUser(user);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingUser(null);
  }, []);

  // Manejadores de modal de contraseña - CORREGIDOS
  const handleChangePassword = useCallback((user) => {
    setPasswordModalUser(user);
    setIsPasswordModalOpen(true);
  }, []);

  const handleClosePasswordModal = useCallback(() => {
    setIsPasswordModalOpen(false);
    setPasswordModalUser(null);
  }, []);

  // Manejadores de modal de toggle status - NUEVO
  const handleToggleStatusRequest = useCallback(
    (userId) => {
      const user = users.find((u) => u.id === userId);
      if (user) {
        setToggleStatusUser(user);
        setIsToggleStatusModalOpen(true);
      }
    },
    [users]
  );

  const handleCloseToggleStatusModal = useCallback(() => {
    setIsToggleStatusModalOpen(false);
    setToggleStatusUser(null);
  }, []);

  // ====================================
  // OPERACIONES CRUD
  // ====================================

  const handleSaveUser = useCallback(
    async (userData) => {
      try {
        let response;

        if (editingUser) {
          // Actualizar usuario existente
          response = await updateUser(editingUser.id, userData);
          if (response?.user) {
            showSuccessToast("Usuario actualizado correctamente");
            await loadUsers();
            handleCloseModal();
          } else {
            throw new Error(response?.message || "Error al actualizar usuario");
          }
        } else {
          // Crear nuevo usuario
          response = await createUser(userData);
          if (response?.user) {
            showSuccessToast("Usuario creado correctamente");
            await loadUsers();
            handleCloseModal();
          } else {
            throw new Error(response?.message || "Error al crear usuario");
          }
        }
      } catch (err) {
        const errorMessage = err?.message || "Error al guardar usuario";
        showErrorToast(errorMessage);

        if (shouldLog()) {
          console.error("❌ Error saving user:", err);
        }
      }
    },
    [editingUser, loadUsers, handleCloseModal]
  );

  const handleToggleStatus = useCallback(
    async (userId, currentStatus, reason) => {
      try {
        const newStatus = currentStatus === "active" ? "inactive" : "active";
        const response = await toggleUserStatus(
          userId,
          newStatus === "active",
          reason
        );

        if (response?.user) {
          const action = newStatus === "active" ? "activado" : "desactivado";
          showSuccessToast(`Usuario ${action} correctamente`);
          handleCloseToggleStatusModal(); // Cerrar el modal de confirmación
          await loadUsers();

          // NUEVO: Si el modal de cambio de contraseña está abierto para este usuario, cerrarlo
          if (passwordModalUser && passwordModalUser.id === userId) {
            handleClosePasswordModal();
          }
        } else {
          throw new Error(
            response?.message || "Error al cambiar estado del usuario"
          );
        }
      } catch (err) {
        const errorMessage =
          err?.message || "Error al cambiar estado del usuario";
        showErrorToast(errorMessage);

        if (shouldLog()) {
          console.error("❌ Error toggling user status:", err);
        }
      }
    },
    [
      loadUsers,
      handleCloseToggleStatusModal,
      passwordModalUser,
      handleClosePasswordModal,
    ]
  );

  const handleSavePassword = useCallback(
    async (passwordData) => {
      try {
        if (!passwordModalUser) return;

        const response = await changeUserPassword(
          passwordModalUser.id,
          passwordData
        );

        if (response?.message || response?.user) {
          showSuccessToast("Contraseña cambiada correctamente");
          handleClosePasswordModal();
          // Opcional: recargar usuarios si es necesario
          // await loadUsers();
        } else {
          throw new Error(response?.message || "Error al cambiar contraseña");
        }
      } catch (err) {
        const errorMessage = err?.message || "Error al cambiar contraseña";
        showErrorToast(errorMessage);

        if (shouldLog()) {
          console.error("❌ Error changing password:", err);
        }
      }
    },
    [passwordModalUser, handleClosePasswordModal]
  );

  // ====================================
  // FILTROS Y DATOS PROCESADOS
  // ====================================
  const filteredUsers_old = useMemo(() => {
    if (!users || users.length === 0) return [];

    let filtered = [...users];

    // Filtro por búsqueda
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.fullName?.toLowerCase().includes(searchTerm) ||
          user.username?.toLowerCase().includes(searchTerm) ||
          user.email?.toLowerCase().includes(searchTerm)
      );
    }

    // Filtro por estado
    if (filters.status !== "all") {
      filtered = filtered.filter((user) => {
        const userStatus = user.isActive ? "active" : "inactive";
        return userStatus === filters.status;
      });
    }

    // Filtro por rol
    if (filters.role !== "all") {
      filtered = filtered.filter((user) =>
        user.roles?.some((role) =>
          role.toLowerCase().includes(filters.role.toLowerCase())
        )
      );
    }

    // Ordenamiento
    switch (filters.sortBy) {
      case "name":
        filtered.sort((a, b) =>
          (a.fullName || "").localeCompare(b.fullName || "")
        );
        break;
      case "email":
        filtered.sort((a, b) => (a.email || "").localeCompare(b.email || ""));
        break;
      case "status":
        filtered.sort((a, b) => {
          const statusA = a.isActive ? "active" : "inactive";
          const statusB = b.isActive ? "active" : "inactive";
          return statusA.localeCompare(statusB);
        });
        break;
      case "recent":
      default:
        filtered.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });
        break;
    }

    return filtered;
  }, [users, filters]);

  const filteredUsers = useMemo(() => {
    if (!users || users.length === 0) return [];

    let filtered = [...users];

    // Filtro por búsqueda
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.fullName?.toLowerCase().includes(searchTerm) ||
          user.username?.toLowerCase().includes(searchTerm) ||
          user.email?.toLowerCase().includes(searchTerm)
      );
    }

    // Filtro por estado - CORREGIDO
    if (filters.status && filters.status !== "all") {
      filtered = filtered.filter((user) => {
        const userStatus = user.isActive ? "active" : "inactive";
        return userStatus === filters.status;
      });
    }

    // Filtro por rol - CORREGIDO
    if (filters.role && filters.role !== "all") {
      filtered = filtered.filter((user) => {
        // Si el usuario no tiene roles asignados, no pasa el filtro
        if (!user.roles || user.roles.length === 0) {
          return false;
        }

        // Buscar en roles (nombres legibles) y rolesCodes (códigos)
        const hasRole = user.roles?.some((role) =>
          role.toLowerCase().includes(filters.role.toLowerCase())
        );

        const hasRoleCode = user.rolesCodes?.some((roleCode) =>
          roleCode.toLowerCase().includes(filters.role.toLowerCase())
        );

        return hasRole || hasRoleCode;
      });
    }

    // Ordenamiento
    switch (filters.sortBy) {
      case "name":
        filtered.sort((a, b) =>
          (a.fullName || "").localeCompare(b.fullName || "")
        );
        break;
      case "email":
        filtered.sort((a, b) => (a.email || "").localeCompare(b.email || ""));
        break;
      case "status":
        filtered.sort((a, b) => {
          const statusA = a.isActive ? "active" : "inactive";
          const statusB = b.isActive ? "active" : "inactive";
          return statusA.localeCompare(statusB);
        });
        break;
      case "recent":
      default:
        filtered.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });
        break;
    }

    return filtered;
  }, [users, filters]);

  // Calcular estadísticas dinámicas basadas en filtros
  const dynamicStats = useMemo(() => {
    if (!filteredUsers.length) return stats;

    const activeUsers = filteredUsers.filter((user) => user.isActive).length;
    const inactiveUsers = filteredUsers.filter((user) => !user.isActive).length;

    // Distribución por roles
    const roleDistribution = filteredUsers.reduce(
      (acc, user) => {
        const userRoles = user.roles || [];
        if (userRoles.some((role) => role.toLowerCase().includes("admin"))) {
          acc.admin++;
        } else if (
          userRoles.some((role) => role.toLowerCase().includes("manager"))
        ) {
          acc.manager++;
        } else {
          acc.regular++;
        }
        return acc;
      },
      { admin: 0, manager: 0, regular: 0 }
    );

    return {
      ...stats,
      totalUsers: filteredUsers.length,
      activeUsers,
      inactiveUsers,
      newUsersThisMonth: stats?.newUsersThisMonth || 0,
      lastLoginToday: stats?.lastLoginToday || 0,
      adminUsers: roleDistribution.admin,
      managerUsers: roleDistribution.manager,
      regularUsers: roleDistribution.regular,
    };
  }, [stats, filteredUsers]);

  // ====================================
  // RENDERIZADO
  // ====================================
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header con métricas y controles */}
        <UsersHeader
          stats={
            dynamicStats || {
              totalUsers: 0,
              activeUsers: 0,
              inactiveUsers: 0,
              newUsersThisMonth: 0,
              lastLoginToday: 0,
              adminUsers: 0,
              managerUsers: 0,
              regularUsers: 0,
            }
          }
          onAddUser={handleAddUser}
          currentView={currentView}
          onViewChange={handleViewChange}
          totalUsers={filteredUsers.length}
        />

        {/* Filtros */}
        <UsersFilters filters={filters} onFiltersChange={handleFiltersChange} />

        {/* Tabla/Cards de usuarios */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <UsersTable
              users={filteredUsers}
              currentView={currentView}
              onEditUser={handleEditUser}
              onChangePassword={handleChangePassword}
              onToggleStatus={handleToggleStatusRequest}
              loading={loading}
              error={error}
            />
          </div>
        </div>

        {/* Modal de usuario */}
        <UserModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveUser}
          user={editingUser}
          isEditing={!!editingUser}
        />

        {/* Modal de cambio de contraseña - CORREGIDO */}
        <ChangePasswordModal
          isOpen={isPasswordModalOpen}
          onClose={handleClosePasswordModal}
          onSave={handleSavePassword}
          user={passwordModalUser}
        />

        {/* Modal de confirmación toggle status - NUEVO */}
        <ToggleStatusModal
          isOpen={isToggleStatusModalOpen}
          onClose={handleCloseToggleStatusModal}
          onConfirm={handleToggleStatus}
          user={toggleStatusUser}
        />

        {/* Botón flotante para agregar usuario (móvil) */}
        <button
          onClick={handleAddUser}
          className="fixed bottom-6 right-6 lg:hidden w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
          title="Agregar usuario"
        >
          <span className="text-2xl">➕</span>
        </button>
      </div>
    </div>
  );
};

export default Users;
