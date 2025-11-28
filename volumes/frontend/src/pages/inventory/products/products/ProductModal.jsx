import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";

const ProductModal = ({
  isOpen,
  onClose,
  onSave,
  product,
  categories,
  measurementUnits,
}) => {
  const [formData, setFormData] = useState({
    product_code: "",
    product_name: "",
    product_description: "",
    category_id: "",
    brand: "",
    model: "",
    base_measurement_unit_id: "",
    has_variants: false,
    is_active: true,
    has_batch_control: false,
    has_expiry_date: false,
    has_serial_numbers: false,
    has_location_tracking: false,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (product) {
      setFormData({
        product_code: product.product_code || "",
        product_name: product.product_name || "",
        product_description: product.product_description || "",
        category_id: product.category_id || "",
        brand: product.brand || "",
        model: product.model || "",
        base_measurement_unit_id: product.base_measurement_unit_id || "",
        has_variants: product.has_variants || false,
        is_active: product.is_active !== undefined ? product.is_active : true,
        has_batch_control: product.has_batch_control || false,
        has_expiry_date: product.has_expiry_date || false,
        has_serial_numbers: product.has_serial_numbers || false,
        has_location_tracking: product.has_location_tracking || false,
      });
    } else {
      setFormData({
        product_code: "",
        product_name: "",
        product_description: "",
        category_id: "",
        brand: "",
        model: "",
        base_measurement_unit_id: "",
        has_variants: false,
        is_active: true,
        has_batch_control: false,
        has_expiry_date: false,
        has_serial_numbers: false,
        has_location_tracking: false,
      });
    }
    setErrors({});
  }, [product, isOpen]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.product_code.trim()) {
      newErrors.product_code = "El código es obligatorio";
    }

    if (!formData.product_name.trim()) {
      newErrors.product_name = "El nombre es obligatorio";
    }

    if (!formData.category_id) {
      newErrors.category_id = "La categoría es obligatoria";
    }

    if (!formData.base_measurement_unit_id) {
      newErrors.base_measurement_unit_id = "La unidad de medida es obligatoria";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      onSave({
        ...formData,
        category_id: parseInt(formData.category_id),
        base_measurement_unit_id: parseInt(formData.base_measurement_unit_id),
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="shoppingCart" className="text-2xl" />
            {product ? "Editar Producto" : "Nuevo Producto"}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Código del producto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.product_code}
                onChange={(e) => handleChange("product_code", e.target.value)}
                className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-4 focus:ring-blue-100 transition-all ${
                  errors.product_code
                    ? "border-red-500"
                    : "border-gray-300 focus:border-blue-500"
                }`}
                placeholder="Ej: PROD-001"
              />
              {errors.product_code && (
                <p className="text-red-500 text-sm mt-1">{errors.product_code}</p>
              )}
            </div>

            {/* Nombre del producto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => handleChange("product_name", e.target.value)}
                className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-4 focus:ring-blue-100 transition-all ${
                  errors.product_name
                    ? "border-red-500"
                    : "border-gray-300 focus:border-blue-500"
                }`}
                placeholder="Ej: Laptop Dell Latitude 5420"
              />
              {errors.product_name && (
                <p className="text-red-500 text-sm mt-1">{errors.product_name}</p>
              )}
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => handleChange("category_id", e.target.value)}
                className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-4 focus:ring-blue-100 transition-all ${
                  errors.category_id
                    ? "border-red-500"
                    : "border-gray-300 focus:border-blue-500"
                }`}
              >
                <option value="">Selecciona una categoría</option>
                {categories
                  .filter((cat) => cat.is_active)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.category_name}
                    </option>
                  ))}
              </select>
              {errors.category_id && (
                <p className="text-red-500 text-sm mt-1">{errors.category_id}</p>
              )}
            </div>

            {/* Unidad de medida base */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unidad de Medida Base <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.base_measurement_unit_id}
                onChange={(e) =>
                  handleChange("base_measurement_unit_id", e.target.value)
                }
                className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-4 focus:ring-blue-100 transition-all ${
                  errors.base_measurement_unit_id
                    ? "border-red-500"
                    : "border-gray-300 focus:border-blue-500"
                }`}
              >
                <option value="">Selecciona una unidad</option>
                {measurementUnits
                  .filter((unit) => unit.is_active)
                  .map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit_name} ({unit.unit_symbol})
                    </option>
                  ))}
              </select>
              {errors.base_measurement_unit_id && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.base_measurement_unit_id}
                </p>
              )}
            </div>

            {/* Marca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marca
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => handleChange("brand", e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                placeholder="Ej: Dell"
              />
            </div>

            {/* Modelo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modelo
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => handleChange("model", e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                placeholder="Ej: Latitude 5420"
              />
            </div>

            {/* Descripción (ocupa 2 columnas) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.product_description}
                onChange={(e) =>
                  handleChange("product_description", e.target.value)
                }
                rows="3"
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none"
                placeholder="Descripción detallada del producto..."
              />
            </div>

            {/* Checkboxes de configuración */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Configuración del Producto
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_variants}
                    onChange={(e) =>
                      handleChange("has_variants", e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Tiene Variantes</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_batch_control}
                    onChange={(e) =>
                      handleChange("has_batch_control", e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Control de Lotes</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_expiry_date}
                    onChange={(e) =>
                      handleChange("has_expiry_date", e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Fecha de Vencimiento
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_serial_numbers}
                    onChange={(e) =>
                      handleChange("has_serial_numbers", e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Números de Serie
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_location_tracking}
                    onChange={(e) =>
                      handleChange("has_location_tracking", e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Seguimiento de Ubicación
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => handleChange("is_active", e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Activo</span>
                </label>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t-2 border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium flex items-center gap-2"
          >
            <Icon name="save" className="text-lg" />
            {product ? "Actualizar" : "Crear"} Producto
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;