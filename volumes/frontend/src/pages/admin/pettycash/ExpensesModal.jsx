import React, { useState, useEffect } from 'react';
import { Icon } from "@components/ui/icon/iconManager";

const ExpensesModal = ({ isOpen, onClose, fund, expenses, categories, onSaveExpense }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category_id: '',
    expense_amount: '',
    expense_description: '',
    vendor_name: '',
    expense_date: new Date().toISOString().split('T')[0],
    has_receipt: false,
    evidence_file: null,
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
      category_id: '',
      expense_amount: '',
      expense_description: '',
      vendor_name: '',
      expense_date: new Date().toISOString().split('T')[0],
      has_receipt: false,
      evidence_file: null,
    });
    setErrors({});
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData((prev) => ({ ...prev, evidence_file: file }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.category_id) {
      newErrors.category_id = 'La categoría es requerida';
    }

    if (!formData.expense_amount || formData.expense_amount <= 0) {
      newErrors.expense_amount = 'El monto debe ser mayor a 0';
    }

    const selectedCategory = categories.find((c) => c.id === parseInt(formData.category_id));
    if (selectedCategory && selectedCategory.max_amount_per_expense && parseFloat(formData.expense_amount) > selectedCategory.max_amount_per_expense) {
      newErrors.expense_amount = `El monto excede el máximo permitido de ${formatCurrency(selectedCategory.max_amount_per_expense)}`;
    }

    if (!formData.expense_description || formData.expense_description.trim() === '') {
      newErrors.expense_description = 'La descripción es requerida';
    }

    if (!formData.expense_date) {
      newErrors.expense_date = 'La fecha es requerida';
    }

    if (selectedCategory && selectedCategory.requires_evidence && !formData.has_receipt && !formData.evidence_file) {
      newErrors.has_receipt = 'Esta categoría requiere comprobante obligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSaveExpense({
        ...formData,
        petty_cash_fund_id: fund.id,
        expense_amount: parseFloat(formData.expense_amount),
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

  const formatDate = (dateString) => {
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(dateString));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'text-green-600 bg-green-50';
      case 'PENDING': return 'text-yellow-600 bg-yellow-50';
      case 'REJECTED': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'APPROVED': return 'Aprobado';
      case 'PENDING': return 'Pendiente';
      case 'REJECTED': return 'Rechazado';
      default: return status;
    }
  };

  const fundExpenses = expenses.filter((exp) => exp.petty_cash_fund_id === fund?.id);
  const totalExpenses = fundExpenses.reduce((sum, exp) => sum + exp.expense_amount, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[95%] max-w-[1400px] h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start p-6 border-b-2 border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 m-0 mb-1">Gastos de Fondo: {fund?.fund_code}</h2>
            <p className="text-sm text-gray-600 m-0">Bodega: {fund?.warehouse_name} | Responsable: {fund?.responsible_user_name}</p>
          </div>
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all" onClick={onClose}>
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          
            <>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Categoría</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Descripción</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Proveedor</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Monto</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Comprobante</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {fundExpenses.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">No hay gastos registrados para este fondo</td>
                      </tr>
                    ) : (
                      fundExpenses.map((expense) => (
                        <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(expense.expense_date)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.category_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{expense.expense_description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.vendor_name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">{formatCurrency(expense.expense_amount)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {expense.has_receipt ? (
                              <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                                <Icon name="checkCircle" className="text-base" /> Sí
                              </span>
                            ) : (
                              <span className="text-gray-500">No</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(expense.status)}`}>
                              {getStatusText(expense.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-sm font-semibold text-gray-700 text-right">Total Gastado:</td>
                      <td colSpan="3" className="px-6 py-4 text-base font-bold text-red-600">{formatCurrency(totalExpenses)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          
        </div>
      </div>
    </div>
  );
};

export default ExpensesModal;