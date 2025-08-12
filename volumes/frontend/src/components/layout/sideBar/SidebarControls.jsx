import { cn } from '@/utils/cn';
import { useSidebar } from '@/store/sidebarStore';

/**
 * Componente de Controles del Sidebar
 * Incluye toggle de tema y otros controles de configuración
 */
function SidebarControls({ isCollapsed, isDarkMode, className }) {
  const { toggleTheme } = useSidebar();

  const handleThemeToggle = () => {
    toggleTheme();
    //console.log(`🌙 Tema cambiado a: ${isDarkMode ? 'Claro' : 'Oscuro'}`);
  };

  return (
    <div className={cn(
      // Padding y espaciado  
      "px-4 pb-6 pt-4",
      
      // Bordes
      "border-t border-white/10",
      isDarkMode && "border-white/15",
      
      // Fondo
      "bg-black/10",
      
      className
    )}>
      
      {/* Control de Tema */}
      <div
        onClick={handleThemeToggle}
        className={cn(
          // Layout
          "flex items-center",
          "p-3 cursor-pointer",
          "rounded-md",
          
          // Transiciones
          "transition-all duration-300",
          
          // Estados hover
          "hover:bg-white/10 hover:translate-x-0.5"
        )}
      >
        
        {/* Icono del Tema */}
        <span className={cn(
          "w-5 text-center text-lg",
          "text-white/80 mr-3",
          "transition-all duration-300"
        )}>
          🌙
        </span>

        {/* Texto del Control */}
        <span className={cn(
          "flex-1 text-sm",
          "text-white/90",
          "transition-all duration-300 ease-bounce",
          "whitespace-nowrap",
          
          // Estados según collapse
          isCollapsed ? [
            "opacity-0",
            "invisible",
            "w-0"
          ] : [
            "opacity-100",
            "visible",
            "w-auto"
          ]
        )}>
          Modo Oscuro
        </span>

        {/* Toggle Switch */}
        <div className={cn(
          "relative transition-all duration-300 ease-bounce",
          
          // Estados según collapse
          isCollapsed ? [
            "opacity-0",
            "invisible"
          ] : [
            "opacity-100",
            "visible"
          ]
        )}>
          
          {/* Switch Container */}
          <div className={cn(
            // Dimensiones
            "w-11 h-6",
            
            // Colores
            isDarkMode ? "bg-primary-color" : "bg-white/20",
            
            // Forma
            "rounded-full",
            
            // Cursor y transiciones
            "cursor-pointer",
            "transition-all duration-300",
            
            // Borde
            "border border-white/10",
            isDarkMode && "border-primary-color"
          )}>
            
            {/* Switch Thumb */}
            <div className={cn(
              // Posición
              "absolute top-0.5 transition-transform duration-300 ease-bounce",
              
              // Dimensiones
              "w-4.5 h-4.5",
              
              // Colores
              "bg-white",
              
              // Forma
              "rounded-full",
              
              // Sombra
              "shadow-sm",
              
              // Transformación según estado
              isDarkMode ? "translate-x-5" : "translate-x-0.5"
            )} />
          </div>
        </div>
      </div>
      
      {/* Aquí podrías agregar más controles en el futuro */}
      {/* 
      <div className="mt-2">
        <OtroControl />
      </div>
      */}
    </div>
  );
}

export default SidebarControls;