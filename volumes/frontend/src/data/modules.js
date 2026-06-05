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
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
  Store,
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
      { id: 'notifications', label: 'Centro de notificaciones', path: '/notifications', icon: Bell, weight: 20 },
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
      { id: 'promotions', label: 'Promociones', path: '/sales/promotions', icon: BadgeDollarSign, weight: 40 },
    ],
  },
  {
    id: 'customers',
    label: 'Clientes',
    icon: Users,
    permissions: ['CUSTOMERS_VISIBLE'],
    items: [
      { id: 'customers', label: 'Clientes', path: '/customers', icon: Users, weight: 10 },
      { id: 'account-status', label: 'Estado de cuenta', path: '/customers/account-status', icon: FileText, weight: 20 },
      { id: 'customer-credit', label: 'Creditos y limites', path: '/customers/credit-limits', icon: CreditCard, weight: 30 },
      { id: 'authorized-persons', label: 'Personas autorizadas', path: '/customers/authorized-persons', icon: Shield, weight: 40 },
      { id: 'purchase-history', label: 'Historial de compras', path: '/customers/purchase-history', icon: Receipt, weight: 50 },
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
      { id: 'products', label: 'Productos', path: '/products', icon: Package, weight: 10 },
      { id: 'stock-movements', label: 'Movimientos de stock', path: '/stock/movements', icon: Boxes, weight: 20 },
      { id: 'physical-inventory', label: 'Inventario fisico', path: '/stock/physical', icon: ClipboardCheck, weight: 30 },
      { id: 'inventory-adjustments', label: 'Ajustes de inventario', path: '/stock/adjustments', icon: Settings, weight: 40 },
      { id: 'transfers', label: 'Transferencias de stock', path: '/stock/transfers', icon: Truck, weight: 50 },
      { id: 'price-lists', label: 'Listas de precios', path: '/price-lists', icon: BadgeDollarSign, weight: 60 },
      { id: 'categories', label: 'Categorias de productos', path: '/categories', icon: Boxes, weight: 70 },
      { id: 'barcodes', label: 'Codigos de barra', path: '/barcodes', icon: Receipt, weight: 80 },
    ],
  },
  {
    id: 'suppliers',
    label: 'Proveedores',
    icon: Truck,
    permissions: ['SUPPLIERS_VISIBLE'],
    items: [
      { id: 'suppliers', label: 'Proveedores', path: '/suppliers', icon: Truck, weight: 10 },
      { id: 'purchase-orders', label: 'Ordenes de compra', path: '/suppliers/purchase-orders', icon: ClipboardList, weight: 20 },
      { id: 'supplier-payable', label: 'Cuentas por pagar proveedor', path: '/suppliers/accounts-payable', icon: FileText, weight: 30 },
      { id: 'supplier-products', label: 'Productos por proveedor', path: '/suppliers/products', icon: Package, weight: 40 },
      { id: 'supplier-history', label: 'Historial de compras a proveedor', path: '/suppliers/purchase-history', icon: Receipt, weight: 50 },
      { id: 'supplier-contacts', label: 'Contactos de proveedores', path: '/suppliers/contacts', icon: Users, weight: 60 },
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
    ],
  },
  {
    id: 'documents',
    label: 'Documentos',
    icon: FileText,
    permissions: ['DOCUMENTS_VISIBLE'],
    items: [
      { id: 'commercial-documents', label: 'Documentos comerciales', path: '/documents/commercial', icon: FileText, weight: 10 },
      { id: 'returns', label: 'Devoluciones', path: '/returns', icon: Receipt, weight: 20 },
      { id: 'credit-notes', label: 'Notas de credito', path: '/returns/credit-notes', icon: FileText, weight: 30 },
      { id: 'document-series', label: 'Series de documentos', path: '/documents/series', icon: ClipboardList, weight: 40 },
      { id: 'document-templates', label: 'Plantillas de documentos', path: '/config/document-templates', icon: FileText, weight: 50 },
    ],
  },
  {
    id: 'metrics',
    label: 'Metricas',
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
    label: 'Reportes Gestion',
    icon: BarChart3,
    permissions: ['REPORTS_VISIBLE'],
    items: [
      { id: 'daily-sales', label: 'Ventas diarias', path: '/reports/daily-sales', icon: BarChart3, weight: 10 },
      { id: 'sales-by-seller', label: 'Ventas por vendedor', path: '/reports/sales-by-seller', icon: BarChart3, weight: 20 },
      { id: 'top-products', label: 'Productos mas vendidos', path: '/reports/top-selling-products', icon: BarChart3, weight: 30 },
      { id: 'low-stock', label: 'Inventario bajo stock', path: '/reports/low-stock', icon: Boxes, weight: 40 },
      { id: 'cash-flow', label: 'Flujo de caja', path: '/reports/financial/cash-flow', icon: CircleDollarSign, weight: 50 },
      { id: 'profitability', label: 'Analisis de rentabilidad', path: '/reports/financial/profitability-analysis', icon: BarChart3, weight: 60 },
    ],
  },
  {
    id: 'audit-reports',
    label: 'Reportes Auditoria',
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
      { id: 'company-config', label: 'Configuracion de empresa', path: '/config/company', icon: Building2, weight: 10 },
      { id: 'system-parameters', label: 'Parametros del sistema', path: '/config/system-parameters', icon: Settings, weight: 20 },
      { id: 'tax-config', label: 'Configuracion de impuestos', path: '/config/taxes', icon: Receipt, weight: 30 },
      { id: 'payment-methods', label: 'Metodos de pago', path: '/config/payment-methods', icon: CreditCard, weight: 40 },
      { id: 'backup', label: 'Backup y restauracion', path: '/config/backup', icon: Database, weight: 50 },
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
      { id: 'users', label: 'Usuarios', path: '/admin/users', icon: Users, weight: 10, permissions: ['USER_READ', 'USER_MANAGER'] },
      { id: 'roles', label: 'Roles', path: '/admin/roles', icon: Shield, weight: 20, permissions: ['USER_MANAGER'] },
      { id: 'warehouses', label: 'Bodegas', path: '/admin/warehouses', icon: Store, weight: 30 },
      { id: 'cash-pos-admin', label: 'Configuracion de caja POS', path: '/admin/cash-pos', icon: CreditCard, weight: 40 },
      { id: 'petty-cash-admin', label: 'Administracion de caja chica', path: '/admin/cash-petty', icon: WalletCards, weight: 50 },
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
    id: 'profile',
    label: 'Mi perfil',
    path: '/profile',
    group: 'Usuario',
    groupId: 'system',
    description: 'Datos del usuario conectado',
  },
];

export const navigablePages = [...flatModules, ...systemPages];
