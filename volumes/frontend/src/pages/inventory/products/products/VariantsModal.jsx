import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";

const VariantsModal = ({
  product,
  variants: initialVariants,
  attributes,
  attributeGroups,
  attributeValues,
  measurementUnits,
  onSave,
  onClose,
}) => {
  const [variants, setVariants] = useState(initialVariants || []);
  const [editingVariant, setEditingVariant] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    variant_sku: "",
    variant_name: "",
    variant_description: "",
    is_default_variant: false,
    is_active: true,
  });

  useEffect(() => {
    if (editingVariant) {
      setFormData({
        variant_sku: editingVariant.variant_sku || "",
        variant_name: editingVariant.variant_name || "",
        variant_description: editingVariant.variant_description || "",
        is_default_variant: editingVariant.is_default_variant || false,
        is_active: editingVariant.is_active !== undefined ? editingVariant.is_active : true,
      });
      setShowForm(true);
    }
  }, [editingVariant]);

  const handleAddNew = () => {
    setEditingVariant(null);
    setFormData({
      variant_sku: "",
      variant_name: "",
      variant_description: "",
      is_default_variant: false,
      is_active: true,
    });
    setShowForm(true);
  };

  const handleEdit = (variant) => {
    setEditingVariant(variant);
  };

  const handleDelete = (variantId) => {
    if (confirm("¿Estás seguro de eliminar esta variante?")) {
      setVariants(variants.filter((v) => v.id !== variantId));
    }
  };

  const handleSaveVariant = () => {
    if (!formData.variant_sku.trim() || !formData.variant_name.trim()) {
      alert("SKU y nombre son obligatorios");
      return;
    }

    if (editingVariant) {
      // Editar variante existente
      setVariants(
        variants.map((v) =>
          v.id === editingVariant.id
            ? { ...v, ...formData, updated_at: new Date().toISOString() }
            : v
        )
      );
    } else {
      // Crear nueva variante
      const newVariant = {
        id: Math.max(...variants.map((v) => v.id), 0) + 1,
        product_id: product.id,
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setVariants([...variants, newVariant]);
    }

    setShowForm(false);
    setEditingVariant(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingVariant(null);
  };

  const handleSaveAll = () => {
    onSave(variants);
  };

  return (
    <div className="p-6">
      {/* Header con acciones */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Producto: {product.product_name}
          </h3>
          <p className="text-sm text-gray-500">
            Código: {product.product_code}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={handleAddNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <Icon name="plus" className="text-sm" />
            Agregar Variante
          </button>
        )}
      </div>

      {/* Formulario de variante */}
      {showForm && (
        <div className="bg-blue-50 rounded-lg p-6 mb-6 border-2 border-blue-200">
          <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">
            {editingVariant ? "Editar Variante" : "Nueva Variante"}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.variant_sku}
                onChange={(e) =>
                  setFormData({ ...formData, variant_sku: e.target.value })
                }
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                placeholder="Ej: PROD-001-V1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.variant_name}
                onChange={(e) =>
                  setFormData({ ...formData, variant_name: e.target.value })
                }
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                placeholder="Ej: Talla L - Color Azul"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.variant_description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    variant_description: e.target.value,
                  })
                }
                rows="2"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 resize-none"
                placeholder="Descripción de la variante..."
              />
            </div>

            <div className="md:col-span-2 flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_default_variant}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      is_default_variant: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Variante por defecto</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Activa</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveVariant}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <Icon name="save" className="text-sm" />
              {editingVariant ? "Actualizar" : "Agregar"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de variantes */}
      {variants.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Icon name="inbox" className="text-4xl mb-4 block" />
          <p>No hay variantes configuradas</p>
          <p className="text-sm mt-2">Agrega la primera variante del producto</p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {variants.map((variant) => (
            <div
              key={variant.id}
              className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-mono font-semibold text-gray-900">
                      {variant.variant_sku}
                    </span>
                    {variant.is_default_variant && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                        Por Defecto
                      </span>
                    )}
                    {variant.is_active ? (
                      <span className="text-xs text-green-600 font-medium">
                        Activa
                      </span>
                    ) : (
                      <span className="text-xs text-red-600 font-medium">
                        Inactiva
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                    {variant.variant_name}
                  </h4>
                  {variant.variant_description && (
                    <p className="text-xs text-gray-500">
                      {variant.variant_description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(variant)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Icon name="edit" className="text-lg" />
                  </button>
                  <button
                    onClick={() => handleDelete(variant.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Icon name="delete" className="text-lg" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200">
        <button
          onClick={onClose}
          className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all font-medium"
        >
          Cancelar
        </button>
        <button
          onClick={handleSaveAll}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium flex items-center gap-2"
        >
          <Icon name="save" className="text-lg" />
          Guardar Todos los Cambios
        </button>
      </div>
    </div>
  );
};

export default VariantsModal;