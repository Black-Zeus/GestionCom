import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const ProductDetailModal = ({ product, onClose }) => {
  return (
    <div>
      {/* Imagen del Producto */}
      <div className="mb-6 bg-gray-100 rounded-xl p-8 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <Icon name="image" className="text-gray-400 text-6xl mb-4" />
          <p className="text-sm text-gray-500">Imagen no disponible</p>
          <p className="text-xs text-gray-400 mt-2">
            SKU: {product.variant_sku}
          </p>
        </div>
      </div>

      {/* Información del Producto */}
      <div className="space-y-6">
        {/* Nombre y Marca */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {product.product_name}
          </h2>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
              {product.brand}
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
              {product.category}
            </span>
          </div>
        </div>

        {/* Precio y Stock */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
            <p className="text-sm text-gray-600 mb-1">Precio</p>
            <p className="text-3xl font-bold text-blue-600">
              ${Math.round(product.price).toLocaleString("es-CL")}
            </p>
          </div>
          <div
            className={`p-4 rounded-xl border-2 ${
              product.stock > 10
                ? "bg-green-50 border-green-200"
                : product.stock > 0
                ? "bg-orange-50 border-orange-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <p className="text-sm text-gray-600 mb-1">Stock Disponible</p>
            <p
              className={`text-3xl font-bold ${
                product.stock > 10
                  ? "text-green-600"
                  : product.stock > 0
                  ? "text-orange-600"
                  : "text-red-600"
              }`}
            >
              {product.stock} unidades
            </p>
          </div>
        </div>

        {/* Información Detallada */}
        <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
          <h3 className="text-sm font-bold text-gray-900 mb-3">
            Información Técnica
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">SKU</p>
              <p className="text-sm font-semibold text-gray-900">
                {product.variant_sku}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Código de Barras</p>
              <p className="text-sm font-semibold text-gray-900">
                {product.barcode}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Marca</p>
              <p className="text-sm font-semibold text-gray-900">
                {product.brand}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Categoría</p>
              <p className="text-sm font-semibold text-gray-900">
                {product.category}
              </p>
            </div>
          </div>
        </div>

        {/* Descripción */}
        {product.description && (
          <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
            <h3 className="text-sm font-bold text-gray-900 mb-2">
              Descripción
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              {product.description}
            </p>
          </div>
        )}

        {/* Estado de Disponibilidad */}
        <div
          className={`p-4 rounded-xl border-2 ${
            product.stock > 0
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <Icon
              name={product.stock > 0 ? "checkCircle" : "error"}
              className={`text-2xl ${
                product.stock > 0 ? "text-green-600" : "text-red-600"
              }`}
            />
            <div>
              <p
                className={`font-bold ${
                  product.stock > 0 ? "text-green-900" : "text-red-900"
                }`}
              >
                {product.stock > 0 ? "Disponible" : "Sin Stock"}
              </p>
              <p className="text-xs text-gray-600">
                {product.stock > 0
                  ? `${product.stock} unidades disponibles para venta`
                  : "Este producto no está disponible actualmente"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Botón Cerrar */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default ProductDetailModal;