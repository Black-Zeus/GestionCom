import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";

const CashPOSModal = ({ cashRegister, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    registerCode: "",
    registerName: "",
    warehouseId: "",
    warehouseName: "",
    terminalIdentifier: "",
    ipAddress: "",
    locationDescription: "",
    isActive: true,
    requiresSupervisorApproval: true,
    maxDifferenceAmount: 1000.0,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (cashRegister) {
      setFormData({
        id: cashRegister.id,
        registerCode: cashRegister.registerCode || "",
        registerName: cashRegister.registerName || "",
        warehouseId: cashRegister.warehouseId || "",
        warehouseName: cashRegister.warehouseName || "",
        terminalIdentifier: cashRegister.terminalIdentifier || "",
        ipAddress: cashRegister.ipAddress || "",
        locationDescription: cashRegister.locationDescription || "",
        isActive: cashRegister.isActive ?? true,
        requiresSupervisorApproval:
          cashRegister.requiresSupervisorApproval ?? true,
        maxDifferenceAmount: cashRegister.maxDifferenceAmount || 1000.0,
      });
    }
  }, [cashRegister]);

  const warehousesOptions = [
    { id: 1, name: "Bodega Central" },
    { id: 2, name: "Tienda Centro" },
    { id: 3, name: "Tienda Mall Plaza" },
    { id: 4, name: "Bodega Norte" },
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "warehouseId") {
      const selectedWarehouse = warehousesOptions.find(
        (w) => w.id === parseInt(value)
      );
      setFormData({
        ...formData,
        warehouseId: parseInt(value),
        warehouseName: selectedWarehouse?.name || "",
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === "checkbox" ? checked : value,
      });
    }

    // Limpiar error del campo
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.registerName.trim()) {
      newErrors.registerName = "El nombre de caja es requerido";
    }

    if (!formData.warehouseId) {
      newErrors.warehouseId = "Debe seleccionar una bodega";
    }

    if (
      formData.maxDifferenceAmount &&
      parseFloat(formData.maxDifferenceAmount) < 0
    ) {
      newErrors.maxDifferenceAmount =
        "El monto debe ser mayor o igual a cero";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      onSave(formData);
      onClose();
    }
  };

  const tabs = [
    { id: 0, label: "Información General", icon: "info" },
    { id: 1, label: "Configuración de Seguridad", icon: "security" },
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
                ? "text-green-600 border-b-2 border-green-600 -mb-0.5"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Icon name={tab.icon} className="text-sm" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 0: Información General */}
      {activeTab === 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="mb-2 text-gray-900 font-medium text-sm">
              Código de Caja *
            </label>
            <input
              type="text"
              name="registerCode"
              value={formData.registerCode}
              readOnly
              disabled
              className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              placeholder="Se generará automáticamente"
            />
            <p className="text-xs text-gray-500 mt-1">
              El código se genera automáticamente
            </p>
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-gray-900 font-medium text-sm">
              Nombre de Caja *
            </label>
            <input
              type="text"
              name="registerName"
              value={formData.registerName}
              onChange={handleChange}
              required
              className={`px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all ${
                errors.registerName ? "border-red-500" : "border-gray-200"
              }`}
              placeholder="Caja Principal - Tienda Centro"
            />
            {errors.registerName && (
              <p className="mt-1 text-sm text-red-600">{errors.registerName}</p>
            )}
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-gray-900 font-medium text-sm">
              Bodega/Punto de Venta *
            </label>
            <select
              name="warehouseId"
              value={formData.warehouseId}
              onChange={handleChange}
              required
              className={`px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all cursor-pointer ${
                errors.warehouseId ? "border-red-500" : "border-gray-200"
              }`}
            >
              <option value="">Seleccionar bodega...</option>
              {warehousesOptions.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
            {errors.warehouseId && (
              <p className="mt-1 text-sm text-red-600">{errors.warehouseId}</p>
            )}
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-gray-900 font-medium text-sm">
              Identificador de Terminal
            </label>
            <input
              type="text"
              name="terminalIdentifier"
              value={formData.terminalIdentifier}
              onChange={handleChange}
              className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all"
              placeholder="TERM-CENTRO-01"
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-gray-900 font-medium text-sm">
              Dirección IP
            </label>
            <input
              type="text"
              name="ipAddress"
              value={formData.ipAddress}
              readOnly
              disabled
              className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              placeholder="Se asigna automáticamente"
            />
            <p className="text-xs text-gray-500 mt-1">
              La IP se asigna automáticamente según el terminal
            </p>
          </div>

          <div className="flex flex-col col-span-2">
            <label className="mb-2 text-gray-900 font-medium text-sm">
              Ubicación Física
            </label>
            <textarea
              name="locationDescription"
              value={formData.locationDescription}
              onChange={handleChange}
              rows="3"
              className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all resize-none"
              placeholder="Descripción de la ubicación física de la caja..."
            />
          </div>

          <div className="flex items-center gap-3 col-span-2">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="w-5 h-5 cursor-pointer"
            />
            <label className="text-gray-900 font-medium text-sm cursor-pointer">
              Caja activa y disponible para operar
            </label>
          </div>
        </div>
      )}

      {/* Tab 1: Configuración de Seguridad */}
      {activeTab === 1 && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              Configuración de Supervisión y Controles
            </h3>
            <p className="text-xs text-blue-700">
              Define los parámetros de seguridad y supervisión para esta caja
              registradora
            </p>
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              name="requiresSupervisorApproval"
              checked={formData.requiresSupervisorApproval}
              onChange={handleChange}
              className="w-5 h-5 cursor-pointer mt-0.5"
            />
            <div>
              <label className="text-gray-900 font-medium text-sm cursor-pointer block">
                Requiere aprobación de supervisor
              </label>
              <p className="text-xs text-gray-600 mt-1">
                Las diferencias de caja superiores al monto máximo requerirán
                autorización de un supervisor
              </p>
            </div>
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-gray-900 font-medium text-sm">
              Monto Máximo de Diferencia sin Supervisión (CLP)
            </label>
            <input
              type="number"
              name="maxDifferenceAmount"
              value={formData.maxDifferenceAmount}
              onChange={handleChange}
              min="0"
              step="100"
              className={`px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all ${
                errors.maxDifferenceAmount
                  ? "border-red-500"
                  : "border-gray-200"
              }`}
              placeholder="1000"
            />
            {errors.maxDifferenceAmount && (
              <p className="mt-1 text-sm text-red-600">
                {errors.maxDifferenceAmount}
              </p>
            )}
            <p className="text-xs text-gray-600 mt-2">
              Si la diferencia entre el monto físico y teórico supera este
              valor, se requerirá aprobación del supervisor
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Icon
                name="warning"
                className="text-yellow-600 text-xl mt-0.5"
              />
              <div>
                <h4 className="text-sm font-semibold text-yellow-900 mb-1">
                  Importante
                </h4>
                <p className="text-xs text-yellow-700">
                  La configuración de seguridad afecta directamente el proceso
                  de cierre de caja. Asegúrese de establecer valores apropiados
                  según las políticas de su empresa.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all"
        >
          {cashRegister ? "Actualizar Caja" : "Crear Caja"}
        </button>
      </div>
    </form>
  );
};

export default CashPOSModal;