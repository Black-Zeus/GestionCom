/**
 * ModalManager.js
 * API Ultra Simple para manejar modales sin Provider
 * Uso: ModalManager.success({ title: "Éxito", message: "Todo bien" })
 */

import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';

// ====================================
// CONFIGURACIÓN Y CONSTANTES
// ====================================

const MODAL_CONFIG = {
    // Contenedor donde se montarán los modales
    containerId: 'modal-root',

    // Z-index base para modales
    baseZIndex: 1000,

    // Duración de animaciones (ms)
    animationDuration: 300,

    // Auto-close para algunos tipos (ms)
    autoClose: {
        success: 3000,
        error: 5000,
        warning: 4000,
        info: 3000
    },

    // Configuración por defecto para cada tipo
    defaults: {
        success: {
            icon: '✅',
            iconColor: 'text-green-500',
            borderColor: 'border-green-200',
            bgColor: 'bg-green-50 dark:bg-green-900/20'
        },
        error: {
            icon: '❌',
            iconColor: 'text-red-500',
            borderColor: 'border-red-200',
            bgColor: 'bg-red-50 dark:bg-red-900/20'
        },
        warning: {
            icon: '⚠️',
            iconColor: 'text-yellow-500',
            borderColor: 'border-yellow-200',
            bgColor: 'bg-yellow-50 dark:bg-yellow-900/20'
        },
        info: {
            icon: 'ℹ️',
            iconColor: 'text-blue-500',
            borderColor: 'border-blue-200',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20'
        },
        confirm: {
            icon: '❓',
            iconColor: 'text-blue-500',
            borderColor: 'border-blue-200',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20'
        },
        loading: {
            icon: '⏳',
            iconColor: 'text-blue-500',
            borderColor: 'border-blue-200',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20'
        }
    }
};

// ====================================
// ESTADO GLOBAL SIMPLE
// ====================================

class ModalState {
    constructor() {
        this.modals = [];
        this.nextId = 1;
        this.container = null;
        this.root = null;
    }

    // Crear contenedor si no existe
    ensureContainer() {
        if (!this.container) {
            this.container = document.getElementById(MODAL_CONFIG.containerId);

            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = MODAL_CONFIG.containerId;
                this.container.className = 'modal-manager-container';
                document.body.appendChild(this.container);
            }

            if (!this.root) {
                this.root = createRoot(this.container);
            }
        }

        return this.container;
    }

    // Agregar modal
    addModal(modalData) {
        const modal = {
            id: `modal-${this.nextId++}`,
            zIndex: MODAL_CONFIG.baseZIndex + this.modals.length,
            createdAt: Date.now(),
            ...modalData
        };

        this.modals.push(modal);
        this.render();

        // Auto-close si está configurado
        if (modal.autoClose !== false && MODAL_CONFIG.autoClose[modal.type]) {
            setTimeout(() => {
                this.removeModal(modal.id);
            }, modal.autoClose || MODAL_CONFIG.autoClose[modal.type]);
        }

        return modal.id;
    }

    // Remover modal por ID
    removeModal(id) {
        const index = this.modals.findIndex(m => m.id === id);
        if (index !== -1) {
            const modal = this.modals[index];

            // Ejecutar callback de cierre si existe
            if (modal.onClose) {
                modal.onClose();
            }

            this.modals.splice(index, 1);
            this.render();
        }
    }

    // Remover todos los modales
    removeAll() {
        this.modals.forEach(modal => {
            if (modal.onClose) {
                modal.onClose();
            }
        });

        this.modals = [];
        this.render();
    }

    // Obtener modal activo (el último)
    getActiveModal() {
        return this.modals[this.modals.length - 1] || null;
    }

    // Renderizar modales
    async render() {
        this.ensureContainer();

        // Importar Modal de forma dinámica para evitar dependencias circulares
        try {
            const { default: Modal } = await import('./Modal.jsx');

            this.root.render(
                <StrictMode>
                    <div className="modal-manager-root">
                        {this.modals.map(modal => (
                            <Modal
                                key={modal.id}
                                {...modal}
                                onClose={() => this.removeModal(modal.id)}
                            />
                        ))}
                    </div>
                </StrictMode>
            );
        } catch (error) {
            console.error('❌ Error loading Modal component:', error);
        }
    }
}

// Instancia global
const modalState = new ModalState();

// ====================================
// API PÚBLICA DEL MANAGER
// ====================================

class ModalManager {

    // ====================================
    // MODALES ESTÁNDAR
    // ====================================

    /**
     * Modal de éxito
     * @param {Object} options - Opciones del modal
     * @param {string} options.title - Título del modal
     * @param {string} options.message - Mensaje del modal
     * @param {Function} options.onClose - Callback al cerrar
     * @param {boolean} options.autoClose - Auto-cerrar (default: true)
     */
    static success(options = {}) {
        const config = {
            type: 'success',
            title: 'Operación Exitosa',
            message: 'La operación se completó correctamente',
            ...MODAL_CONFIG.defaults.success,
            ...options
        };

        return modalState.addModal(config);
    }

    /**
     * Modal de error
     */
    static error(options = {}) {
        const config = {
            type: 'error',
            title: 'Error',
            message: 'Ha ocurrido un error inesperado',
            autoClose: false, // Los errores no se cierran automáticamente
            ...MODAL_CONFIG.defaults.error,
            ...options
        };

        return modalState.addModal(config);
    }

    /**
     * Modal de advertencia
     */
    static warning(options = {}) {
        const config = {
            type: 'warning',
            title: 'Advertencia',
            message: 'Por favor revise la información',
            ...MODAL_CONFIG.defaults.warning,
            ...options
        };

        return modalState.addModal(config);
    }

    /**
     * Modal de información
     */
    static info(options = {}) {
        const config = {
            type: 'info',
            title: 'Información',
            message: 'Información importante del sistema',
            ...MODAL_CONFIG.defaults.info,
            ...options
        };

        return modalState.addModal(config);
    }

    // ====================================
    // MODALES INTERACTIVOS
    // ====================================

    /**
     * Modal de confirmación
     */
    static confirm(options = {}) {
        return new Promise((resolve) => {
            const config = {
                type: 'confirm',
                title: 'Confirmar Acción',
                message: '¿Está seguro de que desea continuar?',
                confirmText: 'Confirmar',
                cancelText: 'Cancelar',
                autoClose: false,
                ...MODAL_CONFIG.defaults.confirm,
                ...options,
                onConfirm: () => {
                    if (options.onConfirm) options.onConfirm();
                    resolve(true);
                    modalState.removeModal(modalId);
                },
                onCancel: () => {
                    if (options.onCancel) options.onCancel();
                    resolve(false);
                    modalState.removeModal(modalId);
                }
            };

            const modalId = modalState.addModal(config);
        });
    }

    /**
     * Modal de formulario
     */
    static form(options = {}) {
        return new Promise((resolve, reject) => {
            const config = {
                type: 'form',
                title: 'Formulario',
                fields: [],
                submitText: 'Guardar',
                cancelText: 'Cancelar',
                autoClose: false,
                ...options,
                onSubmit: (data) => {
                    if (options.onSubmit) options.onSubmit(data);
                    resolve(data);
                    modalState.removeModal(modalId);
                },
                onCancel: () => {
                    if (options.onCancel) options.onCancel();
                    reject(new Error('Formulario cancelado'));
                    modalState.removeModal(modalId);
                }
            };

            const modalId = modalState.addModal(config);
        });
    }

    /**
     * Modal de carga/progreso
     */
    static loading(options = {}) {
        const config = {
            type: 'loading',
            title: 'Cargando...',
            message: 'Por favor espere',
            progress: 0,
            autoClose: false,
            showCloseButton: false,
            ...MODAL_CONFIG.defaults.loading,
            ...options
        };

        const modalId = modalState.addModal(config);

        // Retornar objeto con métodos para controlar el loading
        return {
            id: modalId,
            updateProgress: (progress) => {
                const modal = modalState.modals.find(m => m.id === modalId);
                if (modal) {
                    modal.progress = progress;
                    modalState.render();
                }
            },
            updateMessage: (message) => {
                const modal = modalState.modals.find(m => m.id === modalId);
                if (modal) {
                    modal.message = message;
                    modalState.render();
                }
            },
            close: () => modalState.removeModal(modalId)
        };
    }

    /**
     * Modal wizard (con pasos)
     */
    static wizard(options = {}) {
        return new Promise((resolve, reject) => {
            const config = {
                type: 'wizard',
                title: 'Asistente',
                steps: [],
                currentStep: 0,
                autoClose: false,
                ...options,
                onComplete: (data) => {
                    if (options.onComplete) options.onComplete(data);
                    resolve(data);
                    modalState.removeModal(modalId);
                },
                onCancel: () => {
                    if (options.onCancel) options.onCancel();
                    reject(new Error('Wizard cancelado'));
                    modalState.removeModal(modalId);
                }
            };

            const modalId = modalState.addModal(config);
        });
    }

    // ====================================
    // MÉTODOS DE CONTROL
    // ====================================

    /**
     * Cerrar el modal activo (el último)
     */
    static close() {
        const activeModal = modalState.getActiveModal();
        if (activeModal) {
            modalState.removeModal(activeModal.id);
        }
    }

    /**
     * Cerrar modal específico por ID
     */
    static closeById(id) {
        modalState.removeModal(id);
    }

    /**
     * Cerrar todos los modales
     */
    static closeAll() {
        modalState.removeAll();
    }

    /**
     * Obtener información del estado actual
     */
    static getState() {
        return {
            modals: modalState.modals.length,
            activeModal: modalState.getActiveModal(),
            allModals: [...modalState.modals]
        };
    }

    // ====================================
    // UTILIDADES Y SHORTCUTS
    // ====================================

    /**
     * Shortcut para mostrar resultado de operación
     */
    static result(success, options = {}) {
        return success ? this.success(options) : this.error(options);
    }

    /**
     * Shortcut para validación simple
     */
    static validate(condition, options = {}) {
        if (!condition) {
            return this.warning(options);
        }
        return null;
    }

    /**
     * Modal personalizado (para casos especiales)
     */
    static custom(options = {}) {
        const config = {
            type: 'custom',
            ...options
        };

        return modalState.addModal(config);
    }
}

// ====================================
// EVENTOS GLOBALES
// ====================================

// Cerrar con ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        ModalManager.close();
    }
});

// Prevenir scroll del body cuando hay modales abiertos
const updateBodyScroll = () => {
    const hasModals = modalState.modals.length > 0;
    document.body.style.overflow = hasModals ? 'hidden' : '';
};

// Observer para cambios en modales
const originalAddModal = modalState.addModal.bind(modalState);
const originalRemoveModal = modalState.removeModal.bind(modalState);
const originalRemoveAll = modalState.removeAll.bind(modalState);

modalState.addModal = function (...args) {
    const result = originalAddModal(...args);
    updateBodyScroll();
    return result;
};

modalState.removeModal = function (...args) {
    const result = originalRemoveModal(...args);
    updateBodyScroll();
    return result;
};

modalState.removeAll = function (...args) {
    const result = originalRemoveAll(...args);
    updateBodyScroll();
    return result;
};

// ====================================
// EXPORT
// ====================================

export default ModalManager;

// También exportar la configuración para testing
export { MODAL_CONFIG, modalState };