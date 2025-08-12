// ====================================
// USE FOOTER SELECTORS HOOK
// Hook unificado para manejar todos los selectores del footer
// (Sucursal, Caja, Usuario, Turno)
// ====================================

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook principal para manejar todos los selectores del footer
 * Proporciona estado unificado y funciones para cada tipo de selector
 */
export const useFooterSelectors = (initialSession = {}) => {

    // ====================================
    // ESTADO PRINCIPAL
    // ====================================

    const [activeSelector, setActiveSelector] = useState(null);
    const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });
    const [isChanging, setIsChanging] = useState(false);
    const changeTimeoutRef = useRef(null);

    // Estado de sesión unificado
    const [sessionInfo, setSessionInfo] = useState({
        branch: initialSession.branch || 'Central',
        branchCode: initialSession.branchCode || 'CEN',
        branchId: initialSession.branchId || 'central',

        cashRegister: initialSession.cashRegister || '#1234',
        cashId: initialSession.cashId || 'cash-001',
        cashStatus: initialSession.cashStatus || 'active',

        username: initialSession.username || 'vsoto',
        userId: initialSession.userId || 'user-001',
        userFullName: initialSession.userFullName || 'Víctor Soto',
        userRole: initialSession.userRole || 'Admin',
        userEmail: initialSession.userEmail || 'v.soto@empresa.cl',

        shift: initialSession.shift || 'Mañana',
        shiftId: initialSession.shiftId || 'morning',
        shiftStatus: initialSession.shiftStatus || 'success',
        shiftStart: initialSession.shiftStart || '08:00',
        shiftEnd: initialSession.shiftEnd || '17:00'
    });

    // ====================================
    // DATOS DE SELECTORES - CONFIGURACIÓN
    // ====================================

    const selectorConfig = {
        branch: {
            title: 'Cambiar Sucursal',
            icon: '🏢',
            storageKey: 'selectedBranch',
            displayMode: 'modal' // 'modal' | 'dropdown'
        },
        cash: {
            title: 'Cambiar Caja',
            icon: '💰',
            storageKey: 'selectedCash',
            displayMode: 'dropdown'
        },
        user: {
            title: 'Cambiar Usuario',
            icon: '👤',
            storageKey: 'selectedUser',
            displayMode: 'modal'
        },
        shift: {
            title: 'Cambiar Turno',
            icon: '🕐',
            storageKey: 'selectedShift',
            displayMode: 'dropdown'
        }
    };

    // ====================================
    // EFECTOS - INICIALIZACIÓN Y PERSISTENCIA
    // ====================================

    // Cargar sesión desde localStorage al montar
    useEffect(() => {
        loadSessionFromStorage();
    }, []);

    // Guardar sesión cuando cambie
    useEffect(() => {
        saveSessionToStorage();
    }, [sessionInfo]);

    // Cleanup al desmontar
    useEffect(() => {
        return () => {
            if (changeTimeoutRef.current) {
                clearTimeout(changeTimeoutRef.current);
            }
        };
    }, []);

    // ====================================
    // FUNCIONES DE PERSISTENCIA
    // ====================================

    const loadSessionFromStorage = useCallback(() => {
        try {
            const sessionData = localStorage.getItem('currentSession');
            if (sessionData) {
                const parsed = JSON.parse(sessionData);
                setSessionInfo(prev => ({
                    ...prev,
                    ...parsed
                }));
            }
        } catch (error) {
            console.warn('⚠️ Error cargando sesión desde localStorage:', error);
        }
    }, []);

    const saveSessionToStorage = useCallback(() => {
        try {
            localStorage.setItem('currentSession', JSON.stringify({
                ...sessionInfo,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('⚠️ Error guardando sesión en localStorage:', error);
        }
    }, [sessionInfo]);

    // ====================================
    // FUNCIONES PRINCIPALES DE SELECTORES
    // ====================================

    /**
     * Abrir un selector específico
     * @param {string} selectorType - Tipo: 'branch', 'cash', 'user', 'shift'
     * @param {Object} position - Posición para dropdowns {x, y}
     * @param {Object} options - Opciones adicionales
     */
    const openSelector = useCallback((selectorType, position = null, options = {}) => {
        // Cerrar selector activo si hay uno
        if (activeSelector) {
            closeSelector();
        }

        // Configurar posición si se proporciona
        if (position) {
            setSelectorPosition(position);
        }

        // Abrir nuevo selector
        setActiveSelector(selectorType);

        console.log(`📝 Abriendo selector: ${selectorConfig[selectorType]?.title || selectorType}`);
    }, [activeSelector, selectorConfig]);

    /**
     * Cerrar el selector activo
     */
    const closeSelector = useCallback(() => {
        if (!isChanging) { // Prevenir cierre durante cambios
            setActiveSelector(null);
            setSelectorPosition({ x: 0, y: 0 });
        }
    }, [isChanging]);

    /**
     * Cambiar valor de un tipo específico
     * @param {string} type - Tipo: 'branch', 'cash', 'user', 'shift'
     * @param {Object} newValue - Nuevo valor con propiedades específicas
     */
    const changeValue = useCallback(async (type, newValue) => {
        setIsChanging(true);

        try {
            // Simular delay de cambio
            await new Promise(resolve => setTimeout(resolve, 800));

            // Actualizar estado según el tipo
            switch (type) {
                case 'branch':
                    setSessionInfo(prev => ({
                        ...prev,
                        branch: newValue.name,
                        branchCode: newValue.code,
                        branchId: newValue.id
                    }));
                    break;

                case 'cash':
                    setSessionInfo(prev => ({
                        ...prev,
                        cashRegister: newValue.number,
                        cashId: newValue.id,
                        cashStatus: newValue.status
                    }));
                    break;

                case 'user':
                    setSessionInfo(prev => ({
                        ...prev,
                        username: newValue.username,
                        userId: newValue.id,
                        userFullName: newValue.fullName,
                        userRole: newValue.role,
                        userEmail: newValue.email
                    }));
                    break;

                case 'shift':
                    setSessionInfo(prev => ({
                        ...prev,
                        shift: newValue.name,
                        shiftId: newValue.id,
                        shiftStatus: newValue.status,
                        shiftStart: newValue.start,
                        shiftEnd: newValue.end
                    }));
                    break;

                default:
                    throw new Error(`Tipo de cambio no soportado: ${type}`);
            }

            console.log(`✅ ${selectorConfig[type]?.title || type} cambiado exitosamente`);

            // Cerrar selector después del cambio
            closeSelector();

        } catch (error) {
            console.error(`❌ Error cambiando ${type}:`, error);
        } finally {
            setIsChanging(false);
        }
    }, [closeSelector, selectorConfig]);

    // ====================================
    // FUNCIONES ESPECÍFICAS POR TIPO
    // ====================================

    // Sucursal
    const openBranchSelector = useCallback((position) => {
        openSelector('branch', position);
    }, [openSelector]);

    const changeBranch = useCallback((branchData) => {
        return changeValue('branch', branchData);
    }, [changeValue]);

    // Caja
    const openCashSelector = useCallback((position) => {
        openSelector('cash', position);
    }, [openSelector]);

    const changeCash = useCallback((cashData) => {
        return changeValue('cash', cashData);
    }, [changeValue]);

    // Usuario
    const openUserSelector = useCallback((position) => {
        openSelector('user', position);
    }, [openSelector]);

    const changeUser = useCallback((userData) => {
        return changeValue('user', userData);
    }, [changeValue]);

    // Turno
    const openShiftSelector = useCallback((position) => {
        openSelector('shift', position);
    }, [openSelector]);

    const changeShift = useCallback((shiftData) => {
        return changeValue('shift', shiftData);
    }, [changeValue]);

    // ====================================
    // UTILIDADES Y HELPERS
    // ====================================

    /**
     * Obtener posición de un elemento para dropdown
     * @param {HTMLElement} element - Elemento de referencia
     * @returns {Object} Posición {x, y}
     */
    const getElementPosition = useCallback((element) => {
        if (!element) return { x: 0, y: 0 };

        const rect = element.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2, // Centro horizontal
            y: rect.bottom // Parte inferior del elemento
        };
    }, []);

    /**
     * Handler para click en icono de InfoGroup
     * @param {string} type - Tipo de selector
     * @param {Event} event - Evento de click
     */
    const handleIconClick = useCallback((type, event) => {
        event.preventDefault();
        event.stopPropagation();

        const element = event.currentTarget;
        const position = getElementPosition(element);

        openSelector(type, position);
    }, [openSelector, getElementPosition]);

    /**
     * Resetear toda la sesión a valores por defecto
     */
    const resetSession = useCallback(() => {
        setSessionInfo({
            branch: 'Central',
            branchCode: 'CEN',
            branchId: 'central',
            cashRegister: '#1234',
            cashId: 'cash-001',
            cashStatus: 'active',
            username: 'vsoto',
            userId: 'user-001',
            userFullName: 'Víctor Soto',
            userRole: 'Admin',
            userEmail: 'v.soto@empresa.cl',
            shift: 'Mañana',
            shiftId: 'morning',
            shiftStatus: 'success',
            shiftStart: '08:00',
            shiftEnd: '17:00'
        });

        console.log('🔄 Sesión reseteada a valores por defecto');
    }, []);

    /**
     * Verificar si un selector está activo
     * @param {string} type - Tipo de selector
     * @returns {boolean}
     */
    const isSelectorActive = useCallback((type) => {
        return activeSelector === type;
    }, [activeSelector]);

    /**
     * Obtener configuración de un selector
     * @param {string} type - Tipo de selector
     * @returns {Object}
     */
    const getSelectorConfig = useCallback((type) => {
        return selectorConfig[type] || {};
    }, [selectorConfig]);

    // ====================================
    // VALIDACIONES Y ESTADO
    // ====================================

    /**
     * Validar si se puede cambiar un valor
     * @param {string} type - Tipo de cambio
     * @returns {boolean}
     */
    const canChange = useCallback((type) => {
        if (isChanging) return false;

        // Aquí podrían ir validaciones específicas por tipo
        switch (type) {
            case 'branch':
                return true; // Siempre se puede cambiar sucursal
            case 'cash':
                return sessionInfo.cashStatus === 'active';
            case 'user':
                return true; // Validaciones de permisos aquí
            case 'shift':
                return sessionInfo.shiftStatus !== 'locked';
            default:
                return false;
        }
    }, [isChanging, sessionInfo]);

    // ====================================
    // API GLOBAL - COMPATIBILIDAD CON TEMPLATE
    // ====================================

    useEffect(() => {
        // Exponer funciones globales para compatibilidad
        window.FooterSelectorsAPI = {
            // Funciones principales
            openBranchSelector,
            openCashSelector,
            openUserSelector,
            openShiftSelector,

            // Funciones de cambio
            changeBranch,
            changeCash,
            changeUser,
            changeShift,

            // Utilidades
            closeSelector,
            resetSession,
            getSessionInfo: () => sessionInfo,

            // Estado
            isChanging,
            activeSelector
        };

        // Función de compatibilidad con template original
        window.updateSystemFooter = (type, value) => {
            switch (type) {
                case 'branch':
                    changeBranch(value);
                    break;
                case 'cash':
                    changeCash(value);
                    break;
                case 'user':
                    changeUser(value);
                    break;
                case 'shift':
                    changeShift(value);
                    break;
                default:
                    console.warn('Tipo de actualización no reconocido:', type);
            }
        };

        return () => {
            // Cleanup API global
            delete window.FooterSelectorsAPI;
            delete window.updateSystemFooter;
        };
    }, [
        openBranchSelector, openCashSelector, openUserSelector, openShiftSelector,
        changeBranch, changeCash, changeUser, changeShift,
        closeSelector, resetSession, sessionInfo, isChanging, activeSelector
    ]);

    // ====================================
    // RETURN - API DEL HOOK
    // ====================================

    return {
        // Estado principal
        sessionInfo,
        activeSelector,
        selectorPosition,
        isChanging,

        // Funciones principales
        openSelector,
        closeSelector,
        changeValue,

        // Funciones específicas por tipo
        openBranchSelector,
        changeBranch,
        openCashSelector,
        changeCash,
        openUserSelector,
        changeUser,
        openShiftSelector,
        changeShift,

        // Utilidades
        handleIconClick,
        getElementPosition,
        resetSession,
        isSelectorActive,
        getSelectorConfig,
        canChange,

        // Configuración
        selectorConfig,

        // Persistencia
        loadSessionFromStorage,
        saveSessionToStorage
    };
};

// ====================================
// HOOKS ESPECÍFICOS POR TIPO
// ====================================

/**
 * Hook específico para selector de sucursal
 */
export const useBranchSelector = (initialBranch) => {
    const {
        sessionInfo,
        activeSelector,
        selectorPosition,
        isChanging,
        openBranchSelector,
        changeBranch,
        closeSelector,
        handleIconClick,
        isSelectorActive
    } = useFooterSelectors({ branch: initialBranch });

    return {
        currentBranch: sessionInfo.branch,
        branchCode: sessionInfo.branchCode,
        isOpen: isSelectorActive('branch'),
        position: selectorPosition,
        isChanging,
        openSelector: openBranchSelector,
        changeValue: changeBranch,
        closeSelector,
        handleIconClick: (event) => handleIconClick('branch', event)
    };
};

/**
 * Hook específico para selector de caja
 */
export const useCashSelector = (initialCash) => {
    const {
        sessionInfo,
        activeSelector,
        selectorPosition,
        isChanging,
        openCashSelector,
        changeCash,
        closeSelector,
        handleIconClick,
        isSelectorActive
    } = useFooterSelectors({ cashRegister: initialCash });

    return {
        currentCash: sessionInfo.cashRegister,
        cashStatus: sessionInfo.cashStatus,
        isOpen: isSelectorActive('cash'),
        position: selectorPosition,
        isChanging,
        openSelector: openCashSelector,
        changeValue: changeCash,
        closeSelector,
        handleIconClick: (event) => handleIconClick('cash', event)
    };
};

/**
 * Hook específico para selector de usuario
 */
export const useUserSelector = (initialUser) => {
    const {
        sessionInfo,
        activeSelector,
        selectorPosition,
        isChanging,
        openUserSelector,
        changeUser,
        closeSelector,
        handleIconClick,
        isSelectorActive
    } = useFooterSelectors({ username: initialUser });

    return {
        currentUser: {
            username: sessionInfo.username,
            fullName: sessionInfo.userFullName,
            role: sessionInfo.userRole,
            email: sessionInfo.userEmail
        },
        isOpen: isSelectorActive('user'),
        position: selectorPosition,
        isChanging,
        openSelector: openUserSelector,
        changeValue: changeUser,
        closeSelector,
        handleIconClick: (event) => handleIconClick('user', event)
    };
};

/**
 * Hook específico para selector de turno
 */
export const useShiftSelector = (initialShift) => {
    const {
        sessionInfo,
        activeSelector,
        selectorPosition,
        isChanging,
        openShiftSelector,
        changeShift,
        closeSelector,
        handleIconClick,
        isSelectorActive
    } = useFooterSelectors({ shift: initialShift });

    return {
        currentShift: {
            name: sessionInfo.shift,
            status: sessionInfo.shiftStatus,
            start: sessionInfo.shiftStart,
            end: sessionInfo.shiftEnd
        },
        isOpen: isSelectorActive('shift'),
        position: selectorPosition,
        isChanging,
        openSelector: openShiftSelector,
        changeValue: changeShift,
        closeSelector,
        handleIconClick: (event) => handleIconClick('shift', event)
    };
};

// ====================================
// EXPORT POR DEFECTO
// ====================================

export default useFooterSelectors;