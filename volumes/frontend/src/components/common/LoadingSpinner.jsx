
import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  message = 'Cargando...', 
  className = '',
  variant = 'page' // page, component, inline
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const variants = {
    page: 'min-h-screen flex items-center justify-center',
    component: 'min-h-[200px] flex items-center justify-center',
    inline: 'inline-flex items-center justify-center p-4'
  };

  return (
    <div className={`${variants[variant]} ${className}`}>
      <div className="text-center">
        <div className={`${sizes[size]} animate-spin rounded-full border-3 border-gray-200 border-t-blue-600 mx-auto mb-3`} />
        {message && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;