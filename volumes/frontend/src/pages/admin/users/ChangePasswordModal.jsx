// ====================================
// volumes/frontend/src/pages/admin/users/ChangePasswordModal.jsx
// Modal de cambio de contraseña usando ModalManager
// ====================================

import React, { useState, useEffect } from 'react';
import ModalManager from '@/components/ui/modal/ModalManager';

// =======================
// Componente Principal
// =======================
const ChangePasswordModal = ({ isOpen, onClose, onSave, user }) => {
  const [modalId, setModalId] = useState(null);

  // Crear modal cuando se abre
  useEffect(() => {
    if (isOpen && !modalId) {
      const id = ModalManager.custom({
        title: `Cambiar Contraseña: ${user?.username || 'Usuario'}`,
        content: <PasswordFormContent user={user} onClose={onClose} onSave={onSave} />,
        size: "medium",
        showCloseButton: true,
        onClose: onClose,
        footer: null,
      });
      setModalId(id);
    } else if (!isOpen && modalId) {
      ModalManager.close(modalId);
      setModalId(null);
    }
  }, [isOpen, user, onClose, onSave, modalId]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (modalId) {
        ModalManager.close(modalId);
      }
    };
  }, [modalId]);

  return null;
};

// =======================
// Componente del Formulario (separado para manejar sus propios estados)
// =======================
const PasswordFormContent = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
    reason: ''
  });
  
  const [showPassword, setShowPassword] = useState({
    new: false,
    confirm: false
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar errores cuando el usuario comienza a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.newPassword) {
      newErrors.newPassword = 'La nueva contraseña es requerida';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirme la nueva contraseña';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'El motivo del cambio es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsSubmitting(true);
      try {
        await onSave(formData);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Info del usuario */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Usuario:</strong> {user?.fullName || user?.username}
        </p>
        <p className="text-sm text-blue-600 dark:text-blue-300">
          {user?.email}
        </p>
      </div>

      {/* Nueva contraseña */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Nueva Contraseña
        </label>
        <div className="relative">
          <input
            type={showPassword.new ? 'text' : 'password'}
            value={formData.newPassword}
            onChange={(e) => handleChange('newPassword', e.target.value)}
            className={`block w-full px-3 py-2 pr-10 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.newPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Ingrese la nueva contraseña"
          />
          <button
            type="button"
            onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            {showPassword.new ? '🙈' : '👁️'}
          </button>
        </div>
        {errors.newPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
        )}
      </div>

      {/* Confirmar contraseña */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Confirmar Contraseña
        </label>
        <div className="relative">
          <input
            type={showPassword.confirm ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            className={`block w-full px-3 py-2 pr-10 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Confirme la nueva contraseña"
          />
          <button
            type="button"
            onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            {showPassword.confirm ? '🙈' : '👁️'}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Motivo del cambio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Motivo del Cambio
        </label>
        <textarea
          value={formData.reason}
          onChange={(e) => handleChange('reason', e.target.value)}
          rows={3}
          className={`block w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
            errors.reason ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder="Indique el motivo del cambio de contraseña..."
        />
        {errors.reason && (
          <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
        )}
      </div>

      {/* Botones */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Cambiando...' : 'Cambiar Contraseña'}
        </button>
      </div>
    </form>
  );
};

export default ChangePasswordModal;