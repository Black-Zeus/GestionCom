// ====================================
// src/utils/lazyImports.js
// Utilidades para crear imports lazy optimizados
// ====================================

import { lazy } from 'react';

/**
 * Crea un import lazy con retry automático y mejor error handling
 * @param {Function} importFn - Función que retorna el import dinámico
 * @param {number} retries - Número de reintentos (default: 3)
 * @param {number} delay - Delay entre reintentos en ms (default: 1000)
 * @returns {React.LazyExoticComponent} Componente lazy
 */
export const createLazyImport = (importFn, retries = 3, delay = 1000) => {
  return lazy(() => 
    new Promise((resolve, reject) => {
      const attemptImport = (remainingRetries) => {
        importFn()
          .then(resolve)
          .catch((error) => {
            if (remainingRetries > 0) {
              console.warn(`Import failed, retrying... (${remainingRetries} attempts left)`);
              setTimeout(() => attemptImport(remainingRetries - 1), delay);
            } else {
              console.error('Import failed after all retries:', error);
              reject(error);
            }
          });
      };
      attemptImport(retries);
    })
  );
};

/**
 * Precargar componente lazy de forma condicional
 * @param {React.LazyExoticComponent} lazyComponent - Componente lazy a precargar
 * @param {boolean} condition - Condición para precargar (default: true)
 */
export const preloadLazy = (lazyComponent, condition = true) => {
  if (condition && typeof lazyComponent._payload?._result !== 'object') {
    // Solo precarga si no está ya cargado
    import(lazyComponent._payload._result);
  }
};

/**
 * Hook para precargar en hover/focus
 * @param {React.LazyExoticComponent} lazyComponent - Componente a precargar
 * @returns {Object} Props para agregar al elemento (onMouseEnter, onFocus)
 */
export const usePreloadOnHover = (lazyComponent) => {
  const preload = React.useCallback(() => {
    preloadLazy(lazyComponent);
  }, [lazyComponent]);

  return {
    onMouseEnter: preload,
    onFocus: preload
  };
};

/**
 * Wrapper simple para crear lazy imports sin configuración
 * @param {Function} importFn - Función de import
 * @returns {React.LazyExoticComponent} Componente lazy
 */
export const simpleLazy = (importFn) => lazy(importFn);

export default {
  createLazyImport,
  preloadLazy,
  usePreloadOnHover,
  simpleLazy
};