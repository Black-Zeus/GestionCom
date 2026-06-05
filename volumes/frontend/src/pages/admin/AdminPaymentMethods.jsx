/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, EyeOff, Landmark, Pencil, RefreshCw, Trash2, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import DataTablePagination from '@/components/common/data/DataTablePagination';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import { paymentMethodsService } from '@/services/admin/paymentMethodsService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { PAGE_SIZE_OPTIONS, usePreferencesStore } from '@/store/usePreferencesStore';
import { formatDateTime } from '@/utils/dateTime';

const emptyPaymentMethodForm = {
  method_code: '',
  method_name: '',
  method_type: 'CASH',
  affects_cash_flow: true,
  requires_authorization: false,
  currency_code: 'CLP',
  allows_postdated: false,
  requires_bank_info: false,
  default_terms_days: '',
  is_active: true,
};

const methodTypeLabels = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};

const currencyOptions = [
  { value: 'CLP', label: 'CLP - $ - Peso chileno' },
  { value: 'USD', label: 'USD - US$ - Dolar estadounidense' },
  { value: 'EUR', label: 'EUR - EUR - Euro' },
  { value: 'ARS', label: 'ARS - $ - Peso argentino' },
  { value: 'BRL', label: 'BRL - R$ - Real brasileno' },
  { value: 'PEN', label: 'PEN - S/ - Sol peruano' },
  { value: 'COP', label: 'COP - $ - Peso colombiano' },
  { value: 'MXN', label: 'MXN - $ - Peso mexicano' },
  { value: 'UYU', label: 'UYU - $U - Peso uruguayo' },
  { value: 'BOB', label: 'BOB - Bs - Boliviano' },
  { value: 'PYG', label: 'PYG - Gs - Guarani paraguayo' },
  { value: 'GBP', label: 'GBP - GBP - Libra esterlina' },
  { value: 'CAD', label: 'CAD - C$ - Dolar canadiense' },
  { value: 'AUD', label: 'AUD - A$ - Dolar australiano' },
  { value: 'CHF', label: 'CHF - CHF - Franco suizo' },
  { value: 'JPY', label: 'JPY - JPY - Yen japones' },
  { value: 'CNY', label: 'CNY - CNY - Yuan chino' },
];

const currencyMeta = currencyOptions.reduce((accumulator, currency) => {
  const [code, symbol, name] = currency.label.split(' - ');
  accumulator[currency.value] = { code, symbol, name };
  return accumulator;
}, {});

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const selectClassName = `${fieldClassName} bg-white dark:bg-slate-950`;

const paymentMethodToForm = (method) => ({
  method_code: method.method_code || '',
  method_name: method.method_name || '',
  method_type: method.method_type || 'CASH',
  affects_cash_flow: method.affects_cash_flow !== false,
  requires_authorization: method.requires_authorization === true,
  currency_code: method.currency_code || 'CLP',
  allows_postdated: method.allows_postdated === true,
  requires_bank_info: method.requires_bank_info === true,
  default_terms_days: method.default_terms_days ?? '',
  is_active: method.is_active !== false,
});

const toPaymentMethodPayload = (form) => ({
  method_name: form.method_name.trim(),
  method_type: form.method_type,
  affects_cash_flow: Boolean(form.affects_cash_flow),
  requires_authorization: Boolean(form.requires_authorization),
  currency_code: form.currency_code || 'CLP',
  allows_postdated: Boolean(form.allows_postdated),
  requires_bank_info: Boolean(form.requires_bank_info),
  default_terms_days: form.default_terms_days === '' ? null : Number(form.default_terms_days),
  is_active: Boolean(form.is_active),
});

const PaymentMethodFormModal = ({ mode = 'create', initialValues = emptyPaymentMethodForm, onSubmit, onClose }) => {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const isEdit = mode === 'edit';

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (form.default_terms_days !== '' && Number(form.default_terms_days) < 0) {
      setFormError('Los dias de plazo no pueden ser negativos.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(toPaymentMethodPayload(form));
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-950 dark:text-white">{isEdit ? 'Metodo de pago' : 'Nuevo metodo de pago'}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">El codigo lo administra el backend y queda solo lectura.</div>
          </div>
          <label className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <input type="checkbox" checked={form.is_active} onChange={(event) => updateField('is_active', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Activo
          </label>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {isEdit && (
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Codigo</span>
            <input className={`${fieldClassName} font-mono uppercase disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-900`} value={form.method_code} disabled readOnly />
          </label>
        )}
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Nombre</span>
          <input className={fieldClassName} value={form.method_name} onChange={(event) => updateField('method_name', event.target.value)} minLength={3} required />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Tipo</span>
          <select className={selectClassName} value={form.method_type} onChange={(event) => updateField('method_type', event.target.value)} required>
            {Object.entries(methodTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Moneda</span>
          <select className={selectClassName} value={form.currency_code} onChange={(event) => updateField('currency_code', event.target.value)} required>
            {currencyOptions.map((currency) => <option key={currency.value} value={currency.value}>{currency.label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Dias plazo defecto</span>
          <input className={fieldClassName} type="number" min="0" step="1" value={form.default_terms_days} onChange={(event) => updateField('default_terms_days', event.target.value)} />
        </label>
        <div className="grid gap-2 md:col-span-2 md:grid-cols-2">
          {[
            ['affects_cash_flow', 'Afecta flujo de caja'],
            ['requires_authorization', 'Requiere autorizacion'],
            ['requires_bank_info', 'Requiere datos bancarios'],
            ['allows_postdated', 'Permite fecha futura'],
          ].map(([field, label]) => (
            <label key={field} className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
              <input type="checkbox" checked={form[field]} onChange={(event) => updateField(field, event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              {label}
            </label>
          ))}
        </div>
      </div>

      {formError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{formError}</div>}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
        <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{saving ? 'Guardando...' : 'Guardar metodo'}</button>
      </div>
    </form>
  );
};

const AdminPaymentMethods = () => {
  const [methods, setMethods] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: 'all', type: 'all' });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyMethodId, setBusyMethodId] = useState(null);
  const [error, setError] = useState('');
  const tablePageSize = usePreferencesStore((state) => state.tablePageSize);
  const setTablePageSize = usePreferencesStore((state) => state.setTablePageSize);
  const timezone = usePreferencesStore((state) => state.timezone);

  const stats = useMemo(() => {
    const total = methods.length;
    const active = methods.filter((method) => method.is_active).length;
    const cash = methods.filter((method) => method.method_type === 'CASH').length;
    const electronic = methods.filter((method) => ['CARD', 'TRANSFER'].includes(method.method_type)).length;
    return { total, active, inactive: total - active, cash, electronic };
  }, [methods]);

  const filteredMethods = useMemo(() => {
    const term = search.trim().toLowerCase();
    return methods.filter((method) => {
      const matchesStatus = filters.status === 'all' || (filters.status === 'active' && method.is_active) || (filters.status === 'inactive' && !method.is_active);
      const matchesType = filters.type === 'all' || method.method_type === filters.type;
      const matchesSearch = !term || [method.method_code, method.method_name, method.currency_code, methodTypeLabels[method.method_type]].filter(Boolean).some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [filters.status, filters.type, methods, search]);

  const visibleMethods = useMemo(() => {
    const start = page * tablePageSize;
    return filteredMethods.slice(start, start + tablePageSize);
  }, [filteredMethods, page, tablePageSize]);

  const setFilter = (field, value) => {
    setPage(0);
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const loadMethods = async () => {
    setLoading(true);
    setError('');
    try {
      setMethods(await paymentMethodsService.list({ active_only: false, limit: 1000 }));
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar metodos de pago.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMethods();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const openCreateModal = () => {
    ModalManager.show({
      type: 'custom',
      title: 'Nuevo metodo de pago',
      size: 'large',
      showFooter: false,
      contentComponent: PaymentMethodFormModal,
      contentProps: {
        mode: 'create',
        initialValues: emptyPaymentMethodForm,
        onSubmit: async (payload) => {
          await notifyPromise(paymentMethodsService.create(payload), {
            loading: 'Creando metodo de pago...',
            success: 'Metodo de pago creado correctamente.',
            error: (requestError) => getBackendMessage(requestError, 'No fue posible crear el metodo.'),
          });
          await loadMethods();
        },
      },
    });
  };

  const openEditModal = (method) => {
    ModalManager.show({
      type: 'custom',
      title: 'Editar metodo de pago',
      size: 'large',
      showFooter: false,
      contentComponent: PaymentMethodFormModal,
      contentProps: {
        mode: 'edit',
        initialValues: paymentMethodToForm(method),
        onSubmit: async (payload) => {
          await notifyPromise(paymentMethodsService.update(method.id, payload), {
            loading: 'Actualizando metodo de pago...',
            success: 'Metodo de pago actualizado correctamente.',
            error: (requestError) => getBackendMessage(requestError, 'No fue posible actualizar el metodo.'),
          });
          await loadMethods();
        },
      },
    });
  };

  const toggleMethod = async (method) => {
    const nextState = !method.is_active;
    const confirmed = await ModalManager.confirm({
      title: `${nextState ? 'Activar' : 'Desactivar'} metodo`,
      message: `Confirma que deseas ${nextState ? 'activar' : 'desactivar'} ${method.method_name}.`,
      buttons: { cancel: 'Cancelar', confirm: nextState ? 'Activar' : 'Desactivar' },
    });
    if (!confirmed) return;
    setBusyMethodId(method.id);
    try {
      await notifyPromise(paymentMethodsService.changeActivation(method, nextState), {
        loading: `${nextState ? 'Activando' : 'Desactivando'} metodo...`,
        success: `Metodo ${nextState ? 'activado' : 'desactivado'}.`,
        error: (requestError) => getBackendMessage(requestError, 'No fue posible cambiar el estado.'),
      });
      await loadMethods();
    } finally {
      setBusyMethodId(null);
    }
  };

  const removeMethod = async (method) => {
    const confirmed = await ModalManager.confirm({
      title: 'Eliminar metodo de pago',
      message: `Esta accion eliminara ${method.method_name} del mantenedor. Los documentos historicos mantienen sus referencias.`,
      buttons: { cancel: 'Cancelar', confirm: 'Eliminar' },
    });
    if (!confirmed) return;
    setBusyMethodId(method.id);
    try {
      await notifyPromise(paymentMethodsService.remove(method.id), {
        loading: 'Eliminando metodo...',
        success: 'Metodo eliminado correctamente.',
        error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar el metodo.'),
      });
      await loadMethods();
    } finally {
      setBusyMethodId(null);
    }
  };

  const kpiItems = [
    { id: 'total', label: 'Total', value: stats.total, active: filters.status === 'all' && filters.type === 'all', onClick: () => { setPage(0); setFilters({ status: 'all', type: 'all' }); } },
    { id: 'active', label: 'Activos', value: stats.active, active: filters.status === 'active', onClick: () => setFilter('status', 'active') },
    { id: 'inactive', label: 'Inactivos', value: stats.inactive, active: filters.status === 'inactive', onClick: () => setFilter('status', 'inactive') },
    { id: 'electronic', label: 'Electronicos', value: stats.electronic, hint: `${stats.cash} efectivo`, active: ['CARD', 'TRANSFER'].includes(filters.type), onClick: () => setFilter('type', 'CARD') },
  ];

  const filterFields = [
    { id: 'status', value: filters.status, onChange: (value) => setFilter('status', value), options: [{ value: 'all', label: 'Todos los estados' }, { value: 'active', label: 'Activos' }, { value: 'inactive', label: 'Inactivos' }] },
    { id: 'type', value: filters.type, onChange: (value) => setFilter('type', value), options: [{ value: 'all', label: 'Todos los tipos' }, ...Object.entries(methodTypeLabels).map(([value, label]) => ({ value, label }))] },
  ];

  const columns = [
    { id: 'method', label: 'Metodo', sortable: true, sortValue: (method) => method.method_name, render: (method) => <><div className="font-medium text-slate-950 dark:text-white">{method.method_name}</div><div className="font-mono text-xs text-slate-500">{method.method_code}</div></> },
    { id: 'type', label: 'Tipo', sortable: true, sortValue: (method) => method.method_type, render: (method) => <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"><CreditCard className="h-3.5 w-3.5" />{methodTypeLabels[method.method_type] || method.method_type}</span> },
    { id: 'rules', label: 'Reglas', render: (method) => <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300"><div>{method.affects_cash_flow ? 'Afecta caja' : 'No afecta caja'}</div><div>{method.requires_authorization ? 'Con autorizacion' : 'Sin autorizacion'}</div><div>{method.requires_bank_info ? 'Datos bancarios' : 'Sin datos bancarios'}</div></div> },
    { id: 'terms', label: 'Plazo', sortable: true, sortValue: (method) => method.default_terms_days || 0, render: (method) => <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300"><Landmark className="h-3.5 w-3.5 text-slate-400" />{method.default_terms_days ? `${method.default_terms_days} dias` : 'Inmediato'}</div> },
    {
      id: 'currency',
      label: 'Moneda',
      sortable: true,
      sortValue: (method) => method.currency_code,
      render: (method) => {
        const currency = currencyMeta[method.currency_code] || { code: method.currency_code, symbol: method.currency_code, name: '' };
        return (
          <div className="space-y-0.5">
            <div className="font-medium text-slate-700 dark:text-slate-200">{currency.symbol} {currency.code}</div>
            {currency.name && <div className="text-xs text-slate-500">{currency.name}</div>}
          </div>
        );
      },
    },
    { id: 'status', label: 'Estado', sortable: true, sortValue: (method) => method.is_active, render: (method) => <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${method.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{method.is_active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}{method.is_active ? 'Activo' : 'Inactivo'}</span> },
    { id: 'updated', label: 'Actualizado', sortable: true, sortValue: (method) => method.updated_at || '', render: (method) => formatDateTime(method.updated_at, timezone) },
    { id: 'actions', label: 'Acciones', align: 'right', render: (method) => <div className="flex justify-end gap-2"><RowActionButton label="Editar metodo" icon={Pencil} disabled={busyMethodId === method.id} onClick={() => openEditModal(method)} /><RowActionButton label={method.is_active ? 'Desactivar metodo' : 'Activar metodo'} icon={method.is_active ? EyeOff : CheckCircle2} disabled={busyMethodId === method.id} variant={method.is_active ? 'danger' : 'neutral'} onClick={() => toggleMethod(method)} /><RowActionButton label="Eliminar metodo" icon={Trash2} disabled={busyMethodId === method.id} variant="danger" onClick={() => removeMethod(method)} /></div> },
  ];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Metodos de pago</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Mantenedor de medios de pago para caja, ventas y documentos.</p>
        </div>
        <ActionButton label="Nuevo" onClick={openCreateModal} />
      </div>

      <KpiBar items={kpiItems} className="mb-4" />

      <FilterBar className="mb-4" gridClassName="lg:grid-cols-[minmax(280px,1fr)_180px_180px_auto_auto]" searchValue={search} searchPlaceholder="Buscar metodo, codigo o moneda" onSearchChange={setSearch} onSearchSubmit={() => setPage(0)} fields={filterFields} actions={<><ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={loadMethods} className={loading ? '[&>svg]:animate-spin' : ''} /><ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={() => { setSearch(''); setPage(0); setFilters({ status: 'all', type: 'all' }); }} /></>} />

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}

      <DataTable columns={columns} data={visibleMethods} loading={loading} emptyMessage="No hay metodos de pago para mostrar." footer={<DataTablePagination page={page} pageSize={tablePageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} total={filteredMethods.length} hasMore={(page + 1) * tablePageSize < filteredMethods.length} loading={loading} onPageChange={setPage} onPageSizeChange={(size) => { setTablePageSize(size); setPage(0); }} />} />
    </section>
  );
};

export default AdminPaymentMethods;
