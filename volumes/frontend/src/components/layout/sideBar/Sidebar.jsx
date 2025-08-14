import { useSidebar } from "@/store/sidebarStore";
import { cn } from "@/utils/cn";
import SidebarBrand from "./SidebarBrand";
import SidebarToggle from "./SidebarToggle";
import SidebarNav from "./SidebarNav";
import SidebarControls from "./SidebarControls";
import "./Sidebar.css"; // Importar estilos específicos del sidebar

/**
 * Componente principal del Sidebar
 * Maneja el layout y la estructura general del sidebar
 */
function Sidebar({ className }) {
  const { isCollapsed, isDarkMode, toggleCollapsed } = useSidebar();

  return (
    <aside
      className={cn(
        // Layout base
        "col-start-1 row-span-full",
        "flex flex-col",
        "transition-all duration-500 ease-in-out",
        "relative overflow-hidden",
        "z-fixed",

        // Dimensiones
        isCollapsed ? "w-20 min-w-20" : "w-70 min-w-70",
        "h-screen",

        // Gradiente de fondo - modo claro
        "bg-gradient-to-b from-slate-700 to-slate-800",

        // Gradiente de fondo - modo oscuro
        isDarkMode && "from-slate-900 to-black",

        // Texto y sombra
        "text-white",
        "shadow-lg",

        className
      )}
    >
      {/* Botón de Toggle Circular */}
      <SidebarToggle
        isCollapsed={isCollapsed}
        onClick={toggleCollapsed}
        isDarkMode={isDarkMode}
      />

      {/* Brand del Sistema */}
      <SidebarBrand isCollapsed={isCollapsed} isDarkMode={isDarkMode} />

      {/* Navegación Principal */}
      <SidebarNav isCollapsed={isCollapsed} isDarkMode={isDarkMode} />

      {/* Controles del Sidebar (al final) */}
      <div className="mt-auto flex-shrink-0">
        {/* Controles (Tema, etc.) */}
        <SidebarControls isCollapsed={isCollapsed} isDarkMode={isDarkMode} />
      </div>
    </aside>
  );
}

export default Sidebar;
