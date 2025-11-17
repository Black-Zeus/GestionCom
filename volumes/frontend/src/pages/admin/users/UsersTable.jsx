// ====================================
// volumes/frontend/src/pages/admin/users/UsersTable.jsx
// Componente de tabla de usuarios adaptado para API real
// ====================================

import React, { useState, useMemo } from 'react';
import UserCard from './UserCard';

const UsersTable = ({
    users = [],
    currentView = 'table',
    onEditUser,
    onChangePassword,
    onToggleStatus,
    loading = false,
    error = null
}) => {

    // Estados locales para ordenamiento y paginación
    const [sortField, setSortField] = useState('fullName');
    const [sortDirection, setSortDirection] = useState('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // ====================================
    // FUNCIONES DE ORDENAMIENTO
    // ====================================

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
        setCurrentPage(1);
    };

    const sortedUsers = useMemo(() => {
        if (!sortField || !users.length) return users;

        return [...users].sort((a, b) => {
            let aValue, bValue;

            switch (sortField) {
                case 'fullName':
                    aValue = a.fullName?.toLowerCase() || '';
                    bValue = b.fullName?.toLowerCase() || '';
                    break;
                case 'username':
                    aValue = a.username?.toLowerCase() || '';
                    bValue = b.username?.toLowerCase() || '';
                    break;
                case 'email':
                    aValue = a.email?.toLowerCase() || '';
                    bValue = b.email?.toLowerCase() || '';
                    break;
                case 'roles':
                    aValue = a.roles?.[0]?.toLowerCase() || '';
                    bValue = b.roles?.[0]?.toLowerCase() || '';
                    break;
                case 'status':
                    aValue = a.isActive ? 'activo' : 'inactivo';
                    bValue = b.isActive ? 'activo' : 'inactivo';
                    break;
                case 'lastLogin':
                    aValue = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
                    bValue = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
                    break;
                default:
                    aValue = a[sortField] || '';
                    bValue = b[sortField] || '';
            }

            if (sortDirection === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });
    }, [users, sortField, sortDirection]);

    // ====================================
    // PAGINACIÓN
    // ====================================

    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentUsers = sortedUsers.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (newItemsPerPage) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1);
    };

    // ====================================
    // HELPERS PARA RENDERIZADO
    // ====================================

    const formatLastLogin = (lastLogin) => {
        if (!lastLogin) return 'Nunca';

        const date = new Date(lastLogin);
        const now = new Date();
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Hace menos de 1 hora';
        if (diffInHours < 24) return `Hace ${diffInHours} horas`;
        if (diffInHours < 48) return 'Ayer';
        if (diffInHours < 168) return `Hace ${Math.floor(diffInHours / 24)} días`;

        return date.toLocaleDateString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getSortIcon = (field) => {
        if (sortField !== field) return '↕️';
        return sortDirection === 'asc' ? '↑' : '↓';
    };

    const getStatusDisplay = (user) => {
        if (!user.isActive) {
            return {
                icon: '🔴',
                text: 'Inactivo',
                className: 'text-red-600 dark:text-red-400'
            };
        }

        // Usar isRecentlyActive si está disponible
        if (user.isRecentlyActive) {
            return {
                icon: '🟢',
                text: 'En línea',
                className: 'text-green-600 dark:text-green-400'
            };
        }

        return {
            icon: '⚫',
            text: 'Activo',
            className: 'text-gray-600 dark:text-gray-400'
        };
    };

    // ====================================
    // ESTADOS DE CARGA Y ERROR
    // ====================================

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Cargando usuarios...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                    <span className="text-4xl">❌</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Error al cargar usuarios
                </h3>
                <p className="text-red-600 dark:text-red-400 mb-4">
                    {error.message || error}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    // ====================================
    // RENDERIZADO CONDICIONAL POR VISTA
    // ====================================

    if (currentView === 'cards') {
        return (
            <div className="space-y-4">
                {/* Controles de paginación superior para vista cards */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Mostrando {startIndex + 1}-{Math.min(endIndex, sortedUsers.length)} de {sortedUsers.length}
                        </span>
                        <div className="flex gap-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => handlePageChange(page)}
                                    className={`px-3 py-1 text-sm rounded ${currentPage === page
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Grid de tarjetas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
                    {currentUsers.map((user) => (
                        <UserCard
                            key={user.id}
                            user={user}
                            onEdit={() => onEditUser(user)}
                            onChangePassword={() => onChangePassword(user)}
                            onToggleStatus={() => onToggleStatus(user.id)}
                        />
                    ))}
                </div>

                {/* Sin usuarios */}
                {currentUsers.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <span className="text-4xl">👥</span>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            No se encontraron usuarios
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            Intenta ajustar los filtros o agregar nuevos usuarios
                        </p>
                    </div>
                )}
            </div>
        );
    }

    // ====================================
    // VISTA DE TABLA
    // ====================================

    return (
        <div className="space-y-4">
            {/* Controles superiores */}
            <div className="flex justify-between items-center ml-3 mt-2">
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        Mostrando {startIndex + 1}-{Math.min(endIndex, sortedUsers.length)} de {sortedUsers.length} usuarios
                    </span>

                    {/* Selector de elementos por página */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Ver:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabla responsive */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    {/* Header de la tabla */}
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            {/* Usuario */}
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => handleSort('fullName')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Usuario</span>
                                    <span className="text-xs">{getSortIcon('fullName')}</span>
                                </div>
                            </th>

                            {/* Contacto */}
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => handleSort('email')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Contacto</span>
                                    <span className="text-xs">{getSortIcon('email')}</span>
                                </div>
                            </th>

                            {/* Rol */}
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => handleSort('roles')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Roles</span>
                                    <span className="text-xs">{getSortIcon('roles')}</span>
                                </div>
                            </th>

                            {/* Estado */}
                            <th
                                className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => handleSort('status')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Estado</span>
                                    <span className="text-xs">{getSortIcon('status')}</span>
                                </div>
                            </th>

                            {/* Último acceso */}
                            <th
                                className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => handleSort('lastLogin')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Último acceso</span>
                                    <span className="text-xs">{getSortIcon('lastLogin')}</span>
                                </div>
                            </th>

                            {/* Acciones */}
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>

                    {/* Body de la tabla */}
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {currentUsers.map((user) => {
                            const statusDisplay = getStatusDisplay(user);

                            return (
                                <tr
                                    key={user.id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    {/* Usuario (Avatar + Nombre + Username) */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {/* Avatar o iniciales */}
                                            <div className="flex-shrink-0 h-10 w-10">
                                                {user.avatar ? (
                                                    <img
                                                        className="h-10 w-10 rounded-full object-cover"
                                                        src={user.avatar}
                                                        alt={user.fullName}
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                                                        <span className="text-sm font-medium text-white">
                                                            {user.initials || user.fullName?.charAt(0) || '?'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Nombre y username */}
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {user.fullName}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    @{user.username}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Contacto (Email + Teléfono) */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 dark:text-white">
                                            {user.email}
                                        </div>
                                        {user.phone && (
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {user.phone}
                                            </div>
                                        )}
                                    </td>

                                    {/* Roles */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-wrap gap-1">
                                            {user.roles && user.roles.length > 0 ? (
                                                user.roles.slice(0, 2).map((role, index) => (
                                                    <span
                                                        key={index}
                                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                                    >
                                                        {role}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-sm text-gray-500 dark:text-gray-400">Sin rol asignado</span>
                                            )}
                                            {user.roles && user.roles.length > 2 && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    +{user.roles.length - 2} más
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Estado (solo tablet+) */}
                                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <span className="mr-2">{statusDisplay.icon}</span>
                                            <span className={`text-sm ${statusDisplay.className}`}>
                                                {statusDisplay.text}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Último acceso (solo desktop) */}
                                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {formatLastLogin(user.lastLogin)}
                                    </td>

                                    {/* Acciones */}
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2">
                                            {/* Botón editar */}
                                            <button
                                                onClick={() => onEditUser(user)}
                                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                                title="Editar usuario"
                                            >
                                                ✏️
                                            </button>

                                            {/* Botón cambiar contraseña */}
                                            <button
                                                onClick={() => onChangePassword(user)}
                                                className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 p-1 rounded hover:bg-orange-50 dark:hover:bg-orange-900/30"
                                                title="Cambiar contraseña"
                                            >
                                                🔑
                                            </button>

                                            {/* Toggle estado */}
                                            <button
                                                onClick={() => onToggleStatus(user.id)}
                                                className={`p-1 rounded transition-colors ${user.isActive
                                                        ? 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30'
                                                        : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30'
                                                    }`}
                                                title={user.isActive ? 'Desactivar usuario' : 'Activar usuario'}
                                            >
                                                {user.isActive ? '🔴' : '🟢'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Sin usuarios */}
            {currentUsers.length === 0 && !loading && (
                <div className="text-center py-12">
                    <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <span className="text-4xl">👥</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No se encontraron usuarios
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        Intenta ajustar los filtros o agregar nuevos usuarios
                    </p>
                </div>
            )}

            {/* Paginación inferior */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 ml-3">
                                Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
                                <span className="font-medium">{Math.min(endIndex, sortedUsers.length)}</span> de{' '}
                                <span className="font-medium">{sortedUsers.length}</span> resultados
                            </p>
                        </div>

                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                <button
                                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                >
                                    ←
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === page
                                                ? 'z-10 bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400'
                                                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button
                                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                >
                                    →
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersTable;