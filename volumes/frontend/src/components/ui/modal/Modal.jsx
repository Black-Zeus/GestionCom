/**
 * Modal.jsx
 * Componente universal que maneja TODOS los tipos de modal
 * Uso: <Modal type="success" title="Éxito" message="Todo bien" />
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Importar configuración central
import {
  getModalConfig,
  getModalSizeClasses,
  getModalPositionClasses,
  getDefaultTitle,
  generateModalId,
  MODAL_CLASSES,
  MODAL_CONFIG
} from './modalTypes.js';

import logger from '@/utils/logger';
const modalLog = logger.scope("modal");

// ====================================
// CARGA DIFERIDA DE RENDERERS
// ====================================

const MODAL_RENDERER_GROUPS = {
  info: () => import('./types/BasicModals.jsx').then((module) => module.basicModalRenderers.info),
  success: () => import('./types/BasicModals.jsx').then((module) => module.basicModalRenderers.success),
  warning: () => import('./types/BasicModals.jsx').then((module) => module.basicModalRenderers.warning),
  error: () => import('./types/BasicModals.jsx').then((module) => module.basicModalRenderers.error),
  danger: () => import('./types/BasicModals.jsx').then((module) => module.basicModalRenderers.danger),
  notification: () => import('./types/BasicModals.jsx').then((module) => module.basicModalRenderers.notification),

  confirm: () => import('./types/InteractiveModals.jsx').then((module) => module.interactiveModalRenderers.confirm),
  form: () => import('./types/InteractiveModals.jsx').then((module) => module.interactiveModalRenderers.form),
  wizard: () => import('./types/InteractiveModals.jsx').then((module) => module.interactiveModalRenderers.wizard),
  login: () => import('./types/InteractiveModals.jsx').then((module) => module.interactiveModalRenderers.login),

  search: () => import('./types/DataModals.jsx').then((module) => module.dataModalRenderers.search),
  datatable: () => import('./types/DataModals.jsx').then((module) => module.dataModalRenderers.datatable),
  calendar: () => import('./types/DataModals.jsx').then((module) => module.dataModalRenderers.calendar),

  image: () => import('./types/MediaModals.jsx').then((module) => module.mediaModalRenderers.image),
  video: () => import('./types/MediaModals.jsx').then((module) => module.mediaModalRenderers.video),
  gallery: () => import('./types/MediaModals.jsx').then((module) => module.mediaModalRenderers.gallery),
  filemanager: () => import('./types/MediaModals.jsx').then((module) => module.mediaModalRenderers.filemanager),

  loading: () => import('./types/SystemModals.jsx').then((module) => module.systemModalRenderers.loading),
  progress: () => import('./types/SystemModals.jsx').then((module) => module.systemModalRenderers.progress),
  settings: () => import('./types/SystemModals.jsx').then((module) => module.systemModalRenderers.settings),
  help: () => import('./types/SystemModals.jsx').then((module) => module.systemModalRenderers.help),
  'system-notification': () => import('./types/SystemModals.jsx').then((module) => module.systemModalRenderers['system-notification']),
};

const INLINE_CUSTOM_TYPES = new Set(['custom']);
const VALID_MODAL_TYPES = new Set([...Object.keys(MODAL_RENDERER_GROUPS), ...INLINE_CUSTOM_TYPES]);

let bodyScrollLockCount = 0;
let bodyScrollSnapshot = null;

// ====================================
// HOOK PARA FOCUS MANAGEMENT
// ====================================

const useFocusManagement = (isOpen, modalRef) => {
  const previousFocusRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const lastFocusableRef = useRef(null);

  // Guardar el elemento con foco antes de abrir
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
    }
  }, [isOpen]);

  // Gestionar foco al abrir
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    firstFocusableRef.current = focusableElements[0];
    lastFocusableRef.current = focusableElements[focusableElements.length - 1];

    // Enfocar primer elemento
    const timer = setTimeout(() => {
      if (firstFocusableRef.current) {
        firstFocusableRef.current.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, modalRef]);

  // Trap focus dentro del modal
  const handleKeyDown = useCallback((e) => {
    if (!isOpen || e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusableRef.current) {
        e.preventDefault();
        lastFocusableRef.current?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusableRef.current) {
        e.preventDefault();
        firstFocusableRef.current?.focus();
      }
    }
  }, [isOpen]);

  // Restaurar foco al cerrar
  const restoreFocus = useCallback(() => {
    if (MODAL_CONFIG.focusManagement.returnFocus && previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, []);

  return { handleKeyDown, restoreFocus };
};

// ====================================
// HOOK PARA BODY SCROLL LOCK
// ====================================

const useBodyScrollLock = (isOpen) => {
  useEffect(() => {
    if (!isOpen) return;

    if (bodyScrollLockCount === 0) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      const computedBodyStyle = window.getComputedStyle(document.body);

      bodyScrollSnapshot = {
        bodyOverflow: document.body.style.overflow,
        bodyPaddingRight: document.body.style.paddingRight,
        htmlOverflow: document.documentElement.style.overflow,
      };

      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';

      if (scrollbarWidth > 0) {
        const currentPadding = Number.parseFloat(computedBodyStyle.paddingRight) || 0;
        document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
      }
    }

    bodyScrollLockCount += 1;
    document.body.classList.add(MODAL_CONFIG.bodyClass);

    return () => {
      bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);

      if (bodyScrollLockCount === 0 && bodyScrollSnapshot) {
        document.body.style.overflow = bodyScrollSnapshot.bodyOverflow;
        document.body.style.paddingRight = bodyScrollSnapshot.bodyPaddingRight;
        document.documentElement.style.overflow = bodyScrollSnapshot.htmlOverflow;
        document.body.classList.remove(MODAL_CONFIG.bodyClass);
        bodyScrollSnapshot = null;
      }
    };
  }, [isOpen]);
};

const renderCustomContent = ({
  content,
  children,
  contentComponent: ContentComponent,
  contentProps = {},
  onClose,
  showFooter,
  footerContent,
  buttons = [],
  onAction,
  size,
}) => {
  const isWideShell = ['clientWide', 'entityWide', 'minuteWide'].includes(size);
  const bodyContent = ContentComponent ? (
    <ContentComponent onClose={onClose} {...contentProps} />
  ) : content || children;

  return (
    <>
      <div className={isWideShell ? 'p-0' : MODAL_CLASSES.bodyContent}>
        {bodyContent}
      </div>

      {showFooter && (
        <div className={MODAL_CLASSES.footer}>
          {footerContent || (
            <div className={MODAL_CLASSES.footerButtons}>
              {(buttons.length ? buttons : [{ text: 'Cerrar', variant: 'secondary', onClick: onClose }]).map((button, index) => (
                <button
                  key={button.text || index}
                  type="button"
                  onClick={button.onClick || (() => onAction?.(button.action))}
                  disabled={button.disabled}
                  className={`${MODAL_CLASSES.button.base} ${
                    button.variant === 'primary' ? MODAL_CLASSES.button.primary
                      : button.variant === 'success' ? MODAL_CLASSES.button.success
                        : button.variant === 'warning' ? MODAL_CLASSES.button.warning
                          : button.variant === 'danger' ? MODAL_CLASSES.button.danger
                            : MODAL_CLASSES.button.secondary
                  } ${button.className || ''}`}
                >
                  {button.icon && <span className="mr-2">{button.icon}</span>}
                  {button.text}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

// ====================================
// COMPONENTE PRINCIPAL
// ====================================

const Modal = ({
  // Propiedades básicas
  id,
  type = 'info',
  title,
  message,
  content,
  children,

  // Configuración de UI
  size,
  position = 'center',
  showCloseButton,
  showHeader = true,
  showFooter = true,

  // Comportamiento
  isOpen = true,
  closeOnOverlayClick,
  closeOnEscape,
  autoClose,

  // Callbacks
  onClose,
  onOpen,
  onAfterClose,

  // Props específicos por tipo (se pasan al renderer)
  ...modalProps
}) => {
  // ====================================
  // ESTADO LOCAL - SIEMPRE PRIMERO
  // ====================================

  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [loadedRenderer, setLoadedRenderer] = useState(null);
  const [rendererError, setRendererError] = useState(null);

  // ====================================
  // REFS - SIEMPRE EN EL MISMO ORDEN
  // ====================================

  const modalRef = useRef(null);
  const overlayRef = useRef(null);
  const uniqueId = useRef(id || generateModalId(type));

  // ====================================
  // CONFIGURACIÓN MEMOIZADA - TODAS JUNTAS
  // ====================================

  const config = useMemo(() => getModalConfig(type), [type]);
  const modalTitle = useMemo(() => title || getDefaultTitle(type), [title, type]);
  const modalSize = useMemo(() => size || config.size, [size, config.size]);

  const modalSettings = useMemo(() => ({
    showClose: showCloseButton ?? config.showCloseButton,
    closeOnClick: closeOnOverlayClick ?? config.closeOnOverlayClick,
    closeOnEsc: closeOnEscape ?? config.closeOnEscape,
  }), [showCloseButton, config.showCloseButton, closeOnOverlayClick, config.closeOnOverlayClick, closeOnEscape, config.closeOnEscape]);

  // ====================================
  // HOOKS PERSONALIZADOS
  // ====================================

  const { handleKeyDown, restoreFocus } = useFocusManagement(isOpen && isVisible, modalRef);
  useBodyScrollLock(isOpen && isVisible);

  // ====================================
  // HANDLERS ESTABLES
  // ====================================

  const stableHandlers = useMemo(() => ({
    close: () => {
      if (isClosing) return;

      setIsClosing(true);
      setIsAnimating(false);

      // Animación de salida
      setTimeout(() => {
        setIsVisible(false);
        restoreFocus();
        onClose?.();

        // Callback después del cierre
        setTimeout(() => {
          onAfterClose?.();
        }, 50);
      }, MODAL_CONFIG.animationDuration);
    },

    overlayClick: (e) => {
      if (modalSettings.closeOnClick && e.target === overlayRef.current) {
        // Usar la función de cierre del mismo objeto
        stableHandlers.close();
      }
    }
  }), [isClosing, restoreFocus, onClose, onAfterClose, modalSettings.closeOnClick]);

  // Función de cierre expuesta para callbacks externos
  const handleClose = useCallback(() => {
    stableHandlers.close();
  }, [stableHandlers]);

  const handleOverlayClick = useCallback((e) => {
    stableHandlers.overlayClick(e);
  }, [stableHandlers]);

  // ====================================
  // EFECTOS - TODOS JUNTOS
  // ====================================

  // Mostrar modal con animación
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsAnimating(true);
        onOpen?.();
      }, 10);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onOpen]);

  // Auto-close
  useEffect(() => {
    if (!autoClose || !isOpen) return;

    const timer = setTimeout(() => {
      handleClose();
    }, typeof autoClose === 'number' ? autoClose : MODAL_CONFIG.defaultAutoClose);

    return () => clearTimeout(timer);
  }, [autoClose, isOpen, handleClose]);

  // Keyboard listeners
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e) => {
      if (modalSettings.closeOnEsc && e.key === 'Escape') {
        handleClose();
      }
      handleKeyDown(e);
    };

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isOpen, modalSettings.closeOnEsc, handleKeyDown, handleClose]);

  useEffect(() => {
    let active = true;

    if (INLINE_CUSTOM_TYPES.has(type)) {
      setLoadedRenderer(null);
      setRendererError(null);
      return () => {
        active = false;
      };
    }

    const loadRenderer = MODAL_RENDERER_GROUPS[type];
    if (!loadRenderer) {
      setLoadedRenderer(null);
      setRendererError(null);
      return () => {
        active = false;
      };
    }

    setLoadedRenderer(null);
    setRendererError(null);

    loadRenderer()
      .then((renderer) => {
        if (active) setLoadedRenderer(() => renderer);
      })
      .catch((error) => {
        modalLog.error(`No fue posible cargar el renderer del modal "${type}"`, error);
        if (active) setRendererError(error);
      });

    return () => {
      active = false;
    };
  }, [type]);

  // ====================================
  // CONTENIDO MEMOIZADO
  // ====================================

  const modalContent = useMemo(() => {
    if (type === 'custom') {
      return renderCustomContent({
        content,
        children,
        onClose: handleClose,
        showFooter,
        size: modalSize,
        ...modalProps,
      });
    }

    // Si no hay renderer, mostrar contenido básico
    if (loadedRenderer) {
      const Comp = loadedRenderer;
      return (
        <Comp
          type={type}
          title={modalTitle}
          message={message}
          content={content || children}
          onClose={handleClose}

          // ✅ Forward explícito de props “consumidas” por Modal.jsx
          showFooter={showFooter}
          showHeader={showHeader}
          size={modalSize}

          {...modalProps}
        />
      );
    }

    if (MODAL_RENDERER_GROUPS[type] && !rendererError) {
      return (
        <div className={MODAL_CLASSES.bodyContent}>
          <div className="flex min-h-[96px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            Cargando...
          </div>
        </div>
      );
    }

    // Fallback para tipos no implementados
    return (
      <>
        {/* Body por defecto */}
        <div className={MODAL_CLASSES.bodyContent}>
          {message && <p className="text-gray-600 dark:text-gray-300">{message}</p>}
          {content && (typeof content === 'string' ? <p>{content}</p> : content)}
          {children}
        </div>

        {/* Footer por defecto */}
        {showFooter && (
          <div className={MODAL_CLASSES.footer}>
            <div className={MODAL_CLASSES.footerButtons}>
              <button
                onClick={handleClose}
                className={`${MODAL_CLASSES.button.base} ${MODAL_CLASSES.button.primary}`}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </>
    );
  }, [type, loadedRenderer, rendererError, modalTitle, message, content, children, showFooter, showHeader, modalSize, handleClose, modalProps]);

  // CLASES CSS MEMOIZADAS
  const cssClasses = useMemo(() => ({
    overlay: `${MODAL_CLASSES.overlay.base} ${getModalPositionClasses(position)}`,
    backdrop: `${MODAL_CLASSES.overlay.backdrop} ${isAnimating ? 'opacity-100' : 'opacity-0'}`,
    modal: `${MODAL_CLASSES.modal.base} ${getModalSizeClasses(modalSize)} ${['clientWide', 'entityWide', 'minuteWide'].includes(modalSize) ? '!bg-transparent dark:!bg-transparent !shadow-none !border-0 overflow-visible rounded-[26px]' : ''} ${isAnimating
        ? MODAL_CLASSES.modal.enterActive
        : MODAL_CLASSES.modal.enter
      }`,
    header: `${MODAL_CLASSES.header.base} ${config.styles?.header || ''}`,
    headerTitle: MODAL_CLASSES.header.title,
    headerClose: MODAL_CLASSES.header.close
  }), [position, isAnimating, modalSize, config.styles]);

  // ====================================
  // RENDER CONDICIONAL
  // ====================================

  if (!isVisible) return null;

  // ====================================
  // RENDER PRINCIPAL
  // ====================================

  const modalElement = (
    <div
      className={cssClasses.overlay}
      style={{ zIndex: MODAL_CONFIG.baseZIndex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`modal-title-${uniqueId.current}`}
      aria-describedby={`modal-body-${uniqueId.current}`}
    >
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className={cssClasses.backdrop}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* FLEX CONTAINER: Añadido para centrar el modal */}
      <div className={
        modalSize === 'productPicker'
          ? 'flex min-h-full items-start justify-center px-[5vw] pb-[5vh] pt-[5vh]'
          : ['clientWide', 'entityWide', 'minuteWide'].includes(modalSize)
            ? 'flex min-h-full items-center justify-center px-0'
            : MODAL_CLASSES.overlay.container
      }>
        <div
          ref={modalRef}
          className={cssClasses.modal}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {showHeader && (
            <div className={cssClasses.header}>
              <h2
                id={`modal-title-${uniqueId.current}`}
                className={cssClasses.headerTitle}
              >
                {/* Icono del tipo */}
                {config.icon && (
                  <config.icon className={`w-5 h-5 mr-3 inline ${config.styles?.icon || ''}`} />
                )}
                {modalTitle}
              </h2>

              {/* Botón cerrar */}
              {modalSettings.showClose && (
                <button
                  onClick={handleClose}
                  className={cssClasses.headerClose}
                  aria-label={MODAL_CONFIG.accessibility.closeLabel}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Contenido dinámico según el tipo */}
          <div id={`modal-body-${uniqueId.current}`}>
            {modalContent}
          </div>
        </div>
      </div>
    </div>
  );


  // Renderizar en portal
  const container = document.getElementById('modal-root') || document.body;
  return createPortal(modalElement, container);
};

// ====================================
// COMPONENTE WRAPPER PARA COMPATIBILIDAD
// ====================================

/**
 * Hook para usar modales de forma declarativa
 * @param {Object} config - Configuración del modal
 * @returns {Array} [isOpen, openModal, closeModal]
 */
export const useModal = (config = {}) => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const ModalComponent = useCallback((props) => (
    <Modal
      {...config}
      {...props}
      isOpen={isOpen}
      onClose={closeModal}
    />
  ), [config, isOpen, closeModal]);

  return [isOpen, openModal, closeModal, ModalComponent];
};

// ====================================
// UTILIDADES DE VALIDACIÓN
// ====================================

/**
 * Valida las props del modal
 * @param {Object} props - Props del modal
 */
const validateModalProps = (props) => {
  if (import.meta.env.DEV) {
    const { type, size, position } = props;

    if (type && !VALID_MODAL_TYPES.has(type)) {
      modalLog.warn(`Modal: Tipo "${type}" no implementado. Usando fallback.`);
    }

    if (size && !['small', 'medium', 'large', 'xlarge', 'fullscreen', 'fullscreenWide', 'pdfViewer', 'modalLarge', 'productPicker', 'clientWide', 'entityWide', 'minuteWide'].includes(size)) {
      modalLog.warn(`Modal: Tamaño "${size}" no válido. Usando "medium".`);
    }

    if (position && !['center', 'top', 'top-left', 'top-right'].includes(position)) {
      modalLog.warn(`Modal: Posición "${position}" no válida. Usando "center".`);
    }
  }
};

// HOC para validación en desarrollo
const withValidation = (Component) => {
  return (props) => {
    validateModalProps(props);
    return <Component {...props} />;
  };
};

// ====================================
// EXPORT PRINCIPAL
// ====================================

export default import.meta.env.DEV ? withValidation(Modal) : Modal;

// Named exports
export { Modal };
// Export tipos para TypeScript (si se usa)
export * from './modalTypes.js';
