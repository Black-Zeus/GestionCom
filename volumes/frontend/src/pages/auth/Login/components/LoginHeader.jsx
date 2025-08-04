
// ====================================
// src/pages/auth/Login/components/LoginHeader.jsx
// ====================================
import React from 'react';

const LoginHeader = ({ isDarkMode, onToggleTheme }) => {
  return (
    <header className="relative z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-700/80 shadow-sm">
      <div className="px-6 sm:px-8 h-16 flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-5">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-shadow-sm">
            Sistema de Inventario
          </h1>
          <div className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs font-medium border border-blue-200/50 dark:border-blue-700/50">
            v2.1.0
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Status indicator */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 px-2 py-1 rounded-md bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/30 dark:border-slate-700/30">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/30" />
            <span>Sistema Activo</span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all duration-200 hover:scale-105 backdrop-blur-sm"
            title="Cambiar tema"
            aria-label="Alternar modo oscuro"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Subtle glow effect */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent opacity-60" />
    </header>
  );
};

export default LoginHeader;