/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, EyeOff, MapPin, Pencil, RefreshCw, ShieldCheck, Trash2, Wifi, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import DataTablePagination from '@/components/common/data/DataTablePagination';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import { cashRegistersService } from '@/services/admin/cashRegistersService';
import { warehousesService } from '@/services/admin/warehousesService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { PAGE_SIZE_OPTIONS, usePreferencesStore } from '@/store/usePreferencesStore';
import { formatDateTime } from '@/utils/dateTime';

const emptyCashRegisterForm = {
  register_code: '',
  register_name: '',
  warehouse_id: '',
  terminal_identifier: '',
  ip_address: '',
  location_description: '',
  is_active: true,
  requires_supervisor_approval: true,
  max_difference_amount: '1000',
};

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const selectClassName = `${fieldClassName} bg-white dark:bg-slate-950`;

const getWarehouseLabel = (warehouse) => (
  warehouse
    ? `${warehouse.warehouse_code} - ${warehouse.warehouse_name}`
    : 'Sin bodega'
);

const cashRegisterToForm = (cashRegister) => ({
  register_code: cashRegister.register_code || '',
  register_name: cashRegister.register_name || '',
  warehouse_id: cashRegister.warehouse_id ? String(cashRegister.warehouse_id) : '',
  terminal_identifier: cashRegister.terminal_identifier || '',
  ip_address: cashRegister.ip_address || '',
  location_description: cashRegister.location_description || '',
  is_active: cashRegister.is_active !== false,
  requires_supervisor_approval: cashRegister.requires_supervisor_approval !== false,
  max_difference_amount: String(cashRegister.max_difference_amount ?? '0'),
});

const toCashRegisterPayload = (form, mode) => {
  const payload = {
    register_name: form.register_name.trim(),
    warehouse_id: Number(form.warehouse_id),
    terminal_identifier: form.terminal_identifier.trim() || null,
    ip_address: form.ip_address.trim() || null,
    location_description: form.location_description.trim() || null,
    is_active: Boolean(form.is_active),
    requires_supervisor_approval: Boolean(form.requires_supervisor_approval),
    max_difference_amount: Number(form.max_difference_amount || 0),
  };

  if (mode === 'create') {
    payload.register_code = form.register_code.trim().toUpperCase();
  }

  return payload;
};

const formatCurrency = (value) => new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const CashRegisterFormModal = ({ mode = 'create', initialValues = emptyCashRegisterForm, warehouseOptions = [], onSubmit, onClose }) => {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const isEdit = mode === 'edit';

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!form.warehouse_id) {
      setFormError('Debes seleccionar la bodega o tienda asociada.');
      return;
    }

    if (!isEdit && !/^[A-Z0-9_-]{2,20}$/.test(form.register_code.trim().toUpperCase())) {
      setFormError('El codigo debe usar 2 a 20 caracteres: letras, numeros, guion o guion bajo.');
      return;
    }

    if (Number(form.max_difference_amount || 0) < 0) {
      setFormError('La diferencia maxima no puede ser negativa.');
      return;
    }

    setSaving(true);

    try {
      await onSubmit(toCashRegisterPayload(form, mode));
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
            <div className="text-sm font-semibold text-slate-950 dark:text-white">{isEdit ? 'Configuracion de caja' : 'Nueva caja POS'}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Define terminal, ubicacion operativa y reglas de supervisor para diferencias de cierre.
            </div>
          </div>
          <label className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => updateField('is_active', event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Activa
          </label>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Codigo</span>
          <input
            className={`${fieldClassName} font-mono uppercase disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-900`}
            value={form.register_code}
            onChange={(event) => updateField('register_code', event.target.value.toUpperCase())}
            placeholder="CAJA01_CENTRO"
            disabled={isEdit}
            required
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Nombre</span>
          <input className={fieldClassName} value={form.register_name} onChange={(event) => updateField('register_name', event.target.value)} minLength={3} required />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Bodega / tienda</span>
          <select className={selectClassName} value={form.warehouse_id} onChange={(event) => updateField('warehouse_id', event.target.value)} required>
            <option value="">Selecciona bodega</option>
            {warehouseOptions.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>{getWarehouseLabel(warehouse)}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Terminal</span>
          <input className={fieldClassName} value={form.terminal_identifier} onChange={(event) => updateField('terminal_identifier', event.target.value)} maxLength={100} placeholder="TERMINAL-001" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">IP</span>
          <input className={fieldClassName} value={form.ip_address} onChange={(event) => updateField('ip_address', event.target.value)} maxLength={45} placeholder="192.168.1.101" />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Ubicacion fisica</span>
          <input className={fieldClassName} value={form.location_description} onChange={(event) => updateField('location_description', event.target.value)} maxLength={255} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Diferencia maxima sin supervisor</span>
          <input className={fieldClassName} type="number" min="0" step="1" value={form.max_difference_amount} onChange={(event) => updateField('max_difference_amount', event.target.value)} required />
        </label>
        <label className="flex h-11 items-center gap-2 self-end rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
          <input
            type="checkbox"
            checked={form.requires_supervisor_approval}
            onChange={(event) => updateField('requires_supervisor_approval', event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Requiere supervisor ante diferencias
        </label>
      </div>

      {formError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {formError}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
          {saving ? 'Guardando...' : 'Guardar caja'}
        </button>
      </div>
    </form>
  );
};

const AdminCashPos = () => {
  const [cashRegisters, setCashRegisters] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: 'all', warehouseId: 'all', supervisor: 'all' });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyCashRegisterId, setBusyCashRegisterId] = useState(null);
  const [error, setError] = useState('');
  const tablePageSize = usePreferencesStore((state) => state.tablePageSize);
  const setTablePageSize = usePreferencesStore((state) => state.setTablePageSize);
  const timezone = usePreferencesStore((state) => state.timezone);

  const warehousesById = useMemo(() => {
    const map = new Map();
    warehouses.forEach((warehouse) => map.set(Number(warehouse.id), warehouse));
    return map;
  }, [warehouses]);

  const stats = useMemo(() => {
    const total = cashRegisters.length;
    const active = cashRegisters.filter((cashRegister) => cashRegister.is_active).length;
    const supervisor = cashRegisters.filter((cashRegister) => cashRegister.requires_supervisor_approval).length;
    const configuredTerminal = cashRegisters.filter((cashRegister) => cashRegister.terminal_identifier).length;
    return { total, active, inactive: total - active, supervisor, configuredTerminal };
  }, [cashRegisters]);

  const filteredCashRegisters = useMemo(() => {
    const term = search.trim().toLowerCase();

    return cashRegisters.filter((cashRegister) => {
      const warehouse = warehousesById.get(Number(cashRegister.warehouse_id));
      const warehouseLabel = cashRegister.warehouse_name || getWarehouseLabel(warehouse);
      const matchesStatus = filters.status === 'all'
        || (filters.status === 'active' && cashRegister.is_active)
        || (filters.status === 'inactive' && !cashRegister.is_active);
      const matchesWarehouse = filters.warehouseId === 'all' || Number(filters.warehouseId) === Number(cashRegister.warehouse_id);
      const matchesSupervisor = filters.supervisor === 'all'
        || (filters.supervisor === 'required' && cashRegister.requires_supervisor_approval)
        || (filters.supervisor === 'not_required' && !cashRegister.requires_supervisor_approval);
      const matchesSearch = !term || [
        cashRegister.register_code,
        cashRegister.register_name,
        cashRegister.terminal_identifier,
        cashRegister.ip_address,
        cashRegister.location_description,
        warehouseLabel,
      ].filter(Boolean).some((value) => value.toLowerCase().includes(term));

      return matchesStatus && matchesWarehouse && matchesSupervisor && matchesSearch;
    });
  }, [cashRegisters, filters.status, filters.supervisor, filters.warehouseId, search, warehousesById]);

  const visibleCashRegisters = useMemo(() => {
    const start = page * tablePageSize;
    return filteredCashRegisters.slice(start, start + tablePageSize);
  }, [filteredCashRegisters, page, tablePageSize]);

  const setFilter = (field, value) => {
    setPage(0);
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const loadWarehouses = async () => {
    try {
      const data = await warehousesService.list({ active_only: true, limit: 1000 });
      setWarehouses(data);
    } catch {
      setWarehouses([]);
    }
  };

  const loadCashRegisters = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await cashRegistersService.list({ active_only: false, limit: 1000 });
      setCashRegisters(data);
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar cajas POS.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCashRegisters();
    loadWarehouses();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const openCreateModal = () => {
    ModalManager.show({
      type: 'custom',
      title: 'Nueva caja POS',
      size: 'large',
      showFooter: false,
      contentComponent: CashRegisterFormModal,
      contentProps: {
        mode: 'create',
        initialValues: emptyCashRegisterForm,
        warehouseOptions: warehouses,
        onSubmit: async (payload) => {
          await notifyPromise(
            cashRegistersService.create(payload),
            {
              loading: 'Creando caja POS...',
              success: 'Caja POS creada correctamente.',
              error: (requestError) => getBackendMessage(requestError, 'No fue posible crear la caja POS.'),
            }
          );
          await loadCashRegisters();
        },
      },
    });
  };

  const openEditModal = (cashRegister) => {
    ModalManager.show({
      type: 'custom',
      title: 'Editar caja POS',
      size: 'large',
      showFooter: false,
      contentComponent: CashRegisterFormModal,
      contentProps: {
        mode: 'edit',
        initialValues: cashRegisterToForm(cashRegister),
        warehouseOptions: warehouses,
        onSubmit: async (payload) => {
          await notifyPromise(
            cashRegistersService.update(cashRegister.id, payload),
            {
              loading: 'Actualizando caja POS...',
              success: 'Caja POS actualizada correctamente.',
              error: (requestError) => getBackendMessage(requestError, 'No fue posible actualizar la caja POS.'),
            }
          );
          await loadCashRegisters();
        },
      },
    });
  };

  const toggleCashRegister = async (cashRegister) => {
    const nextState = !cashRegister.is_active;
    const confirmed = await ModalManager.confirm({
      title: `${nextState ? 'Activar' : 'Desactivar'} caja POS`,
      message: `Confirma que deseas ${nextState ? 'activar' : 'desactivar'} ${cashRegister.register_name}.`,
      buttons: {
        cancel: 'Cancelar',
        confirm: nextState ? 'Activar' : 'Desactivar',
      },
    });

    if (!confirmed) return;

    setBusyCashRegisterId(cashRegister.id);

    try {
      await notifyPromise(
        cashRegistersService.changeActivation(cashRegister, nextState),
        {
          loading: `${nextState ? 'Activando' : 'Desactivando'} caja POS...`,
          success: `Caja POS ${nextState ? 'activada' : 'desactivada'}.`,
          error: (requestError) => getBackendMessage(requestError, 'No fue posible cambiar el estado.'),
        }
      );
      await loadCashRegisters();
    } finally {
      setBusyCashRegisterId(null);
    }
  };

  const removeCashRegister = async (cashRegister) => {
    const confirmed = await ModalManager.confirm({
      title: 'Eliminar caja POS',
      message: `Esta accion eliminara ${cashRegister.register_name} del mantenedor. No se borran sesiones historicas asociadas.`,
      buttons: {
        cancel: 'Cancelar',
        confirm: 'Eliminar',
      },
    });

    if (!confirmed) return;

    setBusyCashRegisterId(cashRegister.id);

    try {
      await notifyPromise(
        cashRegistersService.remove(cashRegister.id),
        {
          loading: 'Eliminando caja POS...',
          success: 'Caja POS eliminada correctamente.',
          error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar la caja POS.'),
        }
      );
      await loadCashRegisters();
    } finally {
      setBusyCashRegisterId(null);
    }
  };

  const kpiItems = [
    {
      id: 'total',
      label: 'Total',
      value: stats.total,
      active: filters.status === 'all' && filters.supervisor === 'all',
      onClick: () => {
        setPage(0);
        setFilters({ status: 'all', warehouseId: 'all', supervisor: 'all' });
      },
    },
    {
      id: 'active',
      label: 'Activas',
      value: stats.active,
      active: filters.status === 'active',
      onClick: () => setFilter('status', 'active'),
    },
    {
      id: 'inactive',
      label: 'Inactivas',
      value: stats.inactive,
      active: filters.status === 'inactive',
      onClick: () => setFilter('status', 'inactive'),
    },
    {
      id: 'supervisor',
      label: 'Con supervisor',
      value: stats.supervisor,
      hint: `${stats.configuredTerminal} con terminal`,
      active: filters.supervisor === 'required',
      onClick: () => setFilter('supervisor', 'required'),
    },
  ];

  const filterFields = [
    {
      id: 'status',
      value: filters.status,
      onChange: (value) => setFilter('status', value),
      options: [
        { value: 'all', label: 'Todos los estados' },
        { value: 'active', label: 'Activas' },
        { value: 'inactive', label: 'Inactivas' },
      ],
    },
    {
      id: 'warehouseId',
      value: filters.warehouseId,
      onChange: (value) => setFilter('warehouseId', value),
      options: [
        { value: 'all', label: 'Todas las bodegas' },
        ...warehouses.map((warehouse) => ({ value: String(warehouse.id), label: getWarehouseLabel(warehouse) })),
      ],
    },
    {
      id: 'supervisor',
      value: filters.supervisor,
      onChange: (value) => setFilter('supervisor', value),
      options: [
        { value: 'all', label: 'Toda aprobacion' },
        { value: 'required', label: 'Requiere supervisor' },
        { value: 'not_required', label: 'Sin supervisor' },
      ],
    },
  ];

  const cashRegisterColumns = [
    {
      id: 'register',
      label: 'Caja POS',
      sortable: true,
      sortValue: (cashRegister) => cashRegister.register_name,
      render: (cashRegister) => (
        <>
          <div className="font-medium text-slate-950 dark:text-white">{cashRegister.register_name}</div>
          <div className="font-mono text-xs text-slate-500">{cashRegister.register_code}</div>
        </>
      ),
    },
    {
      id: 'warehouse',
      label: 'Bodega',
      sortable: true,
      sortValue: (cashRegister) => cashRegister.warehouse_name || '',
      render: (cashRegister) => (
        <>
          <div>{cashRegister.warehouse_name || getWarehouseLabel(warehousesById.get(Number(cashRegister.warehouse_id)))}</div>
          <div className="font-mono text-xs text-slate-500">{cashRegister.warehouse_code || warehousesById.get(Number(cashRegister.warehouse_id))?.warehouse_code || ''}</div>
        </>
      ),
    },
    {
      id: 'terminal',
      label: 'Terminal',
      sortable: true,
      sortValue: (cashRegister) => cashRegister.terminal_identifier || '',
      render: (cashRegister) => (
        <div className="space-y-1 text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-slate-400" />
            <span>{cashRegister.terminal_identifier || 'Sin terminal'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Wifi className="h-3.5 w-3.5" />
            <span>{cashRegister.ip_address || 'Sin IP'}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'location',
      label: 'Ubicacion',
      sortable: true,
      sortValue: (cashRegister) => cashRegister.location_description || '',
      render: (cashRegister) => (
        <div className="flex max-w-xs items-start gap-1.5 text-slate-600 dark:text-slate-300">
          <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none text-slate-400" />
          <span>{cashRegister.location_description || 'Sin ubicacion'}</span>
        </div>
      ),
    },
    {
      id: 'approval',
      label: 'Aprobacion',
      sortable: true,
      sortValue: (cashRegister) => cashRegister.requires_supervisor_approval,
      render: (cashRegister) => (
        <div className="space-y-1">
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${cashRegister.requires_supervisor_approval ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
            <ShieldCheck className="h-3.5 w-3.5" />
            {cashRegister.requires_supervisor_approval ? 'Supervisor' : 'No requerida'}
          </span>
          <div className="text-xs text-slate-500">{formatCurrency(cashRegister.max_difference_amount)}</div>
        </div>
      ),
    },
    {
      id: 'status',
      label: 'Estado',
      sortable: true,
      sortValue: (cashRegister) => cashRegister.is_active,
      render: (cashRegister) => (
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${cashRegister.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
          {cashRegister.is_active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {cashRegister.is_active ? 'Activa' : 'Inactiva'}
        </span>
      ),
    },
    {
      id: 'updated',
      label: 'Actualizada',
      sortable: true,
      sortValue: (cashRegister) => cashRegister.updated_at || '',
      render: (cashRegister) => formatDateTime(cashRegister.updated_at, timezone),
    },
    {
      id: 'actions',
      label: 'Acciones',
      align: 'right',
      render: (cashRegister) => (
        <div className="flex justify-end gap-2">
          <RowActionButton label="Editar caja POS" icon={Pencil} disabled={busyCashRegisterId === cashRegister.id} onClick={() => openEditModal(cashRegister)} />
          <RowActionButton label={cashRegister.is_active ? 'Desactivar caja POS' : 'Activar caja POS'} icon={cashRegister.is_active ? EyeOff : ShieldCheck} disabled={busyCashRegisterId === cashRegister.id} variant={cashRegister.is_active ? 'danger' : 'neutral'} onClick={() => toggleCashRegister(cashRegister)} />
          <RowActionButton label="Eliminar caja POS" icon={Trash2} disabled={busyCashRegisterId === cashRegister.id} variant="danger" onClick={() => removeCashRegister(cashRegister)} />
        </div>
      ),
    },
  ];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Configuracion de caja POS</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Mantenedor de terminales, ubicaciones y reglas de aprobacion de cajas.
          </p>
        </div>
        <ActionButton label="Nueva" onClick={openCreateModal} />
      </div>

      <KpiBar items={kpiItems} className="mb-4" />

      <FilterBar
        className="mb-4"
        gridClassName="lg:grid-cols-[minmax(280px,1fr)_170px_230px_190px_auto_auto]"
        searchValue={search}
        searchPlaceholder="Buscar caja, terminal, IP o bodega"
        onSearchChange={setSearch}
        onSearchSubmit={() => setPage(0)}
        fields={filterFields}
        actions={(
          <>
            <button
              type="button"
              onClick={loadCashRegisters}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refrescar
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(0);
                setFilters({ status: 'all', warehouseId: 'all', supervisor: 'all' });
              }}
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 px-3 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Limpiar
            </button>
          </>
        )}
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <DataTable
        columns={cashRegisterColumns}
        data={visibleCashRegisters}
        loading={loading}
        emptyMessage="No hay cajas POS para los filtros actuales."
        footer={(
          <DataTablePagination
            page={page}
            pageSize={tablePageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            total={filteredCashRegisters.length}
            hasMore={(page + 1) * tablePageSize < filteredCashRegisters.length}
            loading={loading}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPage(0);
              setTablePageSize(nextPageSize);
            }}
          />
        )}
      />
    </section>
  );
};

export default AdminCashPos;
