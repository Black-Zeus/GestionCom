import React, { useState, useEffect } from "react";

const AuthorizedUserModal = ({ user, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    authorized_name: "",
    authorized_tax_id: "",
    position: "",
    email: "",
    phone: "",
    is_primary_contact: false,
    authorization_level: "BASIC",
    max_purchase_amount: 0,
    is_active: true,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setFormData(user);
    }
  }, [user]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.authorized_name) {
      newErrors.authorized_name = "El nombre es requerido";
    }

    if (!formData.authorized_tax_id) {
      newErrors.authorized_tax_id = "El RUT es requerido";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }

    if (!formData.authorization_level) {
      newErrors.authorization_level = "El nivel de autorización es requerido";
    }

    if (formData.max_purchase_amount < 0) {
      newErrors.max_purchase_amount = "El monto debe ser mayor o igual a 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSave(formData);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nombre */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre Completo *
          </label>
          <input
            type="text"
            value={formData.authorized_name}
            onChange={(e) => handleInputChange("authorized_name", e.target.value)}
            placeholder="Nombre del contacto autorizado"
            className={`w-full px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:ring-4 transition-all ${
              errors.authorized_name
                ? "border-red-500 focus:border-red-600 focus:ring-red-100"
                : "border-gray-200 focus:border-blue-600 focus:ring-blue-100"
            }`}
          />
          {errors.authorized_name && (
            <p className="text-red-500 text-xs mt-1">{errors.authorized_name}</p>
          )}
        </div>

        {/* RUT */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            RUT *
          </label>
          <input
            type="text"
            value={formData.authorized_tax_id}
            onChange={(e) =>
              handleInputChange("authorized_tax_id", e.target.value)
            }
            placeholder="XX.XXX.XXX-X"
            className={`w-full px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:ring-4 transition-all ${
              errors.authorized_tax_id
                ? "border-red-500 focus:border-red-600 focus:ring-red-100"
                : "border-gray-200 focus:border-blue-600 focus:ring-blue-100"
            }`}
          />
          {errors.authorized_tax_id && (
            <p className="text-red-500 text-xs mt-1">{errors.authorized_tax_id}</p>
          )}
        </div>

        {/* Cargo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cargo
          </label>
          <input
            type="text"
            value={formData.position || ""}
            onChange={(e) => handleInputChange("position", e.target.value)}
            placeholder="Ej: Gerente de Compras"
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={formData.email || ""}
            onChange={(e) => handleInputChange("email", e.target.value)}
            placeholder="correo@ejemplo.cl"
            className={`w-full px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:ring-4 transition-all ${
              errors.email
                ? "border-red-500 focus:border-red-600 focus:ring-red-100"
                : "border-gray-200 focus:border-blue-600 focus:ring-blue-100"
            }`}
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email}</p>
          )}
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Teléfono
          </label>
          <input
            type="tel"
            value={formData.phone || ""}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            placeholder="+56912345678"
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* Nivel de Autorización */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nivel de Autorización *
          </label>
          <select
            value={formData.authorization_level}
            onChange={(e) =>
              handleInputChange("authorization_level", e.target.value)
            }
            className={`w-full px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:ring-4 transition-all ${
              errors.authorization_level
                ? "border-red-500 focus:border-red-600 focus:ring-red-100"
                : "border-gray-200 focus:border-blue-600 focus:ring-blue-100"
            }`}
          >
            <option value="BASIC">Básico</option>
            <option value="ADVANCED">Avanzado</option>
            <option value="FULL">Completo</option>
          </select>
          {errors.authorization_level && (
            <p className="text-red-500 text-xs mt-1">
              {errors.authorization_level}
            </p>
          )}
        </div>

        {/* Monto Máximo de Compra */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monto Máximo de Compra (CLP)
          </label>
          <input
            type="number"
            value={formData.max_purchase_amount}
            onChange={(e) =>
              handleInputChange("max_purchase_amount", parseInt(e.target.value))
            }
            min="0"
            placeholder="0"
            className={`w-full px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:ring-4 transition-all ${
              errors.max_purchase_amount
                ? "border-red-500 focus:border-red-600 focus:ring-red-100"
                : "border-gray-200 focus:border-blue-600 focus:ring-blue-100"
            }`}
          />
          {errors.max_purchase_amount && (
            <p className="text-red-500 text-xs mt-1">
              {errors.max_purchase_amount}
            </p>
          )}
        </div>

        {/* Checkboxes */}
        <div className="md:col-span-2 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_primary_contact}
              onChange={(e) =>
                handleInputChange("is_primary_contact", e.target.checked)
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Contacto Principal
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => handleInputChange("is_active", e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Activo</span>
          </label>
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
        >
          Guardar Contacto
        </button>
      </div>
    </form>
  );
};

export default AuthorizedUserModal;