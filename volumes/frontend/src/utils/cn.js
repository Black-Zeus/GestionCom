// @/utils/cn.js

/**
 * Utility function para combinar classNames
 * Versión básica sin dependencias externas
 */
export function cn(...classes) {
    return classes
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Versión con clsx y tailwind-merge (descomenta si instalas las dependencias)
 */
// import { clsx } from 'clsx';
// import { twMerge } from 'tailwind-merge';
// 
// export function cn(...inputs) {
//   return twMerge(clsx(inputs));
// }

// Export por defecto también
export default cn;