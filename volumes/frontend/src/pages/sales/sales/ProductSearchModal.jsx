import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@/components/ui/modal/ModalManager";
import ProductDetailModal from "./ProductDetailModal";

const ProductSearchModal = ({ products, categories, onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 6;

  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedCategory, products]);

  const applyFilters = () => {
    let filtered = products;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.variant_sku.toLowerCase().includes(term) ||
          product.product_name.toLowerCase().includes(term) ||
          product.brand.toLowerCase().includes(term) ||
          product.barcode.includes(searchTerm)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(
        (product) => product.category === selectedCategory
      );
    }

    setFilteredProducts(filtered);
    setCurrentPage(1);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") {
      applyFilters();
    }
  };

  const handleViewDetail = (product) => {
    ModalManager.custom({
      title: "Ficha de Producto",
      size: "large",
      content: (
        <ProductDetailModal
          product={product}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  // Paginación
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const paginatedProducts = filteredProducts.slice(
    startIndex,
    startIndex + productsPerPage
  );

  return (
    <div>
      {/* Filtros de Búsqueda */}
      <div className="grid grid-cols-12 gap-4 mb-6">
        <div className="col-span-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar por Código, Nombre o Marca
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            placeholder="Ingrese término de búsqueda"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>

        <div className="col-span-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoría
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-white cursor-pointer focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option
                key={category.category_code}
                value={category.category_name}
              >
                {category.category_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Información de resultados */}
      {filteredProducts.length > 0 && (
        <div className="mb-4 flex justify-between items-center">
          <span className="text-sm text-gray-600">
            {filteredProducts.length} productos encontrados
          </span>
          {totalPages > 1 && (
            <span className="text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </span>
          )}
        </div>
      )}

      {/* Grid de Productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {paginatedProducts.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Icon name="search" className="text-gray-400 text-4xl mb-2" />
              <p className="text-gray-600 font-medium">
                No se encontraron productos
              </p>
              <p className="text-sm text-gray-500">
                Intente con otros términos de búsqueda
              </p>
            </div>
          </div>
        ) : (
          paginatedProducts.map((product) => (
            <div
              key={product.variant_sku}
              className="p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all"
            >
              <div className="mb-3">
                <h4 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2">
                  {product.product_name}
                </h4>
                <p className="text-xs text-gray-500">
                  SKU: {product.variant_sku}
                </p>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Marca:</span>
                  <span className="text-xs font-medium text-gray-900">
                    {product.brand}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Categoría:</span>
                  <span className="text-xs font-medium text-gray-900">
                    {product.category}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Stock:</span>
                  <span
                    className={`text-xs font-bold ${
                      product.stock > 10
                        ? "text-green-600"
                        : product.stock > 0
                        ? "text-orange-600"
                        : "text-red-600"
                    }`}
                  >
                    {product.stock} unidades
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-gray-100">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-gray-600">Precio:</span>
                  <span className="text-lg font-bold text-blue-600">
                    ${Math.round(product.price).toLocaleString("es-CL")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleViewDetail(product)}
                    className="px-3 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all text-xs flex items-center justify-center gap-1"
                  >
                    <Icon name="info" className="text-sm" />
                    Ver Ficha
                  </button>
                  <button
                    onClick={() => onSelect(product)}
                    disabled={product.stock === 0}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {product.stock === 0 ? "Sin Stock" : "Agregar"}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-4 border-t-2 border-gray-200">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white text-gray-900 border-2 border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <Icon name="chevronLeft" className="text-sm" />
            Anterior
          </button>

          <span className="text-gray-900 font-medium">
            Página {currentPage} de {totalPages}
          </span>

          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white text-gray-900 border-2 border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            Siguiente
            <Icon name="chevronRight" className="text-sm" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductSearchModal;