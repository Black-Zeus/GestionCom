import React, { useState, useEffect } from "react";
import UsersTable from "./UsersTable";
import UsersFilters from "./UsersFilters";
import UserModal from "./UserModal";
import ChangePasswordModal from "./ChangePasswordModal";
import Pagination from "@components/common/pagination/Pagination"
import ModalManager from "@/components/ui/modal/ModalManager";
import usersData from "./data.json";

import { Icon } from "@components/ui/icon/iconManager";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ search: "", role: "", status: "" });
  const itemsPerPage = 10;

  useEffect(() => {
    setUsers(usersData.users);
    setFilteredUsers(usersData.users);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, users]);

  const applyFilters = () => {
    const filtered = users.filter((user) => {
      const matchSearch =
        !filters.search ||
        user.username.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.fullName.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.email.toLowerCase().includes(filters.search.toLowerCase());

      const matchRole =
        !filters.role || user.rolesCodes?.includes(filters.role);
      const matchStatus =
        filters.status === "" ||
        (filters.status === "active" && user.isActive) ||
        (filters.status === "inactive" && !user.isActive);

      return matchSearch && matchRole && matchStatus;
    });

    setFilteredUsers(filtered);
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({ search: "", role: "", status: "" });
  };

  const handleSaveUser = (userData) => {
    if (userData.id) {
      // Editar
      setUsers(
        users.map((u) => (u.id === userData.id ? { ...u, ...userData } : u))
      );
    } else {
      // Crear
      const newUser = {
        id: Math.max(...users.map((u) => u.id)) + 1,
        ...userData,
        lastLogin: null,
        status: "offline",
        initials: `${userData.firstName?.charAt(0) || ""}${
          userData.lastName?.charAt(0) || ""
        }`,
      };
      setUsers([...users, newUser]);
    }
  };

  const handleDeleteUser = (user) => {
    ModalManager.confirm({
      title: "Confirmar Eliminación",
      message: `¿Está seguro que desea eliminar al usuario "${user.fullName}"?`,
      onConfirm: () => {
        setUsers(users.filter((u) => u.id !== user.id));
      },
    });
  };

  const handleEditUser = (user) => {
    ModalManager.custom({
      title: user ? "Editar Usuario" : "Nuevo Usuario",
      size: "xlarge",
      content: (
        <UserModal
          user={user}
          onSave={handleSaveUser}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  const handleNewUser = () => {
    ModalManager.custom({
      title: "Nuevo Usuario",
      size: "xlarge",
      content: (
        <UserModal
          user={null}
          onSave={handleSaveUser}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  const handleChangePassword = (user) => {
    ModalManager.custom({
      title: `Cambiar Contraseña: ${user.username}`,
      size: "medium",
      content: (
        <ChangePasswordModal
          user={user}
          onSave={(passwordData) => {
            //console.log("Cambiar contraseña:", passwordData);
            ModalManager.closeAll();
          }}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  const handleToggleStatus = (userId) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const action = user.isActive ? "desactivar" : "activar";
    ModalManager.confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Usuario`,
      message: `¿Está seguro que desea ${action} al usuario "${user.fullName}"?`,
      onConfirm: () => {
        setUsers(
          users.map((u) =>
            u.id === userId ? { ...u, isActive: !u.isActive } : u
          )
        );
      },
    });
  };

  // Paginación
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Estadísticas
  const stats = {
    totalUsers: filteredUsers.length,
    activeUsers: filteredUsers.filter((u) => u.isActive).length,
    inactiveUsers: filteredUsers.filter((u) => !u.isActive).length,
    onlineUsers: filteredUsers.filter((u) => u.status === "online").length,
    adminUsers: filteredUsers.filter((u) => u.rolesCodes?.includes("ADMIN"))
      .length,
  };

  return (
    <div className="min-h-screen pt-2 -mt-10">
      <div className="max-w-[100%] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b-2 border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Icon name="users" className="text-blue-600 text-3xl" />
              Gestión de Usuarios
            </h1>
            <p className="text-gray-500 text-sm">
              Administra usuarios, roles y permisos del sistema
            </p>
          </div>
          <button
            onClick={handleNewUser}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all hover:-translate-y-0.5 hover:shadow-lg flex items-center gap-2"
          >
            <Icon name="plus" className="text-lg" />
            Nuevo Usuario
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalUsers}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon name="users" className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.activeUsers}
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
                <p className="text-sm text-gray-600">Inactivos</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.inactiveUsers}
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
                <p className="text-sm text-gray-600">Online</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.onlineUsers}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icon name="wifi" className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.adminUsers}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Icon name="security" className="text-orange-600 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <UsersFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
        />

        {/* Tabla */}
        <UsersTable
          users={paginatedUsers}
          onEdit={handleEditUser}
          onChangePassword={handleChangePassword}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDeleteUser}
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

export default UserManagement;
