import React, { useState, useEffect } from 'react';
import { Icon } from "@components/ui/icon/iconManager";

const PettyCashModal = ({ isOpen, onClose, onSave, fund, warehouses, users }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    fund_code: '',
    warehouse_id: '',
    responsible_user_id: '',
    initial_amount: '',
    fund_status: 'ACTIVE',
    last_replenishment_date: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (fund) {
      setFormData({
        fund_code: fund.fund_code,
        warehouse_id: fund.warehouse_id,
        responsible_user_id: fund.responsible_user_id,
        initial_amount: fund.initial_amount,
        fund_status: fund.fund_status,
        last_replenishment_date: fund.last_replenishment_date || '',
      });
    } else {
      setFormData({
        fund_code: generateFundCode(),
        warehouse_id: '',
        responsible_user_id: '',
        initial_amount: '',
        fund_status: 'ACTIVE',
        last_replenishment_date: '',
      });
    }
    setErrors({});
    setActiveTab('general');
  }, [fund, isOpen]);

  const generateFundCode = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CC-${random}-${year}`;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.warehouse_id) {
      newErrors.warehouse_id = 'La bodega es requerida';
    }
    if (!formData.responsible_user_id) {
      newErrors.responsible_user_id = 'El responsable es requerido';
    }
    if (!formData.initial_amount || formData.initial_amount <= 0) {
      newErrors.initial_amount = 'El monto inicial debe ser mayor a 0';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSave({ ...formData, initial_amount: parseFloat(formData.initial_amount) });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No disponible';
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 m-0">{fund ? 'Editar Fondo' : 'Crear Nuevo Fondo'}</h2>
          <button className="flex items-center justify-center w-8 h-8 border-0 bg-gray-100 rounded-lg cursor-pointer transition-all text-gray-600 hover:bg-gray-200 hover:text-gray-900" onClick={onClose}>
            <Icon name="close" className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 px-6 bg-gray-50">
          <button className={`flex items-center gap-2 px-5 py-3.5 border-0 bg-transparent text-gray-600 text-sm font-medium cursor-pointer border-b-2 transition-all ${activeTab === 'general' ? 'text-blue-500 border-blue-500' : 'border-transparent hover:text-blue-500'}`} onClick={() => setActiveTab('general')}>
            <Icon name="info" className="w-4 h-4" />
            Información General
          </button>
          <button className={`flex items-center gap-2 px-5 py-3.5 border-0 bg-transparent text-gray-600 text-sm font-medium cursor-pointer border-b-2 transition-all ${activeTab === 'config' ? 'text-blue-500 border-blue-500' : 'border-transparent hover:text-blue-500'}`} onClick={() => setActiveTab('config')}>
            <Icon name="settings" className="w-4 h-4" />
            Configuración
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Código de Fondo</label>
                <input type="text" value={formData.fund_code} disabled className="px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 transition-all bg-gray-50 text-gray-600 cursor-not-allowed" />
                <span className="text-xs text-gray-600 italic">Código generado automáticamente</span>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Bodega <span className="text-red-500">*</span></label>
                <select value={formData.warehouse_id} onChange={(e) => handleChange('warehouse_id', e.target.value)} className={`px-3.5 py-2.5 border rounded-lg text-sm text-gray-900 transition-all ${errors.warehouse_id ? 'border-red-500' : 'border-gray-200'}`}>
                  <option value="">Seleccione una bodega</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                  ))}
                </select>
                {errors.warehouse_id && <span className="text-xs text-red-500">{errors.warehouse_id}</span>}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Usuario Responsable <span className="text-red-500">*</span></label>
                <select value={formData.responsible_user_id} onChange={(e) => handleChange('responsible_user_id', e.target.value)} className={`px-3.5 py-2.5 border rounded-lg text-sm text-gray-900 transition-all ${errors.responsible_user_id ? 'border-red-500' : 'border-gray-200'}`}>
                  <option value="">Seleccione un responsable</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
                {errors.responsible_user_id && <span className="text-xs text-red-500">{errors.responsible_user_id}</span>}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Monto Inicial <span className="text-red-500">*</span></label>
                <input type="number" value={formData.initial_amount} onChange={(e) => handleChange('initial_amount', e.target.value)} placeholder="Ingrese el monto inicial" min="0" step="1000" className={`px-3.5 py-2.5 border rounded-lg text-sm text-gray-900 transition-all ${errors.initial_amount ? 'border-red-500' : 'border-gray-200'}`} />
                {errors.initial_amount && <span className="text-xs text-red-500">{errors.initial_amount}</span>}
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Estado del Fondo</label>
                <select value={formData.fund_status} onChange={(e) => handleChange('fund_status', e.target.value)} disabled={!fund} className="px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 transition-all">
                  <option value="ACTIVE">Activo</option>
                  <option value="SUSPENDED">Suspendido</option>
                  <option value="CLOSED">Cerrado</option>
                </select>
                {!fund && <span className="text-xs text-gray-600 italic">El estado se puede modificar después de crear el fondo</span>}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Fecha Última Reposición</label>
                <input type="text" value={formatDate(formData.last_replenishment_date)} disabled className="px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 transition-all bg-gray-50 text-gray-600 cursor-not-allowed" />
                <span className="text-xs text-gray-600 italic">Se actualiza automáticamente al reponer fondos</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
          <button className="px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300" onClick={onClose}>Cancelar</button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all bg-blue-500 text-white border-0 hover:bg-blue-600" onClick={handleSubmit}>
            <Icon name="checkCircle" className="w-4 h-4" />
            {fund ? 'Guardar Cambios' : 'Crear Fondo'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PettyCashModal;