/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, EyeOff, Pencil, ReceiptText, RefreshCw, ShieldCheck, Tags, Trash2, WalletCards, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import DataTablePagination from '@/components/common/data/DataTablePagination';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import { pettyCashAdminService } from '@/services/admin/pettyCashAdminService';
import { usersService } from '@/services/admin/usersService';
import { warehousesService } from '@/services/admin/warehousesService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { PAGE_SIZE_OPTIONS, usePreferencesStore } from '@/store/usePreferencesStore';
import { formatDateTime } from '@/utils/dateTime';

const fundStatuses = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'SUSPENDED', label: 'Suspendido' },
  { value: 'CLOSED', label: 'Cerrado' },
];

const emptyFundForm = {
  fund_code: '',
  warehouse_id: '',
  responsible_user_id: '',
  initial_amount: '50000',
  current_balance: '',
  fund_status: 'ACTIVE',
};

const emptyCategoryForm = {
  category_code: '',
  category_name: '',
  category_description: '',
  max_amount_per_expense: '',
  requires_evidence: false,
  is_active: true,
};

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const selectClassName = `${fieldClassName} bg-white dark:bg-slate-950`;

const formatCurrency = (value) => new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const getWarehouseLabel = (warehouse) => (warehouse ? `${warehouse.warehouse_code} - ${warehouse.warehouse_name}` : 'Sin bodega');

const getUserLabel = (user) => (
  user?.display_name
  || `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
  || user?.username
  || user?.email
  || 'Usuario'
);

const getFundStatusLabel = (status) => fundStatuses.find((item) => item.value === status)?.label || status || 'Activo';

const fundToForm = (fund) => ({
  fund_code: fund.fund_code || '',
  warehouse_id: fund.warehouse_id ? String(fund.warehouse_id) : '',
  responsible_user_id: fund.responsible_user_id ? String(fund.responsible_user_id) : '',
  initial_amount: String(fund.initial_amount ?? ''),
  current_balance: String(fund.current_balance ?? ''),
  fund_status: fund.fund_status || 'ACTIVE',
});

const categoryToForm = (category) => ({
  category_code: category.category_code || '',
  category_name: category.category_name || '',
  category_description: category.category_description || '',
  max_amount_per_expense: category.max_amount_per_expense == null ? '' : String(category.max_amount_per_expense),
  requires_evidence: Boolean(category.requires_evidence),
  is_active: category.is_active !== false,
});

const toFundPayload = (form, mode) => {
  const payload = {
    warehouse_id: Number(form.warehouse_id),
    responsible_user_id: Number(form.responsible_user_id),
    initial_amount: Number(form.initial_amount || 0),
    current_balance: form.current_balance === '' ? undefined : Number(form.current_balance || 0),
    fund_status: form.fund_status,
  };

  if (mode === 'create') {
    payload.fund_code = form.fund_code.trim().toUpperCase();
  }

  return payload;
};

const toCategoryPayload = (form, mode) => {
  const payload = {
    category_name: form.category_name.trim(),
    category_description: form.category_description.trim() || null,
    max_amount_per_expense: form.max_amount_per_expense === '' ? null : Number(form.max_amount_per_expense || 0),
    requires_evidence: Boolean(form.requires_evidence),
    is_active: Boolean(form.is_active),
  };

  if (mode === 'create') {
    payload.category_code = form.category_code.trim().toUpperCase();
  }

  return payload;
};

const FundFormModal = ({ mode = 'create', initialValues = emptyFundForm, warehouses = [], users = [], onSubmit, onClose }) => {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const isEdit = mode === 'edit';
  const activeUsers = useMemo(() => users.filter((user) => user.is_active !== false), [users]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!form.warehouse_id || !form.responsible_user_id) {
      setFormError('Debes seleccionar bodega y responsable.');
      return;
    }

    if (!isEdit && !/^[A-Z0-9_-]{2,50}$/.test(form.fund_code.trim().toUpperCase())) {
      setFormError('El codigo debe usar letras, numeros, guion o guion bajo.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(toFundPayload(form, mode));
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Codigo</span>
          <input className={`${fieldClassName} font-mono uppercase disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-900`} value={form.fund_code} onChange={(event) => updateField('fund_code', event.target.value.toUpperCase())} disabled={isEdit} required />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Estado</span>
          <select className={selectClassName} value={form.fund_status} onChange={(event) => updateField('fund_status', event.target.value)}>
            {fundStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Bodega / tienda</span>
          <select className={selectClassName} value={form.warehouse_id} onChange={(event) => updateField('warehouse_id', event.target.value)} required>
            <option value="">Selecciona bodega</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{getWarehouseLabel(warehouse)}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Responsable</span>
          <select className={selectClassName} value={form.responsible_user_id} onChange={(event) => updateField('responsible_user_id', event.target.value)} required>
            <option value="">Selecciona responsable</option>
            {activeUsers.map((user) => <option key={user.id} value={user.id}>{getUserLabel(user)}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Monto inicial</span>
          <input className={fieldClassName} type="number" min="0" step="1" value={form.initial_amount} onChange={(event) => updateField('initial_amount', event.target.value)} required />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Saldo actual</span>
          <input className={fieldClassName} type="number" min="0" step="1" value={form.current_balance} onChange={(event) => updateField('current_balance', event.target.value)} placeholder="Usa monto inicial si queda vacio" />
        </label>
      </div>

      {formError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{formError}</div>}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
        <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{saving ? 'Guardando...' : 'Guardar fondo'}</button>
      </div>
    </form>
  );
};

const CategoryFormModal = ({ mode = 'create', initialValues = emptyCategoryForm, onSubmit, onClose }) => {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const isEdit = mode === 'edit';

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!isEdit && !/^[A-Z0-9_-]{2,20}$/.test(form.category_code.trim().toUpperCase())) {
      setFormError('El codigo debe usar letras, numeros, guion o guion bajo.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(toCategoryPayload(form, mode));
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Codigo</span>
          <input className={`${fieldClassName} font-mono uppercase disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-900`} value={form.category_code} onChange={(event) => updateField('category_code', event.target.value.toUpperCase())} disabled={isEdit} required />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Nombre</span>
          <input className={fieldClassName} value={form.category_name} onChange={(event) => updateField('category_name', event.target.value)} minLength={3} required />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Descripcion</span>
          <textarea className="min-h-24 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={form.category_description} onChange={(event) => updateField('category_description', event.target.value)} maxLength={2000} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Monto maximo por gasto</span>
          <input className={fieldClassName} type="number" min="0" step="1" value={form.max_amount_per_expense} onChange={(event) => updateField('max_amount_per_expense', event.target.value)} />
        </label>
        <div className="grid gap-2 self-end sm:grid-cols-2">
          <label className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <input type="checkbox" checked={form.requires_evidence} onChange={(event) => updateField('requires_evidence', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Requiere comprobante
          </label>
          <label className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <input type="checkbox" checked={form.is_active} onChange={(event) => updateField('is_active', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Activa
          </label>
        </div>
      </div>

      {formError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{formError}</div>}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
        <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{saving ? 'Guardando...' : 'Guardar categoria'}</button>
      </div>
    </form>
  );
};

const AdminPettyCash = () => {
  const [activeTab, setActiveTab] = useState('funds');
  const [funds, setFunds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ fundStatus: 'all', categoryStatus: 'all', evidence: 'all' });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const tablePageSize = usePreferencesStore((state) => state.tablePageSize);
  const setTablePageSize = usePreferencesStore((state) => state.setTablePageSize);
  const timezone = usePreferencesStore((state) => state.timezone);

  const warehousesById = useMemo(() => new Map(warehouses.map((warehouse) => [Number(warehouse.id), warehouse])), [warehouses]);
  const usersById = useMemo(() => new Map(users.map((user) => [Number(user.id), user])), [users]);

  const loadReferenceData = async () => {
    const [warehouseData, userData] = await Promise.all([
      warehousesService.list({ active_only: true, limit: 1000 }).catch(() => []),
      usersService.list({ status: 'all', active_only: false, limit: 1000 }).catch(() => ({ users: [] })),
    ]);
    setWarehouses(warehouseData);
    setUsers(userData.users || []);
  };

  const loadPettyCash = async () => {
    setLoading(true);
    setError('');
    try {
      const [fundData, categoryData] = await Promise.all([
        pettyCashAdminService.listFunds({ active_only: false, limit: 1000 }),
        pettyCashAdminService.listCategories({ active_only: false, limit: 1000 }),
      ]);
      setFunds(fundData);
      setCategories(categoryData);
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar caja chica.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferenceData();
    loadPettyCash();
  }, []);

  useEffect(() => {
    setPage(0);
    setSearch('');
  }, [activeTab]);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const openFundModal = (fund = null) => {
    ModalManager.show({
      type: 'custom',
      title: fund ? 'Editar fondo' : 'Nuevo fondo',
      size: 'large',
      showFooter: false,
      contentComponent: FundFormModal,
      contentProps: {
        mode: fund ? 'edit' : 'create',
        initialValues: fund ? fundToForm(fund) : emptyFundForm,
        warehouses,
        users,
        onSubmit: async (payload) => {
          await notifyPromise(
            fund ? pettyCashAdminService.updateFund(fund.id, payload) : pettyCashAdminService.createFund(payload),
            {
              loading: fund ? 'Actualizando fondo...' : 'Creando fondo...',
              success: fund ? 'Fondo actualizado correctamente.' : 'Fondo creado correctamente.',
              error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar el fondo.'),
            }
          );
          await loadPettyCash();
        },
      },
    });
  };

  const openCategoryModal = (category = null) => {
    ModalManager.show({
      type: 'custom',
      title: category ? 'Editar categoria' : 'Nueva categoria',
      size: 'large',
      showFooter: false,
      contentComponent: CategoryFormModal,
      contentProps: {
        mode: category ? 'edit' : 'create',
        initialValues: category ? categoryToForm(category) : emptyCategoryForm,
        onSubmit: async (payload) => {
          await notifyPromise(
            category ? pettyCashAdminService.updateCategory(category.id, payload) : pettyCashAdminService.createCategory(payload),
            {
              loading: category ? 'Actualizando categoria...' : 'Creando categoria...',
              success: category ? 'Categoria actualizada correctamente.' : 'Categoria creada correctamente.',
              error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar la categoria.'),
            }
          );
          await loadPettyCash();
        },
      },
    });
  };

  const changeFundStatus = async (fund, status) => {
    setBusyId(`fund-${fund.id}`);
    try {
      await notifyPromise(
        pettyCashAdminService.updateFund(fund.id, { fund_status: status }),
        {
          loading: 'Actualizando estado...',
          success: 'Estado actualizado correctamente.',
          error: (requestError) => getBackendMessage(requestError, 'No fue posible cambiar el estado.'),
        }
      );
      await loadPettyCash();
    } finally {
      setBusyId(null);
    }
  };

  const deleteFund = async (fund) => {
    const confirmed = await ModalManager.confirm({ title: 'Eliminar fondo', message: `Esta accion cerrara y eliminara ${fund.fund_code} del mantenedor.`, buttons: { cancel: 'Cancelar', confirm: 'Eliminar' } });
    if (!confirmed) return;
    setBusyId(`fund-${fund.id}`);
    try {
      await notifyPromise(pettyCashAdminService.removeFund(fund.id), {
        loading: 'Eliminando fondo...',
        success: 'Fondo eliminado correctamente.',
        error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar el fondo.'),
      });
      await loadPettyCash();
    } finally {
      setBusyId(null);
    }
  };

  const toggleCategory = async (category) => {
    setBusyId(`category-${category.id}`);
    try {
      await notifyPromise(
        pettyCashAdminService.updateCategory(category.id, { is_active: !category.is_active }),
        {
          loading: 'Actualizando categoria...',
          success: 'Categoria actualizada correctamente.',
          error: (requestError) => getBackendMessage(requestError, 'No fue posible cambiar el estado.'),
        }
      );
      await loadPettyCash();
    } finally {
      setBusyId(null);
    }
  };

  const deleteCategory = async (category) => {
    const confirmed = await ModalManager.confirm({ title: 'Eliminar categoria', message: `Esta accion eliminara ${category.category_name} del mantenedor.`, buttons: { cancel: 'Cancelar', confirm: 'Eliminar' } });
    if (!confirmed) return;
    setBusyId(`category-${category.id}`);
    try {
      await notifyPromise(pettyCashAdminService.removeCategory(category.id), {
        loading: 'Eliminando categoria...',
        success: 'Categoria eliminada correctamente.',
        error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar la categoria.'),
      });
      await loadPettyCash();
    } finally {
      setBusyId(null);
    }
  };

  const filteredFunds = useMemo(() => {
    const term = search.trim().toLowerCase();
    return funds.filter((fund) => {
      const warehouse = warehousesById.get(Number(fund.warehouse_id));
      const responsible = usersById.get(Number(fund.responsible_user_id));
      const matchesStatus = filters.fundStatus === 'all' || fund.fund_status === filters.fundStatus;
      const matchesSearch = !term || [
        fund.fund_code,
        fund.warehouse_name,
        getWarehouseLabel(warehouse),
        fund.responsible_username,
        fund.responsible_name,
        getUserLabel(responsible),
      ].filter(Boolean).some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [filters.fundStatus, funds, search, usersById, warehousesById]);

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    return categories.filter((category) => {
      const matchesStatus = filters.categoryStatus === 'all'
        || (filters.categoryStatus === 'active' && category.is_active)
        || (filters.categoryStatus === 'inactive' && !category.is_active);
      const matchesEvidence = filters.evidence === 'all'
        || (filters.evidence === 'required' && category.requires_evidence)
        || (filters.evidence === 'not_required' && !category.requires_evidence);
      const matchesSearch = !term || [category.category_code, category.category_name, category.category_description].filter(Boolean).some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesEvidence && matchesSearch;
    });
  }, [categories, filters.categoryStatus, filters.evidence, search]);

  const activeData = activeTab === 'funds' ? filteredFunds : filteredCategories;
  const visibleData = useMemo(() => {
    const start = page * tablePageSize;
    return activeData.slice(start, start + tablePageSize);
  }, [activeData, page, tablePageSize]);

  const fundStats = useMemo(() => ({
    total: funds.length,
    active: funds.filter((fund) => fund.fund_status === 'ACTIVE').length,
    suspended: funds.filter((fund) => fund.fund_status === 'SUSPENDED').length,
    balance: funds.reduce((total, fund) => total + Number(fund.current_balance || 0), 0),
  }), [funds]);

  const categoryStats = useMemo(() => ({
    total: categories.length,
    active: categories.filter((category) => category.is_active).length,
    inactive: categories.filter((category) => !category.is_active).length,
    evidence: categories.filter((category) => category.requires_evidence).length,
  }), [categories]);

  const kpiItems = activeTab === 'funds'
    ? [
      { id: 'total', label: 'Fondos', value: fundStats.total, active: filters.fundStatus === 'all', onClick: () => setFilters((current) => ({ ...current, fundStatus: 'all' })) },
      { id: 'active', label: 'Activos', value: fundStats.active, active: filters.fundStatus === 'ACTIVE', onClick: () => setFilters((current) => ({ ...current, fundStatus: 'ACTIVE' })) },
      { id: 'suspended', label: 'Suspendidos', value: fundStats.suspended, active: filters.fundStatus === 'SUSPENDED', onClick: () => setFilters((current) => ({ ...current, fundStatus: 'SUSPENDED' })) },
      { id: 'balance', label: 'Saldo total', value: formatCurrency(fundStats.balance), disabled: true },
    ]
    : [
      { id: 'total', label: 'Categorias', value: categoryStats.total, active: filters.categoryStatus === 'all', onClick: () => setFilters((current) => ({ ...current, categoryStatus: 'all' })) },
      { id: 'active', label: 'Activas', value: categoryStats.active, active: filters.categoryStatus === 'active', onClick: () => setFilters((current) => ({ ...current, categoryStatus: 'active' })) },
      { id: 'inactive', label: 'Inactivas', value: categoryStats.inactive, active: filters.categoryStatus === 'inactive', onClick: () => setFilters((current) => ({ ...current, categoryStatus: 'inactive' })) },
      { id: 'evidence', label: 'Con comprobante', value: categoryStats.evidence, active: filters.evidence === 'required', onClick: () => setFilters((current) => ({ ...current, evidence: 'required' })) },
    ];

  const filterFields = activeTab === 'funds'
    ? [
      {
        id: 'fundStatus',
        value: filters.fundStatus,
        onChange: (value) => {
          setPage(0);
          setFilters((current) => ({ ...current, fundStatus: value }));
        },
        options: [{ value: 'all', label: 'Todos los estados' }, ...fundStatuses.map((status) => ({ value: status.value, label: status.label }))],
      },
    ]
    : [
      {
        id: 'categoryStatus',
        value: filters.categoryStatus,
        onChange: (value) => {
          setPage(0);
          setFilters((current) => ({ ...current, categoryStatus: value }));
        },
        options: [{ value: 'all', label: 'Todos los estados' }, { value: 'active', label: 'Activas' }, { value: 'inactive', label: 'Inactivas' }],
      },
      {
        id: 'evidence',
        value: filters.evidence,
        onChange: (value) => {
          setPage(0);
          setFilters((current) => ({ ...current, evidence: value }));
        },
        options: [{ value: 'all', label: 'Todo comprobante' }, { value: 'required', label: 'Requiere comprobante' }, { value: 'not_required', label: 'Sin comprobante' }],
      },
    ];

  const fundColumns = [
    { id: 'fund', label: 'Fondo', sortable: true, sortValue: (fund) => fund.fund_code, render: (fund) => <><div className="font-medium text-slate-950 dark:text-white">{fund.fund_code}</div><div className="text-xs text-slate-500">{getFundStatusLabel(fund.fund_status)}</div></> },
    { id: 'warehouse', label: 'Bodega', sortable: true, sortValue: (fund) => fund.warehouse_name || '', render: (fund) => <><div>{fund.warehouse_name || getWarehouseLabel(warehousesById.get(Number(fund.warehouse_id)))}</div><div className="font-mono text-xs text-slate-500">{fund.warehouse_code || warehousesById.get(Number(fund.warehouse_id))?.warehouse_code || ''}</div></> },
    { id: 'responsible', label: 'Responsable', sortable: true, sortValue: (fund) => fund.responsible_name || fund.responsible_username || '', render: (fund) => fund.responsible_name || fund.responsible_username || getUserLabel(usersById.get(Number(fund.responsible_user_id))) },
    { id: 'balance', label: 'Saldo', sortable: true, sortValue: (fund) => fund.current_balance, render: (fund) => <><div className="font-medium">{formatCurrency(fund.current_balance)}</div><div className="text-xs text-slate-500">Inicial {formatCurrency(fund.initial_amount)}</div></> },
    { id: 'activity', label: 'Movimientos', sortable: true, sortValue: (fund) => fund.total_expenses, render: (fund) => <><div>Gastos {formatCurrency(fund.total_expenses)}</div><div className="text-xs text-slate-500">Reposiciones {formatCurrency(fund.total_replenishments)}</div></> },
    { id: 'updated', label: 'Actualizado', sortable: true, sortValue: (fund) => fund.updated_at || '', render: (fund) => formatDateTime(fund.updated_at, timezone) },
    { id: 'actions', label: 'Acciones', align: 'right', render: (fund) => <div className="flex justify-end gap-2"><RowActionButton label="Editar fondo" icon={Pencil} disabled={busyId === `fund-${fund.id}`} onClick={() => openFundModal(fund)} /><RowActionButton label={fund.fund_status === 'ACTIVE' ? 'Suspender fondo' : 'Activar fondo'} icon={fund.fund_status === 'ACTIVE' ? EyeOff : ShieldCheck} disabled={busyId === `fund-${fund.id}`} variant={fund.fund_status === 'ACTIVE' ? 'danger' : 'neutral'} onClick={() => changeFundStatus(fund, fund.fund_status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')} /><RowActionButton label="Eliminar fondo" icon={Trash2} disabled={busyId === `fund-${fund.id}`} variant="danger" onClick={() => deleteFund(fund)} /></div> },
  ];

  const categoryColumns = [
    { id: 'category', label: 'Categoria', sortable: true, sortValue: (category) => category.category_name, render: (category) => <><div className="font-medium text-slate-950 dark:text-white">{category.category_name}</div><div className="font-mono text-xs text-slate-500">{category.category_code}</div></> },
    { id: 'description', label: 'Descripcion', cellClassName: 'text-slate-600 dark:text-slate-300', render: (category) => category.category_description || 'Sin descripcion' },
    { id: 'limit', label: 'Limite', sortable: true, sortValue: (category) => category.max_amount_per_expense || 0, render: (category) => category.max_amount_per_expense == null ? 'Sin limite' : formatCurrency(category.max_amount_per_expense) },
    { id: 'evidence', label: 'Comprobante', sortable: true, sortValue: (category) => category.requires_evidence, render: (category) => <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${category.requires_evidence ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}><ReceiptText className="h-3.5 w-3.5" />{category.requires_evidence ? 'Requerido' : 'Opcional'}</span> },
    { id: 'status', label: 'Estado', sortable: true, sortValue: (category) => category.is_active, render: (category) => <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${category.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{category.is_active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}{category.is_active ? 'Activa' : 'Inactiva'}</span> },
    { id: 'actions', label: 'Acciones', align: 'right', render: (category) => <div className="flex justify-end gap-2"><RowActionButton label="Editar categoria" icon={Pencil} disabled={busyId === `category-${category.id}`} onClick={() => openCategoryModal(category)} /><RowActionButton label={category.is_active ? 'Desactivar categoria' : 'Activar categoria'} icon={category.is_active ? EyeOff : ShieldCheck} disabled={busyId === `category-${category.id}`} variant={category.is_active ? 'danger' : 'neutral'} onClick={() => toggleCategory(category)} /><RowActionButton label="Eliminar categoria" icon={Trash2} disabled={busyId === `category-${category.id}`} variant="danger" onClick={() => deleteCategory(category)} /></div> },
  ];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Administracion de caja chica</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Configuracion de fondos, responsables y categorias de gasto menor.</p>
        </div>
        <ActionButton label={activeTab === 'funds' ? 'Nuevo fondo' : 'Nueva categoria'} icon={activeTab === 'funds' ? WalletCards : Tags} onClick={() => (activeTab === 'funds' ? openFundModal() : openCategoryModal())} />
      </div>

      <div className="mb-4 inline-flex rounded-md border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {[{ id: 'funds', label: 'Fondos', icon: WalletCards }, { id: 'categories', label: 'Categorias', icon: Tags }].map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <KpiBar items={kpiItems} className="mb-4" />

      <FilterBar
        className="mb-4"
        gridClassName={activeTab === 'funds' ? 'lg:grid-cols-[minmax(280px,1fr)_190px_auto_auto]' : 'lg:grid-cols-[minmax(280px,1fr)_180px_210px_auto_auto]'}
        searchValue={search}
        searchPlaceholder={activeTab === 'funds' ? 'Buscar fondo, bodega o responsable' : 'Buscar categoria o descripcion'}
        onSearchChange={setSearch}
        onSearchSubmit={() => setPage(0)}
        fields={filterFields}
        actions={<><button type="button" onClick={loadPettyCash} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refrescar</button><button type="button" onClick={() => { setSearch(''); setPage(0); setFilters({ fundStatus: 'all', categoryStatus: 'all', evidence: 'all' }); }} className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 px-3 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Limpiar</button></>}
      />

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}

      <DataTable
        columns={activeTab === 'funds' ? fundColumns : categoryColumns}
        data={visibleData}
        loading={loading}
        emptyMessage={activeTab === 'funds' ? 'No hay fondos para los filtros actuales.' : 'No hay categorias para los filtros actuales.'}
        footer={<DataTablePagination page={page} pageSize={tablePageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} total={activeData.length} hasMore={(page + 1) * tablePageSize < activeData.length} loading={loading} onPageChange={setPage} onPageSizeChange={(nextPageSize) => { setPage(0); setTablePageSize(nextPageSize); }} />}
      />
    </section>
  );
};

export default AdminPettyCash;
