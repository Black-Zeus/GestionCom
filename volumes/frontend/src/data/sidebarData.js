/**
 * Datos mock para el Sidebar
 * Simulan la respuesta de la API para la navegación del sidebar
 */

export const sidebarNavData = {
    success: true,
    status: 200,
    timestamp: "2025-07-30T15:47:45.781093+00:00",
    data: {
        sections: [
            {
                id: "principal",
                title: "Principal",
                items: [
                    {
                        id: "dashboard",
                        text: "Dashboard",
                        icon: "📊",
                        path: "/",
                        badge: null,
                        hasSubmenu: false,
                        active: true
                    },
                    {
                        id: "notifications",
                        text: "Notificaciones",
                        icon: "🔔",
                        path: "/notifications",
                        badge: 5,
                        hasSubmenu: false,
                        active: false
                    },
                    {
                        id: "profile",
                        text: "Mi Perfil",
                        icon: "👤",
                        path: "/profile",
                        badge: null,
                        hasSubmenu: false,
                        active: false
                    }
                ]
            },
            {
                id: "inventario",
                title: "Inventario",
                items: [
                    {
                        id: "productos",
                        text: "Productos",
                        icon: "📦",
                        path: null,
                        badge: null,
                        hasSubmenu: true,
                        active: false,
                        submenu: [
                            {
                                id: "lista-productos",
                                text: "Lista de Productos",
                                icon: "📝",
                                path: "/products"
                            },
                            {
                                id: "categorias",
                                text: "Categorías",
                                icon: "📁",
                                path: "/categories"
                            },
                            {
                                id: "codigos-barras",
                                text: "Códigos de Barras",
                                icon: "🏷️",
                                path: "/barcodes"
                            },
                            {
                                id: "listas-precios",
                                text: "Listas de Precios",
                                icon: "💰",
                                path: "/price-lists"
                            }
                        ]
                    },
                    {
                        id: "stock",
                        text: "Gestión de Stock",
                        icon: "📋",
                        path: null,
                        badge: null,
                        hasSubmenu: true,
                        active: false,
                        submenu: [
                            {
                                id: "movimientos-stock",
                                text: "Movimientos de Stock",
                                icon: "🔄",
                                path: "/stock/movements"
                            },
                            {
                                id: "inventario-fisico",
                                text: "Inventario Físico",
                                icon: "📊",
                                path: "/stock/physical"
                            },
                            {
                                id: "ajustes-inventario",
                                text: "Ajustes de Inventario",
                                icon: "⚖️",
                                path: "/stock/adjustments"
                            },
                            {
                                id: "transferencias",
                                text: "Transferencias",
                                icon: "🚚",
                                path: "/stock/transfers"
                            }
                        ]
                    },
                    {
                        id: "proveedores",
                        text: "Proveedores",
                        icon: "🏭",
                        path: "/suppliers",
                        badge: null,
                        hasSubmenu: false,
                        active: false
                    }
                ]
            },
            {
                id: "ventas",
                title: "Ventas",
                items: [
                    {
                        id: "nueva-venta",
                        text: "Nueva Venta",
                        icon: "🛒",
                        path: "/sales/new",
                        badge: null,
                        hasSubmenu: false,
                        active: false
                    },
                    {
                        id: "historial-ventas",
                        text: "Historial de Ventas",
                        icon: "📜",
                        path: "/sales/history",
                        badge: null,
                        hasSubmenu: false,
                        active: false
                    },
                    {
                        id: "clientes",
                        text: "Clientes",
                        icon: "👥",
                        path: "/customers",
                        badge: null,
                        hasSubmenu: false,
                        active: false
                    },
                    {
                        id: "promociones",
                        text: "Promociones",
                        icon: "🎉",
                        path: "/promotions",
                        badge: 2,
                        hasSubmenu: false,
                        active: false
                    }
                ]
            },
            {
                id: "reportes",
                title: "Reportes",
                items: [
                    {
                        id: "reportes-ventas",
                        text: "Reportes de Ventas",
                        icon: "📈",
                        path: null,
                        badge: null,
                        hasSubmenu: true,
                        active: false,
                        submenu: [
                            {
                                id: "ventas-diarias",
                                text: "Ventas Diarias",
                                icon: "📅",
                                path: "/reports/daily-sales"
                            },
                            {
                                id: "productos-mas-vendidos",
                                text: "Productos Más Vendidos",
                                icon: "🏆",
                                path: "/reports/top-products"
                            },
                            {
                                id: "analisis-inventario",
                                text: "Análisis de Inventario",
                                icon: "📊",
                                path: "/reports/inventory"
                            },
                            {
                                id: "rendimiento-vendedores",
                                text: "Rendimiento Vendedores",
                                icon: "👤",
                                path: "/reports/sellers"
                            },
                            {
                                id: "reportes-financieros",
                                text: "Reportes Financieros",
                                icon: "💰",
                                path: "/reports/financial"
                            }
                        ]
                    }
                ]
            }
        ]
    }
};

// Función para simular delay de API
export const mockApiDelay = (min = 200, max = 800) =>
    new Promise(resolve =>
        setTimeout(resolve, Math.random() * (max - min) + min)
    );