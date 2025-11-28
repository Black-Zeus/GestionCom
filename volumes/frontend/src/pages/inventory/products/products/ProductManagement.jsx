import React, { useState, useEffect } from "react";
import ProductTable from "./ProductTable";
import ProductFilters from "./ProductFilters";
import ProductModal from "./ProductModal";
import VariantsModal from "./VariantsModal";
import AttributesModal from "./AttributesModal";
import StockViewModal from "./StockViewModal";
import Pagination from "./Pagination";
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@/components/ui/modal/ModalManager";
import mockData from "./data.json";

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [measurementUnits, setMeasurementUnits] = useState([]);
  const [variants, setVariants] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [attributeGroups, setAttributeGroups] = useState([]);
  const [attributeValues, setAttributeValues] = useState([]);
  const [stock, setStock] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [filters, setFilters] = useState({
    search: "",
    category: "",
    brand: "",
    status: "",
    hasVariants: "",
  });

  const [modals, setModals] = useState({
    product: false,
    variants: false,
    attributes: false,
    stockView: false,
  });

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setProducts(mockData.products);
    setCategories(mockData.categories);
    setMeasurementUnits(mockData.measurement_units);
    setVariants(mockData.product_variants);
    setAttributes(mockData.attributes);
    setAttributeGroups(mockData.attribute_groups);
    setAttributeValues(mockData.attribute_values);
    setStock(mockData.stock);
    setWarehouses(mockData.warehouses);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const openModal = (modalName, product = null) => {
    setSelectedProduct(product);
    setModals((prev) => ({ ...prev, [modalName]: true }));
  };

  const closeModal = (modalName) => {
    setModals((prev) => ({ ...prev, [modalName]: false }));
    setSelectedProduct(null);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      category: "",
      brand: "",
      status: "",
      hasVariants: "",
    });
  };

  const handleSaveProduct = (productData) => {
    if (selectedProduct) {
      // Editar producto existente
      setProducts((prev) =>
        prev.map((product) =>
          product.id === selectedProduct.id
            ? {
                ...product,
                ...productData,
                updated_at: new Date().toISOString(),
              }
            : product
        )
      );
      ModalManager.success("Producto actualizado correctamente");
    } else {
      // Crear nuevo producto
      const newProduct = {
        id: Math.max(...products.map((p) => p.id), 0) + 1,
        ...productData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProducts((prev) => [...prev, newProduct]);
      ModalManager.success("Producto creado correctamente");
    }
    closeModal("product");
  };

  const handleToggleStatus = (product) => {
    ModalManager.confirm(
      `¿Estás seguro de ${
        product.is_active ? "desactivar" : "activar"
      } el producto "${product.product_name}"?`,
      () => {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id
              ? {
                  ...p,
                  is_active: !p.is_active,
                  updated_at: new Date().toISOString(),
                }
              : p
          )
        );
        ModalManager.success(
          `Producto ${
            product.is_active ? "desactivado" : "activado"
          } correctamente`
        );
      }
    );
  };

  const handleDeleteProduct = (product) => {
    ModalManager.confirm(
      `¿Estás seguro de eliminar el producto "${product.product_name}"? Esta acción no se puede deshacer.`,
      () => {
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
        ModalManager.success("Producto eliminado correctamente");
      }
    );
  };

  const handleManageVariants = (product) => {
    ModalManager.custom({
      title: `Variantes de ${product.product_name}`,
      size: "xlarge",
      content: (
        <VariantsModal
          product={product}
          variants={variants.filter((v) => v.product_id === product.id)}
          attributes={attributes}
          attributeGroups={attributeGroups}
          attributeValues={attributeValues}
          measurementUnits={measurementUnits}
          onSave={(updatedVariants) => {
            setVariants((prev) => [
              ...prev.filter((v) => v.product_id !== product.id),
              ...updatedVariants,
            ]);
            ModalManager.closeAll();
            ModalManager.success("Variantes actualizadas correctamente");
          }}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  const handleViewStock = (product) => {
    const productVariants = variants.filter((v) => v.product_id === product.id);
    const productStock = stock.filter((s) =>
      productVariants.some((v) => v.id === s.product_variant_id)
    );

    ModalManager.custom({
      title: `Stock de ${product.product_name}`,
      size: "fullscreenWide",
      content: (
        <StockViewModal
          product={product}
          variants={productVariants}
          stock={productStock}
          warehouses={warehouses}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  const handleManageAttributes = () => {
    ModalManager.custom({
      title: "Gestión de Atributos",
      size: "fullscreenWide",
      content: (
        <AttributesModal
          attributeGroups={attributeGroups}
          attributes={attributes}
          attributeValues={attributeValues}
          onSave={(updatedData) => {
            setAttributeGroups(updatedData.groups);
            setAttributes(updatedData.attributes);
            setAttributeValues(updatedData.values);
            ModalManager.closeAll();
            ModalManager.success("Atributos actualizados correctamente");
          }}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  const getFilteredProducts = () => {
    const term = filters.search.trim().toLowerCase();

    return products.filter((product) => {
      // Filtro por categoría
      if (
        filters.category &&
        product.category_id !== parseInt(filters.category, 10)
      ) {
        return false;
      }

      // Filtro por marca
      if (filters.brand && product.brand !== filters.brand) {
        return false;
      }

      // Filtro por estado
      if (filters.status !== "") {
        const isActive = filters.status === "1";
        if (product.is_active !== isActive) {
          return false;
        }
      }

      // Filtro por tiene variantes
      if (filters.hasVariants !== "") {
        const hasVariants = filters.hasVariants === "1";
        if (product.has_variants !== hasVariants) {
          return false;
        }
      }

      // Filtro por texto: código, nombre, marca, modelo
      if (term) {
        const haystack = [
          product.product_code,
          product.product_name,
          product.brand,
          product.model,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(term)) {
          return false;
        }
      }

      return true;
    });
  };

  const getPaginatedProducts = () => {
    const filtered = getFilteredProducts();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getStatistics = () => {
    const filteredProducts = getFilteredProducts();
    return {
      totalProducts: filteredProducts.length,
      activeProducts: filteredProducts.filter((p) => p.is_active).length,
      inactiveProducts: filteredProducts.filter((p) => !p.is_active).length,
      withVariants: filteredProducts.filter((p) => p.has_variants).length,
      totalVariants: variants.filter((v) =>
        filteredProducts.some((p) => p.id === v.product_id)
      ).length,
    };
  };

  const stats = getStatistics();
  const paginatedProducts = getPaginatedProducts();
  const totalPages = Math.ceil(getFilteredProducts().length / itemsPerPage);

  // Obtener lista única de marcas para el filtro
  const uniqueBrands = [...new Set(products.map((p) => p.brand).filter(Boolean))];

  return (
    <div className="min-h-screen pt-2 -mt-10">
      <div className="max-w-[100%] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b-2 border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Icon name="shoppingCart" className="text-blue-600 text-3xl" />
              Gestión de Productos
            </h1>
            <p className="text-gray-500 text-sm">
              Administra productos, variantes, precios y stock
            </p>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={handleManageAttributes}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-all hover:-translate-y-0.5 hover:shadow-lg whitespace-nowrap"
            >
              <Icon name="list" className="text-lg" />
              Gestionar Atributos
            </button>

            <button
              onClick={() => openModal("product")}
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-all hover:-translate-y-0.5 hover:shadow-lg whitespace-nowrap"
            >
              <Icon name="plus" className="text-lg" />
              Crear Nuevo Producto
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Productos</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.totalProducts}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon name="shoppingCart" className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.activeProducts}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Icon name="checkCircle" className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4 border border-red-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactivos</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.inactiveProducts}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Icon name="ban" className="text-red-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Con Variantes</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.withVariants}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icon name="list" className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Variantes</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.totalVariants}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Icon name="folder" className="text-orange-600 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <ProductFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          categories={categories}
          brands={uniqueBrands}
        />

        {/* Tabla */}
        <ProductTable
          products={paginatedProducts}
          categories={categories}
          measurementUnits={measurementUnits}
          onEdit={(product) => openModal("product", product)}
          onManageVariants={handleManageVariants}
          onViewStock={handleViewStock}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDeleteProduct}
        />

        {/* Paginación */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Modal de Producto */}
      <ProductModal
        isOpen={modals.product}
        onClose={() => closeModal("product")}
        onSave={handleSaveProduct}
        product={selectedProduct}
        categories={categories}
        measurementUnits={measurementUnits}
      />
    </div>
  );
};

export default ProductManagement;