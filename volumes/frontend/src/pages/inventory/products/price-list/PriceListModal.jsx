import React, { useState, useMemo } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import { formatCurrency } from "@utils/formats";

const PriceListModal = ({ groups, variants, products, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    price_list_code: "",
    price_list_name: "",
    price_list_description: "",
    price_list_group_id: groups[0]?.id || "",
    currency: "CLP",
    list_type: "GENERAL",
    status: "ACTIVE",
    valid_from: "",
    valid_to: "",
    base_price: 0,
  });

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Filtrar variantes según búsqueda
  const filteredVariants = useMemo(() => {
    if (!searchTerm.trim()) return variants;

    const term = searchTerm.toLowerCase();
    return variants.filter((variant) => {
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
  }, [searchTerm, variants, products]);

  const getProduct = (productId) => {
    return products.find((p) => p.id === productId);
  };

  const isProductSelected = (variantId) => {
    return selectedProducts.some((p) => p.variantId === variantId);
  };

  const handleAddProduct = (variant) => {
    if (!isProductSelected(variant.id)) {
      setSelectedProducts((prev) => [
        ...prev,
        {
          variantId: variant.id,
          price: formData.base_price || 0,
          discount: 0,
          cost: formData.base_price ? formData.base_price * 0.8 : 0,
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.price_list_code.trim()) {
      newErrors.price_list_code = "El código es obligatorio";
    }

    if (!formData.price_list_name.trim()) {
      newErrors.price_list_name = "El nombre es obligatorio";
    }

    if (!formData.price_list_group_id) {
      newErrors.price_list_group_id = "El grupo es obligatorio";
    }

    if (formData.list_type === "ESPECIFICA" && selectedProducts.length === 0) {
      newErrors.selectedProducts =
        "Para listas específicas debes seleccionar al menos un producto";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      // Preparar datos de productos con sus precios
      const productsWithPrices =
        formData.list_type === "GENERAL"
          ? variants.map((v) => ({
              variantId: v.id,
              price: formData.base_price || 0,
              discount: 0,
              cost: formData.base_price ? formData.base_price * 0.8 : 0,
            }))
          : selectedProducts;

      onSave({
        price_list_code: formData.price_list_code,
        price_list_name: formData.price_list_name,
        price_list_description: formData.price_list_description,
        price_list_group_id: parseInt(formData.price_list_group_id),
        currency: formData.currency,
        list_type: formData.list_type,
        status: formData.status,
        valid_from: formData.valid_from || null,
        valid_to: formData.valid_to || null,
        base_price_list_id: null,
        base_adjustment_type: null,
        base_adjustment_value: null,
        productsWithPrices,
      });
    }
  };

  const currencies = ["CLP", "USD", "EUR"];

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit}>
        {/* Grid de campos */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.price_list_code}
              onChange={(e) => handleChange("price_list_code", e.target.value)}
              placeholder="RETAIL_2025"
              className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-4 focus:ring-blue-100 transition-all text-sm ${
                errors.price_list_code
                  ? "border-red-500"
                  : "border-gray-300 focus:border-blue-500"
              }`}
            />
            {errors.price_list_code && (
              <p className="text-red-500 text-xs mt-1">
                {errors.price_list_code}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.price_list_name}
              onChange={(e) => handleChange("price_list_name", e.target.value)}
              placeholder="Lista Retail 2025"
              className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-4 focus:ring-blue-100 transition-all text-sm ${
                errors.price_list_name
                  ? "border-red-500"
                  : "border-gray-300 focus:border-blue-500"
              }`}
            />
            {errors.price_list_name && (
              <p className="text-red-500 text-xs mt-1">
                {errors.price_list_name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grupo <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.price_list_group_id}
              onChange={(e) =>
                handleChange("price_list_group_id", e.target.value)
              }
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.group_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Divisa <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.currency}
              onChange={(e) => handleChange("currency", e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
            >
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de lista <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.list_type}
              onChange={(e) => handleChange("list_type", e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
            >
              <option value="GENERAL">General (todos los productos)</option>
              <option value="ESPECIFICA">
                Específica (solo productos seleccionados)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
            >
              <option value="ACTIVE">Activa</option>
              <option value="INACTIVE">Inactiva</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vigencia desde
            </label>
            <input
              type="date"
              value={formData.valid_from}
              onChange={(e) => handleChange("valid_from", e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vigencia hasta
            </label>
            <input
              type="date"
              value={formData.valid_to}
              onChange={(e) => handleChange("valid_to", e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
            />
          </div>
        </div>

        {/* Descripción */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción
          </label>
          <textarea
            value={formData.price_list_description}
            onChange={(e) =>
              handleChange("price_list_description", e.target.value)
            }
            rows="2"
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm resize-none"
            placeholder="Descripción de la lista..."
          />
        </div>

        {/* Precio base (solo para lista GENERAL) */}
        {formData.list_type === "GENERAL" && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Precio base para todos los productos
            </label>
            <input
              type="number"
              value={formData.base_price}
              onChange={(e) => handleChange("base_price", e.target.value)}
              min="0"
              step="1"
              placeholder="Ej: 15000"
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              Este precio se aplicará a todos los productos activos
            </p>
          </div>
        )}

        {/* Selector de productos (solo para lista ESPECIFICA) */}
        {formData.list_type === "ESPECIFICA" && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Productos / Variantes
            </label>

            {/* Buscador */}
            <div className="relative mb-4">
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

            {/* Lista de productos seleccionados */}
            {selectedProducts.length > 0 && (
              <div className="mb-4 bg-blue-50 rounded-lg border-2 border-blue-200 p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Productos Seleccionados ({selectedProducts.length})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedProducts.map((selectedProduct) => {
                    const variant = variants.find(
                      (v) => v.id === selectedProduct.variantId
                    );
                    const product = variant
                      ? getProduct(variant.product_id)
                      : null;

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
                              {variant?.variant_name} • SKU:{" "}
                              {variant?.variant_sku}
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
                              Precio
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
            <div className="border-2 border-gray-200 rounded-lg max-h-64 overflow-y-auto bg-gray-50">
              {filteredVariants.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Icon name="inbox" className="text-3xl mb-2 block" />
                  <p className="text-sm">No se encontraron productos</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredVariants.map((variant) => {
                    const product = getProduct(variant.product_id);
                    const isSelected = isProductSelected(variant.id);

                    return (
                      <div
                        key={variant.id}
                        className={`p-3 hover:bg-white transition-colors ${
                          isSelected ? "bg-blue-50" : ""
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
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              isSelected
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

            {errors.selectedProducts && (
              <p className="text-red-500 text-xs mt-2">
                {errors.selectedProducts}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Busca y agrega productos, luego define el precio individual para
              cada uno
            </p>
          </div>
        )}

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
            Crear lista
          </button>
        </div>
      </form>
    </div>
  );
};

export default PriceListModal;