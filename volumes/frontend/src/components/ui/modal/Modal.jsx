/**
 * Modal.jsx
 * Componente de modal profesional con Tailwind CSS y soporte completo para dark mode
 * Incluye todos los tipos de modal del template HTML original
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, CheckCircle, AlertTriangle, XCircle, Info, Bell,
  Search, Calendar, Settings, HelpCircle, Edit3,
  Upload, Download, Play, Pause, Square, ChevronLeft,
  ChevronRight, User, Lock, Eye, Folder, Image,
  Video, FileText, MoreHorizontal, Loader2
} from 'lucide-react';

// ====================================
// CONFIGURACIÓN DE ICONOS
// ====================================

const MODAL_ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  danger: XCircle,
  notification: Bell,
  search: Search,
  calendar: Calendar,
  settings: Settings,
  help: HelpCircle,
  custom: Edit3,
  form: User,
  login: Lock,
  image: Image,
  video: Video,
  gallery: Image,
  filemanager: Folder,
  loading: Loader2,
  wizard: Settings
};

// ====================================
// CONFIGURACIÓN DE ESTILOS POR TIPO
// ====================================

const MODAL_STYLES = {
  info: {
    icon: 'text-blue-500 dark:text-blue-400',
    header: 'border-blue-100 dark:border-blue-900/30',
    alert: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800/30 dark:text-blue-200'
  },
  success: {
    icon: 'text-green-500 dark:text-green-400',
    header: 'border-green-100 dark:border-green-900/30',
    alert: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800/30 dark:text-green-200'
  },
  warning: {
    icon: 'text-yellow-500 dark:text-yellow-400',
    header: 'border-yellow-100 dark:border-yellow-900/30',
    alert: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800/30 dark:text-yellow-200'
  },
  error: {
    icon: 'text-red-500 dark:text-red-400',
    header: 'border-red-100 dark:border-red-900/30',
    alert: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-200'
  },
  danger: {
    icon: 'text-red-500 dark:text-red-400',
    header: 'border-red-100 dark:border-red-900/30',
    alert: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-200'
  }
};

// ====================================
// CONFIGURACIÓN DE TAMAÑOS
// ====================================

const MODAL_SIZES = {
  small: 'max-w-md',
  medium: 'max-w-lg',
  large: 'max-w-2xl',
  xlarge: 'max-w-4xl',
  fullscreen: 'max-w-7xl'
};

// ====================================
// COMPONENTE PRINCIPAL
// ====================================

const Modal = ({ 
  id,
  type = 'info',
  size = 'medium',
  title,
  message,
  content,
  icon,
  autoClose = false,
  backdrop = true,
  keyboard = true,
  animation = true,
  position = 'center',
  buttons = [],
  fields = [],
  steps = [],
  data = {},
  progress = 0,
  loading = false,
  onClose,
  onConfirm,
  onCancel,
  onSubmit,
  zIndex = 1000,
  className = '',
  ...props
}) => {
  // ====================================
  // ESTADOS DEL COMPONENTE
  // ====================================

  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(data || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentProgress, setCurrentProgress] = useState(progress);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  // ====================================
  // REFS
  // ====================================

  const modalRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const lastFocusableRef = useRef(null);

  // ====================================
  // EFECTOS
  // ====================================

  // Efecto para mostrar el modal con animación
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      setIsAnimating(true);
    }, 10);

    return () => clearTimeout(timer);
  }, []);

  // Efecto para actualizar el progreso
  useEffect(() => {
    setCurrentProgress(progress);
  }, [progress]);

  // Efecto para auto-cerrar
  useEffect(() => {
    if (autoClose && typeof autoClose === 'number') {
      const timer = setTimeout(() => {
        handleClose();
      }, autoClose);

      return () => clearTimeout(timer);
    }
  }, [autoClose]);

  // Efecto para manejar teclado
  useEffect(() => {
    if (!keyboard) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
      
      // Trap focus
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements && focusableElements.length > 0) {
          const first = focusableElements[0];
          const last = focusableElements[focusableElements.length - 1];
          
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [keyboard]);

  // Enfocar el primer elemento al montar
  useEffect(() => {
    if (isVisible && modalRef.current) {
      const firstFocusable = modalRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  }, [isVisible]);

  // ====================================
  // HANDLERS
  // ====================================

  const handleClose = useCallback(() => {
    if (isAnimating) {
      setIsAnimating(false);
      setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, 200);
    }
  }, [isAnimating, onClose]);

  const handleBackdropClick = useCallback((e) => {
    if (backdrop && e.target === e.currentTarget) {
      handleClose();
    }
  }, [backdrop, handleClose]);

  const handleConfirm = useCallback(() => {
    onConfirm?.(formData);
    handleClose();
  }, [onConfirm, formData, handleClose]);

  const handleCancel = useCallback(() => {
    onCancel?.();
    handleClose();
  }, [onCancel, handleClose]);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit?.(formData);
      handleClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, isSubmitting, handleClose]);

  const handleInputChange = useCallback((name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleNextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, steps.length]);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // ====================================
  // RENDERIZADO CONDICIONAL POR TIPO
  // ====================================

  const renderModalContent = () => {
    switch (type) {
      case 'form':
        return renderFormModal();
      case 'wizard':
        return renderWizardModal();
      case 'loading':
        return renderLoadingModal();
      case 'search':
        return renderSearchModal();
      case 'datatable':
        return renderDataTableModal();
      case 'calendar':
        return renderCalendarModal();
      case 'login':
        return renderLoginModal();
      case 'image':
        return renderImageModal();
      case 'video':
        return renderVideoModal();
      case 'gallery':
        return renderGalleryModal();
      case 'filemanager':
        return renderFileManagerModal();
      case 'settings':
        return renderSettingsModal();
      case 'help':
        return renderHelpModal();
      case 'custom':
        return renderCustomModal();
      default:
        return renderBasicModal();
    }
  };

  // ====================================
  // MODALES BÁSICOS
  // ====================================

  const renderBasicModal = () => {
    const IconComponent = icon ? MODAL_ICONS[icon] || MODAL_ICONS[type] : MODAL_ICONS[type];
    const styles = MODAL_STYLES[type] || MODAL_STYLES.info;

    return (
      <>
        {/* Body */}
        <div className="px-6 py-4">
          {(message || content) && (
            <>
              {/* Alert si hay estilo específico */}
              {(type !== 'confirm' && (type === 'info' || type === 'success' || type === 'warning' || type === 'error' || type === 'danger')) && (
                <div className={`p-4 rounded-lg border-l-4 mb-4 ${styles.alert}`}>
                  <div className="flex items-center">
                    {IconComponent && (
                      <IconComponent className={`w-5 h-5 mr-3 ${styles.icon}`} />
                    )}
                    <div>
                      <strong className="font-semibold">
                        {type === 'info' && 'Información'}
                        {type === 'success' && 'Éxito'}
                        {type === 'warning' && 'Advertencia'}
                        {type === 'error' && 'Error'}
                        {type === 'danger' && 'Peligro'}
                      </strong>
                      {message && (
                        <div className="mt-1">
                          {typeof message === 'string' ? (
                            <p>{message}</p>
                          ) : (
                            message
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Contenido personalizado */}
              {content && (
                <div className="text-gray-600 dark:text-gray-300">
                  {typeof content === 'string' ? (
                    <p className="leading-relaxed">{content}</p>
                  ) : (
                    content
                  )}
                </div>
              )}

              {/* Mensaje para confirm */}
              {type === 'confirm' && message && (
                <div className="text-gray-600 dark:text-gray-300 mb-4">
                  <p className="leading-relaxed">{message}</p>
                  {content && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      {content}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
          <div className="flex justify-end space-x-3">
            {type === 'confirm' ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                >
                  {buttons?.confirm || 'Confirmar'}
                </button>
              </>
            ) : (
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              >
                {buttons?.close || 'Cerrar'}
              </button>
            )}
          </div>
        </div>
      </>
    );
  };

  // ====================================
  // MODAL DE FORMULARIO
  // ====================================

  const renderFormModal = () => (
    <>
      <div className="px-6 py-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.name || index} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              
              {field.type === 'textarea' ? (
                <textarea
                  value={formData[field.name] || ''}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  rows={field.rows || 3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              ) : field.type === 'select' ? (
                <select
                  value={formData[field.name] || ''}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  required={field.required}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">{field.placeholder || `Seleccionar ${field.label}`}</option>
                  {field.options?.map((option, idx) => (
                    <option key={idx} value={option.value || option}>
                      {option.label || option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || 'text'}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              )}
            </div>
          ))}
        </form>
      </div>

      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </>
  );

  // ====================================
  // MODAL DE WIZARD
  // ====================================

  const renderWizardModal = () => (
    <>
      <div className="px-6 py-4">
        {/* Pasos del wizard */}
        <div className="flex justify-between items-center mb-8 relative">
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center relative bg-white dark:bg-gray-900 px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
                index < currentStep 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : index === currentStep
                  ? 'bg-primary-500 border-primary-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
              }`}>
                {index < currentStep ? '✓' : index + 1}
              </div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-2 text-center">
                {step.title}
              </div>
            </div>
          ))}
        </div>

        {/* Contenido del paso actual */}
        {steps[currentStep] && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {steps[currentStep].title}
            </h3>
            {steps[currentStep].description && (
              <p className="text-gray-600 dark:text-gray-400">
                {steps[currentStep].description}
              </p>
            )}
            
            {/* Campos del paso */}
            {steps[currentStep].fields?.map((field, index) => (
              <div key={field.name || index} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={field.rows || 3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    required={field.required}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">{field.placeholder || `Seleccionar ${field.label}`}</option>
                    {field.options?.map((option, idx) => (
                      <option key={idx} value={option.value || option}>
                        {option.label || option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
        <div className="flex justify-between">
          <div>
            {currentStep > 0 && (
              <button
                onClick={handlePrevStep}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            >
              Cancelar
            </button>
            
            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNextStep}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors flex items-center"
              >
                Siguiente
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isSubmitting ? 'Finalizando...' : 'Finalizar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );

  // ====================================
  // MODAL DE LOADING
  // ====================================

  const renderLoadingModal = () => (
    <>
      <div className="px-6 py-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-3 border-gray-300 dark:border-gray-600 border-t-primary-500 rounded-full animate-spin"></div>
          
          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {message || 'Procesando...'}
            </p>
            {content && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {content}
              </p>
            )}
          </div>

          {/* Barra de progreso */}
          <div className="w-full max-w-xs">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              {currentProgress}%
            </p>
          </div>
        </div>
      </div>

      {buttons?.cancel && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
          <div className="flex justify-center">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );

  // ====================================
  // MODAL DE BÚSQUEDA
  // ====================================

  const renderSearchModal = () => (
    <>
      <div className="px-6 py-4">
        <div className="space-y-4">
          {/* Campo de búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ingrese términos de búsqueda..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categoría
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option>Todas las categorías</option>
                <option>Documentos</option>
                <option>Imágenes</option>
                <option>Videos</option>
                <option>Usuarios</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fecha
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option>Cualquier fecha</option>
                <option>Última semana</option>
                <option>Último mes</option>
                <option>Último año</option>
              </select>
            </div>
          </div>

          {/* Resultados */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Resultados recientes:</h4>
            <div className="space-y-2">
              <div className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center">
                <FileText className="w-4 h-4 text-blue-500 mr-3" />
                <span className="text-sm text-gray-900 dark:text-gray-100">Documento_Proyecto_2025.pdf</span>
              </div>
              <div className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center">
                <Image className="w-4 h-4 text-green-500 mr-3" />
                <span className="text-sm text-gray-900 dark:text-gray-100">imagen_presentacion.jpg</span>
              </div>
              <div className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center">
                <User className="w-4 h-4 text-purple-500 mr-3" />
                <span className="text-sm text-gray-900 dark:text-gray-100">Usuario: Maria Rodriguez</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={() => console.log('Searching:', searchQuery)}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
          >
            Buscar
          </button>
        </div>
      </div>
    </>
  );

  // ====================================
  // MODAL DE TABLA DE DATOS
  // ====================================

  const renderDataTableModal = () => (
    <>
      <div className="px-6 py-4">
        {/* Header con filtro y botón */}
        <div className="flex justify-between items-center mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Filtrar usuarios..."
              className="pl-10 pr-4 py-2 w-80 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors flex items-center">
            <User className="w-4 h-4 mr-2" />
            Nuevo Usuario
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Departamento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">001</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Juan Pérez</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">juan.perez@empresa.com</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Desarrollo</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                    Activo
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button className="text-primary-600 hover:text-primary-900 dark:hover:text-primary-400">Editar</button>
                  <button className="text-red-600 hover:text-red-900 dark:hover:text-red-400">Eliminar</button>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">002</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">María García</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">maria.garcia@empresa.com</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Marketing</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                    Inactivo
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button className="text-primary-600 hover:text-primary-900 dark:hover:text-primary-400">Editar</button>
                  <button className="text-red-600 hover:text-red-900 dark:hover:text-red-400">Eliminar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
          >
            Cerrar
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors">
            Exportar
          </button>
        </div>
      </div>
    </>
  );

  // ====================================
  // MODAL DE CALENDARIO
  // ====================================

  const renderCalendarModal = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return (
      <>
        <div className="px-6 py-4">
          {/* Header del calendario */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {monthNames[currentMonth]} {currentYear}
            </h3>
            <div className="flex justify-center space-x-4 mt-3">
              <button className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </button>
              <button className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Hoy
              </button>
              <button className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center">
                Siguiente
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>

          {/* Calendario */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {/* Días de la semana */}
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                {day}
              </div>
            ))}
            
            {/* Días del mes */}
            {Array.from({ length: 42 }, (_, index) => {
              const dayNumber = index - firstDay + 1;
              const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
              const isToday = isCurrentMonth && dayNumber === today.getDate();
              const hasEvent = isCurrentMonth && [15, 20, 27].includes(dayNumber);

              return (
                <div
                  key={index}
                  className={`p-2 min-h-[3rem] border border-gray-200 dark:border-gray-700 relative ${
                    isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/50'
                  } ${isToday ? 'ring-2 ring-primary-500' : ''} hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer`}
                >
                  {isCurrentMonth && (
                    <>
                      <div className={`text-sm ${isToday ? 'font-bold text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {dayNumber}
                      </div>
                      {hasEvent && (
                        <div className="absolute bottom-1 left-1 right-1">
                          <div className="text-xs bg-primary-500 text-white px-1 py-0.5 rounded truncate">
                            Evento
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            >
              Cerrar
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors">
              Nuevo Evento
            </button>
          </div>
        </div>
      </>
    );
  };

  // ====================================
  // MODAL DE LOGIN
  // ====================================

  const renderLoginModal = () => (
    <>
      <div className="px-6 py-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Usuario o Email
            </label>
            <input
              type="text"
              value={formData.username || ''}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="usuario@empresa.com"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={formData.password || ''}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
              />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Recordarme</span>
            </label>
            <button type="button" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-500">
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </form>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            ¿No tienes cuenta?{' '}
            <button className="text-primary-600 dark:text-primary-400 hover:text-primary-500">
              Regístrate aquí
            </button>
          </p>
        </div>
      </div>

      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isSubmitting ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
        </div>
      </div>
    </>
  );

  // ====================================
  // MODAL DE IMAGEN
  // ====================================

  const renderImageModal = () => (
    <>
      <div className="px-6 py-4">
        <div className="text-center">
          {/* Vista previa */}
          <div className="w-full h-80 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600 mb-4">
            <div className="text-center">
              <Image className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
              <div className="text-gray-600 dark:text-gray-300">documento-ejemplo.pdf</div>
              <small className="text-gray-500 dark:text-gray-400">1.2 MB • 1920x1080</small>
            </div>
          </div>

          {/* Información del archivo */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 flex items-center justify-between">
            <div className="text-left">
              <div className="font-medium text-gray-900 dark:text-gray-100">documento-ejemplo.pdf</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Subido el 27 Jul 2025 • 1.2 MB</div>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Descargar
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
        <div className="flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );

  // ====================================
  // MODAL DE VIDEO
  // ====================================

  const renderVideoModal = () => (
    <>
      <div className="px-6 py-4">
        {/* Reproductor de video */}
        <div className="w-full h-80 bg-black rounded-lg flex items-center justify-center mb-4">
          <div className="text-center text-white">
            <Play className="w-12 h-12 mx-auto mb-3 opacity-70" />
            <div>Video Tutorial - Configuración Inicial</div>
            <small className="opacity-70">Duración: 05:23</small>
          </div>
        </div>

        {/* Controles */}
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => setVideoPlaying(!videoPlaying)}
            className="px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors flex items-center"
          >
            {videoPlaying ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pausar
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Reproducir
              </>
            )}
          </button>
          <button className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors flex items-center">
            <Square className="w-4 h-4 mr-2" />
            Detener
          </button>
        </div>
      </div>

      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
        <div className="flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );

  // ====================================
  // MODAL DE GALERÍA
  // ====================================

  const renderGalleryModal = () => (
    <>
      <div className="px-6 py-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Seleccione un archivo de la biblioteca</p>
          <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors flex items-center">
            <Upload className="w-4 h-4 mr-2" />
            Subir Archivo
          </button>
        </div>

        {/* Grid de archivos */}
        <div className="grid grid-cols-6 gap-3">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              onClick={() => setSelectedFiles([...selectedFiles, i])}
              className={`aspect-square rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center ${
                selectedFiles.includes(i)
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="text-center">
                <Image className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                <div className="text-xs text-gray-600 dark:text-gray-400">IMG_{String(i + 1).padStart(3, '0')}</div>
              </div>