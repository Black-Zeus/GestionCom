/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, CheckCircle2, EyeOff, MapPin, Pencil, RefreshCw, Trash2, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import DataTablePagination from '@/components/common/data/DataTablePagination';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import StatusBadge from '@/components/common/data/StatusBadge';
import { usersService } from '@/services/admin/usersService';
import { warehousesService } from '@/services/admin/warehousesService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { PAGE_SIZE_OPTIONS, usePreferencesStore } from '@/store/usePreferencesStore';
import { normalizePhoneForStorage } from '@/utils/phone';

const warehouseTypes = [
  { value: 'WAREHOUSE', label: 'Bodega' },
  { value: 'STORE', label: 'Tienda' },
  { value: 'OUTLET', label: 'Outlet' },
];

const emptyWarehouseForm = {
  warehouse_code: '',
  warehouse_name: '',
  warehouse_type: 'WAREHOUSE',
  responsible_user_id: '',
  address: '',
  city: '',
  country: 'Chile',
  phone: '',
  email: '',
  is_active: true,
};

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const selectClassName = `${fieldClassName} bg-white dark:bg-slate-950`;

const getTypeLabel = (type) => warehouseTypes.find((item) => item.value === type)?.label || type || 'Bodega';

const getUserLabel = (user) => (
  user?.display_name
  || `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
  || user?.username
  || user?.email
  || 'Usuario'
);

const warehouseToForm = (warehouse) => ({
  warehouse_code: warehouse.warehouse_code || '',
  warehouse_name: warehouse.warehouse_name || '',
  warehouse_type: warehouse.warehouse_type || 'WAREHOUSE',
  responsible_user_id: warehouse.responsible_user_id ? String(warehouse.responsible_user_id) : '',
  address: warehouse.address || '',
  city: warehouse.city || '',
  country: warehouse.country || 'Chile',
  phone: warehouse.phone || '',
  email: warehouse.email || '',
  is_active: warehouse.is_active !== false,
});

const toWarehousePayload = (form) => {
  const payload = {
    warehouse_name: form.warehouse_name.trim(),
    warehouse_type: form.warehouse_type,
    responsible_user_id: Number(form.responsible_user_id),
    address: form.address.trim(),
    city: form.city.trim(),
    country: form.country.trim(),
    phone: form.phone ? normalizePhoneForStorage(form.phone) : '',
    email: form.email.trim(),
    is_active: Boolean(form.is_active),
  };

  return payload;
};

const WarehouseFormModal = ({ mode = 'create', initialValues = emptyWarehouseForm, userOptions = [], onSubmit, onClose }) => {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const isEdit = mode === 'edit';

  const activeUserOptions = useMemo(
    () => userOptions.filter((user) => user.is_active !== false),
    [userOptions]
  );

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!form.responsible_user_id) {
      setFormError('Debes seleccionar un usuario responsable.');
      return;
    }

    setSaving(true);

    try {
      await onSubmit(toWarehousePayload(form));
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
            <div className="text-sm font-semibold text-slate-950 dark:text-white">{isEdit ? 'Datos de bodega' : 'Nueva bodega'}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isEdit ? 'Actualiza el responsable, ubicacion, contacto y estado.' : 'Registra una bodega, tienda u outlet operativo.'}
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
        {isEdit && (
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Codigo</span>
            <input className={`${fieldClassName} font-mono uppercase disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-900`} value={form.warehouse_code} disabled readOnly />
          </label>
        )}
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Tipo</span>
          <select className={selectClassName} value={form.warehouse_type} onChange={(event) => updateField('warehouse_type', event.target.value)}>
            {warehouseTypes.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Nombre</span>
          <input className={fieldClassName} value={form.warehouse_name} onChange={(event) => updateField('warehouse_name', event.target.value)} required minLength={3} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Responsable</span>
          <select className={selectClassName} value={form.responsible_user_id} onChange={(event) => updateField('responsible_user_id', event.target.value)} required>
            <option value="">Selecciona responsable</option>
            {activeUserOptions.map((user) => (
              <option key={user.id} value={user.id}>{getUserLabel(user)}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Direccion</span>
          <input className={fieldClassName} value={form.address} onChange={(event) => updateField('address', event.target.value)} maxLength={1000} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Ciudad</span>
          <input className={fieldClassName} value={form.city} onChange={(event) => updateField('city', event.target.value)} maxLength={100} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Pais</span>
          <input className={fieldClassName} value={form.country} onChange={(event) => updateField('country', event.target.value)} maxLength={100} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Telefono</span>
          <input className={fieldClassName} value={form.phone} onChange={(event) => updateField('phone', event.target.value)} maxLength={20} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Email</span>
          <input className={fieldClassName} type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} maxLength={255} />
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
          {saving ? 'Guardando...' : 'Guardar bodega'}
        </button>
      </div>
    </form>
  );
};

const AdminWarehouses = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const handledDeepLinkRef = useRef('');
  const [warehouses, setWarehouses] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [filters, setFilters] = useState({ status: 'all', type: 'all' });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyWarehouseId, setBusyWarehouseId] = useState(null);
  const [error, setError] = useState('');
  const tablePageSize = usePreferencesStore((state) => state.tablePageSize);
  const setTablePageSize = usePreferencesStore((state) => state.setTablePageSize);

  const usersById = useMemo(() => {
    const map = new Map();
    users.forEach((user) => map.set(Number(user.id), user));
    return map;
  }, [users]);

  const stats = useMemo(() => {
    const total = warehouses.length;
    const active = warehouses.filter((warehouse) => warehouse.is_active).length;
    const stores = warehouses.filter((warehouse) => warehouse.warehouse_type === 'STORE').length;
    const outlets = warehouses.filter((warehouse) => warehouse.warehouse_type === 'OUTLET').length;
    return { total, active, inactive: total - active, stores, outlets };
  }, [warehouses]);

  const filteredWarehouses = useMemo(() => {
    const term = search.trim().toLowerCase();

    return warehouses.filter((warehouse) => {
      const responsible = getUserLabel(usersById.get(Number(warehouse.responsible_user_id))).toLowerCase();
      const matchesStatus = filters.status === 'all'
        || (filters.status === 'active' && warehouse.is_active)
        || (filters.status === 'inactive' && !warehouse.is_active);
      const matchesType = filters.type === 'all' || warehouse.warehouse_type === filters.type;
      const matchesSearch = !term || [
        warehouse.warehouse_name,
        warehouse.city,
        warehouse.email,
        responsible,
      ].filter(Boolean).some((value) => value.toLowerCase().includes(term));

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [filters.status, filters.type, search, usersById, warehouses]);

  const visibleWarehouses = useMemo(() => {
    const start = page * tablePageSize;
    return filteredWarehouses.slice(start, start + tablePageSize);
  }, [filteredWarehouses, page, tablePageSize]);

  const setFilter = (field, value) => {
    setPage(0);
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const loadUsers = async () => {
    try {
      const data = await usersService.list({ status: 'all', active_only: false, limit: 1000 });
      setUsers(data.users || []);
    } catch {
      setUsers([]);
    }
  };

  const loadWarehouses = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await warehousesService.list({ active_only: false, limit: 1000 });
      setWarehouses(data);
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar bodegas.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
    loadUsers();
  }, []);

  useEffect(() => {
    const nextSearch = searchParams.get('search') || '';
    if (nextSearch !== search) {
      setSearch(nextSearch);
      setPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const openCreateModal = () => {
    ModalManager.show({
      type: 'custom',
      title: 'Nueva bodega',
      size: 'large',
      showFooter: false,
      contentComponent: WarehouseFormModal,
      contentProps: {
        mode: 'create',
        initialValues: emptyWarehouseForm,
        userOptions: users,
        onSubmit: async (payload) => {
          await notifyPromise(
            warehousesService.create(payload),
            {
              loading: 'Creando bodega...',
              success: 'Bodega creada correctamente.',
              error: (requestError) => getBackendMessage(requestError, 'No fue posible crear la bodega.'),
            }
          );
          await loadWarehouses();
        },
      },
    });
  };

  const openEditModal = (warehouse) => {
    ModalManager.show({
      type: 'custom',
      title: 'Editar bodega',
      size: 'large',
      showFooter: false,
      contentComponent: WarehouseFormModal,
      contentProps: {
        mode: 'edit',
        initialValues: warehouseToForm(warehouse),
        userOptions: users,
        onSubmit: async (payload) => {
          await notifyPromise(
            warehousesService.update(warehouse.id, payload),
            {
              loading: 'Actualizando bodega...',
              success: 'Bodega actualizada correctamente.',
              error: (requestError) => getBackendMessage(requestError, 'No fue posible actualizar la bodega.'),
            }
          );
          await loadWarehouses();
        },
      },
    });
  };

  useEffect(() => {
    const openMode = searchParams.get('open');
    const recordId = Number(searchParams.get('id'));
    const deepLinkKey = `${openMode}:${recordId}`;
    if (loading || openMode !== 'edit' || !recordId || handledDeepLinkRef.current === deepLinkKey) return;

    const targetWarehouse = warehouses.find((warehouse) => Number(warehouse.id) === recordId);
    if (!targetWarehouse) return;

    handledDeepLinkRef.current = deepLinkKey;
    openEditModal(targetWarehouse);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('open');
    nextParams.delete('id');
    setSearchParams(nextParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, searchParams, setSearchParams, warehouses]);

  const toggleWarehouse = async (warehouse) => {
    const nextState = !warehouse.is_active;
    const confirmed = await ModalManager.confirm({
      title: `${nextState ? 'Activar' : 'Desactivar'} bodega`,
      message: `Confirma que deseas ${nextState ? 'activar' : 'desactivar'} ${warehouse.warehouse_name}.`,
      buttons: {
        cancel: 'Cancelar',
        confirm: nextState ? 'Activar' : 'Desactivar',
      },
    });

    if (!confirmed) return;

    setBusyWarehouseId(warehouse.id);

    try {
      await notifyPromise(
        warehousesService.changeActivation(warehouse, nextState),
        {
          loading: `${nextState ? 'Activando' : 'Desactivando'} bodega...`,
          success: `Bodega ${nextState ? 'activada' : 'desactivada'}.`,
          error: (requestError) => getBackendMessage(requestError, 'No fue posible cambiar el estado.'),
        }
      );
      await loadWarehouses();
    } finally {
      setBusyWarehouseId(null);
    }
  };

  const removeWarehouse = async (warehouse) => {
    const confirmed = await ModalManager.confirm({
      title: 'Eliminar bodega',
      message: `Esta accion eliminara ${warehouse.warehouse_name} del mantenedor. Si tiene movimientos asociados, el backend puede rechazar la operacion.`,
      buttons: {
        cancel: 'Cancelar',
        confirm: 'Eliminar',
      },
    });

    if (!confirmed) return;

    setBusyWarehouseId(warehouse.id);

    try {
      await notifyPromise(
        warehousesService.remove(warehouse.id),
        {
          loading: 'Eliminando bodega...',
          success: 'Bodega eliminada correctamente.',
          error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar la bodega.'),
        }
      );
      await loadWarehouses();
    } finally {
      setBusyWarehouseId(null);
    }
  };

  const openWarehouseZones = (warehouse) => {
    const params = new URLSearchParams({ warehouse_id: String(warehouse.id) });
    navigate({ pathname: '/inventory/warehouses/zones', search: params.toString() });
  };

  const kpiItems = [
    {
      id: 'total',
      label: 'Total',
      value: stats.total,
      active: filters.status === 'all' && filters.type === 'all',
      onClick: () => {
        setPage(0);
        setFilters({ status: 'all', type: 'all' });
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
      id: 'stores',
      label: 'Tiendas',
      value: stats.stores,
      hint: `${stats.outlets} outlet`,
      active: filters.type === 'STORE',
      onClick: () => setFilter('type', 'STORE'),
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
      id: 'type',
      value: filters.type,
      onChange: (value) => setFilter('type', value),
      options: [
        { value: 'all', label: 'Todos los tipos' },
        ...warehouseTypes.map((type) => ({ value: type.value, label: type.label })),
      ],
    },
  ];

  const warehouseColumns = [
    {
      id: 'warehouse',
      label: 'Bodega',
      sortable: true,
      sortValue: (warehouse) => warehouse.warehouse_name,
      render: (warehouse) => (
        <>
          <div className="font-medium text-slate-950 dark:text-white">{warehouse.warehouse_name}</div>
          <div className="text-xs text-slate-500">{warehouse.location_summary || warehouse.city || getTypeLabel(warehouse.warehouse_type)}</div>
        </>
      ),
    },
    {
      id: 'type',
      label: 'Tipo',
      sortable: true,
      sortValue: (warehouse) => warehouse.warehouse_type,
      render: (warehouse) => (
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
          <Building2 className="h-3.5 w-3.5" />
          {warehouse.type_label || getTypeLabel(warehouse.warehouse_type)}
        </span>
      ),
    },
    {
      id: 'responsible',
      label: 'Responsable',
      sortable: true,
      sortValue: (warehouse) => getUserLabel(usersById.get(Number(warehouse.responsible_user_id))),
      render: (warehouse) => getUserLabel(usersById.get(Number(warehouse.responsible_user_id))),
    },
    {
      id: 'location',
      label: 'Ubicacion',
      sortable: true,
      sortValue: (warehouse) => warehouse.location_summary || warehouse.city || '',
      render: (warehouse) => (
        <div className="max-w-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none text-slate-400" />
            <span>{warehouse.location_summary || warehouse.address || warehouse.city || 'Sin ubicacion'}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'zones',
      label: 'Zonas',
      sortable: true,
      align: 'center',
      sortValue: (warehouse) => Number(warehouse.zone_count || 0),
      render: (warehouse) => (
        <button
          type="button"
          className="inline-flex min-w-8 items-center justify-center text-sm font-semibold text-slate-700 transition hover:text-blue-700 dark:text-slate-200 dark:hover:text-blue-300"
          onClick={() => openWarehouseZones(warehouse)}
          aria-label={`Ver zonas de ${warehouse.warehouse_name}`}
        >
          {Number(warehouse.zone_count || 0)}
        </button>
      ),
    },
    {
      id: 'status',
      label: 'Estado',
      sortable: true,
      sortValue: (warehouse) => warehouse.is_active,
      render: (warehouse) => <StatusBadge variant={warehouse.is_active ? 'active' : 'inactive'}>{warehouse.is_active ? 'Activa' : 'Inactiva'}</StatusBadge>,
    },
    {
      id: 'actions',
      label: 'Acciones',
      align: 'right',
      render: (warehouse) => (
        <div className="ml-auto grid w-max grid-cols-3 gap-2">
          <RowActionButton label="Editar bodega" icon={Pencil} disabled={busyWarehouseId === warehouse.id} onClick={() => openEditModal(warehouse)} />
          <RowActionButton label="Zonas de bodega" icon={MapPin} disabled={busyWarehouseId === warehouse.id} onClick={() => openWarehouseZones(warehouse)} />
          <RowActionButton label="Eliminar bodega" icon={Trash2} disabled={busyWarehouseId === warehouse.id} variant="danger" onClick={() => removeWarehouse(warehouse)} />
          <RowActionButton label={warehouse.is_active ? 'Desactivar bodega' : 'Activar bodega'} icon={warehouse.is_active ? EyeOff : CheckCircle2} disabled={busyWarehouseId === warehouse.id} variant={warehouse.is_active ? 'danger' : 'neutral'} onClick={() => toggleWarehouse(warehouse)} />
        </div>
      ),
    },
  ];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Bodegas"
        description="Mantenedor de bodegas, tiendas, outlets y responsables operativos."
        actions={[{ id: 'new-warehouse', label: 'Nueva', onClick: openCreateModal }]}
      />

      <KpiBar items={kpiItems} className="mb-4" />

      <FilterBar
        className="mb-4"
        gridClassName="lg:grid-cols-[minmax(280px,1fr)_190px_180px_auto_auto]"
        searchValue={search}
        searchPlaceholder="Buscar bodega, responsable o ciudad"
        onSearchChange={setSearch}
        onSearchSubmit={() => setPage(0)}
        fields={filterFields}
        actions={(
          <>
            <ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={loadWarehouses} className={loading ? '[&>svg]:animate-spin' : ''} />
            <ActionButton
              label="Limpiar"
              icon={XCircle}
              variant="neutral"
              onClick={() => {
                setSearch('');
                setPage(0);
                setFilters({ status: 'all', type: 'all' });
              }}
            />
          </>
        )}
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <DataTable
        columns={warehouseColumns}
        data={visibleWarehouses}
        loading={loading}
        emptyMessage="No hay bodegas para los filtros actuales."
        footer={(
          <DataTablePagination
            page={page}
            pageSize={tablePageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            total={filteredWarehouses.length}
            hasMore={(page + 1) * tablePageSize < filteredWarehouses.length}
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

export default AdminWarehouses;
