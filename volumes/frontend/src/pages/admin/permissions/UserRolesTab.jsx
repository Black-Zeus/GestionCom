import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@/components/ui/modal/ModalManager";
import Pagination from "@components/common/pagination/Pagination"
import UserRolesModal from "./UserRolesModal";

const UserRolesTab = ({ data }) => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({ search: "", role: "", status: "" });
    const itemsPerPage = 10;

    useEffect(() => {
        setUsers(data.users);
        setFilteredUsers(data.users);
    }, [data]);

    useEffect(() => {
        applyFilters();
    }, [filters, users]);

    const applyFilters = () => {
        const filtered = users.filter((user) => {
            const matchSearch =
                !filters.search ||
                user.first_name.toLowerCase().includes(filters.search.toLowerCase()) ||
                user.last_name.toLowerCase().includes(filters.search.toLowerCase()) ||
                user.rut.toLowerCase().includes(filters.search.toLowerCase()) ||
                user.email.toLowerCase().includes(filters.search.toLowerCase());

            const matchRole =
                !filters.role ||
                user.assigned_roles.some((r) => r.role_id === parseInt(filters.role));

            const matchStatus =
                filters.status === "" || user.is_active === parseInt(filters.status, 10);

            return matchSearch && matchRole && matchStatus;
        });

        setFilteredUsers(filtered);
        setCurrentPage(1);
    };

    const handleAssignRoles = (user) => {
        ModalManager.custom({
            title: "Asignar Roles a Usuario",
            size: "large",
            content: (
                <UserRolesModal
                    user={user}
                    roles={data.roles}
                    onSave={(selectedRoleIds) => {
                        const updatedRoles = selectedRoleIds.map((roleId) => {
                            const role = data.roles.find((r) => r.id === roleId);
                            return {
                                role_id: roleId,
                                role_name: role.role_name,
                                assigned_at: new Date().toISOString(),
                            };
                        });

                        setUsers(
                            users.map((u) =>
                                u.id === user.id ? { ...u, assigned_roles: updatedRoles } : u
                            )
                        );
                        ModalManager.closeAll();
                    }}
                    onClose={() => ModalManager.closeAll()}
                />
            ),
        });
    };

    const clearFilters = () => {
        setFilters({ search: "", role: "", status: "" });
    };

    // Paginación
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedUsers = filteredUsers.slice(
        startIndex,
        startIndex + itemsPerPage
    );

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                    Usuarios y sus Roles Asignados
                </h2>
            </div>

            {/* Filtros */}
            <div className="flex gap-4 mb-6 flex-wrap">
                <div className="flex-1 min-w-[250px] relative">
                    <Icon
                        name="search"
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        placeholder="Buscar usuario..."
                        className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                </div>

                <div className="flex gap-3">
                    <select
                        value={filters.role}
                        onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                        className="px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-white cursor-pointer focus:outline-none focus:border-blue-600 transition-all"
                    >
                        <option value="">Todos los roles</option>
                        {data.roles.map((role) => (
                            <option key={role.id} value={role.id}>
                                {role.role_name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-white cursor-pointer focus:outline-none focus:border-blue-600 transition-all"
                    >
                        <option value="">Todos los estados</option>
                        <option value="1">Activos</option>
                        <option value="0">Inactivos</option>
                    </select>

                    <button
                        onClick={clearFilters}
                        className="px-6 py-3 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-all hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <Icon name="close" className="text-sm" />
                        Limpiar
                    </button>
                </div>
            </div>

            {/* Tabla */}
            {paginatedUsers.length === 0 ? (
                <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 mb-6">
                    <div className="text-center py-16 text-gray-400">
                        <Icon name="inbox" className="text-5xl mb-4" />
                        <p>No se encontraron usuarios</p>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 mb-6">
                    <table className="w-full">
                        <thead className="bg-gray-100 border-b-2 border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Usuario
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    RUT
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Rol(es) Asignado(s)
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedUsers.map((user) => (
                                <tr
                                    key={user.id}
                                    className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-150"
                                >
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        <strong>
                                            {user.first_name} {user.last_name}
                                        </strong>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {user.rut}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {user.email}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            {user.assigned_roles && user.assigned_roles.length > 0 ? (
                                                <ul className="gap-2">
                                                    {user.assigned_roles.map((role) => (
                                                        <li key={role.role_id}>
                                                            <span className="px-3 py-1 text-xs font-bold">
                                                                {role.role_name}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <span className="text-gray-400 text-sm italic">
                                                    Sin roles asignados
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`w-2 h-2 rounded-full ${user.is_active ? "bg-green-500" : "bg-red-500"
                                                    }`}
                                            />
                                            <span className="text-sm text-gray-700">
                                                {user.is_active ? "Activo" : "Inactivo"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleAssignRoles(user)}
                                            title="Asignar Roles"
                                            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                        >
                                            <Icon name="edit" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Paginación */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
};

export default UserRolesTab;