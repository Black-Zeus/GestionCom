// ====================================
// volumes/frontend/src/pages/admin/Users.jsx
// Página principal de gestión de usuarios - Integración completa con API real
// ====================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ModalManager from '@/components/ui/modal';
import {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  changeUserPassword
} from '@/services/usersAdminService';
import { shouldLog } from '@/utils/environment';

// Toast helpers inline corregidos
const ToastMessage = ({ t, type = "info", message, title }) => {
  const styles = {
    error: { bg: "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-200", icon: "❌" },
    success: { bg: "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-200", icon: "✅" },
    info: { bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-200", icon: "ℹ️" },
    warning: { bg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-200", icon: "⚠️" }
  };
  const style = styles[type] || styles.info;
  return (
    <div className={`${t.visible ? "animate-toast-enter" : "animate-toast-leave"} max-w-md w-full ${style.bg} border shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
      <div className="flex-1 w-0 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5 text-lg">{style.icon}</div>
          <div className="ml-3 flex-1">
            {title && <p className="text-sm font-semibold">{title}</p>}
            <p className="text-sm break-words">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const showToast = (type, message, title = null, opts = {}) => {
  return toast.custom((t) => <ToastMessage t={t} type={type} message={message} title={title} />, { duration: 4000, ...opts });
};

const showSuccessToast = (message, title = "Éxito", opts) => showToast("success", message, title, opts);
const showErrorToast = (message, title = "Error", opts) => showToast("error", message, title, opts);

// Componentes específicos de usuarios
import UsersHeader from './users/UsersHeader';
import UsersFilters from './users/UsersFilters';
import UsersTable from './users/UsersTable';
import UserModal from './users/UserModal';
import ChangePasswordModal from './users/ChangePasswordModal';

const Users = () => {
  // ====================================
  // ESTADOS PRINCIPALES
  // ====================================
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de UI
  const [currentView, setCurrentView] = useState('table');
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    warehouse: ''
  });

  // Estados de modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // ====================================
  // CARGAR DATOS
  // ====================================
  const fetchUsers = useCallback(async (filterOptions = {}) => {
    try {
      setLoading(true);
      setError(null);

      if (shouldLog()) {
        console.log('🔄 Fetching users with filters:', filterOptions);
      }

      // Construir opciones para la API
      const apiOptions = {
        skip: 0,
        limit: 100,
        active_only: filterOptions.status !== 'inactive',
        ...(filterOptions.search && { search: filterOptions.search }),
        ...(filterOptions.role && { role_filter: filterOptions.role }),
        include_inactive: filterOptions.status === 'inactive' || filterOptions.status === ''
      };

      const response = await getUsers(apiOptions);

      setUsers(response.users);
      setStats(response.stats);

      if (shouldLog()) {
        console.log(`✅ Users loaded: ${response.users.length} users`);
      }

    } catch (err) {
      const errorMessage = err.message || 'Error al cargar usuarios';
      setError(errorMessage);

      if (shouldLog()) {
        console.error('❌ Error fetching users:', err);
      }

      ModalManager.error({
        title: 'Error al cargar usuarios',
        message: errorMessage,
        autoClose: 5000
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar usuarios al montar componente
  useEffect(() => {
    fetchUsers(filters);
  }, [fetchUsers]);

  // ====================================
  // HANDLERS DE FILTROS
  // ====================================


  // ====================================
  // HANDLERS DE USUARIOS
  // ====================================
  const handleAddUser = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleChangePassword = (user) => {
    // 👇 Capturar el ID del modal
    const modalId = ModalManager.custom({
      title: `Cambiar Contraseña - ${user.fullName}`,
      size: 'medium',
      content: (
        <ChangePasswordModal
          user={user}
          onSave={async (passwordData) => {
            try {
              if (shouldLog()) {
                console.log(`🔒 Changing password for user ${user.id}`);
              }

              await changeUserPassword(user.id, passwordData);

              // ✅ Cerrar modal con su ID específico
              console.log('Cerrando Modal');
              ModalManager.close(modalId);

              showSuccessToast(`Contraseña de ${user.fullName} actualizada correctamente`);

              if (shouldLog()) {
                console.log('✅ Password changed successfully');
              }

            } catch (err) {
              if (shouldLog()) {
                console.error('❌ Error changing password:', err);
              }
            }
          }}
          onCancel={() => ModalManager.close(modalId)} // ✅ También aquí
        />
      )
    });
  };

  const handleSaveUser = async (userData) => {
    try {
      if (shouldLog()) {
        console.log('💾 Saving user:', userData.username);
      }

      let response;
      let successMessage;

      if (editingUser) {
        response = await updateUser(editingUser.id, userData);
        successMessage = `Usuario ${userData.username} actualizado correctamente`;
      } else {
        response = await createUser(userData);
        successMessage = `Usuario ${userData.username} creado correctamente`;
      }

      // Actualizar lista de usuarios
      await fetchUsers(filters);

      // Cerrar modal inmediatamente
      handleCloseModal();

      // Usar tu sistema de toast corregido
      showSuccessToast(successMessage);

      if (shouldLog()) {
        console.log('✅ User saved successfully');
      }

    } catch (err) {
      // En caso de error, el modal permanece abierto
      if (shouldLog()) {
        console.error('❌ Error saving user:', err);
      }

      // Usar tu sistema de toast corregido
      const errorMessage = err.message || 'Error al guardar usuario';
      showErrorToast(errorMessage);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const newStatus = !user.isActive;
      const action = newStatus ? 'activar' : 'desactivar';
      const actionCapitalized = newStatus ? 'Activar' : 'Desactivar';

      if (shouldLog()) {
        console.log(`🔄 Toggling user ${userId} status to ${newStatus}`);
      }

      const confirmed = await ModalManager.confirm({
        title: `${actionCapitalized} Usuario`,
        message: `¿Está seguro que desea ${action} al usuario "${user.fullName}"?`,
        buttons: {
          confirm: actionCapitalized,
          cancel: 'Cancelar'
        },
        variant: newStatus ? 'info' : 'warning',
        onConfirm: async () => {
          try {
            await toggleUserStatus(userId, newStatus);

            ModalManager.success({
              title: 'Estado actualizado',
              message: `Usuario ${user.fullName} ${newStatus ? 'activado' : 'desactivado'} correctamente`,
              autoClose: 3000
            });

            // Actualizar lista
            await fetchUsers(filters);

          } catch (err) {
            const errorMessage = err.message || 'Error al cambiar estado del usuario';

            if (shouldLog()) {
              console.error('❌ Error toggling user status:', err);
            }

            ModalManager.error({
              title: 'Error al cambiar estado',
              message: errorMessage,
              autoClose: 5000
            });
          }
        },
        onCancel: () => {
          console.log('Acción cancelada por el usuario');
        }
      });

    } catch (err) {
      const errorMessage = err.message || 'Error al cambiar estado del usuario';

      if (shouldLog()) {
        console.error('❌ Error in handleToggleStatus:', err);
      }

      ModalManager.error({
        title: 'Error al cambiar estado',
        message: errorMessage,
        autoClose: 5000
      });
    }
  };

  // ====================================
  // HANDLERS DE MODAL
  // ====================================
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  // ====================================
  // HANDLERS DE VISTA
  // ====================================
  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
    fetchUsers(newFilters);
  }, [fetchUsers]);

  // ====================================
  // FILTRADO LOCAL (para search instantáneo)
  // ====================================
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Filtro de búsqueda local instantáneo
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const matchesSearch =
          user.fullName?.toLowerCase().includes(searchTerm) ||
          user.username?.toLowerCase().includes(searchTerm) ||
          user.email?.toLowerCase().includes(searchTerm);

        if (!matchesSearch) return false;
      }

      // Otros filtros se manejan en el backend
      return true;
    });
  }, [users, filters]);

  // ====================================
  // ESTADÍSTICAS DINÁMICAS
  // ====================================
  const dynamicStats = useMemo(() => {
    if (!stats) return null;

    // Si tenemos stats de la API, usarlas y complementar con cálculos locales
    const total = filteredUsers.length;
    const active = filteredUsers.filter(user => user.isActive).length;
    const inactive = total - active;

    // Calcular usuarios conectados hoy usando isRecentlyActive
    const connectedToday = filteredUsers.filter(user => user.isRecentlyActive).length;

    // Calcular nuevos este mes
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const newThisMonth = filteredUsers.filter(user => {
      if (!user.createdAt) return false;
      const created = new Date(user.createdAt);
      return created >= monthStart;
    }).length;

    // Distribución por roles usando rolesCodes
    const roleDistribution = filteredUsers.reduce((acc, user) => {
      if (user.rolesCodes?.includes('ADMIN')) acc.admin++;
      else if (['WAREHOUSE_MANAGER', 'SUPERVISOR'].some(role => user.rolesCodes?.includes(role))) acc.manager++;
      else acc.regular++;
      return acc;
    }, { admin: 0, manager: 0, regular: 0 });

    return {
      totalUsers: total,
      activeUsers: active,
      inactiveUsers: inactive,
      newUsersThisMonth: newThisMonth,
      lastLoginToday: connectedToday,
      adminUsers: roleDistribution.admin,
      managerUsers: roleDistribution.manager,
      regularUsers: roleDistribution.regular
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
          stats={dynamicStats || {
            totalUsers: 0,
            activeUsers: 0,
            inactiveUsers: 0,
            newUsersThisMonth: 0,
            lastLoginToday: 0,
            adminUsers: 0,
            managerUsers: 0,
            regularUsers: 0
          }}
          onAddUser={handleAddUser}
          currentView={currentView}
          onViewChange={handleViewChange}
          totalUsers={filteredUsers.length}
        />

        {/* Filtros */}
        <UsersFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />

        {/* Tabla/Cards de usuarios */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <UsersTable
              users={filteredUsers}
              currentView={currentView}
              onEditUser={handleEditUser}
              onChangePassword={handleChangePassword}
              onToggleStatus={handleToggleStatus}
              loading={loading}
              error={error}
            />
          </div>
        </div>

        {/* Modal de usuario */}
        {isModalOpen && (
          <UserModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSave={handleSaveUser}
            user={editingUser}
            isEditing={!!editingUser}
          />
        )}

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