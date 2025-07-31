// ====================================
// useHeaderDropdowns.js
// Hook especializado para el manejo de dropdowns del header
// ====================================

import { useCallback, useEffect, useRef } from 'react';
import { useHeaderStore } from '@/store/headerStore';

/**
 * Hook especializado para manejar los dropdowns del header
 * Proporciona funcionalidades avanzadas como cierre automático,
 * navegación por teclado y manejo de estados
 * 
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.closeOnOutsideClick - Cerrar al hacer clic fuera
 * @param {boolean} options.closeOnEscape - Cerrar con tecla Escape
 * @param {boolean} options.closeOnResize - Cerrar al redimensionar ventana
 * @param {string} options.defaultDropdown - Dropdown por defecto
 * @returns {Object} - Funciones y estados para manejar dropdowns
 */
export const useHeaderDropdowns = (options = {}) => {
    const {
        closeOnOutsideClick = true,
        closeOnEscape = true,
        closeOnResize = true,
        defaultDropdown = null
    } = options;

    const dropdownRef = useRef(null);

    // Estados del store
    const {
        activeDropdown,
        dropdownHistory,
        openDropdown,
        closeDropdown,
        toggleDropdown,
        closeAllDropdowns
    } = useHeaderStore();

    // ====================================
    // HANDLERS ESPECIALIZADOS
    // ====================================

    /**
     * Maneja clicks fuera del dropdown
     */
    const handleOutsideClick = useCallback((event) => {
        if (closeOnOutsideClick && dropdownRef.current &&
            !dropdownRef.current.contains(event.target)) {
            closeAllDropdowns();
        }
    }, [closeOnOutsideClick, closeAllDropdowns]);

    /**
     * Maneja teclas especiales
     */
    const handleKeyDown = useCallback((event) => {
        if (!activeDropdown) return;

        switch (event.key) {
            case 'Escape':
                if (closeOnEscape) {
                    event.preventDefault();
                    closeAllDropdowns();
                }
                break;

            case 'Tab':
                // Mantener focus dentro del dropdown
                if (dropdownRef.current) {
                    const focusableElements = dropdownRef.current.querySelectorAll(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );

                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];

                    if (event.shiftKey && document.activeElement === firstElement) {
                        event.preventDefault();
                        lastElement?.focus();
                    } else if (!event.shiftKey && document.activeElement === lastElement) {
                        event.preventDefault();
                        firstElement?.focus();
                    }
                }
                break;

            case 'ArrowDown':
            case 'ArrowUp':
                // Navegación vertical en dropdowns
                event.preventDefault();
                navigateDropdownItems(event.key === 'ArrowDown' ? 'down' : 'up');
                break;
        }
    }, [activeDropdown, closeOnEscape, closeAllDropdowns]);

    /**
     * Navega entre elementos del dropdown con teclado
     */
    const navigateDropdownItems = useCallback((direction) => {
        if (!dropdownRef.current) return;

        const items = dropdownRef.current.querySelectorAll(
            '[role="menuitem"], button:not([disabled]), a[href]'
        );

        if (items.length === 0) return;

        const currentIndex = Array.from(items).findIndex(item =>
            item === document.activeElement
        );

        let nextIndex;
        if (direction === 'down') {
            nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }

        items[nextIndex]?.focus();
    }, []);

    /**
     * Maneja redimensionamiento de ventana
     */
    const handleResize = useCallback(() => {
        if (closeOnResize && activeDropdown) {
            closeAllDropdowns();
        }
    }, [closeOnResize, activeDropdown, closeAllDropdowns]);

    // ====================================
    // EFECTOS
    // ====================================

    // Event listeners globales
    useEffect(() => {
        if (activeDropdown) {
            document.addEventListener('mousedown', handleOutsideClick);
            document.addEventListener('keydown', handleKeyDown);

            if (closeOnResize) {
                window.addEventListener('resize', handleResize);
            }

            return () => {
                document.removeEventListener('mousedown', handleOutsideClick);
                document.removeEventListener('keydown', handleKeyDown);

                if (closeOnResize) {
                    window.removeEventListener('resize', handleResize);
                }
            };
        }
    }, [activeDropdown, handleOutsideClick, handleKeyDown, handleResize, closeOnResize]);

    // Auto-abrir dropdown por defecto
    useEffect(() => {
        if (defaultDropdown && !activeDropdown) {
            const timer = setTimeout(() => {
                openDropdown(defaultDropdown);
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [defaultDropdown, activeDropdown, openDropdown]);

    // ====================================
    // FUNCIONES AVANZADAS
    // ====================================

    /**
     * Abre un dropdown con opciones adicionales
     */
    const openDropdownWithOptions = useCallback((dropdownId, options = {}) => {
        const { focus = true, closeOthers = true } = options;

        if (closeOthers) {
            closeAllDropdowns();
        }

        openDropdown(dropdownId);

        if (focus && dropdownRef.current) {
            setTimeout(() => {
                const firstFocusable = dropdownRef.current.querySelector(
                    'button, [href], input, select, textarea'
                );
                firstFocusable?.focus();
            }, 100);
        }
    }, [openDropdown, closeAllDropdowns]);

    /**
     * Cicla entre dropdowns disponibles
     */
    const cycleDropdowns = useCallback((dropdownIds = []) => {
        if (dropdownIds.length === 0) return;

        const currentIndex = dropdownIds.indexOf(activeDropdown);
        const nextIndex = (currentIndex + 1) % dropdownIds.length;

        openDropdown(dropdownIds[nextIndex]);
    }, [activeDropdown, openDropdown]);

    /**
     * Vuelve al dropdown anterior
     */
    const goToPreviousDropdown = useCallback(() => {
        if (dropdownHistory.length > 0) {
            const previousDropdown = dropdownHistory[dropdownHistory.length - 1];
            openDropdown(previousDropdown);
        }
    }, [dropdownHistory, openDropdown]);

    /**
     * Verifica si un dropdown está abierto
     */
    const isDropdownOpen = useCallback((dropdownId) => {
        return activeDropdown === dropdownId;
    }, [activeDropdown]);

    /**
     * Obtiene el estado completo de dropdowns
     */
    const getDropdownState = useCallback(() => {
        return {
            active: activeDropdown,
            history: [...dropdownHistory],
            hasActive: !!activeDropdown,
            hasHistory: dropdownHistory.length > 0
        };
    }, [activeDropdown, dropdownHistory]);

    // ====================================
    // UTILIDADES DE ANIMACIÓN
    // ====================================

    /**
     * Clase CSS para animaciones de entrada
     */
    const getEnterClass = useCallback((dropdownId) => {
        if (activeDropdown === dropdownId) {
            return 'animate-slide-in-up opacity-100';
        }
        return 'opacity-0 pointer-events-none';
    }, [activeDropdown]);

    /**
     * Props comunes para dropdowns
     */
    const getDropdownProps = useCallback((dropdownId) => {
        return {
            ref: dropdownRef,
            'data-dropdown-id': dropdownId,
            role: 'menu',
            'aria-labelledby': `${dropdownId}-trigger`,
            className: `dropdown-menu ${getEnterClass(dropdownId)}`,
            onKeyDown: handleKeyDown
        };
    }, [getEnterClass, handleKeyDown, dropdownRef]);

    // ====================================
    // DEBUGGING Y DESARROLLO
    // ====================================

    const debugDropdowns = useCallback(() => {
        //console.log('🐛 Dropdown Debug:', {
        //  active: activeDropdown,
        //  history: dropdownHistory,
        //  ref: dropdownRef.current?.tagName,
        //  options: { closeOnOutsideClick, closeOnEscape, closeOnResize }
        //});
    }, [activeDropdown, dropdownHistory, closeOnOutsideClick, closeOnEscape, closeOnResize]);

    // ====================================
    // RETURN OBJECT
    // ====================================

    return {
        // Estados básicos
        activeDropdown,
        dropdownHistory,
        hasActiveDropdown: !!activeDropdown,

        // Referencias
        dropdownRef,

        // Acciones básicas
        openDropdown,
        closeDropdown,
        toggleDropdown,
        closeAllDropdowns,

        // Acciones avanzadas
        openDropdownWithOptions,
        cycleDropdowns,
        goToPreviousDropdown,

        // Utilidades
        isDropdownOpen,
        getDropdownState,
        getDropdownProps,
        getEnterClass,

        // Debugging
        debugDropdowns,

        // Handlers (por si se necesitan externamente)
        handleOutsideClick,
        handleKeyDown,
        navigateDropdownItems
    };
};

export default useHeaderDropdowns;