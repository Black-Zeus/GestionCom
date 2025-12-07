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
                        active: true,
                        permissionKey: "core.dashboard.view"
                    }
                ]
            },

            // 2. VENTAS - Operaciones de venta
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
                        active: false,
                        permissionKey: "sales.pos.new"
                    },
                    {
                        id: "historial-ventas",
                        text: "Historial de Ventas",
                        icon: "📜",
                        path: "/sales/history",
                        badge: null,
                        hasSubmenu: false,
                        active: false,
                        permissionKey: "sales.pos.history"
                    },
                    {
                        id: "clientes",
                        text: "Clientes",
                        icon: "👥",
                        path: null,
                        badge: null,
                        hasSubmenu: true,
                        active: false,
                        permissionKey: "customers.main.view",
                        submenu: [
                            {
                                id: "lista-clientes",
                                text: "Lista de Clientes",
                                icon: "📋",
                                path: "/customers",
                                permissionKey: "customers.list.manager"
                            },
                            {
                                id: "personas-autorizadas",
                                text: "Personas Autorizadas",
                                icon: "👤",
                                path: "/customers/authorized-persons",
                                permissionKey: "customers.authorizedPersons.manager"
                            },
                            {
                                id: "creditos-clientes",
                                text: "Créditos y Límites",
                                icon: "💳",
                                path: "/customers/credit-limits",
                                permissionKey: "customers.creditLimits.manager"
                            },
                            {
                                id: "historial-compras",
                                text: "Historial de Compras",
                                icon: "🛍️",
                                path: "/customers/purchase-history",
                                permissionKey: "customers.purchaseHistory.view"
                            },
                            {
                                id: "estado-cuenta-clientes",
                                text: "Estado de Cuenta",
                                icon: "📊",
                                path: "/customers/account-status",
                                permissionKey: "customers.accountStatus.view"
                            }
                        ]
                    }
                ]
            },

            // 3. CAJA - Gestión de caja (ítems de nivel 1)
            {
                id: "caja",
                title: "Caja",
                items: [
                    {
                        id: "apertura-caja",
                        text: "Apertura/Cierre de Caja",
                        icon: "💰",
                        path: "/cash/opening",
                        badge: null,
                        hasSubmenu: false,
                        active: false,
                        permissionKey: "cash.operations"
                    },
                    {
                        id: "movimientos-caja",
                        text: "Movimientos de Caja",
                        icon: "📊",
                        path: "/cash/movements",
                        badge: null,
                        hasSubmenu: false,
                        active: false,
                        permissionKey: "cash.operations.movements"
                    },
                    {
                        id: "arqueo-caja",
                        text: "Arqueo de Caja",
                        icon: "🔍",
                        path: "/cash/count",
                        badge: null,
                        hasSubmenu: false,
                        active: false,
                        permissionKey: "cash.operations.cashCount"
                    }
                ]
            },

            // 4. FINANZAS - Gestión financiera (ítems de nivel 1)
            {
                id: "finanzas",
                title: "Finanzas",
                items: [
                    {
                        id: "gastos-operativos",
                        text: "Gastos Operativos",
                        icon: "💸",
                        path: "/finance/expenses",
                        badge: null,
                        hasSubmenu: false,
                        active: false,
                        permissionKey: "finance.expenses.manager"
                    },
                    {
                        id: "ingresos-adicionales",
                        text: "Ingresos Adicionales",
                        icon: "💰",
                        path: "/finance/additional-income",
                        badge: null,
                        hasSubmenu: false,
                        active: false,
                        permissionKey: "finance.additionalIncome.manager"
                    },
                    {
                        id: "pagos-proveedores",
                        text: "Pagos a Proveedores",
                        icon: "🏭",
                        path: "/finance/supplier-payments",
                        badge: null,
                        hasSubmenu: false,
                        active: false,
                        permissionKey: "finance.supplierPayments.manager"
                    },
                    {
                        id: "conciliacion-bancaria",
                        text: "Conciliación Bancaria",
                        icon: "🏦",
                        path: "/finance/bank-reconciliation",
                        badge: null,
                        hasSubmenu: false,
                        active: false,
                        permissionKey: "finance.bankReconciliation.manager"
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
                        permissionKey: "inventory.products.main",
                        submenu: [
                            {
                                id: "lista-productos",
                                text: "Lista de Productos",
                                icon: "📝",
                                path: "/products",
                                permissionKey: "inventory.products.manager"
                            },
                            {
                                id: "categorias",
                                text: "Categorías",
                                icon: "📁",
                                path: "/categories",
                                permissionKey: "inventory.categories.manager"
                            },
                            {
                                id: "codigos-barras",
                                text: "Códigos de Barras",
                                icon: "🏷️",
                                path: "/barcodes",
                                permissionKey: "inventory.barcodes.manager"
                            },
                            {
                                id: "listas-precios",
                                text: "Listas de Precios",
                                icon: "💰",
                                path: "/price-lists",
                                permissionKey: "inventory.priceLists.manager"
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
                        permissionKey: "inventory.stock.main",
                        submenu: [
                            {
                                id: "movimientos-stock",
                                text: "Movimientos de Stock",
                                icon: "🔄",
                                path: "/stock/movements",
                                permissionKey: "inventory.stock.movements"
                            },
                            {
                                id: "inventario-fisico",
                                text: "Inventario Físico",
                                icon: "📊",
                                path: "/stock/physical",
                                permissionKey: "inventory.stock.physicalCount"
                            },
                            {
                                id: "ajustes-inventario",
                                text: "Ajustes de Inventario",
                                icon: "⚖️",
                                path: "/stock/adjustments",
                                permissionKey: "inventory.stock.adjustments"
                            },
                            {
                                id: "transferencias",
                                text: "Transferencias",
                                icon: "🚚",
                                path: "/stock/transfers",
                                permissionKey: "inventory.stock.transfers"
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
                        permissionKey: "suppliers.main.view",
                        submenu: [
                            {
                                id: "lista-proveedores",
                                text: "Lista de Proveedores",
                                icon: "📋",
                                path: "/suppliers",
                                permissionKey: "suppliers.manager"
                            },
                            {
                                id: "contactos-proveedores",
                                text: "Contactos y Representantes",
                                icon: "👤",
                                path: "/suppliers/contacts",
                                permissionKey: "suppliers.contacts.manager"
                            },
                            {
                                id: "productos-proveedor",
                                text: "Productos por Proveedor",
                                icon: "📦",
                                path: "/suppliers/products",
                                permissionKey: "suppliers.products.manager"
                            },
                            {
                                id: "ordenes-compra",
                                text: "Órdenes de Compra",
                                icon: "📄",
                                path: "/suppliers/purchase-orders",
                                permissionKey: "suppliers.purchaseOrders.manager"
                            },
                            {
                                id: "historial-compras-proveedor",
                                text: "Historial de Compras",
                                icon: "📊",
                                path: "/suppliers/purchase-history",
                                permissionKey: "suppliers.purchaseHistory.view"
                            },
                            {
                                id: "evaluacion-proveedores",
                                text: "Evaluación de Proveedores",
                                icon: "⭐",
                                path: "/suppliers/evaluation",
                                permissionKey: "suppliers.evaluation.manager"
                            },
                            {
                                id: "cuentas-por-pagar-proveedor",
                                text: "Cuentas por Pagar",
                                icon: "💸",
                                path: "/suppliers/accounts-payable",
                                permissionKey: "suppliers.accountsPayable.view"
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
                        permissionKey: "reports.operational.main",
                        submenu: [
                            {
                                id: "ventas-diarias",
                                text: "Ventas Diarias",
                                icon: "📊",
                                path: "/reports/daily-sales",
                                permissionKey: "reports.operational.dailySales.view"
                            },
                            {
                                id: "ventas-por-vendedor",
                                text: "Ventas por Vendedor",
                                icon: "👤",
                                path: "/reports/sales-by-seller",
                                permissionKey: "reports.operational.salesBySeller.view"
                            },
                            {
                                id: "productos-mas-vendidos",
                                text: "Productos Más Vendidos",
                                icon: "🏆",
                                path: "/reports/top-selling-products",
                                permissionKey: "reports.operational.topSellingProducts.view"
                            },
                            {
                                id: "inventario-bajo-stock",
                                text: "Inventario Bajo Stock",
                                icon: "⚠️",
                                path: "/reports/low-stock",
                                permissionKey: "reports.operational.lowStock.view"
                            },
                            {
                                id: "movimientos-inventario",
                                text: "Movimientos de Inventario",
                                icon: "🔄",
                                path: "/reports/inventory-movements",
                                permissionKey: "reports.operational.inventoryMovements.view"
                            },
                            {
                                id: "clientes-frecuentes",
                                text: "Clientes Frecuentes",
                                icon: "⭐",
                                path: "/reports/frequent-customers",
                                permissionKey: "reports.operational.frequentCustomers.view"
                            },
                            {
                                id: "productos-devueltos",
                                text: "Productos Devueltos",
                                icon: "↩️",
                                path: "/reports/returned-products",
                                permissionKey: "reports.operational.returnedProducts.view"
                            },
                            {
                                id: "performance-sucursales",
                                text: "Performance por Sucursal",
                                icon: "🏪",
                                path: "/reports/branch-performance",
                                permissionKey: "reports.operational.branchPerformance.view"
                            },
                            {
                                id: "alertas-vencimiento",
                                text: "Alertas de Vencimiento",
                                icon: "⏰",
                                path: "/reports/expiry-alerts",
                                permissionKey: "reports.operational.expiryAlerts.view"
                            },
                            {
                                id: "actividad-usuarios",
                                text: "Actividad de Usuarios",
                                icon: "👥",
                                path: "/reports/user-activity",
                                permissionKey: "reports.operational.userActivity.view"
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
                        permissionKey: "reports.financial.main",
                        submenu: [
                            {
                                id: "estado-resultados",
                                text: "Estado de Resultados",
                                icon: "📋",
                                path: "/reports/financial/income-statement",
                                permissionKey: "reports.financial.incomeStatement.view"
                            },
                            {
                                id: "flujo-caja",
                                text: "Flujo de Caja",
                                icon: "💰",
                                path: "/reports/financial/cash-flow",
                                permissionKey: "reports.financial.cashFlow.view"
                            },
                            {
                                id: "cuentas-por-cobrar",
                                text: "Cuentas por Cobrar",
                                icon: "💳",
                                path: "/reports/financial/accounts-receivable",
                                permissionKey: "reports.financial.accountsReceivable.view"
                            },
                            {
                                id: "cuentas-por-pagar",
                                text: "Cuentas por Pagar",
                                icon: "💸",
                                path: "/reports/financial/accounts-payable",
                                permissionKey: "reports.financial.accountsPayable.view"
                            },
                            {
                                id: "analisis-rentabilidad",
                                text: "Análisis de Rentabilidad",
                                icon: "📈",
                                path: "/reports/financial/profitability-analysis",
                                permissionKey: "reports.financial.profitability.view"
                            },
                            {
                                id: "presupuesto-vs-real",
                                text: "Presupuesto vs Real",
                                icon: "⚖️",
                                path: "/reports/financial/budget-vs-actual",
                                permissionKey: "reports.financial.budgetVsActual.view"
                            },
                            {
                                id: "costos-operacionales",
                                text: "Costos Operacionales",
                                icon: "🏭",
                                path: "/reports/financial/operational-costs",
                                permissionKey: "reports.financial.operationalCosts.view"
                            },
                            {
                                id: "margen-utilidad",
                                text: "Márgenes de Utilidad",
                                icon: "💹",
                                path: "/reports/financial/profit-margins",
                                permissionKey: "reports.financial.profitMargins.view"
                            },
                            {
                                id: "impuestos-declaraciones",
                                text: "Impuestos y Declaraciones",
                                icon: "📄",
                                path: "/reports/financial/taxes",
                                permissionKey: "reports.financial.taxes.view"
                            },
                            {
                                id: "auditoria-financiera",
                                text: "Auditoría Financiera",
                                icon: "🔍",
                                path: "/reports/financial/financial-audit",
                                permissionKey: "reports.financial.audit.view"
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
                        permissionKey: "config.general.main",
                        submenu: [
                            {
                                id: "parametros-sistema",
                                text: "Parámetros del Sistema",
                                icon: "🔧",
                                path: "/config/system-parameters",
                                permissionKey: "config.general.systemParameters.manager"
                            },
                            {
                                id: "configuracion-empresa",
                                text: "Configuración de Empresa",
                                icon: "🏢",
                                path: "/config/company",
                                permissionKey: "config.general.company.manager"
                            },
                            {
                                id: "configuracion-impuestos",
                                text: "Configuración de Impuestos",
                                icon: "📄",
                                path: "/config/taxes",
                                permissionKey: "config.general.taxes.manager"
                            },
                            {
                                id: "metodos-pago",
                                text: "Métodos de Pago",
                                icon: "💳",
                                path: "/config/payment-methods",
                                permissionKey: "config.general.paymentMethods.manager"
                            },
                            {
                                id: "plantillas-documentos",
                                text: "Plantillas de Documentos",
                                icon: "📄",
                                path: "/config/document-templates",
                                permissionKey: "config.general.documentTemplates.manager"
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
                        permissionKey: "config.maintenance.main",
                        submenu: [
                            {
                                id: "backup-restauracion",
                                text: "Backup y Restauración",
                                icon: "💾",
                                path: "/config/backup",
                                permissionKey: "config.maintenance.backupRestore.manager"
                            },
                            {
                                id: "logs-sistema",
                                text: "Logs del Sistema",
                                icon: "📋",
                                path: "/config/system-logs",
                                permissionKey: "config.maintenance.systemLogs.view"
                            },
                            {
                                id: "auditoria-sistema",
                                text: "Auditoría del Sistema",
                                icon: "🔍",
                                path: "/config/system-audit",
                                permissionKey: "config.maintenance.systemAudit.view"
                            },
                            {
                                id: "optimizacion-bd",
                                text: "Optimización de Base de Datos",
                                icon: "🗄️",
                                path: "/config/database-optimization",
                                permissionKey: "config.maintenance.databaseOptimization.manager"
                            }
                        ]
                    }
                ]
            },

            // 8. ADMINISTRACIÓN - Solo para usuarios autorizados (menos uso operativo)
            {
                id: "administracion",
                title: "Administración",
                items: [
                    {
                        id: "usuarios",
                        text: "Usuarios",
                        icon: "👥",
                        path: "/admin/users",
                        badge: null,
                        hasSubmenu: false,
                        active: false,
                        permissionKey: "admin.users.manager"
                    },
                    {
                        id: "roles",
                        text: "Roles y Permisos",
                        icon: "🛡️",
                        path: "/admin/roles",
                        badge: null,
                        hasSubmenu: false,
                        active: false,
                        permissionKey: "admin.roles.manager"
                    },
                    {
                        id: "bodegas",
                        text: "Bodegas",
                        icon: "🏬",
                        path: "/admin/warehouses",
                        badge: null,
                        hasSubmenu: false,
                        active: false,
                        permissionKey: "admin.warehouses.manager"
                    },
                    {
                        id: "caja-pos",
                        text: "Caja POS",
                        icon: "🧾",
                        path: "/admin/cash-pos",
                        badge: null,
                        hasSubmenu: false,
                        active: false,
                        permissionKey: "admin.cashpos.manager"
                    },
                    {
                        id: "caja-chica",
                        text: "Caja Chica",
                        icon: "🪙",
                        path: "/admin/cash-petty",
                        badge: null,
                        hasSubmenu: false,
                        active: false,
                        permissionKey: "admin.pettycash.manager"
                    },
                    {
                        id: "menu",
                        text: "Configuración de Menú",
                        icon: "📋",
                        path: "/admin/menu",
                        badge: null,
                        hasSubmenu: false,
                        active: false,
                        permissionKey: "admin.menu.manager"
                    }
                ]
            },


            // 9. DEMOS - Demostraciones y pruebas del sistema
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
                        permissionKey: "demos.exporters.main",
                        submenu: [
                            {
                                id: "demo-exporters-main",
                                text: "Vista Principal",
                                icon: "🎯",
                                path: "/demos/exporters",
                                permissionKey: "demos.exporters.mainView"
                            },
                            {
                                id: "demo-export-button",
                                text: "ExportButton",
                                icon: "📊",
                                path: "/demos/exporters/export",
                                permissionKey: "demos.exporters.exportButton"
                            },
                            {
                                id: "demo-download-manager",
                                text: "DownloadManager",
                                icon: "⬇️",
                                path: "/demos/exporters/download",
                                permissionKey: "demos.exporters.downloadManager"
                            },
                            {
                                id: "demo-casos-avanzados",
                                text: "Configuración Avanzada",
                                icon: "⚡",
                                path: "/demos/exporters/advanced",
                                permissionKey: "demos.exporters.advancedConfig"
                            },
                            {
                                id: "demo-performance",
                                text: "Performance & Benchmarks",
                                icon: "🚀",
                                path: "/demos/exporters/performance",
                                permissionKey: "demos.exporters.performance"
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
                        permissionKey: "demos.modals.main",
                        submenu: [
                            {
                                id: "modal",
                                text: "Vista Principal",
                                icon: "🎯",
                                path: "/demos/modal",
                                permissionKey: "demos.modals.mainView"
                            }
                        ]
                    }
                ]
            }
        ]
    }
};

export default sidebarNavData;
