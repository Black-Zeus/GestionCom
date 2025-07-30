import { useState } from 'react';
import { cn } from '@/utils/cn';

/**
 * Componente de Tooltip para Modo Colapsado
 * Muestra tooltips cuando el sidebar está colapsado
 */
function SidebarTooltip({ text, className }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      {/* Área invisible para detectar hover */}
      <div
        className="absolute inset-0 z-10"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      />

      {/* Tooltip */}
      {isVisible && (
        <>
          {/* Flecha del tooltip */}
          <div className={cn(
            "absolute left-full top-1/2 transform -translate-y-1/2",
            "ml-0.5 z-tooltip",
            "w-0 h-0",
            "border-4 border-transparent border-r-gray-800"
          )} />

          {/* Content del tooltip */}
          <div className={cn(
            "absolute left-full top-1/2 transform -translate-y-1/2",
            "ml-3 z-tooltip",
            "bg-gray-800 text-white",
            "px-3 py-2",
            "rounded-md",
            "text-sm font-medium",
            "whitespace-nowrap",
            "shadow-lg",
            
            // Animación de entrada
            "opacity-0 animate-fade-in",
            "animation-delay-200",
            
            className
          )}>
            {text}
          </div>
        </>
      )}
    </>
  );
}

export default SidebarTooltip;