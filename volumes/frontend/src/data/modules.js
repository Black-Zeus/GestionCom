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
  Image,
  LineChart,
  MapPin,
  Package,
  Percent,
  Receipt,
  RotateCcw,
  Ruler,
  Settings,
  Shield,
  ShoppingCart,
  Store,
  Tags,
  Truck,
  Users,
  WalletCards,
} from 'lucide-react';

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
      { id: 'cash-pos', label: 'Cobro en caja POS', path: '/cash/pos', icon: CreditCard, weight: 20 },
      { id: 'sales-history', label: 'Historial de ventas', path: '/sales/history', icon: ClipboardList, weight: 30 },
      { id: 'promotions', label: 'Promociones comerciales', path: '/sales/promotions', icon: BadgeDollarSign, weight: 40, permissions: ['SALES_MAINTAINERS_ACCESS', 'SALES_MAINTAINERS_MANAGE'] },
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
      { id: 'cash-opening', label: 'Apertura / cierre de caja', path: '/cash/opening', icon: Store, weight: 10 },
      { id: 'cash-count', label: 'Arqueo de caja', path: '/cash/count', icon: WalletCards, weight: 20 },
      { id: 'cash-movements', label: 'Movimientos de caja', path: '/cash/movements', icon: CircleDollarSign, weight: 30 },
      { id: 'petty-cash', label: 'Caja chica operativa', path: '/cash/petty', icon: WalletCards, weight: 40 },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventario',
    icon: Package,
    permissions: ['INVENTORY_VISIBLE'],
    items: [
      { id: 'products', label: 'Catalogo de productos', path: '/products', icon: Package, weight: 10, permissions: ['PRODUCTS_ACCESS', 'PRODUCTS_MANAGE'] },
      { id: 'stock-movements', label: 'Movimientos de stock', path: '/stock/movements', icon: Boxes, weight: 20 },
      { id: 'physical-inventory', label: 'Inventario fisico', path: '/stock/physical', icon: ClipboardCheck, weight: 30 },
      { id: 'warehouse-zones', label: 'Zonas de bodega', path: '/inventory/warehouse-zones', icon: MapPin, weight: 35, permissions: ['INVENTORY_MAINTAINERS_ACCESS', 'INVENTORY_MAINTAINERS_MANAGE'] },
      { id: 'stock-critical-config', label: 'Stock critico y reposicion', path: '/inventory/stock-critical', icon: Percent, weight: 36, permissions: ['INVENTORY_MAINTAINERS_ACCESS', 'INVENTORY_MAINTAINERS_MANAGE'] },
      { id: 'inventory-adjustments', label: 'Ajustes de inventario', path: '/stock/adjustments', icon: Settings, weight: 40 },
      { id: 'transfers', label: 'Transferencias de stock', path: '/stock/transfers', icon: Truck, weight: 50 },
      { id: 'price-lists', label: 'Listas de precios', path: '/price-lists', icon: BadgeDollarSign, weight: 60, permissions: ['PRICE_LISTS_ACCESS', 'PRICE_LISTS_MANAGE'] },
      { id: 'categories', label: 'Categorias de productos', path: '/categories', icon: Boxes, weight: 70, permissions: ['CATEGORIES_ACCESS', 'PRODUCT_CATEGORIES_MANAGE'] },
      { id: 'product-attributes', label: 'Atributos de productos', path: '/product-attributes', icon: ClipboardList, weight: 75, permissions: ['PRODUCT_ATTRIBUTES_ACCESS', 'PRODUCT_ATTRIBUTES_MANAGE'] },
      { id: 'product-brand-models', label: 'Marcas y modelos de productos', path: '/products/brands-models', icon: Tags, weight: 78, permissions: ['PRODUCT_BRAND_MODELS_ACCESS', 'PRODUCT_BRAND_MODELS_MANAGE'] },
      { id: 'barcodes', label: 'Codigos de barra de productos', path: '/barcodes', icon: Receipt, weight: 80, permissions: ['PRODUCT_BARCODES_ACCESS', 'PRODUCT_BARCODES_MANAGE'] },
      { id: 'product-units', label: 'Unidades por producto', path: '/products/units', icon: Ruler, weight: 82, permissions: ['PRODUCT_UNITS_ACCESS', 'PRODUCT_UNITS_MANAGE'] },
      { id: 'product-media', label: 'Media de productos', path: '/products/media', icon: Image, weight: 84, permissions: ['PRODUCT_MEDIA_ACCESS', 'PRODUCT_MEDIA_MANAGE'] },
    ],
  },
  {
    id: 'finance',
    label: 'Finanzas',
    icon: CircleDollarSign,
    permissions: ['FINANCE_VISIBLE'],
    items: [
      { id: 'expenses', label: 'Gastos operativos', path: '/finance/expenses', icon: Receipt, weight: 10 },
      { id: 'additional-income', label: 'Ingresos adicionales', path: '/finance/additional-income', icon: BadgeDollarSign, weight: 20 },
      { id: 'supplier-payments', label: 'Pagos a proveedores', path: '/finance/supplier-payments', icon: Truck, weight: 30 },
      { id: 'bank-reconciliation', label: 'Conciliacion bancaria', path: '/finance/bank-reconciliation', icon: Building2, weight: 40 },
      { id: 'finance-banking', label: 'Bancos y cuentas bancarias', path: '/finance/banking', icon: Building2, weight: 42, permissions: ['FINANCE_MAINTAINERS_ACCESS', 'FINANCE_MAINTAINERS_MANAGE'] },
      { id: 'finance-currencies', label: 'Monedas y tipos de cambio', path: '/finance/currencies', icon: CircleDollarSign, weight: 44, permissions: ['FINANCE_MAINTAINERS_ACCESS', 'FINANCE_MAINTAINERS_MANAGE'] },
      { id: 'bank-reconciliation-settings', label: 'Configuracion de conciliacion bancaria', path: '/finance/bank-reconciliation/settings', icon: Settings, weight: 46, permissions: ['FINANCE_MAINTAINERS_ACCESS', 'FINANCE_MAINTAINERS_MANAGE'] },
    ],
  },
  {
    id: 'documents',
    label: 'Documentos',
    icon: FileText,
    permissions: ['DOCUMENTS_VISIBLE'],
    items: [
      { id: 'commercial-documents', label: 'Documentos comerciales', path: '/documents/commercial', icon: FileText, weight: 10 },
      { id: 'returns', label: 'Devoluciones de ventas', path: '/returns', icon: Receipt, weight: 20 },
      { id: 'return-reasons', label: 'Motivos de devolucion', path: '/returns/reasons', icon: RotateCcw, weight: 22, permissions: ['SALES_MAINTAINERS_ACCESS', 'SALES_MAINTAINERS_MANAGE'] },
      { id: 'credit-notes', label: 'Notas de credito de ventas', path: '/returns/credit-notes', icon: FileText, weight: 30 },
      { id: 'document-series', label: 'Tipos y series de documentos', path: '/documents/series', icon: ClipboardList, weight: 40, permissions: ['DOCUMENT_SERIES_ACCESS', 'DOCUMENT_SERIES_MANAGE'] },
      { id: 'document-templates', label: 'Plantillas de documentos', path: '/config/document-templates', icon: FileText, weight: 50, permissions: ['DOCUMENT_TEMPLATES_ACCESS', 'DOCUMENT_TEMPLATES_MANAGE'] },
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
      { id: 'warehouses', label: 'Administracion de bodegas', path: '/admin/warehouses', icon: Store, weight: 30, permissions: ['WAREHOUSE_READ', 'WAREHOUSE_MANAGER', 'WAREHOUSE_SUPERVISOR', 'WAREHOUSE_ADMIN', 'WAREHOUSES_ACCESS'] },
      { id: 'cash-pos-admin', label: 'Configuracion de caja POS', path: '/admin/cash-pos', icon: CreditCard, weight: 40, permissions: ['CASH_POS_ADMIN_ACCESS', 'CASH_SETTINGS_MANAGE'] },
      { id: 'petty-cash-admin', label: 'Administracion de caja chica', path: '/admin/cash-petty', icon: WalletCards, weight: 50, permissions: ['PETTY_CASH_ADMIN_ACCESS', 'PETTY_CASH_MANAGE', 'PETTY_CASH_APPROVE'] },
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
