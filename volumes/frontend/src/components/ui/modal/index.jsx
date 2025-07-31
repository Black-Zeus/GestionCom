/**
 * index.jsx
 * Exports centralizados y setup automático del sistema de modales
 */

// ====================================
// IMPORTS PRINCIPALES
// ====================================

import Modal from './Modal.jsx';
import ModalManager, { MODAL_CONFIG, modalState } from './ModalManager.js';

// ====================================
// AUTO-SETUP DEL CONTENEDOR
// ====================================

/**
 * Función para inicializar automáticamente el contenedor de modales
 * Se ejecuta al importar este módulo
 */
const initializeModalSystem = () => {
    // Solo ejecutar en el navegador (no en SSR)
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
    }

    // Verificar si ya existe el contenedor
    let container = document.getElementById(MODAL_CONFIG.containerId);

    if (!container) {
        // Crear contenedor de modales
        container = document.createElement('div');
        container.id = MODAL_CONFIG.containerId;
        container.className = 'modal-manager-container';

        // Estilos base para el contenedor
        container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: ${MODAL_CONFIG.baseZIndex};
    `;

        // Agregar al body
        document.body.appendChild(container);

        console.log('🎭 Modal system initialized');
    }

    return container;
};

// ====================================
// ESTILOS CSS CRÍTICOS
// ====================================

/**
 * Función para inyectar estilos CSS críticos
 * Esto asegura que las animaciones funcionen correctamente
 */
const injectCriticalStyles = () => {
    if (typeof document === 'undefined') return;

    // Verificar si ya existen los estilos
    if (document.getElementById('modal-manager-styles')) {
        return;
    }

    const styles = document.createElement('style');
    styles.id = 'modal-manager-styles';
    styles.textContent = `
    /* Estilos críticos para el sistema de modales */
    .modal-manager-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: ${MODAL_CONFIG.baseZIndex};
    }
    
    .modal-manager-root {
      position: relative;
      width: 100%;
      height: 100%;
    }
    
    .modal-manager-root > div {
      pointer-events: auto;
    }
    
    /* Animaciones personalizadas si Tailwind no está disponible */
    @keyframes modal-enter {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    
    @keyframes modal-exit {
      from {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      to {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
      }
    }
    
    /* Backup spinner si Tailwind animate-spin no está disponible */
    @keyframes modal-spinner {
      to {
        transform: rotate(360deg);
      }
    }
    
    .modal-spinner-fallback {
      animation: modal-spinner 1s linear infinite;
    }
    
    /* Prevenir scroll del body cuando hay modales */
    body.modal-open {
      overflow: hidden;
    }
    
    /* Estilos para mejor accesibilidad */
    .modal-focus-trap {
      outline: none;
    }
    
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .modal-auto-dark {
        background-color: #1f2937;
        color: #f9fafb;
        border-color: #374151;
      }
    }
  `;

    document.head.appendChild(styles);
};

// ====================================
// UTILITLES ADICIONALES
// ====================================

/**
 * Utilidad para verificar si el sistema está listo
 */
const isModalSystemReady = () => {
    return !!(
        typeof window !== 'undefined' &&
        typeof document !== 'undefined' &&
        document.getElementById(MODAL_CONFIG.containerId)
    );
};

/**
 * Utilidad para verificar si hay modales abiertos
 */
const hasOpenModals = () => {
    return modalState.modals.length > 0;
};

/**
 * Utilidad para obtener estadísticas del sistema
 */
const getModalStats = () => {
    return {
        isReady: isModalSystemReady(),
        totalModals: modalState.modals.length,
        activeModal: modalState.getActiveModal(),
        containerExists: !!document.getElementById(MODAL_CONFIG.containerId),
        stylesInjected: !!document.getElementById('modal-manager-styles')
    };
};

/**
 * Función para limpiar completamente el sistema (útil para testing)
 */
const cleanupModalSystem = () => {
    // Cerrar todos los modales
    ModalManager.closeAll();

    // Remover contenedor
    const container = document.getElementById(MODAL_CONFIG.containerId);
    if (container) {
        container.remove();
    }

    // Remover estilos
    const styles = document.getElementById('modal-manager-styles');
    if (styles) {
        styles.remove();
    }

    // Restaurar scroll del body
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');

    console.log('🧹 Modal system cleaned up');
};

// ====================================
// SETUP AUTOMÁTICO AL IMPORTAR
// ====================================

// Ejecutar setup automáticamente cuando se importe el módulo
if (typeof window !== 'undefined') {
    // Usar requestIdleCallback si está disponible, sino setTimeout
    const setupFunction = () => {
        initializeModalSystem();
        injectCriticalStyles();
    };

    if ('requestIdleCallback' in window) {
        requestIdleCallback(setupFunction);
    } else {
        setTimeout(setupFunction, 0);
    }
}

// ====================================
// TIPOS PARA TYPESCRIPT (OPCIONAL)
// ====================================

/**
 * @typedef {Object} ModalOptions
 * @property {string} [title] - Título del modal
 * @property {string} [message] - Mensaje del modal
 * @property {string} [icon] - Icono a mostrar
 * @property {boolean} [autoClose] - Auto-cerrar el modal
 * @property {Function} [onClose] - Callback al cerrar
 * @property {Function} [onConfirm] - Callback al confirmar
 * @property {Function} [onCancel] - Callback al cancelar
 */

/**
 * @typedef {Object} FormField
 * @property {string} name - Nombre del campo
 * @property {string} label - Etiqueta del campo
 * @property {string} [type] - Tipo de input
 * @property {boolean} [required] - Si es obligatorio
 * @property {string} [placeholder] - Placeholder
 * @property {Array} [options] - Opciones para select
 */

/**
 * @typedef {Object} WizardStep
 * @property {string} title - Título del paso
 * @property {string} description - Descripción del paso
 * @property {FormField[]} fields - Campos del paso
 */

// ====================================
// EXPORTS PRINCIPALES
// ====================================

// Export por defecto: el ModalManager
export default ModalManager;

// Named exports
export {
    // Componentes
    Modal,
    ModalManager,

    // Configuración y estado
    MODAL_CONFIG,
    modalState,

    // Utilidades
    initializeModalSystem,
    injectCriticalStyles,
    isModalSystemReady,
    hasOpenModals,
    getModalStats,
    cleanupModalSystem
};

// ====================================
// EXPORT ALTERNATIVO PARA COMMONJS
// ====================================

// Para compatibilidad con require()
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
    module.exports.Modal = Modal;
    module.exports.ModalManager = ModalManager;
    module.exports.MODAL_CONFIG = MODAL_CONFIG;
    module.exports.modalState = modalState;
    module.exports.initializeModalSystem = initializeModalSystem;
    module.exports.cleanupModalSystem = cleanupModalSystem;
}

// ====================================
// COMPATIBILIDAD CON FRAMEWORKS
// ====================================

/**
 * Plugin para Vue.js (si se necesita)
 */
export const VueModalPlugin = {
    install(app) {
        app.config.globalProperties.$modal = ModalManager;
        app.provide('modal', ModalManager);
    }
};

/**
 * HOC para React (si se necesita)
 */
export const withModalManager = (Component) => {
    // Esta función debe estar en un archivo .jsx para usar JSX
    const WrappedComponent = (props) => {
        // Usar React.createElement en lugar de JSX para evitar error de sintaxis
        const React = require('react');
        return React.createElement(Component, { ...props, modal: ModalManager });
    };

    WrappedComponent.displayName = `withModalManager(${Component.displayName || Component.name})`;
    return WrappedComponent;
};

// ====================================
// DOCUMENTACIÓN DE USO
// ====================================

/**
 * EJEMPLOS DE USO:
 * 
 * // Import básico
 * import ModalManager from '@/components/ui/modal';
 * 
 * // Usar en cualquier parte
 * ModalManager.success({ title: "¡Éxito!", message: "Todo bien" });
 * ModalManager.confirm({ title: "¿Eliminar?", message: "No se puede deshacer" });
 * 
 * // Con async/await
 * const confirmed = await ModalManager.confirm({ title: "¿Continuar?" });
 * if (confirmed) {
 *   // Usuario confirmó
 * }
 * 
 * // Loading con control
 * const loader = ModalManager.loading({ title: "Procesando..." });
 * loader.updateProgress(50);
 * loader.close();
 * 
 * // Formulario
 * const data = await ModalManager.form({
 *   title: "Nuevo Usuario",
 *   fields: [
 *     { name: 'name', label: 'Nombre', required: true },
 *     { name: 'email', label: 'Email', type: 'email' }
 *   ]
 * });
 * 
 * // Wizard
 * const result = await ModalManager.wizard({
 *   title: "Configuración",
 *   steps: [
 *     { title: "Paso 1", fields: [...] },
 *     { title: "Paso 2", fields: [...] }
 *   ]
 * });
 */