/**
 * Datos mock para el Sidebar
 * Estructura reorganizada según flujo de trabajo
 * El filtrado por roles se maneja en la API
 */

export const sidebarNavData = {
    success: true,
    status: 200,
    timestamp: "2025-07-30T15:47:45.781093+00:00",
    data: {
        sections: [
            // 1. PRINCIPAL - Dashboard y notificaciones
            {
                id: "principal",
                title: "Principal",
                items: [
                    {
                        id: "dashboard",
                        text: "Dashboard",
                        icon: "📊",
                        path: "/dashboard",
                        badge: null,
                        hasSubmenu: false,
                        active: true
                    }
                ]
            },

            // 2. ADMINISTRACIÓN - Solo para usuarios autorizados
            {
                id: "administracion",
                title: "Administración",
                items: [
                    {
                        id: "administracion-general",
                        text: "Administración",
                        icon: "⚙️",
                        path: null,
                        badge: null,
                        hasSubmenu: true,
                        active: false,
                        submenu: [
                            {
                                id: "usuarios",
                                text: "Usuarios",
                                icon: "👥",
                                path: "/admin/users"
                            },
                            {
                                id: "roles",
                                text: "Roles y Permisos",
                                icon: "🛡️",
                                path: "/admin/roles"
                            },
                            {
                                id: "bodegas",
                                text: "Bodegas",
                                icon: "🏬",
                                path: "/admin/warehouses"
                            },
                            {
                                id: "caja-config",
                                text: "Configuración de Caja",
                                icon: "💵",
                                path: "/admin/cash-config"
                            },
                            {
                                id: "menu",
                                text: "Configuración de Menú",
                                icon: "📋",
                                path: "/admin/menu"
                            }
                        ]
                    }
                ]
            },

            // 3. VENTAS - Operaciones de venta
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
                        path: null,
                        badge: null,
                        hasSubmenu: true,
                        active: false,
                        submenu: [
                            {
                                id: "lista-clientes",
                                text: "Lista de Clientes",
                                icon: "📋",
                                path: "/customers"
                            },
                            {
                                id: "clientes-empresariales",
                                text: "Clientes Empresariales",
                                icon: "🏢",
                                path: "/customers/corporate"
                            },
                            {
                                id: "personas-autorizadas",
                                text: "Personas Autorizadas",
                                icon: "👤",
                                path: "/customers/authorized-persons"
                            },
                            {
                                id: "creditos-clientes",
                                text: "Créditos y Límites",
                                icon: "💳",
                                path: "/customers/credit-limits"
                            },
                            {
                                id: "historial-compras",
                                text: "Historial de Compras",
                                icon: "🛍️",
                                path: "/customers/purchase-history"
                            },
                            {
                                id: "estado-cuenta-clientes",
                                text: "Estado de Cuenta",
                                icon: "📊",
                                path: "/customers/account-status"
                            }
                        ]
                    }
                ]
            },

            // 4. CAJA Y FINANZAS - Gestión de dinero y transacciones
            {
                id: "caja",
                title: "Caja y Finanzas",
                items: [
                    {
                        id: "operaciones-caja",
                        text: "Operaciones de Caja",
                        icon: "💰",
                        path: null,
                        badge: null,
                        hasSubmenu: true,
                        active: false,
                        submenu: [
                            {
                                id: "apertura-caja",
                                text: "Apertura de Caja",
                                icon: "🔓",
                                path: "/cash/opening"
                            },
                            {
                                id: "cierre-caja",
                                text: "Cierre de Caja",
                                icon: "🔒",
                                path: "/cash/closing"
                            },
                            {
                                id: "arqueo-caja",
                                text: "Arqueo de Caja",
                                icon: "🔍",
                                path: "/cash/count"
                            },
                            {
                                id: "movimientos-caja",
                                text: "Movimientos de Caja",
                                icon: "📊",
                                path: "/cash/movements"
                            }
                        ]
                    },
                    {
                        id: "transacciones-financieras",
                        text: "Transacciones Financieras",
                        icon: "💳",
                        path: null,
                        badge: null,
                        hasSubmenu: true,
                        active: false,
                        submenu: [
                            {
                                id: "gastos-operativos",
                                text: "Gastos Operativos",
                                icon: "💸",
                                path: "/finance/expenses"
                            },
                            {
                                id: "ingresos-adicionales",
                                text: "Ingresos Adicionales",
                                icon: "💰",
                                path: "/finance/additional-income"
                            },
                            {
                                id: "pagos-proveedores",
                                text: "Pagos a Proveedores",
                                icon: "🏭",
                                path: "/finance/supplier-payments"
                            },
                            {
                                id: "conciliacion-bancaria",
                                text: "Conciliación Bancaria",
                                icon: "🏦",
                                path: "/finance/bank-reconciliation"
                            }
                        ]
                    }
                ]
            },

            // 5. INVENTARIO - Gestión de productos y stock
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
                        path: null,
                        badge: null,
                        hasSubmenu: true,
                        active: false,
                        submenu: [
                            {
                                id: "lista-proveedores",
                                text: "Lista de Proveedores",
                                icon: "📋",
                                path: "/suppliers"
                            },
                            {
                                id: "contactos-proveedores",
                                text: "Contactos y Representantes",
                                icon: "👤",
                                path: "/suppliers/contacts"
                            },
                            {
                                id: "productos-proveedor",
                                text: "Productos por Proveedor",
                                icon: "📦",
                                path: "/suppliers/products"
                            },
                            {
                                id: "ordenes-compra",
                                text: "Órdenes de Compra",
                                icon: "📄",
                                path: "/suppliers/purchase-orders"
                            },
                            {
                                id: "historial-compras-proveedor",
                                text: "Historial de Compras",
                                icon: "📊",
                                path: "/suppliers/purchase-history"
                            },
                            {
                                id: "evaluacion-proveedores",
                                text: "Evaluación de Proveedores",
                                icon: "⭐",
                                path: "/suppliers/evaluation"
                            },
                            {
                                id: "cuentas-por-pagar-proveedor",
                                text: "Cuentas por Pagar",
                                icon: "💸",
                                path: "/suppliers/accounts-payable"
                            }
                        ]
                    }
                ]
            },

            // 6. REPORTES - Análisis e información
            {
                id: "reportes",
                title: "Reportes",
                items: [
                    {
                        id: "reportes-operativos",
                        text: "Reportes Operativos",
                        icon: "📈",
                        path: null,
                        badge: null,
                        hasSubmenu: true,
                        active: false,
                        submenu: [
                            {
                                id: "ventas-diarias",
                                text: "Ventas Diarias",
                                icon: "📊",
                                path: "/reports/daily-sales"
                            },
                            {
                                id: "ventas-por-vendedor",
                                text: "Ventas por Vendedor",
                                icon: "👤",
                                path: "/reports/sales-by-seller"
                            },
                            {
                                id: "productos-mas-vendidos",
                                text: "Productos Más Vendidos",
                                icon: "🏆",
                                path: "/reports/top-selling-products"
                            },
                            {
                                id: "inventario-bajo-stock",
                                text: "Inventario Bajo Stock",
                                icon: "⚠️",
                                path: "/reports/low-stock"
                            },
                            {
                                id: "movimientos-inventario",
                                text: "Movimientos de Inventario",
                                icon: "🔄",
                                path: "/reports/inventory-movements"
                            },
                            {
                                id: "clientes-frecuentes",
                                text: "Clientes Frecuentes",
                                icon: "⭐",
                                path: "/reports/frequent-customers"
                            },
                            {
                                id: "productos-devueltos",
                                text: "Productos Devueltos",
                                icon: "↩️",
                                path: "/reports/returned-products"
                            },
                            {
                                id: "performance-sucursales",
                                text: "Performance por Sucursal",
                                icon: "🏪",
                                path: "/reports/branch-performance"
                            },
                            {
                                id: "alertas-vencimiento",
                                text: "Alertas de Vencimiento",
                                icon: "⏰",
                                path: "/reports/expiry-alerts"
                            },
                            {
                                id: "actividad-usuarios",
                                text: "Actividad de Usuarios",
                                icon: "👥",
                                path: "/reports/user-activity"
                            }
                        ]
                    },
                    {
                        id: "reportes-financieros",
                        text: "Reportes Financieros",
                        icon: "💼",
                        path: null,
                        badge: null,
                        hasSubmenu: true,
                        active: false,
                        submenu: [
                            {
                                id: "estado-resultados",
                                text: "Estado de Resultados",
                                icon: "📋",
                                path: "/reports/financial/income-statement"
                            },
                            {
                                id: "flujo-caja",
                                text: "Flujo de Caja",
                                icon: "💰",
                                path: "/reports/financial/cash-flow"
                            },
                            {
                                id: "cuentas-por-cobrar",
                                text: "Cuentas por Cobrar",
                                icon: "💳",
                                path: "/reports/financial/accounts-receivable"
                            },
                            {
                                id: "cuentas-por-pagar",
                                text: "Cuentas por Pagar",
                                icon: "💸",
                                path: "/reports/financial/accounts-payable"
                            },
                            {
                                id: "analisis-rentabilidad",
                                text: "Análisis de Rentabilidad",
                                icon: "📈",
                                path: "/reports/financial/profitability-analysis"
                            },
                            {
                                id: "presupuesto-vs-real",
                                text: "Presupuesto vs Real",
                                icon: "⚖️",
                                path: "/reports/financial/budget-vs-actual"
                            },
                            {
                                id: "costos-operacionales",
                                text: "Costos Operacionales",
                                icon: "🏭",
                                path: "/reports/financial/operational-costs"
                            },
                            {
                                id: "margen-utilidad",
                                text: "Márgenes de Utilidad",
                                icon: "💹",
                                path: "/reports/financial/profit-margins"
                            },
                            {
                                id: "impuestos-declaraciones",
                                text: "Impuestos y Declaraciones",
                                icon: "📄",
                                path: "/reports/financial/taxes"
                            },
                            {
                                id: "auditoria-financiera",
                                text: "Auditoría Financiera",
                                icon: "🔍",
                                path: "/reports/financial/financial-audit"
                            }
                        ]
                    }
                ]
            },

            // 7. CONFIGURACIÓN - Ajustes del sistema
            {
                id: "configuracion",
                title: "Configuración",
                items: [
                    {
                        id: "configuracion-general",
                        text: "Configuración General",
                        icon: "⚙️",
                        path: null,
                        badge: null,
                        hasSubmenu: true,
                        active: false,
                        submenu: [
                            {
                                id: "parametros-sistema",
                                text: "Parámetros del Sistema",
                                icon: "🔧",
                                path: "/config/system-parameters"
                            },
                            {
                                id: "configuracion-empresa",
                                text: "Configuración de Empresa",
                                icon: "🏢",
                                path: "/config/company"
                            },
                            {
                                id: "configuracion-impuestos",
                                text: "Configuración de Impuestos",
                                icon: "📄",
                                path: "/config/taxes"
                            },
                            {
                                id: "metodos-pago",
                                text: "Métodos de Pago",
                                icon: "💳",
                                path: "/config/payment-methods"
                            },
                            {
                                id: "plantillas-documentos",
                                text: "Plantillas de Documentos",
                                icon: "📄",
                                path: "/config/document-templates"
                            }
                        ]
                    },
                    {
                        id: "mantenimiento-sistema",
                        text: "Mantenimiento del Sistema",
                        icon: "🔧",
                        path: null,
                        badge: null,
                        hasSubmenu: true,
                        active: false,
                        submenu: [
                            {
                                id: "backup-restauracion",
                                text: "Backup y Restauración",
                                icon: "💾",
                                path: "/config/backup"
                            },
                            {
                                id: "logs-sistema",
                                text: "Logs del Sistema",
                                icon: "📋",
                                path: "/config/system-logs"
                            },
                            {
                                id: "auditoria-sistema",
                                text: "Auditoría del Sistema",
                                icon: "🔍",
                                path: "/config/system-audit"
                            },
                            {
                                id: "optimizacion-bd",
                                text: "Optimización de Base de Datos",
                                icon: "🗄️",
                                path: "/config/database-optimization"
                            }
                        ]
                    }
                ]
            },

            // 8. DEMOS - Demostraciones y pruebas del sistema
            {
                id: "demos",
                title: "Demos",
                items: [
                    {
                        id: "demos-export-download",
                        text: "Export / Download",
                        icon: "📁",
                        path: null,
                        badge: "V2.0",
                        hasSubmenu: true,
                        active: false,
                        submenu: [
                            {
                                id: "demo-exporters-main",
                                text: "Vista Principal",
                                icon: "🎯",
                                path: "/demos/exporters"
                            },
                            {
                                id: "demo-export-button",
                                text: "ExportButton",
                                icon: "📊",
                                path: "/demos/exporters/export"
                            },
                            {
                                id: "demo-download-manager",
                                text: "DownloadManager",
                                icon: "⬇️",
                                path: "/demos/exporters/download"
                            },
                            {
                                id: "demo-casos-avanzados",
                                text: "Configuración Avanzada",
                                icon: "⚡",
                                path: "/demos/exporters/advanced"
                            },
                            {
                                id: "demo-performance",
                                text: "Performance & Benchmarks",
                                icon: "🚀",
                                path: "/demos/exporters/performance"
                            }
                        ]
                    },
                    {
                        id: "demos-modal",
                        text: "Modal Manger",
                        icon: "📁",
                        path: null,
                        badge: "V1.0",
                        hasSubmenu: true,
                        active: false,
                        submenu: [
                            {
                                id: "modal",
                                text: "Vista Principal",
                                icon: "🎯",
                                path: "/demos/modal"
                            }
                        ]
                    }
                ]
            }
        ]
    }
};

export default sidebarNavData;