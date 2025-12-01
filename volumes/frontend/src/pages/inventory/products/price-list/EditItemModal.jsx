import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import { formatCurrency, formatPercentage } from "@utils/formats";

const EditItemModal = ({ item, variant, product, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    base_price: item.base_price,
    discount_percentage: item.discount_percentage,
    cost_price: item.cost_price,
    is_active: item.is_active,
  });

  // Calcular precio final y margen
  const finalPrice =
    formData.base_price * (1 - formData.discount_percentage / 100);
  const margin =
    formData.cost_price > 0
      ? ((finalPrice - formData.cost_price) / formData.cost_price) * 100
      : 0;

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const updates = {
      base_price: parseFloat(formData.base_price),
      discount_percentage: parseFloat(formData.discount_percentage),
      cost_price: parseFloat(formData.cost_price),
      final_price: finalPrice,
      margin_percentage: margin,
      is_active: formData.is_active,
    };

    onSave(item.id, updates);
  };

  return (
    <div className="p-6">
      {/* Información del producto */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
        <div className="font-semibold text-gray-900 mb-1">
          {product?.product_name || "Producto"}
        </div>
        <div className="text-sm text-gray-600">
          {variant?.variant_name || "Variante"}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          SKU: {variant?.variant_sku || "N/A"}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Grid de inputs */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Precio base
            </label>
            <input
              type="number"
              value={formData.base_price}
              onChange={(e) => handleChange("base_price", e.target.value)}
              min="0"
              step="1"
              required
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              % Descuento
            </label>
            <input
              type="number"
              value={formData.discount_percentage}
              onChange={(e) =>
                handleChange("discount_percentage", e.target.value)
              }
              min="0"
              max="100"
              step="0.01"
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Costo
            </label>
            <input
              type="number"
              value={formData.cost_price}
              onChange={(e) => handleChange("cost_price", e.target.value)}
              min="0"
              step="1"
              required
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
            />
          </div>
        </div>

        {/* Cálculos automáticos */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">Precio final:</span>
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(finalPrice)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Margen:</span>
            <span className="text-lg font-bold text-gray-900">
              {formatPercentage(margin / 100)}
            </span>
          </div>
        </div>

        {/* Checkbox estado */}
        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => handleChange("is_active", e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Item activo</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium flex items-center gap-2"
          >
            <Icon name="save" className="text-lg" />
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditItemModal;