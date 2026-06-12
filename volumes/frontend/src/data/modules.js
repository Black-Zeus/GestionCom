import {
  BadgeDollarSign,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Database,
  FileSearch,
  FileText,
  Gauge,
  Home,
  LineChart,
  Package,
  Percent,
  Receipt,
  RotateCcw,
  Ruler,
  Settings,
  Shield,
  SlidersHorizontal,
  ShoppingCart,
  Store,
  Tags,
  Truck,
  UserCheck,
  Users,
  WalletCards,
  AlertTriangle,
  ArrowRightLeft,
} from 'lucide-react';

// IMPORTANTE: El menú lateral (sidebar) es dinámico y viene de la base de datos via useMenuStore → menuService.getUserHierarchy().
// Las entradas aquí definidas en moduleGroups/systemPages NO controlan qué aparece en el sidebar.
// Para agregar o habilitar ítems del menú: editar la tabla `menu_items` en la BD (is_active, is_visible, required_permission_id).
// Este archivo se usa únicamente para: historial de navegación y búsqueda global de páginas.
export const moduleGroups = [
  {
    id: 'home',
    label: 'Inicio',
    icon: Home,
    permissions: ['HOME_VISIBLE'],
    items: [
      { id: 'dashboard', label: 'Dashboard principal', path: '/dashboard', icon: Gauge, weight: 10 },
    ],
  },
  {
    id: 'sales',
    label: 'Ventas',
    icon: ShoppingCart,
    permissions: ['SALES_VISIBLE'],
    items: [
      { id: 'new-sale', label: 'Nueva venta', path: '/sales/new', icon: ShoppingCart, weight: 10 },
      { id: 'price-query', label: 'Consulta de precio', path: '/sales/price-query', icon: Tags, weight: 20, permissions: ['PRICE_LISTS_ACCESS', 'PRICE_LISTS_MANAGE'] },
      { id: 'promotions', label: 'Mantenedor de Promociones', path: '/sales/promotions', icon: BadgeDollarSign, weight: 30, permissions: ['SALES_MAINTAINERS_ACCESS', 'SALES_MAINTAINERS_MANAGE'] },
      { id: 'sales-history', label: 'Historial de ventas', path: '/sales/history', icon: ClipboardList, weight: 40 },
      { id: 'sales-returns', label: 'Cambio y devoluciones', path: '/sales/returns', icon: RotateCcw, weight: 50, permissions: ['RETURNS_ACCESS'] },
    ],
  },
  {
    id: 'customers',
    label: 'Clientes y proveedores',
    icon: Users,
    permissions: ['CUSTOMERS_VISIBLE'],
    items: [
      { id: 'customers', label: 'Listado de clientes', path: '/customers', icon: Users, weight: 10, permissions: ['FOUNDATION_MAINTAINERS_ACCESS', 'FOUNDATION_MAINTAINERS_MANAGE'] },
      { id: 'suppliers', label: 'Listado de proveedores', path: '/suppliers', icon: Truck, weight: 10, permissions: ['FOUNDATION_MAINTAINERS_ACCESS', 'FOUNDATION_MAINTAINERS_MANAGE'] },
    ],
  },
  {
    id: 'cash',
    label: 'Caja',
    icon: WalletCards,
    permissions: ['CASH_VISIBLE'],
    items: [
      { id: 'sales-points-admin', label: 'Puntos de venta', path: '/cash/sales-points', icon: Store, weight: 10, permissions: ['SALES_POINTS_ACCESS', 'SALES_POINTS_MANAGE'] },
      { id: 'operator-assignments-admin', label: 'Asignacion de operadores', path: '/cash/operator-assignments', icon: UserCheck, weight: 20, permissions: ['OPERATOR_ASSIGNMENTS_ACCESS', 'OPERATOR_ASSIGNMENTS_MANAGE'] },
      { id: 'cash-opening', label: 'Apertura / cierre de caja', path: '/cash/opening', icon: Store, weight: 30 },
      { id: 'cash-pos', label: 'Cobro en caja POS', path: '/cash/pos', icon: CreditCard, weight: 40, permissions: ['CASH_POS_ACCESS'] },
      { id: 'cash-count', label: 'Arqueo de caja', path: '/cash/count', icon: WalletCards, weight: 50 },
      { id: 'cash-movements', label: 'Movimientos de caja', path: '/cash/movements', icon: CircleDollarSign, weight: 60 },
      { id: 'petty-cash', label: 'Fondos de caja chica', path: '/cash/petty', icon: WalletCards, weight: 70, permissions: ['PETTY_CASH_FUNDS_ACCESS', 'PETTY_CASH_ACCESS', 'PETTY_CASH_FUNDS_MANAGE', 'PETTY_CASH_REPLENISH', 'PETTY_CASH_APPROVE'] },
      { id: 'petty-cash-expenses', label: 'Gastos de caja chica', path: '/cash/petty/expenses', icon: Receipt, weight: 80, permissions: ['PETTY_CASH_EXPENSES_ACCESS', 'PETTY_CASH_EXPENSES_CREATE', 'PETTY_CASH_EXPENSES_APPROVE', 'PETTY_CASH_SPEND'] },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventario',
    icon: Package,
    permissions: ['INVENTORY_VISIBLE'],
    items: [
      { id: 'products', label: 'Catalogo de productos', path: '/inventory/products', icon: Package, weight: 10, permissions: ['PRODUCTS_ACCESS', 'PRODUCTS_MANAGE'] },
      { id: 'categories', label: 'Categorias de productos', path: '/inventory/products/categories', icon: Boxes, weight: 20, permissions: ['CATEGORIES_ACCESS', 'PRODUCT_CATEGORIES_MANAGE'] },
      { id: 'product-attributes', label: 'Atributos de productos', path: '/inventory/products/attributes', icon: ClipboardList, weight: 30, permissions: ['PRODUCT_ATTRIBUTES_ACCESS', 'PRODUCT_ATTRIBUTES_MANAGE'] },
      { id: 'product-brand-models', label: 'Marcas y modelos de productos', path: '/inventory/products/brands-models', icon: Tags, weight: 40, permissions: ['PRODUCT_BRAND_MODELS_ACCESS', 'PRODUCT_BRAND_MODELS_MANAGE'] },
      { id: 'product-units', label: 'Unidades por producto', path: '/inventory/products/units', icon: Ruler, weight: 50, permissions: ['PRODUCT_UNITS_ACCESS', 'PRODUCT_UNITS_MANAGE'] },
      { id: 'barcodes', label: 'Codigos de barra de productos', path: '/inventory/products/barcodes', icon: Receipt, weight: 60, permissions: ['PRODUCT_BARCODES_ACCESS', 'PRODUCT_BARCODES_MANAGE'] },
      { id: 'warehouses', label: 'Administracion de bodegas', path: '/inventory/warehouses', icon: Store, weight: 70, permissions: ['WAREHOUSE_READ', 'WAREHOUSE_MANAGER', 'WAREHOUSE_SUPERVISOR', 'WAREHOUSE_ADMIN', 'WAREHOUSES_ACCESS'] },
      { id: 'stock-critical-config', label: 'Stock critico y reposicion', path: '/inventory/stock/critical', icon: Percent, weight: 80, permissions: ['INVENTORY_MAINTAINERS_ACCESS', 'INVENTORY_MAINTAINERS_MANAGE'] },
      { id: 'stock-movements', label: 'Movimientos de stock', path: '/inventory/stock/movements', icon: Boxes, weight: 90 },
      { id: 'stock-conversions', label: 'Conversion de stock', path: '/inventory/stock/conversions', icon: ArrowRightLeft, weight: 100, permissions: ['STOCK_CONVERSIONS_ACCESS', 'STOCK_CONVERT', 'STOCK_ADJUST'] },
      { id: 'physical-inventory', label: 'Inventario fisico', path: '/inventory/stock/physical', icon: ClipboardCheck, weight: 110 },
      { id: 'inventory-adjustments', label: 'Ajustes de inventario', path: '/inventory/stock/adjustments', icon: Settings, weight: 120 },
      { id: 'transfers', label: 'Transferencias de stock', path: '/inventory/stock/transfers', icon: Truck, weight: 130 },
      { id: 'inventory-tracking-reports', label: 'Control de tracking', path: '/inventory/stock/tracking-reports', icon: AlertTriangle, weight: 140, permissions: ['STOCK_VIEW', 'WAREHOUSE_INVENTORY_VIEW', 'INVENTORY_MAINTAINERS_ACCESS', 'INVENTORY_MAINTAINERS_MANAGE'] },
      { id: 'price-lists', label: 'Listas de precios', path: '/inventory/pricing/price-lists', icon: BadgeDollarSign, weight: 150, permissions: ['PRICE_LISTS_ACCESS', 'PRICE_LISTS_MANAGE'] },
    ],
  },
  {
    id: 'finance',
    label: 'Finanzas',
    icon: CircleDollarSign,
    permissions: ['FINANCE_VISIBLE'],
    items: [
      { id: 'finance-banking', label: 'Bancos y cuentas bancarias', path: '/finance/banking', icon: Building2, weight: 10, permissions: ['FINANCE_MAINTAINERS_ACCESS', 'FINANCE_MAINTAINERS_MANAGE'] },
      { id: 'finance-currencies', label: 'Monedas y tipos de cambio', path: '/finance/currencies', icon: CircleDollarSign, weight: 20, permissions: ['FINANCE_MAINTAINERS_ACCESS', 'FINANCE_MAINTAINERS_MANAGE'] },
      { id: 'bank-reconciliation-settings', label: 'Configuracion de conciliacion bancaria', path: '/finance/bank-reconciliation/settings', icon: Settings, weight: 30, permissions: ['FINANCE_MAINTAINERS_ACCESS', 'FINANCE_MAINTAINERS_MANAGE'] },
      { id: 'expenses', label: 'Gastos operativos', path: '/finance/expenses', icon: Receipt, weight: 40 },
      { id: 'additional-income', label: 'Ingresos adicionales', path: '/finance/additional-income', icon: BadgeDollarSign, weight: 50 },
      { id: 'supplier-payments', label: 'Pagos a proveedores', path: '/finance/supplier-payments', icon: Truck, weight: 60 },
      { id: 'bank-reconciliation', label: 'Conciliacion bancaria', path: '/finance/bank-reconciliation', icon: Building2, weight: 70 },
    ],
  },
  {
    id: 'documents',
    label: 'Documentos',
    icon: FileText,
    permissions: ['DOCUMENTS_VISIBLE'],
    items: [
      { id: 'document-series', label: 'Tipos y series de documentos', path: '/documents/series', icon: ClipboardList, weight: 10, permissions: ['DOCUMENT_SERIES_ACCESS', 'DOCUMENT_SERIES_MANAGE'] },
      { id: 'document-templates', label: 'Plantillas de documentos', path: '/documents/templates', icon: FileText, weight: 20, permissions: ['DOCUMENT_TEMPLATES_ACCESS', 'DOCUMENT_TEMPLATES_MANAGE'] },
      { id: 'commercial-documents', label: 'Documentos comerciales', path: '/documents/commercial', icon: FileText, weight: 30 },
      { id: 'return-reasons', label: 'Motivos de devolucion', path: '/documents/returns/reasons', icon: RotateCcw, weight: 40, permissions: ['SALES_MAINTAINERS_ACCESS', 'SALES_MAINTAINERS_MANAGE'] },
      { id: 'returns', label: 'Cambio y devoluciones', path: '/documents/returns', icon: Receipt, weight: 50 },
      { id: 'credit-notes', label: 'Notas de credito de ventas', path: '/documents/returns/credit-notes', icon: FileText, weight: 60 },
    ],
  },
  {
    id: 'metrics',
    label: 'Metricas e indicadores',
    icon: LineChart,
    permissions: ['METRICS_VISIBLE'],
    items: [
      { id: 'sales-metrics', label: 'Metricas de ventas', path: '/metrics/sales', icon: LineChart, weight: 10 },
      { id: 'inventory-metrics', label: 'Metricas de inventario', path: '/metrics/inventory', icon: Boxes, weight: 20 },
      { id: 'cash-metrics', label: 'Metricas de caja', path: '/metrics/cash', icon: CircleDollarSign, weight: 30 },
      { id: 'customer-metrics', label: 'Metricas de clientes', path: '/metrics/customers', icon: Users, weight: 40 },
    ],
  },
  {
    id: 'management-reports',
    label: 'Reportes de gestion',
    icon: BarChart3,
    permissions: ['REPORTS_VISIBLE'],
    items: [
      { id: 'daily-sales', label: 'Ventas diarias', path: '/reports/daily-sales', icon: BarChart3, weight: 10 },
      { id: 'sales-by-seller', label: 'Ventas por vendedor', path: '/reports/sales-by-seller', icon: BarChart3, weight: 20 },
      { id: 'top-products', label: 'Productos mas vendidos', path: '/reports/top-selling-products', icon: BarChart3, weight: 30 },
      { id: 'low-stock', label: 'Inventario bajo stock', path: '/reports/low-stock', icon: Boxes, weight: 40 },
      { id: 'cash-flow', label: 'Flujo de caja', path: '/reports/financial/cash-flow', icon: CircleDollarSign, weight: 50 },
      { id: 'profitability', label: 'Analisis de rentabilidad', path: '/reports/financial/profitability-analysis', icon: BarChart3, weight: 60 },
      { id: 'account-status', label: 'Estado de cuenta de clientes', path: '/customers/account-status', icon: FileText, weight: 70 },
      { id: 'purchase-history', label: 'Historial de compras de clientes', path: '/customers/purchase-history', icon: Receipt, weight: 80 },
    ],
  },
  {
    id: 'audit-reports',
    label: 'Reportes de auditoria',
    icon: FileSearch,
    permissions: ['AUDIT_VISIBLE'],
    items: [
      { id: 'financial-audit', label: 'Auditoria financiera', path: '/reports/financial/financial-audit', icon: Shield, weight: 10 },
      { id: 'system-audit-report', label: 'Auditoria del sistema', path: '/reports/audit/system', icon: FileSearch, weight: 20 },
      { id: 'user-activity-report', label: 'Actividad de usuarios', path: '/reports/audit/user-activity', icon: Users, weight: 30 },
    ],
  },
  {
    id: 'settings',
    label: 'Configuracion',
    icon: Settings,
    permissions: ['SETTINGS_VISIBLE'],
    items: [
      { id: 'company-config', label: 'Configuracion de empresa', path: '/config/company', icon: Building2, weight: 10, permissions: ['COMPANY_CONFIG_ACCESS', 'COMPANY_CONFIG_MANAGE'] },
      { id: 'system-parameters', label: 'Parametros del sistema', path: '/config/system-parameters', icon: Settings, weight: 20, permissions: ['FOUNDATION_MAINTAINERS_ACCESS', 'FOUNDATION_MAINTAINERS_MANAGE'] },
      { id: 'tax-config', label: 'Configuracion de impuestos', path: '/config/taxes', icon: Receipt, weight: 30, permissions: ['TAX_CONFIG_ACCESS', 'TAX_CONFIG_MANAGE'] },
      { id: 'payment-methods', label: 'Configuracion de metodos de pago', path: '/config/payment-methods', icon: CreditCard, weight: 40 },
      { id: 'measurement-units', label: 'Configuracion de unidades de medida', path: '/config/measurement-units', icon: Ruler, weight: 50, permissions: ['MEASUREMENT_UNITS_ACCESS', 'MEASUREMENT_UNITS_MANAGE'] },
      { id: 'notification-settings', label: 'Configuracion de notificaciones', path: '/config/notifications', icon: Bell, weight: 58, permissions: ['NOTIFICATION_SETTINGS_ACCESS', 'NOTIFICATION_SETTINGS_MANAGE'] },
      { id: 'system-logs', label: 'Logs del sistema', path: '/config/system-logs', icon: ClipboardList, weight: 60 },
      { id: 'system-audit', label: 'Auditoria del sistema', path: '/config/system-audit', icon: Shield, weight: 70 },
    ],
  },
  {
    id: 'admin',
    label: 'Administracion',
    icon: Shield,
    permissions: ['ADMIN_VISIBLE'],
    items: [
      { id: 'users', label: 'Administracion de usuarios', path: '/admin/users', icon: Users, weight: 10, permissions: ['USER_READ', 'USER_MANAGER'] },
      { id: 'roles', label: 'Administracion de roles y permisos', path: '/admin/roles', icon: Shield, weight: 20, permissions: ['USER_MANAGER'] },
      { id: 'product-flag-settings', label: 'Checks de producto', path: '/admin/product-flags', icon: SlidersHorizontal, weight: 30, permissions: ['PRODUCT_FLAG_SETTINGS_ACCESS', 'PRODUCT_FLAG_SETTINGS_MANAGE', 'FOUNDATION_MAINTAINERS_MANAGE'] },
      { id: 'cash-pos-admin', label: 'Configuracion de caja POS', path: '/admin/cash/pos', icon: CreditCard, weight: 40, permissions: ['CASH_POS_ADMIN_ACCESS', 'CASH_SETTINGS_MANAGE'] },
      { id: 'petty-cash-categories', label: 'Categorias de caja chica', path: '/admin/cash/petty-cash-categories', icon: Tags, weight: 50, permissions: ['PETTY_CASH_CATEGORIES_ACCESS', 'PETTY_CASH_ADMIN_ACCESS', 'PETTY_CASH_CATEGORIES_MANAGE', 'PETTY_CASH_MANAGE'] },
      { id: 'backup', label: 'Backup y restauracion', path: '/admin/backup', icon: Database, weight: 60 },
    ],
  },
];

export const getMenuItemPermissionCode = (item) => (
  item.accessPermission
  || `${item.id.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase()}_ACCESS`
);

export const getMenuItemPermissions = (group, item) => (
  item.permissions?.length ? item.permissions : [getMenuItemPermissionCode(item)]
);

export const flatModules = moduleGroups.flatMap((group) =>
  [...group.items]
    .sort((left, right) => left.weight - right.weight)
    .map((item) => ({
      ...item,
      group: group.label,
      groupId: group.id,
      visibilityPermissions: group.permissions || [],
      permissions: getMenuItemPermissions(group, item),
    }))
);

export const systemPages = [
  {
    id: 'global-search',
    label: 'Busqueda global',
    path: '/search',
    group: 'Sistema',
    groupId: 'system',
    description: 'Resultados de busqueda global',
  },
  {
    id: 'profile',
    label: 'Mi perfil',
    path: '/profile',
    group: 'Usuario',
    groupId: 'system',
    description: 'Datos del usuario conectado',
  },
];

export const navigablePages = [...flatModules, ...systemPages];
