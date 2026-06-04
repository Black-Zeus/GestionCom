/* eslint-disable react/prop-types */
import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';

const actionAbbreviations = {
  VIEW: 'VER',
  READ: 'VER',
  LIST: 'LIS',
  SEARCH: 'BUS',
  CREATE: 'CRE',
  ADD: 'ADD',
  OPEN: 'ABR',
  GENERATE: 'GEN',
  EDIT: 'EDI',
  UPDATE: 'ACT',
  WRITE: 'ESC',
  MANAGE: 'GES',
  MANAGER: 'GES',
  CONFIG: 'CFG',
  CONFIGURE: 'CFG',
  APPROVE: 'APR',
  PROCESS: 'PRO',
  SUPERVISE: 'SUP',
  AUTHORIZE: 'AUT',
  DELETE: 'ELI',
  REMOVE: 'REM',
  CANCEL: 'ANU',
  REVOKE: 'REV',
  WAIVE: 'CON',
  RECEIVE: 'REC',
  ALLOCATE: 'ASI',
  APPLY: 'APL',
  VISIBLE: 'VIS',
};

const moduleAbbreviations = {
  ACCOUNTS_RECEIVABLE: 'CCB',
  ADMIN: 'ADM',
  AGING_REPORTS: 'ANT',
  AUDIT: 'AUD',
  ATTRIBUTES: 'ATR',
  AR_REPORTS: 'CXC',
  BANKS: 'BAN',
  BULK_IMPORT: 'IMP',
  CASH_CONTROL: 'CAJ',
  CASH_REGISTER: 'CAJ',
  CASH_MOVEMENTS: 'MOV',
  CASH_REPORTS: 'RPT',
  CATEGORIES: 'CAT',
  CHECKS: 'CHQ',
  CREDIT_LIMITS: 'LIM',
  CUSTOMERS: 'CLI',
  DOCUMENTS: 'DOC',
  FINANCE: 'FIN',
  HOME: 'INI',
  INVENTORY: 'INV',
  MENU: 'MEN',
  METRICS: 'MET',
  MOVEMENTS: 'MOV',
  PAYMENTS: 'PAG',
  PAYMENT_METHODS: 'MPA',
  PERMISSIONS: 'PER',
  PHYSICAL_COUNTS: 'FIS',
  PRICES: 'PRE',
  PRICING: 'PRE',
  PRODUCTS: 'PRD',
  PROMOTIONS: 'PRO',
  PURCHASES: 'COM',
  REORDER_SUGGESTIONS: 'REP',
  REPORTS: 'RPT',
  RETURNS: 'DEV',
  ROLES: 'ROL',
  SALES: 'VTA',
  STOCK: 'STK',
  STOCK_ALERTS: 'ALT',
  SETTINGS: 'CFG',
  SUPPLIERS: 'PRV',
  TAX_BOOKS: 'LIB',
  USER: 'USR',
  USERS: 'USR',
  WAREHOUSE: 'BOD',
  WAREHOUSE_ACCESS: 'BAC',
  WAREHOUSE_INVENTORY: 'INV',
  WAREHOUSE_MOVEMENTS: 'MOV',
  WAREHOUSE_ZONE: 'ZON',
};

const groupLabels = {
  ACCOUNTS_RECEIVABLE: 'CUENTAS POR COBRAR',
  ADMIN: 'ADMINISTRACION',
  AUDIT: 'REPORTES AUDITORIA',
  CASH_CONTROL: 'CAJA',
  CASH_REGISTER: 'CAJA',
  CUSTOMERS: 'CLIENTES',
  DOCUMENTS: 'DOCUMENTOS',
  FINANCE: 'FINANZAS',
  HOME: 'INICIO',
  INVENTORY: 'INVENTARIO',
  METRICS: 'METRICAS',
  PAYMENTS: 'PAGOS',
  PRODUCTS: 'PRODUCTOS',
  PRICING: 'PRECIOS',
  PURCHASES: 'COMPRAS',
  REPORTS: 'REPORTES GESTION',
  RETURNS: 'DEVOLUCIONES',
  SALES: 'VENTAS',
  SETTINGS: 'CONFIGURACION',
  SUPPLIERS: 'PROVEEDORES',
  USER: 'USUARIOS',
  WAREHOUSE: 'BODEGAS',
  WAREHOUSE_ACCESS: 'ACCESO A BODEGAS',
  WAREHOUSE_ZONE: 'ZONAS DE BODEGA',
};

const groupOrder = {
  HOME: 10,
  SALES: 20,
  CUSTOMERS: 30,
  CASH_CONTROL: 40,
  CASH_REGISTER: 40,
  INVENTORY: 50,
  PRODUCTS: 55,
  PRICING: 56,
  WAREHOUSE: 56,
  WAREHOUSE_ZONE: 57,
  WAREHOUSE_ACCESS: 58,
  SUPPLIERS: 60,
  PURCHASES: 61,
  FINANCE: 70,
  PAYMENTS: 71,
  ACCOUNTS_RECEIVABLE: 75,
  DOCUMENTS: 80,
  RETURNS: 81,
  METRICS: 90,
  REPORTS: 100,
  AUDIT: 110,
  SETTINGS: 120,
  ADMIN: 130,
  USER: 131,
};

const sectionDefinitions = [
  { id: 'home', label: 'INICIO', groups: ['HOME'] },
  { id: 'sales', label: 'VENTAS', groups: ['SALES', 'PRICING'] },
  { id: 'customers', label: 'CLIENTES', groups: ['CUSTOMERS', 'ACCOUNTS_RECEIVABLE'] },
  { id: 'cash', label: 'CAJA', groups: ['CASH_CONTROL', 'CASH_REGISTER'] },
  { id: 'inventory', label: 'INVENTARIO', groups: ['INVENTORY', 'PRODUCTS', 'WAREHOUSE', 'WAREHOUSE_ZONE', 'WAREHOUSE_ACCESS'] },
  { id: 'suppliers', label: 'PROVEEDORES', groups: ['SUPPLIERS', 'PURCHASES'] },
  { id: 'finance', label: 'FINANZAS', groups: ['FINANCE', 'PAYMENTS'] },
  { id: 'documents', label: 'DOCUMENTOS', groups: ['DOCUMENTS', 'RETURNS'] },
  { id: 'reports', label: 'REPORTES', groups: ['METRICS', 'REPORTS', 'AUDIT'] },
  { id: 'settings', label: 'CONFIGURACION', groups: ['SETTINGS'] },
  { id: 'admin', label: 'ADMINISTRACION', groups: ['ADMIN', 'USER'] },
];

const sectionByGroup = sectionDefinitions.reduce((sections, section, index) => {
  section.groups.forEach((group) => {
    sections[group] = {
      id: section.id,
      label: section.label,
      order: (index + 1) * 10,
    };
  });
  return sections;
}, {});

const toDisplayLabel = (value = '') => value
  .replace(/_/g, ' ')
  .toLowerCase()
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const groupPermissions = (permissions = []) => permissions.reduce((groups, permission) => {
  const group = permission.permission_group || 'GENERAL';
  return {
    ...groups,
    [group]: [...(groups[group] || []), permission],
  };
}, {});

const getCompactToken = (value = 'GEN') => value
  .replace(/[^A-Z0-9]/gi, '')
  .slice(0, 3)
  .toUpperCase() || 'GEN';

const getPermissionLabel = (permission) => {
  const name = permission.permission_name || '';
  const code = permission.permission_code || '';

  if (name && name !== code) return name;

  const parts = code.split('_');
  return toDisplayLabel(parts.slice(1).join('_') || code || 'Permiso');
};

const getPermissionShortCode = (permission) => {
  const codeParts = permission.permission_code?.split('_').filter(Boolean) || [];
  const lastToken = codeParts.at(-1)?.toUpperCase() || 'PER';
  const rawSubjectParts = codeParts.length > 1 ? codeParts.slice(0, -1) : [];
  const subjectParts = rawSubjectParts.length > 1 && rawSubjectParts[0] === permission.permission_group
    ? rawSubjectParts.slice(1)
    : rawSubjectParts;
  const subjectToken = subjectParts.join('_') || permission.permission_group;
  const moduleCode = moduleAbbreviations[subjectToken]
    || moduleAbbreviations[subjectParts[0]]
    || getCompactToken(subjectToken)
    || moduleAbbreviations[permission.permission_group]
    || getCompactToken(permission.permission_group);
  const actionCode = actionAbbreviations[lastToken] || getCompactToken(lastToken);

  return `${moduleCode}.${actionCode}`;
};

const getPermissionSortWeight = (permission) => (
  permission.permission_code?.endsWith('_VISIBLE') ? 0 : 10
);

const buildPermissionGroups = (permissions = []) => Object.entries(groupPermissions(permissions))
  .map(([group, groupPermissionsList]) => ({
    group,
    label: groupLabels[group] || toDisplayLabel(group).toUpperCase(),
    permissions: [...groupPermissionsList].sort((left, right) => (
      getPermissionSortWeight(left) - getPermissionSortWeight(right)
      || getPermissionShortCode(left).localeCompare(getPermissionShortCode(right))
      || getPermissionLabel(left).localeCompare(getPermissionLabel(right))
    )),
  }))
  .sort((left, right) => (
    (groupOrder[left.group] ?? 999) - (groupOrder[right.group] ?? 999)
    || left.label.localeCompare(right.label)
  ));

const buildPermissionSections = (permissions = []) => {
  const groups = buildPermissionGroups(permissions);
  const sections = groups.reduce((currentSections, group) => {
    const section = sectionByGroup[group.group] || {
      id: 'other',
      label: 'OTROS',
      order: 999,
    };
    const existingSection = currentSections[section.id] || {
      ...section,
      groups: [],
      permissionsCount: 0,
    };

    return {
      ...currentSections,
      [section.id]: {
        ...existingSection,
        groups: [...existingSection.groups, group],
        permissionsCount: existingSection.permissionsCount + group.permissions.length,
      },
    };
  }, {});

  return Object.values(sections).sort((left, right) => (
    left.order - right.order
    || left.label.localeCompare(right.label)
  ));
};

const PermissionToggle = ({
  permission,
  selected,
  inherited = false,
  onToggle,
  disabled = false,
}) => {
  const label = getPermissionLabel(permission);
  const shortCode = getPermissionShortCode(permission);
  const isDisabled = disabled || inherited;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => onToggle(permission.id)}
      className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-xs transition disabled:cursor-not-allowed ${selected ? 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/70'} ${inherited ? 'opacity-75' : ''} ${disabled && !inherited ? 'opacity-60' : ''}`}
      title={`${label} (${permission.permission_code})${inherited ? ' - heredado por rol' : ''}`}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {shortCode}
          {inherited && <span className="rounded-md bg-slate-200 px-1.5 py-0.5 font-sans text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">Rol</span>}
        </span>
        <span className="block truncate font-medium">
          {label}
        </span>
      </span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${selected ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
        <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition ${selected ? 'translate-x-4' : 'translate-x-0'}`} />
      </span>
    </button>
  );
};

const PermissionMatrix = ({
  permissions = [],
  selectedPermissionIds = [],
  inheritedPermissionIds = [],
  onToggle,
  disabled = false,
  emptyMessage = 'No hay permisos para la busqueda actual.',
}) => {
  const [collapsedSections, setCollapsedSections] = useState({});
  const inheritedSet = useMemo(() => new Set(inheritedPermissionIds), [inheritedPermissionIds]);
  const selectedSet = useMemo(() => new Set(selectedPermissionIds), [selectedPermissionIds]);
  const permissionSections = useMemo(() => buildPermissionSections(permissions), [permissions]);

  const toggleSection = (sectionId) => {
    setCollapsedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

  if (!permissionSections.length) {
    return (
      <div className="rounded-md border border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {permissionSections.map((section) => (
        <section
          key={section.id}
          className="rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <button
            type="button"
            onClick={() => toggleSection(section.id)}
            className="mb-3 flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/70"
            aria-expanded={!collapsedSections[section.id]}
          >
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">{section.label}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {section.groups.length} grupos - {section.permissionsCount} permisos
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${collapsedSections[section.id] ? '-rotate-90' : 'rotate-0'}`} />
          </button>
          <div className={`grid overflow-hidden transition-[grid-template-rows,opacity,transform] duration-200 ease-out ${collapsedSections[section.id] ? 'grid-rows-[0fr] opacity-0 -translate-y-1' : 'grid-rows-[1fr] opacity-100 translate-y-0'}`}>
            <div className="min-h-0">
              <div className="space-y-3">
                {section.groups.map((group) => (
                  <div key={group.group} className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">{group.label}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{group.permissions.length} permisos</p>
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {group.permissions.map((permission) => (
                        <PermissionToggle
                          key={permission.id}
                          permission={permission}
                          selected={selectedSet.has(permission.id)}
                          inherited={inheritedSet.has(permission.id)}
                          onToggle={onToggle}
                          disabled={disabled}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
};

export default PermissionMatrix;
