// ====================================
// BRANCH SELECTOR COMPONENT
// Modal/Dropdown para selección y cambio de sucursal
// ====================================

import { useEffect, useRef } from 'react';

/**
 * Componente para seleccionar y cambiar la sucursal activa
 * Puede funcionar como modal o dropdown según la prop displayMode
 * 
 * @param {boolean} isOpen - Si el selector está abierto
 * @param {Function} onClose - Handler para cerrar el selector
 * @param {Function} onBranchChange - Handler cuando se selecciona una sucursal
 * @param {string} currentBranch - Sucursal actualmente seleccionada
 * @param {string} displayMode - 'modal' o 'dropdown'
 * @param {Array} branches - Lista de sucursales disponibles
 * @param {Object} position - Posición para modo dropdown {x, y}
 * @param {string} className - Clases adicionales
 */
function BranchSelector({
  isOpen = false,
  onClose,
  onBranchChange,
  currentBranch = 'Central',
  displayMode = 'dropdown', // 'modal' | 'dropdown'
  branches = [],
  position = { x: 0, y: 0 },
  className,
  ...props
}) {

  // ====================================
  // ESTADOS Y REFS
  // ====================================
  const selectorRef = useRef(null);
  const searchInputRef = useRef(null);

  // ====================================
  // EFECTOS
  // ====================================

  // Auto-focus en el input de búsqueda al abrir
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Cerrar al hacer click fuera (solo en modo dropdown)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        displayMode === 'dropdown' &&
        isOpen &&
        selectorRef.current &&
        !selectorRef.current.contains(e.target)
      ) {
        onClose?.();
      }
    };

    if (isOpen && displayMode === 'dropdown') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, displayMode, onClose]);

  // ====================================
  // HANDLERS
  // ====================================

  const handleClose = () => {
    if (!isChanging) {
      onClose?.();
    }
  };

  // ====================================
  // RENDER CONDICIONAL
  // ====================================


  // Modo Dropdown
  return (
    <div 
      ref={selectorRef}
      className="fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, 8px)' // Centrar horizontalmente, offset vertical
      }}
      {...props}
    >
      <SelectorContent />
      
      {/* Loading Overlay para dropdown */}
      {isChanging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-gray-800 bg-opacity-90 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span>Cambiando...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default BranchSelector;