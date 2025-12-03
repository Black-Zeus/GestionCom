import React, { useState, useEffect } from "react";

const AuthorizedPersonModal = ({ user, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    authorized_name: "",
    authorized_tax_id: "",
    position: "",
    email: "",
    phone: "",
    authorization_level: "BASIC",
    max_purchase_amount: 0,
    is_primary_contact: false,
    is_active: true,
    internal_notes: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setFormData({
        authorized_name: user.authorized_name || "",
        authorized_tax_id: user.authorized_tax_id || "",
        position: user.position || "",
        email: user.email || "",
        phone: user.phone || "",
        authorization_level: user.authorization_level || "BASIC",
        max_purchase_amount: user.max_purchase_amount || 0,
        is_primary_contact: user.is_primary_contact || false,
        is_active: user.is_active !== undefined ? user.is_active : true,
        internal_notes: user.internal_notes || "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Limpiar error del campo modificado
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.authorized_name.trim()) {
      newErrors.authorized_name = "El nombre es requerido";
    }

    if (!formData.authorized_tax_id.trim()) {
      newErrors.authorized_tax_id = "El RUT es requerido";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El correo es requerido";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "El correo no es válido";
    }

    if (formData.max_purchase_amount < 0) {
      newErrors.max_purchase_amount = "El monto debe ser mayor o igual a 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">
              {user
                ? "Editar persona autorizada"
                : "Agregar persona autorizada"}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors text-xl"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit}>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Nombre completo */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    name="authorized_name"
                    value={formData.authorized_name}
                    onChange={handleChange}
                    placeholder="Ej: Juan Pérez González"
                    className={`w-full px-3 py-2 rounded-full border ${
                      errors.authorized_name
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    } bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:border-transparent`}
                  />
                  {errors.authorized_name && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.authorized_name}
                    </p>
                  )}
                </div>

                {/* RUT */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    RUT
                  </label>
                  <input
                    type="text"
                    name="authorized_tax_id"
                    value={formData.authorized_tax_id}
                    onChange={handleChange}
                    placeholder="15.678.901-2"
                    className={`w-full px-3 py-2 rounded-full border ${
                      errors.authorized_tax_id
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    } bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:border-transparent`}
                  />
                  {errors.authorized_tax_id && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.authorized_tax_id}
                    </p>
                  )}
                </div>

                {/* Cargo */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Cargo
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    placeholder="Gerente de Compras"
                    className="w-full px-3 py-2 rounded-full border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Correo */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Correo
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="nombre@empresa.cl"
                    className={`w-full px-3 py-2 rounded-full border ${
                      errors.email
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    } bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:border-transparent`}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-600 mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+56 9 1234 5678"
                    className="w-full px-3 py-2 rounded-full border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Nivel de autorización */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Nivel de autorización
                  </label>
                  <select
                    name="authorization_level"
                    value={formData.authorization_level}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-full border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="BASIC">Básico</option>
                    <option value="ADVANCED">Avanzado</option>
                    <option value="FULL">Completo</option>
                  </select>
                </div>

                {/* Monto máximo autorizado */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Monto máximo autorizado (CLP)
                  </label>
                  <input
                    type="number"
                    name="max_purchase_amount"
                    value={formData.max_purchase_amount}
                    onChange={handleChange}
                    min="0"
                    step="1000"
                    placeholder="5000000"
                    className={`w-full px-3 py-2 rounded-full border ${
                      errors.max_purchase_amount
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    } bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:border-transparent`}
                  />
                  {errors.max_purchase_amount && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.max_purchase_amount}
                    </p>
                  )}
                </div>

                {/* Checkboxes */}
                <div className="col-span-2 flex items-center gap-6">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_primary_contact"
                      checked={formData.is_primary_contact}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Contacto principal
                    </span>
                  </label>

                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Activo</span>
                  </label>
                </div>

                {/* Nota interna */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Nota interna (uso interno)
                  </label>
                  <textarea
                    name="internal_notes"
                    value={formData.internal_notes}
                    onChange={handleChange}
                    rows="2"
                    placeholder="Ej: Requiere confirmación telefónica para compras sobre 5 millones."
                    className="w-full px-3 py-2 rounded-2xl border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-500/30"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default AuthorizedPersonModal;
