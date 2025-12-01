import React, { useState, useMemo } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@components/ui/modal/ModalManager";

const AddProductsModal = ({
  variants,
  products,
  existingItems,
  onSave,
  onClose,
}) => {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrar variantes que ya están en la lista
  const availableVariants = useMemo(() => {
    const existingVariantIds = existingItems.map((item) => item.product_variant_id);
    return variants.filter((v) => !existingVariantIds.includes(v.id) && v.is_active);
  }, [variants, existingItems]);

  // Filtrar variantes según búsqueda
  const filteredVariants = useMemo(() => {
    if (!searchTerm.trim()) return availableVariants;

    const term = searchTerm.toLowerCase();
    return availableVariants.filter((variant) => {
      const product = products.find((p) => p.id === variant.product_id);
      const searchText = [
        variant.variant_sku || "",
        variant.variant_name || "",
        product?.product_name || "",
        product?.product_code || "",
      ]
        .join(" ")
        .toLowerCase();

      return searchText.includes(term);
    });
  }, [searchTerm, availableVariants, products]);

  const getProduct = (productId) => {
    return products.find((p) => p.id === productId);
  };

  const isProductSelected = (variantId) => {
    return selectedProducts.some((p) => p.variantId === variantId);
  };


  const alertModal = (message) => {
    ModalManager.warning({
      title: "Lista de Precios",
      message: message,
    });
  };

  const handleAddProduct = (variant) => {
    if (!isProductSelected(variant.id)) {
      setSelectedProducts((prev) => [
        ...prev,
        {
          variantId: variant.id,
          price: 0,
          discount: 0,
          cost: 0,
        },
      ]);
    }
  };

  const handleRemoveProduct = (variantId) => {
    setSelectedProducts((prev) =>
      prev.filter((p) => p.variantId !== variantId)
    );
  };

  const handleUpdateProductPrice = (variantId, field, value) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.variantId === variantId ? { ...p, [field]: parseFloat(value) || 0 } : p
      )
    );
  };

  const handleSave = () => {
    if (selectedProducts.length === 0) {
      alertModal("Debes seleccionar al menos un producto");
      return;
    }

    // Verificar que todos tengan precio
    const allHavePrice = selectedProducts.every((p) => p.price > 0);
    if (!allHavePrice) {
      alertModal("Todos los productos deben tener un precio asignado");
      return;
    }

    onSave(selectedProducts);
  };

  return (
    <div className="p-6">
      {/* Buscador */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Buscar Productos
        </label>
        <div className="relative">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por SKU, producto, nombre..."
            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
          />
        </div>
      </div>

      {/* Lista de productos seleccionados */}
      {selectedProducts.length > 0 && (
        <div className="mb-6 bg-blue-50 rounded-lg border-2 border-blue-200 p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Productos Seleccionados ({selectedProducts.length})
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {selectedProducts.map((selectedProduct) => {
              const variant = variants.find(
                (v) => v.id === selectedProduct.variantId
              );
              const product = variant ? getProduct(variant.product_id) : null;

              return (
                <div
                  key={selectedProduct.variantId}
                  className="bg-white p-3 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">
                        {product?.product_name || "Producto"}
                      </div>
                      <div className="text-xs text-gray-600">
                        {variant?.variant_name} • SKU: {variant?.variant_sku}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveProduct(selectedProduct.variantId)
                      }
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Icon name="delete" className="text-lg" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Precio *
                      </label>
                      <input
                        type="number"
                        value={selectedProduct.price}
                        onChange={(e) =>
                          handleUpdateProductPrice(
                            selectedProduct.variantId,
                            "price",
                            e.target.value
                          )
                        }
                        min="0"
                        step="1"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        % Desc.
                      </label>
                      <input
                        type="number"
                        value={selectedProduct.discount}
                        onChange={(e) =>
                          handleUpdateProductPrice(
                            selectedProduct.variantId,
                            "discount",
                            e.target.value
                          )
                        }
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Costo
                      </label>
                      <input
                        type="number"
                        value={selectedProduct.cost}
                        onChange={(e) =>
                          handleUpdateProductPrice(
                            selectedProduct.variantId,
                            "cost",
                            e.target.value
                          )
                        }
                        min="0"
                        step="1"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resultados de búsqueda */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Productos Disponibles
        </h4>
        <div className="border-2 border-gray-200 rounded-lg max-h-96 overflow-y-auto bg-gray-50">
          {filteredVariants.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Icon name="inbox" className="text-3xl mb-2 block" />
              <p className="text-sm">
                {searchTerm
                  ? "No se encontraron productos"
                  : "Todos los productos ya están en esta lista"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredVariants.map((variant) => {
                const product = getProduct(variant.product_id);
                const isSelected = isProductSelected(variant.id);

                return (
                  <div
                    key={variant.id}
                    className={`p-3 hover:bg-white transition-colors ${isSelected ? "bg-blue-50" : ""
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900">
                          {product?.product_name || "Producto"}
                        </div>
                        <div className="text-xs text-gray-600">
                          {variant.variant_name} • SKU: {variant.variant_sku}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          isSelected
                            ? handleRemoveProduct(variant.id)
                            : handleAddProduct(variant)
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isSelected
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                      >
                        {isSelected ? "Quitar" : "Agregar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
          onClick={handleSave}
          disabled={selectedProducts.length === 0}
          className={`px-6 py-2.5 rounded-lg transition-all font-medium flex items-center gap-2 ${selectedProducts.length > 0
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
        >
          <Icon name="save" className="text-lg" />
          Agregar {selectedProducts.length} producto
          {selectedProducts.length !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
};

export default AddProductsModal;