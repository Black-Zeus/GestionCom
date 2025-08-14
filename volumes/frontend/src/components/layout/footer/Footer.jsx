// ====================================
// FOOTER COMPONENT - VERSIÓN FINAL LIMPIA
// Sin Usuario, sin Modal TEST, solo Sucursal y Caja con modales
// ====================================

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/utils/cn";
import { useAuth } from "@/store/authStore";
import { useLayoutStore } from "@/store/layoutStore";
import { useSidebar } from "@/store/sidebarStore";
import { Modal } from "@/components/ui/modal";

// Importar componentes del footer
import FooterLink from "./FooterLink";
import { BranchInfoGroup, CashInfoGroup } from "./InfoGroupWithIcon";

// Importar selectores para modales
import BranchSelector from "./BranchSelector";
import CashSelector from "./CashSelector";

/**
 * Componente Footer - Versión final limpia
 * ✅ SOLO: Soporte, Ayuda, Docs | Sucursal, Caja, Turno
 * ✅ SIN: Usuario, Modal TEST
 */
function Footer({ className }) {
  // ====================================
  // HOOKS Y ESTADO
  // ====================================

  // Usuario desde authStore (solo para verificar si existe)
  const user = useAuth((state) => state.user);

  // Layout context
  const layoutContext = useLayoutStore((state) => state.layoutContext);

  // Tema sincronizado
  const { isDarkMode } = useSidebar();

  // Estados para modales
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState(null);

  // Estado local para sessionInfo
  const [sessionInfo, setSessionInfo] = useState(() => ({
    // Solo datos operativos - SIN datos de usuario ni turno
    branch: layoutContext?.currentBranch?.name || "Central",
    branchCode: layoutContext?.currentBranch?.code || "CEN",
    branchId: layoutContext?.currentBranch?.id || 1,
    cashRegister: layoutContext?.currentCashRegister?.name || "#1234",
    cashId: layoutContext?.currentCashRegister?.id || 1,
    cashStatus: layoutContext?.currentCashRegister?.status || "active",
  }));

  // ====================================
  // HANDLERS
  // ====================================

  // Handlers para abrir modales
  const handleBranchClick = useMemo(
    () => () => {
      console.log("🎯 Abriendo modal de sucursal");
      setIsBranchModalOpen(true);
    },
    []
  );

  const handleCashClick = useMemo(
    () => () => {
      console.log("🎯 Abriendo modal de caja");
      setIsCashModalOpen(true);
    },
    []
  );

  // Handlers para cerrar modales
  const handleCloseBranchModal = useMemo(
    () => () => {
      setIsBranchModalOpen(false);
    },
    []
  );

  const handleCloseCashModal = useMemo(
    () => () => {
      setIsCashModalOpen(false);
    },
    []
  );

  // Handlers para cambios con confirmación
  const handleBranchChange = useMemo(
    () => (newBranch) => {
      console.log("🔄 Solicitando cambio de sucursal a:", newBranch);

      // Si es la misma sucursal, solo cerrar
      if (newBranch.name === sessionInfo.branch) {
        console.log("⚠️ Misma sucursal seleccionada");
        handleCloseBranchModal();
        return;
      }

      // Preparar confirmación
      setPendingChange({
        type: "branch",
        data: newBranch,
        current: { name: sessionInfo.branch, code: sessionInfo.branchCode },
      });

      handleCloseBranchModal();
      setIsConfirmationModalOpen(true);
    },
    [sessionInfo.branch, sessionInfo.branchCode, handleCloseBranchModal]
  );

  const handleCashChange = useMemo(
    () => (newCash) => {
      console.log("🔄 Solicitando cambio de caja a:", newCash);

      // Si es la misma caja, solo cerrar
      if (newCash.name === sessionInfo.cashRegister) {
        console.log("⚠️ Misma caja seleccionada");
        handleCloseCashModal();
        return;
      }

      // Preparar confirmación
      setPendingChange({
        type: "cash",
        data: newCash,
        current: { name: sessionInfo.cashRegister, id: sessionInfo.cashId },
      });

      handleCloseCashModal();
      setIsConfirmationModalOpen(true);
    },
    [sessionInfo.cashRegister, sessionInfo.cashId, handleCloseCashModal]
  );

  // Handlers para confirmación
  const handleConfirmChange = useMemo(
    () => () => {
      if (!pendingChange) return;

      console.log(`✅ Confirmando cambio de ${pendingChange.type}`);

      if (pendingChange.type === "branch") {
        setSessionInfo((prev) => ({
          ...prev,
          branch: pendingChange.data.name,
          branchCode: pendingChange.data.code,
          branchId: pendingChange.data.id,
        }));
      } else if (pendingChange.type === "cash") {
        setSessionInfo((prev) => ({
          ...prev,
          cashRegister: pendingChange.data.name,
          cashId: pendingChange.data.id,
          cashStatus: pendingChange.data.status,
        }));
      }

      setPendingChange(null);
      setIsConfirmationModalOpen(false);
    },
    [pendingChange]
  );

  const handleCancelChange = useMemo(
    () => () => {
      console.log("❌ Cambio cancelado");
      setPendingChange(null);
      setIsConfirmationModalOpen(false);
    },
    []
  );

  // Handler para links del footer
  const handleFooterLink = useMemo(
    () => (action) => {
      const actions = {
        support: () => {
          console.log("Abrir soporte técnico");
          window.open("mailto:soporte@tuempresa.com", "_blank");
        },
        help: () => {
          console.log("Navegando a ayuda en la misma página");
          // Navegación interna - misma página
          window.location.href = "/help";
          // O si usas React Router: navigate("/help");
        },
        docs: () => {
          console.log("Abrir documentación en nueva pestaña");
          // Nueva pestaña
          window.open("/docs", "_blank");
        },
      };

      actions[action]?.();
    },
    []
  );

  // ====================================
  // EFECTOS
  // ====================================

  useEffect(() => {
    console.log("🦶 Footer inicializado correctamente");
    console.log(`🎨 Tema: ${isDarkMode ? "Oscuro" : "Claro"}`);
  }, [isDarkMode]);

  // ====================================
  // RENDER
  // ====================================

  return (
    <>
      <footer
        className={cn(
          // Layout base
          "flex items-center justify-between",
          "relative z-20 h-12",
          "px-6 lg:px-8 xl:px-12",
          "min-w-0 flex-shrink-0",

          // Fondos y bordes
          "bg-white dark:bg-gray-900",
          "border-t border-gray-200 dark:border-gray-700",

          // Textos
          "text-sm text-gray-600 dark:text-gray-400",

          // Transiciones y sombras
          "transition-all duration-300 ease-in-out",
          "shadow-[0_-1px_3px_rgba(0,0,0,0.05)]",
          "dark:shadow-[0_-1px_3px_rgba(0,0,0,0.15)]",

          className
        )}
        id="systemFooter"
      >
        {/* SECCIÓN IZQUIERDA - ENLACES */}
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

        {/* SECCIÓN DERECHA - INFORMACIÓN OPERATIVA */}
        <div className="flex items-center gap-4 min-w-0 flex-shrink-0">
          {/* Sucursal - Clickeable */}
          <BranchInfoGroup
            branch={sessionInfo.branch}
            branchCode={sessionInfo.branchCode}
            onClick={handleBranchClick}
            className={cn("hover:text-blue-600 dark:hover:text-blue-400")}
          />

          {/* Separador */}
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 transition-colors duration-300" />

          {/* Caja - Clickeable */}
          <CashInfoGroup
            cashRegister={sessionInfo.cashRegister}
            onClick={handleCashClick}
            className={cn("hover:text-orange-600 dark:hover:text-orange-400")}
          />
        </div>
      </footer>

      {/* MODALES */}

      {/* Modal de Sucursal */}
      {isBranchModalOpen && (
        <Modal
          isOpen={isBranchModalOpen}
          onClose={handleCloseBranchModal}
          title="Seleccionar Sucursal"
          size="medium"
          type="custom"
        >
          <BranchSelector
            isOpen={isBranchModalOpen}
            onClose={handleCloseBranchModal}
            currentBranch={sessionInfo.branch}
            displayMode="modal"
            onBranchChange={handleBranchChange}
          />
        </Modal>
      )}

      {/* Modal de Caja */}
      {isCashModalOpen && (
        <Modal
          isOpen={isCashModalOpen}
          onClose={handleCloseCashModal}
          title="Seleccionar Caja"
          size="medium"
          type="custom"
        >
          <CashSelector
            isOpen={isCashModalOpen}
            onClose={handleCloseCashModal}
            currentCash={sessionInfo.cashRegister}
            displayMode="modal"
            onCashChange={handleCashChange}
          />
        </Modal>
      )}

      {/* Modal de Confirmación */}
      {isConfirmationModalOpen && pendingChange && (
        <Modal
          isOpen={isConfirmationModalOpen}
          onClose={handleCancelChange}
          title="Confirmar Cambio"
          size="small"
          type="warning"
        >
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 dark:text-yellow-400 text-xl">
                  {pendingChange.type === "branch" ? "🏢" : "💰"}
                </span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {pendingChange.type === "branch"
                    ? "Cambiar Sucursal"
                    : "Cambiar Caja"}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Esta acción afectará tu sesión actual
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Actual:
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {pendingChange.type === "branch"
                      ? `${pendingChange.current.name} (${pendingChange.current.code})`
                      : pendingChange.current.name}
                  </p>
                </div>
                <div className="text-gray-400 text-xl">→</div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nuevo:
                  </p>
                  <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {pendingChange.type === "branch"
                      ? `${pendingChange.data.name} (${pendingChange.data.code})`
                      : pendingChange.data.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-blue-500 dark:text-blue-400 text-sm">
                    ℹ️
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {pendingChange.type === "branch"
                      ? "Al cambiar de sucursal, podrías perder acceso a algunos datos específicos de la sucursal actual."
                      : "Al cambiar de caja, se cerrará la sesión actual y deberás validar la nueva caja."}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelChange}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmChange}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Confirmar Cambio
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export default Footer;
