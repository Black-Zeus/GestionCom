// ====================================
// src/pages/auth/Login/components/LoginForm.jsx
// ====================================
import React, { useState } from 'react';

const LoginForm = ({ 
  credentials, 
  isLoading, 
  error, 
  onInputChange, 
  onSubmit 
}) => {
  const [showPassword, setShowPassword] = useState(false);

  // Función para detectar si el input es email o username
  const detectInputType = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? 'email' : 'username';
  };

  const inputType = detectInputType(credentials.username);

  const handleSubmit = async (e) => {
    e.preventDefault();
    onSubmit(credentials);
  };

  const handleInputFocus = (e) => {
    e.target.parentElement.style.transform = 'scale(1.02)';
  };

  const handleInputBlur = (e) => {
    e.target.parentElement.style.transform = 'scale(1)';
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="w-full max-w-md animate-slideInUp">
      {/* Glassmorphism Card */}
      <div className="relative overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-white/30 dark:border-white/20 rounded-3xl p-10 shadow-2xl hover:shadow-3xl hover:-translate-y-1 transition-all duration-300">
        
        {/* Card glow effects */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 dark:via-white/15 to-transparent" />
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-radial from-white/3 dark:from-white/5 to-transparent animate-shimmer" />
        
        {/* Header */}
        <div className="relative z-10 text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-shadow-sm">
            Acceso al Sistema
          </h2>
          <p className="text-gray-600 dark:text-gray-400 opacity-80">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="relative z-10 mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
          
          {/* Username/Email Field */}
          <div className="transition-transform duration-200">
            <label 
              htmlFor="username" 
              className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 transition-all duration-200"
            >
              Usuario o Correo Electrónico
              {credentials.username && (
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                  inputType === 'email' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                }`}>
                  {inputType === 'email' ? '📧 Email' : '👤 Usuario'}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                id="username"
                name="username"
                value={credentials.username}
                onChange={(e) => onInputChange('username', e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                className="w-full px-5 py-4 pr-12 bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 hover:-translate-y-0.5"
                placeholder="usuario@empresa.com o nombre.usuario"
                required
                autoComplete="username email"
                disabled={isLoading}
              />
              {/* Icono indicador */}
              {credentials.username && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                  {inputType === 'email' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Password Field */}
          <div className="transition-transform duration-200">
            <label 
              htmlFor="password" 
              className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 transition-all duration-200"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={credentials.password}
                onChange={(e) => onInputChange('password', e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                className="w-full px-5 py-4 pr-12 bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 hover:-translate-y-0.5"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
              {/* Password Toggle Button */}
              <button
                type="button"
                onClick={togglePasswordVisibility}
                disabled={isLoading}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 focus:outline-none focus:scale-110"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  // Icono "Eye Off" (ocultar)
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  // Icono "Eye" (mostrar)
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Checkbox and Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={credentials.remember}
                  onChange={(e) => onInputChange('remember', e.target.checked)}
                  className="sr-only"
                  disabled={isLoading}
                />
                <div className={`w-5 h-5 border-2 rounded transition-all duration-200 flex items-center justify-center ${
                  credentials.remember 
                    ? 'bg-blue-500 border-blue-500 scale-110' 
                    : 'border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-slate-700/50'
                }`}>
                  {credentials.remember && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400 select-none">
                Recordar sesión
              </span>
            </label>

            <a 
              href="#" 
              className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200 hover:underline"
              onClick={(e) => e.preventDefault()}
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="relative w-full px-4 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/30 focus:outline-none focus:ring-3 focus:ring-blue-500/30 overflow-hidden group"
          >
            
            {/* Button shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-600" />
            
            {/* Button content */}
            <span className="relative flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </span>
          </button>

        </form>
      </div>
    </div>
  );
};

export default LoginForm;