import React, { useState, useEffect } from "react";

const WarehouseModal = ({ warehouse, users, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    warehouse_code: "",
    warehouse_name: "",
    warehouse_type: "",
    responsible_user_id: "",
    responsible_name: "",
    address: "",
    city: "",
    country: "",
    phone: "",
    email: "",
    is_active: 1,
  });

  useEffect(() => {
    if (warehouse) {
      setFormData(warehouse);
    }
  }, [warehouse]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "responsible_user_id") {
      const selectedUser = users.find((u) => u.id === parseInt(value));
      setFormData({
        ...formData,
        responsible_user_id: parseInt(value),
        responsible_name: selectedUser ? selectedUser.name : "",
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      !formData.warehouse_code ||
      !formData.warehouse_name ||
      !formData.warehouse_type ||
      !formData.responsible_user_id
    ) {
      alert("Por favor complete todos los campos obligatorios");
      return;
    }

    onSave(formData);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Código */}
        <div className="flex flex-col">
          <label className="mb-2 text-gray-900 font-medium text-sm">
            Código de Bodega *
          </label>
          <input
            type="text"
            name="warehouse_code"
            value={formData.warehouse_code}
            onChange={handleChange}
            required
            maxLength={20}
            placeholder="Ej: BOD-001"
            className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* Nombre */}
        <div className="flex flex-col">
          <label className="mb-2 text-gray-900 font-medium text-sm">
            Nombre *
          </label>
          <input
            type="text"
            name="warehouse_name"
            value={formData.warehouse_name}
            onChange={handleChange}
            required
            maxLength={150}
            placeholder="Nombre de la bodega"
            className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* Tipo */}
        <div className="flex flex-col">
          <label className="mb-2 text-gray-900 font-medium text-sm">
            Tipo *
          </label>
          <select
            name="warehouse_type"
            value={formData.warehouse_type}
            onChange={handleChange}
            required
            className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 transition-all"
          >
            <option value="">Seleccionar tipo</option>
            <option value="WAREHOUSE">Bodega</option>
            <option value="STORE">Tienda</option>
            <option value="OUTLET">Outlet</option>
          </select>
        </div>

        {/* Usuario Responsable */}
        <div className="flex flex-col">
          <label className="mb-2 text-gray-900 font-medium text-sm">
            Usuario Responsable *
          </label>
          <select
            name="responsible_user_id"
            value={formData.responsible_user_id}
            onChange={handleChange}
            required
            className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 transition-all"
          >
            <option value="">Seleccionar usuario</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>

        {/* Dirección */}
        <div className="flex flex-col col-span-2">
          <label className="mb-2 text-gray-900 font-medium text-sm">
            Dirección
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows={2}
            placeholder="Dirección completa"
            className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* Ciudad */}
        <div className="flex flex-col">
          <label className="mb-2 text-gray-900 font-medium text-sm">
            Ciudad
          </label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            maxLength={100}
            placeholder="Ciudad"
            className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* País */}
        <div className="flex flex-col">
          <label className="mb-2 text-gray-900 font-medium text-sm">País</label>
          <input
            type="text"
            name="country"
            value={formData.country}
            onChange={handleChange}
            maxLength={100}
            placeholder="País"
            className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* Teléfono */}
        <div className="flex flex-col">
          <label className="mb-2 text-gray-900 font-medium text-sm">
            Teléfono
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            maxLength={20}
            placeholder="+56 9 1234 5678"
            className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* Email */}
        <div className="flex flex-col">
          <label className="mb-2 text-gray-900 font-medium text-sm">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            maxLength={255}
            placeholder="contacto@bodega.com"
            className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* Estado Activo */}
        <div className="flex items-center col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active === 1}
              onChange={handleChange}
              className="w-5 h-5 cursor-pointer"
            />
            <span className="text-gray-900 font-medium text-sm">
              Bodega Activa
            </span>
          </label>
        </div>
      </div>

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

export default WarehouseModal;
