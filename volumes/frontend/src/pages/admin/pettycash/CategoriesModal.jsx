import React, { useState, useEffect } from 'react';
import { Icon } from "@components/ui/icon/iconManager";

const CategoriesModal = ({ isOpen, onClose, categories, onSaveCategory, onToggleCategory }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    category_code: '',
    category_name: '',
    category_description: '',
    max_amount_per_expense: '',
    requires_evidence: false,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) {
      setShowForm(false);
      setEditingCategory(null);
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      category_code: '',
      category_name: '',
      category_description: '',
      max_amount_per_expense: '',
      requires_evidence: false,
    });
    setErrors({});
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      category_code: category.category_code,
      category_name: category.category_name,
      category_description: category.category_description || '',
      max_amount_per_expense: category.max_amount_per_expense || '',
      requires_evidence: category.requires_evidence,
    });
    setShowForm(true);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const generateCategoryCode = () => {
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CAT-${random}`;
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.category_name || formData.category_name.trim() === '') {
      newErrors.category_name = 'El nombre es requerido';
    }
    if (formData.max_amount_per_expense && (isNaN(formData.max_amount_per_expense) || formData.max_amount_per_expense <= 0)) {
      newErrors.max_amount_per_expense = 'El monto debe ser mayor a 0';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      const categoryData = {
        ...formData,
        max_amount_per_expense: formData.max_amount_per_expense ? parseFloat(formData.max_amount_per_expense) : null,
      };

      if (editingCategory) {
        onSaveCategory({ ...categoryData, id: editingCategory.id });
      } else {
        onSaveCategory({ ...categoryData, category_code: generateCategoryCode(), is_active: true });
      }

      setShowForm(false);
      setEditingCategory(null);
      resetForm();
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
  };

  const getStatusText = (isActive) => {
    return isActive ? 'Activo' : 'Inactivo';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[95%] max-w-[1200px] h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b-2 border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 m-0">Gestión de Categorías de Gastos</h2>
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all" onClick={onClose}>
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!showForm ? (
            <>
              <div className="flex justify-end mb-6">
                <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center gap-2" onClick={() => { setEditingCategory(null); resetForm(); setShowForm(true); }}>
                  <Icon name="plus" className="text-lg" />
                  Nueva Categoría
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Código</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nombre</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Descripción</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Monto Máximo</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Req. Comprobante</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">No hay categorías registradas</td>
                      </tr>
                    ) : (
                      categories.map((category) => (
                        <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-semibold text-blue-600">{category.category_code}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{category.category_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{category.category_description || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(category.max_amount_per_expense)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {category.requires_evidence ? (
                              <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                                <Icon name="checkCircle" className="text-base" /> Sí
                              </span>
                            ) : (
                              <span className="text-gray-500">No</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(category.is_active)}`}>
                              {getStatusText(category.is_active)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" onClick={() => handleEdit(category)} title="Editar categoría">
                                <Icon name="edit" className="text-lg" />
                              </button>
                              <button className={`p-2 rounded-lg transition-all ${category.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`} onClick={() => onToggleCategory(category)} title={category.is_active ? 'Desactivar' : 'Activar'}>
                                <Icon name={category.is_active ? 'ban' : 'checkCircle'} className="text-lg" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="max-w-3xl mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</h3>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex flex-col">
                  <label className="mb-2 text-gray-900 font-medium text-sm">Código de Categoría</label>
                  <input type="text" value={editingCategory ? formData.category_code : 'Se generará automáticamente'} disabled className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
                  <p className="text-xs text-gray-500 mt-1">{editingCategory ? 'El código no se puede modificar' : 'Se asignará al crear la categoría'}</p>
                </div>

                <div className="flex flex-col">
                  <label className="mb-2 text-gray-900 font-medium text-sm">Nombre de la Categoría *</label>
                  <input type="text" value={formData.category_name} onChange={(e) => handleChange('category_name', e.target.value)} placeholder="Ej: Materiales de Oficina" className={`px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all ${errors.category_name ? 'border-red-500' : 'border-gray-200'}`} />
                  {errors.category_name && <p className="mt-1 text-sm text-red-600">{errors.category_name}</p>}
                </div>

                <div className="flex flex-col col-span-2">
                  <label className="mb-2 text-gray-900 font-medium text-sm">Descripción</label>
                  <textarea value={formData.category_description} onChange={(e) => handleChange('category_description', e.target.value)} placeholder="Describa los tipos de gastos incluidos en esta categoría" rows="3" className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all resize-none"></textarea>
                </div>

                <div className="flex flex-col">
                  <label className="mb-2 text-gray-900 font-medium text-sm">Monto Máximo por Gasto</label>
                  <input type="number" value={formData.max_amount_per_expense} onChange={(e) => handleChange('max_amount_per_expense', e.target.value)} placeholder="Opcional - límite por gasto individual" min="0" step="1000" className={`px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all ${errors.max_amount_per_expense ? 'border-red-500' : 'border-gray-200'}`} />
                  {errors.max_amount_per_expense && <p className="mt-1 text-sm text-red-600">{errors.max_amount_per_expense}</p>}
                  <p className="text-xs text-gray-500 mt-1">Dejar vacío si no hay límite</p>
                </div>

                <div className="flex flex-col">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-900 cursor-pointer">
                    <input type="checkbox" checked={formData.requires_evidence} onChange={(e) => handleChange('requires_evidence', e.target.checked)} className="w-5 h-5 cursor-pointer" />
                    Requiere comprobante obligatorio
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Los gastos de esta categoría deberán adjuntar comprobante</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                <button className="px-6 py-2.5 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-all" onClick={() => { setShowForm(false); setEditingCategory(null); resetForm(); }}>Cancelar</button>
                <button className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all" onClick={handleSubmit}>
                  {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoriesModal;