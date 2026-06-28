/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, EyeOff, Pencil, Printer, RefreshCw, Store, Trash2, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import DataTablePagination from '@/components/common/data/DataTablePagination';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import StatusBadge from '@/components/common/data/StatusBadge';
import { cashRegistersService } from '@/services/admin/cashRegistersService';
import { salesOperationsService } from '@/services/admin/salesOperationsService';
import { warehousesService } from '@/services/admin/warehousesService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { PAGE_SIZE_OPTIONS, usePreferencesStore } from '@/store/usePreferencesStore';
import { formatDateTime } from '@/utils/dateTime';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const selectClassName = `${fieldClassName} bg-white dark:bg-slate-950`;

const channelLabels = {
  STORE: 'Tienda',
  WEB: 'Web',
  WHATSAPP: 'WhatsApp',
  PHONE: 'Telefono',
  OTHER: 'Otro',
};

const emptyForm = {
  sales_point_name: '',
  warehouse_id: '',
  default_cash_register_id: '',
  channel_type: 'STORE',
  location_description: '',
  is_active: true,
  has_printer: false,
  printer_paper_width_mm: 80,
};

const salesPointToForm = (salesPoint) => ({
  sales_point_name: salesPoint.sales_point_name || '',
  warehouse_id: salesPoint.warehouse_id || '',
  default_cash_register_id: salesPoint.default_cash_register_id || '',
  channel_type: salesPoint.channel_type || 'STORE',
  location_description: salesPoint.location_description || '',
  is_active: salesPoint.is_active !== false,
  has_printer: Boolean(salesPoint.has_printer),
  printer_paper_width_mm: salesPoint.printer_paper_width_mm ?? 80,
});

const toPayload = (form) => ({
  sales_point_name: form.sales_point_name.trim(),
  warehouse_id: Number(form.warehouse_id),
  default_cash_register_id: form.default_cash_register_id ? Number(form.default_cash_register_id) : null,
  channel_type: form.channel_type,
  location_description: form.location_description.trim() || null,
  is_active: Boolean(form.is_active),
  has_printer: Boolean(form.has_printer),
  printer_paper_width_mm: Number(form.printer_paper_width_mm) || 80,
});

const SalesPointFormModal = ({ mode = 'create', initialValues = emptyForm, salesPointId = null, initialPrinterApiKey = null, warehouses = [], cashRegisters = [], onSubmit, onClose }) => {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [printerApiKey, setPrinterApiKey] = useState(initialPrinterApiKey);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const filteredCashRegisters = useMemo(() => {
    if (!form.warehouse_id) return cashRegisters;
    return cashRegisters.filter((cashRegister) => String(cashRegister.warehouse_id) === String(form.warehouse_id));
  }, [cashRegisters, form.warehouse_id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!form.warehouse_id) {
      setFormError('Debe seleccionar una sucursal o bodega.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(toPayload(form));
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateKey = async () => {
    if (!salesPointId) return;
    setRegenerating(true);
    try {
      const result = await salesOperationsService.regeneratePrinterApiKey(salesPointId);
      setPrinterApiKey(result.printer_api_key);
    } catch {
      setFormError('No fue posible generar la clave de impresora.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopyKey = () => {
    if (!printerApiKey) return;
    navigator.clipboard.writeText(printerApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-950 dark:text-white">{mode === 'edit' ? 'Punto de venta' : 'Nuevo punto de venta'}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">La venta se origina aqui y luego puede pasar a caja.</div>
          </div>
          <label className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <input type="checkbox" checked={form.is_active} onChange={(event) => updateField('is_active', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Activo
          </label>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Nombre</span>
          <input className={fieldClassName} value={form.sales_point_name} onChange={(event) => updateField('sales_point_name', event.target.value)} minLength={3} required />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Canal</span>
          <select className={selectClassName} value={form.channel_type} onChange={(event) => updateField('channel_type', event.target.value)} required>
            {Object.entries(channelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Sucursal / bodega</span>
          <select className={selectClassName} value={form.warehouse_id} onChange={(event) => updateField('warehouse_id', event.target.value)} required>
            <option value="">Seleccione...</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.warehouse_code} - {warehouse.warehouse_name}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Caja destino por defecto</span>
          <select className={selectClassName} value={form.default_cash_register_id} onChange={(event) => updateField('default_cash_register_id', event.target.value)}>
            <option value="">Sin caja por defecto</option>
            {filteredCashRegisters.map((cashRegister) => <option key={cashRegister.id} value={cashRegister.id}>{cashRegister.register_code} - {cashRegister.register_name}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Ubicacion / referencia</span>
          <input className={fieldClassName} value={form.location_description} onChange={(event) => updateField('location_description', event.target.value)} maxLength={255} />
        </label>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-950 dark:text-white">Impresora térmica</span>
          </div>
          <label className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <input type="checkbox" checked={form.has_printer} onChange={(event) => updateField('has_printer', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Posee impresora
          </label>
        </div>

        {form.has_printer && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              {/* Ancho de papel */}
              <select
                value={form.printer_paper_width_mm}
                onChange={(e) => updateField('printer_paper_width_mm', Number(e.target.value))}
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value={58}>58 mm</option>
                <option value={80}>80 mm</option>
              </select>

              {/* Clave de autorización */}
              {mode === 'edit' && salesPointId ? (
                <>
                  <code className="flex-1 min-w-0 rounded-md border border-slate-200 bg-white px-3 h-9 flex items-center font-mono text-sm tracking-widest text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 select-all overflow-hidden">
                    {printerApiKey || '—'}
                  </code>
                  <button type="button" onClick={handleCopyKey} disabled={!printerApiKey} title="Copiar clave" className="h-9 w-9 shrink-0 flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800">
                    <Copy className={`h-4 w-4 ${copied ? 'text-green-500' : 'text-slate-500'}`} />
                  </button>
                  <button type="button" onClick={handleRegenerateKey} disabled={regenerating} className="h-9 shrink-0 rounded-md border border-amber-300 bg-amber-50 px-3 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    {regenerating ? 'Generando...' : printerApiKey ? 'Regenerar' : 'Generar clave'}
                  </button>
                </>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">Guarda el punto de venta primero, luego podrás generar la clave de autorización para el agente.</p>
              )}
            </div>
            {mode === 'edit' && salesPointId && printerApiKey && (
              <p className="text-xs text-slate-500 dark:text-slate-400">Copia esta clave en el archivo de configuración del agente de impresión. Al regenerar, la clave anterior queda inválida.</p>
            )}
          </div>
        )}
      </div>

      {formError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{formError}</div>}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
        <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{saving ? 'Guardando...' : 'Guardar punto'}</button>
      </div>
    </form>
  );
};

const AdminSalesPoints = () => {
  const [salesPoints, setSalesPoints] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: 'all', channel: 'all' });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const tablePageSize = usePreferencesStore((state) => state.tablePageSize);
  const setTablePageSize = usePreferencesStore((state) => state.setTablePageSize);
  const timezone = usePreferencesStore((state) => state.timezone);
  const hourFormat = usePreferencesStore((state) => state.hourFormat);

  const stats = useMemo(() => {
    const total = salesPoints.length;
    const active = salesPoints.filter((item) => item.is_active).length;
    return { total, active, inactive: total - active, withCash: salesPoints.filter((item) => item.default_cash_register_id).length };
  }, [salesPoints]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return salesPoints.filter((item) => {
      const matchesStatus = filters.status === 'all' || (filters.status === 'active' && item.is_active) || (filters.status === 'inactive' && !item.is_active);
      const matchesChannel = filters.channel === 'all' || item.channel_type === filters.channel;
      const matchesSearch = !term || [item.sales_point_code, item.sales_point_name, item.warehouse_name, item.default_cash_register_name, channelLabels[item.channel_type]].filter(Boolean).some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesChannel && matchesSearch;
    });
  }, [filters, salesPoints, search]);

  const visible = useMemo(() => filtered.slice(page * tablePageSize, page * tablePageSize + tablePageSize), [filtered, page, tablePageSize]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextSalesPoints, nextWarehouses, nextCashRegisters] = await Promise.all([
        salesOperationsService.listSalesPoints({ limit: 1000 }),
        warehousesService.list({ active_only: false, limit: 1000 }),
        cashRegistersService.list({ active_only: false, limit: 1000 }),
      ]);
      setSalesPoints(nextSalesPoints);
      setWarehouses(nextWarehouses);
      setCashRegisters(nextCashRegisters);
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar puntos de venta.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setPage(0); }, [search, filters.status, filters.channel]);

  const openModal = (salesPoint = null) => {
    ModalManager.show({
      type: 'custom',
      title: salesPoint ? 'Editar punto de venta' : 'Nuevo punto de venta',
      size: 'large',
      showFooter: false,
      contentComponent: SalesPointFormModal,
      contentProps: {
        mode: salesPoint ? 'edit' : 'create',
        initialValues: salesPoint ? salesPointToForm(salesPoint) : emptyForm,
        salesPointId: salesPoint?.id || null,
        initialPrinterApiKey: salesPoint?.printer_api_key || null,
        warehouses,
        cashRegisters,
        onSubmit: async (payload) => {
          const action = salesPoint ? salesOperationsService.updateSalesPoint(salesPoint.id, payload) : salesOperationsService.createSalesPoint(payload);
          await notifyPromise(action, {
            loading: salesPoint ? 'Actualizando punto de venta...' : 'Creando punto de venta...',
            success: salesPoint ? 'Punto de venta actualizado.' : 'Punto de venta creado.',
            error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar el punto de venta.'),
          });
          await loadData();
        },
      },
    });
  };

  const toggle = async (salesPoint) => {
    const nextState = !salesPoint.is_active;
    const confirmed = await ModalManager.confirm({
      title: `${nextState ? 'Activar' : 'Desactivar'} punto de venta`,
      message: `Confirma que deseas ${nextState ? 'activar' : 'desactivar'} ${salesPoint.sales_point_name}.`,
      buttons: { cancel: 'Cancelar', confirm: nextState ? 'Activar' : 'Desactivar' },
    });
    if (!confirmed) return;
    setBusyId(salesPoint.id);
    try {
      await notifyPromise(salesOperationsService.changeSalesPointActivation(salesPoint, nextState), {
        loading: 'Actualizando estado...',
        success: 'Estado actualizado.',
        error: (requestError) => getBackendMessage(requestError, 'No fue posible cambiar el estado.'),
      });
      await loadData();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (salesPoint) => {
    const confirmed = await ModalManager.confirm({
      title: 'Eliminar punto de venta',
      message: `Esta accion eliminara ${salesPoint.sales_point_name} del mantenedor.`,
      buttons: { cancel: 'Cancelar', confirm: 'Eliminar' },
    });
    if (!confirmed) return;
    setBusyId(salesPoint.id);
    try {
      await notifyPromise(salesOperationsService.removeSalesPoint(salesPoint.id), {
        loading: 'Eliminando punto de venta...',
        success: 'Punto de venta eliminado.',
        error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar el punto de venta.'),
      });
      await loadData();
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    { id: 'point', label: 'Punto de venta', sortable: true, sortValue: (item) => item.sales_point_name, render: (item) => <><div className="font-medium text-slate-950 dark:text-white">{item.sales_point_name}</div><div className="font-mono text-xs text-slate-500">{item.sales_point_code}</div></> },
    { id: 'channel', label: 'Canal', sortable: true, sortValue: (item) => item.channel_type, render: (item) => <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Store className="h-3.5 w-3.5" />{channelLabels[item.channel_type] || item.channel_type}</span> },
    { id: 'warehouse', label: 'Sucursal / bodega', sortable: true, sortValue: (item) => item.warehouse_name || '', render: (item) => <div><div className="font-medium text-slate-700 dark:text-slate-200">{item.warehouse_name || 'Sin bodega'}</div><div className="font-mono text-xs text-slate-500">{item.warehouse_code}</div></div> },
    { id: 'cash', label: 'Caja destino', render: (item) => item.default_cash_register_id ? <div><div className="font-medium text-slate-700 dark:text-slate-200">{item.default_cash_register_name}</div><div className="font-mono text-xs text-slate-500">{item.default_cash_register_code}</div></div> : <span className="text-sm text-slate-500">Sin caja por defecto</span> },
    { id: 'status', label: 'Estado', sortable: true, sortValue: (item) => item.is_active, render: (item) => <StatusBadge variant={item.is_active ? 'active' : 'inactive'}>{item.is_active ? 'Activo' : 'Inactivo'}</StatusBadge> },
    { id: 'updated', label: 'Actualizado', sortable: true, sortValue: (item) => item.updated_at || '', render: (item) => formatDateTime(item.updated_at, timezone, { hourFormat }) },
    { id: 'actions', label: 'Acciones', align: 'right', render: (item) => <div className="flex justify-end gap-2"><RowActionButton label="Editar" icon={Pencil} disabled={busyId === item.id} onClick={() => openModal(item)} /><RowActionButton label={item.is_active ? 'Desactivar' : 'Activar'} icon={item.is_active ? EyeOff : CheckCircle2} disabled={busyId === item.id} variant={item.is_active ? 'danger' : 'neutral'} onClick={() => toggle(item)} /><RowActionButton label="Eliminar" icon={Trash2} disabled={busyId === item.id} variant="danger" onClick={() => remove(item)} /></div> },
  ];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader title="Puntos de venta" description="Mantenedor base para controlar donde se originan ventas pendientes." actions={[{ id: 'new-sales-point', label: 'Nuevo', onClick: () => openModal() }]} />
      <KpiBar items={[{ id: 'total', label: 'Total', value: stats.total, active: filters.status === 'all', onClick: () => setFilters((current) => ({ ...current, status: 'all' })) }, { id: 'active', label: 'Activos', value: stats.active, active: filters.status === 'active', onClick: () => setFilters((current) => ({ ...current, status: 'active' })) }, { id: 'inactive', label: 'Inactivos', value: stats.inactive, active: filters.status === 'inactive', onClick: () => setFilters((current) => ({ ...current, status: 'inactive' })) }, { id: 'with-cash', label: 'Con caja destino', value: stats.withCash }]} className="mb-4" />
      <FilterBar className="mb-4" gridClassName="lg:grid-cols-[minmax(280px,1fr)_180px_180px_auto_auto]" searchValue={search} searchPlaceholder="Buscar punto, codigo, sucursal o caja" onSearchChange={setSearch} onSearchSubmit={() => setPage(0)} fields={[{ id: 'status', value: filters.status, onChange: (value) => setFilters((current) => ({ ...current, status: value })), options: [{ value: 'all', label: 'Todos los estados' }, { value: 'active', label: 'Activos' }, { value: 'inactive', label: 'Inactivos' }] }, { id: 'channel', value: filters.channel, onChange: (value) => setFilters((current) => ({ ...current, channel: value })), options: [{ value: 'all', label: 'Todos los canales' }, ...Object.entries(channelLabels).map(([value, label]) => ({ value, label }))] }]} actions={<><ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={loadData} className={loading ? '[&>svg]:animate-spin' : ''} /><ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={() => { setSearch(''); setFilters({ status: 'all', channel: 'all' }); }} /></>} />
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
      <DataTable columns={columns} data={visible} loading={loading} emptyMessage="No hay puntos de venta para mostrar." footer={<DataTablePagination page={page} pageSize={tablePageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} total={filtered.length} hasMore={(page + 1) * tablePageSize < filtered.length} loading={loading} onPageChange={setPage} onPageSizeChange={(size) => { setTablePageSize(size); setPage(0); }} />} />
    </section>
  );
};

export default AdminSalesPoints;
