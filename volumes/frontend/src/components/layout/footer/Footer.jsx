// ====================================
// FOOTER COMPONENT - VERSIÓN SINCRONIZADA CON STORE
// ====================================

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/utils/cn";
import { useAuth } from "@/store/authStore";
import { useLayoutStore } from "@/store/layoutStore";
import { useSidebar } from "@/store/sidebarStore";
import { Modal } from "@/components/ui/modal";

import FooterLink from "./FooterLink";
import { BranchInfoGroup, CashInfoGroup } from "./InfoGroupWithIcon";

import BranchSelector from "./BranchSelector";
import CashSelector from "./CashSelector";

function Footer({ className }) {
  // Usuario (no lo usamos para mostrar, pero mantiene consistencia)
  const user = useAuth((state) => state.user);

  // Tomamos el layoutContext desde el store (ahí vendrá la sucursal/caja actuales)
  const layoutContext = useLayoutStore((state) => state.layoutContext);

  const { isDarkMode } = useSidebar();

  // Modales
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState(null);

  // Estado de lo que se muestra en el footer (sin defaults duros)
  const [sessionInfo, setSessionInfo] = useState({
    branch: "—",
    branchCode: "",
    branchId: null,
    cashRegister: "—",
    cashId: null,
    cashStatus: "",
  });

  // 🔄 Sincronizar con el store siempre que cambie layoutContext
  useEffect(() => {
    const b = layoutContext?.currentBranch;
    const c = layoutContext?.currentCashRegister;

    setSessionInfo((prev) => ({
      ...prev,
      branch: b?.name || "—",
      branchCode: b?.code || "",
      branchId: b?.id ?? null,
      cashRegister: c?.name || "—",
      cashId: c?.id ?? null,
      cashStatus: c?.status || "",
    }));
  }, [
    layoutContext?.currentBranch?.name,
    layoutContext?.currentBranch?.code,
    layoutContext?.currentBranch?.id,
    layoutContext?.currentCashRegister?.name,
    layoutContext?.currentCashRegister?.id,
    layoutContext?.currentCashRegister?.status,
  ]);

  // Openers
  const handleBranchClick = useMemo(
    () => () => setIsBranchModalOpen(true),
    []
  );
  const handleCashClick = useMemo(() => () => setIsCashModalOpen(true), []);

  // Closers
  const handleCloseBranchModal = useMemo(
    () => () => setIsBranchModalOpen(false),
    []
  );
  const handleCloseCashModal = useMemo(
    () => () => setIsCashModalOpen(false),
    []
  );

  // Peticiones de cambio (pre-confirmación)
  const handleBranchChange = useMemo(
    () => (newBranch) => {
      if (newBranch.name === sessionInfo.branch) {
        handleCloseBranchModal();
        return;
      }
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
      if (newCash.name === sessionInfo.cashRegister) {
        handleCloseCashModal();
        return;
      }
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

  // Confirmación de cambio (actualiza lo visible; idealmente aquí también
  // deberías disparar una acción del store para persistir en backend si aplica)
  const handleConfirmChange = useMemo(
    () => () => {
      if (!pendingChange) return;

      if (pendingChange.type === "branch") {
        setSessionInfo((prev) => ({
          ...prev,
          branch: pendingChange.data.name,
          branchCode: pendingChange.data.code,
          branchId: pendingChange.data.id,
        }));
        // TODO (opcional): useLayoutStore.getState().setCurrentBranch(pendingChange.data)
      } else if (pendingChange.type === "cash") {
        setSessionInfo((prev) => ({
          ...prev,
          cashRegister: pendingChange.data.name,
          cashId: pendingChange.data.id,
          cashStatus: pendingChange.data.status,
        }));
        // TODO (opcional): useLayoutStore.getState().setCurrentCash(pendingChange.data)
      }

      setPendingChange(null);
      setIsConfirmationModalOpen(false);
    },
    [pendingChange]
  );

  const handleCancelChange = useMemo(
    () => () => {
      setPendingChange(null);
      setIsConfirmationModalOpen(false);
    },
    []
  );

  // Links
  const handleFooterLink = useMemo(
    () => (action) => {
      const actions = {
        support: () => window.open("mailto:soporte@tuempresa.com", "_blank"),
        help: () => (window.location.href = "/help"),
        docs: () => window.open("/docs", "_blank"),
      };
      actions[action]?.();
    },
    []
  );

  useEffect(() => {
    // Log liviano
    // console.log("Footer listo. Tema:", isDarkMode ? "Oscuro" : "Claro");
  }, [isDarkMode]);

  return (
    <>
      <footer
        className={cn(
          "flex items-center justify-between",
          "relative z-20 h-12",
          "px-6 lg:px-8 xl:px-12",
          "min-w-0 flex-shrink-0",
          "bg-white dark:bg-gray-900",
          "border-t border-gray-200 dark:border-gray-700",
          "text-sm text-gray-600 dark:text-gray-400",
          "transition-all duration-300 ease-in-out",
          "shadow-[0_-1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_-1px_3px_rgba(0,0,0,0.15)]",
          className
        )}
        id="systemFooter"
      >
        {/* Izquierda: enlaces */}
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

            <div className="w-px h-3 bg-gray-300 dark:bg-gray-600" />

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

            <div className="w-px h-3 bg-gray-300 dark:bg-gray-600" />

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

        {/* Derecha: info operativa */}
        <div className="flex items-center gap-4 min-w-0 flex-shrink-0">
          <BranchInfoGroup
            branch={sessionInfo.branch}
            branchCode={sessionInfo.branchCode /* no muestra () si está vacío */}
            onClick={handleBranchClick}
            className="hover:text-blue-600 dark:hover:text-blue-400"
          />

          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

          <CashInfoGroup
            cashRegister={sessionInfo.cashRegister}
            onClick={handleCashClick}
            className="hover:text-orange-600 dark:hover:text-orange-400"
          />
        </div>
      </footer>

      {/* Modal Sucursal */}
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

      {/* Modal Caja */}
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

      {/* Confirmación */}
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
                  {pendingChange.type === "branch" ? "Cambiar Sucursal" : "Cambiar Caja"}
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
                      ? `${pendingChange.current.name}${pendingChange.current.code ? ` (${pendingChange.current.code})` : ""}`
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
                      ? `${pendingChange.data.name}${pendingChange.data.code ? ` (${pendingChange.data.code})` : ""}`
                      : pendingChange.data.name}
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
