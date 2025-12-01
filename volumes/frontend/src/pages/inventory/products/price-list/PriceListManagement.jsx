import React, { useState, useEffect } from "react";
import PriceListGroupsPanel from "./PriceListGroupsPanel";
import PriceListsPanel from "./PriceListsPanel";
import PriceListDetail from "./PriceListDetail";
import PriceListFilters from "./PriceListFilters";
import PriceListTable from "./PriceListTable";
import PriceListModal from "./PriceListModal";
import Pagination from "@components/common/pagination/Pagination";
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@components/ui/modal/ModalManager";
import mockData from "./data.json";

const PriceListManagement = () => {
  const [priceListGroups, setPriceListGroups] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [priceListItems, setPriceListItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [productVariants, setProductVariants] = useState([]);

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedListId, setSelectedListId] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    active: "ALL",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setPriceListGroups(mockData.price_list_groups);
    setPriceLists(mockData.price_lists);
    setPriceListItems(mockData.price_list_items);
    setProducts(mockData.products);
    setProductVariants(mockData.product_variants);
  };

  const handleGroupSelect = (groupId) => {
    setSelectedGroupId(groupId);
    setSelectedListId(null);
    setCurrentPage(1);
  };

  const handleListSelect = (listId) => {
    setSelectedListId(listId);
    setCurrentPage(1);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      active: "ALL",
    });
  };

  const handleCreateList = () => {
    ModalManager.custom({
      title: "Nueva lista de precios",
      size: "fullscreen",
      content: (
        <PriceListModal
          groups={priceListGroups}
          variants={productVariants.filter((v) => v.is_active)}
          products={products}
          onSave={(listData) => {
            const newList = {
              id: Math.max(...priceLists.map((l) => l.id), 0) + 1,
              price_list_code: listData.price_list_code,
              price_list_name: listData.price_list_name,
              price_list_description: listData.price_list_description,
              price_list_group_id: listData.price_list_group_id,
              currency: listData.currency,
              list_type: listData.list_type,
              status: listData.status,
              valid_from: listData.valid_from,
              valid_to: listData.valid_to,
              base_price_list_id: listData.base_price_list_id,
              base_adjustment_type: listData.base_adjustment_type,
              base_adjustment_value: listData.base_adjustment_value,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            setPriceLists((prev) => [...prev, newList]);

            // Crear items con precios individuales
            const newItems = listData.productsWithPrices.map(
              (productData, index) => {
                const finalPrice =
                  productData.price * (1 - productData.discount / 100);
                const margin =
                  productData.cost > 0
                    ? ((finalPrice - productData.cost) / productData.cost) * 100
                    : 0;

                return {
                  id:
                    Math.max(...priceListItems.map((i) => i.id), 0) +
                    index +
                    1,
                  price_list_id: newList.id,
                  product_variant_id: productData.variantId,
                  base_price: productData.price,
                  discount_percentage: productData.discount,
                  final_price: finalPrice,
                  cost_price: productData.cost,
                  margin_percentage: margin,
                  is_active: true,
                  created_at: new Date().toISOString(),
                };
              }
            );

            setPriceListItems((prev) => [...prev, ...newItems]);
            ModalManager.closeAll();
            ModalManager.success("Lista de precios creada correctamente");
          }}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  const handleUpdateItem = (itemId, updates) => {
    setPriceListItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    );
  };

  const handleDeleteItem = (itemId) => {
    setPriceListItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleAddProducts = (newProducts) => {
    if (!selectedListId) return;

    const newItems = newProducts.map((productData, index) => {
      const finalPrice =
        productData.price * (1 - productData.discount / 100);
      const margin =
        productData.cost > 0
          ? ((finalPrice - productData.cost) / productData.cost) * 100
          : 0;

      return {
        id: Math.max(...priceListItems.map((i) => i.id), 0) + index + 1,
        price_list_id: selectedListId,
        product_variant_id: productData.variantId,
        base_price: productData.price,
        discount_percentage: productData.discount,
        final_price: finalPrice,
        cost_price: productData.cost,
        margin_percentage: margin,
        is_active: true,
        created_at: new Date().toISOString(),
      };
    });

    setPriceListItems((prev) => [...prev, ...newItems]);
  };

  const getFilteredItems = () => {
    if (!selectedListId) return [];

    let filtered = priceListItems.filter(
      (item) => item.price_list_id === selectedListId
    );

    // Filtro de búsqueda
    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter((item) => {
        const variant = productVariants.find(
          (v) => v.id === item.product_variant_id
        );
        const product = variant
          ? products.find((p) => p.id === variant.product_id)
          : null;

        const searchText = [
          variant?.variant_sku || "",
          variant?.variant_name || "",
          product?.product_name || "",
          product?.product_code || "",
        ]
          .join(" ")
          .toLowerCase();

        return searchText.includes(term);
      });
    }

    // Filtro de estado
    if (filters.active === "ACTIVE") {
      filtered = filtered.filter((item) => item.is_active);
    } else if (filters.active === "INACTIVE") {
      filtered = filtered.filter((item) => !item.is_active);
    }

    return filtered;
  };

  const getPaginatedItems = () => {
    const filtered = getFilteredItems();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getStatistics = () => {
    const selectedList = priceLists.find((l) => l.id === selectedListId);
    const listItems = selectedListId
      ? priceListItems.filter((i) => i.price_list_id === selectedListId)
      : [];

    return {
      totalGroups: priceListGroups.length,
      totalLists: priceLists.length,
      activeItems: listItems.filter((i) => i.is_active).length,
      totalItems: listItems.length,
      selectedGroupLists: selectedGroupId
        ? priceLists.filter((l) => l.price_list_group_id === selectedGroupId)
            .length
        : 0,
    };
  };

  const stats = getStatistics();
  const paginatedItems = getPaginatedItems();
  const totalPages = Math.ceil(getFilteredItems().length / itemsPerPage);
  const selectedList = priceLists.find((l) => l.id === selectedListId);
  const selectedGroup = priceListGroups.find((g) => g.id === selectedGroupId);

  return (
    <div className="min-h-screen pt-2 -mt-10">
      <div className="max-w-[100%] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b-2 border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Icon name="tag" className="text-blue-600 text-3xl" />
              Listas de Precios
            </h1>
            <p className="text-gray-500 text-sm">
              Administración y consulta de listas de precios por grupo y
              variante de producto
            </p>
          </div>

          <button
            onClick={handleCreateList}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-all hover:-translate-y-0.5 hover:shadow-lg whitespace-nowrap"
          >
            <Icon name="plus" className="text-lg" />
            Nueva Lista de Precios
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Grupos</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.totalGroups}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon name="folder" className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Listas</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.totalLists}
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
                <p className="text-sm text-gray-600">Listas del Grupo</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.selectedGroupLists}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Icon name="tag" className="text-orange-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ítems Activos</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.activeItems}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Icon name="checkCircle" className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Ítems</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {stats.totalItems}
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Icon name="shoppingCart" className="text-indigo-600 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Layout principal */}
        <div className="grid grid-cols-12 gap-6">
          {/* Panel izquierdo: Grupos y Listas */}
          <div className="col-span-3">
            <div className="bg-gray-50 rounded-lg border-2 border-gray-200 p-6 sticky top-6">
              {/* Grupos */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                  Grupos de Listas
                </h3>
                <PriceListGroupsPanel
                  groups={priceListGroups}
                  selectedGroupId={selectedGroupId}
                  onGroupSelect={handleGroupSelect}
                />
              </div>

              {/* Listas del grupo */}
              <div className="border-t-2 border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Listas del Grupo
                  </h3>
                  <span className="text-xs text-gray-500">
                    {selectedGroup?.group_name || "—"}
                  </span>
                </div>
                <PriceListsPanel
                  lists={priceLists.filter(
                    (l) => l.price_list_group_id === selectedGroupId
                  )}
                  selectedListId={selectedListId}
                  onListSelect={handleListSelect}
                  selectedGroupId={selectedGroupId}
                />
              </div>
            </div>
          </div>

          {/* Panel derecho: Detalle y tabla */}
          <div className="col-span-9 space-y-6">
            {/* Detalle de la lista */}
            <PriceListDetail
              priceList={selectedList}
              group={selectedGroup}
              items={
                selectedListId
                  ? priceListItems.filter(
                      (i) => i.price_list_id === selectedListId
                    )
                  : []
              }
              priceLists={priceLists}
            />

            {/* Filtros */}
            <PriceListFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
            />

            {/* Tabla */}
            <PriceListTable
              items={paginatedItems}
              variants={productVariants}
              products={products}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onAddProducts={handleAddProducts}
              selectedListId={selectedListId}
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
        </div>
      </div>
    </div>
  );
};

export default PriceListManagement;