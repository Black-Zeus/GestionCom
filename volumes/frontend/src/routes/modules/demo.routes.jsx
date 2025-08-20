import { lazy } from "react";

// Cambiar la importación para que coincida exactamente con el nombre del archivo
const ExporterDemosIndex = lazy(() => import("@/pages/demos/exporters/Index"));
const ExportDemo = lazy(() => import("@/pages/demos/exporters/ExportDemo"));
const DownloadDemo = lazy(() => import("@/pages/demos/exporters/DownloadDemo"));
const AdvancedDemo = lazy(() => import("@/pages/demos/exporters/AdvancedDemo"));
const PerformanceDemo = lazy(() =>
  import("@/pages/demos/exporters/PerformanceDemo")
);

export const demoRoutes = [
  {
    path: "/demos/exporters",
    component: ExporterDemosIndex,
    title: "Demos de Exportación y Descarga",
    requiresAuth: false,
    requiredRoles: [],
  },
  {
    path: "/demos/exporters/export",
    component: ExportDemo,
    title: "Demo ExportButton - Exportación Básica",
    requiresAuth: false,
    requiredRoles: [],
  },
  {
    path: "/demos/exporters/download",
    component: DownloadDemo,
    title: "Demo DownloadButton - Descarga de Archivos",
    requiresAuth: false,
    requiredRoles: [],
  },
  {
    path: "/demos/exporters/advanced",
    component: AdvancedDemo,
    title: "Demo Avanzado - Casos Complejos",
    requiresAuth: false,
    requiredRoles: [],
  },
  {
    path: "/demos/exporters/performance",
    component: PerformanceDemo,
    title: "Demo de Rendimiento - Tests y Optimización",
    requiresAuth: false,
    requiredRoles: [],
  },
];

export default demoRoutes;
