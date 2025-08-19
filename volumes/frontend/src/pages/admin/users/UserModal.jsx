// ====================================
// volumes/frontend/src/pages/admin/users/UserModal.jsx
// Modal de usuario adaptado para API real (sin department/position)
// ====================================

import React, { useState, useEffect } from "react";
import ModalManager from "@/components/ui/modal/ModalManager";
import { validateUserData } from "@/services/usersAdminService";
import { mockUserFormData } from "./mockData";

// =======================
// Subcomponente del Form
// =======================
const UserForm = ({
    activeTab,
    setActiveTab,
    formData,
    setFormData,
    errors,
    setErrors,
    isSubmitting,
    onClose,
    onSave,
    isEditing,
}) => {
    // =======================
    // HANDLERS
    // =======================
    const handleInputChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));

        // Limpiar error del campo modificado
        if (errors[field]) {
            setErrors((prev) => ({
                ...prev,
                [field]: "",
            }));
        }

        // Actualizar fullName cuando cambien firstName o lastName
        if (field === "firstName" || field === "lastName") {
            const firstName = field === "firstName" ? value : formData.firstName;
            const lastName = field === "lastName" ? value : formData.lastName;
            if (firstName.trim() && lastName.trim()) {
                setFormData((prev) => ({
                    ...prev,
                    fullName: `${firstName.trim()} ${lastName.trim()}`,
                }));
            }
        }
    };

    const handleRoleChange = (roleCode, roleName, isChecked) => {
        if (isChecked) {
            setFormData((prev) => ({
                ...prev,
                rolesCodes: [...prev.rolesCodes, roleCode],
                roles: [...prev.roles, roleName],
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                rolesCodes: prev.rolesCodes.filter((code) => code !== roleCode),
                roles: prev.roles.filter((role) => role !== roleName),
            }));
        }

        // Limpiar error de roles si se asigna alguno
        if (isChecked && errors.roles) {
            setErrors((prev) => ({ ...prev, roles: "" }));
        }
    };

    const handlePermissionChange = (permissionCode, isChecked) => {
        if (isChecked) {
            setFormData((prev) => ({
                ...prev,
                permissions: [...prev.permissions, permissionCode],
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                permissions: prev.permissions.filter((perm) => perm !== permissionCode),
            }));
        }
    };

    const handleWarehouseChange = (warehouseCode, warehouseName, isChecked) => {
        if (isChecked) {
            setFormData((prev) => ({
                ...prev,
                warehouseAccess: [...prev.warehouseAccess, warehouseCode],
                warehouses: [...prev.warehouses, warehouseName],
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                warehouseAccess: prev.warehouseAccess.filter(
                    (code) => code !== warehouseCode
                ),
                warehouses: prev.warehouses.filter((wh) => wh !== warehouseName),
            }));
        }
    };

    // =======================
    // VALIDACIÓN + SUBMIT
    // =======================
    const validateForm = () => {
        // Usar el validador del servicio
        const validation = validateUserData(formData);

        if (!validation.isValid) {
            setErrors(validation.errors);
            return false;
        }

        // Validaciones adicionales específicas del modal
        const additionalErrors = {};

        if (formData.rolesCodes.length === 0) {
            additionalErrors.roles = "Debe asignar al menos un rol";
        }

        // Actualizar fullName si no está establecido
        if (formData.firstName.trim() && formData.lastName.trim()) {
            setFormData(prev => ({
                ...prev,
                fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`
            }));
        }

        if (Object.keys(additionalErrors).length > 0) {
            setErrors(additionalErrors);
            return false;
        }

        setErrors({});
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            ModalManager.error({
                title: "Errores en el formulario",
                message: "Por favor corrige los errores antes de continuar.",
                autoClose: 3000,
            });
            return;
        }

        // Calcular initials
        const initials =
            formData.firstName.charAt(0).toUpperCase() +
            formData.lastName.charAt(0).toUpperCase();

        const finalUserData = {
            ...formData,
            initials,
            avatar: null,
            // Asegurar que lastLogin se setee para usuarios nuevos
            lastLogin: isEditing ? formData.lastLogin : new Date().toISOString(),
        };

        try {
            await onSave(finalUserData);
        } catch (error) {
            console.error("Error saving user:", error);
        }
    };

    // =======================
    // TABS
    // =======================
    const tabs = [
        { id: 0, label: "Datos Personales" },
        { id: 1, label: "Roles & Accesos" },
        { id: 2, label: "Permisos" },
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-4 dark:border-gray-700">
                <nav className="-mb-px flex space-x-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-2 text-sm font-medium transition-colors ${activeTab === tab.id
                                ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Contenido Tabs */}
            {/* TAB 0 - Datos personales */}
            <div className={activeTab === 0 ? "block space-y-6" : "hidden"}>
                {/* Nombre y Apellido */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nombre *
                        </label>
                        <input
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => handleInputChange("firstName", e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.firstName
                                    ? "border-red-500"
                                    : "border-gray-300 dark:border-gray-600"
                                }`}
                            placeholder="Ingrese el nombre"
                        />
                        {errors.firstName && (
                            <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Apellido *
                        </label>
                        <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => handleInputChange("lastName", e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.lastName
                                    ? "border-red-500"
                                    : "border-gray-300 dark:border-gray-600"
                                }`}
                            placeholder="Ingrese el apellido"
                        />
                        {errors.lastName && (
                            <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                        )}
                    </div>
                </div>

                {/* Usuario y Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Usuario *
                        </label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => handleInputChange("username", e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.username
                                    ? "border-red-500"
                                    : "border-gray-300 dark:border-gray-600"
                                }`}
                            placeholder="Nombre de usuario único"
                        />
                        {errors.username && (
                            <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email *
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange("email", e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.email
                                    ? "border-red-500"
                                    : "border-gray-300 dark:border-gray-600"
                                }`}
                            placeholder="usuario@empresa.com"
                        />
                        {errors.email && (
                            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                        )}
                    </div>
                </div>

                {/* Teléfono */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Teléfono
                    </label>
                    <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.phone
                                ? "border-red-500"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                        placeholder="+56912345678"
                    />
                    {errors.phone && (
                        <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                    )}
                </div>

                {/* Estado activo */}
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => handleInputChange("isActive", e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isActive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Usuario activo
                    </label>
                </div>
            </div>

            {/* TAB 1 - Roles & Accesos */}
            <div className={activeTab === 1 ? "block space-y-6" : "hidden"}>
                {/* Roles */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Roles * <span className="text-xs text-gray-500">(Debe asignar al menos uno)</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                        {mockUserFormData.roles.map((role) => (
                            <div key={role.value} className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`role-${role.value}`}
                                    checked={formData.rolesCodes.includes(role.value)}
                                    onChange={(e) =>
                                        handleRoleChange(role.value, role.label, e.target.checked)
                                    }
                                    className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                                />
                                <label
                                    htmlFor={`role-${role.value}`}
                                    className="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                                >
                                    {role.label}
                                </label>
                            </div>
                        ))}
                    </div>
                    {errors.roles && (
                        <p className="mt-1 text-sm text-red-600">{errors.roles}</p>
                    )}
                </div>

                {/* Bodegas (temporal con mock) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Acceso a Bodegas <span className="text-xs text-gray-500">(Temporal - mock data)</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                        {mockUserFormData.warehouses.map((wh) => (
                            <div key={wh.value} className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`warehouse-${wh.value}`}
                                    checked={formData.warehouseAccess.includes(wh.value)}
                                    onChange={(e) =>
                                        handleWarehouseChange(
                                            wh.value,
                                            wh.label,
                                            e.target.checked
                                        )
                                    }
                                    className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                                />
                                <label
                                    htmlFor={`warehouse-${wh.value}`}
                                    className="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                                >
                                    {wh.label}
                                </label>
                            </div>
                        ))}
                    </div>
                    <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                        📝 Los accesos de bodega se configurarán con endpoint dedicado próximamente
                    </p>
                </div>
            </div>

            {/* TAB 2 - Permisos */}
            <div className={activeTab === 2 ? "block space-y-6" : "hidden"}>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Permisos Adicionales <span className="text-xs text-gray-500">(Opcionales)</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-800">
                        {mockUserFormData.permissions.map((perm) => (
                            <div key={perm.code} className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`permission-${perm.code}`}
                                    checked={formData.permissions.includes(perm.code)}
                                    onChange={(e) =>
                                        handlePermissionChange(perm.code, e.target.checked)
                                    }
                                    className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                                />
                                <label
                                    htmlFor={`permission-${perm.code}`}
                                    className="ml-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer"
                                >
                                    {perm.name}
                                </label>
                            </div>
                        ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        💡 Selecciona permisos específicos adicionales a los roles asignados
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    {isSubmitting
                        ? "Guardando..."
                        : isEditing
                            ? "Actualizar Usuario"
                            : "Crear Usuario"}
                </button>
            </div>
        </form>
    );
};

// =======================
// Componente Principal
// =======================
const UserModal = ({ isOpen, onClose, onSave, user, isEditing = false }) => {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        fullName: "",
        firstName: "",
        lastName: "",
        phone: "",
        isActive: true,
        roles: [],
        rolesCodes: [],
        permissions: [],
        warehouses: [],
        warehouseAccess: [],
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    // Reset datos al abrir/cambiar usuario
    useEffect(() => {
        if (isOpen) {
            if (isEditing && user) {
                setFormData({
                    username: user.username || "",
                    email: user.email || "",
                    fullName: user.fullName || "",
                    firstName: user.firstName || "",
                    lastName: user.lastName || "",
                    phone: user.phone || "",
                    isActive: user.isActive ?? true,
                    roles: user.roles || [],
                    rolesCodes: user.rolesCodes || [],
                    permissions: user.permissions || [],
                    warehouses: user.warehouses || [],
                    warehouseAccess: user.warehouseAccess || [],
                });
            } else {
                // Reset para nuevo usuario
                setFormData({
                    username: "",
                    email: "",
                    fullName: "",
                    firstName: "",
                    lastName: "",
                    phone: "",
                    isActive: true,
                    roles: [],
                    rolesCodes: [],
                    permissions: [],
                    warehouses: [],
                    warehouseAccess: [],
                });
            }
            setErrors({});
            setActiveTab(0);
        }
    }, [isOpen, isEditing, user]);

    // Crear modal cuando se abre
    useEffect(() => {
        let modalId = null;
        if (isOpen) {
            modalId = ModalManager.custom({
                title: isEditing ? `Editar Usuario: ${user?.username || 'Usuario'}` : "Nuevo Usuario",
                content: (
                    <UserForm
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        formData={formData}
                        setFormData={setFormData}
                        errors={errors}
                        setErrors={setErrors}
                        isSubmitting={isSubmitting}
                        onClose={onClose}
                        onSave={async (data) => {
                            setIsSubmitting(true);
                            try {
                                await onSave(data);
                            } finally {
                                setIsSubmitting(false);
                            }
                        }}
                        isEditing={isEditing}
                    />
                ),
                size: "xlarge",
                showCloseButton: true,
                onClose: onClose,
                footer: null,
            });
        }
        return () => {
            if (modalId) ModalManager.close(modalId);
        };
    }, [isOpen, activeTab, formData, errors, isSubmitting, isEditing, onClose, onSave, user]);

    return null;
};

export default UserModal;