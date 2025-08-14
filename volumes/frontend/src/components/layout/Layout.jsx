import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useSidebar } from "@/store/sidebarStore";
import { cn } from "@/utils/cn";
import Header from "./header/Header";
import Sidebar from "./sideBar/Sidebar";
import Main from "./Main";
import Footer from "./footer/Footer";

function Layout({ children }) {
  const { isCollapsed, isDarkMode, initialize } = useSidebar();

  // ==========================================
  // INICIALIZACIÓN DEL LAYOUT
  // ==========================================
  useEffect(() => {
    // Inicializar el sidebar store al montar el layout
    initialize();
  }, [initialize]);

  // ==========================================
  // APLICAR TEMA AL HTML PARA MÁXIMA COMPATIBILIDAD
  // ==========================================
  useEffect(() => {
    // Aplicar clase dark también al elemento html para mayor consistencia
    const htmlElement = document.documentElement;

    if (isDarkMode) {
      htmlElement.classList.add("dark");
    } else {
      htmlElement.classList.remove("dark");
    }

    // Cleanup al desmontar
    return () => {
      htmlElement.classList.remove("dark");
    };
  }, [isDarkMode]);

  return (
    <div
      className={cn(
        // Layout base
        "w-full h-screen grid transition-all duration-300 ease-in-out",

        // Grid columns dinámico según sidebar
        isCollapsed ? "grid-cols-[80px_1fr]" : "grid-cols-[280px_1fr]",

        // Grid rows fijo
        "grid-rows-[64px_1fr_48px]",

        // Clases de tema para el contenedor principal
        "bg-white dark:bg-slate-900",
        "text-gray-900 dark:text-gray-100",

        // Asegurar que el layout no cause overflow
        "overflow-hidden"
      )}
    >
      {/* ==========================================
          SIDEBAR - Ocupa todas las filas
      ========================================== */}
      <Sidebar className="col-start-1 row-span-3 z-30" />

      {/* ==========================================
          HEADER
      ========================================== */}
      <Header
        className={cn(
          "col-start-2 row-start-1 z-20",
          // Asegurar transición suave en cambios de tema
          "transition-colors duration-300"
        )}
      />

      {/* ==========================================
          MAIN CONTENT AREA
      ========================================== */}
      <Main
        className={cn(
          "col-start-2 row-start-2 overflow-y-auto",
          // Fondo adaptativo para el contenido principal
          "bg-gray-50 dark:bg-slate-800",
          // Transición suave
          "transition-colors duration-300"
        )}
      >
        {/* 
            Renderizado condicional:
            - Si hay children (uso directo), los renderiza
            - Si no hay children (uso con Router), renderiza Outlet 
        */}
        {children || <Outlet />}
      </Main>

      {/* ==========================================
          FOOTER
      ========================================== */}
      <Footer
        className={cn(
          "col-start-2 row-start-3 z-20",
          // Asegurar transición suave
          "transition-colors duration-300"
        )}
      />

      {/* ==========================================
          OVERLAY PARA MOBILE (Futuro)
      ========================================== */}
      {/* 
      Comentado por ahora, pero preparado para funcionalidad mobile
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => closeMobile()}
        />
      )} 
      */}
    </div>
  );
}

export default Layout;
