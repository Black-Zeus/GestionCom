// ====================================
// FOOTER COMPONENT - ACTUALIZADO CON MODALES
// Versión modificada: eliminados "Online" y "Compacto",
// agregada funcionalidad modal para Sucursal y Caja
// ====================================

import { useEffect, useMemo } from "react";
import { cn } from "@/utils/cn";
import { useAuth } from "@/store/authStore";
import { useLayoutStore } from "@/store/layoutStore";
import { useSidebar } from "@/store/sidebarStore";
import { useModal } from "@/components/ui/modal"; // ✅ AGREGADO

// Importar componentes del footer
import FooterLink from "./FooterLink";
import {
  BranchInfoGroup,
  CashInfoGroup,
  UserInfoGroup,
  ShiftInfoGroup,
} from "./InfoGroupWithIcon";

// ✅ AGREGADO: Importar selectores para modales
import BranchSelector from "./BranchSelector";
// import CashSelector from "./CashSelector"; // ❌ COMENTADO: Archivo no existe aún

/**
 * Componente Footer modificado con funcionalidad modal
 * ✅ CAMBIOS: Eliminados "Online" y "Compacto", agregados modales para Sucursal y Caja
 */
function Footer({ className }) {
  // ====================================
  // HOOKS Y ESTADO
  // ====================================

  // Usuario desde authStore (SSOT)
  const user = useAuth((state) => state.user);

  // Layout context
  const layoutContext = useLayoutStore((state) => state.layoutContext);

  // Tema sincronizado
  const { isDarkMode } = useSidebar();

  // ✅ AGREGADO: Hooks para modales
  const [isBranchModalOpen, openBranchModal, closeBranchModal, BranchModal] =
    useModal({
      type: "custom",
      size: "medium",
      title: "Seleccionar Sucursal",
    });

  // ❌ COMENTADO: CashSelector no existe aún
  // const [isCashModalOpen, openCashModal, closeCashModal, CashModal] = useModal({
  //   type: 'custom',
  //   size: 'medium',
  //   title: 'Seleccionar Caja'
  // });

  // ====================================
  // DATOS MEMOIZADOS
  // ====================================

  const sessionInfo = useMemo(
    () => ({
      // Datos del usuario desde authStore
      user: user?.username || "sistema",
      userFullName: user?.full_name || "Usuario",
      userRole: user?.roles?.[0] || "User",
      userEmail: user?.email || "",

      // Contexto de trabajo desde layoutStore
      branch: layoutContext?.currentBranch?.name || "Central",
      branchCode: layoutContext?.currentBranch?.code || "CEN",
      cashRegister: layoutContext?.currentCashRegister?.name || "#1234",
      shift: layoutContext?.currentShift?.name || "Mañana",
      shiftStatus: layoutContext?.currentShift?.status || "active",
    }),
    [user, layoutContext]
  );

  // ====================================
  // HANDLERS ESTABLES - MODIFICADOS
  // ====================================

  // ✅ AGREGADO: Handlers para modales
  const handleBranchClick = useMemo(
    () => () => {
      console.log("Abriendo modal de sucursal");
      openBranchModal();
    },
    [openBranchModal]
  );

  // ✅ MODIFICADO: Usuario sin funcionalidad de click
  const handleUserClick = useMemo(
    () => () => {
      // Usuario ya no cambia colores, solo es informativo
      console.log("Usuario - solo informativo");
    },
    []
  );

  // ❌ TEMPORAL: Cash sin modal hasta crear CashSelector
  const handleCashClick = useMemo(
    () => () => {
      console.log("Modal de caja pendiente - CashSelector no creado aún");
    },
    []
  );

  const handleFooterLink = useMemo(
    () => (action) => {
      const actions = {
        support: () => {
          console.log("Abrir soporte técnico");
          window.open("mailto:soporte@tuempresa.com", "_blank");
        },
        help: () => {
          console.log("Abrir ayuda");
        },
        docs: () => {
          console.log("Abrir documentación");
          window.open("/docs", "_blank");
        },
      };

      actions[action]?.();
    },
    []
  );

  // ====================================
  // INICIALIZACIÓN
  // ====================================

  useEffect(() => {
    console.log("🦶 Footer del sistema inicializado correctamente");
    console.log(`🎨 Tema inicial: ${isDarkMode ? "Oscuro" : "Claro"}`);
  }, []);

  // ====================================
  // RENDER PRINCIPAL
  // ====================================

  return (
    <>
      <footer
        className={cn(
          // Layout base
          "flex items-center justify-between",
          "relative z-20",
          "h-12",
          "px-6 lg:px-8 xl:px-12",
          "min-w-0 flex-shrink-0",

          // Fondos sincronizados con darkmode
          "bg-white dark:bg-gray-900",
          "border-t border-gray-200 dark:border-gray-700",

          // Textos sincronizados
          "text-sm text-gray-600 dark:text-gray-400",

          // Transiciones suaves
          "transition-all duration-300 ease-in-out",

          // Sombras sincronizadas
          "shadow-[0_-1px_3px_rgba(0,0,0,0.05)]",
          "dark:shadow-[0_-1px_3px_rgba(0,0,0,0.15)]",

          className
        )}
        id="systemFooter"
      >
        {/* ================================ */}
        {/* SECCIÓN IZQUIERDA - ENLACES */}
        {/* ================================ */}
        <div className="flex items-center gap-6 min-w-0 flex-shrink-1">
          <div className="flex items-center gap-4">
            <FooterLink
              onClick={() => handleFooterLink("support")}
              className={cn(
                "transition-all duration-200",
                "hover:text-blue-600 dark:hover:text-blue-400",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                "dark:focus:ring-offset-gray-900"
              )}
            >
              Soporte
            </FooterLink>

            <div className="w-px h-3 bg-gray-300 dark:bg-gray-600 transition-colors duration-300" />

            <FooterLink
              onClick={() => handleFooterLink("help")}
              className={cn(
                "transition-all duration-200",
                "hover:text-blue-600 dark:hover:text-blue-400",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                "dark:focus:ring-offset-gray-900"
              )}
            >
              Ayuda
            </FooterLink>
          </div>
        </div>

        {/* ================================ */}
        {/* SECCIÓN DERECHA - INFORMACIÓN OPERATIVA */}
        {/* ================================ */}
        <div className="flex items-center gap-4 min-w-0 flex-shrink-0">
          {/* ✅ MODIFICADO: Información de Sucursal - Ahora clickeable para modal */}
          <BranchInfoGroup
            branch={sessionInfo.branch}
            branchCode={sessionInfo.branchCode}
            onIconClick={handleBranchClick}
            className={cn(
              "transition-all duration-200 cursor-pointer",
              "px-2 py-1 rounded-md",
              "hover:bg-gray-100 dark:hover:bg-gray-700",
              "hover:text-blue-600 dark:hover:text-blue-400"
            )}
          />

          {/* Separador */}
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 transition-colors duration-300" />

          {/* ✅ MODIFICADO: Información de Caja - Ahora clickeable para modal */}
          <CashInfoGroup
            cashRegister={sessionInfo.cashRegister}
            onIconClick={handleCashClick}
            className={cn(
              "transition-all duration-200 cursor-pointer",
              "px-2 py-1 rounded-md",
              "hover:bg-gray-100 dark:hover:bg-gray-700",
              "hover:text-orange-600 dark:hover:text-orange-400"
            )}
          />

          {/* Separador - Solo laptop+ */}
          <div className="hidden lg:block w-px h-4 bg-gray-300 dark:bg-gray-600 transition-colors duration-300" />

          {/* ✅ MODIFICADO: Información de Usuario - Solo informativo, sin click */}
          <div className="hidden lg:block">
            <UserInfoGroup
              user={sessionInfo.user}
              userFullName={sessionInfo.userFullName}
              userRole={sessionInfo.userRole}
              onIconClick={handleUserClick}
              iconClickable={false} // ✅ DESACTIVADO: No clickeable
              className={cn(
                "transition-all duration-200",
                "px-2 py-1 rounded-md"
                // ✅ ELIMINADO: Sin hover effects ni cambios de color
              )}
            />
          </div>

          {/* Separador - Solo desktop */}
          <div className="hidden xl:block w-px h-4 bg-gray-300 dark:bg-gray-600 transition-colors duration-300" />

          {/* ✅ MANTENIDO: Información de Turno - Solo desktop */}
          <div className="hidden xl:block">
            <ShiftInfoGroup
              shift={sessionInfo.shift}
              shiftStatus={sessionInfo.shiftStatus}
              className={cn(
                "transition-all duration-200",
                "px-2 py-1 rounded-md"
              )}
            />
          </div>

          {/* ✅ ELIMINADO: Los campos "Online" y "Compacto" que estaban aquí */}
        </div>
      </footer>

      {/* ================================ */}
      {/* ✅ AGREGADO: MODALES */}
      {/* ================================ */}

      {/* Modal de Sucursal */}
      <BranchModal>
        <BranchSelector
          isOpen={isBranchModalOpen}
          onClose={closeBranchModal}
          currentBranch={sessionInfo.branch}
          displayMode="modal"
          onBranchChange={(branch) => {
            console.log("Sucursal cambiada:", branch);
            closeBranchModal();
          }}
        />
      </BranchModal>

      {/* ❌ COMENTADO: Modal de Caja pendiente */}
      {/* <CashModal>
        <CashSelector
          isOpen={isCashModalOpen}
          onClose={closeCashModal}
          currentCash={sessionInfo.cashRegister}
          displayMode="modal"
          onCashChange={(cash) => {
            console.log("Caja cambiada:", cash);
            closeCashModal();
          }}
        />
      </CashModal> */}
    </>
  );
}

export default Footer;
