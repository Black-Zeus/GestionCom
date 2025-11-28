export const sidebarNavData = {
  success: true,
  status: 200,
  timestamp: "2025-07-30T15:47:45.781093+00:00",
  data: {
    sections: [
      // 1. DASHBOARD
      {
        id: "dashboard",
        title: "Dashboard",
        items: [
          {
            id: "dashboard",
            text: "Dashboard",
            tooltip: "Panel principal",
            icon: "📊",
            path: "/dashboard",
            badge: null,
            hasSubmenu: false,
            active: true
          }
        ]
      },

      // 2. VENTAS
      {
        id: "ventas",
        title: "Ventas",
        items: [
          {
            id: "nueva-venta",
            text: "Nueva Venta",
            tooltip: "Registrar venta",
            icon: "🛒",
            path: "/sales/new",
            badge: null,
            hasSubmenu: false,
            active: false
          },
          {
            id: "historial-ventas",
            text: "Historial de Ventas",
            tooltip: "Ventas realizadas",
            icon: "📜",
            path: "/sales/history",
            badge: null,
            hasSubmenu: false,
            active: false
          }
        ]
      },

      // 3. INVENTARIO
      {
        id: "inventario",
        title: "Inventario",
        items: [
          {
            id: "productos",
            text: "Productos",
            tooltip: "Gestión de productos",
            icon: "📦",
            path: null,
            badge: null,
            hasSubmenu: true,
            active: false,
            submenu: [
              {
                id: "lista-productos",
                text: "Lista de Productos",
                tooltip: "Listado de productos",
                icon: "📝",
                path: "/products"
              },
              {
                id: "categorias",
                text: "Categorías",
                tooltip: "Categorías de productos",
                icon: "📁",
                path: "/categories"
              },
              {
                id: "codigos-barras",
                text: "Códigos de Barras",
                tooltip: "Códigos de barra",
                icon: "🏷️",
                path: "/barcodes"
              },
              {
                id: "listas-precios",
                text: "Listas de Precios",
                tooltip: "Listas de precios",
                icon: "💰",
                path: "/price-lists"
              }
            ]
          },
          {
            id: "stock",
            text: "Gestión de Stock",
            tooltip: "Stock y movimientos",
            icon: "📋",
            path: null,
            badge: null,
            hasSubmenu: true,
            active: false,
            submenu: [
              {
                id: "movimientos-stock",
                text: "Movimientos de Stock",
                tooltip: "Movimientos de inventario",
                icon: "🔄",
                path: "/stock/movements"
              },
              {
                id: "inventario-fisico",
                text: "Inventario Físico",
                tooltip: "Toma de inventario",
                icon: "📊",
                path: "/stock/physical"
              },
              {
                id: "ajustes-inventario",
                text: "Ajustes de Inventario",
                tooltip: "Ajustes de stock",
                icon: "⚖️",
                path: "/stock/adjustments"
              },
              {
                id: "transferencias",
                text: "Transferencias",
                tooltip: "Traslados entre bodegas",
                icon: "🚚",
                path: "/stock/transfers"
              }
            ]
          }
        ]
      },

      // 4. CAJA (con POS)
      {
        id: "caja",
        title: "Caja",
        items: [
          {
            id: "caja-chica-operativa",
            text: "Caja Chica",
            tooltip: "Gastos menores",
            icon: "🪙",
            path: "/cash/petty",
            badge: null,
            hasSubmenu: false,
            active: false
          },
          {
            id: "pos",
            text: "Caja y Facturación",
            tooltip: "Cobro en caja",
            icon: "🏧",
            path: "/cash/pos",
            badge: null,
            hasSubmenu: false,
            active: false
          },
          {
            id: "apertura-caja",
            text: "Apertura de Caja",
            tooltip: "Inicio de turno",
            icon: "🔓",
            path: "/cash/opening",
            badge: null,
            hasSubmenu: false,
            active: false
          },
          {
            id: "movimientos-caja",
            text: "Movimientos de Caja",
            tooltip: "Ingresos y egresos",
            icon: "📊",
            path: "/cash/movements",
            badge: null,
            hasSubmenu: false,
            active: false
          },
          {
            id: "arqueo-caja",
            text: "Arqueo de Caja",
            tooltip: "Cuadre de caja",
            icon: "🔍",
            path: "/cash/count",
            badge: null,
            hasSubmenu: false,
            active: false
          },
          {
            id: "cierre-caja",
            text: "Cierre de Caja",
            tooltip: "Fin de turno",
            icon: "🔒",
            path: "/cash/closing",
            badge: null,
            hasSubmenu: false,
            active: false
          }
        ]
      },

      // 5. CLIENTES Y PROVEEDORES
      {
        id: "clientes-proveedores",
        title: "Clientes y Proveedores",
        items: [
          {
            id: "clientes",
            text: "Clientes",
            tooltip: "Maestro de clientes",
            icon: "👥",
            path: null,
            badge: null,
            hasSubmenu: true,
            active: false,
            submenu: [
              {
                id: "lista-clientes",
                text: "Lista de Clientes",
                tooltip: "Lista de clientes",
                icon: "📋",
                path: "/customers"
              },
              {
                id: "estado-cuenta-clientes",
                text: "Estado de Cuenta",
                tooltip: "Saldos por cliente",
                icon: "📊",
                path: "/customers/account-status"
              }
            ]
          },
          {
            id: "proveedores",
            text: "Proveedores",
            tooltip: "Maestro de proveedores",
            icon: "🏭",
            path: null,
            badge: null,
            hasSubmenu: true,
            active: false,
            submenu: [
              {
                id: "lista-proveedores",
                text: "Lista de Proveedores",
                tooltip: "Lista de proveedores",
                icon: "📋",
                path: "/suppliers"
              },
              {
                id: "contactos-proveedores",
                text: "Contactos y Representantes",
                tooltip: "Contactos de proveedor",
                icon: "👤",
                path: "/suppliers/contacts"
              },
              {
                id: "productos-proveedor",
                text: "Productos por Proveedor",
                tooltip: "Productos asignados",
                icon: "📦",
                path: "/suppliers/products"
              },
              {
                id: "evaluacion-proveedores",
                text: "Evaluación de Proveedores",
                tooltip: "Evaluación de desempeño",
                icon: "⭐",
                path: "/suppliers/evaluation"
              }
            ]
          }
        ]
      },

      // 6. COMPRAS
      {
        id: "compras",
        title: "Compras",
        items: [
          {
            id: "ordenes-compra",
            text: "Órdenes de Compra",
            tooltip: "OC a proveedores",
            icon: "📄",
            path: "/suppliers/purchase-orders",
            badge: null,
            hasSubmenu: false,
            active: false
          },
          {
            id: "historial-compras",
            text: "Historial de Compras",
            tooltip: "Compras realizadas",
            icon: "📊",
            path: "/suppliers/purchase-history",
            badge: null,
            hasSubmenu: false,
            active: false
          },
          {
            id: "cuentas-por-pagar-proveedor",
            text: "Cuentas por Pagar a Proveedores",
            tooltip: "Deudas a proveedores",
            icon: "💸",
            path: "/suppliers/accounts-payable",
            badge: null,
            hasSubmenu: false,
            active: false
          },
          {
            id: "pagos-proveedores",
            text: "Pagos a Proveedores",
            tooltip: "Pagos registrados",
            icon: "🏭",
            path: "/finance/supplier-payments",
            badge: null,
            hasSubmenu: false,
            active: false
          }
        ]
      },

      // 7. FINANZAS
      {
        id: "finanzas",
        title: "Finanzas",
        items: [
          {
            id: "ingresos-adicionales",
            text: "Ingresos Adicionales",
            tooltip: "Ingresos no venta",
            icon: "💰",
            path: "/finance/additional-income",
            badge: null,
            hasSubmenu: false,
            active: false
          },
          {
            id: "gastos-operativos",
            text: "Gastos Operativos",
            tooltip: "Gastos del negocio",
            icon: "💸",
            path: "/finance/expenses",
            badge: null,
            hasSubmenu: false,
            active: false
          },
          {
            id: "conciliacion-bancaria",
            text: "Conciliación Bancaria",
            tooltip: "Conciliar bancos",
            icon: "🏦",
            path: "/finance/bank-reconciliation",
            badge: null,
            hasSubmenu: false,
            active: false
          }
        ]
      },

      // 8. REPORTES
      {
        id: "reportes",
        title: "Reportes",
        items: [
          {
            id: "reportes-operativos",
            text: "Reportes Operativos",
            tooltip: "Reportes de gestión",
            icon: "📈",
            path: null,
            badge: null,
            hasSubmenu: true,
            active: false,
            submenu: [
              {
                id: "ventas-diarias",
                text: "Ventas Diarias",
                tooltip: "Ventas por día",
                icon: "📊",
                path: "/reports/daily-sales"
              },
              {
                id: "ventas-por-vendedor",
                text: "Ventas por Vendedor",
                tooltip: "Ventas por vendedor",
                icon: "👤",
                path: "/reports/sales-by-seller"
              },
              {
                id: "productos-mas-vendidos",
                text: "Productos Más Vendidos",
                tooltip: "Top productos",
                icon: "🏆",
                path: "/reports/top-selling-products"
              },
              {
                id: "productos-devueltos",
                text: "Productos Devueltos",
                tooltip: "Devoluciones",
                icon: "↩️",
                path: "/reports/returned-products"
              },
              {
                id: "historial-compras-clientes",
                text: "Historial de Compras por Cliente",
                tooltip: "Compras por cliente",
                icon: "🛍️",
                path: "/customers/purchase-history"
              },
              {
                id: "clientes-frecuentes",
                text: "Clientes Frecuentes",
                tooltip: "Clientes recurrentes",
                icon: "⭐",
                path: "/reports/frequent-customers"
              },
              {
                id: "inventario-bajo-stock",
                text: "Inventario Bajo Stock",
                tooltip: "Stock crítico",
                icon: "⚠️",
                path: "/reports/low-stock"
              },
              {
                id: "movimientos-inventario",
                text: "Movimientos de Inventario",
                tooltip: "Detalle de movimientos",
                icon: "🔄",
                path: "/reports/inventory-movements"
              },
              {
                id: "rotacion-inventario",
                text: "Rotación de Inventario",
                tooltip: "Rotación de stock",
                icon: "🔃",
                path: "/reports/inventory/rotation"
              },
              {
                id: "kardex-inventario",
                text: "Kardex de Inventario",
                tooltip: "Kardex por producto",
                icon: "📚",
                path: "/reports/inventory/kardex"
              },
              {
                id: "quiebre-stock-pos",
                text: "Quiebres de Stock en POS",
                tooltip: "Quiebres en venta",
                icon: "❗",
                path: "/reports/inventory/pos-stock-out"
              },
              {
                id: "tiempos-reposicion",
                text: "Tiempos de Reposición",
                tooltip: "Plazos de reposición",
                icon: "⏱️",
                path: "/reports/inventory/replenishment-time"
              },
              {
                id: "performance-sucursales",
                text: "Performance por Sucursal",
                tooltip: "Comparar sucursales",
                icon: "🏪",
                path: "/reports/branch-performance"
              },
              {
                id: "alertas-vencimiento",
                text: "Alertas de Vencimiento",
                tooltip: "Productos por vencer",
                icon: "⏰",
                path: "/reports/expiry-alerts"
              },
              {
                id: "actividad-usuarios",
                text: "Actividad de Usuarios",
                tooltip: "Acciones de usuarios",
                icon: "👥",
                path: "/reports/user-activity"
              }
            ]
          },
          {
            id: "reportes-financieros",
            text: "Reportes Financieros",
            tooltip: "Reportes contables",
            icon: "💼",
            path: null,
            badge: null,
            hasSubmenu: true,
            active: false,
            submenu: [
              {
                id: "estado-resultados",
                text: "Estado de Resultados",
                tooltip: "Resultado del período",
                icon: "📋",
                path: "/reports/financial/income-statement"
              },
              {
                id: "margen-utilidad",
                text: "Márgenes de Utilidad",
                tooltip: "Márgenes de utilidad",
                icon: "💹",
                path: "/reports/financial/profit-margins"
              },
              {
                id: "analisis-rentabilidad",
                text: "Análisis de Rentabilidad",
                tooltip: "Rentabilidad",
                icon: "📈",
                path: "/reports/financial/profitability-analysis"
              },
              {
                id: "flujo-caja",
                text: "Flujo de Caja",
                tooltip: "Flujo de efectivo",
                icon: "💰",
                path: "/reports/financial/cash-flow"
              },
              {
                id: "cuentas-por-cobrar",
                text: "Cuentas por Cobrar",
                tooltip: "Deuda de clientes",
                icon: "💳",
                path: "/reports/financial/accounts-receivable"
              },
              {
                id: "cuentas-por-pagar",
                text: "Cuentas por Pagar",
                tooltip: "Deudas a terceros",
                icon: "💸",
                path: "/reports/financial/accounts-payable"
              },
              {
                id: "costos-operacionales",
                text: "Costos Operacionales",
                tooltip: "Costos de operación",
                icon: "🏭",
                path: "/reports/financial/operational-costs"
              },
              {
                id: "presupuesto-vs-real",
                text: "Presupuesto vs Real",
                tooltip: "Desvío presupuestario",
                icon: "⚖️",
                path: "/reports/financial/budget-vs-actual"
              },
              {
                id: "impuestos-declaraciones",
                text: "Impuestos y Declaraciones",
                tooltip: "Impuestos y tributos",
                icon: "📄",
                path: "/reports/financial/taxes"
              },
              {
                id: "auditoria-financiera",
                text: "Auditoría Financiera",
                tooltip: "Soporte auditoría",
                icon: "🔍",
                path: "/reports/financial/financial-audit"
              }
            ]
          }
        ]
      },

      // 9. CONFIGURACIÓN
      {
        id: "configuracion",
        title: "Configuración",
        items: [
          {
            id: "configuracion-general",
            text: "Configuración General",
            tooltip: "Parámetros generales",
            icon: "⚙️",
            path: null,
            badge: null,
            hasSubmenu: true,
            active: false,
            submenu: [
              {
                id: "configuracion-empresa",
                text: "Configuración de Empresa",
                tooltip: "Datos de empresa",
                icon: "🏢",
                path: "/config/company"
              },
              {
                id: "configuracion-impuestos",
                text: "Configuración de Impuestos",
                tooltip: "Tasas e impuestos",
                icon: "📄",
                path: "/config/taxes"
              },
              {
                id: "metodos-pago",
                text: "Métodos de Pago",
                tooltip: "Medios de pago",
                icon: "💳",
                path: "/config/payment-methods"
              },
              {
                id: "plantillas-documentos",
                text: "Plantillas de Documentos",
                tooltip: "Formatos de documentos",
                icon: "📄",
                path: "/config/document-templates"
              },
              {
                id: "parametros-sistema",
                text: "Parámetros del Sistema",
                tooltip: "Opciones avanzadas",
                icon: "🔧",
                path: "/config/system-parameters"
              }
            ]
          },
          {
            id: "configuracion-dte",
            text: "Gestión de DTE",
            tooltip: "Config. DTE",
            icon: "🧾",
            path: null,
            badge: null,
            hasSubmenu: true,
            active: false,
            submenu: [
              {
                id: "dte-certificados",
                text: "Certificados Digitales",
                tooltip: "Certificados DTE",
                icon: "🔐",
                path: "/config/dte/certificates"
              },
              {
                id: "dte-tipos",
                text: "Tipos de DTE",
                tooltip: "Tipos de documentos",
                icon: "📄",
                path: "/config/dte/document-types"
              },
              {
                id: "dte-folios",
                text: "Folios y CAF",
                tooltip: "Folios autorizados",
                icon: "🔢",
                path: "/config/dte/folios"
              },
              {
                id: "dte-tracking",
                text: "Monitoreo de Envíos DTE",
                tooltip: "Estado de envíos",
                icon: "📡",
                path: "/config/dte/tracking"
              }
            ]
          },
          {
            id: "configuracion-caja",
            text: "Gestión de Cajas",
            tooltip: "Config. de cajas",
            icon: "💰",
            path: null,
            badge: null,
            hasSubmenu: true,
            active: false,
            submenu: [
              {
                id: "admin-caja-pos",
                text: "Gestión de Cajas POS",
                tooltip: "Config. POS",
                icon: "🧾",
                path: "/admin/cash-pos"
              },
              {
                id: "admin-caja-chica",
                text: "Gestión de Caja Chica",
                tooltip: "Config. caja chica",
                icon: "🪙",
                path: "/admin/cash-petty"
              }
            ]
          },
          {
            id: "administracion",
            text: "Administración",
            tooltip: "Usuarios y roles",
            icon: "🛡️",
            path: null,
            badge: null,
            hasSubmenu: true,
            active: false,
            submenu: [
              {
                id: "usuarios",
                text: "Usuarios",
                tooltip: "Usuarios del sistema",
                icon: "👥",
                path: "/admin/users"
              },
              {
                id: "roles",
                text: "Roles y Permisos",
                tooltip: "Roles y permisos",
                icon: "🛡️",
                path: "/admin/roles"
              },
              {
                id: "bodegas",
                text: "Bodegas",
                tooltip: "Bodegas definidas",
                icon: "🏬",
                path: "/admin/warehouses"
              }
            ]
          },
          {
            id: "mantenimiento-sistema",
            text: "Mantenimiento del Sistema",
            tooltip: "Mantenimiento técnico",
            icon: "🔧",
            path: null,
            badge: null,
            hasSubmenu: true,
            active: false,
            submenu: [
              {
                id: "backup-restauracion",
                text: "Backup y Restauración",
                tooltip: "Respaldos",
                icon: "💾",
                path: "/config/backup"
              },
              {
                id: "logs-sistema",
                text: "Logs del Sistema",
                tooltip: "Registros del sistema",
                icon: "📋",
                path: "/config/system-logs"
              },
              {
                id: "auditoria-sistema",
                text: "Auditoría del Sistema",
                tooltip: "Auditoría técnica",
                icon: "🔍",
                path: "/config/system-audit"
              },
              {
                id: "optimizacion-bd",
                text: "Optimización de Base de Datos",
                tooltip: "Optimizar BD",
                icon: "🗄️",
                path: "/config/database-optimization"
              }
            ]
          }
        ]
      },

      // 10. DEMOS
      {
        id: "demos",
        title: "Demos",
        items: [
          {
            id: "demos-export-download",
            text: "Export / Download",
            tooltip: "Demo exportación",
            icon: "📁",
            path: null,
            badge: "V2.0",
            hasSubmenu: true,
            active: false,
            submenu: [
              {
                id: "demo-exporters-main",
                text: "Vista Principal",
                tooltip: "Vista demo",
                icon: "🎯",
                path: "/demos/exporters"
              },
              {
                id: "demo-export-button",
                text: "ExportButton",
                tooltip: "Botón exportar",
                icon: "📊",
                path: "/demos/exporters/export"
              },
              {
                id: "demo-download-manager",
                text: "DownloadManager",
                tooltip: "Gestor descargas",
                icon: "⬇️",
                path: "/demos/exporters/download"
              },
              {
                id: "demo-casos-avanzados",
                text: "Configuración Avanzada",
                tooltip: "Casos avanzados",
                icon: "⚡",
                path: "/demos/exporters/advanced"
              },
              {
                id: "demo-performance",
                text: "Performance & Benchmarks",
                tooltip: "Pruebas rendimiento",
                icon: "🚀",
                path: "/demos/exporters/performance"
              }
            ]
          },
          {
            id: "demos-modal",
            text: "Modal Manager",
            tooltip: "Demo modales",
            icon: "📁",
            path: null,
            badge: "V1.0",
            hasSubmenu: true,
            active: false,
            submenu: [
              {
                id: "modal",
                text: "Vista Principal",
                tooltip: "Vista demo",
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
