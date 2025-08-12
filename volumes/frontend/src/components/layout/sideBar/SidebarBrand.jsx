import { cn } from '@/utils/cn';
import logoFull from '@/assets/images/logo.png';
import logoMini from '@/assets/images/logo_mini.png';

/**
 * Componente de Brand/Logo del Sidebar
 */
function SidebarBrand({ isCollapsed, isDarkMode, className }) {

  return (
    <div className={cn(
      "px-6 py-5 pb-4",
      "border-b border-white/10",
      isDarkMode && "border-white/15",
      "flex items-center",
      isCollapsed ? "justify-center" : "justify-start gap-3",
      "flex-shrink-0 mt-5 min-h-[64px]", // altura mínima para alinear con el contenedor del logo
      className
    )}>

      {/* Contenedor visual del logo */}
      <div className={cn(
        "overflow-hidden",
        "transition-all duration-500 ease-out",
        "border border-white rounded-md",
        "flex items-center justify-center", // centrado perfecto
        isCollapsed
          ? "w-[64px] h-[64px]" // dimensiones explícitas 64x64
          : "w-full h-[64px]" // ancho expandido, altura fija
      )}>

        {isCollapsed ? (
          // Logo Mini - Forzar dimensiones exactas 64x64
          <img
            src={logoMini}
            alt="Logo Mini"
            className="w-[64px] h-[64px] object-cover brightness-110 contrast-110"
          />
        ) : (
          // Logo Completo
          <img
            src={logoFull}
            alt="Logo Sistema"
            className="w-full h-full object-cover brightness-110 contrast-110"
          />
        )}
      </div>
    </div>
  );
}

export default SidebarBrand;