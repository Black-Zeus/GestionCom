import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@/components/ui/modal/ModalManager";
import Pagination from "./Pagination";
import RoleModal from "./RoleModal";
import RolePermissionsModal from "./RolePermissionsModal";

const RolesTab = ({ data }) => {
    const [roles, setRoles] = useState([]);
    const [filteredRoles, setFilteredRoles] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({ search: "", status: "" });
    const itemsPerPage = 10;

    useEffect(() => {
        setRoles(data.roles);
        setFilteredRoles(data.roles);
    }, [data]);

    useEffect(() => {
        applyFilters();
    }, [filters, roles]);

    const applyFilters = () => {
        const filtered = roles.filter((role) => {
            const matchSearch =
                !filters.search ||
                role.role_code.toLowerCase().includes(filters.search.toLowerCase()) ||
                role.role_name.toLowerCase().includes(filters.search.toLowerCase());

            const matchStatus =
                filters.status === "" || role.is_active === parseInt(filters.status, 10);

            return matchSearch && matchStatus;
        });

        setFilteredRoles(filtered);
        setCurrentPage(1);
    };

    const handleNewRole = () => {
        ModalManager.custom({
            title: "Nuevo Rol",
            size: "medium",
            content: (
                <RoleModal
                    role={null}
                    onSave={(roleData) => {
                        const newRole = {
                            id: Math.max(...roles.map((r) => r.id)) + 1,
                            ...roleData,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        };
                        setRoles([...roles, newRole]);
                        ModalManager.closeAll();
                        ModalManager.alert({
                            title: "Rol Creado",
                            message: `El rol "${roleData.role_name}" ha sido creado exitosamente.`,
                        });
                    }}
                    onClose={() => ModalManager.closeAll()}
                />
            ),
        });
    };

    const handleEditRole = (role) => {
        ModalManager.custom({
            title: "Editar Rol",
            size: "medium",
            content: (
                <RoleModal
                    role={role}
                    onSave={(roleData) => {
                        setRoles(
                            roles.map((r) =>
                                r.id === role.id
                                    ? { ...r, ...roleData, updated_at: new Date().toISOString() }
                                    : r
                            )
                        );
                        ModalManager.closeAll();
                        ModalManager.alert({
                            title: "Rol Actualizado",
                            message: `El rol "${roleData.role_name}" ha sido actualizado exitosamente.`,
                        });
                    }}
                    onClose={() => ModalManager.closeAll()}
                />
            ),
        });
    };

    const handleManagePermissions = (role) => {
        ModalManager.custom({
            title: "Permisos del Rol",
            size: "xlarge",
            content: (
                <RolePermissionsModal
                    role={role}
                    permissions={data.permissions}
                    rolePermissions={data.rolePermissions}
                    onSave={(permissionIds) => {
                        // Actualizar permisos del rol
                        console.log("Permisos actualizados:", permissionIds);
                        ModalManager.closeAll();
                        ModalManager.alert({
                            title: "Permisos Actualizados",
                            message: `Los permisos del rol "${role.role_name}" han sido actualizados exitosamente.`,
                        });
                    }}
                    onClose={() => ModalManager.closeAll()}
                />
            ),
        });
    };

    const handleDeleteRole = (role) => {
        if (role.is_system_role) {
            ModalManager.alert({
                title: "Operación no permitida",
                message: "No se pueden eliminar roles del sistema.",
            });
            return;
        }

        ModalManager.confirm({
            title: "Confirmar Eliminación",
            message: `¿Está seguro que desea eliminar el rol "${role.role_name}"?`,
            onConfirm: () => {
                setRoles(roles.filter((r) => r.id !== role.id));
                ModalManager.alert({
                    title: "Rol Eliminado",
                    message: `El rol "${role.role_name}" ha sido eliminado exitosamente.`,
                });
            },
        });
    };

    const clearFilters = () => {
        setFilters({ search: "", status: "" });
    };

    // Paginación
    const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedRoles = filteredRoles.slice(
        startIndex,
        startIndex + itemsPerPage
    );

    return (
        <div>
            {/* Botón Nuevo Rol */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Roles del Sistema</h2>
                <button
                    onClick={handleNewRole}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all hover:-translate-y-0.5 hover:shadow-lg flex items-center gap-2"
                >
                    <Icon name="plus" className="text-lg" />
                    Nuevo Rol
                </button>
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
                        placeholder="Buscar por código o nombre..."
                        className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                </div>

                <div className="flex gap-3">
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
            {paginatedRoles.length === 0 ? (
                <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 mb-6">
                    <div className="text-center py-16 text-gray-400">
                        <Icon name="inbox" className="text-5xl mb-4" />
                        <p>No se encontraron roles</p>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 mb-6">
                    <table className="w-full">
                        <thead className="bg-gray-100 border-b-2 border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Código
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Nombre
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Descripción
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Tipo
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
                            {paginatedRoles.map((role) => (
                                <tr
                                    key={role.id}
                                    className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-150"
                                >
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        <strong>{role.role_code}</strong>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {role.role_name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {role.role_description}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className="px-3 py-1 text-xs font-bold">
                                            {role.is_system_role ? ("Sistema") : ("Personalizado")}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`w-2 h-2 rounded-full ${role.is_active ? "bg-green-500" : "bg-red-500"
                                                    }`}
                                            />
                                            <span className="text-sm text-gray-700">
                                                {role.is_active ? "Activo" : "Inactivo"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditRole(role)}
                                                title="Editar"
                                                className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                            >
                                                <Icon name="edit" />
                                            </button>
                                            <button
                                                onClick={() => handleManagePermissions(role)}
                                                title="Gestionar Permisos"
                                                className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all"
                                            >
                                                <Icon name="key" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRole(role)}
                                                title="Eliminar"
                                                disabled={role.is_system_role}
                                                className={`p-2 rounded-lg transition-all ${role.is_system_role
                                                        ? "text-gray-300 cursor-not-allowed"
                                                        : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                    }`}
                                            >
                                                <Icon name="delete" />
                                            </button>
                                        </div>
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

export default RolesTab;