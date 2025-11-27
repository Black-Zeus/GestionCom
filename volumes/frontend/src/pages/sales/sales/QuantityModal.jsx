import React, { useState } from "react";
import { Icon } from "@components/ui/icon/iconManager";

const QuantityModal = ({ product, onConfirm, onClose }) => {
  const [quantity, setQuantity] = useState(1);

  const handleDecrease = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    if (value >= 1 && value <= product.stock) {
      setQuantity(value);
    }
  };

  const handleConfirm = () => {
    if (quantity > 0 && quantity <= product.stock) {
      onConfirm(quantity);
    }
  };

  return (
    <div>
      {/* Resumen del Producto */}
      <div className="mb-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {product.product_name}
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          SKU: {product.variant_sku} • Marca: {product.brand} • Stock:{" "}
          {product.stock}
        </p>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Precio unitario:</span>
          <span className="text-2xl font-bold text-blue-600">
            ${product.price.toLocaleString("es-CL")}
          </span>
        </div>
      </div>

      {/* Controles de Cantidad */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
          Cantidad
        </label>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleDecrease}
            disabled={quantity <= 1}
            className="w-14 h-14 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all flex items-center justify-center text-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            −
          </button>

          <input
            type="number"
            value={quantity}
            onChange={handleQuantityChange}
            min="1"
            max={product.stock}
            className="w-24 text-center px-4 py-3 border-2 border-gray-200 rounded-xl text-2xl font-bold focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          />

          <button
            onClick={handleIncrease}
            disabled={quantity >= product.stock}
            className="w-14 h-14 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all flex items-center justify-center text-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>

        {quantity >= product.stock && (
          <p className="text-sm text-orange-600 text-center mt-3">
            Cantidad máxima disponible alcanzada
          </p>
        )}
      </div>

      {/* Total */}
      <div className="mb-6 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-base font-medium text-gray-700">
            Total ({quantity} unidades):
          </span>
          <span className="text-2xl font-bold text-gray-900">
            ${(product.price * quantity).toLocaleString("es-CL")}
          </span>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all flex items-center justify-center gap-2"
        >
          <Icon name="checkCircle" className="text-lg" />
          Agregar al Carrito
        </button>
      </div>
    </div>
  );
};

export default QuantityModal;