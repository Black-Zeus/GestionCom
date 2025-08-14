// ====================================
// FOOTER COMPONENT - SINCRONIZADO CON SIDEBAR DARKMODE
// Versión optimizada con sincronización perfecta del tema
// ====================================

import { useEffect, useMemo } from "react";
import { cn } from "@/utils/cn";
import { useAuth } from "@/store/authStore";
import { useLayoutStore } from "@/store/layoutStore";
import { useSidebar } from "@/store/sidebarStore"; // ✅ AÑADIDO: Conexión con sidebar

// Importar componentes del footer
import FooterLink from "./FooterLink";
import {
  BranchInfoGroup,
  CashInfoGroup,
  UserInfoGroup,
  ShiftInfoGroup,
} from "./InfoGroupWithIcon";

/**
 * Componente Footer optimizado con sincronización de tema
 * ✅ MEJORADO: Conectado al sidebarStore para darkMode sincronizado
 */
function Footer({ className }) {
  // ====================================
  // HOOKS Y ESTADO - SELECTORES ESPECÍFICOS
  // ====================================

  // Usuario desde authStore (SSOT)
  const user = useAuth((state) => state.user);

  // Layout context - Selectores específicos para evitar re-renders
  const layoutContext = useLayoutStore((state) => state.layoutContext);
  const activeFooterSelector = useLayoutStore(
    (state) => state.activeFooterSelector
  );
  const setActiveFooterSelector = useLayoutStore(
    (state) => state.setActiveFooterSelector
  );
  const closeFooterSelector = useLayoutStore(
    (state) => state.closeFooterSelector
  );

  // ✅ CONECTAR AL SIDEBAR STORE PARA TEMA SINCRONIZADO
  const { isDarkMode, isCollapsed } = useSidebar();

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
  // HANDLERS ESTABLES
  // ====================================

  const handleSelectorClick = useMemo(
    () => (selectorType) => {
      if (activeFooterSelector === selectorType) {
        closeFooterSelector();
      } else {
        setActiveFooterSelector(selectorType);
      }
    },
    [activeFooterSelector, closeFooterSelector, setActiveFooterSelector]
  );

  const handleFooterLink = useMemo(
    () => (action) => {
      const actions = {
        support: () => {
          console.log("Abrir soporte técnico");
          // Aquí puedes integrar con tu sistema de soporte
          window.open("mailto:soporte@tuempresa.com", "_blank");
        },
        help: () => {
          console.log("Abrir ayuda");
          // Aquí puedes abrir un modal de ayuda o documentación
        },
        docs: () => {
          console.log("Abrir documentación");
          // Aquí puedes abrir la documentación del sistema
          window.open("/docs", "_blank");
        },
      };

      actions[action]?.();
    },
    []
  );

  // ====================================
  // INICIALIZACIÓN (SOLO UNA VEZ)
  // ====================================

  useEffect(() => {
    console.log("🦶 Footer del sistema inicializado correctamente");
    console.log(`🎨 Tema inicial: ${isDarkMode ? "Oscuro" : "Claro"}`);
  }, []); // Array vacío - solo se ejecuta una vez

  // ✅ LOG OPCIONAL PARA DEBUG DE TEMA (comentado para producción)
  // useEffect(() => {
  //   console.log(`🦶 Footer - Tema cambiado a: ${isDarkMode ? 'Oscuro' : 'Claro'}`);
  // }, [isDarkMode]);

  // ====================================
  // RENDER PRINCIPAL
  // ====================================

  return (
    <footer
      className={cn(
        // === LAYOUT BASE ===
        "flex items-center justify-between",
        "relative z-20", // ✅ MEJORADO: z-index consistente con header
        "h-12", // ✅ MEJORADO: altura explícita en lugar de variable
        "px-6 lg:px-8 xl:px-12",
        "min-w-0 flex-shrink-0",

        // ✅ FONDOS SINCRONIZADOS CON TAILWIND DARKMODE
        "bg-white dark:bg-gray-900",
        "border-t border-gray-200 dark:border-gray-700",

        // ✅ TEXTOS SINCRONIZADOS
        "text-sm text-gray-600 dark:text-gray-400",

        // ✅ TRANSICIONES SUAVES PARA CAMBIOS DE TEMA
        "transition-all duration-300 ease-in-out",

        // ✅ SOMBRAS SINCRONIZADAS
        "shadow-[0_-1px_3px_rgba(0,0,0,0.05)]",
        "dark:shadow-[0_-1px_3px_rgba(0,0,0,0.15)]",

        // ✅ ESTADOS MEJORADOS
        activeFooterSelector && "bg-gray-50 dark:bg-gray-800/50",

        className
      )}
      id="systemFooter"
    >
      {/* ================================ */}
      {/* SECCIÓN IZQUIERDA - ENLACES */}
      {/* ================================ */}
      <div className="flex items-center gap-6 min-w-0 flex-shrink-1">
        {/* Enlaces de navegación */}
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

          {/* Documentación - Solo tablet+ */}
          <div className="hidden md:flex items-center gap-4">
            <div className="w-px h-3 bg-gray-300 dark:bg-gray-600 transition-colors duration-300" />
            <FooterLink
              onClick={() => handleFooterLink("docs")}
              className={cn(
                "transition-all duration-200",
                "hover:text-blue-600 dark:hover:text-blue-400",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                "dark:focus:ring-offset-gray-900"
              )}
            >
              Docs
            </FooterLink>
          </div>
        </div>
      </div>

      {/* ================================ */}
      {/* SECCIÓN DERECHA - INFORMACIÓN OPERATIVA */}
      {/* ================================ */}
      <div className="flex items-center gap-4 min-w-0 flex-shrink-0">
        {/* Información de Sucursal */}
        <BranchInfoGroup
          branch={sessionInfo.branch}
          branchCode={sessionInfo.branchCode}
          onClick={() => handleSelectorClick("branch")}
          className={cn(
            "transition-all duration-200 cursor-pointer",
            "px-2 py-1 rounded-md",
            "hover:bg-gray-100 dark:hover:bg-gray-700",
            activeFooterSelector === "branch" && [
              "bg-blue-50 dark:bg-blue-900/20",
              "text-blue-600 dark:text-blue-400",
            ]
          )}
        />

        {/* Separador */}
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 transition-colors duration-300" />

        {/* Información de Caja */}
        <CashInfoGroup
          cashRegister={sessionInfo.cashRegister}
          onClick={() => handleSelectorClick("cash")}
          className={cn(
            "transition-all duration-200 cursor-pointer",
            "px-2 py-1 rounded-md",
            "hover:bg-gray-100 dark:hover:bg-gray-700",
            activeFooterSelector === "cash" && [
              "bg-orange-50 dark:bg-orange-900/20",
              "text-orange-600 dark:text-orange-400",
            ]
          )}
        />

        {/* Separador - Solo laptop+ */}
        <div className="hidden lg:block w-px h-4 bg-gray-300 dark:bg-gray-600 transition-colors duration-300" />

        {/* Información de Usuario - Solo laptop+ */}
        <div className="hidden lg:block">
          <UserInfoGroup
            user={sessionInfo.user}
            userFullName={sessionInfo.userFullName}
            userRole={sessionInfo.userRole}
            onClick={() => handleSelectorClick("user")}
            className={cn(
              "transition-all duration-200 cursor-pointer",
              "px-2 py-1 rounded-md",
              "hover:bg-gray-100 dark:hover:bg-gray-700",
              activeFooterSelector === "user" && [
                "bg-green-50 dark:bg-green-900/20",
                "text-green-600 dark:text-green-400",
              ]
            )}
          />
        </div>

        {/* Separador - Solo desktop */}
        <div className="hidden xl:block w-px h-4 bg-gray-300 dark:bg-gray-600 transition-colors duration-300" />

        {/* Información de Turno - Solo desktop */}
        <div className="hidden xl:block">
          <ShiftInfoGroup
            shift={sessionInfo.shift}
            shiftStatus={sessionInfo.shiftStatus}
            onClick={() => handleSelectorClick("shift")}
            className={cn(
              "transition-all duration-200 cursor-pointer",
              "px-2 py-1 rounded-md",
              "hover:bg-gray-100 dark:hover:bg-gray-700",
              activeFooterSelector === "shift" && [
                "bg-cyan-50 dark:bg-cyan-900/20",
                "text-cyan-600 dark:text-cyan-400",
              ]
            )}
          />
        </div>

        {/* ✅ INDICADOR DE STATUS MEJORADO CON TEMA SINCRONIZADO */}
        <div className="flex items-center gap-2 ml-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              "bg-green-500 dark:bg-green-400",
              "shadow-sm shadow-green-500/30",
              "animate-pulse"
            )}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden md:inline transition-colors duration-300">
            Online
          </span>
        </div>

        {/* ✅ INDICADOR VISUAL DEL ESTADO DEL SIDEBAR (OPCIONAL) */}
        {isCollapsed && (
          <div className="flex items-center gap-1 ml-2 hidden lg:flex">
            <div className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" />
            <span className="text-xs text-blue-600 dark:text-blue-400">
              Compacto
            </span>
          </div>
        )}
      </div>

      {/* ================================ */}
      {/* EFECTO VISUAL SUTIL SINCRONIZADO */}
      {/* ================================ */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent opacity-60 transition-colors duration-300" />
    </footer>
  );
}

export default Footer;
