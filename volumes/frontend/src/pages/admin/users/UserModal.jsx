import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";

const UserModal = ({ user, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    isActive: true,
    rolesCodes: [],
    roles: [],
    warehouseAccess: [],
    warehouses: [],
    permissions: [],
    department: "",
    position: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id,
        username: user.username || "",
        email: user.email || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
        isActive: user.isActive ?? true,
        rolesCodes: user.rolesCodes || [],
        roles: user.roles || [],
        warehouseAccess: user.warehouseAccess || [],
        warehouses: user.warehouses || [],
        permissions: user.permissions || [],
        department: user.department || "",
        position: user.position || "",
      });
    }
  }, [user]);

  const rolesOptions = [
    { code: "ADMIN", name: "Administrador" },
    { code: "WAREHOUSE_MANAGER", name: "Jefe de Bodega" },
    { code: "SUPERVISOR", name: "Supervisor" },
    { code: "SALES_PERSON", name: "Vendedor" },
    { code: "CASHIER", name: "Cajero" },
    { code: "ACCOUNTANT", name: "Contador" },
    { code: "VIEWER", name: "Consultor" },
  ];

  const warehousesOptions = [
    { code: "TIENDA_CENTRO", name: "Tienda Centro" },
    { code: "TIENDA_MALL", name: "Tienda Mall" },
    { code: "BODEGA_CENTRAL", name: "Bodega Central" },
  ];

  const permissionsOptions = [
    { code: "USERS_MANAGE", name: "Gestionar Usuarios" },
    { code: "ROLES_MANAGE", name: "Gestionar Roles" },
    { code: "SYSTEM_CONFIG", name: "Configurar Sistema" },
    { code: "INVENTORY_MANAGE", name: "Gestionar Inventario" },
    { code: "PRODUCTS_MANAGE", name: "Gestionar Productos" },
    { code: "WAREHOUSE_MANAGE", name: "Gestionar Bodegas" },
    { code: "SALES_CREATE", name: "Crear Ventas" },
    { code: "SALES_VIEW", name: "Ver Ventas" },
    { code: "CASH_OPERATIONS", name: "Operaciones de Caja" },
    { code: "REPORTS_VIEW", name: "Ver Reportes" },
    { code: "FINANCIAL_VIEW", name: "Ver Información Financiera" },
    { code: "AUDIT_VIEW", name: "Ver Auditoría" },
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleRoleChange = (roleCode, roleName, isChecked) => {
    if (isChecked) {
      setFormData({
        ...formData,
        rolesCodes: [...formData.rolesCodes, roleCode],
        roles: [...formData.roles, roleName],
      });
    } else {
      setFormData({
        ...formData,
        rolesCodes: formData.rolesCodes.filter((code) => code !== roleCode),
        roles: formData.roles.filter((role) => role !== roleName),
      });
    }
  };

  const handleWarehouseChange = (warehouseCode, warehouseName, isChecked) => {
    if (isChecked) {
      setFormData({
        ...formData,
        warehouseAccess: [...formData.warehouseAccess, warehouseCode],
        warehouses: [...formData.warehouses, warehouseName],
      });
    } else {
      setFormData({
        ...formData,
        warehouseAccess: formData.warehouseAccess.filter(
          (code) => code !== warehouseCode
        ),
        warehouses: formData.warehouses.filter((wh) => wh !== warehouseName),
      });
    }
  };

  const handlePermissionChange = (permissionCode, isChecked) => {
    if (isChecked) {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, permissionCode],
      });
    } else {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter(
          (perm) => perm !== permissionCode
        ),
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "El usuario es requerido";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = "El nombre es requerido";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "El apellido es requerido";
    }

    if (formData.rolesCodes.length === 0) {
      newErrors.roles = "Debe asignar al menos un rol";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      const userData = {
        ...formData,
        fullName: `${formData.firstName} ${formData.lastName}`,
      };
      onSave(userData);
      onClose();
    }
  };

  // Tabs usando nombres del iconManager
  const tabs = [
    { id: 0, label: "Información Básica", icon: "users" },
    { id: 1, label: "Roles y Permisos", icon: "security" },
    { id: 2, label: "Acceso a Bodegas", icon: "warehouse" },
  ];

  return (
    <form onSubmit={handleSubmit} className="p-6">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b-2 border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? "text-blue-600 border-b-2 border-blue-600 -mb-0.5"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Icon name={tab.icon} className="text-sm" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 0: Información Básica */}
      {activeTab === 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="mb-2 text-gray-900 font-medium text-sm">
              Usuario *
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className={`px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all ${
                errors.username ? "border-red-500" : "border-gray-200"
              }`}
              placeholder="nombre.usuario"
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username}</p>
            )}
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-gray-900 font-medium text-sm">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className={`px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all ${
                errors.email ? "border-red-500" : "border-gray-200"
              }`}
              placeholder="usuario@empresa.cl"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-gray-900 font-medium text-sm">
              Nombre *
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className={`px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all ${
                errors.firstName ? "border-red-500" : "border-gray-200"
              }`}
              placeholder="Nombre"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
            )}
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-gray-900 font-medium text-sm">
              Apellido *
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className={`px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all ${
                errors.lastName ? "border-red-500" : "border-gray-200"
              }`}
              placeholder="Apellido"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
            )}
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-gray-900 font-medium text-sm">
              Teléfono
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
              placeholder="+56 9 1234 5678"
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-gray-900 font-medium text-sm">
              Departamento
            </label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
              placeholder="Departamento"
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-gray-900 font-medium text-sm">
              Cargo
            </label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
              className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
              placeholder="Cargo"
            />
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-5 h-5 cursor-pointer"
              />
              <span className="text-gray-900 font-medium text-sm">
                Usuario Activo
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Tab 1: Roles y Permisos */}
      {activeTab === 1 && (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Roles *
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {rolesOptions.map((role) => (
                <label
                  key={role.code}
                  className="flex items-center gap-2 cursor-pointer p-3 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-all"
                >
                  <input
                    type="checkbox"
                    checked={formData.rolesCodes.includes(role.code)}
                    onChange={(e) =>
                      handleRoleChange(role.code, role.name, e.target.checked)
                    }
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm text-gray-900">{role.name}</span>
                </label>
              ))}
            </div>
            {errors.roles && (
              <p className="mt-2 text-sm text-red-600">{errors.roles}</p>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Permisos Específicos
            </h3>
            <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
              {permissionsOptions.map((permission) => (
                <label
                  key={permission.code}
                  className="flex items-center gap-2 cursor-pointer p-3 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-all"
                >
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(permission.code)}
                    onChange={(e) =>
                      handlePermissionChange(permission.code, e.target.checked)
                    }
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm text-gray-900">
                    {permission.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Acceso a Bodegas */}
      {activeTab === 2 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Bodegas Asignadas
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {warehousesOptions.map((warehouse) => (
              <label
                key={warehouse.code}
                className="flex items-center gap-2 cursor-pointer p-3 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-all"
              >
                <input
                  type="checkbox"
                  checked={formData.warehouseAccess.includes(warehouse.code)}
                  onChange={(e) =>
                    handleWarehouseChange(
                      warehouse.code,
                      warehouse.name,
                      e.target.checked
                    )
                  }
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm text-gray-900">{warehouse.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
        >
          Guardar
        </button>
      </div>
    </form>
  );
};

export default UserModal;
