import React, { useState, useEffect } from 'react';
import { Icon } from "@components/ui/icon/iconManager";

const ReplenishmentsModal = ({ isOpen, onClose, fund, replenishments, onSaveReplenishment, currentUser }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    replenishment_amount: '',
    replenishment_reason: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) {
      setShowForm(false);
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      replenishment_amount: '',
      replenishment_reason: '',
    });
    setErrors({});
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.replenishment_amount || formData.replenishment_amount <= 0) {
      newErrors.replenishment_amount = 'El monto debe ser mayor a 0';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSaveReplenishment({
        ...formData,
        petty_cash_fund_id: fund.id,
        replenishment_amount: parseFloat(formData.replenishment_amount),
        previous_balance: fund.current_balance,
        new_balance: fund.current_balance + parseFloat(formData.replenishment_amount),
      });
      setShowForm(false);
      resetForm();
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateTime = (dateString) => {
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const fundReplenishments = replenishments.filter((rep) => rep.petty_cash_fund_id === fund?.id);
  const newBalance = formData.replenishment_amount && !isNaN(formData.replenishment_amount) ? fund?.current_balance + parseFloat(formData.replenishment_amount) : fund?.current_balance;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[95%] max-w-[1400px] h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 m-0 mb-1">Reposiciones de Fondo: {fund?.fund_code}</h2>
            <p className="text-sm text-gray-600 m-0">Bodega: {fund?.warehouse_name} | Responsable: {fund?.responsible_user_name}</p>
          </div>
          <button className="flex items-center justify-center w-8 h-8 border-0 bg-gray-100 rounded-lg cursor-pointer transition-all text-gray-600 hover:bg-gray-200 hover:text-gray-900" onClick={onClose}>
            <Icon name="close" className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!showForm ? (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6 max-md:grid-cols-1">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-5 rounded-xl border border-gray-200">
                  <div className="text-xs text-gray-600 font-medium mb-2 uppercase tracking-wide">Saldo Actual</div>
                  <div className="text-3xl font-bold text-purple-600">{formatCurrency(fund?.current_balance || 0)}</div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-5 rounded-xl border border-gray-200">
                  <div className="text-xs text-gray-600 font-medium mb-2 uppercase tracking-wide">Total Gastado</div>
                  <div className="text-3xl font-bold text-red-500">{formatCurrency(fund?.total_expenses || 0)}</div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-5 rounded-xl border border-gray-200">
                  <div className="text-xs text-gray-600 font-medium mb-2 uppercase tracking-wide">Total Reposiciones</div>
                  <div className="text-3xl font-bold text-green-600">{formatCurrency(fund?.total_replenishments || 0)}</div>
                </div>
              </div>

              <div className="flex justify-end mb-5">
                <button className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white border-0 rounded-lg text-sm font-medium cursor-pointer transition-all hover:bg-purple-700" onClick={() => setShowForm(true)}>
                  <Icon name="cash" className="w-4 h-4" />
                  Nueva Reposición
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide border-b-2 border-gray-200">Fecha</th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide border-b-2 border-gray-200">Monto</th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide border-b-2 border-gray-200">Saldo Anterior</th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide border-b-2 border-gray-200">Saldo Nuevo</th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide border-b-2 border-gray-200">Autorizado Por</th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide border-b-2 border-gray-200">Razón</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fundReplenishments.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-12 text-center text-gray-400 italic">No hay reposiciones registradas para este fondo</td>
                      </tr>
                    ) : (
                      fundReplenishments.map((replenishment) => (
                        <tr key={replenishment.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm text-gray-900">{formatDateTime(replenishment.created_at)}</td>
                          <td className="px-4 py-4 text-sm font-semibold text-green-600">{formatCurrency(replenishment.replenishment_amount)}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{formatCurrency(replenishment.previous_balance)}</td>
                          <td className="px-4 py-4 text-sm font-semibold text-purple-600">{formatCurrency(replenishment.new_balance)}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{replenishment.authorized_by_user_name}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{replenishment.replenishment_reason || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="max-w-3xl mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Registrar Nueva Reposición</h3>

              <div className="flex items-center justify-center gap-6 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl mb-6 max-md:flex-col">
                <div className="text-center">
                  <div className="text-xs text-gray-600 font-medium mb-2 uppercase tracking-wide">Saldo Actual</div>
                  <div className="text-3xl font-bold text-blue-500">{formatCurrency(fund?.current_balance || 0)}</div>
                </div>
                <div className="text-gray-400">
                  <Icon name="arrowRight" className="w-7 h-7 max-md:rotate-90" />
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600 font-medium mb-2 uppercase tracking-wide">Nuevo Saldo</div>
                  <div className="text-3xl font-bold text-purple-600">{formatCurrency(newBalance || 0)}</div>
                </div>
              </div>

              <div className="flex flex-col gap-5 mb-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">Monto a Reponer <span className="text-red-500">*</span></label>
                  <input type="number" value={formData.replenishment_amount} onChange={(e) => handleChange('replenishment_amount', e.target.value)} placeholder="Ingrese el monto a reponer" min="0" step="1000" className={`px-3.5 py-2.5 border rounded-lg text-sm text-gray-900 transition-all ${errors.replenishment_amount ? 'border-red-500' : 'border-gray-200'}`} />
                  {errors.replenishment_amount && <span className="text-xs text-red-500">{errors.replenishment_amount}</span>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">Razón de la Reposición</label>
                  <textarea value={formData.replenishment_reason} onChange={(e) => handleChange('replenishment_reason', e.target.value)} placeholder="Describa el motivo de la reposición (opcional)" rows="3" className="px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 transition-all"></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
                <button className="px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</button>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all bg-purple-600 text-white border-0 hover:bg-purple-700" onClick={handleSubmit}>
                  <Icon name="checkCircle" className="w-4 h-4" />
                  Guardar Reposición
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReplenishmentsModal;