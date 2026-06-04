/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, KeyRound, RefreshCw, Save, Search, ShieldCheck, Users } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BottomActionBar from '@/components/common/actions/BottomActionBar';
import { rolesService } from '@/services/admin/rolesService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';

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

const PermissionToggle = ({ permission, selected, onToggle, disabled = false }) => {
  const label = getPermissionLabel(permission);
  const shortCode = getPermissionShortCode(permission);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(permission.id)}
      className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-60 ${selected ? 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/70'}`}
      title={`${label} (${permission.permission_code})`}
    >
      <span className="min-w-0">
        <span className="block font-mono text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {shortCode}
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

const AdminRolePermissions = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleIdParam = Number(searchParams.get('roleId'));
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState([]);
  const [initialPermissionIds, setInitialPermissionIds] = useState([]);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({});
  const [changeReason, setChangeReason] = useState('');
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [includeSystem, setIncludeSystem] = useState(true);
  const [loading, setLoading] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [error, setError] = useState('');
  const [permissionError, setPermissionError] = useState('');
  const isSystemRoleReadOnly = Boolean(selectedRole?.is_system_role || selectedRole?.can_edit === false);

  const hasPermissionChanges = useMemo(() => {
    const current = [...selectedPermissionIds].sort((left, right) => left - right).join(',');
    const initial = [...initialPermissionIds].sort((left, right) => left - right).join(',');
    return current !== initial;
  }, [initialPermissionIds, selectedPermissionIds]);

  const filteredPermissions = useMemo(() => {
    const term = permissionSearch.trim().toLowerCase();
    if (!term) return permissions;

    return permissions.filter((permission) => (
      permission.permission_code?.toLowerCase().includes(term)
      || permission.permission_name?.toLowerCase().includes(term)
      || permission.permission_group?.toLowerCase().includes(term)
    ));
  }, [permissionSearch, permissions]);

  const permissionSections = useMemo(() => buildPermissionSections(filteredPermissions), [filteredPermissions]);

  const loadRoles = async ({ resetSelection = true } = {}) => {
    setLoading(true);
    setError('');

    try {
      const rolesData = await rolesService.list({
        limit: 200,
        active_only: activeOnly,
        include_system: includeSystem,
        search: search || undefined,
      });
      setRoles(rolesData.roles || []);

      if (resetSelection) {
        setSelectedRole(null);
        setPermissions([]);
        setSelectedPermissionIds([]);
        setInitialPermissionIds([]);
        setPermissionSearch('');
        setChangeReason('');
      }
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar roles.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOnly, includeSystem]);

  useEffect(() => {
    if (!roleIdParam || selectedRole?.id === roleIdParam) return;

    const role = roles.find((item) => item.id === roleIdParam);
    if (role) {
      selectRole(role);
    }
  }, [roleIdParam, roles, selectedRole?.id]);

  const selectRole = async (role) => {
    setError('');
    setPermissionError('');
    setSelectedRole(role);
    setPermissions([]);
    setPermissionSearch('');
    setChangeReason('');
    setPermissionsLoading(true);

    try {
      const [detail, matrix] = await Promise.all([
        rolesService.get(role.id),
        rolesService.getPermissions(role.id),
      ]);
      setSelectedRole(detail);
      setPermissions(matrix.permissions || []);
      setSelectedPermissionIds(matrix.assigned_permission_ids || []);
      setInitialPermissionIds(matrix.assigned_permission_ids || []);
    } catch (requestError) {
      setPermissionError(getBackendMessage(requestError, 'No fue posible cargar permisos del rol.'));
    } finally {
      setPermissionsLoading(false);
    }
  };

  const togglePermission = (permissionId) => {
    if (isSystemRoleReadOnly) return;

    setSelectedPermissionIds((current) => (
      current.includes(permissionId)
        ? current.filter((selectedPermissionId) => selectedPermissionId !== permissionId)
        : [...current, permissionId]
    ));
  };

  const toggleSection = (sectionId) => {
    setCollapsedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

  const savePermissions = async () => {
    setPermissionError('');

    if (!selectedRole || !hasPermissionChanges) return;

    if (isSystemRoleReadOnly) {
      setPermissionError('No es posible modificar permisos de perfiles de sistema.');
      return;
    }

    if (changeReason.trim().length < 3) {
      setPermissionError('Debes indicar un motivo del cambio.');
      return;
    }

    setSavingPermissions(true);

    try {
      await notifyPromise(
        rolesService.updatePermissions(selectedRole.id, {
          permission_ids: selectedPermissionIds,
          reason: changeReason.trim(),
        }),
        {
          loading: 'Actualizando permisos...',
          success: 'Permisos del rol actualizados.',
          error: (requestError) => getBackendMessage(requestError, 'No fue posible actualizar permisos del rol.'),
        }
      );
      await loadRoles({ resetSelection: false });
      await selectRole(selectedRole);
    } finally {
      setSavingPermissions(false);
    }
  };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/roles')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Volver a roles"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">Permisos de perfil</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {selectedRole ? `${selectedRole.role_name} - ${selectedRole.role_code}` : 'Selecciona un perfil desde Administracion > Roles.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => loadRoles()}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refrescar
        </button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {[
          ['Usuarios', selectedRole?.users_count ?? 0, Users],
          ['Permisos', selectedPermissionIds.length, ShieldCheck],
          ['Tipo', selectedRole?.is_system_role ? 'Sistema' : selectedRole ? 'Custom' : '-', KeyRound],
          ['Estado', selectedRole?.is_active ? 'Activo' : selectedRole ? 'Inactivo' : '-', ShieldCheck],
        ].map(([label, value, Icon]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{label}</p>
              <Icon className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 hidden flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-10 min-w-72 flex-1 items-center rounded-md border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') loadRoles();
            }}
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="Buscar rol"
          />
          <button type="button" onClick={() => loadRoles()} className="text-slate-500 hover:text-blue-600" aria-label="Buscar roles">
            <Search className="h-4 w-4" />
          </button>
        </div>
        <label className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm dark:border-slate-700">
          <input type="checkbox" checked={activeOnly} onChange={(event) => setActiveOnly(event.target.checked)} />
          Solo activos
        </label>
        <label className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm dark:border-slate-700">
          <input type="checkbox" checked={includeSystem} onChange={(event) => setIncludeSystem(event.target.checked)} />
          Sistema
        </label>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mb-4 hidden overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Usuarios</th>
              <th className="px-4 py-3">Permisos</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {roles.map((role) => (
              <tr key={role.id} onClick={() => selectRole(role)} className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 ${selectedRole?.id === role.id ? 'bg-blue-50/70 dark:bg-blue-950/20' : ''}`}>
                <td className="px-4 py-3">
                  <div className="font-medium">{role.role_name}</div>
                  <div className="text-xs text-slate-500">{role.role_code}</div>
                </td>
                <td className="px-4 py-3">{role.is_system_role ? 'Sistema' : 'Operativo'}</td>
                <td className="px-4 py-3">{role.users_count}</td>
                <td className="px-4 py-3">{role.permissions_count}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${role.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {role.status_label}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && roles.length === 0 && (
              <tr>
                <td colSpan="5" className="px-4 py-10 text-center text-sm text-slate-500">
                  No hay roles para los filtros actuales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <section className="rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {selectedRole ? (
          <>
            <div className="border-b border-slate-200 p-4 dark:border-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Permisos del rol</p>
                  <h2 className="mt-1 text-lg font-semibold">{selectedRole.role_name}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedRole.role_description || selectedRole.role_code}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-md bg-slate-100 px-3 py-2 dark:bg-slate-800">
                    <p className="font-semibold">{selectedRole.users_count}</p>
                    <p className="text-xs text-slate-500">Usuarios</p>
                  </div>
                  <div className="rounded-md bg-slate-100 px-3 py-2 dark:bg-slate-800">
                    <p className="font-semibold">{selectedPermissionIds.length}</p>
                    <p className="text-xs text-slate-500">Permisos</p>
                  </div>
                  <div className="rounded-md bg-slate-100 px-3 py-2 dark:bg-slate-800">
                    <p className="font-semibold">{selectedRole.can_edit ? 'Si' : 'No'}</p>
                    <p className="text-xs text-slate-500">Editable</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-10 min-w-72 flex-1 items-center rounded-md border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
                  <input
                    value={permissionSearch}
                    onChange={(event) => setPermissionSearch(event.target.value)}
                    className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                    placeholder="Buscar permiso, codigo o grupo"
                  />
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
              </div>

              {!isSystemRoleReadOnly && (
                <label className="space-y-1.5 text-sm">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">Motivo del cambio</span>
                  <textarea
                    className="min-h-20 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-900 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                    placeholder="Ejemplo: Ajuste de permisos del rol segun nueva responsabilidad operativa."
                    value={changeReason}
                    onChange={(event) => setChangeReason(event.target.value)}
                    minLength={3}
                    maxLength={500}
                    disabled={!hasPermissionChanges}
                    required={hasPermissionChanges}
                  />
                  <span className="block text-xs text-slate-500 dark:text-slate-400">Requerido solo si modificas permisos del rol.</span>
                </label>
              )}

              {permissionError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {permissionError}
                </div>
              )}

              {permissionsLoading ? (
                <div className="rounded-md border border-slate-200 px-4 py-12 text-center text-sm text-slate-500 dark:border-slate-800">
                  Cargando permisos...
                </div>
              ) : (
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
                                      selected={selectedPermissionIds.includes(permission.id)}
                                      onToggle={togglePermission}
                                      disabled={isSystemRoleReadOnly}
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
                  {!permissionSections.length && (
                    <div className="rounded-md border border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800">
                      No hay permisos para la busqueda actual.
                    </div>
                  )}
                </div>
              )}

              {!isSystemRoleReadOnly && (
                <BottomActionBar
                  actions={[
                    {
                      id: 'back',
                      label: 'Volver',
                      variant: 'neutral',
                      onClick: () => navigate('/admin/roles'),
                    },
                    {
                      id: 'save',
                      label: savingPermissions ? 'Guardando...' : 'Guardar permisos',
                      icon: Save,
                      variant: 'primary',
                      disabled: !hasPermissionChanges || savingPermissions || permissionsLoading,
                      onClick: savePermissions,
                    },
                  ]}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex min-h-72 items-center justify-center text-center text-sm text-slate-500">
            Selecciona un rol para cargar sus permisos.
          </div>
        )}
      </section>
    </section>
  );
};

export default AdminRolePermissions;
