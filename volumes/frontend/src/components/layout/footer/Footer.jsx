// ====================================
// FOOTER COMPONENT - COMPONENTE PRINCIPAL INTEGRADO
// Versión final con todos los componentes y hooks desarrollados
// ====================================

import { useEffect } from 'react';
import { cn } from '@/utils/cn';
import { useFooterSelectors } from '@/hooks/useFooterSelectors';
import { BranchInfoGroup,  CashInfoGroup,  UserInfoGroup  } from './InfoGroupWithIcon';
import Divider from './Divider';

import FooterLink from './FooterLink';

/**
 * Componente principal del Footer
 * Integra todos los selectores, hooks y funcionalidades desarrolladas
 */
function Footer({ className }) {
  
  // ====================================
  // HOOK PRINCIPAL - GESTIÓN UNIFICADA
  // ====================================
  
  const {
    // Estado principal
    sessionInfo,
    activeSelector,
    isChanging,
    
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
    closeSelector,
    resetSession,
    getSelectorConfig
  } = useFooterSelectors();

  // ====================================
  // INICIALIZACIÓN - REPLICA DEL TEMPLATE
  // ====================================

  useEffect(() => {
    setupFooter();
  }, []);

  const setupFooter = () => {
    try {
      console.log('🦶 Footer del sistema inicializado correctamente');
      console.log('📋 Información de sesión cargada:', sessionInfo);
      
    } catch (error) {
      console.error('❌ Error inicializando footer:', error);
    }
  };

  // ====================================
  // MANEJO DE ENLACES - REPLICA DEL TEMPLATE
  // ====================================

  const handleFooterLink = (action, linkText) => {
    const actions = {
      support: () => openModal('Soporte Técnico', 'Se abriría el centro de soporte técnico del sistema'),
      help: () => openModal('Centro de Ayuda', 'Se abriría la documentación completa del sistema')
    };

    if (actions[action]) {
      actions[action]();
    }
    
    console.log(`🔗 Enlace clickeado: ${linkText}`);
  };

  const openModal = (title, content) => {
    // Por ahora usar alert, igual que el template original
    // En una implementación real, aquí se abriría un modal personalizado
    alert(`${title}\n\n${content}`);
  };

  // ====================================
  // HANDLERS ESPECÍFICOS PARA ICONOS
  // ====================================

  const handleBranchIconClick = (event) => {
    openModal('branch', "Esto es contenido")
    //handleIconClick('branch', event);
  };

  const handleCashIconClick = (event) => {
    openModal('branch', "Esto es contenido")
    //handleIconClick('cash', event);
  };

  // const handleUserIconClick = (event) => {
  //   //handleIconClick('user', event);
  // };

  // const handleShiftIconClick = (event) => {
  //   //handleIconClick('shift', event);
  // };

  // ====================================
  // HANDLERS PARA CAMBIOS DE VALORES
  // ====================================

  const handleBranchChange = (branchData) => {
    console.log('🏢 Cambiando sucursal:', branchData);
    //changeBranch(branchData);
  };

  // const handleCashChange = (cashData) => {
  //   console.log('💰 Cambiando caja:', cashData);
  //   changeCash(cashData);
  // };

  // const handleUserChange = (userData) => {
  //   console.log('👤 Cambiando usuario:', userData);
  //   changeUser(userData);
  // };

  // const handleShiftChange = (shiftData) => {
  //   console.log('🕐 Cambiando turno:', shiftData);
  //   changeShift(shiftData);
  // };

  // ====================================
  // EXPONER API GLOBAL - COMPATIBILIDAD CON TEMPLATE
  // ====================================

  useEffect(() => {
    // API global para compatibilidad con el template original
    window.SystemFooterAPI = {
      // Información de sesión
      getSessionInfo: () => sessionInfo,
      
      // Funciones de cambio directo (compatibilidad)
      changeBranch: (branchName) => {
        //changeBranch({ name: branchName, code: branchName.slice(0, 3).toUpperCase(), id: branchName.toLowerCase() });
      },
      changeCashRegister: (cashNumber) => {
        //changeCash({ number: cashNumber, id: `cash-${cashNumber}`, status: 'active' });
      },
      changeUser: (username, fullName, role) => {
        //changeUser({ username, fullName, role, id: `user-${username}`, email: `${username}@empresa.cl` });
      },
      changeShift: (shiftName, status = 'success') => {
        //changeShift({ name: shiftName, status, id: shiftName.toLowerCase(), start: '08:00', end: '17:00' });
      },
      
      // Funciones de apertura de selectores
      openBranchSelector,
      openCashSelector,
      openUserSelector,
      openShiftSelector,
      
      // Utilidades
      closeSelector,
      resetSession,
      isChanging
    };

    // Función de compatibilidad con template original
    window.updateSystemFooter = (type, value) => {
      switch(type) {
        case 'branch':
          window.SystemFooterAPI.changeBranch(value);
          break;
        case 'cash':
          window.SystemFooterAPI.changeCashRegister(value);
          break;
        case 'user':
          window.SystemFooterAPI.changeUser(value.username, value.fullName, value.role);
          break;
        case 'shift':
          window.SystemFooterAPI.changeShift(value.name, value.status);
          break;
        default:
          console.warn('Tipo de actualización no reconocido:', type);
      }
    };

    return () => {
      // Cleanup API global
      delete window.SystemFooterAPI;
      delete window.updateSystemFooter;
    };
  }, [
    sessionInfo, changeBranch, changeCash, changeUser, changeShift,
    openBranchSelector, openCashSelector, openUserSelector, openShiftSelector,
    closeSelector, resetSession, isChanging
  ]);

  // ====================================
  // RENDER PRINCIPAL
  // ====================================

  return (
    <>
      <footer 
        className={cn(
          // Layout base - REPLICA EXACTA DEL CSS DEL TEMPLATE
          "flex items-center justify-between",
          "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300",
          "border-t border-gray-200 dark:border-gray-700",
          "px-6 lg:px-8 xl:px-12",
          "h-12", // Altura fija
          "relative z-10",
          
          // Transiciones
          "transition-all duration-300 ease-in-out",
          
          // Sombra sutil
          "shadow-[0_-1px_3px_rgba(0,0,0,0.1)]",
          
          // Responsive
          "text-sm",
          "min-w-0 flex-shrink-0",
          
          // Estados
          isChanging && "opacity-75 pointer-events-none",
          
          className
        )}
        id="systemFooter"
      >
        
        {/* Sección Izquierda - Copyright y Enlaces */}
        <div className="flex items-center gap-6 min-w-0 flex-shrink-1">
          
          {/* Enlaces - Ocultos en móvil */}
          <div className="hidden md:flex items-center gap-4">
            <FooterLink onClick={() => handleFooterLink('support', 'Soporte')}>
              Soporte
            </FooterLink>
            <span className="text-gray-400 dark:text-gray-500">|</span>
            <FooterLink onClick={() => handleFooterLink('help', 'Ayuda')}>
              Ayuda
            </FooterLink>
          </div>
        </div>
        
        {/* Sección Derecha - Información Operativa CON ICONOS CLICKEABLES */}
        <div className="flex items-center gap-4 lg:gap-6 min-w-0 flex-shrink-0 font-medium">
          
          {/* Sucursal CON ICONO - Usando componente específico */}
          <BranchInfoGroup 
            label="Sucursal:"
            value={sessionInfo.branch}
            title="Sucursal actual - Click para cambiar"
            onIconClick={handleBranchIconClick}
            
          />
          
          <Divider />
          
          {/* Caja CON ICONO - Oculto en móvil pequeño */}
          <CashInfoGroup 
            label="Caja:"
            value={sessionInfo.cashRegister}
            className="hidden sm:flex"
            title="Caja registradora activa - Click para cambiar"
            onIconClick={handleCashIconClick}
          />
          
          <Divider className="hidden sm:block" />
          
          {/* Usuario CON ICONO - Versión compacta en móvil */}
          <UserInfoGroup 
            label="Usuario:"
            value={sessionInfo.username}
            role={sessionInfo.userRole}
            iconClickable={false}
          />
        </div>

        {/* Indicador de carga global */}
        {isChanging && (
          <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-50 flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              <span>Actualizando...</span>
            </div>
          </div>
        )}
      </footer>



      {/* Overlay para cerrar selectores (click fuera) */}
      {activeSelector && getSelectorConfig(activeSelector).displayMode === 'modal' && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeSelector}
        />
      )}
    </>
  );
}

export default Footer;