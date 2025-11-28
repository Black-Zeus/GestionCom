import React, { useState, useEffect } from "react";
import CategoryTable from "./CategoryTable";
import CategoryTree from "./CategoryTree";
import CategoryFilters from "./CategoryFilters";
import CategoryModal from "./CategoryModal";
import Pagination from "@components/common/pagination/Pagination"
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@/components/ui/modal/ModalManager";
import mockData from "./data.json";

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    parentCategory: "",
    status: "",
    level: "",
  });

  const [viewMode, setViewMode] = useState("table"); // "table" o "tree"
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Filtrar categorías no eliminadas
    const activeCategories = mockData.categories.filter(
      (cat) => !cat.deleted_at
    );
    setCategories(activeCategories);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      parentCategory: "",
      status: "",
      level: "",
    });
  };

  const openModal = (category = null) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
  };

  const handleSaveCategory = (categoryData) => {
    if (selectedCategory) {
      // Editar categoría existente
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === selectedCategory.id
            ? {
                ...cat,
                ...categoryData,
                updated_at: new Date().toISOString(),
              }
            : cat
        )
      );
      ModalManager.success("Categoría actualizada correctamente");
    } else {
      // Crear nueva categoría
      const newCategory = {
        id: Math.max(...categories.map((c) => c.id), 0) + 1,
        ...categoryData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };

      // Calcular category_level y category_path
      if (newCategory.parent_id) {
        const parent = categories.find((c) => c.id === newCategory.parent_id);
        if (parent) {
          newCategory.category_level = (parent.category_level || 0) + 1;
          newCategory.category_path = parent.category_path
            ? `${parent.category_path}/${newCategory.category_code}`
            : `/${newCategory.category_code}`;
        }
      } else {
        newCategory.category_level = 0;
        newCategory.category_path = `/${newCategory.category_code}`;
      }

      setCategories((prev) => [...prev, newCategory]);
      ModalManager.success("Categoría creada correctamente");
    }
    closeModal();
  };

  const handleToggleStatus = (category) => {
    ModalManager.confirm(
      `¿Estás seguro de ${
        category.is_active ? "desactivar" : "activar"
      } la categoría "${category.category_name}"?`,
      () => {
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === category.id
              ? {
                  ...cat,
                  is_active: !cat.is_active,
                  updated_at: new Date().toISOString(),
                }
              : cat
          )
        );
        ModalManager.success(
          `Categoría ${
            category.is_active ? "desactivada" : "activada"
          } correctamente`
        );
      }
    );
  };

  const handleDeleteCategory = (category) => {
    // Verificar si tiene subcategorías
    const hasChildren = categories.some((c) => c.parent_id === category.id);

    if (hasChildren) {
      ModalManager.error(
        "No se puede eliminar una categoría que tiene subcategorías. Elimina o reasigna las subcategorías primero."
      );
      return;
    }

    ModalManager.confirm(
      `¿Estás seguro de eliminar la categoría "${category.category_name}"? Esta acción no se puede deshacer.`,
      () => {
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === category.id
              ? {
                  ...cat,
                  deleted_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }
              : cat
          )
        );
        ModalManager.success("Categoría eliminada correctamente");
      }
    );
  };

  const handleCreateSubcategory = (parentCategory) => {
    setSelectedCategory({
      parent_id: parentCategory.id,
      is_active: true,
      sort_order: 0,
    });
    setIsModalOpen(true);
  };

  const getFilteredCategories = () => {
    const term = filters.search.trim().toLowerCase();

    return categories.filter((category) => {
      // Filtro por categoría padre
      if (filters.parentCategory) {
        if (filters.parentCategory === "root") {
          if (category.parent_id !== null) return false;
        } else {
          if (category.parent_id !== parseInt(filters.parentCategory, 10))
            return false;
        }
      }

      // Filtro por estado
      if (filters.status !== "") {
        const isActive = filters.status === "1";
        if (category.is_active !== isActive) return false;
      }

      // Filtro por nivel
      if (filters.level !== "") {
        if (category.category_level !== parseInt(filters.level, 10))
          return false;
      }

      // Filtro por texto: código y nombre
      if (term) {
        const haystack = [category.category_code, category.category_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(term)) return false;
      }

      return true;
    });
  };

  const getPaginatedCategories = () => {
    const filtered = getFilteredCategories();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getStatistics = () => {
    const filtered = getFilteredCategories();
    return {
      total: filtered.length,
      active: filtered.filter((c) => c.is_active).length,
      inactive: filtered.filter((c) => !c.is_active).length,
      root: filtered.filter((c) => !c.parent_id).length,
      withChildren: filtered.filter((c) =>
        categories.some((child) => child.parent_id === c.id)
      ).length,
    };
  };

  const stats = getStatistics();
  const paginatedCategories = getPaginatedCategories();
  const totalPages = Math.ceil(getFilteredCategories().length / itemsPerPage);

  // Obtener lista de categorías padre para filtro
  const parentCategories = categories.filter((c) => c.is_active);

  return (
    <div className="min-h-screen pt-2 -mt-10">
      <div className="max-w-[100%] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b-2 border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Icon name="folder" className="text-blue-600 text-3xl" />
              Gestión de Categorías
            </h1>
            <p className="text-gray-500 text-sm">
              Administra categorías de productos con jerarquía
            </p>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Toggle Vista */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("table")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === "table"
                    ? "bg-white text-blue-600 shadow"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon name="list" className="inline mr-1" />
                Tabla
              </button>
              <button
                onClick={() => setViewMode("tree")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === "tree"
                    ? "bg-white text-blue-600 shadow"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon name="folder" className="inline mr-1" />
                Árbol
              </button>
            </div>

            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-all hover:-translate-y-0.5 hover:shadow-lg whitespace-nowrap"
            >
              <Icon name="plus" className="text-lg" />
              Crear Categoría
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Categorías</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon name="folder" className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activas</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.active}
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
                <p className="text-sm text-gray-600">Inactivas</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.inactive}
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
                <p className="text-sm text-gray-600">Categorías Raíz</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.root}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icon name="folder" className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Con Subcategorías</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.withChildren}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Icon name="list" className="text-orange-600 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <CategoryFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          parentCategories={parentCategories}
        />

        {/* Vista: Tabla o Árbol */}
        {viewMode === "table" ? (
          <>
            <CategoryTable
              categories={paginatedCategories}
              allCategories={categories}
              onEdit={openModal}
              onCreateSubcategory={handleCreateSubcategory}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDeleteCategory}
            />

            {/* Paginación */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        ) : (
          <CategoryTree
            categories={getFilteredCategories()}
            onEdit={openModal}
            onCreateSubcategory={handleCreateSubcategory}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDeleteCategory}
          />
        )}
      </div>

      {/* Modal de Categoría */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveCategory}
        category={selectedCategory}
        categories={categories}
      />
    </div>
  );
};

export default CategoryManagement;