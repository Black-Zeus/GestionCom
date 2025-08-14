import { cn } from "@/utils/cn";
import { useSidebar } from "@/store/sidebarStore";

/**
 * Componente de Controles del Sidebar
 * ✅ OPTIMIZADO: Toggle de tema mejorado con feedback visual premium
 */
function SidebarControls({ isCollapsed, isDarkMode, className }) {
  const { toggleTheme } = useSidebar();

  const handleThemeToggle = () => {
    toggleTheme();
    // Opcional: Feedback háptico en dispositivos móviles
    if ("vibrate" in navigator) {
      navigator.vibrate(50);
    }
  };

  return (
    <div
      className={cn(
        // Padding y espaciado mejorado
        "px-4 pb-6 pt-4",

        // ✅ BORDES MEJORADOS CON GRADIENTES SUTILES
        "border-t",
        isDarkMode
          ? "border-white/20 bg-gradient-to-b from-black/5 to-black/15"
          : "border-white/15 bg-gradient-to-b from-white/5 to-black/10",

        // Transiciones suaves
        "transition-all duration-300",

        className
      )}
    >
      {/* ================================ */}
      {/* CONTROL DE TEMA PREMIUM */}
      {/* ================================ */}
      <div
        onClick={handleThemeToggle}
        className={cn(
          // Layout mejorado
          "group flex items-center relative",
          "p-3 cursor-pointer rounded-lg",

          // ✅ EFECTOS HOVER PREMIUM
          "hover:bg-white/15 hover:backdrop-blur-sm",
          "hover:translate-x-1 hover:scale-[1.02]",
          "active:scale-[0.98]",

          // Transiciones suaves
          "transition-all duration-300 ease-out",

          // Sombras sutiles en hover
          "hover:shadow-lg hover:shadow-black/10"
        )}
        role="button"
        tabIndex={0}
        aria-label={
          isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
        }
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleThemeToggle();
          }
        }}
      >
        {/* ✅ ICONO DEL TEMA DINÁMICO */}
        <span
          className={cn(
            "w-6 h-6 flex items-center justify-center mr-3",
            "text-xl transition-all duration-500 ease-out",
            "text-white/90 group-hover:text-white",

            // Efectos de rotación y escala en hover
            "group-hover:scale-110 group-hover:rotate-12",

            // Glowing effect
            isDarkMode && "drop-shadow-[0_0_6px_rgba(255,223,0,0.3)]"
          )}
        >
          {/* Icono dinámico con animación */}
          <span className="transform transition-transform duration-500">
            {isDarkMode ? "☀️" : "🌙"}
          </span>
        </span>

        {/* ✅ TEXTO MEJORADO CON MEJOR FEEDBACK */}
        <span
          className={cn(
            "flex-1 text-sm font-medium",
            "text-white/95 group-hover:text-white",
            "transition-all duration-300 ease-out",
            "whitespace-nowrap select-none",

            // Estados según collapse con animaciones mejoradas
            isCollapsed
              ? ["opacity-0 invisible w-0 translate-x-4"]
              : ["opacity-100 visible w-auto translate-x-0"]
          )}
        >
          {isDarkMode ? "Modo Claro" : "Modo Oscuro"}
        </span>

        {/* ✅ TOGGLE SWITCH PREMIUM */}
        <div
          className={cn(
            "relative transition-all duration-300 ease-out",
            "group-hover:scale-105",

            // Estados según collapse
            isCollapsed
              ? ["opacity-0 invisible w-0"]
              : ["opacity-100 visible w-auto"]
          )}
        >
          {/* Switch Container Premium */}
          <div
            className={cn(
              // Dimensiones
              "w-12 h-6 relative",

              // ✅ COLORES MEJORADOS CON GRADIENTES
              "rounded-full border transition-all duration-300",
              isDarkMode
                ? [
                    "bg-gradient-to-r from-blue-500 to-blue-600",
                    "border-blue-400/50",
                    "shadow-blue-500/25 shadow-lg",
                  ]
                : [
                    "bg-gradient-to-r from-gray-300 to-gray-400",
                    "border-gray-300/50",
                    "shadow-gray-400/25 shadow-md",
                  ],

              // Efectos hover
              "group-hover:shadow-xl",
              isDarkMode
                ? "group-hover:shadow-blue-500/40"
                : "group-hover:shadow-gray-500/30"
            )}
          >
            {/* ✅ SWITCH THUMB PREMIUM */}
            <div
              className={cn(
                // Posición y dimensiones
                "absolute top-0.5 w-5 h-5 rounded-full",
                "transition-all duration-300 ease-out",

                // Colores y sombras
                "bg-white shadow-lg",
                "border border-white/20",

                // ✅ POSICIÓN DINÁMICA CON ANIMACIÓN SUAVE
                isDarkMode
                  ? "translate-x-6 shadow-blue-900/30"
                  : "translate-x-0.5 shadow-gray-600/20",

                // Efectos hover premium
                "group-hover:scale-110 group-hover:shadow-xl",

                // Glowing effect para el thumb
                isDarkMode && "ring-1 ring-blue-200/30"
              )}
            >
              {/* ✅ INDICADOR INTERNO OPCIONAL */}
              <div
                className={cn(
                  "absolute inset-0 rounded-full transition-all duration-300",
                  "flex items-center justify-center text-xs",
                  isDarkMode
                    ? "bg-gradient-to-br from-yellow-200 to-yellow-300 text-yellow-800"
                    : "bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700"
                )}
              >
                <span className="text-[8px] font-bold opacity-60">
                  {isDarkMode ? "☀" : "🌙"}
                </span>
              </div>
            </div>
          </div>

          {/* ✅ INDICADOR DE ESTADO ADICIONAL */}
          <div
            className={cn(
              "absolute -top-1 -right-1 w-2 h-2 rounded-full",
              "transition-all duration-500",
              isDarkMode
                ? "bg-yellow-400 shadow-yellow-400/50 animate-pulse"
                : "bg-blue-500 shadow-blue-500/50",
              "shadow-lg scale-75"
            )}
          />
        </div>

        {/* ✅ RIPPLE EFFECT EN CLICK */}
        <div
          className={cn(
            "absolute inset-0 rounded-lg pointer-events-none",
            "bg-white/10 opacity-0 scale-50",
            "group-active:opacity-100 group-active:scale-100",
            "transition-all duration-150"
          )}
        />
      </div>

      {/* ================================ */}
      {/* ESPACIO PARA FUTUROS CONTROLES */}
      {/* ================================ */}
      {/* 
      <div className="mt-3 pt-3 border-t border-white/10">
        <FuturoControl />
      </div>
      */}
    </div>
  );
}

export default SidebarControls;
