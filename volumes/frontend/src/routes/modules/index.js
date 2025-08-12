// modules/index.js - Combina todos los módulos de rutas
// Punto central para todas las rutas del sistema

import { authRoutes } from './auth.routes';
import { dashboardRoutes } from './dashboard.routes';

// Combinar todas las rutas en orden de prioridad
export const allRoutes = [
    ...authRoutes,
    ...dashboardRoutes
    // Agregar aquí nuevos módulos: ...inventoryRoutes, ...salesRoutes, etc.
];

// Export individual de módulos (para uso específico)
export { authRoutes } from './auth.routes';
export { dashboardRoutes } from './dashboard.routes';

export default allRoutes;