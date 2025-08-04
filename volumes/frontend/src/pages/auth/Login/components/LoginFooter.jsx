
// ====================================
// src/pages/auth/Login/components/LoginFooter.jsx
// ====================================
import React from 'react';

const LoginFooter = () => {
  return (
    <footer className="relative z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-gray-200/80 dark:border-slate-700/80 shadow-sm">
      <div className="px-6 sm:px-8 h-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-400">
        
        {/* Left column */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-500">Módulos:</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">Inventario + POS</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-gray-300 dark:bg-gray-600 opacity-60" />
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-500">Licencia:</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">Empresarial</span>
          </div>
        </div>

        {/* Center column - Hidden on mobile */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-500">Entorno:</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">Producción</span>
          </div>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 opacity-60" />
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-500">Idioma:</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">Español</span>
          </div>
        </div>

        {/* Right column */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-500">Soporte:</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">soporte@empresa.com</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-gray-300 dark:bg-gray-600 opacity-60" />
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-500">Última actualización:</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">Enero 2025</span>
          </div>
        </div>
      </div>

      {/* Subtle glow effect */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 dark:via-white/10 to-transparent opacity-60" />
    </footer>
  );
};

export default LoginFooter;