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
                        id: "control-stock",
                        text: "Control de Stock",
                        icon: "📊",
                        path: null,
                        badge: null,
                        hasSubmenu: true,
                        active: false,
                        submenu: [
                            {
                                id: "stock-actual",
                                text: "Stock Actual",
                                icon: "📈",
                                path: "/stock/current"
                            },
                            {
                                id: "movimientos",
                                text: "Movimientos",
                                icon: "🔄",
                                path: "/stock/movements"
                            },
                            {
                                id: "alertas-stock",
                                text: "Alertas de Stock",
                                icon: "⚠️",
                                path: "/stock/alerts"
                            },
                            {
                                id: "transferencias",
                                text: "Transferencias",
                                icon: "🚚",
                                path: "/stock/transfers"
                            },
                            {
                                id: "sugerencias-reorden",
                                text: "Sugerencias Reorden",
                                icon: "📋",
                                path: "/stock/reorder"
                            }
                        ]
                    }
                ]
            },
            {
                id: "ventas",
                title: "Ventas",
                items: [
                    {
                        id: "punto-venta",
                        text: "Punto de Venta",
                        icon: "💰",
                        path: "/pos",
                        badge: null,
                        hasSubmenu: false,
                        active: false
                    },
                    {
                        id: "documentos",
                        text: "Documentos",
                        icon: "📄",
                        path: null,
                        badge: null,
                        hasSubmenu: true,
                        active: false,
                        submenu: [
                            {
                                id: "facturas",
                                text: "Facturas",
                                icon: "🧾",
                                path: "/documents/invoices"
                            },
                            {
                                id: "boletas",
                                text: "Boletas",
                                icon: "🎫",
                                path: "/documents/receipts"
                            },
                            {
                                id: "guias-despacho",
                                text: "Guías de Despacho",
                                icon: "📦",
                                path: "/documents/delivery-guides"
                            },
                            {
                                id: "notas-credito",
                                text: "Notas de Crédito",
                                icon: "📋",
                                path: "/documents/credit-notes"
                            },
                            {
                                id: "cotizaciones",
                                text: "Cotizaciones",
                                icon: "💱",
                                path: "/documents/quotes"
                            }
                        ]
                    },
                    {
                        id: "devoluciones",
                        text: "Devoluciones",
                        icon: "🔄",
                        path: "/returns",
                        badge: null,
                        hasSubmenu: false,
                        active: false
                    }
                ]
            },
            {
                id: "clientes",
                title: "Clientes",
                items: [
                    {
                        id: "gestion-clientes",
                        text: "Gestión de Clientes",
                        icon: "👥",
                        path: "/clients",
                        badge: null,
                        hasSubmenu: false,
                        active: false
                    },
                    {
                        id: "cuentas-cobrar",
                        text: "Cuentas por Cobrar",
                        icon: "💳",
                        path: "/accounts-receivable",
                        badge: 12,
                        hasSubmenu: false,
                        active: false
                    },
                    {
                        id: "limites-credito",
                        text: "Límites de Crédito",
                        icon: "🏦",
                        path: "/credit-limits",
                        badge: null,
                        hasSubmenu: false,
                        active: false
                    }
                ]
            },
            {
                id: "financiero",
                title: "Financiero",
                items: [
                    {
                        id: "control-caja",
                        text: "Control de Caja",
                        icon: "💵",
                        path: "/cash-control",
                        badge: null,
                        hasSubmenu: false,
                        active: false
                    },
                    {
                        id: "caja-chica",
                        text: "Caja Chica",
                        icon: "💰",
                        path: "/petty-cash",
                        badge: null,
                        hasSubmenu: false,
                        active: false
                    },
                    {
                        id: "reportes",
                        text: "Reportes",
                        icon: "📈",
                        path: null,
                        badge: null,
                        hasSubmenu: true,
                        active: false,
                        submenu: [
                            {
                                id: "reportes-ventas",
                                text: "Reportes de Ventas",
                                icon: "💹",
                                path: "/reports/sales"
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

export const sidebarUserProfileData = {
    success: true,
    status: 200,
    timestamp: "2025-07-30T15:47:45.781093+00:00",
    data: {
        user: {
            id: 1,
            username: "vsoto",
            full_name: "Victor Soto",
            avatar: "VS",
            role: "Administrador"
        },
        actions: [
            {
                id: "profile",
                text: "Ver Perfil",
                icon: "👤",
                action: "profile"
            },
            {
                id: "settings",
                text: "Configuraciones",
                icon: "⚙️",
                action: "settings"
            },
            {
                id: "preferences",
                text: "Preferencias",
                icon: "🎛️",
                action: "preferences"
            },
            {
                id: "help",
                text: "Ayuda y Soporte",
                icon: "❓",
                action: "help"
            },
            {
                id: "logout",
                text: "Cerrar Sesión",
                icon: "🚪",
                action: "logout",
                danger: true
            }
        ]
    }
};

// Función para simular delay de API
export const mockApiDelay = (min = 200, max = 800) =>
    new Promise(resolve =>
        setTimeout(resolve, Math.random() * (max - min) + min)
    );