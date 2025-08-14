// ====================================
// HOOK PARA SELECTORES DEL FOOTER - ACTUALIZADO CON MODALES
// Gestión completa de selectores con soporte modal y dropdown
// ✅ MODIFICADO: displayMode cambiado a 'modal' para Branch y Cash
// ====================================

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook principal para manejar selectores del footer
 * ✅ MODIFICADO: Cambiado displayMode a 'modal' para sucursal y caja
 */
const useFooterSelectors = (initialSession = {}) => {
    // ====================================
    // ESTADO DEL HOOK
    // ====================================

    // Información de sesión
    const [sessionInfo, setSessionInfo] = useState({
        // Datos de usuario
        username: initialSession.username || 'sistema',
        userFullName: initialSession.userFullName || 'Usuario',
        userRole: initialSession.userRole || 'User',
        userEmail: initialSession.userEmail || '',

        // Datos de trabajo
        branch: initialSession.branch || 'Central',
        branchCode: initialSession.branchCode || 'CEN',
        branchId: initialSession.branchId || 1,

        cashRegister: initialSession.cashRegister || '#1234',
        cashId: initialSession.cashId || 1,
        cashStatus: initialSession.cashStatus || 'active',

        shift: initialSession.shift || 'Mañana',
        shiftId: initialSession.shiftId || 1,
        shiftStatus: initialSession.shiftStatus || 'active',
        shiftStart: initialSession.shiftStart || null,
        shiftEnd: initialSession.shiftEnd || null,

        // Metadatos
        sessionStart: initialSession.sessionStart || Date.now(),
        lastActivity: initialSession.lastActivity || Date.now()
    });

    // Control de selectores
    const [activeSelector, setActiveSelector] = useState(null);
    const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });
    const [isChanging, setIsChanging] = useState(false);

    // Referencias
    const changeTimeoutRef = useRef(null);

    // ====================================
    // CONFIGURACIÓN DE SELECTORES - ✅ MODIFICADA
    // ====================================

    const selectorConfig = {
        branch: {
            title: 'Cambiar Sucursal',
            icon: '🏢',
            storageKey: 'selectedBranch',
            displayMode: 'modal' // ✅ CAMBIADO: de 'dropdown' a 'modal'
        },
        cash: {
            title: 'Cambiar Caja',
            icon: '💰',
            storageKey: 'selectedCash',
            displayMode: 'modal' // ✅ CAMBIADO: de 'dropdown' a 'modal'
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
            displayMode: 'dropdown' // ✅ MANTENIDO: sigue siendo dropdown
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
    const openSelector = useCallback((selectorType, position = { x: 0, y: 0 }, options = {}) => {
        if (!selectorConfig[selectorType]) {
            console.warn(`❌ Selector tipo "${selectorType}" no existe`);
            return;
        }

        // ✅ MODIFICADO: Solo establecer posición para dropdowns
        if (selectorConfig[selectorType].displayMode === 'dropdown') {
            setSelectorPosition(position);
        }

        setActiveSelector(selectorType);
        console.log(`🎯 Abriendo selector: ${selectorConfig[selectorType].title}`);
    }, [selectorConfig]);

    /**
     * Cerrar el selector activo
     */
    const closeSelector = useCallback(() => {
        setActiveSelector(null);
        setSelectorPosition({ x: 0, y: 0 });
        console.log('❌ Selector cerrado');
    }, []);

    /**
     * Cambiar valor de un selector
     * @param {string} type - Tipo de selector
     * @param {any} newValue - Nuevo valor
     */
    const changeValue = useCallback(async (type, newValue) => {
        if (!selectorConfig[type]) {
            throw new Error(`Tipo de selector "${type}" no válido`);
        }

        setIsChanging(true);

        try {
            // Simular delay de cambio
            await new Promise(resolve => {
                changeTimeoutRef.current = setTimeout(resolve, 800);
            });

            // Actualizar según el tipo
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
                        cashRegister: newValue.name,
                        cashId: newValue.id,
                        cashStatus: newValue.status
                    }));
                    break;

                case 'user':
                    setSessionInfo(prev => ({
                        ...prev,
                        username: newValue.username,
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

    // Sucursal - ✅ AHORA ABRE MODAL
    const openBranchSelector = useCallback((position) => {
        openSelector('branch', position);
    }, [openSelector]);

    const changeBranch = useCallback((branchData) => {
        return changeValue('branch', branchData);
    }, [changeValue]);

    // Caja - ✅ AHORA ABRE MODAL
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

    // Turno - ✅ MANTIENE DROPDOWN
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
     */
    const getElementPosition = useCallback((element) => {
        if (!element) return { x: 0, y: 0 };

        const rect = element.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top
        };
    }, []);

    /**
     * Handler para click en iconos (simplificado para modales)
     * @param {string} selectorType - Tipo de selector
     * @param {Event} event - Evento de click
     */
    const handleIconClick = useCallback((selectorType, event) => {
        event?.preventDefault();
        event?.stopPropagation();

        const config = selectorConfig[selectorType];

        if (config?.displayMode === 'modal') {
            // ✅ PARA MODALES: Solo abrir, sin posición
            openSelector(selectorType);
        } else {
            // Para dropdowns: calcular posición
            const position = getElementPosition(event?.currentTarget);
            openSelector(selectorType, position);
        }
    }, [openSelector, getElementPosition, selectorConfig]);

    /**
     * Verificar si un selector está activo
     * @param {string} selectorType - Tipo de selector
     */
    const isSelectorActive = useCallback((selectorType) => {
        return activeSelector === selectorType;
    }, [activeSelector]);

    /**
     * Obtener configuración de un selector
     * @param {string} selectorType - Tipo de selector
     */
    const getSelectorConfig = useCallback((selectorType) => {
        return selectorConfig[selectorType];
    }, [selectorConfig]);

    /**
     * Verificar si se puede cambiar un selector
     * @param {string} selectorType - Tipo de selector
     */
    const canChange = useCallback((selectorType) => {
        return !isChanging && selectorConfig[selectorType];
    }, [isChanging, selectorConfig]);

    /**
     * Resetear sesión a valores por defecto
     */
    const resetSession = useCallback(() => {
        setSessionInfo({
            username: 'sistema',
            userFullName: 'Usuario',
            userRole: 'User',
            userEmail: '',
            branch: 'Central',
            branchCode: 'CEN',
            branchId: 1,
            cashRegister: '#1234',
            cashId: 1,
            cashStatus: 'active',
            shift: 'Mañana',
            shiftId: 1,
            shiftStatus: 'active',
            shiftStart: null,
            shiftEnd: null,
            sessionStart: Date.now(),
            lastActivity: Date.now()
        });

        closeSelector();
        console.log('🔄 Sesión reseteada');
    }, [closeSelector]);

    // ====================================
    // MEMOIZAR RESULTADO PARA RENDIMIENTO
    // ====================================

    return useMemo(() => ({
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
    }), [
        sessionInfo, activeSelector, selectorPosition, isChanging,
        openSelector, closeSelector, changeValue,
        openBranchSelector, changeBranch, openCashSelector, changeCash,
        openUserSelector, changeUser, openShiftSelector, changeShift,
        handleIconClick, getElementPosition, resetSession,
        isSelectorActive, getSelectorConfig, canChange,
        selectorConfig, loadSessionFromStorage, saveSessionToStorage
    ]);
};

// ====================================
// HOOKS ESPECÍFICOS POR TIPO
// ====================================

/**
 * Hook específico para selector de sucursal
 * ✅ AHORA FUNCIONA CON MODAL
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
 * ✅ AHORA FUNCIONA CON MODAL
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
 * ✅ MANTIENE FUNCIONALIDAD DROPDOWN
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