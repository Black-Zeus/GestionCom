/* eslint-disable react/prop-types */
import { AtSign, Barcode, Bell, Building2, CircleDollarSign, Contact, CreditCard, FileText, Image, Landmark, MapPin, PackageSearch, Percent, Phone, RotateCcw, Settings, Shield, ShieldCheck, Smartphone, Truck, UserRound, Users } from 'lucide-react';
import AdminGenericMaintainers from './AdminGenericMaintainers';

const customerStatusChangeOptions = [
  { value: 'ACTIVE', label: 'Activo', variant: 'active', description: 'Habilitado para operar normalmente en ventas, credito y autorizaciones segun sus permisos comerciales.' },
  { value: 'INACTIVE', label: 'Inactivo', variant: 'inactive', description: 'Deshabilitado administrativamente. Se conserva el historial, pero no deberia usarse en nuevas operaciones.' },
  { value: 'BLOCKED', label: 'Bloqueado', variant: 'danger', description: 'Detenido por una condicion operativa o administrativa que requiere revision antes de volver a operar.' },
  { value: 'DEFAULTED', label: 'Moroso', variant: 'warning', description: 'Condicion financiera vencida o riesgosa. Debe revisarse antes de autorizar nuevas ventas a credito.' },
];

const supplierStatusChangeOptions = [
  { value: 'ACTIVE', label: 'Activo', variant: 'active', description: 'Proveedor habilitado para operar normalmente en compras y abastecimiento.' },
  { value: 'INACTIVE', label: 'Inactivo', variant: 'inactive', description: 'Proveedor deshabilitado administrativamente. Se conserva su historial, pero no deberia usarse en nuevas operaciones.' },
  { value: 'BLOCKED', label: 'Bloqueado', variant: 'danger', description: 'Proveedor detenido por una condicion operativa o administrativa que requiere revision.' },
];

const customerTypeOptions = [
  { value: 'COMPANY', label: 'Empresa' },
  { value: 'INDIVIDUAL', label: 'Persona' },
];

const supplierTypeOptions = [
  { value: 'COMPANY', label: 'Empresa' },
  { value: 'INDIVIDUAL', label: 'Persona' },
  { value: 'FOREIGN', label: 'Extranjero' },
];

const currencySymbols = {
  CLP: '$',
  USD: '$',
  EUR: '€',
  GBP: '£',
  BRL: 'R$',
  ARS: '$',
  MXN: '$',
  CAD: 'C$',
  PEN: 'S/',
};

const currencyDisplay = (value) => {
  if (!value) return '-';
  return `${value} ${currencySymbols[value] || ''}`.trim();
};

const amountDisplay = (value, item = {}) => {
  if (value === null || value === undefined || value === '') return '-';
  const amount = new Intl.NumberFormat('es-CL').format(Number(value));
  return `${currencyDisplay(item.max_purchase_currency_code || item.default_currency_code || item.currency_code || 'CLP')} ${amount}`;
};

const customerPrimaryContactEmail = (item, { relatedData = {} } = {}) => {
  if (!item?.contact_person) return '';
  const contact = (relatedData['customer-authorized-users'] || []).find((row) => (
    String(row.customer_id) === String(item.id)
    && String(row.authorized_name || '') === String(item.contact_person || '')
  ));
  return contact?.email || '';
};

const supplierPrimaryContactEmail = (item, { relatedData = {} } = {}) => {
  if (!item?.contact_person) return '';
  const contact = (relatedData['supplier-contacts'] || []).find((row) => (
    String(row.supplier_id) === String(item.id)
    && String(row.contact_name || '') === String(item.contact_person || '')
  ));
  return contact?.email || '';
};

const authorizationLevelOptions = [
  { value: 'BASIC', label: 'Basico', description: 'Permite compras menores o recurrentes dentro del monto maximo definido.' },
  { value: 'ADVANCED', label: 'Avanzado', description: 'Permite compras habituales con mayor autonomia y control de monto.' },
  { value: 'FULL', label: 'Completo', description: 'Permite autorizar compras relevantes dentro del monto definido.' },
];

const authorizationLevelDescription = ({ form }) => {
  const option = authorizationLevelOptions.find((entry) => entry.value === form.authorization_level);
  return (
    <div className="min-h-11 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
      {option?.description || 'Selecciona un nivel para ver su alcance.'}
    </div>
  );
};

const customerStatusDescription = ({ form, field }) => {
  const selectedStatus = field.options.find((entry) => String(entry.value) === String(form.status_id));
  const metadata = customerStatusChangeOptions.find((entry) => entry.value === selectedStatus?.code);
  return (
    <div className="flex h-11 items-center overflow-hidden rounded-md border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs leading-4 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
      <span className="line-clamp-2">
        {metadata?.description || 'Selecciona un estado para ver su alcance comercial.'}
      </span>
    </div>
  );
};

const customerFields = [
  { id: 'identity_section', type: 'section', label: 'Datos generales', icon: UserRound, columns: 3, description: 'Datos base para identificar al cliente en documentos y busqueda.' },
  { id: 'customer_type', label: 'Tipo', type: 'select', required: true, options: customerTypeOptions },
  { id: 'tax_id', label: 'RUT', required: true, placeholder: 'Ej: 11111111-1', validation: 'rut' },
  { id: 'business_activity', label: 'Giro', placeholder: 'Actividad comercial principal' },
  { id: 'legal_name', label: 'Razon social / nombre', required: true, placeholder: 'Nombre legal del cliente' },
  { id: 'commercial_name', label: 'Nombre fantasia', placeholder: 'Nombre comercial visible' },
  { id: 'contact_person', label: 'Contacto principal', type: 'autocomplete', optionsResource: 'customer-authorized-contact-options', localOptions: true, placeholder: 'Seleccionar persona autorizada', searchPlaceholder: 'Buscar persona autorizada', clearable: true },
  { id: 'contact_section', type: 'section', label: 'Contacto', icon: Contact, columns: 3, description: 'Canales disponibles para comunicacion operativa y comercial.' },
  { id: 'email', label: 'Email', type: 'email', placeholder: 'cliente@empresa.cl', leadingIcon: AtSign },
  { id: 'phone', label: 'Telefono', placeholder: '+56 2 2222-2222', leadingIcon: Phone, validation: 'phone' },
  { id: 'mobile', label: 'Movil', placeholder: '+56 9 1234-5678', leadingIcon: Smartphone, validation: 'phone' },
  { id: 'location_section', type: 'section', label: 'Ubicacion', icon: MapPin, columns: 3, description: 'Direccion principal del cliente para gestion comercial y documental.' },
  { id: 'address', label: 'Direccion', span: 'full', placeholder: 'Calle, numero, oficina o local' },
  { id: 'city', label: 'Ciudad', placeholder: 'Santiago' },
  { id: 'region', label: 'Region', placeholder: 'Metropolitana' },
  { id: 'country', label: 'Pais', placeholder: 'Chile' },
  { id: 'commercial_section', type: 'section', label: 'Configuracion comercial', icon: CreditCard, columns: 3, description: 'Estado operativo y condiciones generales para operar con el cliente.' },
  { id: 'status_id', label: 'Estado comercial', type: 'select', optionsResource: 'customer-statuses', showOptionDescription: false },
  { id: 'status_gloss', type: 'custom', hideLabel: true, optionsResource: 'customer-statuses', render: customerStatusDescription },
  { id: 'default_currency_code', label: 'Moneda', type: 'select', optionsResource: 'currencies' },
  { id: 'is_credit_customer', label: 'Credito', type: 'checkbox', checkLabel: 'Cliente con credito habilitado', help: 'Permite ventas a credito y registra deuda.' },
  { id: 'notes', label: 'Notas', type: 'textarea', rows: 3, span: 2, placeholder: 'Observaciones visibles para gestion comercial.' },
];

const customersTabs = [
  {
    id: 'customers', resource: 'customers', label: 'Clientes', singular: 'cliente', icon: Users, formIcon: UserRound, codeField: 'customer_code', statusField: 'status_id', statusOptionsResource: 'customer-statuses', media: true, size: 'modalLarge',
    formMode: 'page', createPath: '/customers/new', editPath: (row) => `/customers/edit/${encodeURIComponent(row.customer_code)}`,
    extraResources: ['customer-authorized-users'],
    activeValue: 'ACTIVE', forceStatusToggle: true, statusChangeOptions: customerStatusChangeOptions, empty: { customer_type: 'COMPANY', tax_id: '', legal_name: '', commercial_name: '', business_activity: '', country: 'Chile', status_id: '', default_currency_code: 'CLP', is_credit_customer: false },
    fields: customerFields,
    tableFields: [{ id: 'customer_type', label: 'Tipo', options: customerTypeOptions }, { id: 'tax_id', label: 'RUT' }, { id: 'commercial_name', label: 'Cliente', primary: true, fallbackField: 'legal_name', detailField: 'business_activity' }, { id: 'contact_person', label: 'Contacto', detailResolver: customerPrimaryContactEmail }, { id: 'email', label: 'Mail' }, { id: 'city', label: 'Ciudad' }, { id: 'default_currency_code', label: 'Moneda', format: currencyDisplay }, { id: 'is_credit_customer', label: 'Credito', format: (value) => (Number(value) === 1 || value === true ? 'Si' : 'No') }],
    searchFields: ['customer_code', 'tax_id', 'legal_name', 'commercial_name', 'business_activity', 'email', 'city', 'default_currency_code'],
    rowActions: [
      { label: 'Media', icon: Image, type: 'media' },
      { label: 'Personas autorizadas', icon: Shield, path: '/customers/authorized-persons', params: (row) => ({ customer_id: row.id }) },
      { label: 'Credito', disabledLabel: 'Credito no habilitado', icon: CreditCard, path: '/customers/credit-limits', disabled: (row) => !(Number(row.is_credit_customer) === 1 || row.is_credit_customer === true), params: (row) => ({ customer_id: row.id }) },
    ],
  },
  {
    id: 'authorized', resource: 'customer-authorized-users', label: 'Personas autorizadas', singular: 'persona autorizada', icon: UserRound, activeField: 'is_active', detailDescription: 'Submodulo: Personas autorizadas', size: 'modalLarge',
    empty: { customer_id: '', authorized_name: '', authorization_level: 'BASIC', max_purchase_currency_code: 'CLP', is_primary_contact: false, is_active: true },
    routeFilters: [{ param: 'customer_id', field: 'customer_id' }],
    scope: { field: 'customer_id', optionsResource: 'customers', fallback: 'Cliente', backPath: '/customers' },
    fields: [
      { id: 'context_section', type: 'section', label: 'Cliente asociado', icon: Users, columns: 2, description: 'Relaciona esta autorizacion con el cliente seleccionado.' },
      { id: 'customer_id', label: 'Cliente', type: 'select', optionsResource: 'customers', required: true, span: 2 },
      { id: 'person_section', type: 'section', label: 'Persona autorizada', icon: UserRound, columns: 3, description: 'Datos de identificacion y contacto de la persona autorizada.' },
      { id: 'authorized_name', label: 'Nombre', required: true },
      { id: 'authorized_tax_id', label: 'RUT', validation: 'rut' },
      { id: 'position', label: 'Cargo' },
      { id: 'email', label: 'Email', type: 'email', leadingIcon: AtSign },
      { id: 'phone', label: 'Telefono', leadingIcon: Phone, validation: 'phone' },
      { id: 'mobile', label: 'Movil', leadingIcon: Smartphone, validation: 'phone' },
      { id: 'authorization_section', type: 'section', label: 'Reglas de autorizacion', icon: Shield, columns: 2, description: 'Nivel, monto maximo y estado operativo de esta autorizacion.' },
      { id: 'authorization_level', label: 'Nivel', type: 'select', options: authorizationLevelOptions, showOptionDescription: false },
      { id: 'authorization_level_gloss', label: 'Glosa', type: 'custom', render: authorizationLevelDescription },
      { id: 'max_purchase_amount', label: 'Monto maximo', type: 'amount', min: 0 },
      { id: 'max_purchase_currency_code', label: 'Moneda', type: 'select', optionsResource: 'currencies' },
      { id: 'is_primary_contact', label: 'Contacto principal', type: 'checkbox', checkLabel: 'Activo' },
      { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' },
    ],
    tableFields: [{ id: 'authorized_name', label: 'Persona autorizada', primary: true }, { id: 'customer_id', label: 'Cliente', optionsResource: 'customers' }, { id: 'authorized_tax_id', label: 'RUT' }, { id: 'authorization_level', label: 'Nivel', options: authorizationLevelOptions }, { id: 'max_purchase_amount', label: 'Monto max.', format: amountDisplay }],
  },
  {
    id: 'credit', resource: 'customer-credit-config', label: 'Credito', singular: 'configuracion de credito', icon: CreditCard, activeField: 'is_active', detailDescription: 'Submodulo: Credito', size: 'modalLarge',
    empty: { customer_id: '', credit_limit: 0, available_credit: 0, used_credit: 0, payment_terms_days: 30, grace_period_days: 5, minimum_payment_percentage: 30, penalty_rate: 2, risk_level: 'MEDIUM', allows_cash: true, allows_check: true, allows_transfer: true, allows_postdated_check: false, allows_installments: false, requires_guarantor: false, auto_block_on_overdue: true, is_active: true },
    routeFilters: [{ param: 'customer_id', field: 'customer_id' }],
    scope: { field: 'customer_id', optionsResource: 'customers', fallback: 'Cliente', backPath: '/customers' },
    fields: [
      { id: 'context_section', type: 'section', label: 'Cliente asociado', icon: Users, columns: 2, description: 'Relaciona esta configuracion de credito con el cliente seleccionado.' },
      { id: 'customer_id', label: 'Cliente', type: 'select', optionsResource: 'customers', required: true, span: 2 },
      { id: 'credit_section', type: 'section', label: 'Condiciones de credito', icon: CreditCard, columns: 3, description: 'Montos, plazos y riesgo comercial del cliente.' },
      { id: 'credit_limit', label: 'Limite credito', type: 'amount', min: 0 },
      { id: 'payment_terms_days', label: 'Dias plazo', type: 'number', min: 0 },
      { id: 'grace_period_days', label: 'Dias gracia', type: 'number', min: 0 },
      { id: 'minimum_payment_percentage', label: 'Pago minimo %', type: 'number', min: 0 },
      { id: 'penalty_rate', label: 'Mora %', type: 'number', min: 0 },
      { id: 'risk_level', label: 'Riesgo', type: 'select', options: [{ value: 'LOW', label: 'Bajo' }, { value: 'MEDIUM', label: 'Medio' }, { value: 'HIGH', label: 'Alto' }] },
      { id: 'payment_rules_section', type: 'section', label: 'Reglas de operacion', icon: CircleDollarSign, columns: 3, description: 'Medios permitidos y controles automaticos para ventas a credito.' },
      { id: 'allows_cash', label: 'Efectivo', type: 'checkbox', checkLabel: 'Permite efectivo' },
      { id: 'allows_check', label: 'Cheque', type: 'checkbox', checkLabel: 'Permite cheque' },
      { id: 'allows_transfer', label: 'Transferencia', type: 'checkbox', checkLabel: 'Permite transferencia' },
      { id: 'allows_installments', label: 'Cuotas', type: 'checkbox', checkLabel: 'Permite cuotas' },
      { id: 'auto_block_on_overdue', label: 'Bloqueo', type: 'checkbox', checkLabel: 'Bloqueo automatico' },
      { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Configuracion activa' },
    ],
    tableFields: [{ id: 'customer_id', label: 'Cliente', primary: true, optionsResource: 'customers' }, { id: 'credit_limit', label: 'Limite', format: amountDisplay }, { id: 'payment_terms_days', label: 'Plazo' }, { id: 'risk_level', label: 'Riesgo' }],
  },
];

export const customerMaintainerConfig = customersTabs[0];

const suppliersTabs = [
  {
    id: 'suppliers', resource: 'suppliers', label: 'Proveedores', singular: 'proveedor', icon: Truck, formIcon: Truck, codeField: 'supplier_code', statusField: 'status_id', statusOptionsResource: 'supplier-statuses', media: true,
    formMode: 'page', createPath: '/suppliers/new', editPath: (row) => `/suppliers/edit/${encodeURIComponent(row.supplier_code)}`,
    extraResources: ['supplier-contacts'],
    activeValue: 'ACTIVE', forceStatusToggle: true, statusChangeOptions: supplierStatusChangeOptions, empty: { supplier_type: 'COMPANY', legal_name: '', commercial_name: '', business_activity: '', default_currency_code: 'CLP', default_payment_terms_days: 30, default_tax_rate: 19, credit_limit: 0, current_balance: 0, status_id: '' },
    fields: [
      { id: 'identity_section', type: 'section', label: 'Datos generales', icon: Truck, columns: 3, description: 'Datos base para identificar al proveedor en compras y busqueda.' },
      { id: 'supplier_type', label: 'Tipo', type: 'select', options: supplierTypeOptions },
      { id: 'tax_id', label: 'RUT', placeholder: 'Ej: 44444444-4', validation: 'rut' },
      { id: 'business_activity', label: 'Giro', placeholder: 'Actividad principal' },
      { id: 'legal_name', label: 'Razon social / nombre', required: true, placeholder: 'Nombre legal del proveedor' },
      { id: 'commercial_name', label: 'Nombre fantasia', placeholder: 'Nombre comercial visible' },
      { id: 'contact_person', label: 'Contacto principal', type: 'autocomplete', optionsResource: 'supplier-contact-options', localOptions: true, placeholder: 'Seleccionar contacto', searchPlaceholder: 'Buscar contacto', clearable: true },
      { id: 'contact_section', type: 'section', label: 'Contacto', icon: Contact, columns: 3, description: 'Canales disponibles para comunicacion comercial y operativa.' },
      { id: 'email', label: 'Email', type: 'email', placeholder: 'proveedor@empresa.cl', leadingIcon: AtSign },
      { id: 'phone', label: 'Telefono', placeholder: '+56 2 2222-2222', leadingIcon: Phone, validation: 'phone' },
      { id: 'mobile', label: 'Movil', placeholder: '+56 9 1234-5678', leadingIcon: Smartphone, validation: 'phone' },
      { id: 'commercial_section', type: 'section', label: 'Condiciones comerciales', icon: CircleDollarSign, columns: 3, description: 'Moneda, plazos e informacion base para compras.' },
      { id: 'default_currency_code', label: 'Moneda', type: 'select', optionsResource: 'currencies' },
      { id: 'default_payment_terms_days', label: 'Dias pago', type: 'number', min: 0 },
      { id: 'default_tax_rate', label: 'Impuesto %', type: 'number', min: 0 },
      { id: 'credit_limit', label: 'Limite credito', type: 'amount', min: 0 },
      { id: 'status_id', label: 'Estado operativo', type: 'select', optionsResource: 'supplier-statuses', help: 'Controla si el proveedor puede operar normalmente o requiere revision.' },
      { id: 'notes', label: 'Notas', type: 'textarea', rows: 3, placeholder: 'Observaciones comerciales.' },
    ],
    tableFields: [{ id: 'supplier_type', label: 'Tipo', options: supplierTypeOptions }, { id: 'tax_id', label: 'RUT' }, { id: 'commercial_name', label: 'Proveedor', primary: true, fallbackField: 'legal_name', detailField: 'business_activity' }, { id: 'contact_person', label: 'Contacto', detailResolver: supplierPrimaryContactEmail }, { id: 'email', label: 'Mail' }, { id: 'default_currency_code', label: 'Moneda', format: currencyDisplay }],
    searchFields: ['supplier_code', 'tax_id', 'legal_name', 'commercial_name', 'business_activity', 'contact_person', 'email', 'default_currency_code'],
    rowActions: [
      { label: 'Media', icon: Image, type: 'media' },
      { label: 'Contactos', icon: Contact, path: '/suppliers/contacts', params: (row) => ({ supplier_id: row.id }) },
      { label: 'Direcciones', icon: Building2, path: '/suppliers/addresses', params: (row) => ({ supplier_id: row.id }) },
      { label: 'Productos', icon: PackageSearch, path: '/suppliers/products', params: (row) => ({ supplier_id: row.id }) },
    ],
  },
  {
    id: 'contacts', resource: 'supplier-contacts', label: 'Contactos', singular: 'contacto', icon: Contact, activeField: 'is_active', detailDescription: 'Submodulo: Contactos', size: 'modalLarge',
    empty: { supplier_id: '', contact_name: '', is_primary: false, is_purchase_contact: true, is_payment_contact: false, is_active: true },
    routeFilters: [{ param: 'supplier_id', field: 'supplier_id' }],
    scope: { field: 'supplier_id', optionsResource: 'suppliers', fallback: 'Proveedor', backPath: '/suppliers' },
    fields: [
      { id: 'context_section', type: 'section', label: 'Proveedor asociado', icon: Truck, columns: 2, description: 'Relaciona este contacto con el proveedor seleccionado.' },
      { id: 'supplier_id', label: 'Proveedor', type: 'select', optionsResource: 'suppliers', required: true, span: 2 },
      { id: 'contact_section', type: 'section', label: 'Datos de contacto', icon: Contact, columns: 3, description: 'Identificacion y canales de comunicacion del contacto.' },
      { id: 'contact_name', label: 'Nombre', required: true },
      { id: 'position', label: 'Cargo' },
      { id: 'email', label: 'Email', type: 'email', leadingIcon: AtSign },
      { id: 'phone', label: 'Telefono', leadingIcon: Phone, validation: 'phone' },
      { id: 'mobile', label: 'Movil', leadingIcon: Smartphone, validation: 'phone' },
      { id: 'flags_section', type: 'section', label: 'Uso del contacto', icon: ShieldCheck, columns: 3, description: 'Define para que procesos se considera este contacto.' },
      { id: 'is_primary', label: 'Principal', type: 'checkbox', checkLabel: 'Contacto principal' },
      { id: 'is_purchase_contact', label: 'Compras', type: 'checkbox', checkLabel: 'Contacto compras' },
      { id: 'is_payment_contact', label: 'Pagos', type: 'checkbox', checkLabel: 'Contacto pagos' },
      { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' },
    ],
    tableFields: [{ id: 'contact_name', label: 'Contacto', primary: true }, { id: 'supplier_id', label: 'Proveedor', optionsResource: 'suppliers' }, { id: 'email', label: 'Email' }, { id: 'phone', label: 'Telefono' }],
  },
  {
    id: 'addresses', resource: 'supplier-addresses', label: 'Direcciones', singular: 'direccion', icon: Building2, showStatus: false, detailDescription: 'Submodulo: Direcciones', size: 'modalLarge',
    empty: { supplier_id: '', address_type: 'BILLING', address_line: '', country: 'Chile', is_primary: false },
    routeFilters: [{ param: 'supplier_id', field: 'supplier_id' }],
    scope: { field: 'supplier_id', optionsResource: 'suppliers', fallback: 'Proveedor', backPath: '/suppliers' },
    fields: [
      { id: 'context_section', type: 'section', label: 'Proveedor asociado', icon: Truck, columns: 2, description: 'Relaciona esta direccion con el proveedor seleccionado.' },
      { id: 'supplier_id', label: 'Proveedor', type: 'select', optionsResource: 'suppliers', required: true, span: 2 },
      { id: 'address_section', type: 'section', label: 'Direccion', icon: MapPin, columns: 3, description: 'Ubicacion y uso operativo de la direccion.' },
      { id: 'address_type', label: 'Tipo', type: 'select', options: [{ value: 'BILLING', label: 'Facturacion' }, { value: 'SHIPPING', label: 'Despacho' }, { value: 'OFFICE', label: 'Oficina' }, { value: 'OTHER', label: 'Otra' }] },
      { id: 'address_line', label: 'Direccion', required: true, span: 2 },
      { id: 'city', label: 'Ciudad' },
      { id: 'region', label: 'Region' },
      { id: 'country', label: 'Pais' },
      { id: 'is_primary', label: 'Principal', type: 'checkbox', checkLabel: 'Direccion principal' },
    ],
    tableFields: [{ id: 'address_line', label: 'Direccion', primary: true }, { id: 'supplier_id', label: 'Proveedor', optionsResource: 'suppliers' }, { id: 'address_type', label: 'Tipo', options: [{ value: 'BILLING', label: 'Facturacion' }, { value: 'SHIPPING', label: 'Despacho' }, { value: 'OFFICE', label: 'Oficina' }, { value: 'OTHER', label: 'Otra' }] }, { id: 'city', label: 'Ciudad' }],
  },
  {
    id: 'products', resource: 'supplier-products', label: 'Productos', singular: 'producto proveedor', icon: PackageSearch, activeField: 'is_active', detailDescription: 'Submodulo: Productos', size: 'modalLarge',
    empty: { supplier_id: '', product_variant_id: '', minimum_order_quantity: 1, package_quantity: 1, lead_time_days: 7, is_preferred: false, is_active: true },
    routeFilters: [{ param: 'supplier_id', field: 'supplier_id' }],
    scope: { field: 'supplier_id', optionsResource: 'suppliers', fallback: 'Proveedor', backPath: '/suppliers' },
    fields: [
      { id: 'context_section', type: 'section', label: 'Proveedor asociado', icon: Truck, columns: 2, description: 'Relaciona este producto con el proveedor seleccionado.' },
      { id: 'supplier_id', label: 'Proveedor', type: 'select', optionsResource: 'suppliers', required: true, span: 2 },
      { id: 'product_section', type: 'section', label: 'Producto proveedor', icon: PackageSearch, columns: 3, description: 'Identificacion del producto y equivalencias del proveedor.' },
      { id: 'product_variant_id', label: 'SKU interno', type: 'select', optionsResource: 'product-variants-options', required: true },
      { id: 'supplier_sku', label: 'SKU proveedor' },
      { id: 'supplier_barcode', label: 'Codigo proveedor' },
      { id: 'supplier_product_name', label: 'Nombre proveedor', span: 2 },
      { id: 'measurement_unit_id', label: 'Unidad', type: 'select', optionsResource: 'measurement-units-options' },
      { id: 'purchase_section', type: 'section', label: 'Condiciones de compra', icon: CircleDollarSign, columns: 3, description: 'Parametros base para reposicion y costos.' },
      { id: 'minimum_order_quantity', label: 'Minimo compra', type: 'number', min: 0 },
      { id: 'package_quantity', label: 'Empaque', type: 'number', min: 0 },
      { id: 'last_purchase_cost', label: 'Ultimo costo', type: 'amount', min: 0 },
      { id: 'lead_time_days', label: 'Lead time', type: 'number', min: 0 },
      { id: 'is_preferred', label: 'Preferido', type: 'checkbox', checkLabel: 'Proveedor preferido' },
      { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' },
    ],
    tableFields: [{ id: 'supplier_product_name', label: 'Producto proveedor', primary: true }, { id: 'supplier_id', label: 'Proveedor', optionsResource: 'suppliers' }, { id: 'product_variant_id', label: 'SKU', optionsResource: 'product-variants-options' }, { id: 'last_purchase_cost', label: 'Costo', format: amountDisplay }],
  },
];

export const supplierMaintainerConfig = suppliersTabs[0];

const productBarcodeTabs = [
  {
    id: 'barcodes', resource: 'product-barcodes', label: 'Codigos', singular: 'codigo de barras', icon: Barcode, activeField: 'is_active',
    empty: { product_variant_id: '', barcode_type: 'EAN13', barcode_value: '', is_primary: false, is_active: true },
    fields: [{ id: 'product_variant_id', label: 'SKU', type: 'select', optionsResource: 'product-variants-options', required: true }, { id: 'barcode_type', label: 'Tipo', type: 'select', options: ['EAN13', 'EAN8', 'UPC', 'CODE128', 'QR'].map((value) => ({ value, label: value })) }, { id: 'barcode_value', label: 'Codigo', required: true }, { id: 'measurement_unit_id', label: 'Unidad', type: 'select', optionsResource: 'measurement-units-options' }, { id: 'is_primary', label: 'Principal', type: 'checkbox', checkLabel: 'Principal' }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
    tableFields: [{ id: 'barcode_value', label: 'Codigo', primary: true }, { id: 'product_variant_id', label: 'SKU', optionsResource: 'product-variants-options' }, { id: 'barcode_type', label: 'Tipo' }],
  },
];

const productUnitTabs = [
  {
    id: 'units', resource: 'product-units', label: 'Unidades', singular: 'unidad por producto', icon: PackageSearch, activeField: 'is_active',
    empty: { product_id: '', measurement_unit_id: '', conversion_factor: 1, is_purchase_unit: false, is_sale_unit: false, is_inventory_unit: false, is_active: true },
    fields: [{ id: 'product_id', label: 'Producto', type: 'select', optionsResource: 'products-options', required: true }, { id: 'measurement_unit_id', label: 'Unidad', type: 'select', optionsResource: 'measurement-units-options', required: true }, { id: 'conversion_factor', label: 'Factor', type: 'number', min: 0 }, { id: 'is_purchase_unit', label: 'Compra', type: 'checkbox', checkLabel: 'Unidad compra' }, { id: 'is_sale_unit', label: 'Venta', type: 'checkbox', checkLabel: 'Unidad venta' }, { id: 'is_inventory_unit', label: 'Inventario', type: 'checkbox', checkLabel: 'Unidad inventario' }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
    tableFields: [{ id: 'product_id', label: 'Producto', primary: true, optionsResource: 'products-options' }, { id: 'measurement_unit_id', label: 'Unidad', optionsResource: 'measurement-units-options' }, { id: 'conversion_factor', label: 'Factor' }],
  },
];

const productMediaTabs = [
  {
    id: 'media', resource: 'product-media', label: 'Media', singular: 'media de producto', icon: PackageSearch, showStatus: false,
    empty: { product_id: '', product_variant_id: '', media_type: 'IMAGE', storage_provider: 'MINIO', object_key: '', is_primary: false, sort_order: 0 },
    fields: [{ id: 'product_id', label: 'Producto', type: 'select', optionsResource: 'products-options' }, { id: 'product_variant_id', label: 'SKU', type: 'select', optionsResource: 'product-variants-options' }, { id: 'media_type', label: 'Tipo', type: 'select', options: ['IMAGE', 'DOCUMENT', 'LABEL', 'OTHER'].map((value) => ({ value, label: value })) }, { id: 'storage_provider', label: 'Proveedor', type: 'select', options: ['MINIO', 'S3', 'LOCAL', 'EXTERNAL'].map((value) => ({ value, label: value })) }, { id: 'object_key', label: 'Objeto', required: true, wide: true }, { id: 'public_url', label: 'URL publica', wide: true }, { id: 'file_name', label: 'Archivo' }, { id: 'mime_type', label: 'MIME' }, { id: 'is_primary', label: 'Principal', type: 'checkbox', checkLabel: 'Principal' }, { id: 'sort_order', label: 'Orden', type: 'number', min: 0 }],
    tableFields: [{ id: 'object_key', label: 'Objeto', primary: true }, { id: 'media_type', label: 'Tipo' }, { id: 'file_name', label: 'Archivo' }],
  },
];

const inventoryTabs = [
  {
    id: 'zones', resource: 'warehouse-zones', label: 'Zonas', singular: 'zona de bodega', icon: MapPin, activeField: 'is_active',
    empty: { warehouse_id: '', zone_code: '', zone_name: '', is_location_tracking_enabled: false, is_active: true },
    fields: [{ id: 'warehouse_id', label: 'Bodega', type: 'select', optionsResource: 'warehouses-options', required: true }, { id: 'zone_code', label: 'Codigo zona', required: true }, { id: 'zone_name', label: 'Zona', required: true }, { id: 'zone_description', label: 'Descripcion', wide: true }, { id: 'is_location_tracking_enabled', label: 'Ubicaciones', type: 'checkbox', checkLabel: 'Controla ubicaciones internas' }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
    tableFields: [{ id: 'zone_name', label: 'Zona', primary: true }, { id: 'warehouse_id', label: 'Bodega' }, { id: 'zone_code', label: 'Codigo' }, { id: 'is_location_tracking_enabled', label: 'Ubicaciones' }],
  },
  {
    id: 'stock', resource: 'stock-critical-config', label: 'Stock critico', singular: 'regla de stock', icon: Settings, activeField: 'is_active',
    empty: { product_variant_id: '', warehouse_id: '', minimum_stock: 0, safety_stock: 0, lead_time_days: 7, avg_daily_sales: 0, alert_enabled: true, alert_frequency_hours: 24, is_active: true },
    fields: [{ id: 'product_variant_id', label: 'SKU', type: 'select', optionsResource: 'product-variants-options', required: true }, { id: 'warehouse_id', label: 'Bodega', type: 'select', optionsResource: 'warehouses-options', required: true }, { id: 'minimum_stock', label: 'Stock minimo', type: 'number', min: 0 }, { id: 'maximum_stock', label: 'Stock maximo', type: 'number', min: 0 }, { id: 'safety_stock', label: 'Stock seguridad', type: 'number', min: 0 }, { id: 'reorder_quantity', label: 'Cantidad reorden', type: 'number', min: 0 }, { id: 'lead_time_days', label: 'Lead time', type: 'number', min: 0 }, { id: 'alert_enabled', label: 'Alerta', type: 'checkbox', checkLabel: 'Alerta activa' }, { id: 'alert_frequency_hours', label: 'Frecuencia horas', type: 'number', min: 1 }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
    tableFields: [{ id: 'product_variant_id', label: 'SKU', primary: true }, { id: 'warehouse_id', label: 'Bodega' }, { id: 'minimum_stock', label: 'Minimo' }, { id: 'safety_stock', label: 'Seguridad' }],
  },
];

const salesConfigTabs = [
  {
    id: 'promotions', resource: 'promotions', label: 'Promociones', singular: 'promocion', icon: Percent, codeField: 'promotion_code', activeField: 'is_active',
    empty: { promotion_name: '', promotion_type: 'PERCENTAGE_OFF', target_type: 'PRODUCT', valid_from: new Date().toISOString().slice(0, 16), valid_to: new Date().toISOString().slice(0, 16), is_combinable: false, is_active: true },
    fields: [{ id: 'promotion_name', label: 'Promocion', required: true }, { id: 'promotion_type', label: 'Tipo', type: 'select', options: ['QUANTITY_DISCOUNT', 'BUY_X_GET_Y', 'PERCENTAGE_OFF', 'FIXED_AMOUNT'].map((value) => ({ value, label: value })) }, { id: 'target_type', label: 'Objetivo', type: 'select', options: ['PRODUCT', 'CATEGORY', 'ALL'].map((value) => ({ value, label: value })) }, { id: 'min_quantity', label: 'Cantidad minima', type: 'number', min: 0 }, { id: 'discount_percentage', label: 'Descuento %', type: 'number', min: 0 }, { id: 'discount_amount', label: 'Descuento monto', type: 'number', min: 0 }, { id: 'buy_quantity', label: 'Compra cantidad', type: 'number', min: 0 }, { id: 'get_quantity', label: 'Recibe cantidad', type: 'number', min: 0 }, { id: 'valid_from', label: 'Vigente desde', type: 'datetime-local', required: true }, { id: 'valid_to', label: 'Vigente hasta', type: 'datetime-local', required: true }, { id: 'is_combinable', label: 'Combinable', type: 'checkbox', checkLabel: 'Permite combinar' }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
    tableFields: [{ id: 'promotion_name', label: 'Promocion', primary: true }, { id: 'promotion_type', label: 'Tipo' }, { id: 'target_type', label: 'Objetivo' }, { id: 'valid_to', label: 'Hasta' }],
  },
  {
    id: 'items', resource: 'promotion-items', label: 'Items', singular: 'item de promocion', icon: PackageSearch, showStatus: false,
    empty: { promotion_id: '', product_variant_id: '', category_id: '' },
    fields: [{ id: 'promotion_id', label: 'Promocion', type: 'select', optionsResource: 'promotions', required: true }, { id: 'product_variant_id', label: 'SKU', type: 'select', optionsResource: 'product-variants-options' }, { id: 'category_id', label: 'Categoria', type: 'select', optionsResource: 'categories-options' }],
    tableFields: [{ id: 'promotion_id', label: 'Promocion', primary: true }, { id: 'product_variant_id', label: 'SKU' }, { id: 'category_id', label: 'Categoria' }],
  },
  {
    id: 'returns', resource: 'return-reasons', label: 'Devoluciones', singular: 'motivo de devolucion', icon: RotateCcw, codeField: 'reason_code', activeField: 'is_active',
    empty: { reason_name: '', requires_approval: false, affects_stock: true, allows_exchange: true, allows_refund: true, is_active: true },
    fields: [{ id: 'reason_name', label: 'Motivo', required: true }, { id: 'reason_description', label: 'Descripcion', wide: true }, { id: 'max_days_after_sale', label: 'Dias maximos', type: 'number', min: 0 }, { id: 'default_account_code', label: 'Cuenta contable' }, { id: 'requires_approval', label: 'Aprobacion', type: 'checkbox', checkLabel: 'Requiere aprobacion' }, { id: 'affects_stock', label: 'Stock', type: 'checkbox', checkLabel: 'Afecta stock' }, { id: 'allows_exchange', label: 'Cambio', type: 'checkbox', checkLabel: 'Permite cambio' }, { id: 'allows_refund', label: 'Reembolso', type: 'checkbox', checkLabel: 'Permite reembolso' }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
    tableFields: [{ id: 'reason_name', label: 'Motivo', primary: true }, { id: 'max_days_after_sale', label: 'Dias max.' }, { id: 'affects_stock', label: 'Stock' }],
  },
];

const financeTabs = [
  {
    id: 'banks', resource: 'banks', label: 'Bancos', singular: 'banco', icon: Landmark, codeField: 'bank_code', activeField: 'is_active',
    empty: { bank_name: '', country: 'Chile', is_active: true },
    fields: [{ id: 'bank_name', label: 'Banco', required: true }, { id: 'country', label: 'Pais' }, { id: 'swift_code', label: 'SWIFT' }, { id: 'routing_code', label: 'Routing' }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
    tableFields: [{ id: 'bank_name', label: 'Banco', primary: true }, { id: 'country', label: 'Pais' }, { id: 'swift_code', label: 'SWIFT' }],
  },
  {
    id: 'accounts', resource: 'bank-accounts', label: 'Cuentas', singular: 'cuenta bancaria', icon: CircleDollarSign, codeField: 'account_code', activeField: 'is_active',
    empty: { bank_id: '', account_number: '', account_name: '', account_type: 'CHECKING', currency_code: 'CLP', opening_balance: 0, current_balance: 0, is_active: true },
    fields: [{ id: 'bank_id', label: 'Banco', type: 'select', optionsResource: 'banks', required: true }, { id: 'account_number', label: 'Numero', required: true }, { id: 'account_name', label: 'Nombre', required: true }, { id: 'account_type', label: 'Tipo', type: 'select', options: ['CHECKING', 'SAVINGS', 'CREDIT_LINE', 'CASH', 'OTHER'].map((value) => ({ value, label: value })) }, { id: 'currency_code', label: 'Moneda', type: 'select', optionsResource: 'currencies' }, { id: 'opening_balance', label: 'Saldo inicial', type: 'number' }, { id: 'current_balance', label: 'Saldo actual', type: 'number' }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
    tableFields: [{ id: 'account_name', label: 'Cuenta', primary: true }, { id: 'bank_id', label: 'Banco' }, { id: 'currency_code', label: 'Moneda' }, { id: 'current_balance', label: 'Saldo' }],
  },
  {
    id: 'currencies', resource: 'currencies', label: 'Monedas', singular: 'moneda', icon: CircleDollarSign, activeField: 'is_active',
    empty: { currency_code: '', currency_name: '', currency_symbol: '', decimal_places: 2, is_base_currency: false, is_active: true },
    fields: [{ id: 'currency_code', label: 'Codigo ISO', required: true }, { id: 'currency_name', label: 'Nombre', required: true }, { id: 'currency_symbol', label: 'Simbolo', required: true }, { id: 'decimal_places', label: 'Decimales', type: 'number', min: 0 }, { id: 'is_base_currency', label: 'Base', type: 'checkbox', checkLabel: 'Moneda base' }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
    tableFields: [{ id: 'currency_name', label: 'Moneda', primary: true }, { id: 'currency_code', label: 'Codigo' }, { id: 'currency_symbol', label: 'Simbolo' }, { id: 'decimal_places', label: 'Decimales' }],
  },
  {
    id: 'currency', resource: 'currency-rates', label: 'Tipos de cambio', singular: 'tipo de cambio', icon: CircleDollarSign, showStatus: false,
    empty: { currency_code: 'USD', rate_date: new Date().toISOString().slice(0, 10), rate_to_clp: 0 },
    fields: [{ id: 'currency_code', label: 'Moneda', type: 'select', optionsResource: 'currencies', required: true }, { id: 'rate_date', label: 'Fecha', type: 'date', required: true }, { id: 'rate_to_clp', label: 'Valor CLP', type: 'number', min: 0, required: true }, { id: 'source_name', label: 'Fuente' }, { id: 'source_reference', label: 'Referencia' }],
    tableFields: [{ id: 'currency_code', label: 'Moneda', primary: true }, { id: 'rate_date', label: 'Fecha' }, { id: 'rate_to_clp', label: 'Valor CLP' }],
  },
  {
    id: 'reconciliation', resource: 'bank-reconciliation-settings', label: 'Conciliacion', singular: 'configuracion de conciliacion', icon: Settings, codeField: 'setting_code', activeField: 'is_active',
    empty: { bank_account_id: '', match_reference_enabled: true, match_amount_enabled: true, match_date_tolerance_days: 3, amount_tolerance: 0, auto_match_enabled: false, is_active: true },
    fields: [{ id: 'bank_account_id', label: 'Cuenta bancaria', type: 'select', optionsResource: 'bank-accounts' }, { id: 'match_reference_enabled', label: 'Referencia', type: 'checkbox', checkLabel: 'Cruzar por referencia' }, { id: 'match_amount_enabled', label: 'Monto', type: 'checkbox', checkLabel: 'Cruzar por monto' }, { id: 'match_date_tolerance_days', label: 'Tolerancia dias', type: 'number', min: 0 }, { id: 'amount_tolerance', label: 'Tolerancia monto', type: 'number', min: 0 }, { id: 'auto_match_enabled', label: 'Automatico', type: 'checkbox', checkLabel: 'Permite conciliacion automatica' }, { id: 'require_review_over_amount', label: 'Revision sobre monto', type: 'number', min: 0 }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
    tableFields: [{ id: 'setting_code', label: 'Regla', primary: true }, { id: 'bank_account_id', label: 'Cuenta' }, { id: 'match_date_tolerance_days', label: 'Dias' }, { id: 'amount_tolerance', label: 'Tolerancia' }],
  },
];

const documentTemplateTabs = [
  {
    id: 'templates', resource: 'document-templates', label: 'Plantillas', singular: 'plantilla', icon: FileText, codeField: 'template_code', activeField: 'is_active',
    empty: { template_name: '', document_type_id: '', template_channel: 'PDF', paper_size: 'A4', orientation: 'PORTRAIT', is_default: false, is_active: true },
    fields: [{ id: 'template_name', label: 'Plantilla', required: true }, { id: 'document_type_id', label: 'Tipo documento', type: 'select', optionsResource: 'document-types-options' }, { id: 'template_channel', label: 'Canal', type: 'select', options: ['PRINT', 'EMAIL', 'PDF', 'THERMAL', 'OTHER'].map((value) => ({ value, label: value })) }, { id: 'template_subject', label: 'Asunto' }, { id: 'template_body', label: 'Contenido', wide: true }, { id: 'paper_size', label: 'Papel' }, { id: 'orientation', label: 'Orientacion', type: 'select', options: [{ value: 'PORTRAIT', label: 'Vertical' }, { value: 'LANDSCAPE', label: 'Horizontal' }] }, { id: 'is_default', label: 'Defecto', type: 'checkbox', checkLabel: 'Plantilla por defecto' }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
    tableFields: [{ id: 'template_name', label: 'Plantilla', primary: true }, { id: 'document_type_id', label: 'Documento' }, { id: 'template_channel', label: 'Canal' }, { id: 'is_default', label: 'Defecto' }],
  },
];

const notificationSettingsTabs = [
  {
    id: 'types', resource: 'notification-types', label: 'Tipos', singular: 'tipo de notificacion', icon: Bell, activeField: 'is_active',
    empty: { type_code: '', type_name: '', severity: 'INFO', icon_name: 'bell-line', is_user_visible: true, is_active: true },
    fields: [{ id: 'type_code', label: 'Codigo', required: true }, { id: 'type_name', label: 'Tipo', required: true }, { id: 'type_description', label: 'Descripcion', wide: true }, { id: 'severity', label: 'Severidad', type: 'select', options: ['INFO', 'SUCCESS', 'WARNING', 'ERROR'].map((value) => ({ value, label: value })) }, { id: 'icon_name', label: 'Icono' }, { id: 'default_action_label', label: 'Accion sugerida' }, { id: 'is_user_visible', label: 'Visible', type: 'checkbox', checkLabel: 'Visible para usuario' }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
    tableFields: [{ id: 'type_name', label: 'Tipo', primary: true }, { id: 'type_code', label: 'Codigo' }, { id: 'severity', label: 'Severidad' }],
  },
  {
    id: 'rules', resource: 'notification-emission-rules', label: 'Reglas', singular: 'regla de emision', icon: Settings, codeField: 'rule_code', activeField: 'is_active',
    empty: { rule_name: '', source_label: 'Sistema', notification_type_id: '', min_priority: 1, emit_in_app: true, emit_email: false, emit_push: false, is_active: true },
    fields: [{ id: 'rule_name', label: 'Regla', required: true }, { id: 'source_label', label: 'Origen', required: true }, { id: 'notification_type_id', label: 'Tipo', type: 'select', optionsResource: 'notification-types', required: true }, { id: 'severity_override', label: 'Severidad forzada', type: 'select', options: [{ value: '', label: 'Usar tipo' }, ...['INFO', 'SUCCESS', 'WARNING', 'ERROR'].map((value) => ({ value, label: value }))] }, { id: 'min_priority', label: 'Prioridad minima', type: 'number', min: 1 }, { id: 'max_per_user_per_day', label: 'Max. por usuario/dia', type: 'number', min: 0 }, { id: 'emit_in_app', label: 'Bandeja', type: 'checkbox', checkLabel: 'Emitir en bandeja' }, { id: 'emit_email', label: 'Email', type: 'checkbox', checkLabel: 'Emitir por email' }, { id: 'emit_push', label: 'Push', type: 'checkbox', checkLabel: 'Emitir push' }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
    tableFields: [{ id: 'rule_name', label: 'Regla', primary: true }, { id: 'source_label', label: 'Origen' }, { id: 'notification_type_id', label: 'Tipo' }, { id: 'emit_in_app', label: 'Bandeja' }],
  },
  {
    id: 'preferences', resource: 'user-notification-preferences', label: 'Preferencias', singular: 'preferencia', icon: UserRound, activeField: 'is_active',
    empty: { user_id: '', notification_type_id: '', receive_in_app: true, receive_email: false, receive_push: false, is_active: true },
    fields: [{ id: 'user_id', label: 'Usuario', type: 'select', optionsResource: 'users-options', required: true }, { id: 'notification_type_id', label: 'Tipo', type: 'select', optionsResource: 'notification-types', required: true }, { id: 'receive_in_app', label: 'Bandeja', type: 'checkbox', checkLabel: 'Recibe en bandeja' }, { id: 'receive_email', label: 'Email', type: 'checkbox', checkLabel: 'Recibe email' }, { id: 'receive_push', label: 'Push', type: 'checkbox', checkLabel: 'Recibe push' }, { id: 'muted_until', label: 'Silenciado hasta', type: 'datetime-local' }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
    tableFields: [{ id: 'user_id', label: 'Usuario', primary: true }, { id: 'notification_type_id', label: 'Tipo' }, { id: 'receive_in_app', label: 'Bandeja' }, { id: 'receive_email', label: 'Email' }],
  },
];

const systemTabs = [
  {
    id: 'currencies', resource: 'currencies', label: 'Monedas', singular: 'moneda', icon: CircleDollarSign, activeField: 'is_active',
    empty: { currency_code: '', currency_name: '', currency_symbol: '', decimal_places: 2, is_base_currency: false, is_active: true },
    fields: [{ id: 'currency_code', label: 'Codigo ISO', required: true }, { id: 'currency_name', label: 'Nombre', required: true }, { id: 'currency_symbol', label: 'Simbolo', required: true }, { id: 'decimal_places', label: 'Decimales', type: 'number', min: 0 }, { id: 'is_base_currency', label: 'Base', type: 'checkbox', checkLabel: 'Moneda base' }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
    tableFields: [{ id: 'currency_name', label: 'Moneda', primary: true }, { id: 'currency_code', label: 'Codigo' }, { id: 'currency_symbol', label: 'Simbolo' }, { id: 'decimal_places', label: 'Decimales' }],
  },
  {
    id: 'statuses', resource: 'system-statuses', label: 'Estados', singular: 'estado', icon: ShieldCheck, activeField: 'is_active',
    empty: { status_group: '', status_code: '', status_name: '', status_display_es: '', is_active: true, sort_order: 0 },
    fields: [{ id: 'status_group', label: 'Grupo', required: true }, { id: 'status_code', label: 'Codigo', required: true }, { id: 'status_name', label: 'Nombre interno', required: true }, { id: 'status_display_es', label: 'Nombre visible', required: true }, { id: 'status_color', label: 'Color' }, { id: 'status_icon', label: 'Icono' }, { id: 'sort_order', label: 'Orden', type: 'number', min: 0 }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
    tableFields: [{ id: 'status_display_es', label: 'Estado', primary: true }, { id: 'status_group', label: 'Grupo' }, { id: 'status_code', label: 'Codigo' }],
  },
  {
    id: 'banks', resource: 'banks', label: 'Bancos', singular: 'banco', icon: Landmark, codeField: 'bank_code', activeField: 'is_active',
    empty: { bank_name: '', country: 'Chile', is_active: true },
    fields: [{ id: 'bank_name', label: 'Banco', required: true }, { id: 'country', label: 'Pais' }, { id: 'swift_code', label: 'SWIFT' }, { id: 'routing_code', label: 'Routing' }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
    tableFields: [{ id: 'bank_name', label: 'Banco', primary: true }, { id: 'country', label: 'Pais' }, { id: 'swift_code', label: 'SWIFT' }],
  },
  {
    id: 'accounts', resource: 'bank-accounts', label: 'Cuentas', singular: 'cuenta bancaria', icon: CircleDollarSign, codeField: 'account_code', activeField: 'is_active',
    empty: { bank_id: '', account_number: '', account_name: '', account_type: 'CHECKING', currency_code: 'CLP', opening_balance: 0, current_balance: 0, is_active: true },
    fields: [{ id: 'bank_id', label: 'ID banco', type: 'number', required: true }, { id: 'account_number', label: 'Numero', required: true }, { id: 'account_name', label: 'Nombre', required: true }, { id: 'account_type', label: 'Tipo', type: 'select', options: ['CHECKING', 'SAVINGS', 'CREDIT_LINE', 'CASH', 'OTHER'].map((value) => ({ value, label: value })) }, { id: 'currency_code', label: 'Moneda', type: 'select', optionsResource: 'currencies' }, { id: 'opening_balance', label: 'Saldo inicial', type: 'number' }, { id: 'current_balance', label: 'Saldo actual', type: 'number' }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
    tableFields: [{ id: 'account_name', label: 'Cuenta', primary: true }, { id: 'bank_id', label: 'ID banco' }, { id: 'currency_code', label: 'Moneda' }, { id: 'current_balance', label: 'Saldo' }],
  },
  {
    id: 'currency', resource: 'currency-rates', label: 'Tipos de cambio', singular: 'tipo de cambio', icon: CircleDollarSign, showStatus: false,
    empty: { currency_code: 'USD', rate_date: new Date().toISOString().slice(0, 10), rate_to_clp: 0 },
    fields: [{ id: 'currency_code', label: 'Moneda', type: 'select', optionsResource: 'currencies', required: true }, { id: 'rate_date', label: 'Fecha', type: 'date', required: true }, { id: 'rate_to_clp', label: 'Valor CLP', type: 'number', min: 0, required: true }, { id: 'source_name', label: 'Fuente' }, { id: 'source_reference', label: 'Referencia' }],
    tableFields: [{ id: 'currency_code', label: 'Moneda', primary: true }, { id: 'rate_date', label: 'Fecha' }, { id: 'rate_to_clp', label: 'Valor CLP' }],
  },
  {
    id: 'returns', resource: 'return-reasons', label: 'Devoluciones', singular: 'motivo de devolucion', icon: RotateCcw, codeField: 'reason_code', activeField: 'is_active',
    empty: { reason_name: '', requires_approval: false, affects_stock: true, allows_exchange: true, allows_refund: true, is_active: true },
    fields: [{ id: 'reason_name', label: 'Motivo', required: true }, { id: 'reason_description', label: 'Descripcion', wide: true }, { id: 'max_days_after_sale', label: 'Dias maximos', type: 'number', min: 0 }, { id: 'default_account_code', label: 'Cuenta contable' }, { id: 'requires_approval', label: 'Aprobacion', type: 'checkbox', checkLabel: 'Requiere aprobacion' }, { id: 'affects_stock', label: 'Stock', type: 'checkbox', checkLabel: 'Afecta stock' }, { id: 'allows_exchange', label: 'Cambio', type: 'checkbox', checkLabel: 'Permite cambio' }, { id: 'allows_refund', label: 'Reembolso', type: 'checkbox', checkLabel: 'Permite reembolso' }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
    tableFields: [{ id: 'reason_name', label: 'Motivo', primary: true }, { id: 'max_days_after_sale', label: 'Dias max.' }, { id: 'affects_stock', label: 'Stock' }],
  },
  {
    id: 'stock', resource: 'stock-critical-config', label: 'Stock critico', singular: 'regla de stock', icon: Settings, activeField: 'is_active',
    empty: { product_variant_id: '', warehouse_id: '', minimum_stock: 0, safety_stock: 0, lead_time_days: 7, avg_daily_sales: 0, alert_enabled: true, alert_frequency_hours: 24, is_active: true },
    fields: [{ id: 'product_variant_id', label: 'ID SKU', type: 'number', required: true }, { id: 'warehouse_id', label: 'ID bodega', type: 'number', required: true }, { id: 'minimum_stock', label: 'Stock minimo', type: 'number', min: 0 }, { id: 'maximum_stock', label: 'Stock maximo', type: 'number', min: 0 }, { id: 'safety_stock', label: 'Stock seguridad', type: 'number', min: 0 }, { id: 'reorder_quantity', label: 'Cantidad reorden', type: 'number', min: 0 }, { id: 'lead_time_days', label: 'Lead time', type: 'number', min: 0 }, { id: 'alert_enabled', label: 'Alerta', type: 'checkbox', checkLabel: 'Alerta activa' }, { id: 'alert_frequency_hours', label: 'Frecuencia horas', type: 'number', min: 1 }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
    tableFields: [{ id: 'product_variant_id', label: 'ID SKU', primary: true }, { id: 'warehouse_id', label: 'ID bodega' }, { id: 'minimum_stock', label: 'Minimo' }, { id: 'safety_stock', label: 'Seguridad' }],
  },
];

export const CustomersMaintainers = ({ initialTab, visibleTabs }) => {
  const scopedTabs = visibleTabs?.length ? customersTabs.filter((tab) => visibleTabs.includes(tab.id)) : customersTabs;
  return <AdminGenericMaintainers title="Mantenedores de clientes" description="Clientes, personas autorizadas y condiciones de credito." tabs={scopedTabs} initialTab={initialTab} />;
};
export const SuppliersMaintainers = ({ initialTab, visibleTabs }) => {
  const scopedTabs = visibleTabs?.length ? suppliersTabs.filter((tab) => visibleTabs.includes(tab.id)) : suppliersTabs;
  return <AdminGenericMaintainers title="Mantenedores de proveedores" description="Proveedores, contactos, direcciones y productos asociados." tabs={scopedTabs} initialTab={initialTab} />;
};
export const ProductBarcodeMaintainers = ({ initialTab }) => <AdminGenericMaintainers title="Codigos de barra de productos" description="Codigos asociados a SKU / Variedades y unidades comerciales." tabs={productBarcodeTabs} initialTab={initialTab} />;
export const ProductUnitMaintainers = ({ initialTab }) => <AdminGenericMaintainers title="Unidades por producto" description="Unidades alternativas de compra, venta e inventario por producto." tabs={productUnitTabs} initialTab={initialTab} />;
export const ProductMediaMaintainers = ({ initialTab }) => <AdminGenericMaintainers title="Media de productos" description="Media tecnica asociada a productos o SKU / Variedades." tabs={productMediaTabs} initialTab={initialTab} />;
export const InventoryMaintainers = ({ initialTab }) => <AdminGenericMaintainers title="Mantenedores de inventario" description="Zonas de bodega y reglas de reposicion." tabs={inventoryTabs} initialTab={initialTab} />;
export const SalesConfigMaintainers = ({ initialTab }) => <AdminGenericMaintainers title="Mantenedores comerciales" description="Promociones y reglas de devolucion sin transaccionar ventas." tabs={salesConfigTabs} initialTab={initialTab} />;
export const FinanceMaintainers = ({ initialTab }) => <AdminGenericMaintainers title="Mantenedores financieros" description="Bancos, cuentas, monedas y parametros de conciliacion." tabs={financeTabs} initialTab={initialTab} />;
export const DocumentTemplateMaintainers = ({ initialTab }) => <AdminGenericMaintainers title="Plantillas de documentos" description="Plantillas de salida para documentos comerciales." tabs={documentTemplateTabs} initialTab={initialTab} />;
export const NotificationSettingsMaintainers = ({ initialTab }) => <AdminGenericMaintainers title="Configuracion de notificaciones" description="Tipos, reglas de emision y preferencias de recepcion." tabs={notificationSettingsTabs} initialTab={initialTab} />;
export const SystemParameterMaintainers = ({ initialTab }) => <AdminGenericMaintainers title="Parametros del sistema" description="Estados, bancos, monedas, devoluciones y reglas de stock critico." tabs={systemTabs} initialTab={initialTab} />;
