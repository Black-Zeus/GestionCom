import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";

const CategoryModal = ({ isOpen, onClose, onSave, category, categories }) => {
  const [formData, setFormData] = useState({
    category_code: "",
    category_name: "",
    category_description: "",
    parent_id: null,
    sort_order: 0,
    is_active: true,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (category) {
      setFormData({
        category_code: category.category_code || "",
        category_name: category.category_name || "",
        category_description: category.category_description || "",
        parent_id: category.parent_id || null,
        sort_order: category.sort_order || 0,
        is_active: category.is_active !== undefined ? category.is_active : true,
      });
    } else {
      setFormData({
        category_code: "",
        category_name: "",
        category_description: "",
        parent_id: null,
        sort_order: 0,
        is_active: true,
      });
    }
    setErrors({});
  }, [category, isOpen]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpiar error del campo
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const generateCategoryCode = (name) => {
    // Generar código automático basado en el nombre
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 10);
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.category_name.trim()) {
      newErrors.category_name = "El nombre es obligatorio";
    }

    // Generar código si no existe (solo para nuevas categorías)
    if (!category && !formData.category_code) {
      const autoCode = generateCategoryCode(formData.category_name);
      setFormData((prev) => ({ ...prev, category_code: autoCode }));
    }

    // Validar código único
    if (formData.category_code) {
      const isDuplicate = categories.some(
        (cat) =>
          cat.category_code === formData.category_code &&
          (!category || cat.id !== category.id)
      );
      if (isDuplicate) {
        newErrors.category_code = "El código ya existe";
      }
    }

    // Validar que no se seleccione a sí misma como padre
    if (category && formData.parent_id === category.id) {
      newErrors.parent_id = "Una categoría no puede ser su propio padre";
    }

    // Validar que no se cree un ciclo en la jerarquía
    if (category && formData.parent_id) {
      const checkCycle = (parentId, visited = new Set()) => {
        if (visited.has(parentId)) return true;
        if (parentId === category.id) return true;

        visited.add(parentId);
        const parent = categories.find((c) => c.id === parentId);
        if (parent && parent.parent_id) {
          return checkCycle(parent.parent_id, visited);
        }
        return false;
      };

      if (checkCycle(formData.parent_id)) {
        newErrors.parent_id = "Esta selección crearía un ciclo en la jerarquía";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      const dataToSave = { ...formData };

      // Generar código si no existe
      if (!dataToSave.category_code) {
        dataToSave.category_code = generateCategoryCode(
          dataToSave.category_name
        );
      }

      // Convertir parent_id a número o null
      dataToSave.parent_id = dataToSave.parent_id
        ? parseInt(dataToSave.parent_id, 10)
        : null;

      onSave(dataToSave);
    }
  };

  const getAvailableParents = () => {
    // Excluir la categoría actual y sus descendientes
    if (!category) return categories.filter((c) => c.is_active);

    const getDescendants = (categoryId) => {
      const descendants = new Set([categoryId]);
      const findChildren = (parentId) => {
        categories
          .filter((c) => c.parent_id === parentId)
          .forEach((child) => {
            descendants.add(child.id);
            findChildren(child.id);
          });
      };
      findChildren(categoryId);
      return descendants;
    };

    const excludedIds = getDescendants(category.id);

    return categories.filter(
      (c) => c.is_active && !excludedIds.has(c.id)
    );
  };

  if (!isOpen) return null;

  const availableParents = getAvailableParents();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white px-8 py-6 border-b-2 border-gray-200 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Icon
                  name="folder"
                  className="text-blue-600 text-2xl"
                />
                {category ? "Editar Categoría" : "Nueva Categoría"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {category
                  ? "Modifica los datos de la categoría"
                  : "Completa la información de la nueva categoría"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
            >
              <Icon name="close" className="text-2xl" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-6">
          {/* Código */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código de Categoría
            </label>
            <input
              type="text"
              value={formData.category_code}
              onChange={(e) =>
                handleChange("category_code", e.target.value.toUpperCase())
              }
              placeholder={category ? "" : "Se generará automáticamente"}
              disabled={!!category}
              className={`w-full px-4 py-2.5 border-2 rounded-lg text-sm focus:outline-none transition-all ${
                category
                  ? "bg-gray-50 text-gray-500 cursor-not-allowed"
                  : errors.category_code
                  ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  : "border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              }`}
            />
            {errors.category_code && (
              <p className="mt-1 text-xs text-red-600">
                {errors.category_code}
              </p>
            )}
            {!category && (
              <p className="text-xs text-gray-500 mt-1">
                Se generará automáticamente basado en el nombre
              </p>
            )}
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Categoría *
            </label>
            <input
              type="text"
              value={formData.category_name}
              onChange={(e) => handleChange("category_name", e.target.value)}
              placeholder="Ej: Electrónica"
              className={`w-full px-4 py-2.5 border-2 rounded-lg text-sm focus:outline-none transition-all ${
                errors.category_name
                  ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  : "border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              }`}
            />
            {errors.category_name && (
              <p className="mt-1 text-xs text-red-600">
                {errors.category_name}
              </p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.category_description}
              onChange={(e) =>
                handleChange("category_description", e.target.value)
              }
              placeholder="Descripción opcional de la categoría"
              rows={3}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
            />
          </div>

          {/* Categoría Padre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría Padre
            </label>
            <select
              value={formData.parent_id || ""}
              onChange={(e) =>
                handleChange("parent_id", e.target.value || null)
              }
              className={`w-full px-4 py-2.5 border-2 rounded-lg text-sm focus:outline-none transition-all ${
                errors.parent_id
                  ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  : "border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              }`}
            >
              <option value="">Sin padre (Categoría raíz)</option>
              {availableParents.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.category_path
                    ? `${cat.category_path.replace(/\//g, " > ")} > ${
                        cat.category_name
                      }`
                    : cat.category_name}
                </option>
              ))}
            </select>
            {errors.parent_id && (
              <p className="mt-1 text-xs text-red-600">{errors.parent_id}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Selecciona una categoría padre para crear una subcategoría
            </p>
          </div>

          {/* Orden */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Orden de Visualización
            </label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) =>
                handleChange("sort_order", parseInt(e.target.value, 10) || 0)
              }
              min="0"
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">
              Número de orden (menor = aparece primero)
            </p>
          </div>

          {/* Estado */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleChange("is_active", e.target.checked)}
              className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-4 focus:ring-blue-100"
            />
            <label
              htmlFor="is_active"
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
              Categoría activa
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-8 py-4 border-t-2 border-gray-200 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium flex items-center gap-2"
          >
            <Icon name="save" className="text-lg" />
            {category ? "Actualizar" : "Crear"} Categoría
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryModal;