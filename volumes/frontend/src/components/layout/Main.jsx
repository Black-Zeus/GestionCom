import { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';

function Main({ children, className }) {
  return (
    <main className={cn(
      "overflow-y-auto overflow-x-hidden",
      "bg-gray-50 dark:bg-gray-900",
      "min-h-0", // importante para grid con 1fr
      "p-6 lg:p-8 xl:p-12",
      "transition-all duration-300 ease-in-out",
      "relative",
      className
    )}>
      <div className="max-w-none w-full">
        <div className="animate-fade-in">
          {children}
        </div>
        <ScrollToTopButton />
      </div>
    </main>
  );
}

// Componente del botón scroll to top
function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const toggleVisibility = () => {
      // Para el scroll del main container, no window
      const mainElement = document.querySelector('main');
      if (mainElement && mainElement.scrollTop > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.addEventListener('scroll', toggleVisibility);
      return () => mainElement.removeEventListener('scroll', toggleVisibility);
    }
  }, []);
  
  const scrollToTop = () => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };
  
  if (!isVisible) return null;
  
  return (
    <button
      onClick={scrollToTop}
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "w-12 h-12 bg-blue-500 hover:bg-blue-600",
        "text-white rounded-full shadow-lg hover:shadow-xl",
        "flex items-center justify-center",
        "transition-all duration-300 ease-in-out",
        "hover:scale-110 active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
      )}
      aria-label="Volver arriba"
    >
      <svg 
        className="w-6 h-6" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M5 10l7-7m0 0l7 7m-7-7v18" 
        />
      </svg>
    </button>
  );
}

export default Main;