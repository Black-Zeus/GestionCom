/**
 * ModalDemo.jsx
 * Demo que replica exactamente el diseño del sistema original
 */

import React, { useState, useEffect } from 'react';
import ModalManager from '@/components/ui/modal';

const ModalDemo = () => {
  const [demoResults, setDemoResults] = useState([]);

  // ====================================
  // HELPERS
  // ====================================
  
  const addResult = (type, result) => {
    const newResult = {
      id: Date.now(),
      type,
      result,
      timestamp: new Date().toLocaleTimeString()
    };
    setDemoResults(prev => [newResult, ...prev].slice(0, 5));
  };

  // ====================================
  // HANDLERS - Replicando comportamiento original
  // ====================================

  // Modales Estándar
  const showInfoModal = () => {
    ModalManager.info({
      title: 'Información del Sistema',
      message: 'El sistema realizará una actualización programada el próximo martes a las 02:00 AM. Durante este período, los servicios estarán temporalmente no disponibles.',
      onClose: () => addResult('info', 'Modal de información cerrado')
    });
  };

  const showConfirmModal = async () => {
    try {
      const confirmed = await ModalManager.confirm({
        title: 'Confirmar Acción',
        message: '¿Está seguro de que desea eliminar este elemento? Esta acción no se puede deshacer.',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      });
      addResult('confirm', confirmed ? 'Elemento eliminado' : 'Acción cancelada');
    } catch (error) {
      addResult('confirm', 'Cancelado');
    }
  };

  const showSuccessModal = () => {
    ModalManager.success({
      title: 'Operación Completada',
      message: 'La operación se ha completado correctamente. Los cambios han sido guardados y aplicados al sistema.',
      onClose: () => addResult('success', 'Éxito confirmado')
    });
  };

  const showWarningModal = () => {
    ModalManager.warning({
      title: 'Advertencia de Seguridad',
      message: 'Se ha detectado un intento de acceso no autorizado. Por motivos de seguridad, recomendamos cambiar su contraseña inmediatamente.',
      onClose: () => addResult('warning', 'Advertencia vista')
    });
  };

  const showErrorModal = () => {
    ModalManager.error({
      title: 'Error del Sistema',
      message: 'No se pudo completar la operación solicitada. Ha ocurrido un error inesperado. El equipo técnico ha sido notificado automáticamente.',
      onClose: () => addResult('error', 'Error reconocido')
    });
  };

  const showNotificationModal = () => {
    // Este sería un toast, no un modal
    addResult('notification', 'Notificación mostrada (implementar con react-toastify)');
  };

  // Modales Interactivos
  const showFormModal = async () => {
    try {
      const data = await ModalManager.form({
        title: 'Configuración de Usuario',
        fields: [
          { name: 'fullName', label: 'Nombre completo', type: 'text', required: true, placeholder: 'Ingrese su nombre completo' },
          { name: 'email', label: 'Correo electrónico', type: 'email', required: true, placeholder: 'usuario@empresa.com' },
          { name: 'department', label: 'Departamento', type: 'select', required: true, options: [
            { value: 'desarrollo', label: 'Desarrollo' },
            { value: 'marketing', label: 'Marketing' },
            { value: 'ventas', label: 'Ventas' },
            { value: 'soporte', label: 'Soporte' },
            { value: 'rrhh', label: 'Recursos Humanos' }
          ]},
          { name: 'notes', label: 'Notas adicionales', type: 'textarea', placeholder: 'Información adicional (opcional)', rows: 3 }
        ],
        submitText: 'Guardar',
        cancelText: 'Cancelar'
      });
      addResult('form', `Usuario guardado: ${data.fullName}`);
    } catch (error) {
      addResult('form', 'Formulario cancelado');
    }
  };

  const showWizardModal = async () => {
    try {
      const data = await ModalManager.wizard({
        title: 'Asistente de Configuración',
        steps: [
          {
            title: 'Información Básica',
            description: 'Configure los datos básicos del proyecto',
            fields: [
              { name: 'projectName', label: 'Nombre del Proyecto', type: 'text', required: true, placeholder: 'Ingrese el nombre del proyecto' },
              { name: 'description', label: 'Descripción', type: 'textarea', rows: 3, placeholder: 'Breve descripción del proyecto' }
            ]
          },
          {
            title: 'Configuración',
            description: 'Seleccione las opciones técnicas',
            fields: [
              { name: 'type', label: 'Tipo de Implementación', type: 'select', required: true, options: [
                { value: 'web', label: 'Aplicación Web' },
                { value: 'desktop', label: 'Sistema Desktop' },
                { value: 'mobile', label: 'Aplicación Móvil' },
                { value: 'api', label: 'API Backend' }
              ]},
              { name: 'framework', label: 'Framework Tecnológico', type: 'select', required: true, options: [
                { value: 'react', label: 'React + Node.js' },
                { value: 'vue', label: 'Vue.js + Express' },
                { value: 'angular', label: 'Angular + .NET' },
                { value: 'laravel', label: 'Laravel + PHP' }
              ]}
            ]
          },
          {
            title: 'Revisión',
            description: 'Revise la configuración antes de continuar',
            fields: []
          }
        ]
      });
      addResult('wizard', `Configuración completada: ${data.projectName}`);
    } catch (error) {
      addResult('wizard', 'Asistente cancelado');
    }
  };

  const showSearchModal = async () => {
    addResult('search', 'Modal de búsqueda avanzada (implementar según necesidades)');
  };

  const showDataTableModal = () => {
    addResult('datatable', 'Modal de tabla de datos (implementar según necesidades)');
  };

  const showCalendarModal = () => {
    addResult('calendar', 'Modal de calendario (implementar según necesidades)');
  };

  const showLoginModal = async () => {
    try {
      const data = await ModalManager.form({
        title: 'Iniciar Sesión',
        fields: [
          { name: 'username', label: 'Usuario o Email', type: 'text', required: true, placeholder: 'usuario@empresa.com' },
          { name: 'password', label: 'Contraseña', type: 'password', required: true, placeholder: '••••••••' }
        ],
        submitText: 'Iniciar Sesión',
        cancelText: 'Cancelar'
      });
      addResult('login', `Login exitoso: ${data.username}`);
    } catch (error) {
      addResult('login', 'Login cancelado');
    }
  };

  // Modales de Media
  const showImageModal = () => {
    addResult('image', 'Modal de vista previa de imagen (implementar según necesidades)');
  };

  const showVideoModal = () => {
    addResult('video', 'Modal de reproductor de video (implementar según necesidades)');
  };

  const showGalleryModal = () => {
    addResult('gallery', 'Modal de galería de imágenes (implementar según necesidades)');
  };

  const showFileManagerModal = () => {
    addResult('filemanager', 'Modal de gestor de archivos (implementar según necesidades)');
  };

  // Modales de Sistema
  const showLoadingModal = () => {
    const loader = ModalManager.loading({
      title: 'Procesando Solicitud',
      message: 'Por favor espere mientras completamos su solicitud',
      progress: 0
    });

    // Simular progreso
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        loader.updateProgress(progress);
        setTimeout(() => {
          loader.close();
          addResult('loading', 'Proceso completado exitosamente');
        }, 500);
        clearInterval(interval);
      } else {
        loader.updateProgress(progress);
      }
    }, 300);
  };

  const showSettingsModal = () => {
    addResult('settings', 'Modal de configuración del sistema (implementar según necesidades)');
  };

  const showHelpModal = () => {
    addResult('help', 'Modal de centro de ayuda (implementar según necesidades)');
  };

  const showCustomModal = () => {
    ModalManager.custom({
      title: 'Modal Personalizado',
      size: 'large',
      children: (
        <div className="text-center py-6">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            ¡Modal Completamente Personalizable!
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Este modal demuestra las capacidades de personalización del sistema.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl mb-2">📊</div>
              <h4 className="font-semibold">Estadísticas</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Datos en tiempo real</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl mb-2">⚡</div>
              <h4 className="font-semibold">Performance</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Optimización avanzada</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl mb-2">🔒</div>
              <h4 className="font-semibold">Seguridad</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Protección completa</p>
            </div>
          </div>
        </div>
      ),
      onClose: () => addResult('custom', 'Modal personalizado cerrado')
    });
  };

  // Controles del sistema
  const closeAllModals = () => {
    ModalManager.closeAll();
    addResult('control', 'Todos los modales cerrados');
  };

  // ====================================
  // RENDER - Replicando diseño original
  // ====================================

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-5">
      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-lg p-10 shadow-sm border border-gray-200 dark:border-gray-700">
        
        {/* Header - igual al original */}
        <h1 className="text-center text-gray-900 dark:text-gray-100 mb-10 text-3xl font-semibold">
          Sistema de Modales Profesional
        </h1>

        {/* Modales Estándar */}
        <div className="mb-10">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b-2 border-gray-200 dark:border-gray-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
            Modales Estándar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button 
              onClick={showInfoModal}
              className="flex items-center gap-2 p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md text-gray-700 dark:text-gray-300 font-medium"
            >
              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
              Información
            </button>

            <button 
              onClick={showConfirmModal}
              className="flex items-center gap-2 p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md text-gray-700 dark:text-gray-300 font-medium"
            >
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              Confirmación
            </button>

            <button 
              onClick={showSuccessModal}
              className="flex items-center gap-2 p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md text-gray-700 dark:text-gray-300 font-medium"
            >
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              Éxito
            </button>

            <button 
              onClick={showWarningModal}
              className="flex items-center gap-2 p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md text-gray-700 dark:text-gray-300 font-medium"
            >
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              Advertencia
            </button>

            <button 
              onClick={showErrorModal}
              className="flex items-center gap-2 p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md text-gray-700 dark:text-gray-300 font-medium"
            >
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
              Error
            </button>

            <button 
              onClick={showNotificationModal}
              className="flex items-center gap-2 p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md text-gray-700 dark:text-gray-300 font-medium"
            >
              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
              </svg>
              Notificación
            </button>
          </div>
        </div>

        {/* Modales Interactivos */}
        <div className="mb-10">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b-2 border-gray-200 dark:border-gray-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L16 11.586V5a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2h2.586l-1.293-1.293a1 1 0 111.414-1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L14 15.586H6a2 2 0 01-2-2V5z" clipRule="evenodd"/>
            </svg>
            Modales Interactivos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { handler: showFormModal, icon: "📝", label: "Formulario" },
              { handler: showWizardModal, icon: "🎯", label: "Asistente" },
              { handler: showSearchModal, icon: "🔍", label: "Búsqueda" },
              { handler: showDataTableModal, icon: "📊", label: "Tabla de Datos" },
              { handler: showCalendarModal, icon: "📅", label: "Calendario" },
              { handler: showLoginModal, icon: "🔐", label: "Login" }
            ].map((item, index) => (
              <button 
                key={index}
                onClick={item.handler}
                className="flex items-center gap-2 p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md text-gray-700 dark:text-gray-300 font-medium"
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modales de Media */}
        <div className="mb-10">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b-2 border-gray-200 dark:border-gray-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
            </svg>
            Modales de Media
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { handler: showImageModal, icon: "🖼️", label: "Vista Previa" },
              { handler: showVideoModal, icon: "🎬", label: "Reproductor" },
              { handler: showGalleryModal, icon: "🖼️", label: "Galería" },
              { handler: showFileManagerModal, icon: "📁", label: "Gestor Archivos" }
            ].map((item, index) => (
              <button 
                key={index}
                onClick={item.handler}
                className="flex items-center gap-2 p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md text-gray-700 dark:text-gray-300 font-medium"
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modales de Sistema */}
        <div className="mb-10">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b-2 border-gray-200 dark:border-gray-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1z" clipRule="evenodd"/>
            </svg>
            Modales de Sistema
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { handler: showLoadingModal, icon: "⏳", label: "Progreso" },
              { handler: showSettingsModal, icon: "⚙️", label: "Configuración" },
              { handler: showHelpModal, icon: "❓", label: "Ayuda" },
              { handler: showCustomModal, icon: "🎨", label: "Personalizado" }
            ].map((item, index) => (
              <button 
                key={index}
                onClick={item.handler}
                className="flex items-center gap-2 p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md text-gray-700 dark:text-gray-300 font-medium"
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Controles */}
        <div className="mb-8 flex justify-center gap-4">
          <button 
            onClick={closeAllModals}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
          >
            ❌ Cerrar Todos los Modales
          </button>
        </div>

        {/* Resultados */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">📋 Últimos Resultados:</h3>
          {demoResults.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm italic">
              No hay resultados aún. ¡Prueba algunos modales!
            </p>
          ) : (
            <div className="space-y-2">
              {demoResults.map(result => (
                <div key={result.id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-900 dark:text-gray-100">
                    <strong>{result.type}:</strong> {result.result}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">{result.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalDemo;