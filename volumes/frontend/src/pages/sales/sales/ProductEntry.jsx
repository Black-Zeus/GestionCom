import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";

const ProductEntry = ({
  onSearch,
  onOpenProductSearch,
  productPreview,
  onAddToCart,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        onSearch(searchTerm);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, onSearch]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      if (productPreview) {
        onAddToCart();
        setSearchTerm("");
      } else if (searchTerm) {
        // Disparar búsqueda inmediata
        onSearch(searchTerm);
      }
    }
  };

  return (
    <div className="mb-8 p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Icon name="search" className="text-blue-600" />
        Agregar Producto
      </h3>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-10">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Código o Descripción del Producto
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyPress={handleKeyPress}
              placeholder="Código de barras, SKU o buscar por nombre..."
              className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
            <Icon
              name="search"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>

        <div className="col-span-2 flex items-end">
          <button
            onClick={onOpenProductSearch}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            title="Búsqueda avanzada"
          >
            <Icon name="list" className="text-lg" />
            Buscar
          </button>
        </div>
      </div>

      {/* Preview del Producto */}
      {productPreview && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg border-2 border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="checkCircle" className="text-green-600 text-xl" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">
                {productPreview.product_name}
              </p>
              <p className="text-xs text-gray-600">
                SKU: {productPreview.variant_sku} • Marca:{" "}
                {productPreview.brand} • Stock: {productPreview.stock} •
                Precio: $
                {productPreview.price.toLocaleString("es-CL")}
              </p>
            </div>
            <button
              onClick={() => {
                onAddToCart();
                setSearchTerm("");
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all text-sm"
            >
              Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductEntry;